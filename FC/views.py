from django.shortcuts import render, HttpResponseRedirect
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils.decorators import method_decorator
from django.db import transaction, models
from django.db.models import Q, Count, Sum, Avg, Max, Min, Prefetch
from django.core.paginator import Paginator
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse
import json
import logging
import os
import secrets
import urllib.request
import urllib.error
import io
import csv
from urllib.parse import urlencode
from datetime import datetime, timedelta
from decimal import Decimal
from .decorators import (
    login_required, role_required, ciso_required, ovphe_required, 
    approver_required, assistant_required, faculty_required
)
from .models import *
from .jwt_utils import generate_jwt_token


def _json_error(detail: str, status: int = 400):
    return JsonResponse({"detail": detail}, status=status)


def _assistant_scope(user):
    assistant = getattr(user, "assistant_profile", None)
    supervisor = getattr(assistant, "supervisor_approver", None)
    supervisor_profile = getattr(supervisor, "approver_profile", None)
    return {
        "assistant": assistant,
        "college": getattr(assistant, "college", None) or getattr(supervisor_profile, "college", None),
        "department": getattr(assistant, "department", None) or getattr(supervisor_profile, "department", None),
        "office": getattr(assistant, "office", None) or getattr(supervisor_profile, "office", None),
        "supervisor": supervisor,
    }


def _assistant_requirement_queryset(user, timeline):
    scope = _assistant_scope(user)
    supervisor = scope["supervisor"]
    supervisor_profile = getattr(supervisor, "approver_profile", None)
    if not supervisor_profile:
        return Requirement.objects.none()

    requirements = Requirement.objects.filter(
        clearance_timeline=timeline,
        is_active=True,
    ).select_related(
        "created_by",
        "clearance_timeline",
        "approver_flow_step",
    ).prefetch_related(
        "target_colleges",
        "target_departments",
        "target_offices",
        "target_faculty",
    ).order_by("-last_updated", "-id")

    visible_ids = [
        requirement.id
        for requirement in requirements
        if _can_approver_access_requirement(supervisor_profile, requirement)
    ]
    if not visible_ids:
        return Requirement.objects.none()

    return requirements.filter(id__in=visible_ids)


def _assistant_clearance_queryset(user, timeline):
    scope = _assistant_scope(user)
    supervisor = scope["supervisor"]
    if not supervisor:
        return ClearanceRequest.objects.none()

    requests = ClearanceRequest.objects.select_related(
        "faculty",
        "faculty__user",
        "faculty__college",
        "faculty__department",
        "faculty__office",
        "requirement",
        "requirement__approver_flow_step",
        "approved_by",
    ).prefetch_related(
        "requirement__target_colleges",
        "requirement__target_departments",
        "requirement__target_offices",
        "requirement__target_faculty",
    ).filter(
        clearance_timeline=timeline,
    ).order_by("-submitted_date", "-id")

    visible_ids = [request.id for request in requests if _can_approver_access_request(supervisor, request)]
    if not visible_ids:
        return ClearanceRequest.objects.none()

    return requests.filter(id__in=visible_ids)


def _serialize_assistant_requirement(requirement: Requirement):
    deadline = getattr(requirement.clearance_timeline, "clearance_end_date", None)
    recipients = []

    if requirement.recipient_scope == "all":
        recipients = ["All Faculty"]
    elif requirement.recipient_scope == "college":
        recipients = [college.name for college in requirement.target_colleges.all()]
    elif requirement.recipient_scope == "department":
        recipients = [department.name for department in requirement.target_departments.all()]
    elif requirement.recipient_scope == "office":
        recipients = [office.name for office in requirement.target_offices.all()]
    elif requirement.recipient_scope == "individual":
        recipients = [
            f"{faculty.user.first_name} {faculty.user.last_name}".strip()
            for faculty in requirement.target_faculty.select_related("user").all()
        ]

    return {
        "title": requirement.title or "",
        "description": requirement.description or "",
        "physicalSubmission": bool(requirement.required_physical),
        "recipients": ", ".join([recipient for recipient in recipients if recipient]) if recipients else "",
        "lastUpdated": timezone.localtime(requirement.last_updated).strftime("%B %d, %Y, %I:%M %p") if requirement.last_updated else "",
        "createdBy": " ".join(
            [
                part for part in [
                    (getattr(requirement.created_by, "first_name", "") or "").strip(),
                    (getattr(requirement.created_by, "last_name", "") or "").strip(),
                ]
                if part
            ]
        ) or getattr(requirement.created_by, "email", "") or "",
        "clearanceTimeline": getattr(requirement.clearance_timeline, "name", "") or "",
        "submissionDeadline": timezone.localtime(deadline).strftime("%B %d, %Y, %I:%M %p") if deadline else "",
    }


def _serialize_clearance_request_item(req: ClearanceRequest):
    faculty = getattr(req, "faculty", None)
    faculty_user = getattr(faculty, "user", None)
    return {
        "id": str(req.id),
        "requestId": req.request_id or str(req.id),
        "employeeId": getattr(faculty, "employee_id", "") or "",
        "name": (faculty_user.get_full_name() if faculty_user and hasattr(faculty_user, "get_full_name") else "") or " ".join(
            [
                p for p in [
                    (getattr(faculty, "first_name", "") or "").strip(),
                    (getattr(faculty, "middle_name", "") or "").strip(),
                    (getattr(faculty, "last_name", "") or "").strip(),
                ]
                if p
            ]
        ),
        "college": getattr(getattr(faculty, "college", None), "name", "") or "",
        "department": getattr(getattr(faculty, "department", None), "name", "") or "",
        "facultyType": getattr(faculty, "faculty_type", "") or "",
        "status": _to_request_status(req.status),
    }


def _serialize_assistant_individual_request(req: ClearanceRequest):
    faculty = getattr(req, "faculty", None)
    faculty_user = getattr(faculty, "user", None)
    approver = getattr(req, "approved_by", None)
    approver_name = ""
    if approver:
        approver_name = " ".join(
            [p for p in [(approver.first_name or "").strip(), (approver.middle_name or "").strip(), (approver.last_name or "").strip()] if p]
        ) or approver.email

    return {
        "item": {
            "id": str(req.id),
            "requestId": req.request_id or str(req.id),
            "employeeId": getattr(faculty, "employee_id", "") or "",
            "schoolId": getattr(faculty, "employee_id", "") or "",
            "name": (faculty_user.get_full_name() if faculty_user and hasattr(faculty_user, "get_full_name") else "") or " ".join(
                [
                    p for p in [
                        (getattr(faculty, "first_name", "") or "").strip(),
                        (getattr(faculty, "middle_name", "") or "").strip(),
                        (getattr(faculty, "last_name", "") or "").strip(),
                    ]
                    if p
                ]
            ),
            "fullName": (faculty_user.get_full_name() if faculty_user and hasattr(faculty_user, "get_full_name") else "") or "",
            "schoolEmail": getattr(faculty_user, "email", "") or "",
            "college": getattr(getattr(faculty, "college", None), "name", "") or "",
            "department": getattr(getattr(faculty, "department", None), "name", "") or "",
            "facultyType": getattr(faculty, "faculty_type", "") or "",
            "status": _to_request_status(req.status),
            "submittedDate": timezone.localtime(req.submitted_date).strftime("%B %d, %Y, %I:%M %p") if req.submitted_date else "",
            "requirementName": getattr(getattr(req, "requirement", None), "title", "") or "",
            "submissionNotes": req.submission_notes or "",
            "submissionLink": req.submission_link or "",
            "remarks": req.remarks or "",
            "approvedDate": timezone.localtime(req.approved_date).strftime("%B %d, %Y, %I:%M %p") if req.approved_date else "",
            "approvedBy": approver_name,
        }
    }


def _assistant_request_by_identifier(user, timeline, request_identifier: str):
    request_identifier = (request_identifier or "").strip()
    if not request_identifier:
        return None

    queryset = _assistant_clearance_queryset(user, timeline)
    if request_identifier.isdigit():
        return queryset.filter(Q(id=int(request_identifier)) | Q(request_id=request_identifier)).first()
    return queryset.filter(request_id=request_identifier).first()


def _normalize_email(value: str | None) -> str:
    return (value or "").strip().lower()


def _login(request, user):
    """Login function that doesn't use Django auth"""
    from .decorators import get_role_value_for_user, get_role_value_for_name
    
    # Check if there's an intended role in the session
    intended_role = request.session.get('intended_role', '').strip()
    
    if intended_role:
        # Use the intended role if specified
        role_value = get_role_value_for_name(intended_role)
        if role_value is None:
            # Invalid role name, fall back to priority-based selection
            print(f"GOOGLE OAUTH: Invalid intended role '{intended_role}', falling back to priority-based role")
            role_value = get_role_value_for_user(user)
        else:
            print(f"GOOGLE OAUTH: Using intended role '{intended_role}' with value {role_value}")
    else:
        # Fall back to priority-based role selection
        role_value = get_role_value_for_user(user)
        print(f"GOOGLE OAUTH: No intended role, using priority-based role value {role_value}")
    
    request.session['user_authenticated'] = True
    request.session['user_id'] = str(user.id)
    request.session['user_email'] = user.email
    request.session['user_role_value'] = role_value
    request.session.modified = True

    print(
        f"SESSION: logging in -> session_key={request.session.session_key} user_id={user.id} email={user.email} role_value={role_value}"
    )


def _logout(request):
    """Logout function that doesn't use Django auth"""
    request.session.flush()


def _get_authenticated_user(request):
    """Get currently authenticated user"""
    if request.session.get('user_authenticated'):
        user_id = request.session.get('user_id')
        if user_id:
            try:
                return User.objects.get(id=user_id)
            except User.DoesNotExist:
                pass
    return None






def _validate_and_redirect_by_role(intended_role: str, user_roles: list) -> str | None:
    """
    Validate the intended role against user's actual roles and return appropriate redirect URL.
    Returns None if role validation fails.
    """
    print(f"GOOGLE OAUTH: _validate_and_redirect_by_role called with intended_role='{intended_role}', user_roles={user_roles}")
    
    role_mapping = {
        'faculty': ['Faculty'],
        'approver': ['Approver'],
        'assistant': ['Student Assistant'],
        'ciso': ['CISO'],
        'ovphe': ['OVPHE']
    }
    
    # Check if intended role is valid
    if intended_role not in role_mapping:
        print(f"GOOGLE OAUTH: Invalid intended role: {intended_role}")
        print(f"GOOGLE OAUTH: Valid roles are: {list(role_mapping.keys())}")
        return None
    
    # Check if user has the required role(s)
    required_roles = role_mapping[intended_role]
    has_required_role = any(role in user_roles for role in required_roles)
    
    print(f"GOOGLE OAUTH: Required roles for {intended_role}: {required_roles}")
    print(f"GOOGLE OAUTH: User has required role: {has_required_role}")
    
    if not has_required_role:
        print(f"GOOGLE OAUTH: User {user_roles} does not have required role(s) {required_roles} for intended role {intended_role}")
        return None
    
    # Return appropriate dashboard URL based on intended role
    dashboard_urls = {
        'faculty': '/faculty-dashboard',
        'approver': '/approver-dashboard',
        'assistant': '/assistant-approver-dashboard',
        'ciso': '/CISO-dashboard',
        'ovphe': '/OVPHE-dashboard'
    }
    
    result = dashboard_urls.get(intended_role, '/faculty-dashboard')
    print(f"GOOGLE OAUTH: Returning dashboard URL: {result}")
    return result


def _dashboard_route_for_user(user: "User") -> str:
    # Check user's active roles and return appropriate dashboard
    user_roles = user.get_active_roles().values_list('role__name', flat=True)
    
    # Priority routing for admin roles
    if 'CISO' in user_roles:
        return "/CISO-dashboard"
    
    if 'OVPHE' in user_roles:
        return "/OVPHE-dashboard"
    
    # All approvers go to approver dashboard
    if 'Approver' in user_roles:
        return "/approver-dashboard"
    
    # Student Assistant / Assistant Approver
    if 'Student Assistant' in user_roles:
        return "/assistant-approver-dashboard"
    
    # Default to faculty dashboard for Faculty role or fallback
    if 'Faculty' in user_roles:
        return "/faculty-dashboard"
    
    return "/"


def _verify_google_id_token(id_token: str, expected_aud: str | None):
    query = urlencode({"id_token": id_token})
    url = f"https://oauth2.googleapis.com/tokeninfo?{query}"
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            body = resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        try:
            body = e.read().decode("utf-8")
        except Exception:
            body = ""
        raise ValueError(f"Token verification failed: {body or str(e)}")
    except Exception as e:
        raise ValueError(f"Token verification failed: {str(e)}")

    try:
        payload = json.loads(body)
    except Exception:
        raise ValueError("Token verification failed: invalid response")

    email = (payload.get("email") or "").strip().lower()
    aud = (payload.get("aud") or "").strip()
    email_verified = str(payload.get("email_verified") or "").lower() == "true"

    if not email:
        raise ValueError("Token verification failed: missing email")
    if expected_aud and aud and aud != expected_aud:
        raise ValueError("Token verification failed: audience mismatch")
    if not email_verified:
        raise ValueError("Email not verified")

    return {"email": email, "payload": payload}


def _get_google_redirect_uri() -> str:
    raw = (os.getenv("GOOGLE_OAUTH_REDIRECT_URIS") or "").strip()
    if not raw:
        return ""
    return raw.split(",")[0].strip()


def _google_token_exchange(code: str, redirect_uri: str, client_id: str, client_secret: str) -> dict:
    data = urlencode(
        {
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        }
    ).encode("utf-8")

    req = urllib.request.Request(
        url="https://oauth2.googleapis.com/token",
        data=data,
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        try:
            body = e.read().decode("utf-8")
        except Exception:
            body = ""
        raise ValueError(f"Token exchange failed: {body or str(e)}")
    except Exception as e:
        raise ValueError(f"Token exchange failed: {str(e)}")

    try:
        return json.loads(body)
    except Exception:
        raise ValueError("Token exchange failed: invalid response")


def google_oauth_start(request):
    client_id = (os.getenv("GOOGLE_OAUTH_CLIENT_ID") or "").strip()
    redirect_uri = _get_google_redirect_uri()
    if not client_id or not redirect_uri:
        return _json_error("Google OAuth is not configured", status=500)
    
    # Clear any existing authentication to prevent role conflicts
    _logout(request)
    
    # Get the intended role from URL parameter
    intended_role = request.GET.get('role', '').strip()
    print(f"GOOGLE OAUTH: google_oauth_start called with role parameter: '{intended_role}'")
    
    #session
    state = secrets.token_urlsafe(24)
    request.session["google_oauth_state"] = state
    request.session["intended_role"] = intended_role
    request.session.modified = True
    
    print(f"GOOGLE OAUTH: Stored intended_role in session: '{intended_role}'")

    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "prompt": "select_account",
    }
    url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return HttpResponseRedirect(url)


def google_oauth_callback(request):
    print(f"GOOGLE OAUTH: Starting callback...")
    print(f"GOOGLE OAUTH: Session before login: {dict(request.session)}")
    print(f"GOOGLE OAUTH: Session key before: {request.session.session_key}")
    
    code = (request.GET.get("code") or "").strip()
    state = (request.GET.get("state") or "").strip()
    expected_state = request.session.get("google_oauth_state")
    intended_role = request.session.get("intended_role", "").strip()
    
    print(f"GOOGLE OAUTH: OAuth state found: {bool(expected_state)}")
    print(f"GOOGLE OAUTH: Intended role: {intended_role}")

    if not code:
        return _json_error("Missing code", status=400)
    if not state or not expected_state or state != expected_state:
        return _json_error("Invalid state", status=400)

    client_id = (os.getenv("GOOGLE_OAUTH_CLIENT_ID") or "").strip()
    client_secret = (os.getenv("GOOGLE_OAUTH_CLIENT_SECRET") or "").strip()
    redirect_uri = _get_google_redirect_uri()
    if not client_id or not client_secret or not redirect_uri:
        return _json_error("Google OAuth is not configured", status=500)

    try:
        token_data = _google_token_exchange(
            code=code,
            redirect_uri=redirect_uri,
            client_id=client_id,
            client_secret=client_secret,
        )
    except ValueError as e:
        return _json_error(str(e), status=401)

    id_token = (token_data.get("id_token") or "").strip()
    if not id_token:
        return _json_error("Missing id_token from Google", status=401)

    try:
        verified = _verify_google_id_token(id_token=id_token, expected_aud=client_id)
    except ValueError as e:
        return _json_error(str(e), status=401)

    email = verified["email"]
    user = User.objects.filter(email__iexact=email).first()
    if not user:
        print(f"GOOGLE OAUTH: Email not registered: {email}")
        error_url = "/?error=email_not_registered"
        print(f"GOOGLE OAUTH: Redirecting to login with error: {error_url}")
        return HttpResponseRedirect(error_url)

    print(f"GOOGLE OAUTH: User found: {user.email} (ID: {user.id})")
    print(f"GOOGLE OAUTH: About to call login...")
    
    # Validate intended role against user's actual roles
    user_roles = user.get_active_roles().values_list('role__name', flat=True)
    user_roles_list = list(user_roles)
    print(f"GOOGLE OAUTH: User email: {user.email}")
    print(f"GOOGLE OAUTH: User roles: {user_roles_list}")
    print(f"GOOGLE OAUTH: Intended role: '{intended_role}'")
    
    # If no intended role, redirect to login page for role selection
    if not intended_role:
        # Generate JWT token for the user
        try:
            jwt_token = generate_jwt_token(user)
            print(f"GOOGLE OAUTH: JWT Token generated for role selection: {user.email}")
        except Exception as e:
            print(f"GOOGLE OAUTH: Error generating JWT token: {str(e)}")
            return HttpResponseRedirect("/?error=authentication_failed")
        
        # Create session for the user
        _login(request, user)
        
        # Redirect to login page with JWT token for role selection
        login_url = f"https://localhost:4433/login?token={jwt_token}"
        
        # Check if this is a PWA request by checking user agent or referer
        user_agent = request.META.get('HTTP_USER_AGENT', '').lower()
        is_pwa = any(pwa_indicator in user_agent for pwa_indicator in ['wv', 'webview', 'pwa'])
        
        # For PWA, try to keep the flow within the app context
        if is_pwa:
            # Use the same origin to stay within PWA
            login_url = f"/login?token={jwt_token}"
        
        print(f"GOOGLE OAUTH: No role selected, redirecting to role selection: {login_url}")
        return HttpResponseRedirect(login_url)
    
    # Validate that the intended role is one of the supported roles
    valid_roles = ['faculty', 'approver', 'assistant', 'ciso', 'ovphe']
    if intended_role not in valid_roles:
        # Clear the invalid role from session
        request.session.pop("intended_role", None)
        request.session.modified = True
        error_url = "/?error=invalid_role"
        print(f"GOOGLE OAUTH: Invalid role '{intended_role}', cleared from session, redirecting to: {error_url}")
        return HttpResponseRedirect(error_url)
    
    # Role validation and redirection logic
    redirect_to = _validate_and_redirect_by_role(intended_role, user_roles_list)
    print(f"GOOGLE OAUTH: Validation result: {redirect_to}")

    if redirect_to is None:
        # Role mismatch - clear the intended role and redirect to login with error message
        request.session.pop("intended_role", None)
        request.session.modified = True
        error_url = "/?error=role_mismatch"
        print(f"GOOGLE OAUTH: Role mismatch detected, cleared intended role, redirecting to: {error_url}")
        return HttpResponseRedirect(error_url)

    _login(request, user)

    try:
        jwt_token = generate_jwt_token(user)
        print(f"GOOGLE OAUTH: JWT Token generated for user: {user.email}")
        print(f"GOOGLE OAUTH: JWT Token (first 50 chars): {jwt_token[:50]}...")
    except Exception as e:
        print(f"GOOGLE OAUTH: Error generating JWT token: {str(e)}")

    print(f"GOOGLE OAUTH: Session after login: {dict(request.session)}")
    print(f"GOOGLE OAUTH: User authenticated: {request.session.get('user_authenticated')}")
    print(f"GOOGLE OAUTH: User ID in session: {request.session.get('user_id')}")
    print(f"GOOGLE OAUTH: Redirecting to: {redirect_to}")

    request.session.pop("intended_role", None)
    request.session.modified = True

    return HttpResponseRedirect(redirect_to)


@csrf_exempt
def google_sign_in_api(request):
    if request.method != "POST":
        return _json_error("Method not allowed", status=405)

    try:
        data = json.loads(request.body.decode("utf-8") or "{}")
    except Exception:
        data = {}

    id_token = (data.get("id_token") or "").strip()
    if not id_token:
        return _json_error("Missing id_token", status=400)

    expected_aud = (os.getenv("GOOGLE_OAUTH_CLIENT_ID") or "").strip() or None
    try:
        verified = _verify_google_id_token(id_token=id_token, expected_aud=expected_aud)
    except ValueError as e:
        return _json_error(str(e), status=401)

    email = verified["email"]
    user = User.objects.filter(email__iexact=email).first()
    if not user:
        return _json_error("Email is not registered in the system", status=403)

    _login(request, user)

    try:
        jwt_token = generate_jwt_token(user)
        print(f"GOOGLE SIGN IN API: JWT Token generated for user: {user.email}")
        print(f"GOOGLE SIGN IN API: JWT Token (first 50 chars): {jwt_token[:50]}...")
    except Exception as e:
        print(f"GOOGLE SIGN IN API: Error generating JWT token: {str(e)}")

    redirect_to = "/login-prompt"
    return JsonResponse(
        {
            "ok": True,
            "email": user.email,
            "roles": list(user.get_active_roles().values_list('role__name', flat=True)),
            "redirect": redirect_to,
        }
    )


@csrf_exempt
def logout_api(request):
    if request.method not in {"POST", "GET"}:
        return _json_error("Method not allowed", status=405)
    
    print(f"LOGOUT: Starting logout... method={request.method}")
    print(f"SESSION: used session is now being cleared -> session_key={request.session.session_key}")
    print(f"LOGOUT: Session before: {dict(request.session)}")
    
    try:
        _logout(request)
        print(f"LOGOUT: Session flushed successfully")
    except Exception as e:
        print(f"LOGOUT: Logout error: {e}")
    
    print(f"SESSION: cleared -> session_key={getattr(request.session, 'session_key', 'None')}")

    if request.method == 'GET':
        from django.http import HttpResponseRedirect
        response = HttpResponseRedirect('/')
        response.delete_cookie('sessionid', path='/')
        response.delete_cookie('csrftoken', path='/')
        print(f"LOGOUT: GET request -> redirecting to /")
        return response

    response = JsonResponse({"ok": True, "message": "Logged out successfully"})
    response.delete_cookie('sessionid', path='/')
    response.delete_cookie('sessionid', path='/', domain='localhost')
    response.delete_cookie('sessionid', path='/', domain='127.0.0.1')
    response.delete_cookie('csrftoken', path='/')
    print(f"LOGOUT: POST request -> returning JSON")
    return response


@csrf_exempt
def heartbeat_api(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    now = timezone.now()
    request.session["last_seen"] = now.isoformat()
    request.session.modified = True

    payload = {
        "ok": True,
        "authenticated": bool(request.session.get("user_authenticated")),
        "server_time": now.isoformat(),
        "last_seen": request.session.get("last_seen"),
    }

    if not payload["authenticated"]:
        return JsonResponse(payload, status=401)

    return JsonResponse(payload)


@csrf_exempt
def update_selected_role_api(request):
    """API endpoint to update the selected role in session"""
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)
    
    user = _get_authenticated_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication required"}, status=401)
    
    try:
        data = json.loads(request.body.decode("utf-8") or "{}")
        selected_role_value = data.get("role_value")
        
        if selected_role_value is None:
            return JsonResponse({"detail": "Missing role_value"}, status=400)
        
        # Verify user has this role
        user_roles = list(user.get_active_roles().values_list('role__name', flat=True))
        role_mapping = {
            'CISO': 1,
            'OVPHE': 2,
            'APPROVER': 3,
            'Approver': 3,
            'College Admin': 3,
            'Department Chair': 3,
            'Office Admin': 3,
            'ASSISTANT_APPROVER': 4,
            'Student Assistant': 4,
            'FACULTY': 5,
            'Faculty': 5
        }
        
        user_role_values = []
        for role_name in user_roles:
            mapped_value = role_mapping.get(role_name)
            if mapped_value:
                user_role_values.append(mapped_value)
        
        user_role_values = sorted(list(set(user_role_values)))
        
        if selected_role_value not in user_role_values:
            return JsonResponse({"detail": "User does not have this role"}, status=403)
        
        # Update session with selected role
        request.session['user_role_value'] = selected_role_value
        request.session.modified = True
        
        print(f"UPDATE_ROLE: Updated session role_value to {selected_role_value} for user {user.email}")
        
        return JsonResponse({"success": True, "role_value": selected_role_value})
        
    except Exception as e:
        print(f"UPDATE_ROLE: Error: {str(e)}")
        return JsonResponse({"detail": "Internal server error"}, status=500)


def me_api(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    user = _get_authenticated_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication required"}, status=401)

    # Keep existing role_value behaviour for backwards compatibility
    from .decorators import get_role_value_for_user, get_role_name_for_value
    role_value = get_role_value_for_user(user)
    role_name = get_role_name_for_value(role_value)

    # Get all user roles for role selection functionality
    user_roles = list(user.get_active_roles().values_list('role__name', flat=True))
    print(f"DEBUG: User {user.email} has roles: {user_roles}")
    
    # Convert role names to role values for frontend compatibility
    role_mapping = {
        'CISO': 1,
        'OVPHE': 2,
        'APPROVER': 3,
        'Approver': 3,  # Add this line to match database role name
        'College Admin': 3,
        'Department Chair': 3,
        'Office Admin': 3,
        'ASSISTANT_APPROVER': 4,
        'Student Assistant': 4,
        'FACULTY': 5,
        'Faculty': 5
    }
    
    user_role_values = []
    for role_name in user_roles:
        mapped_value = role_mapping.get(role_name)
        print(f"DEBUG: Mapping role '{role_name}' to value {mapped_value}")
        if mapped_value:
            user_role_values.append(mapped_value)
    
    # Remove duplicates and sort
    user_role_values = sorted(list(set(user_role_values)))

    # Expose structured role information so the frontend can derive
    # College Dean / Department Chair / Office Approver from colleges,
    # departments, and offices without introducing new endpoints.
    roles_payload: list[dict] = []
    
    # Get approver profile for Approver roles
    approver_profile = None
    try:
        approver_profile = Approver.objects.get(user=user)
    except Approver.DoesNotExist:
        approver_profile = None
    assistant_scope = _assistant_scope(user)
    
    for ur in user.get_active_roles().select_related("role", "college", "department", "office"):
        role_data = {
            "role_name": ur.role.name,
            "college": ur.college.name if ur.college else "",
            "department": ur.department.name if ur.department else "",
            "office": ur.office.name if ur.office else "",
        }
        
        # For Approver roles, enrich with actual approver profile data
        if ur.role.name == 'Approver' and approver_profile:
            role_data.update({
                "college": approver_profile.college.name if approver_profile.college else "",
                "department": approver_profile.department.name if approver_profile.department else "",
                "office": approver_profile.office.name if approver_profile.office else "",
            })
        elif ur.role.name in {'ASSISTANT_APPROVER', 'Student Assistant'} and assistant_scope.get("assistant"):
            role_data.update({
                "college": assistant_scope["college"].name if assistant_scope.get("college") else "",
                "department": assistant_scope["department"].name if assistant_scope.get("department") else "",
                "office": assistant_scope["office"].name if assistant_scope.get("office") else "",
            })
        
        roles_payload.append(role_data)

    return JsonResponse(
        {
            "email": user.email,
            "university_id": user.university_id,
            "first_name": user.first_name,
            "middle_name": user.middle_name,
            "last_name": user.last_name,
            "role_value": request.session.get("user_role_value"),
            "roles": user_role_values,  # Add all role values for frontend
            "role_name": role_name,
            "roles_payload": roles_payload,
        }
    )


@csrf_exempt
def approver_profile_api(request):
    """
    API endpoint to get the current user's approver profile with college/department assignments.
    """
    # Get approver profile if it exists
    try:
        approver = Approver.objects.get(user=user)
        profile = {
            "approver_type": approver.approver_type,
            "college": approver.college.name if approver.college else None,
            "department": approver.department.name if approver.department else None,
            "office": approver.office.name if approver.office else None,
            "college_id": approver.college.id if approver.college else None,
            "department_id": approver.department.id if approver.department else None,
            "office_id": approver.office.id if approver.office else None,
        }
    except Approver.DoesNotExist:
        profile = None

    return JsonResponse({
        "email": user.email,
        "university_id": user.university_id,
        "first_name": user.first_name,
        "middle_name": user.middle_name,
        "last_name": user.last_name,
        "approver_profile": profile,
    })
    
def unread_notifications_count_api(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    user = _get_authenticated_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication required"}, status=401)    
    role_names = set()
    try:
        from .decorators import get_role_name_for_value

        role_value = request.session.get("user_role_value")
        if role_value is not None:
            role_names.add(str(get_role_name_for_value(role_value) or "").strip())
    except Exception:
        pass

    try:
        role_names.update(
            r.strip() for r in user.get_active_roles().values_list("role__name", flat=True) if (r or "").strip()
        )
    except Exception:
        pass

    role_names = {r for r in role_names if r}

    filters = (
        Q(user=user)
        | Q(approver=user)
        | (Q(user__isnull=True) & Q(user_role__in=list(role_names)))
    )

    unread_count = Notification.objects.filter(filters, is_read=False).count()
    return JsonResponse({"unreadCount": int(unread_count)})


@csrf_exempt
def idle_check_api(request):
    """
    API endpoint that forces Django middleware to run and check idle timeout.
    This will trigger the IdleTimeoutMiddleware to clear session if needed.
    """
    print(f"IDLE CHECK: {request.method} request received")
    print(f"IDLE CHECK: User authenticated: {request.user.is_authenticated}")
    print(f"IDLE CHECK: User email: {request.user.email if request.user.is_authenticated else 'Anonymous'}")
    
    if request.method != "POST":
        print(f"IDLE CHECK: Method not allowed: {request.method}")
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    user = getattr(request, "user", None)
    if not user or not getattr(user, "is_authenticated", False):
        print(f"IDLE CHECK: User not authenticated, session already cleared")
        return JsonResponse({"status": "logged_out", "message": "User not authenticated"})

    # If we reach here, middleware didn't clear the session, so user is still active
    current_time = timezone.now().timestamp()
    last_activity = request.session.get('last_activity', current_time)
    
    print(f"IDLE CHECK: User still active. Last activity: {last_activity}, Current: {current_time}")
    
    return JsonResponse({
        "status": "active",
        "last_activity": last_activity,
        "current_time": current_time,
        "user": user.email if hasattr(user, 'email') else 'Unknown'
    })


def dashboard_view(request):
    return render(request, 'system/dashboard.html')


def ciso_profile_api(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    user = _get_authenticated_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication required"}, status=401)

    # Check if user has CISO role
    if not user.userrole_set.filter(role__name='CISO', is_active=True).exists():
        return JsonResponse({"detail": "Forbidden"}, status=403)

    return JsonResponse(
        {
            "email": user.email,
            "university_id": user.university_id,
            "first_name": user.first_name,
            "middle_name": user.middle_name,
            "last_name": user.last_name,
            "role": "CISO",
        }
    )


def ovphe_profile_api(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    user = _get_authenticated_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication required"}, status=401)

    # Check if user has OVPHE role
    if not user.userrole_set.filter(role__name='OVPHE', is_active=True).exists():
        return JsonResponse({"detail": "Forbidden"}, status=403)

    return JsonResponse(
        {
            "email": user.email,
            "university_id": user.university_id,
            "first_name": user.first_name,
            "middle_name": user.middle_name,
            "last_name": user.last_name,
            "role": "OVPHE",
        }
    )

def _get_active_ovphe_admin(request):
    user = _get_authenticated_user(request)
    if not user:
        return None
    
    # Check if user has OVPHE role
    if user.userrole_set.filter(role__name='OVPHE', is_active=True).exists():
        return user
    return None


def _require_ovphe_admin(request):
    admin = _get_active_ovphe_admin(request)
    if not admin:
        return None, JsonResponse({"detail": "OVPHE user not found"}, status=404)
    return admin, None


def _parse_json_body(request):
    try:
        raw = request.body.decode("utf-8") if request.body else ""
        if not raw:
            return {}, None
        return json.loads(raw), None
    except Exception:
        return None, JsonResponse({"detail": "Invalid JSON"}, status=400)


def _validate_xu_email(value: str):
    e = (value or "").strip().lower()
    if not e:
        return None
    if not (e.endswith("@xu.edu.ph") or e.endswith("@my.xu.edu.ph")):
        return None
    return e


def _json_method_not_allowed():
    return JsonResponse({"detail": "Method not allowed"}, status=405)


def _as_int(v, default=0):
    try:
        return int(v)
    except Exception:
        return default


def _is_college_referenced(college: College):
    return (
        Faculty.objects.filter(college=college).exists()
        or Approver.objects.filter(college=college).exists()
        or StudentAssistant.objects.filter(college=college).exists()
        or ApproverFlowStep.colleges.through.objects.filter(college_id=college.id).exists()
        or Department.objects.filter(college=college).exists()
    )


def _is_department_referenced(dept: Department):
    return (
        Faculty.objects.filter(department=dept).exists()
        or Approver.objects.filter(department=dept).exists()
        or StudentAssistant.objects.filter(department=dept).exists()
    )


def _is_office_referenced(office: Office):
    return (
        Faculty.objects.filter(office=office).exists()
        or Approver.objects.filter(office=office).exists()
        # Requirement currently has no offices m2m; rely on direct usages instead.
        or ApproverFlowStep.objects.filter(office=office).exists()
    )


def _get_active_ciso_admin(request=None):
    # Get the currently authenticated user with CISO role
    if not request:
        return None
    
    user = _get_authenticated_user(request)
    if not user:
        return None
    
    # Check if user has active CISO role
    if user.userrole_set.filter(role__name='CISO', is_active=True).exists():
        return user
    
    return None


def _require_ciso_admin_user(request):
    user = _get_authenticated_user(request)
    if not user:
        return None, JsonResponse({"detail": "Authentication required"}, status=401)

    # Check if user has CISO role
    if not user.userrole_set.filter(role__name='CISO', is_active=True).exists():
        return None, JsonResponse({"detail": "Forbidden"}, status=403)

    return user, None


def _require_approver_user(request):
    user = _get_authenticated_user(request)
    if not user:
        return None, JsonResponse({"detail": "Authentication required"}, status=401)

    # Check if user has approver-related role
    approver_roles = ['Department Chair', 'Office Admin', 'College Admin', 'Approver']
    user_roles = user.get_active_roles().values_list('role__name', flat=True)
    if not any(role in user_roles for role in approver_roles):
        return None, JsonResponse({"detail": "Forbidden"}, status=403)

    return user, None


def _format_timestamp(dt: datetime | None):
    if not dt:
        return ""
    local = timezone.localtime(dt)
    try:
        return local.strftime("%B %-d, %Y, %-I:%M %p")
    except Exception:
        return local.strftime("%B %d, %Y, %I:%M %p").replace(" 0", " ")


def _format_export_datetime(dt: datetime | None):
    if not dt:
        return ""
    try:
        local = timezone.localtime(dt) if timezone.is_aware(dt) else dt
    except Exception:
        local = dt
    return local.strftime("%Y-%m-%d %I:%M %p")


def _format_time_label(dt: datetime):
    try:
        return dt.strftime("%-I:%M %p")
    except Exception:
        return dt.strftime("%I:%M %p").lstrip("0")


def _json_body(request):
    if not request.body:
        return {}
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except Exception:
        return None
    return payload if isinstance(payload, dict) else None


def _serialize_guideline(g: SystemGuideline):
    return {
        "id": g.id,
        "title": g.title or "",
        "description": g.body or "",
        "email": g.created_by.email if g.created_by else "",
        "timestamp": _format_timestamp(g.created_at),
        "enabled": bool(g.is_active),
    }


def _post_notification(title: str, body: str, details: list, user_role: str, user_id: int | None):
    """POST a notification via the internal API."""
    from django.test import Client
    client = Client()
    response = client.post(
        "/admin/xu-faculty-clearance/api/faculty/notifications",
        data=json.dumps({
            "title": title,
            "body": body,
            "details": details,
            "user_role": user_role,
            "user_id": user_id,
            "is_read": False,
            "status": None,
        }),
        content_type="application/json",
    )
    return response.status_code == 200


def _serialize_announcement(a: Announcement):
    return {
        "id": a.id,
        "title": a.title or "",
        "description": a.body or "",
        "email": a.created_by.email if a.created_by else "",
        "timestamp": _format_timestamp(a.created_at),
        "pinned": bool(a.pin_announcement),
        "enabled": bool(a.is_active),
    }


def _get_active_admin_for_role(request, role: str | None):
    if role == "ovphe":
        return _get_active_ovphe_admin(request)
    if role == "ciso":
        return _get_active_ciso_admin(request)
    return None


def _admin_user_role_label(role: str | None) -> str | None:
    if role == "ciso":
        return "CISO"
    if role == "ovphe":
        return "OVPHE"
    return None


@csrf_exempt
def _system_guidelines_api(request, role: str):
    if request.method == "GET":
        guidelines = SystemGuideline.objects.select_related("created_by").order_by("-created_at", "-id")
        return JsonResponse({"items": [_serialize_guideline(g) for g in guidelines]})

    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    payload = _json_body(request)
    if payload is None:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)

    title = (payload.get("title") or "").strip()
    description = (payload.get("description") or "").strip()
    enabled = payload.get("enabled")

    if not title:
        return JsonResponse({"detail": "title is required"}, status=400)

    admin = _get_active_admin_for_role(request, role)
    session_user = _get_authenticated_user(request)
    created_by = admin if admin else None

    guideline = SystemGuideline.objects.create(
        title=title,
        body=description,
        created_by=created_by,
        is_active=bool(enabled) if enabled is not None else True,
    )
    try:
        ActivityLog.objects.create(
            event_type=ActivityLog.EventType.CREATED_GUIDELINE,
            user=admin if admin else None,
            user_role=_admin_user_role_label(role),
            details=[f"Guideline: {title}"],
        )
    except Exception:
        pass
    
    # Auto-create notifications like announcements API
    try:
        for role in ["Approver", "CISO", "OVPHE", "Assistant"]:
            Notification.objects.create(
                user=session_user,
                user_role=role,
                title="New Guideline Released",
                status=None,
                body=f"{title} is now active. Please review the updated procedures.",
                details=[f'Guideline = "{title}"'],
                is_read=False,
            )
    except Exception as e:
        import traceback
        print(f"ERROR creating guideline notifications: {e}")
        traceback.print_exc()
    
    return JsonResponse({"item": _serialize_guideline(guideline)})


@csrf_exempt
def _system_guideline_detail_api(request, role: str, guideline_id: int):
    try:
        guideline = SystemGuideline.objects.select_related("created_by").get(pk=guideline_id)
    except SystemGuideline.DoesNotExist:
        return JsonResponse({"detail": "Not found"}, status=404)

    admin = _get_active_admin_for_role(request, role)
    editor_user = admin if admin else None

    if request.method == "PUT":
        payload = _json_body(request)
        if payload is None:
            return JsonResponse({"detail": "Invalid JSON"}, status=400)

        title = (payload.get("title") or "").strip()
        description = (payload.get("description") or "").strip()
        if not title:
            return JsonResponse({"detail": "title is required"}, status=400)

        guideline.title = title
        guideline.body = description
        guideline.created_at = timezone.now()
        if editor_user is not None:
            guideline.created_by = editor_user
        guideline.save(update_fields=["title", "body", "created_at", "created_by"])
        try:
            ActivityLog.objects.create(
                event_type=ActivityLog.EventType.EDITED_GUIDELINE,
                user=admin if admin else None,
                user_role=_admin_user_role_label(role),
                details=[f"Guideline: {title}"],
            )
        except Exception:
            pass
        return JsonResponse({"item": _serialize_guideline(guideline)})

    if request.method == "PATCH":
        payload = _json_body(request)
        if payload is None:
            return JsonResponse({"detail": "Invalid JSON"}, status=400)

        if "enabled" not in payload:
            return JsonResponse({"detail": "enabled is required"}, status=400)

        guideline.is_active = bool(payload.get("enabled"))
        guideline.created_at = timezone.now()
        if editor_user is not None:
            guideline.created_by = editor_user
        guideline.save(update_fields=["is_active", "created_at", "created_by"])
        try:
            evt = ActivityLog.EventType.ENABLED_GUIDELINE if guideline.is_active else ActivityLog.EventType.DISABLED_GUIDELINE
            ActivityLog.objects.create(
                event_type=evt,
                user=admin if admin else None,
                user_role=_admin_user_role_label(role),
                details=[f"Guideline: {guideline.title}"],
            )
            if not guideline.is_active:
                ActivityLog.objects.create(
                    event_type=ActivityLog.EventType.ARCHIVED_GUIDELINE,
                    user=admin if admin else None,
                    user_role=_admin_user_role_label(role),
                    details=[f"Guideline: {guideline.title}"],
                )
        except Exception:
            pass
        return JsonResponse({"item": _serialize_guideline(guideline)})

    if request.method == "DELETE":
        guideline_title = guideline.title
        try:
            ActivityLog.objects.create(
                event_type=ActivityLog.EventType.DELETE_GUIDELINE,
                user=admin if admin else None,
                user_role=_admin_user_role_label(role),
                details=[f"Guideline: {guideline_title}"],
            )
        except Exception:
            pass
        guideline.delete()
        return JsonResponse({"ok": True})

    if request.method == "GET":
        return JsonResponse({"item": _serialize_guideline(guideline)})

    return JsonResponse({"detail": "Method not allowed"}, status=405)


@csrf_exempt
def _announcements_api(request, role: str):
    if request.method == "GET":
        announcements = Announcement.objects.order_by("-created_at", "-id")
        return JsonResponse({"items": [_serialize_announcement(a) for a in announcements]})

    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    payload = _json_body(request)
    if payload is None:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)

    title = (payload.get("title") or "").strip()
    description = (payload.get("description") or "").strip()
    pinned = payload.get("pinned")
    enabled = payload.get("enabled")

    if not title:
        return JsonResponse({"detail": "title is required"}, status=400)

    admin = _get_active_admin_for_role(request, role)
    session_user = _get_authenticated_user(request)

    announcement = Announcement.objects.create(
        title=title,
        body=description,
        created_by=admin,
        pin_announcement=bool(pinned) if pinned is not None else False,
        is_active=bool(enabled) if enabled is not None else True,
    )
    try:
        for role in ["Approver", "CISO", "OVPHE", "Assistant"]:
            Notification.objects.create(
                user_id=session_user.id if session_user else None,
                user_role=role,
                title="New Announcement",
                status=None,
                body=f"{title}. Check announcements section for more details.",
                details=[f'Announcement = "{title}"'],
                is_read=False,
            )
    except Exception as e:
        import traceback
        print(f"ERROR creating create notifications: {e}")
        traceback.print_exc()
    return JsonResponse({"item": _serialize_announcement(announcement)})


@csrf_exempt
def _announcement_detail_api(request, role: str, announcement_id: int):
    try:
        announcement = Announcement.objects.get(pk=announcement_id)
    except Announcement.DoesNotExist:
        return JsonResponse({"detail": "Not found"}, status=404)

    admin = _get_active_admin_for_role(request, role)
    session_user = _get_authenticated_user(request)

    if request.method == "PUT":
        payload = _json_body(request)
        if payload is None:
            return JsonResponse({"detail": "Invalid JSON"}, status=400)

        title = (payload.get("title") or "").strip()
        description = (payload.get("description") or "").strip()
        pinned = payload.get("pinned")

        if not title:
            return JsonResponse({"detail": "title is required"}, status=400)

        announcement.title = title
        announcement.body = description
        if pinned is not None:
            announcement.pin_announcement = bool(pinned)
        announcement.created_at = timezone.now()
        if admin is not None:
            announcement.created_by = admin
        announcement.save(update_fields=["title", "body", "pin_announcement", "created_at", "created_by"])
        try:
            for role in ["Approver", "CISO", "OVPHE", "Assistant"]:
                Notification.objects.create(
                    user_id=session_user.id if session_user else None,
                    user_role=role,
                    title="Update",
                    status=None,
                    body=f'The announcement "{title}" has been updated by the System Admin.',
                    details=[f'Announcement = "{title}"'],
                    is_read=False,
                )
            ActivityLog.objects.create(
                event_type=ActivityLog.EventType.EDITED_ANNOUNCEMENT,
                user=admin,
                details=[f"Announcement: {title}"] if title else [],
            )
        except Exception as e:
            # Debug: log the error
            import traceback
            print(f"ERROR creating edit notification: {e}")
            traceback.print_exc()
        return JsonResponse({"item": _serialize_announcement(announcement)})

    if request.method == "PATCH":
        payload = _json_body(request)
        if payload is None:
            return JsonResponse({"detail": "Invalid JSON"}, status=400)

        updated_fields = []
        if "enabled" in payload:
            announcement.is_active = bool(payload.get("enabled"))
            updated_fields.append("is_active")
        if "pinned" in payload:
            announcement.pin_announcement = bool(payload.get("pinned"))
            updated_fields.append("pin_announcement")

        announcement.created_at = timezone.now()
        updated_fields.append("created_at")
        if admin is not None:
            announcement.created_by = admin
            updated_fields.append("created_by")

        if not updated_fields:
            return JsonResponse({"detail": "No fields to update"}, status=400)

        announcement.save(update_fields=updated_fields)
        try:
            if "enabled" in payload:
                # Inactive announcement notification
                if not announcement.is_active:
                    for role in ["CISO", "OVPHE"]:
                        Notification.objects.create(
                            user_id=session_user.id if session_user else None,
                            user_role=role,
                            title="Notice",
                            status=None,
                            body=f'The announcement "{announcement.title}" has been set to Inactive and is no longer visible to the approvers and their approver assistants.',
                            details=[f'Announcement = "{announcement.title}"'],
                            is_read=False,
                        )
                evt = (
                    ActivityLog.EventType.ENABLED_ANNOUNCEMENT
                    if announcement.is_active
                    else ActivityLog.EventType.DISABLED_ANNOUNCEMENT
                )
                ActivityLog.objects.create(
                    event_type=evt,
                    user=admin,
                    details=[f"Announcement: {announcement.title}"] if announcement.title else [],
                )
        except Exception as e:
            # Debug: log the error
            import traceback
            print(f"ERROR creating inactive notification: {e}")
            traceback.print_exc()
        return JsonResponse({"item": _serialize_announcement(announcement)})

    if request.method == "DELETE":
        announcement_title = announcement.title
        try:
            user_name = f"{session_user.first_name} {session_user.last_name}".strip() if session_user else "System Admin"
            for role in ["CISO", "OVPHE"]:
                Notification.objects.create(
                    user_id=session_user.id if session_user else None,
                    user_role=role,
                    title="Content Archived",
                    status=None,
                    body=f'"{announcement_title}" has been moved to archives by {user_name}.',
                    details=[f'Announcement = "{announcement_title}"'],
                    is_read=False,
                )
            ActivityLog.objects.create(
                event_type=ActivityLog.EventType.DELETED_ANNOUNCEMENT,
                user=admin,
                details=[f"Announcement: {announcement_title}"] if announcement_title else [],
            )
        except Exception as e:
            # Debug: log the error
            import traceback
            print(f"ERROR creating archived notification: {e}")
            traceback.print_exc()
        announcement.delete()
        return JsonResponse({"ok": True})

    if request.method == "GET":
        return JsonResponse({"item": _serialize_announcement(announcement)})

    return JsonResponse({"detail": "Method not allowed"}, status=405)


def _format_time_label(dt: datetime):
    try:
        return dt.strftime("%-I:%M %p")
    except Exception:
        return dt.strftime("%I:%M %p").lstrip("0")


def _term_to_label(term: str | None):
    if term == Clearance.Term.FIRST:
        return "First Semester"
    if term == Clearance.Term.SECOND:
        return "Second Semester"
    if term == Clearance.Term.INTERSESSION:
        return "Intersession"
    return ""


def _label_to_term(label: str | None):
    if label == "First Semester":
        return Clearance.Term.FIRST
    if label == "Second Semester":
        return Clearance.Term.SECOND
    if label == "Intersession":
        return Clearance.Term.INTERSESSION
    return None


def _parse_iso_date(value: str | None):
    value = (value or "").strip()
    if not value:
        return None
    try:
        return datetime.fromisoformat(value).date()
    except Exception:
        return None


def _parse_int(value: str | None):
    value = (value or "").strip()
    if not value:
        return None
    try:
        return int(value)
    except Exception:
        return None

 
 
def _to_request_status(value: str | None):
    if value == ClearanceRequest.Status.APPROVED:
        return "approved"
    if value == ClearanceRequest.Status.REJECTED:
        return "rejected"
    return "pending"


def clearance_requests_api(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    user = _get_authenticated_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication required"}, status=401)

    # Check if user has Approver role
    if not user.userrole_set.filter(role__name='Approver', is_active=True).exists():
        return JsonResponse({"detail": "Access denied"}, status=403)

    active_timeline = _get_active_timeline()
    if not active_timeline:
        return JsonResponse({"items": []})

    # Get approver profile information
    from .models import Approver
    approver_info = None
    try:
        approver = Approver.objects.get(user=user)
        approver_info = {
            "approver_type": approver.approver_type,
            "college": approver.college,
            "department": approver.department,
            "office": approver.office,
        }
    except Approver.DoesNotExist:
        approver_info = None

    # Get requirements that this approver needs to approve
    requirements = Requirement.objects.filter(
        clearance_timeline=active_timeline,
        is_active=True
    ).select_related(
        'created_by', 'clearance_timeline'
    ).prefetch_related(
        'target_colleges', 'target_departments', 'target_offices', 'target_faculty'
    )
    
    # Filter requirements based on approver's scope using the same logic as requirement access
    filtered_requirements = []
    for req in requirements:
        if approver and approver_info:
            if _can_approver_access_requirement(approver, req):
                filtered_requirements.append(req)
        else:
            # If no approver profile, include all requirements (fallback)
            filtered_requirements.append(req)

    qs = (
        ClearanceRequest.objects.select_related(
            "faculty",
            "faculty__college",
            "faculty__department",
        )
        .filter(clearance_timeline=active_timeline, requirement__in=filtered_requirements)
        .order_by("-id")
    )

    items = []
    for r in qs:
        faculty = getattr(r, "faculty", None)

        first_name = (getattr(faculty, "first_name", "") or "").strip()
        middle_name = (getattr(faculty, "middle_name", "") or "").strip()
        last_name = (getattr(faculty, "last_name", "") or "").strip()

        parts = [p for p in [first_name, middle_name, last_name] if p]
        full_name = " ".join(parts)

        college = getattr(getattr(faculty, "college", None), "name", "") or ""
        department = getattr(getattr(faculty, "department", None), "name", "") or ""
        faculty_type = getattr(faculty, "faculty_type", "") or ""

        employee_id = getattr(faculty, "employee_id", "") or ""

        items.append(
            {
                "id": str(r.id),
                "requestId": r.request_id,
                "employeeId": employee_id,
                "name": full_name,
                "college": college,
                "department": department,
                "facultyType": faculty_type,
                "status": _to_request_status(r.status),
            }
        )

    return JsonResponse({"items": items})


@csrf_exempt
def ciso_system_user_detail_api(request, user_id: int):
    admin, err = _require_ciso_admin_user(request)
    if err:
        return err

    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return JsonResponse({"detail": "User not found"}, status=404)

    if request.method in {"PUT", "PATCH", "DELETE"} and user.pk == admin.pk:
        return JsonResponse({"detail": "You cannot edit or remove your own account from Manage System Users"}, status=403)

    def _full_name(u: User):
        parts = [(u.first_name or "").strip(), (u.middle_name or "").strip(), (u.last_name or "").strip()]
        parts = [p for p in parts if p]
        return " ".join(parts) if parts else u.email

    if request.method == "GET":
        # Get user's active roles
        user_roles = user.get_active_roles()
        role = "Unknown"
        college_label = "N/A"
        dept_label = "N/A"

        if user_roles:
            # Get the highest priority role for display
            role_priority = ['CISO', 'OVPHE', 'Approver', 'Student Assistant', 'Faculty']
            
            for priority_role in role_priority:
                user_role = user_roles.filter(role__name=priority_role).first()
                if user_role:
                    role = priority_role
                    # Set college/department labels based on role assignment
                    if user_role.college:
                        college_label = user_role.college.name
                    if user_role.department:
                        dept_label = user_role.department.name
                    elif user_role.office:
                        dept_label = user_role.office.name
                    break

        return JsonResponse(
            {
                "item": {
                    "id": str(user.id),
                    "name": _full_name(user),
                    "systemId": f"SYS-{user.id}",
                    "userRole": role,
                    "universityId": user.university_id or "",
                    "college": college_label,
                    "department": dept_label,
                    "email": user.email,
                    # Derive active status from any active role assignments
                    "isActive": user.get_active_roles().exists(),
                }
            }
        )

    if request.method == "DELETE":
        with transaction.atomic():
            # Delete related profiles first
            approver_profile = getattr(user, "approver_profile", None)
            if approver_profile:
                approver_profile.delete()
            
            assistant_profile = getattr(user, "assistant_profile", None)
            if assistant_profile:
                assistant_profile.delete()
            
            # Delete user role assignments
            user.userrole_set.all().delete()
            
            # Delete the user completely
            user.delete()

        return JsonResponse({"ok": True})

    if request.method not in {"PUT", "PATCH"}:
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    data, parse_err = _parse_json_body(request)
    if parse_err:
        return parse_err
    if not isinstance(data, dict):
        return JsonResponse({"detail": "Invalid payload"}, status=400)

    first_name = (data.get("firstName") or "").strip()
    middle_name = (data.get("middleName") or "").strip()
    last_name = (data.get("lastName") or "").strip()
    university_id = (data.get("universityId") or "").strip()
    raw_email = (data.get("email") or "").strip()
    email = _validate_xu_email(raw_email)
    is_active = bool(data.get("isActive", True))

    if not email:
        return JsonResponse({"detail": "Email must be an XU email (@xu.edu.ph or @my.xu.edu.ph)"}, status=400)
    if not university_id or not university_id.isdigit():
        return JsonResponse({"detail": "University ID must be a valid number"}, status=400)

    system_admin_office = (data.get("systemAdminOffice") or "").strip()
    approver_type = (data.get("approverType") or "").strip()

    with transaction.atomic():
        if User.objects.filter(email__iexact=email).exclude(pk=user.id).exists():
            return JsonResponse({"detail": "Email already exists"}, status=400)
        if User.objects.filter(university_id__iexact=university_id).exclude(pk=user.id).exists():
            return JsonResponse({"detail": "University ID already exists"}, status=400)

        user.email = email
        user.university_id = university_id
        user.first_name = first_name
        user.middle_name = middle_name
        user.last_name = last_name
        user.save(update_fields=[
            "email",
            "university_id",
            "first_name",
            "middle_name",
            "last_name",
        ])

        # Update all role assignments to reflect the desired active status
        user.userrole_set.update(is_active=is_active)

        if system_admin_office:
            office_norm = system_admin_office.strip().upper()
            if office_norm not in {"CISO", "OVPHE"}:
                return JsonResponse({"detail": "Invalid system admin office"}, status=400)

            # Get or create the appropriate role
            from .models import Role
            role_name = "CISO" if office_norm == "CISO" else "OVPHE"
            role, created = Role.objects.get_or_create(
                name=role_name,
                defaults={'description': f'{role_name} admin role'}
            )
            
            # Remove existing admin roles for this user
            user.userrole_set.filter(role__name__in=['CISO', 'OVPHE']).delete()
            
            # Create new role assignment
            from .models import UserRole
            UserRole.objects.create(
                user=user,
                role=role,
                is_active=True,
                # Use the authenticated CISO admin as the assigner
                assigned_by=admin,
            )

        assistant_profile = getattr(user, "assistant_profile", None)
        if assistant_profile and not system_admin_office:
            assistant_type = (data.get("assistantType") or "student_assistant").strip() or "student_assistant"

            if approver_type:
                atype = approver_type.strip().lower()
                if atype != "college":
                    return JsonResponse({"detail": "Invalid approver type"}, status=400)

            college_name = (data.get("college") or "").strip()
            dept_name = (data.get("department") or "").strip()
            office_name = (data.get("office") or "").strip()
            
            if assistant_type == "student_assistant":
                # Student assistant: need both college and department
                if not college_name:
                    return JsonResponse({"detail": "College is required"}, status=400)
                if not dept_name:
                    return JsonResponse({"detail": "Department is required"}, status=400)
            else:
                # Admin assistant: only need department OR office
                if not dept_name and not office_name:
                    return JsonResponse({"detail": "Department or Office is required for Admin assistants"}, status=400)

            college = College.objects.filter(name__iexact=college_name, is_active=True).first()
            if college_name and not college:
                return JsonResponse({"detail": "College not found"}, status=400)

            department = Department.objects.filter(
                name__iexact=dept_name,
                college=college if college else None,
                is_active=True,
            ).first()
            if dept_name and not department:
                return JsonResponse({"detail": "Department not found"}, status=400)

            assistant_profile.college = college
            assistant_profile.department = department
            assistant_profile.save(update_fields=["college", "department"])
            
            # Delete approver profile if exists

            approver_profile = getattr(user, "approver_profile", None)
            if approver_profile:
                approver_profile.delete()

            # Assign Student Assistant role
            from .models import Role, UserRole
            student_role, created = Role.objects.get_or_create(
                name='Student Assistant',
                defaults={'description': 'Student Assistant role'}
            )
            UserRole.objects.get_or_create(
                user=user,
                role=student_role,
                defaults={'is_active': True}
            )

        elif approver_type:
            atype = approver_type.strip().lower()
            if atype not in {"college", "office"}:
                return JsonResponse({"detail": "Invalid approver type"}, status=400)

            approver_profile, _ = Approver.objects.get_or_create(user=user)
            approver_profile.approver_type = "College" if atype == "college" else "Office"

            if atype == "college":
                college_name = (data.get("college") or "").strip()
                dept_name = (data.get("department") or "").strip()
                if not college_name:
                    return JsonResponse({"detail": "College is required"}, status=400)
                if not dept_name:
                    return JsonResponse({"detail": "Department is required"}, status=400)

                college = College.objects.filter(name__iexact=college_name, is_active=True).first()
                if not college:
                    return JsonResponse({"detail": "College not found"}, status=400)

                department = Department.objects.filter(
                    name__iexact=dept_name,
                    college=college,
                    is_active=True,
                ).first()
                if not department:
                    return JsonResponse({"detail": "Department not found"}, status=400)

                approver_profile.college = college
                approver_profile.department = department
                approver_profile.office = None

            if atype == "office":
                office_name = (data.get("office") or "").strip()
                if not office_name:
                    return JsonResponse({"detail": "Office is required"}, status=400)

                office = Office.objects.filter(name__iexact=office_name, is_active=True).first()
                if not office:
                    return JsonResponse({"detail": "Office not found"}, status=400)

                approver_profile.office = office
                approver_profile.college = None
                approver_profile.department = None

            approver_profile.save(update_fields=["approver_type", "office", "college", "department"])
            
            # Assign appropriate role based on approver type
            from .models import Role, UserRole
            # Always use "Approver" role regardless of approver type
            role_name = "Approver"
            
            role, created = Role.objects.get_or_create(
                name=role_name,
                defaults={'description': 'Approver role'}
            )
            user_role, _ = UserRole.objects.get_or_create(
                user=user,
                role=role,
                defaults={'is_active': True},
            )
            # Respect the requested active flag for all roles on this user
            if not is_active and user_role.is_active:
                user_role.is_active = False
                user_role.save(update_fields=["is_active"])

    return JsonResponse({"ok": True})


def _legacy_active_clearance_timeline_api(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    t = _get_active_timeline()
    if not t:
        return JsonResponse({"academicYear": "", "semester": ""})

    if t.academic_year_start is not None and t.academic_year_end is not None:
        academic_year = f"{t.academic_year_start}–{t.academic_year_end}"
    else:
        academic_year = ""

    semester = _term_to_label(t.term)
    return JsonResponse({"academicYear": academic_year, "semester": semester})


def _label_to_term(label: str | None):
    if label == "First Semester":
        return Clearance.Term.FIRST
    if label == "Second Semester":
        return Clearance.Term.SECOND
    if label == "Intersession":
        return Clearance.Term.INTERSESSION
    return None


def _parse_iso_date(value: str | None):
    value = (value or "").strip()
    if not value:
        return None
    try:
        return datetime.fromisoformat(value).date()
    except Exception:
        return None


def _parse_int(value: str | None):
    value = (value or "").strip()
    if not value:
        return None
    try:
        return int(value)
    except Exception:
        return None


def _get_active_timeline():
    return ClearanceTimeline.objects.filter(is_active=True).order_by("-id").first()


def _to_request_status(value: str | None):
    if value == ClearanceRequest.Status.APPROVED:
        return "approved"
    if value == ClearanceRequest.Status.REJECTED:
        return "rejected"
    return "pending"


def _can_approver_access_request(user: User, clearance_request: ClearanceRequest) -> bool:
    """Check if approver has permission to access a specific clearance request"""
    # Get user's approver profile
    try:
        approver_profile = user.approver_profile
    except AttributeError:
        return False
    
    faculty = clearance_request.faculty
    requirement = clearance_request.requirement
    
    # Check if approver has scope based on their assignment
    if approver_profile.office and requirement.approver_flow_step.office == approver_profile.office:
        return True
    
    if approver_profile.college:
        # Check if college matches faculty college or requirement target college
        if (approver_profile.college == faculty.college or 
            requirement.target_colleges.filter(id=approver_profile.college.id).exists()):
            return True
    
    if approver_profile.department:
        # Check if department matches faculty department or requirement target department
        if (approver_profile.department == faculty.department or 
            requirement.target_departments.filter(id=approver_profile.department.id).exists()):
            return True
    
    return False


def active_clearance_timeline_api(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    t = _get_active_timeline()
    if not t:
        return JsonResponse({"academicYear": "", "semester": ""})

    if t.academic_year_start is not None and t.academic_year_end is not None:
        academic_year = f"{t.academic_year_start}–{t.academic_year_end}"
    else:
        academic_year = ""

    semester = _term_to_label(t.term)
    return JsonResponse({"academicYear": academic_year, "semester": semester})

@csrf_exempt
@ciso_required
def ciso_faculty_dump_template_api(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    headers = [
        "email",
        "university_id",
        "employee_id",
        "first_name",
        "middle_name",
        "last_name",
        "faculty_type",
        "phone_number",
        "college",
        "department",
    ]

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)

    sample_rows = [
        {
            "email": "new.faculty13@xu.edu.ph",
            "university_id": "2024-000013",
            "employee_id": "EMP-000013",
            "first_name": "New",
            "middle_name": "A.",
            "last_name": "Faculty",
            "faculty_type": "Full-time",
            "phone_number": "09171234567",
            "college": "College of Computer Studies",
            "department": "Information Technology",
        },
        {
            "email": "new.faculty14@xu.edu.ph",
            "university_id": "2024-000014",
            "employee_id": "EMP-000014",
            "first_name": "Faculty",
            "middle_name": "B.",
            "last_name": "New",
            "faculty_type": "Part-time",
            "phone_number": "09987654321",
            "college": "College of Arts and Sciences",
            "department": "Mathematics",
        },
    ]

    for row in sample_rows:
        writer.writerow([row.get(h, "") for h in headers])

    # Add UTF-8 bom for excel compatibility
    csv_content = output.getvalue()
    bom_content = '\ufeff' + csv_content
    resp = HttpResponse(bom_content, content_type="text/csv;charset=utf-8")
    resp["Content-Disposition"] = 'attachment; filename="faculty_template.csv"'
    return resp


@csrf_exempt
def ciso_faculty_dump_import_api(request):
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    # Validate clearance timeline / semester selection.
    # Primary path: use explicit clearance_timeline_id coming from the
    # frontend. If it is missing (e.g., older bundle), fall back to the
    # single active ClearanceTimeline if one exists.
    timeline_id = (request.POST.get("clearance_timeline_id") or "").strip()

    clearance_timeline: ClearanceTimeline | None = None
    if timeline_id:
        try:
            clearance_timeline = ClearanceTimeline.objects.get(id=timeline_id)
        except ClearanceTimeline.DoesNotExist:
            return JsonResponse(
                {"detail": "Selected semester does not exist in the current clearance timelines."},
                status=400,
            )
    else:
        # Graceful fallback: use the active timeline, if there is one.
        clearance_timeline = (
            ClearanceTimeline.objects.filter(is_active=True)
            .order_by("-academic_year_start", "-academic_year_end", "-id")
            .first()
        )
        if not clearance_timeline:
            return JsonResponse(
                {
                    "detail": "Missing clearance_timeline_id and no active clearance timeline found; please configure a clearance timeline first.",
                },
                status=400,
            )

    upload = request.FILES.get("file")
    if not upload:
        return JsonResponse({"detail": "Missing file"}, status=400)

    if not upload.name.lower().endswith(".csv"):
        return JsonResponse({"detail": "Only CSV files are supported"}, status=400)

    raw = upload.read()
    text = None
    # Try common encodings: UTF-8 with BOM, plain UTF-8, then Latin-1/Windows-1252
    for enc in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            text = raw.decode(enc)
            break
        except Exception:
            continue
    if text is None:
        return JsonResponse({"detail": "Unable to decode CSV; please upload a UTF-8 or Latin-1 encoded csv"}, status=400)

    reader = csv.DictReader(io.StringIO(text))
    required_cols = {"email", "university_id", "employee_id"}
    header_cols = set((reader.fieldnames or []))
    missing_cols = sorted(required_cols - header_cols)
    if missing_cols:
        return JsonResponse(
            {"detail": "Missing required columns", "missing": missing_cols},
            status=400,
        )

    created_count = 0
    updated_count = 0
    skipped_count = 0
    errors: list[dict] = []

    def _clean(value: str | None):
        return (value or "").strip()

    # Get or create Faculty role
    try:
        faculty_role = Role.objects.get(name='Faculty')
    except Role.DoesNotExist:
        faculty_role = Role.objects.create(name='Faculty', description='Faculty member', is_system_role=True)

    # Process CSV and create faculty directly
    for idx, row in enumerate(reader, start=2):
        email = _clean(row.get("email"))
        university_id = _clean(row.get("university_id"))
        employee_id = _clean(row.get("employee_id"))

        if not employee_id:
            errors.append({"row": idx, "message": "employee_id is required"})
            skipped_count += 1
            continue
        if not email:
            errors.append({"row": idx, "message": "email is required"})
            skipped_count += 1
            continue
        if not university_id:
            errors.append({"row": idx, "message": "university_id is required"})
            skipped_count += 1
            continue

        first_name = _clean(row.get("first_name"))
        middle_name = _clean(row.get("middle_name"))
        last_name = _clean(row.get("last_name"))
        faculty_type = _clean(row.get("faculty_type"))
        phone_number = _clean(row.get("phone_number"))
        office_name = _clean(row.get("office"))
        college_name = _clean(row.get("college"))
        department_name = _clean(row.get("department"))

        try:
            with transaction.atomic():
                # Create or update User
                user, user_created = User.objects.get_or_create(
                    email=email.lower(),
                    defaults={
                        'university_id': university_id,
                        'first_name': first_name,
                        'middle_name': middle_name,
                        'last_name': last_name,
                    }
                )
                
                if not user_created:
                    # Update existing user
                    user.university_id = university_id
                    user.first_name = first_name
                    user.middle_name = middle_name
                    user.last_name = last_name
                    user.save()

                # Create or update Faculty profile
                faculty, faculty_created = Faculty.objects.get_or_create(
                    user=user,
                    defaults={
                        'employee_id': employee_id,
                        'faculty_type': faculty_type,
                        'phone_number': phone_number,
                        'first_name': first_name,
                        'middle_name': middle_name,
                        'last_name': last_name,
                    }
                )
                
                if not faculty_created:
                    # Update existing faculty
                    faculty.employee_id = employee_id
                    faculty.faculty_type = faculty_type
                    faculty.phone_number = phone_number
                    faculty.first_name = first_name
                    faculty.middle_name = middle_name
                    faculty.last_name = last_name
                    faculty.save()

                # Handle relationships
                if college_name:
                    college, _ = College.objects.get_or_create(
                        name=college_name,
                        defaults={'is_active': True}
                    )
                    faculty.college = college
                
                if department_name and college_name:
                    department, _ = Department.objects.get_or_create(
                        name=department_name,
                        college=college,
                        defaults={'is_active': True}
                    )
                    faculty.department = department
                
                if office_name:
                    office, _ = Office.objects.get_or_create(
                        name=office_name,
                        defaults={'is_active': True}
                    )
                    faculty.office = office
                
                faculty.save()

                # Assign Faculty role
                UserRole.objects.get_or_create(
                    user=user,
                    role=faculty_role,
                    defaults={'is_active': True}
                )

                if user_created or faculty_created:
                    created_count += 1
                else:
                    updated_count += 1

        except Exception as e:
            errors.append({"row": idx, "message": f"Error creating faculty: {str(e)}"})
            skipped_count += 1

    # After processing rows, save the uploaded CSV to disk and create
    # a FacultyDumpArchive entry tied to the selected clearance timeline.
    try:
        import os
        from django.conf import settings

        media_root = getattr(settings, "MEDIA_ROOT", "") or ""
        dumps_dir = os.path.join(media_root, "faculty_dumps")
        os.makedirs(dumps_dir, exist_ok=True)

        # Build a unique filename for each import so that multiple dumps for
        # the same timeline create distinct archive entries and do not
        # overwrite the previous file on disk.
        safe_name = upload.name.replace("/", "_").replace("\\", "_")
        timestamp = timezone.localtime().strftime("%Y%m%d%H%M%S")
        file_name = f"timeline-{clearance_timeline.id}-{timestamp}-{safe_name}"
        file_path = os.path.join(dumps_dir, file_name)

        with open(file_path, "wb") as f:
            f.write(raw)

        size_bytes = os.path.getsize(file_path)
        size_mb = size_bytes / (1024 * 1024) if size_bytes else 0
        size_label = f"{size_mb:.0f} MB" if size_mb >= 1 else f"{size_bytes} B"

        # Store relative path from MEDIA_ROOT
        relative_path = os.path.relpath(file_path, media_root) if media_root else file_name

        FacultyDumpArchive.objects.create(
            clearance_timeline=clearance_timeline,
            academic_year_start=clearance_timeline.academic_year_start,
            academic_year_end=clearance_timeline.academic_year_end,
            term=clearance_timeline.term,
            dump_file_path=relative_path,
            dump_file_size=size_label,
        )
    except Exception as e:
        errors.append({"row": 0, "message": f"Error saving dump archive: {str(e)}"})

    return JsonResponse(
        {
            "created_count": created_count,
            "updated_count": updated_count,
            "skipped_count": skipped_count,
            "errors": errors,
        }
    )


def ovphe_system_guidelines_api(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    guidelines = SystemGuideline.objects.select_related("created_by").order_by("-created_at", "-id")
    items = []
    for g in guidelines:
        items.append(
            {
                "id": str(g.id),
                "title": g.title or "",
                "description": g.body or "",
                "email": g.created_by.email if g.created_by else "",
                "timestamp": _format_timestamp(g.created_at),
                "enabled": bool(g.is_active),
            }
        )
    return JsonResponse({"items": items})
@csrf_exempt
def ovphe_system_guidelines_api(request):
    return _system_guidelines_api(request, "ovphe")


@csrf_exempt
def ovphe_announcements_api(request):
    return _announcements_api(request, "ovphe")


@csrf_exempt
def ovphe_system_guideline_detail_api(request, guideline_id: int):
    return _system_guideline_detail_api(request, "ovphe", guideline_id)


@csrf_exempt
def ovphe_announcement_detail_api(request, announcement_id: int):
    return _announcement_detail_api(request, "ovphe", announcement_id)


def _parse_int(value: str | None):
    value = (value or "").strip()
    if not value:
        return None
    try:
        return int(value)
    except Exception:
        return None


def _clearance_term_code(term: str | None):
    if term == Clearance.Term.FIRST:
        return "01"
    if term == Clearance.Term.SECOND:
        return "02"
    if term == Clearance.Term.INTERSESSION:
        return "03"
    return ""


def _clearance_timeline_name(start_year: int | None, end_year: int | None, term: str | None):
    year_code = str(start_year)[-2:] if start_year else ""
    term_code = _clearance_term_code(term)
    if year_code and term_code:
        return f"{year_code}{term_code} Faculty Clearance"
    if year_code:
        return f"{year_code} Faculty Clearance"
    return "Faculty Clearance"


def _approver_step_label(requirement: Requirement | None):
    if not requirement:
        return ""

    step = getattr(requirement, "approver_flow_step", None)
    if step:
        office_name = getattr(getattr(step, "office", None), "name", "") or ""
        if office_name:
            return office_name

        category = (getattr(step, "category", "") or "").strip()
        if category:
            return category

    target_departments = list(getattr(requirement, "target_departments", None).all()) if getattr(requirement, "target_departments", None) is not None else []
    if target_departments:
        return ", ".join(sorted({department.name for department in target_departments if getattr(department, "name", "")}))

    target_colleges = list(getattr(requirement, "target_colleges", None).all()) if getattr(requirement, "target_colleges", None) is not None else []
    if target_colleges:
        return ", ".join(sorted({college.name for college in target_colleges if getattr(college, "name", "")}))

    target_offices = list(getattr(requirement, "target_offices", None).all()) if getattr(requirement, "target_offices", None) is not None else []
    if target_offices:
        return ", ".join(sorted({office.name for office in target_offices if getattr(office, "name", "")}))

    return requirement.title or ""


def _timeline_applicable_faculty_ids(timeline: ClearanceTimeline):
    requirements = list(
        Requirement.objects.filter(
            clearance_timeline=timeline,
            is_active=True,
        ).prefetch_related(
            "target_colleges",
            "target_departments",
            "target_offices",
            "target_faculty",
        )
    )

    if not requirements:
        return set()

    faculty_rows = Faculty.objects.select_related("college", "department", "office").all()
    faculty_ids: set[int] = set()
    for faculty in faculty_rows:
        if any(_requirement_applies_to_faculty(requirement, faculty) for requirement in requirements):
            faculty_ids.add(faculty.id)
    return faculty_ids


def _build_timeline_completion_lookup(timeline: ClearanceTimeline, faculty_rows):
    requirement_rows = list(
        Requirement.objects.filter(
            clearance_timeline=timeline,
            is_active=True,
        ).prefetch_related(
            "target_colleges",
            "target_departments",
            "target_offices",
            "target_faculty",
        ).order_by("id")
    )

    faculty_ids = [faculty.id for faculty in faculty_rows]
    request_rows = list(
        ClearanceRequest.objects.filter(
            clearance_timeline=timeline,
            faculty_id__in=faculty_ids,
        ).select_related("requirement")
    )

    requests_by_faculty: dict[int, dict[int, ClearanceRequest]] = {}
    for request_row in request_rows:
        if not getattr(request_row, "requirement_id", None):
            continue
        requests_by_faculty.setdefault(request_row.faculty_id, {})[request_row.requirement_id] = request_row

    completion_lookup = {}
    for faculty in faculty_rows:
        applicable_requirements = [
            requirement for requirement in requirement_rows if _requirement_applies_to_faculty(requirement, faculty)
        ]
        request_by_requirement_id = requests_by_faculty.get(faculty.id, {})
        approved_count = sum(
            1
            for requirement in applicable_requirements
            if (
                request_by_requirement_id.get(requirement.id)
                and request_by_requirement_id[requirement.id].status == ClearanceRequest.Status.APPROVED
            )
        )
        total_count = len(applicable_requirements)
        is_completed = total_count > 0 and approved_count == total_count
        completed_at = None
        if is_completed:
            approved_dates = [
                request_by_requirement_id[requirement.id].approved_date
                for requirement in applicable_requirements
                if request_by_requirement_id.get(requirement.id)
                and request_by_requirement_id[requirement.id].status == ClearanceRequest.Status.APPROVED
                and request_by_requirement_id[requirement.id].approved_date
            ]
            if approved_dates:
                completed_at = max(approved_dates)
        completion_lookup[faculty.id] = {
            "approved_count": approved_count,
            "total_count": total_count,
            "is_completed": is_completed,
            "completed_at": completed_at,
        }

    return completion_lookup


def _timeline_dump_faculty_ids(timeline: ClearanceTimeline):
    dump_entries = FacultyDumpArchive.objects.filter(
        clearance_timeline=timeline,
    ).order_by("-created_at", "-id")

    if not dump_entries.exists():
        return set()

    try:
        from django.conf import settings
        import os
    except Exception:
        return set()

    faculty_ids: set[int] = set()
    media_root = getattr(settings, "MEDIA_ROOT", "") or ""

    for dump in dump_entries:
        dump_path = (getattr(dump, "dump_file_path", "") or "").strip()
        if not dump_path:
            continue

        file_path = os.path.join(media_root, dump_path) if media_root else dump_path
        if not os.path.exists(file_path):
            continue

        try:
            with open(file_path, "rb") as dump_file:
                raw = dump_file.read()
        except Exception:
            continue

        text = None
        for enc in ("utf-8-sig", "utf-8", "latin-1"):
            try:
                text = raw.decode(enc)
                break
            except Exception:
                continue
        if text is None:
            continue

        try:
            reader = csv.DictReader(io.StringIO(text))
        except Exception:
            continue

        for row in reader:
            email = (row.get("email") or "").strip().lower()
            employee_id = (row.get("employee_id") or "").strip()
            university_id = (row.get("university_id") or "").strip()

            faculty = None
            if email:
                faculty = Faculty.objects.select_related("user").filter(user__email__iexact=email).first()
            if not faculty and employee_id:
                faculty = Faculty.objects.filter(employee_id__iexact=employee_id).first()
            if not faculty and university_id:
                faculty = Faculty.objects.select_related("user").filter(user__university_id__iexact=university_id).first()

            if faculty:
                faculty_ids.add(faculty.id)

    return faculty_ids


def _archive_clearance_timeline_records(timeline: ClearanceTimeline):
    faculty_rows = (
        Faculty.objects.select_related("user", "college", "department", "office")
        .order_by("id")
    )

    faculty_by_id: dict[int, Faculty] = {faculty.id: faculty for faculty in faculty_rows}

    clearance_rows = (
        Clearance.objects.filter(
            academic_year=timeline.academic_year_start,
            term=timeline.term,
        )
        .select_related("faculty", "faculty__user")
        .order_by("faculty_id", "-id")
    )

    latest_clearances: dict[int, Clearance] = {}
    for clearance in clearance_rows:
        if clearance.faculty_id not in latest_clearances:
            latest_clearances[clearance.faculty_id] = clearance

    request_rows = (
        ClearanceRequest.objects.filter(clearance_timeline=timeline)
        .select_related("requirement", "requirement__approver_flow_step", "requirement__approver_flow_step__office", "approved_by")
        .prefetch_related("requirement__target_colleges", "requirement__target_departments", "requirement__target_offices")
        .order_by("faculty_id", "id")
    )

    requests_by_faculty: dict[int, list[ClearanceRequest]] = {}
    for req in request_rows:
        requests_by_faculty.setdefault(req.faculty_id, []).append(req)

    requirement_rows = list(
        Requirement.objects.filter(
            clearance_timeline=timeline,
            is_active=True,
        ).select_related(
            "approver_flow_step",
            "approver_flow_step__office",
        ).prefetch_related(
            "target_colleges",
            "target_departments",
            "target_offices",
            "target_faculty",
        ).order_by("id")
    )

    archived_at = timeline.archive_date or timezone.now()
    dump_faculty_ids = _timeline_dump_faculty_ids(timeline)
    applicable_faculty_ids = _timeline_applicable_faculty_ids(timeline)
    faculty_ids = dump_faculty_ids | applicable_faculty_ids | set(latest_clearances.keys()) | set(requests_by_faculty.keys())

    for faculty_id in faculty_ids:
        clearance = latest_clearances.get(faculty_id)
        faculty_requests = requests_by_faculty.get(faculty_id, [])
        faculty = faculty_by_id.get(faculty_id)
        if not faculty and clearance:
            faculty = clearance.faculty
        if not faculty and faculty_requests:
            faculty = faculty_requests[0].faculty
        if not faculty:
            continue

        applicable_requirements = [
            requirement for requirement in requirement_rows if _requirement_applies_to_faculty(requirement, faculty)
        ]

        request_by_requirement_id = {
            req.requirement_id: req
            for req in faculty_requests
            if getattr(req, "requirement_id", None)
        }

        missing_approval_labels = []
        for requirement in applicable_requirements:
            matched_request = request_by_requirement_id.get(requirement.id)
            if not matched_request or matched_request.status != ClearanceRequest.Status.APPROVED:
                label = _approver_step_label(requirement)
                if label:
                    missing_approval_labels.append(label)

        missing_approval = ", ".join(dict.fromkeys(missing_approval_labels))

        approved_count = sum(
            1
            for requirement in applicable_requirements
            if (request_by_requirement_id.get(requirement.id) and request_by_requirement_id[requirement.id].status == ClearanceRequest.Status.APPROVED)
        )
        total_requirement_count = len(applicable_requirements)
        inferred_completed = total_requirement_count > 0 and approved_count == total_requirement_count
        clearance_status = (
            ArchivedClearance.Status.COMPLETED
            if (clearance and clearance.status == Clearance.Status.COMPLETED) or (not clearance and inferred_completed)
            else ArchivedClearance.Status.INCOMPLETE
        )

        ArchivedClearance.objects.update_or_create(
            faculty=faculty,
            clearance_timeline=timeline,
            defaults={
                "academic_year": f"{timeline.academic_year_start}-{timeline.academic_year_end}",
                "semester": _term_to_label(timeline.term),
                "status": clearance_status,
                "clearance_period_start": timeline.clearance_start_date.date(),
                "clearance_period_end": timeline.clearance_end_date.date(),
                "last_updated": archived_at,
                "clearance_data": {
                    "clearance_status": clearance.status if clearance else clearance_status,
                    "employeeId": faculty.employee_id or "",
                    "name": _archived_faculty_display_name(faculty),
                    "college": faculty.college.name if faculty.college else "",
                    "department": faculty.department.name if faculty.department else "",
                    "facultyType": faculty.faculty_type or "",
                    "missing_approval": missing_approval,
                    "request_count": total_requirement_count,
                    "approved_count": approved_count,
                    "requests": [
                        {
                            "requestId": req.request_id,
                            "title": req.requirement.title if req.requirement else "",
                            "status": req.status,
                            "submissionNotes": req.submission_notes,
                            "submissionLink": req.submission_link,
                            "submittedDate": req.submitted_date.isoformat() if req.submitted_date else None,
                            "approvedDate": req.approved_date.isoformat() if req.approved_date else None,
                            "approvedBy": _user_display_name(req.approved_by) if req.approved_by else None,
                            "remarks": req.remarks,
                        }
                        for req in faculty_requests
                    ],
                },
            },
        )


def _ensure_archived_timeline_records(timeline: ClearanceTimeline):
    if not timeline or not timeline.archive_date:
        return
    _archive_clearance_timeline_records(timeline)


def _archived_faculty_display_name(faculty: Faculty | None):
    if not faculty:
        return ""
    user = getattr(faculty, "user", None)
    parts = [
        (getattr(user, "first_name", "") or "").strip(),
        (getattr(user, "middle_name", "") or "").strip(),
        (getattr(user, "last_name", "") or "").strip(),
    ]
    parts = [part for part in parts if part]
    if parts:
        return " ".join(parts)

    faculty_parts = [
        (getattr(faculty, "first_name", "") or "").strip(),
        (getattr(faculty, "middle_name", "") or "").strip(),
        (getattr(faculty, "last_name", "") or "").strip(),
    ]
    faculty_parts = [part for part in faculty_parts if part]
    if faculty_parts:
        return " ".join(faculty_parts)

    return getattr(user, "email", "") or getattr(faculty, "employee_id", "") or ""


def _user_display_name(user: User | None):
    if not user:
        return ""
    if hasattr(user, "get_full_name"):
        try:
            full_name = user.get_full_name()
            if full_name:
                return full_name
        except Exception:
            pass
    parts = [
        (getattr(user, "first_name", "") or "").strip(),
        (getattr(user, "middle_name", "") or "").strip(),
        (getattr(user, "last_name", "") or "").strip(),
    ]
    parts = [part for part in parts if part]
    return " ".join(parts) if parts else (getattr(user, "email", "") or "")


def _serialize_archived_faculty_item(archived: ArchivedClearance):
    faculty = archived.faculty
    archived_data = archived.clearance_data or {}
    user = getattr(faculty, "user", None)
    college_name = archived_data.get("college") or (faculty.college.name if faculty and faculty.college else "")
    department_name = archived_data.get("department") or (faculty.department.name if faculty and faculty.department else "")
    faculty_type = archived_data.get("facultyType") or getattr(faculty, "faculty_type", "") or ""
    employee_id = archived_data.get("employeeId") or getattr(faculty, "employee_id", "") or ""
    display_name = archived_data.get("name") or _archived_faculty_display_name(faculty) or getattr(user, "email", "") or employee_id
    return {
        "id": str(archived.id),
        "employeeId": employee_id,
        "name": display_name,
        "college": college_name,
        "department": department_name,
        "facultyType": faculty_type,
        "status": archived.status,
        "missingApproval": archived_data.get("missing_approval", ""),
        "lastUpdated": archived.last_updated.strftime("%B %d, %Y, %H:%M %p") if archived.last_updated else "",
    }


def _archived_clearance_items_for_timeline(timeline: ClearanceTimeline, status_filter: str = ""):
    _ensure_archived_timeline_records(timeline)

    archived_clearances = ArchivedClearance.objects.filter(
        clearance_timeline=timeline
    ).select_related('faculty', 'faculty__user', 'faculty__college', 'faculty__department').order_by('faculty__last_name', 'faculty__first_name')

    if status_filter in ['COMPLETED', 'INCOMPLETE']:
        archived_clearances = archived_clearances.filter(status=status_filter)

    return [_serialize_archived_faculty_item(archived) for archived in archived_clearances]


def _assistant_scoped_archived_clearances(user, timeline: ClearanceTimeline):
    _ensure_archived_timeline_records(timeline)

    scope = _assistant_scope(user)
    supervisor = scope["supervisor"]
    if not supervisor:
        return ArchivedClearance.objects.none()

    return _approver_scoped_archived_clearances(supervisor, timeline)


def _assistant_archived_requests_for_archived_clearance(archived: ArchivedClearance):
    archived_data = archived.clearance_data or {}
    return [
        {
            "id": item.get("requestId") or str(index),
            "requestId": item.get("requestId") or "",
            "requirementName": item.get("title") or "",
            "submissionNotes": item.get("submissionNotes") or "",
            "submissionLink": item.get("submissionLink") or "",
            "status": _to_request_status(item.get("status")),
            "submittedDate": item.get("submittedDate") or "",
            "approvedDate": item.get("approvedDate") or "",
            "approvedBy": item.get("approvedBy") or "",
            "remarks": item.get("remarks") or "",
        }
        for index, item in enumerate(archived_data.get("requests") or [], start=1)
    ]


def _approver_archived_requests_for_archived_clearance(user, archived: ArchivedClearance):
    timeline = archived.clearance_timeline
    if not timeline:
        return []

    request_rows = list(
        ClearanceRequest.objects.filter(
            clearance_timeline=timeline,
            faculty=archived.faculty,
        ).select_related(
            "requirement",
            "requirement__approver_flow_step",
            "requirement__approver_flow_step__office",
            "approved_by",
            "faculty",
            "faculty__college",
            "faculty__department",
            "faculty__office",
        ).prefetch_related(
            "requirement__target_colleges",
            "requirement__target_departments",
            "requirement__target_offices",
        ).order_by("id")
    )

    visible_requests = [req for req in request_rows if _can_approver_access_request(user, req)]
    if not visible_requests:
        return []

    return [
        {
            "id": req.request_id or str(req.id),
            "requestId": req.request_id or "",
            "requirementName": req.requirement.title if req.requirement else "",
            "submissionNotes": req.submission_notes or "",
            "submissionLink": req.submission_link or "",
            "status": _to_request_status(req.status),
            "submittedDate": req.submitted_date.isoformat() if req.submitted_date else "",
            "approvedDate": req.approved_date.isoformat() if req.approved_date else "",
            "approvedBy": _user_display_name(req.approved_by) if req.approved_by else "",
            "remarks": req.remarks or "",
        }
        for req in visible_requests
    ]


def _approver_scoped_archived_clearances(user, timeline: ClearanceTimeline):
    _ensure_archived_timeline_records(timeline)

    request_rows = list(
        ClearanceRequest.objects.filter(
            clearance_timeline=timeline,
        ).select_related(
            'faculty',
            'faculty__user',
            'faculty__college',
            'faculty__department',
            'faculty__office',
            'requirement',
            'requirement__approver_flow_step',
            'requirement__approver_flow_step__office',
            'approved_by',
        ).prefetch_related(
            'requirement__target_colleges',
            'requirement__target_departments',
            'requirement__target_offices',
        )
    )

    visible_faculty_ids = {
        req.faculty_id
        for req in request_rows
        if req.faculty_id and _can_approver_access_request(user, req)
    }
    if not visible_faculty_ids:
        return ArchivedClearance.objects.none()

    qs = ArchivedClearance.objects.filter(
        clearance_timeline=timeline,
        faculty_id__in=visible_faculty_ids,
    ).select_related(
        'faculty',
        'faculty__user',
        'faculty__college',
        'faculty__department',
        'faculty__office',
    )

    return qs.order_by('faculty__last_name', 'faculty__first_name', 'pk')


def _clearance_timelines_api(request, admin_getter, not_found_detail: str):
    if request.method == "GET":
        timelines = ClearanceTimeline.objects.filter(archive_date__isnull=True).order_by("-is_active", "-academic_year_start", "-id")
        items = []
        for t in timelines:
            start_year = str(t.academic_year_start or "")
            end_year = str(t.academic_year_end or "")
            items.append(
                {
                    "id": str(t.id),
                    "name": t.name or _clearance_timeline_name(t.academic_year_start, t.academic_year_end, t.term),
                    "academicYearStart": start_year,
                    "academicYearEnd": end_year,
                    "term": _term_to_label(t.term),
                    "clearanceStartDate": t.clearance_start_date.date().isoformat() if t.clearance_start_date else "",
                    "clearanceEndDate": t.clearance_end_date.date().isoformat() if t.clearance_end_date else "",
                    "setAsActive": bool(t.is_active),
                    "createdAt": _format_timestamp(t.created_at),
                }
            )
        return JsonResponse({"items": items})

    if request.method not in {"POST", "PUT", "DELETE"}:
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    try:
        payload = json.loads((request.body or b"{}").decode("utf-8"))
    except Exception:
        payload = {}

    admin = admin_getter(request)
    if not admin:
        return JsonResponse({"detail": not_found_detail}, status=404)

    if request.method == "DELETE":
        timeline_id = payload.get("id")
        action = (payload.get("action") or "archive").strip().lower()
        if not timeline_id:
            return JsonResponse({"detail": "Missing id"}, status=400)

        t = ClearanceTimeline.objects.filter(id=timeline_id, archive_date__isnull=True).first()
        if not t:
            return JsonResponse({"detail": "Timeline not found"}, status=404)

        if action == "delete":
            return JsonResponse({"detail": "Delete is not allowed for clearance timelines"}, status=405)

        with transaction.atomic():
            t.archive_date = timezone.now()
            t.is_active = False
            t.save(update_fields=["archive_date", "is_active", "updated_at"])
            _archive_clearance_timeline_records(t)
        return JsonResponse({"ok": True, "archived": True})

    start_year = _parse_int(payload.get("academicYearStart") or payload.get("startYear"))
    end_year = _parse_int(payload.get("academicYearEnd") or payload.get("endYear")) or ((start_year + 1) if start_year is not None else None)
    term = _label_to_term(payload.get("term") or payload.get("semester"))
    clearance_start_date = _parse_iso_date(payload.get("clearanceStartDate") or payload.get("semesterStartDate"))
    clearance_end_date = _parse_iso_date(payload.get("clearanceEndDate") or payload.get("semesterEndDate"))
    set_as_active = bool(payload.get("setAsActive"))

    if start_year is None or end_year is None or term is None or clearance_start_date is None or clearance_end_date is None:
        return JsonResponse({"detail": "Missing or invalid timeline fields"}, status=400)

    if request.method == "POST":
        if set_as_active:
            prev_active = list(ClearanceTimeline.objects.filter(is_active=True))
            ClearanceTimeline.objects.filter(is_active=True).update(is_active=False)
            for prev in prev_active:
                try:
                    prev_sy = f"S.Y. {prev.academic_year_start}-{(prev.academic_year_start or 0) + 1}"
                    prev_sem = _term_to_label(prev.term)
                    ActivityLog.objects.create(
                        event_type=ActivityLog.EventType.INACTIVE_TIMELINE,
                        user=admin,
                        details=[prev_sy, f"Semester: {prev_sem}", "Replaced with new timeline"],
                    )
                except Exception:
                    pass

        t = ClearanceTimeline.objects.create(
            name=_clearance_timeline_name(start_year, end_year, term),
            academic_year_start=start_year,
            academic_year_end=end_year,
            term=term,
            clearance_start_date=clearance_start_date,
            clearance_end_date=clearance_end_date,
            created_by=admin,
            is_active=set_as_active,
        )
        try:
            new_sy = f"S.Y. {start_year}-{end_year or (start_year or 0) + 1}"
            new_sem = _term_to_label(term)
            ActivityLog.objects.create(
                event_type=ActivityLog.EventType.ACTIVE_TIMELINE,
                user=admin,
                details=[new_sy, f"Semester: {new_sem}"],
            )
        except Exception:
            pass
        return JsonResponse({"id": str(t.id)}, status=201)

    timeline_id = payload.get("id")
    if not timeline_id:
        return JsonResponse({"detail": "Missing id"}, status=400)

    t = ClearanceTimeline.objects.filter(id=timeline_id).first()
    if not t:
        return JsonResponse({"detail": "Timeline not found"}, status=404)

    if set_as_active:
        prev_active = list(ClearanceTimeline.objects.exclude(id=t.id).filter(is_active=True))
        ClearanceTimeline.objects.exclude(id=t.id).filter(is_active=True).update(is_active=False)
        for prev in prev_active:
            try:
                prev_sy = f"S.Y. {prev.academic_year_start}-{(prev.academic_year_start or 0) + 1}"
                prev_sem = _term_to_label(prev.term)
                ActivityLog.objects.create(
                    event_type=ActivityLog.EventType.INACTIVE_TIMELINE,
                    user=admin,
                    details=[prev_sy, f"Semester: {prev_sem}", "Replaced with new timeline"],
                )
            except Exception:
                pass

    t.name = _clearance_timeline_name(start_year, end_year, term)
    t.academic_year_start = start_year
    t.academic_year_end = end_year
    t.term = term
    t.clearance_start_date = clearance_start_date
    t.clearance_end_date = clearance_end_date
    t.is_active = set_as_active
    t.save(update_fields=[
        "name",
        "academic_year_start",
        "academic_year_end",
        "term",
        "clearance_start_date",
        "clearance_end_date",
        "is_active",
    ])

    return JsonResponse({"id": str(t.id)})


@csrf_exempt
def ovphe_clearance_timelines_api(request):
    return _clearance_timelines_api(request, _get_active_ovphe_admin, "OVPHE user not found")


@csrf_exempt
def ovphe_analytics_timelines_api(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    admin = _get_active_ovphe_admin(request) or _get_active_ciso_admin(request)
    if not admin:
        return JsonResponse({"detail": "OVPHE user not found"}, status=404)

    timelines = ClearanceTimeline.objects.order_by("-is_active", "-academic_year_start", "-id")
    items = []
    for t in timelines:
        start_year = str(t.academic_year_start or "")
        end_year = str(t.academic_year_end or "")
        items.append(
            {
                "id": str(t.id),
                "name": t.name or _clearance_timeline_name(t.academic_year_start, t.academic_year_end, t.term),
                "academicYearStart": start_year,
                "academicYearEnd": end_year,
                "term": _term_to_label(t.term),
                "clearanceStartDate": t.clearance_start_date.date().isoformat() if t.clearance_start_date else "",
                "clearanceEndDate": t.clearance_end_date.date().isoformat() if t.clearance_end_date else "",
                "setAsActive": bool(t.is_active),
                "isArchived": bool(t.archive_date),
                "createdAt": _format_timestamp(t.created_at),
            }
        )

    return JsonResponse({"items": items})


def _legacy_faculty_dashboard_api_v1(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    email = (request.GET.get("email") or "").strip()
    university_id = (request.GET.get("university_id") or "").strip()
    timeline_id = (request.GET.get("timelineId") or request.GET.get("timeline_id") or "").strip()

    if not email and not university_id:
        email = "faculty.seed@xu.edu.ph"

    # Our custom User model has no is_active flag; rely on existence of Faculty rows instead
    qs = Faculty.objects.select_related("user", "college", "department")
    if email:
        qs = qs.filter(user__email=email)
    if university_id:
        qs = qs.filter(user__university_id=university_id)

    faculty = qs.order_by("id").first()
    if not faculty:
        return JsonResponse({"detail": "Faculty not found"}, status=404)

    timeline = None
    if timeline_id:
        timeline = ClearanceTimeline.objects.filter(id=timeline_id).first()
        if not timeline:
            return JsonResponse({"detail": "Timeline not found"}, status=404)
    else:
        timeline = ClearanceTimeline.objects.filter(is_active=True).order_by("-academic_year_start", "-id").first()
    academic_year = timeline.academic_year_start if timeline else None
    term = timeline.term if timeline else None

    clearance = None
    if academic_year and term:
        clearance = (
            Clearance.objects.filter(faculty=faculty, academic_year=academic_year, term=term)
            .order_by("-id")
            .first()
        )

    if timeline:
        timeline_requests = ClearanceRequest.objects.filter(
            faculty=faculty,
            clearance_timeline=timeline,
        )
    else:
        timeline_requests = ClearanceRequest.objects.none()

    total_reqs = 0
    approved_reqs = 0
    status = "Pending"
    steps_payload = []
    if clearance:
        if clearance.status == Clearance.Status.PENDING:
            status = "Pending"
        elif clearance.status == Clearance.Status.IN_PROGRESS:
            status = "In Progress"
        elif clearance.status == Clearance.Status.COMPLETED:
            status = "Completed"
        elif clearance.status == Clearance.Status.REJECTED:
            status = "Rejected"
        else:
            status = str(clearance.status)

        total_reqs = timeline_requests.count()
        approved_reqs = timeline_requests.filter(
            status=ClearanceRequest.Status.APPROVED
        ).count()

    return JsonResponse(
        {
            "faculty": {
                "email": faculty.user.email,
                "universityId": faculty.user.university_id or "",
                "firstName": faculty.user.first_name or faculty.first_name or "",
                "middleName": faculty.user.middle_name or faculty.middle_name or "",
                "lastName": faculty.user.last_name or faculty.last_name or "",
                "college": faculty.college.name if faculty.college else "",
                "department": faculty.department.name if faculty.department else "",
                "facultyType": faculty.faculty_type or "",
            },
            "timeline": {
                "academicYear": academic_year,
                "term": term,
            },
            "clearance": {
                "status": status,
                "approvedCount": approved_reqs,
                "totalCount": total_reqs,
            },
            "steps": steps_payload,
        }
    )


@csrf_exempt
def faculty_notifications_api(request):
    if request.method == "POST":
        payload = _json_body(request)
        if payload is None:
            return JsonResponse({"detail": "Invalid JSON"}, status=400)

        title = (payload.get("title") or "").strip()
        body = (payload.get("body") or "").strip()
        details = payload.get("details", [])
        user_role = (payload.get("user_role") or "").strip()
        user_id = payload.get("user_id")
        is_read = payload.get("is_read", False)
        status = payload.get("status")  # Can be None

        if not title:
            return JsonResponse({"detail": "title is required"}, status=400)

        # Get session user like other notification functions
        session_user = _get_authenticated_user(request)
        notification_user_id = session_user.id if session_user else None

        notification = Notification.objects.create(
            user=session_user,  # Use user field, not user_id
            user_role=user_role,
            title=title,
            status=status,
            body=body,
            details=details,
            is_read=is_read,
        )
        return JsonResponse({"item": {"id": notification.id}})

    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    email = (request.GET.get("email") or "").strip()
    university_id = (request.GET.get("university_id") or "").strip()

    if not email and not university_id:
        email = "faculty.seed@xu.edu.ph"

    qs = User.objects.filter(is_active=True, user_type=User.UserType.FACULTY)
    if email:
        qs = qs.filter(email=email)
    if university_id:
        qs = qs.filter(university_id=university_id)

    user = qs.order_by("id").first()
    if not user:
        return JsonResponse({"detail": "Faculty user not found"}, status=404)

    notifications = Notification.objects.filter(user=user).order_by("-created_at", "-id")
    items = []
    for n in notifications:
        items.append(
            {
                "id": str(n.id),
                "title": n.title or "",
                "description": n.body or "",
                "status": n.status,
                "details": list(n.details or []),
                "timestamp": _format_timestamp(n.created_at),
                "is_read": bool(n.is_read),
            }
        )

    return JsonResponse({"items": items})


def ciso_org_structure_api(request):
    if request.method != "GET":
        return _json_method_not_allowed()

    colleges = list(
        College.objects.filter(is_active=True)
        .order_by("name", "id")
        .values("id", "name", "abbreviation")
    )
    departments = list(
        Department.objects.select_related("college")
        .filter(is_active=True, college__is_active=True)
        .order_by("college__name", "name", "id")
        .values("id", "college_id", "name", "abbreviation")
    )
    offices = list(
        Office.objects.filter(is_active=True)
        .exclude(
            models.Q(name__iexact="Department Chair") |
            models.Q(name__icontains="Department Chair") |
            models.Q(name__iexact="College Dean") |
            models.Q(name__icontains="College Dean") |
            models.Q(name__iexact="Dean") |
            models.Q(name__icontains="Dean")
        )
        .order_by("display_order", "name", "id")
        .values("id", "name", "abbreviation", "display_order")
    )

    return JsonResponse(
        {
            "colleges": [
                {
                    "id": str(c["id"]),
                    "name": c["name"],
                    "short": c["abbreviation"] or "",
                }
                for c in colleges
            ],
            "departments": [
                {
                    "id": str(d["id"]),
                    "collegeId": str(d["college_id"]),
                    "name": d["name"],
                    "short": d["abbreviation"] or "",
                }
                for d in departments
            ],
            "offices": [
                {
                    "id": str(o["id"]),
                    "name": o["name"],
                    "short": o["abbreviation"] or "",
                    "displayOrder": int(o.get("display_order") or 0),
                }
                for o in offices
            ],
        }
    )


def _build_org_structure_payload():
    colleges = list(
        College.objects.filter(is_active=True)
        .order_by("name", "id")
        .values("id", "name", "abbreviation")
    )
    departments = list(
        Department.objects.select_related("college")
        .filter(is_active=True, college__is_active=True)
        .order_by("college__name", "name", "id")
        .values("id", "college_id", "name", "abbreviation")
    )
    offices = list(
        Office.objects.filter(is_active=True)
        .exclude(
            models.Q(name__iexact="Department Chair") |
            models.Q(name__icontains="Department Chair") |
            models.Q(name__iexact="College Dean") |
            models.Q(name__icontains="College Dean") |
            models.Q(name__iexact="Dean") |
            models.Q(name__icontains="Dean")
        )
        .order_by("display_order", "name", "id")
        .values("id", "name", "abbreviation", "display_order")
    )

    return {
        "colleges": [
            {
                "id": str(c["id"]),
                "name": c["name"],
                "short": c["abbreviation"] or "",
            }
            for c in colleges
        ],
        "departments": [
            {
                "id": str(d["id"]),
                "collegeId": str(d["college_id"]),
                "name": d["name"],
                "short": d["abbreviation"] or "",
            }
            for d in departments
        ],
        "offices": [
            {
                "id": str(o["id"]),
                "name": o["name"],
                "short": o["abbreviation"] or "",
                "displayOrder": int(o.get("display_order") or 0),
            }
            for o in offices
        ],
    }


@csrf_exempt
def ovphe_org_structure_api(request):
    if request.method != "GET":
        return _json_method_not_allowed()

    admin = _get_active_ovphe_admin(request) or _get_active_ciso_admin(request)
    if not admin:
        return JsonResponse({"detail": "OVPHE user not found"}, status=404)

    return JsonResponse(_build_org_structure_payload())


def ciso_approver_flow_api(request):
    if request.method != "GET":
        return _json_method_not_allowed()

    admin, err = _require_ciso_admin_user(request)
    if err:
        return err

    # Get timeline_id from query parameter
    timeline_id = request.GET.get('timeline_id')
    
    # Try to get timeline-specific config first, then fallback to global config
    config = None
    if timeline_id:
        try:
            timeline = ClearanceTimeline.objects.get(id=timeline_id)
            config = ApproverFlowConfig.objects.filter(clearance_timeline=timeline).order_by("-updated_at", "pk").first()
        except ClearanceTimeline.DoesNotExist:
            return JsonResponse({"detail": "Timeline not found"}, status=404)
    
    # Fallback to global config (null clearance_timeline)
    if not config:
        config = ApproverFlowConfig.objects.filter(clearance_timeline__isnull=True).order_by("-updated_at", "pk").first()
    
    if not config:
        # Create new config - if timeline_id provided, create timeline-specific, otherwise global
        config = ApproverFlowConfig.objects.create(
            created_by=admin,
            clearance_timeline=ClearanceTimeline.objects.get(id=timeline_id) if timeline_id else None
        )

    steps = (
        config.steps.select_related("office")
        .prefetch_related("colleges")
        .all()
        .order_by("order", "id")
    )
    return JsonResponse(
        {
            "id": str(config.id),
            "timelineId": str(config.clearance_timeline.id) if config.clearance_timeline else None,
            "isGlobal": config.clearance_timeline is None,
            "steps": [
                {
                    "id": str(s.id),
                    "category": s.category,
                    "officeId": str(s.office_id) if s.office_id else "",
                    "collegeIds": [str(c.id) for c in s.colleges.all()],
                    "order": int(s.order),
                }
                for s in steps
            ],
        }
    )


def _resolve_office_for_flow_step(*, category: str, office_id):
    if office_id:
        return Office.objects.filter(pk=office_id, is_active=True).first()

    cat = (category or "").strip()
    if not cat:
        return None

    return (
        Office.objects.filter(is_active=True)
        .filter(models.Q(name__iexact=cat) | models.Q(abbreviation__iexact=cat))
        .first()
    )


def _relink_flow_steps_for_office(*, office: Office, timeline_id=None):
    if not office or not office.is_active:
        return

    # Try timeline-specific config first if timeline_id is provided
    config = None
    if timeline_id:
        try:
            timeline = ClearanceTimeline.objects.get(id=timeline_id)
            config = ApproverFlowConfig.objects.filter(clearance_timeline=timeline).order_by("-updated_at", "-id").first()
        except ClearanceTimeline.DoesNotExist:
            pass
    
    # Fallback to global config
    if not config:
        config = ApproverFlowConfig.objects.filter(clearance_timeline__isnull=True).order_by("-updated_at", "-id").first()
    
    if not config:
        return

    config.steps.filter(office__isnull=True).filter(
        models.Q(category__iexact=office.name)
        | models.Q(category__iexact=(office.abbreviation or ""))
    ).update(office=office)


@csrf_exempt
def ciso_colleges_api(request):
    admin, err = _require_ciso_admin_user(request)
    if err:
        return err

    if request.method == "POST":
        data, jerr = _parse_json_body(request)
        if jerr:
            return jerr
        name = (data.get("name") or "").strip()
        short = (data.get("short") or "").strip()
        if not name:
            return JsonResponse({"detail": "name is required"}, status=400)

        existing_active = College.objects.filter(name__iexact=name, is_active=True).first()
        if existing_active:
            return JsonResponse(
                {"detail": "A college with this name already exists", "id": str(existing_active.id)},
                status=409,
            )

        existing_inactive = College.objects.filter(name__iexact=name, is_active=False).first()
        if existing_inactive:
            existing_inactive.is_active = True
            existing_inactive.abbreviation = short or None
            existing_inactive.save(update_fields=["is_active", "abbreviation"])

            try:
                ActivityLog.objects.create(
                    event_type=ActivityLog.EventType.CREATED_COLLEGE,
                    user=admin.user if admin else None,
                    user_role="CISO",
                    details=[f"College : {existing_inactive.name}"] if existing_inactive.name else [],
                )
            except Exception:
                pass
            return JsonResponse(
                {
                    "id": str(existing_inactive.id),
                    "name": existing_inactive.name,
                    "short": existing_inactive.abbreviation or "",
                    "isActive": bool(existing_inactive.is_active),
                    "reactivated": True,
                },
                status=200,
            )

        obj = College.objects.create(
            name=name,
            abbreviation=short or None,
            is_active=True,
        )

        try:
            ActivityLog.objects.create(
                event_type=ActivityLog.EventType.CREATED_COLLEGE,
                user=admin.user if admin else None,
                user_role="CISO",
                details=[f"College : {obj.name}"] if obj.name else [],
            )
        except Exception:
            pass
        return JsonResponse(
            {
                "id": str(obj.id),
                "name": obj.name,
                "short": obj.abbreviation or "",
                "isActive": bool(obj.is_active),
            },
            status=201,
        )


@csrf_exempt
def faculty_activity_logs_api(request):
    if request.method == "POST":
        user = _get_authenticated_user(request)
        if not user:
            return JsonResponse({"detail": "Authentication required"}, status=401)

        data, jerr = _parse_json_body(request)
        if jerr:
            return jerr
        if data is None:
            return JsonResponse({"detail": "Invalid JSON"}, status=400)

        event_type = (data.get("event_type") or "").strip()
        details = data.get("details")
        if details is None:
            details = []

        if not event_type:
            return JsonResponse({"detail": "event_type is required"}, status=400)
        if event_type not in {c[0] for c in ActivityLog.EventType.choices}:
            return JsonResponse({"detail": "Invalid event_type"}, status=400)
        if not isinstance(details, list):
            return JsonResponse({"detail": "details must be a list"}, status=400)

        user_role = (data.get("user_role") or "").strip() or None

        obj = ActivityLog.objects.create(
            event_type=event_type,
            user=user,
            user_role=user_role,
            details=[str(x) for x in details if x is not None and str(x).strip()],
        )

        return JsonResponse(
            {
                "id": str(obj.id),
                "event_type": obj.event_type,
                "details": list(obj.details or []),
                "created_at": obj.created_at.isoformat() if obj.created_at else None,
            },
            status=201,
        )

    return JsonResponse({"detail": "Method not allowed"}, status=405)


@csrf_exempt
def ciso_college_detail_api(request, college_id: int):
    print(f"[DEBUG] ovphe_college_detail_api called: method={request.method}, college_id={college_id}")
    admin, err = _require_ciso_admin_user(request)
    if err:
        return err

    try:
        obj = College.objects.get(pk=college_id)
    except College.DoesNotExist:
        return JsonResponse({"detail": "Not found"}, status=404)

    if request.method == "GET":
        return JsonResponse({
            "id": str(obj.id),
            "name": obj.name,
            "short": obj.abbreviation or "",
            "isActive": bool(obj.is_active),
        })

    if request.method == "PATCH":
        data, jerr = _parse_json_body(request)
        if jerr:
            return jerr

        if "name" in data:
            obj.name = (data.get("name") or "").strip()
        if "short" in data:
            short = (data.get("short") or "").strip()
            obj.abbreviation = short or None
        if "isActive" in data:
            obj.is_active = bool(data.get("isActive"))

        if not (obj.name or "").strip():
            return JsonResponse({"detail": "name is required"}, status=400)
        obj.save(update_fields=["name", "abbreviation", "is_active"])
        try:
            ActivityLog.objects.create(
                event_type=ActivityLog.EventType.EDITED_COLLEGE,
                user=admin.user if admin else None,
                user_role="CISO",
                details=[f"College : {obj.name}"],
            )
        except Exception:
            pass
        return JsonResponse(
            {
                "id": str(obj.id),
                "name": obj.name,
                "short": obj.abbreviation or "",
                "isActive": bool(obj.is_active),
            }
        )

    if request.method == "DELETE":
        college_name = getattr(obj, "name", "") or ""
        print(f"[DEBUG] Deleting college {college_name} (id={college_id}) by admin {admin}")
        try:
            log = ActivityLog.objects.create(
                event_type=ActivityLog.EventType.DELETED_COLLEGE,
                user=admin if admin else None,
                user_role="CISO",
                details=[f"College : {college_name}"] if college_name else [],
            )
            print(f"[DEBUG] ActivityLog created: id={log.id}, event_type={log.event_type}, details={log.details}")
        except Exception as e:
            print(f"[ERROR] Failed to create ActivityLog for deleted_college: {e}")
        if _is_college_referenced(obj):
            if obj.is_active:
                obj.is_active = False
                obj.save(update_fields=["is_active"])
            return JsonResponse({"id": str(obj.id), "softDeleted": True})
        obj.delete()
        return JsonResponse({"id": str(college_id), "deleted": True})

    return _json_method_not_allowed()


@csrf_exempt
def ciso_departments_api(request):
    admin, err = _require_ciso_admin_user(request)
    if err:
        return err

    if request.method == "POST":
        data, jerr = _parse_json_body(request)
        if jerr:
            return jerr
        name = (data.get("name") or "").strip()
        short = (data.get("short") or "").strip()
        college_id = data.get("collegeId")
        if not name:
            return JsonResponse({"detail": "name is required"}, status=400)
        if not college_id:
            return JsonResponse({"detail": "collegeId is required"}, status=400)
        try:
            college = College.objects.get(pk=college_id)
        except College.DoesNotExist:
            return JsonResponse({"detail": "college not found"}, status=404)

        existing_active = Department.objects.filter(
            college=college, name__iexact=name, is_active=True
        ).first()
        if existing_active:
            return JsonResponse(
                {"detail": "A department with this name already exists", "id": str(existing_active.id)},
                status=409,
            )

        existing_inactive = Department.objects.filter(
            college=college, name__iexact=name, is_active=False
        ).first()
        if existing_inactive:
            existing_inactive.is_active = True
            existing_inactive.abbreviation = short or None
            existing_inactive.save(update_fields=["is_active", "abbreviation"])
            try:
                ActivityLog.objects.create(
                    event_type=ActivityLog.EventType.CREATED_DEPARTMENT,
                    user=admin.user if admin else None,
                    details=[f"Department: {existing_inactive.name}", f"College: {college.name}"],
                )
            except Exception:
                pass
            return JsonResponse(
                {
                    "id": str(existing_inactive.id),
                    "collegeId": str(existing_inactive.college_id),
                    "name": existing_inactive.name,
                    "short": existing_inactive.abbreviation or "",
                    "isActive": bool(existing_inactive.is_active),
                    "reactivated": True,
                },
                status=200,
            )

        obj = Department.objects.create(
            college=college,
            name=name,
            abbreviation=short or None,
            is_active=True,
        )
        try:
            ActivityLog.objects.create(
                event_type=ActivityLog.EventType.CREATED_DEPARTMENT,
                user=admin.user if admin else None,
                details=[f"Department: {obj.name}", f"College: {college.name}"],
            )
        except Exception:
            pass
        return JsonResponse(
            {
                "id": str(obj.id),
                "collegeId": str(obj.college_id),
                "name": obj.name,
                "short": obj.abbreviation or "",
                "isActive": bool(obj.is_active),
            },
            status=201,
        )

    return _json_method_not_allowed()


@csrf_exempt
def ciso_department_detail_api(request, department_id: int):
    admin, err = _require_ciso_admin_user(request)
    if err:
        return err

    try:
        obj = Department.objects.select_related("college").get(pk=department_id)
    except Department.DoesNotExist:
        return JsonResponse({"detail": "Not found"}, status=404)

    if request.method == "GET":
        return JsonResponse({
            "id": str(obj.id),
            "collegeId": str(obj.college_id),
            "name": obj.name,
            "short": obj.abbreviation or "",
            "isActive": bool(obj.is_active),
        })

    if request.method == "PATCH":
        data, jerr = _parse_json_body(request)
        if jerr:
            return jerr

        if "name" in data:
            obj.name = (data.get("name") or "").strip()
        if "short" in data:
            short = (data.get("short") or "").strip()
            obj.abbreviation = short or None
        if "isActive" in data:
            obj.is_active = bool(data.get("isActive"))
        if "collegeId" in data and data.get("collegeId"):
            try:
                obj.college = College.objects.get(pk=data.get("collegeId"))
            except College.DoesNotExist:
                return JsonResponse({"detail": "college not found"}, status=404)

        if not (obj.name or "").strip():
            return JsonResponse({"detail": "name is required"}, status=400)
        obj.save(update_fields=["name", "abbreviation", "is_active", "college"])
        try:
            ActivityLog.objects.create(
                event_type=ActivityLog.EventType.EDITED_DEPARTMENT,
                user=admin.user if admin else None,
                details=[f"Department: {obj.name}", f"College: {obj.college.name}"],
            )
        except Exception:
            pass
        return JsonResponse(
            {
                "id": str(obj.id),
                "collegeId": str(obj.college_id),
                "name": obj.name,
                "short": obj.abbreviation or "",
                "isActive": bool(obj.is_active),
            }
        )

    if request.method == "DELETE":
        dept_name = obj.name
        college_name = obj.college.name if obj.college else ""
        if _is_department_referenced(obj):
            if obj.is_active:
                obj.is_active = False
                obj.save(update_fields=["is_active"])
            return JsonResponse({"id": str(obj.id), "softDeleted": True})
        obj.delete()
        return JsonResponse({"id": str(department_id), "deleted": True})

    return _json_method_not_allowed()


@csrf_exempt
def ciso_offices_api(request):
    admin, err = _require_ciso_admin_user(request)
    if err:
        return err

    if request.method == "POST":
        data, jerr = _parse_json_body(request)
        if jerr:
            return jerr
        name = (data.get("name") or "").strip()
        short = (data.get("short") or "").strip()
        display_order = _as_int(data.get("displayOrder"), 0)
        if not name:
            return JsonResponse({"detail": "name is required"}, status=400)

        existing_active = Office.objects.filter(name__iexact=name, is_active=True).first()
        if existing_active:
            return JsonResponse(
                {"detail": "An office with this name already exists", "id": str(existing_active.id)},
                status=409,
            )

        existing_inactive = Office.objects.filter(name__iexact=name, is_active=False).first()
        if existing_inactive:
            existing_inactive.is_active = True
            existing_inactive.abbreviation = short or None
            existing_inactive.display_order = display_order
            existing_inactive.save(update_fields=["is_active", "abbreviation", "display_order"])
            _relink_flow_steps_for_office(office=existing_inactive)
            try:
                ActivityLog.objects.create(
                    event_type=ActivityLog.EventType.CREATED_OFFICE,
                    user=admin.user if admin else None,
                    details=[f"Office: {existing_inactive.name}"],
                )
            except Exception:
                pass
            return JsonResponse(
                {
                    "id": str(existing_inactive.id),
                    "name": existing_inactive.name,
                    "short": existing_inactive.abbreviation or "",
                    "displayOrder": int(existing_inactive.display_order),
                    "isActive": bool(existing_inactive.is_active),
                    "reactivated": True,
                },
                status=200,
            )

        obj = Office.objects.create(
            name=name,
            abbreviation=short or None,
            is_active=True,
            display_order=display_order,
        )
        _relink_flow_steps_for_office(office=obj)
        try:
            ActivityLog.objects.create(
                event_type=ActivityLog.EventType.CREATED_OFFICE,
                user=admin.user if admin else None,
                details=[f"Office: {obj.name}"],
            )
        except Exception:
            pass
        return JsonResponse(
            {
                "id": str(obj.id),
                "name": obj.name,
                "short": obj.abbreviation or "",
                "displayOrder": int(obj.display_order),
                "isActive": bool(obj.is_active),
            },
            status=201,
        )

    return _json_method_not_allowed()


@csrf_exempt
def ciso_office_detail_api(request, office_id: int):
    admin, err = _require_ciso_admin_user(request)
    if err:
        return err

    try:
        obj = Office.objects.get(pk=office_id)
    except Office.DoesNotExist:
        return JsonResponse({"detail": "Not found"}, status=404)

    if request.method == "GET":
        return JsonResponse({
            "id": str(obj.id),
            "name": obj.name,
            "short": obj.abbreviation or "",
            "displayOrder": int(obj.display_order),
            "isActive": bool(obj.is_active),
        })

    if request.method == "PATCH":
        data, jerr = _parse_json_body(request)
        if jerr:
            return jerr

        if "name" in data:
            obj.name = (data.get("name") or "").strip()
        if "short" in data:
            short = (data.get("short") or "").strip()
            obj.abbreviation = short or None
        if "displayOrder" in data:
            obj.display_order = _as_int(data.get("displayOrder"), obj.display_order)
        if "isActive" in data:
            obj.is_active = bool(data.get("isActive"))

        if not (obj.name or "").strip():
            return JsonResponse({"detail": "name is required"}, status=400)
        obj.save(update_fields=["name", "abbreviation", "display_order", "is_active"])
        _relink_flow_steps_for_office(office=obj)
        try:
            ActivityLog.objects.create(
                event_type=ActivityLog.EventType.EDITED_OFFICE,
                user=admin.user if admin else None,
                details=[f"Office: {obj.name}"],
            )
        except Exception:
            pass
        return JsonResponse(
            {
                "id": str(obj.id),
                "name": obj.name,
                "short": obj.abbreviation or "",
                "displayOrder": int(obj.display_order),
                "isActive": bool(obj.is_active),
            }
        )

    if request.method == "DELETE":
        office_name = obj.name
        if _is_office_referenced(obj):
            if obj.is_active:
                obj.is_active = False
                obj.save(update_fields=["is_active"])
            try:
                ActivityLog.objects.create(
                    event_type=ActivityLog.EventType.DELETED_OFFICE,
                    user=admin if admin else None,
                    details=[f"Office: {office_name}"],
                )
            except Exception:
                pass
            return JsonResponse({"id": str(obj.id), "softDeleted": True})
        try:
            ActivityLog.objects.create(
                event_type=ActivityLog.EventType.DELETED_OFFICE,
                user=admin if admin else None,
                details=[f"Office: {office_name}"],
            )
        except Exception:
            pass
        obj.delete()
        return JsonResponse({"id": str(office_id), "deleted": True})

    return _json_method_not_allowed()


@csrf_exempt
def ciso_org_structure_order_api(request):
    admin, err = _require_ciso_admin_user(request)
    if err:
        return err

    if request.method != "PUT":
        return _json_method_not_allowed()

    data, jerr = _parse_json_body(request)
    if jerr:
        return jerr
    office_ids = data.get("offices") or []

    with transaction.atomic():
        for idx, oid in enumerate(office_ids):
            Office.objects.filter(pk=oid).update(display_order=idx)

    return JsonResponse({"ok": True})


@csrf_exempt
def ciso_approver_flow_steps_api(request):
    admin, err = _require_ciso_admin_user(request)
    if err:
        return err

    # Get timeline_id from query parameter
    timeline_id = request.GET.get('timeline_id')
    
    # Try to get timeline-specific config first, then fallback to global config
    config = None
    if timeline_id:
        try:
            timeline = ClearanceTimeline.objects.get(id=timeline_id)
            config = ApproverFlowConfig.objects.filter(clearance_timeline=timeline).order_by("-updated_at", "pk").first()
        except ClearanceTimeline.DoesNotExist:
            return JsonResponse({"detail": "Timeline not found"}, status=404)
    
    # Fallback to global config (null clearance_timeline)
    if not config:
        config = ApproverFlowConfig.objects.filter(clearance_timeline__isnull=True).order_by("-updated_at", "pk").first()
    
    if not config:
        # Create new config - if timeline_id provided, create timeline-specific, otherwise global
        config = ApproverFlowConfig.objects.create(
            created_by=admin,
            clearance_timeline=ClearanceTimeline.objects.get(id=timeline_id) if timeline_id else None
        )

    if request.method == "POST":
        data, jerr = _parse_json_body(request)
        if jerr:
            return jerr
        category = (data.get("category") or "").strip()
        office_id = data.get("officeId") or None
        college_ids = data.get("collegeIds") or []
        order = _as_int(data.get("order"), 0)
        if not category:
            return JsonResponse({"detail": "category is required"}, status=400)

        office = _resolve_office_for_flow_step(category=category, office_id=office_id)
        step = ApproverFlowStep.objects.create(
            config=config,
            category=category,
            order=order,
            office=office,
        )
        if college_ids:
            step.colleges.set(College.objects.filter(pk__in=college_ids, is_active=True))
        try:
            college_names = [c.name for c in step.colleges.all()]
            ActivityLog.objects.create(
                event_type=ActivityLog.EventType.ADDED_TO_APPROVER_FLOW,
                user=admin.user if admin else None,
                details=[
                    f"Category: {step.category}",
                    f"Colleges: {', '.join(college_names)}" if college_names else "",
                ],
            )
        except Exception:
            pass
        return JsonResponse(
            {
                "id": str(step.id),
                "category": step.category,
                "officeId": str(step.office_id) if step.office_id else "",
                "collegeIds": [str(c.id) for c in step.colleges.all()],
                "order": int(step.order),
            },
            status=201,
        )

    return _json_method_not_allowed()


@csrf_exempt
def ciso_approver_flow_step_detail_api(request, step_id: int):
    admin, err = _require_ciso_admin_user(request)
    if err:
        return err

    try:
        step = ApproverFlowStep.objects.select_related("config").prefetch_related("colleges").get(pk=step_id)
    except ApproverFlowStep.DoesNotExist:
        return JsonResponse({"detail": "Not found"}, status=404)

    if request.method == "PATCH":
        data, jerr = _parse_json_body(request)
        if jerr:
            return jerr
        if "category" in data:
            step.category = (data.get("category") or "").strip()
        if "order" in data:
            step.order = _as_int(data.get("order"), step.order)
        if "officeId" in data:
            office_id = data.get("officeId") or None
            step.office = _resolve_office_for_flow_step(category=step.category, office_id=office_id)
        elif "category" in data and not step.office_id:
            step.office = _resolve_office_for_flow_step(category=step.category, office_id=None)
        if not (step.category or "").strip():
            return JsonResponse({"detail": "category is required"}, status=400)
        step.save(update_fields=["category", "order", "office"])

        if "collegeIds" in data:
            college_ids = data.get("collegeIds") or []
            step.colleges.set(College.objects.filter(pk__in=college_ids, is_active=True))

        try:
            college_names = [c.name for c in step.colleges.all()]
            ActivityLog.objects.create(
                event_type=ActivityLog.EventType.EDITED_APPROVER_FLOW,
                user=admin.user if admin else None,
                details=[
                    f"Category: {step.category}",
                    f"Colleges: {', '.join(college_names)}" if college_names else "",
                ],
            )
        except Exception:
            pass
        return JsonResponse(
            {
                "id": str(step.id),
                "category": step.category,
                "officeId": str(step.office_id) if step.office_id else "",
                "collegeIds": [str(c.id) for c in step.colleges.all()],
                "order": int(step.order),
            }
        )

    if request.method == "DELETE":
        step_category = step.category
        try:
            ActivityLog.objects.create(
                event_type=ActivityLog.EventType.REMOVED_FROM_APPROVER_FLOW,
                user=admin.user if admin else None,
                details=[f"Category: {step_category}"],
            )
        except Exception:
            pass
        step.delete()
        return JsonResponse({"id": str(step_id), "deleted": True})

    return _json_method_not_allowed()


@csrf_exempt
def ciso_approver_flow_order_api(request):
    admin, err = _require_ciso_admin_user(request)
    if err:
        return err

    if request.method != "PUT":
        return _json_method_not_allowed()

    data, jerr = _parse_json_body(request)
    if jerr:
        return jerr
    step_ids = data.get("stepIds") or []

    with transaction.atomic():
        for idx, sid in enumerate(step_ids):
            ApproverFlowStep.objects.filter(pk=sid).update(order=idx)

    try:
        ActivityLog.objects.create(
            event_type=ActivityLog.EventType.EDITED_APPROVER_FLOW,
            user=admin.user if admin else None,
            details=["Updated approver flow order."],
        )
    except Exception:
        pass

    return JsonResponse({"ok": True})


@csrf_exempt
def ovphe_notifications_api(request):
    admin = _get_active_ovphe_admin(request)
    if not admin:
        return JsonResponse({"detail": "OVPHE user not found"}, status=404)

    if request.method == "POST":
        payload = _json_body(request)
        if payload is None:
            return JsonResponse({"detail": "Invalid JSON"}, status=400)

        title = (payload.get("title") or "").strip()
        body = (payload.get("body") or "").strip()
        details = payload.get("details")
        status = payload.get("status")
        is_read = bool(payload.get("is_read"))
        user_roles = payload.get("user_roles")

        if not title:
            return JsonResponse({"detail": "title is required"}, status=400)
        if not body:
            return JsonResponse({"detail": "body is required"}, status=400)
        if details is None:
            details = []
        if not isinstance(details, list):
            return JsonResponse({"detail": "details must be a list"}, status=400)
        details = [str(d) for d in details]
        if user_roles is None:
            user_roles = []
        if not isinstance(user_roles, list) or not user_roles:
            return JsonResponse({"detail": "user_roles must be a non-empty list"}, status=400)

        session_user = _get_authenticated_user(request)
        try:
            user_name = "System Admin"
            if session_user:
                candidate = f"{(session_user.first_name or '').strip()} {(session_user.last_name or '').strip()}".strip()
                user_name = candidate or (session_user.email or user_name)
        except Exception:
            user_name = "System Admin"

        try:
            if isinstance(body, str) and "[User Name]" in body:
                body = body.replace("[User Name]", user_name)
        except Exception:
            pass

        try:
            Notification.objects.bulk_create(
                [
                    Notification(
                        user=session_user,
                        user_role=str(role_value),
                        title=title,
                        status=status,
                        body=body,
                        details=details,
                        is_read=is_read,
                    )
                    for role_value in user_roles
                ]
            )
        except Exception:
            return JsonResponse({"detail": "Failed to create notifications"}, status=500)

        return JsonResponse({"ok": True})

    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    qs = Notification.objects.filter(
        models.Q(user=admin.user) | models.Q(user_role__istartswith="CISO")
    ).order_by("-created_at", "-id")
    items = []
    for n in qs:
        items.append(
            {
                "id": str(n.id),
                "title": n.title or "",
                "description": n.body or "",
                "status": n.status,
                "details": list(n.details or []),
                "timestamp": _format_timestamp(n.created_at),
                "is_read": bool(n.is_read),
            }
        )
    return JsonResponse({"items": items})


@csrf_exempt
def ovphe_export_clearance_results_api(request):
    admin = _get_active_ovphe_admin(request) or _get_active_ciso_admin(request)
    if not admin:
        return JsonResponse({"detail": "OVPHE user not found"}, status=404)

    academic_year = (request.GET.get("academic_year") or "").strip()
    term = (request.GET.get("term") or "").strip()
    college_id = (request.GET.get("college_id") or "").strip()

    try:
        academic_year_int = int(academic_year) if academic_year else None
    except Exception:
        return JsonResponse({"detail": "Invalid academic_year"}, status=400)

    term_upper = term.upper()
    if term_upper == "FIRST":
        term_normalized = Clearance.Term.FIRST
    elif term_upper == "SECOND":
        term_normalized = Clearance.Term.SECOND
    elif term_upper in {"INTERSESSION", str(Clearance.Term.INTERSESSION)}:
        term_normalized = Clearance.Term.INTERSESSION
    elif term:
        term_normalized = term
    else:
        term_normalized = None

    if not academic_year_int or not term_normalized:
        active_timeline = ClearanceTimeline.objects.filter(is_active=True).order_by("-academic_year_start", "-id").first()
        if active_timeline:
            academic_year_int = academic_year_int or active_timeline.academic_year_start
            term_normalized = term_normalized or active_timeline.term

    college_name = ""
    if college_id:
        try:
            college = College.objects.get(id=college_id)
            college_name = college.name
        except College.DoesNotExist:
            pass

    try:
        ActivityLog.objects.create(
            event_type=ActivityLog.EventType.EXPORTED_CLEARANCE_RESULTS,
            user=admin.user if admin else None,
            details=[
                college_name or "All Colleges",
                f"School Year: {academic_year_int or 'Active'}",
                f"Term: {_term_to_label(term_normalized) if term_normalized else 'Active'}",
            ],
        )
    except Exception:
        pass

    faculty_qs = Faculty.objects.select_related("user", "college", "department", "office")
    if college_id:
        faculty_qs = faculty_qs.filter(college_id=college_id)

    faculty_items = list(faculty_qs.order_by("last_name", "first_name", "id"))
    faculty_ids = [faculty.id for faculty in faculty_items]

    clearances_by_faculty = {}
    for clearance in Clearance.objects.filter(
        faculty_id__in=faculty_ids,
        academic_year=academic_year_int,
        term=term_normalized,
    ).order_by("faculty_id", "-id"):
        clearances_by_faculty.setdefault(clearance.faculty_id, clearance)

    timeline = None
    if academic_year_int and term_normalized:
        timeline = ClearanceTimeline.objects.filter(
            academic_year_start=academic_year_int,
            term=term_normalized,
        ).order_by("-is_active", "-id").first()

    completion_lookup = _build_timeline_completion_lookup(timeline, faculty_items) if timeline else {}

    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = (
        f'attachment; filename="clearance_results_{academic_year_int or "active"}_{(term_normalized or "active").lower()}.csv"'
    )
    writer = csv.writer(response)

    writer.writerow(["Faculty Clearance Analytics"])
    writer.writerow(
        [
            f"School Year: {academic_year_int or 'N/A'}",
            f"Term: {_term_to_label(term_normalized) if term_normalized else 'N/A'}",
            f"College: {college_name or 'All Colleges'}",
        ]
    )
    writer.writerow([])
    writer.writerow(["Faculty Name", "University ID", "College", "Department", "Office", "Status", "Completion Date"])

    for faculty in faculty_items:
        clearance = clearances_by_faculty.get(faculty.id)
        completion_info = completion_lookup.get(
            faculty.id,
            {"approved_count": 0, "total_count": 0, "is_completed": False, "completed_at": None},
        )
        user = getattr(faculty, "user", None)
        name_parts = [
            (getattr(user, "first_name", "") or getattr(faculty, "first_name", "") or "").strip(),
            (getattr(user, "middle_name", "") or getattr(faculty, "middle_name", "") or "").strip(),
            (getattr(user, "last_name", "") or getattr(faculty, "last_name", "") or "").strip(),
        ]
        faculty_name = " ".join([part for part in name_parts if part]).strip() or (getattr(user, "email", "") or faculty.employee_id)
        export_status = "COMPLETED" if completion_info["is_completed"] else "INCOMPLETE"
        completion_date = ""
        if completion_info["is_completed"] and clearance and clearance.completed_date:
            completion_date = _format_export_datetime(clearance.completed_date)
        elif completion_info["is_completed"] and completion_info["completed_at"]:
            completion_date = _format_export_datetime(completion_info["completed_at"])

        writer.writerow(
            [
                faculty_name,
                getattr(user, "university_id", "") or "",
                faculty.college.name if faculty.college else "",
                faculty.department.name if faculty.department else "",
                faculty.office.name if faculty.office else "",
                export_status,
                completion_date,
            ]
        )

    return response


def ovphe_system_analytics_api(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    admin = _get_active_ovphe_admin(request) or _get_active_ciso_admin(request)
    if not admin:
        return JsonResponse({"detail": "OVPHE user not found"}, status=404)

    academic_year = (request.GET.get("academic_year") or "").strip()
    term = (request.GET.get("term") or "").strip()
    college_id = (request.GET.get("college_id") or "").strip()

    try:
        year_val = int(academic_year) if academic_year else None
    except Exception:
        return JsonResponse({"detail": "Invalid academic_year"}, status=400)

    term_upper = term.upper()
    if term_upper == "FIRST":
        term_val = Clearance.Term.FIRST
    elif term_upper == "SECOND":
        term_val = Clearance.Term.SECOND
    elif term_upper in {"INTERSESSION", str(Clearance.Term.INTERSESSION)}:
        term_val = Clearance.Term.INTERSESSION
    elif term:
        term_val = term
    else:
        term_val = None

    if not year_val or not term_val:
        active_timeline = ClearanceTimeline.objects.filter(is_active=True).order_by("-academic_year_start", "-id").first()
        if active_timeline:
            year_val = year_val or active_timeline.academic_year_start
            term_val = term_val or active_timeline.term

    if not year_val or not term_val:
        return JsonResponse({"rows": []})

    faculty_qs = Faculty.objects.select_related("college", "department", "office")
    if college_id:
        faculty_qs = faculty_qs.filter(college_id=college_id)

    faculty_items = list(
        faculty_qs.values(
            "id",
            "college_id",
            "college__name",
            "department_id",
            "department__name",
            "office_id",
            "office__name",
        )
    )
    timeline = ClearanceTimeline.objects.filter(
        academic_year_start=year_val,
        term=term_val,
    ).order_by("-is_active", "-id").first()

    completed_faculty_ids = set()
    if timeline and timeline.archive_date:
        _ensure_archived_timeline_records(timeline)
        archived_clearances = ArchivedClearance.objects.filter(
            clearance_timeline=timeline,
            faculty_id__in=[item["id"] for item in faculty_items],
        )
        completed_faculty_ids = set(
            archived_clearances.filter(status=ArchivedClearance.Status.COMPLETED).values_list("faculty_id", flat=True)
        )
    else:
        faculty_rows = list(
            Faculty.objects.select_related("college", "department", "office").filter(
                id__in=[item["id"] for item in faculty_items]
            )
        )
        completion_lookup = _build_timeline_completion_lookup(timeline, faculty_rows) if timeline else {}
        completed_faculty_ids = {
            faculty_id for faculty_id, info in completion_lookup.items() if info["is_completed"]
        }

    total_faculty = len(faculty_items)
    completed_count = len(completed_faculty_ids)
    incomplete_count = max(0, total_faculty - completed_count)

    department_buckets = {}
    office_buckets = {}
    selected_college_name = ""

    for item in faculty_items:
        if not selected_college_name and item.get("college__name"):
            selected_college_name = item.get("college__name") or ""

        department_id = item.get("department_id")
        department_name = item.get("department__name") or "Unassigned Department"
        if department_id not in department_buckets:
            department_buckets[department_id] = {
                "label": department_name,
                "faculty_ids": set(),
            }
        department_buckets[department_id]["faculty_ids"].add(item["id"])

        office_id = item.get("office_id")
        office_name = item.get("office__name") or "Unassigned Office"
        if office_id not in office_buckets:
            office_buckets[office_id] = {
                "label": office_name,
                "faculty_ids": set(),
            }
        office_buckets[office_id]["faculty_ids"].add(item["id"])

    department_items = [
        {
            "label": bucket["label"],
            "completed": len(bucket["faculty_ids"] & completed_faculty_ids),
            "total": len(bucket["faculty_ids"]),
        }
        for bucket in department_buckets.values()
    ]
    department_items.sort(key=lambda item: item["label"].lower())

    office_items = [
        {
            "label": bucket["label"],
            "completed": len(bucket["faculty_ids"] & completed_faculty_ids),
            "total": len(bucket["faculty_ids"]),
        }
        for bucket in office_buckets.values()
    ]
    office_items.sort(key=lambda item: item["label"].lower())

    summary_label = selected_college_name or "Overall Count"
    if not college_id:
        summary_label = "Overall Count"

    rows = [
        {
            "collegeId": str(college_id) if college_id else "",
            "collegeName": summary_label,
            "completionRate": float((Decimal(completed_count) / Decimal(total_faculty) * Decimal("100")) if total_faculty else Decimal("0")),
            "academicYear": year_val,
            "term": term_val,
            "completedCount": completed_count,
            "incompleteCount": incomplete_count,
            "totalCount": total_faculty,
        }
    ]

    sections = []
    if department_items:
        sections.append({"title": "Department Chair", "items": department_items})
    if office_items:
        sections.append({"title": "Offices", "items": office_items})

    return JsonResponse(
        {
            "rows": rows,
            "summary": {
                "label": summary_label,
                "completedCount": completed_count,
                "incompleteCount": incomplete_count,
                "totalCount": total_faculty,
            },
            "sections": sections,
        }
    )


@csrf_exempt
def ovphe_activity_logs_api(request):
    if request.method == "POST":
        admin = _get_active_ovphe_admin(request)
        if not admin:
            return JsonResponse({"detail": "OVPHE user not found"}, status=404)

        data, jerr = _parse_json_body(request)
        if jerr:
            return jerr
        if data is None:
            return JsonResponse({"detail": "Invalid JSON"}, status=400)

        event_type = (data.get("event_type") or "").strip()
        details = data.get("details") or []

        if not event_type:
            return JsonResponse({"detail": "event_type is required"}, status=400)
        if event_type not in {c[0] for c in ActivityLog.EventType.choices}:
            return JsonResponse({"detail": "Invalid event_type"}, status=400)
        if not isinstance(details, list):
            return JsonResponse({"detail": "details must be a list"}, status=400)

        obj = ActivityLog.objects.create(
            event_type=event_type,
            user=admin,
            user_role="OVPHE",
            details=[str(x) for x in details if x is not None],
        )

        return JsonResponse(
            {
                "id": str(obj.id),
                "event_type": obj.event_type,
                "details": list(obj.details or []),
                "created_at": obj.created_at.isoformat() if obj.created_at else None,
            },
            status=201,
        )

    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    q = (request.GET.get("query") or "").strip().lower()
    page = int(request.GET.get("page") or 1)
    page_size = int(request.GET.get("pageSize") or 40)

    qs = ActivityLog.objects.select_related("user", "faculty", "requirement").filter(user_role="OVPHE")
    if q:
        qs = qs.filter(
            models.Q(event_type__icontains=q)
            | models.Q(approver_department__icontains=q)
            | models.Q(university_id__icontains=q)
            | models.Q(request_id__icontains=q)
            | models.Q(user__email__icontains=q)
            | models.Q(user__first_name__icontains=q)
            | models.Q(user__last_name__icontains=q)
        )

    total = qs.count()
    start = max(0, (page - 1) * page_size)
    logs = qs.order_by("-created_at", "pk")[start : start + page_size]

    items = []
    for log in logs:
        dt = timezone.localtime(log.created_at)
        title = str(log.event_type)
        if log.approver_department:
            title = f"{title} - {log.approver_department}"
        description = ""
        if log.request_id:
            description = f"Request: {log.request_id}"

        faculty_user = None
        if log.faculty is not None:
            faculty_user = getattr(log.faculty, "user", None)

        items.append(
            {
                "id": str(log.id),
                "dateLabel": dt.strftime("%m/%d/%Y"),
                "timeLabel": _format_time_label(dt),
                "variant": log.event_type,
                "title": title,
                "description": description,
                "firstName": (log.user.first_name if log.user else ""),
                "lastName": (log.user.last_name if log.user else ""),
                "actorRole": log.user_role or "",
                "approverDepartment": log.approver_department or "",
                "facultyFirstName": (faculty_user.first_name if faculty_user else "") or "",
                "facultyLastName": (faculty_user.last_name if faculty_user else "") or "",
                "universityId": log.university_id or "",
                "requestId": log.request_id or "",
                "requirementTitle": getattr(log.requirement, "title", "") if log.requirement else "",
                "details": list(log.details or []),
            }
        )

    return JsonResponse({"items": items, "total": total})


@csrf_exempt
@ciso_required
def ciso_system_guidelines_api(request):
    return _system_guidelines_api(request, "ciso")


@csrf_exempt
def ciso_announcements_api(request):
    return _announcements_api(request, "ciso")


@csrf_exempt
def ciso_system_guideline_detail_api(request, guideline_id: int):
    return _system_guideline_detail_api(request, "ciso", guideline_id)


@csrf_exempt
def ciso_announcement_detail_api(request, announcement_id: int):
    return _announcement_detail_api(request, "ciso", announcement_id)


@csrf_exempt
def ciso_notifications_api(request):
    admin = _get_active_ciso_admin(request)
    if not admin:
        return JsonResponse({"detail": "CISO user not found"}, status=404)
 
    if request.method == "POST":
        payload = _json_body(request)
        if payload is None:
            return JsonResponse({"detail": "Invalid JSON"}, status=400)
 
        title = (payload.get("title") or "").strip()
        body = (payload.get("body") or "").strip()
        details = payload.get("details")
        status = payload.get("status")
        is_read = bool(payload.get("is_read"))
        user_roles = payload.get("user_roles")
        created_by_id_raw = payload.get("created_by_id")
        approver_id_raw = payload.get("approver_id")
        clearance_period_start_raw = payload.get("clearance_period_start_date")
        clearance_period_end_raw = payload.get("clearance_period_end_date")
 
        if not title:
            return JsonResponse({"detail": "title is required"}, status=400)
        if not body:
            return JsonResponse({"detail": "body is required"}, status=400)
        if details is None:
            details = []
        if not isinstance(details, list):
            return JsonResponse({"detail": "details must be a list"}, status=400)
        details = [str(d) for d in details]
        if user_roles is None:
            user_roles = []
        if not isinstance(user_roles, list) or not user_roles:
            return JsonResponse({"detail": "user_roles must be a non-empty list"}, status=400)
 
        session_user = _get_authenticated_user(request)
        try:
            user_name = "System Admin"
            if session_user:
                candidate = f"{(session_user.first_name or '').strip()} {(session_user.last_name or '').strip()}".strip()
                user_name = candidate or (session_user.email or user_name)
        except Exception:
            user_name = "System Admin"
 
        try:
            if isinstance(body, str) and "[User Name]" in body:
                body = body.replace("[User Name]", user_name)
        except Exception:
            pass

        created_by_id_value = None
        approver_id_value = None
        try:
            if created_by_id_raw is not None and created_by_id_raw != "":
                created_by_id_value = int(created_by_id_raw)
        except Exception:
            created_by_id_value = None

        try:
            if approver_id_raw is not None and approver_id_raw != "":
                approver_id_value = int(approver_id_raw)
        except Exception:
            approver_id_value = None

        if created_by_id_value is not None and not User.objects.filter(id=created_by_id_value).exists():
            created_by_id_value = None
        if approver_id_value is not None and not User.objects.filter(id=approver_id_value).exists():
            approver_id_value = None

        clearance_period_start_value = None
        clearance_period_end_value = None
        try:
            if isinstance(clearance_period_start_raw, str) and clearance_period_start_raw.strip():
                clearance_period_start_value = datetime.fromisoformat(clearance_period_start_raw.strip()).date()
        except Exception:
            clearance_period_start_value = None

        try:
            if isinstance(clearance_period_end_raw, str) and clearance_period_end_raw.strip():
                clearance_period_end_value = datetime.fromisoformat(clearance_period_end_raw.strip()).date()
        except Exception:
            clearance_period_end_value = None
 
        try:
            Notification.objects.bulk_create(
                [
                    Notification(
                        user=session_user,
                        user_role=str(role_value),
                        title=title,
                        status=status,
                        body=body,
                        details=details,
                        is_read=is_read,
                        created_by_id=created_by_id_value,
                        approver_id=approver_id_value,
                        clearance_period_start_date=clearance_period_start_value,
                        clearance_period_end_date=clearance_period_end_value,
                    )
                    for role_value in user_roles
                ]
            )
        except Exception:
            return JsonResponse({"detail": "Failed to create notifications"}, status=500)
 
        return JsonResponse({"ok": True})
 
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)
 
    qs = Notification.objects.filter(user=admin.user).order_by("-created_at", "-id")
    items = []
    for n in qs:
        items.append(
            {
                "id": str(n.id),
                "title": n.title or "",
                "description": n.body or "",
                "status": n.status,
                "details": list(n.details or []),
                "timestamp": _format_timestamp(n.created_at),
                "is_read": bool(n.is_read),
            }
        )
    return JsonResponse({"items": items})


@csrf_exempt
def ciso_activity_logs_api(request):
    admin_user = _get_active_ciso_admin(request)
    if not admin_user:
        return JsonResponse({"detail": "CISO user not found"}, status=404)

    if request.method == "POST":
        try:
            data, jerr = _parse_json_body(request)
            if jerr:
                return jerr

            event_type = (data.get("event_type") or "").strip()
            if not event_type:
                return JsonResponse({"detail": "event_type is required"}, status=400)

            allowed_event_types = {choice[0] for choice in ActivityLog.EventType.choices}
            if event_type not in allowed_event_types:
                return JsonResponse({"detail": "Invalid event_type"}, status=400)

            details = data.get("details")
            if details is None:
                details = []
            if not isinstance(details, list):
                return JsonResponse({"detail": "details must be a list"}, status=400)
            details = [str(d) for d in details if str(d).strip()]

            log = ActivityLog.objects.create(
                event_type=event_type,
                user=admin_user,
                user_role="CISO",
                details=details,
            )

            return JsonResponse(
                {"id": str(log.id), "event_type": log.event_type, "details": list(log.details or [])},
                status=201,
            )
        except Exception as e:
            import traceback

            print("[ERROR] ciso_activity_logs_api POST failed:", str(e))
            print(traceback.format_exc())
            return JsonResponse(
                {"detail": f"Internal server error: {str(e)}", "traceback": traceback.format_exc()},
                status=500,
            )

    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    q = (request.GET.get("query") or "").strip().lower()
    page = int(request.GET.get("page") or 1)
    page_size = int(request.GET.get("pageSize") or 40)

    qs = ActivityLog.objects.select_related("user", "faculty", "requirement").filter(
        user_role="CISO"
    )
    if q:
        qs = qs.filter(
            models.Q(event_type__icontains=q)
            | models.Q(approver_department__icontains=q)
            | models.Q(university_id__icontains=q)
            | models.Q(request_id__icontains=q)
            | models.Q(user__email__icontains=q)
            | models.Q(user__first_name__icontains=q)
            | models.Q(user__last_name__icontains=q)
        )

    total = qs.count()
    start = max(0, (page - 1) * page_size)
    logs = qs.order_by("-created_at", "pk")[start : start + page_size]

    items = []
    for log in logs:
        dt = timezone.localtime(log.created_at)
        title = str(log.event_type)
        if log.approver_department:
            title = f"{title} - {log.approver_department}"
        description = ""
        if log.request_id:
            description = f"Request: {log.request_id}"

        faculty_user = None
        if log.faculty is not None:
            faculty_user = getattr(log.faculty, "user", None)

        items.append(
            {
                "id": str(log.id),
                "dateLabel": dt.strftime("%m/%d/%Y"),
                "timeLabel": _format_time_label(dt),
                "variant": log.event_type,
                "title": title,
                "description": description,
                "firstName": (log.user.first_name if log.user else ""),
                "lastName": (log.user.last_name if log.user else ""),
                "actorRole": log.user_role or "",
                "approverDepartment": log.approver_department or "",
                "facultyFirstName": (faculty_user.first_name if faculty_user else "") or "",
                "facultyLastName": (faculty_user.last_name if faculty_user else "") or "",
                "universityId": log.university_id or "",
                "requestId": log.request_id or "",
                "requirementTitle": log.requirement.title if log.requirement else "",
                "details": list(log.details or []),
            }
        )

    return JsonResponse({"items": items, "total": total})


@csrf_exempt
def ciso_system_users_api(request):
    admin, err = _require_ciso_admin_user(request)
    if err:
        return err

    def _full_name(u: User):
        parts = [(u.first_name or "").strip(), (u.middle_name or "").strip(), (u.last_name or "").strip()]
        parts = [p for p in parts if p]
        return " ".join(parts) if parts else u.email

    items = []

    # Get users with admin roles (CISO, OVPHE)
    from .models import UserRole, Role
    admin_roles = ['CISO', 'OVPHE']
    admin_user_roles = UserRole.objects.filter(
        role__name__in=admin_roles, 
        is_active=True
    ).select_related('user', 'role').order_by('user__id')
    
    for user_role in admin_user_roles:
        u = user_role.user
        items.append(
            {
                "id": str(u.id),
                "name": _full_name(u),
                "systemId": f"SYS-{u.id}",
                "userRole": user_role.role.name,
                "universityId": u.university_id or "",
                "college": "N/A",
                "department": user_role.role.name,
                "email": u.email,
                # A user is considered active if they have any active roles
                "isActive": u.get_active_roles().exists(),
            }
        )

    approvers = (
        Approver.objects.select_related("user", "college", "department", "office")
        .order_by("id")
    )
    for ap in approvers:
        u = ap.user
        items.append(
            {
                "id": str(u.id),
                "name": _full_name(u),
                "systemId": f"SYS-{u.id}",
                "userRole": "Approver",
                "universityId": u.university_id or "",
                "college": ap.college.name if ap.college else "N/A",
                "department": (
                    ap.department.name
                    if ap.department
                    else (ap.office.name if ap.office else "N/A")
                ),
                "email": u.email,
                "isActive": u.get_active_roles().exists(),
            }
        )

    assistants = (
        StudentAssistant.objects.select_related("user", "college", "department")
        .order_by("id")
    )
    for sa in assistants:
        u = sa.user
        items.append(
            {
                "id": str(u.id),
                "name": _full_name(u),
                "systemId": f"SYS-{u.id}",
                "userRole": "Assistant Approver",
                "universityId": u.university_id or "",
                "college": sa.college.name if sa.college else "N/A",
                "department": sa.department.name if sa.department else "N/A",
                "email": u.email,
                "isActive": u.get_active_roles().exists(),
            }
        )

    def _role_rank(item: dict) -> int:
        role = (item.get("userRole") or "").strip()
        # Prioritize CISO and OVPHE as system admin roles
        if role == "CISO" or role == "OVPHE":
            return 3
        if "admin" in role.lower():
            return 2
        if "assistant" in role.lower():
            return 1
        if "approver" in role.lower():
            return 0
        return 0

    deduped: dict[str, dict] = {}
    for it in items:
        uid = str(it.get("id") or "")
        if not uid:
            continue
        prev = deduped.get(uid)
        if not prev or _role_rank(it) > _role_rank(prev):
            deduped[uid] = it

    items = list(deduped.values())

    if request.method == "GET":
        return JsonResponse({"items": items})

    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    data, parse_err = _parse_json_body(request)
    if parse_err:
        return parse_err
    if not isinstance(data, dict):
        return JsonResponse({"detail": "Invalid payload"}, status=400)

    first_name = (data.get("firstName") or "").strip()
    middle_name = (data.get("middleName") or "").strip()
    last_name = (data.get("lastName") or "").strip()
    university_id = (data.get("universityId") or "").strip()
    email = _validate_xu_email(data.get("email") or "")
    is_active = bool(data.get("isActive", True))

    if not email:
        return JsonResponse({"detail": "Email must be an XU email (@xu.edu.ph or @my.xu.edu.ph)"}, status=400)
    if not university_id or not university_id.isdigit():
        return JsonResponse({"detail": "University ID must be a valid number"}, status=400)

    system_admin_office = (data.get("systemAdminOffice") or "").strip()
    approver_type = (data.get("approverType") or "").strip()

    if not system_admin_office and not approver_type:
        return JsonResponse({"detail": "Missing user type"}, status=400)

    with transaction.atomic():
        user = User.objects.filter(email__iexact=email).first()
        if user:
            existing_university_id = (user.university_id or "").strip()
            if existing_university_id and existing_university_id != university_id:
                return JsonResponse({"detail": "This email is already assigned to a different University ID"}, status=400)
            duplicate_university_user = User.objects.filter(university_id__iexact=university_id).exclude(pk=user.pk).first()
            if duplicate_university_user:
                return JsonResponse({"detail": "University ID already exists"}, status=400)

            user.university_id = university_id
            user.first_name = first_name
            user.middle_name = middle_name
            user.last_name = last_name
            user.save(update_fields=["university_id", "first_name", "middle_name", "last_name"])
        else:
            if User.objects.filter(university_id__iexact=university_id).exists():
                return JsonResponse({"detail": "University ID already exists"}, status=400)

            # Our custom User model does not have a create_user manager or is_active/is_staff fields
            user = User.objects.create(
                email=email,
                university_id=university_id,
                first_name=first_name,
                middle_name=middle_name,
                last_name=last_name,
            )

        if system_admin_office:
            office_norm = system_admin_office.strip().upper()
            if office_norm not in {"CISO", "OVPHE"}:
                return JsonResponse({"detail": "Invalid system admin office"}, status=400)

            # Assign appropriate role for system admin users
            from .models import Role, UserRole
            # Create role if it doesn't exist
            role, created = Role.objects.get_or_create(
                name=office_norm,
                defaults={'description': f'{office_norm} admin role'}
            )
            UserRole.objects.get_or_create(
                user=user,
                role=role,
                defaults={'is_active': True}
            )

            # Auto-create approver profile for OVPHE users
            if office_norm == "OVPHE":
                ovphe_office = Office.objects.filter(name__iexact="Office of the Vice President for Higher Education", is_active=True).first()
                if ovphe_office:
                    Approver.objects.get_or_create(
                        user=user,
                        defaults={
                            'approver_type': 'Office',
                            'office': ovphe_office
                        }
                    )
                    # Also assign Approver role
                    approver_role, created = Role.objects.get_or_create(
                        name="Approver",
                        defaults={'description': 'Approver role'}
                    )
                    UserRole.objects.get_or_create(
                        user=user,
                        role=approver_role,
                        defaults={'is_active': True}
                    )

        if approver_type:
            atype = approver_type.strip().lower()
            if atype not in {"college", "office"}:
                return JsonResponse({"detail": "Invalid approver type"}, status=400)

            college = None
            department = None
            office = None

            if atype == "college":
                college_name = (data.get("college") or "").strip()
                dept_name = (data.get("department") or "").strip()
                if not college_name:
                    return JsonResponse({"detail": "College is required"}, status=400)
                if not dept_name:
                    return JsonResponse({"detail": "Department is required"}, status=400)

                college = College.objects.filter(name__iexact=college_name, is_active=True).first()
                if not college:
                    return JsonResponse({"detail": f"College '{college_name}' not found"}, status=400)

                department = Department.objects.filter(
                    name__iexact=dept_name,
                    college=college,
                    is_active=True,
                ).first()
                if not department:
                    return JsonResponse({"detail": f"Department '{dept_name}' not found in college '{college_name}'"}, status=400)

            if atype == "office":
                office_name = (data.get("office") or "").strip()
                if not office_name:
                    return JsonResponse({"detail": "Office is required"}, status=400)
                office = Office.objects.filter(name__iexact=office_name, is_active=True).first()
                if not office:
                    return JsonResponse({"detail": f"Office '{office_name}' not found"}, status=400)

            approver_profile, _ = Approver.objects.get_or_create(user=user)
            approver_profile.approver_type = "College" if atype == "college" else "Office"
            approver_profile.college = college
            approver_profile.department = department
            approver_profile.office = office
            approver_profile.save(update_fields=["approver_type", "college", "department", "office"])
            
            # Assign appropriate role based on approver type
            from .models import Role, UserRole
            # Always use "Approver" role regardless of approver type
            role_name = "Approver"
            
            # Create role if it doesn't exist
            role, created = Role.objects.get_or_create(
                name=role_name,
                defaults={'description': 'Approver role'}
            )
            UserRole.objects.get_or_create(
                user=user,
                role=role,
                defaults={'is_active': True}
            )

    return JsonResponse({"ok": True, "id": str(user.id)})


def _legacy_faculty_dashboard_api_v2(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    email = (request.GET.get("email") or "").strip()
    university_id = (request.GET.get("university_id") or "").strip()
    timeline_id = (request.GET.get("timelineId") or request.GET.get("timeline_id") or "").strip()

    if not email and not university_id:
        email = "faculty.seed@xu.edu.ph"

    # Our custom User model has no is_active flag; rely on existence of Faculty rows instead
    qs = Faculty.objects.select_related("user", "college", "department")
    if email:
        qs = qs.filter(user__email=email)
    if university_id:
        qs = qs.filter(user__university_id=university_id)

    faculty = qs.order_by("id").first()
    if not faculty:
        return JsonResponse({"detail": "Faculty not found"}, status=404)

    timeline = None
    if timeline_id:
        timeline = ClearanceTimeline.objects.filter(id=timeline_id).first()
        if not timeline:
            return JsonResponse({"detail": "Timeline not found"}, status=404)
    else:
        timeline = ClearanceTimeline.objects.filter(is_active=True).order_by("-academic_year_start", "-id").first()
    academic_year = timeline.academic_year_start if timeline else None
    term = timeline.term if timeline else None

    clearance = None
    if academic_year and term:
        clearance = (
            Clearance.objects.filter(faculty=faculty, academic_year=academic_year, term=term)
            .order_by("-id")
            .first()
        )

    if timeline:
        timeline_requests = ClearanceRequest.objects.filter(
            faculty=faculty,
            clearance_timeline=timeline,
        )
    else:
        timeline_requests = ClearanceRequest.objects.none()

    total_reqs = 0
    approved_reqs = 0
    status = "Pending"
    if clearance:
        if clearance.status == Clearance.Status.PENDING:
            status = "Pending"
        elif clearance.status == Clearance.Status.IN_PROGRESS:
            status = "In Progress"
        elif clearance.status == Clearance.Status.COMPLETED:
            status = "Completed"
        elif clearance.status == Clearance.Status.REJECTED:
            status = "Rejected"
        else:
            status = str(clearance.status)

        total_reqs = timeline_requests.count()
        approved_reqs = timeline_requests.filter(
            status=ClearanceRequest.Status.APPROVED
        ).count()

        config = get_approver_flow_config(timeline_id=timeline.id if timeline else None)
        if config:
            flow_steps = (
                ApproverFlowStep.objects.select_related("office")
                .prefetch_related("colleges")
                .filter(config=config)
                .order_by("order", "id")
            )

            # Collect applicable requirements per step based on requirement associations.
            # Department Chair: requirements tied to the faculty department
            # College Dean: requirements tied to the faculty college
            # Office-based steps: requirements tied to that office
            dept_reqs = Requirement.objects.filter(
                clearance_timeline=timeline,
                target_departments=faculty.department,
                is_active=True,
            ).distinct() if faculty.department_id else Requirement.objects.none()
            college_reqs = Requirement.objects.filter(
                clearance_timeline=timeline,
                target_colleges=faculty.college,
                is_active=True,
            ).distinct() if faculty.college_id else Requirement.objects.none()
            office_requirements = {}
            office_ids = [fs.office_id for fs in flow_steps if fs.office_id]
            if office_ids:
                for office_id in set(office_ids):
                    office_requirements[office_id] = list(
                        Requirement.objects.filter(
                            clearance_timeline=timeline,
                            target_offices__id=office_id,
                            is_active=True,
                        ).distinct().order_by("id")
                    )

            # Map clearance request status by requirement
            req_status_by_id = {
                cr.requirement_id: cr.status
                for cr in timeline_requests.select_related("requirement")
            }

            def _step_status_label(req_statuses):
                if not req_statuses:
                    return "PENDING"
                if any(s == ClearanceRequest.Status.REJECTED for s in req_statuses):
                    return "REJECTED"
                if all(s == ClearanceRequest.Status.APPROVED for s in req_statuses):
                    return "APPROVED"
                return "PENDING"

            def _status_variant(label: str) -> str:
                if label == "APPROVED":
                    return "success"
                if label == "REJECTED":
                    return "destructive"
                return "warning"

            index = 1
            for fs in flow_steps:
                # Apply college scoping if the step has explicit colleges assigned
                step_college_ids = {c.id for c in fs.colleges.all()}
                if step_college_ids and faculty.college_id and faculty.college_id not in step_college_ids:
                    continue

                if (fs.category or "").strip().lower() == "department chair":
                    reqs = list(dept_reqs.order_by("id"))
                elif (fs.category or "").strip().lower() == "college dean":
                    reqs = list(college_reqs.order_by("id"))
                elif fs.office_id:
                    reqs = office_requirements.get(fs.office_id, [])
                else:
                    reqs = []

                req_items = []
                req_statuses = []
                for r in reqs:
                    s = req_status_by_id.get(r.id, ClearanceRequest.Status.PENDING)
                    req_statuses.append(s)
                    req_items.append(
                        {
                            "id": str(r.id),
                            "title": r.title,
                            "description": r.description or "",
                            "status": s,
                            "completed": s == ClearanceRequest.Status.APPROVED,
                        }
                    )

                step_label = _step_status_label(req_statuses)
                steps_payload.append(
                    {
                        "index": index,
                        "title": fs.category or (fs.office.name if fs.office else ""),
                        "statusLabel": step_label,
                        "statusVariant": _status_variant(step_label),
                        "collapsedType": "status",
                        "requirements": req_items,
                    }
                )
                index += 1

    return JsonResponse(
        {
            "faculty": {
                "email": faculty.user.email,
                "universityId": faculty.user.university_id or "",
                "firstName": faculty.user.first_name or faculty.first_name or "",
                "middleName": faculty.user.middle_name or faculty.middle_name or "",
                "lastName": faculty.user.last_name or faculty.last_name or "",
                "college": faculty.college.name if faculty.college else "",
                "department": faculty.department.name if faculty.department else "",
                "facultyType": faculty.faculty_type or "",
            },
            "timeline": {
                "academicYear": academic_year,
                "term": term,
            },
            "clearance": {
                "status": status,
                "approvedCount": approved_reqs,
                "totalCount": total_reqs,
            },
        }
    )


def faculty_notifications_api(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    email = (request.GET.get("email") or "").strip()
    university_id = (request.GET.get("university_id") or "").strip()

    if not email and not university_id:
        email = "faculty.seed@xu.edu.ph"

    qs = User.objects.filter(is_active=True, user_type=User.UserType.FACULTY)
    if email:
        qs = qs.filter(email=email)
    if university_id:
        qs = qs.filter(university_id=university_id)

    user = qs.order_by("id").first()
    if not user:
        return JsonResponse({"detail": "Faculty user not found"}, status=404)

    notifications = Notification.objects.filter(
        models.Q(user=user) | models.Q(user_role__istartswith="Assistant")
    ).order_by("-created_at", "-id")
    items = []
    for n in notifications:
        items.append(
            {
                "id": str(n.id),
                "title": n.title or "",
                "description": n.body or "",
                "status": n.status,
                "details": list(n.details or []),
                "timestamp": _format_timestamp(n.created_at),
                "is_read": bool(n.is_read),
            }
        )

    return JsonResponse({"items": items})


@faculty_required
def faculty_dashboard_api(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    # Get the authenticated user
    authenticated_user = _get_authenticated_user(request)
    if not authenticated_user:
        return JsonResponse({"detail": "Authentication required"}, status=401)

    email = (request.GET.get("email") or "").strip()
    university_id = (request.GET.get("university_id") or "").strip()
    timeline_id = (request.GET.get("timelineId") or request.GET.get("timeline_id") or "").strip()

    # Use authenticated user's email if no specific email provided
    if not email and not university_id:
        email = authenticated_user.email

    qs = Faculty.objects.select_related("user", "college", "department")
    if email:
        qs = qs.filter(user__email=email)
    if university_id:
        qs = qs.filter(user__university_id=university_id)

    faculty = qs.order_by("id").first()
    if not faculty:
        return JsonResponse({"detail": "Faculty not found"}, status=404)

    timeline = None
    if timeline_id:
        timeline = ClearanceTimeline.objects.filter(id=timeline_id).first()
        if not timeline:
            return JsonResponse({"detail": "Timeline not found"}, status=404)
    else:
        timeline = ClearanceTimeline.objects.filter(is_active=True).order_by("-academic_year_start", "-id").first()
    academic_year = timeline.academic_year_start if timeline else None
    term = timeline.term if timeline else None

    clearance = None
    if academic_year and term:
        clearance = (
            Clearance.objects.filter(faculty=faculty, academic_year=academic_year, term=term)
            .order_by("-id")
            .first()
        )

    if timeline:
        timeline_requests = ClearanceRequest.objects.filter(
            faculty=faculty,
            clearance_timeline=timeline,
        )
    else:
        timeline_requests = ClearanceRequest.objects.none()

    total_reqs = 0
    approved_reqs = 0
    status = "Pending"
    completion_lookup = _build_timeline_completion_lookup(timeline, [faculty]) if timeline else {}
    completion_info = completion_lookup.get(
        faculty.id,
        {"approved_count": 0, "total_count": 0, "is_completed": False, "completed_at": None},
    )

    total_reqs = completion_info["total_count"]
    approved_reqs = completion_info["approved_count"]

    if timeline_requests.filter(status=ClearanceRequest.Status.REJECTED).exists():
        status = "Rejected"
    elif completion_info["is_completed"]:
        status = "Completed"
    elif approved_reqs > 0:
        status = "In Progress"

    # Generate steps data for frontend
    steps = []
    if timeline:
        # Get clearance requests grouped by approver category/office
        clearance_requests = timeline_requests.select_related('requirement')
        
        # Get approver flow configuration from active timeline
        approver_flow_config = timeline.approver_flow_configs.first()
        
        if approver_flow_config:
            # Use dynamic approver flow from timeline configuration
            flow_steps = approver_flow_config.steps.order_by('order').prefetch_related('colleges')
            
            display_index = 1  # Use separate index for display after filtering
            for flow_step in flow_steps:
                # Check if this step applies to the faculty's college
                # If step has no colleges specified, it applies to all
                # If step has colleges specified, only show if faculty's college is included
                step_colleges = list(flow_step.colleges.all())
                if step_colleges and faculty.college and faculty.college not in step_colleges:
                    # This step doesn't apply to this faculty's college, skip it
                    continue
                
                # Generate dynamic step title based on faculty's college/department
                step_title = flow_step.category
                if flow_step.category.lower() == "department chair" and faculty.department:
                    step_title = f"{faculty.department.name} Department Chair"
                elif flow_step.category.lower() == "college dean" and faculty.college:
                    step_title = f"{faculty.college.name} Dean"
                
                # Find requests for this step
                step_requests = clearance_requests.filter(
                    requirement__approver_flow_step=flow_step
                )
                
                # Find all requirements for this step (even if no request exists)
                step_requirements = Requirement.objects.filter(
                    approver_flow_step=flow_step,
                    clearance_timeline=timeline,
                    is_active=True
                )
                
                # Filter requirements that apply to this faculty
                applicable_requirements = []
                for req in step_requirements:
                    if _requirement_applies_to_faculty(req, faculty):
                        # Check if faculty already submitted a request for this requirement
                        existing_request = step_requests.filter(requirement=req).first()
                        
                        # Determine the status and whether it needs resubmission
                        is_approved = existing_request and existing_request.status == ClearanceRequest.Status.APPROVED
                        is_rejected = existing_request and existing_request.status == ClearanceRequest.Status.REJECTED
                        is_submitted = existing_request is not None and not is_rejected
                        
                        applicable_requirements.append({
                            "id": req.id,
                            "title": req.title,
                            "description": req.description or "",
                            "completed": is_approved,
                            "submitted": is_submitted,
                            "requestId": existing_request.request_id if existing_request else None,
                            "status": existing_request.status if existing_request else None,
                            "submissionNotes": existing_request.submission_notes if existing_request and not is_rejected else None,
                            "required_physical": req.required_physical,
                            "rejected": is_rejected,
                            "remarks": existing_request.remarks if existing_request and is_rejected else None
                        })
                
                if applicable_requirements:
                    # Calculate status based on applicable requirements
                    submitted_count = len([req for req in applicable_requirements if req["submitted"]])
                    approved_count = len([req for req in applicable_requirements if req["completed"]])
                    total_count = len(applicable_requirements)
                    
                    if approved_count == total_count and total_count > 0:
                        status_label = "APPROVED"
                        status_variant = "success"
                        collapsed_type = "status"
                    elif submitted_count > 0:
                        status_label = "IN_PROGRESS"
                        status_variant = "warning"
                        collapsed_type = "status"
                    else:
                        status_label = "PENDING"
                        status_variant = "warning"
                        collapsed_type = "status"
                    
                    steps.append({
                        "index": display_index,
                        "title": step_title,
                        "statusLabel": status_label,
                        "statusVariant": status_variant,
                        "collapsedType": collapsed_type,
                        "submittedTo": f"{step_title}",
                        "submittedOn": clearance.submitted_date.strftime("%B %d, %Y") if clearance and clearance.submitted_date else "",
                        "requirements": applicable_requirements
                    })
                    display_index += 1
                else:
                    # Step not applicable or locked
                    steps.append({
                        "index": display_index,
                        "title": step_title,
                        "statusLabel": "LOCKED",
                        "statusVariant": "muted",
                        "collapsedType": "locked",
                        "submittedTo": f"{step_title}",
                        "submittedOn": "",
                        "requirements": []
                    })
                    display_index += 1
        else:
            # No approver flow configuration found - return empty steps
            # This requires administrators to configure approver flows for clearance timelines
            pass

    return JsonResponse(
        {
            "faculty": {
                "email": faculty.user.email,
                "universityId": faculty.user.university_id or "",
                "firstName": faculty.user.first_name or faculty.first_name or "",
                "middleName": faculty.user.middle_name or faculty.middle_name or "",
                "lastName": faculty.user.last_name or faculty.last_name or "",
                "college": faculty.college.name if faculty.college else "",
                "department": faculty.department.name if faculty.department else "",
                "facultyType": faculty.faculty_type or "",
            },
            "timeline": {
                "academicYear": academic_year,
                "term": term,
            },
            "clearance": {
                "status": status,
                "approvedCount": approved_reqs,
                "totalCount": total_reqs,
            },
            "steps": steps,
        }
    )


def faculty_notifications_api(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    email = (request.GET.get("email") or "").strip()
    university_id = (request.GET.get("university_id") or "").strip()

    if not email and not university_id:
        email = "faculty.seed@xu.edu.ph"

    qs = User.objects.filter(is_active=True, user_type=User.UserType.FACULTY)
    if email:
        qs = qs.filter(email=email)
    if university_id:
        qs = qs.filter(university_id=university_id)

    user = qs.order_by("id").first()
    if not user:
        return JsonResponse({"detail": "Faculty user not found"}, status=404)

    notifications = Notification.objects.filter(user=user).order_by("-created_at", "-id")
    items = []
    for n in notifications:
        items.append(
            {
                "id": str(n.id),
                "title": n.title or "",
                "description": n.body or "",
                "status": n.status,
                "details": list(n.details or []),
                "timestamp": _format_timestamp(n.created_at),
                "is_read": bool(n.is_read),
            }
        )

    return JsonResponse({"items": items})


@csrf_exempt
@faculty_required
def faculty_submit_requirement_api(request):
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    # Get the authenticated user
    authenticated_user = _get_authenticated_user(request)
    if not authenticated_user:
        return JsonResponse({"detail": "Authentication required"}, status=401)

    data, parse_err = _parse_json_body(request)
    if parse_err:
        return parse_err
    if not isinstance(data, dict):
        return JsonResponse({"detail": "Invalid payload"}, status=400)

    requirement_title = (data.get("requirementTitle") or "").strip()
    comment = (data.get("comment") or "").strip()

    if not requirement_title:
        return JsonResponse({"detail": "Requirement title is required"}, status=400)
    if not comment:
        return JsonResponse({"detail": "Comment is required"}, status=400)

    # Get the faculty member
    faculty = Faculty.objects.filter(user=authenticated_user).first()
    if not faculty:
        return JsonResponse({"detail": "Faculty not found"}, status=404)

    # Get active clearance timeline
    timeline = ClearanceTimeline.objects.filter(is_active=True).order_by("-academic_year_start", "-id").first()
    if not timeline:
        return JsonResponse({"detail": "No active clearance timeline"}, status=400)

    # Find the requirement by title (case-insensitive search)
    try:
        requirement = Requirement.objects.filter(title__iexact=requirement_title).first()
        if not requirement:
            # Log all available requirements for debugging
            all_requirements = Requirement.objects.all().values_list('title', flat=True)
            print(f"Available requirements: {list(all_requirements)}")
            print(f"Looking for: '{requirement_title}'")
            return JsonResponse({"detail": f"Requirement '{requirement_title}' not found"}, status=404)
    except Exception as e:
        print(f"Error finding requirement: {e}")
        return JsonResponse({"detail": "Error finding requirement"}, status=500)

    # Check if a request already exists for this requirement
    existing_request = ClearanceRequest.objects.filter(
        faculty=faculty,
        clearance_timeline=timeline,
        requirement=requirement
    ).first()
    
    if existing_request:
        # Allow resubmission if the existing request was rejected
        if existing_request.status == ClearanceRequest.Status.REJECTED:
            # Update the existing rejected request instead of creating a new one
            existing_request.status = ClearanceRequest.Status.PENDING
            existing_request.submission_notes = comment
            existing_request.remarks = ""  # Clear previous rejection remarks
            existing_request.approved_by = None  # Clear previous approver
            existing_request.approved_date = None  # Clear previous approval date
            existing_request.save()
            
            return JsonResponse({
                "detail": "Requirement resubmitted successfully",
                "requestId": existing_request.request_id
            })
        else:
            return JsonResponse({"detail": "Requirement already submitted"}, status=400)

    # Create the clearance request
    try:
        # Get department code from faculty's department (not approver's)
        dept_code = "GEN"  # Default generic code
        if faculty.department:
            # Use department abbreviation if available, otherwise use name
            dept_code = faculty.department.abbreviation if faculty.department.abbreviation else faculty.department.name[:3].upper()
        
        # Get term from timeline
        term_code = "00"  # Default
        if timeline.term:
            # Handle different term formats
            term_lower = timeline.term.lower()
            if "first" in term_lower:
                term_code = "01"
            elif "second" in term_lower:
                term_code = "02"
            elif "summer" in term_lower:
                term_code = "03"
            elif "intersession" in term_lower:
                term_code = "03"
            else:
                # For terms like "1st Semester", "2nd Semester", etc.
                if "1st" in term_lower or "1" in term_lower:
                    term_code = "01"
                elif "2nd" in term_lower or "2" in term_lower:
                    term_code = "02"
                elif "3rd" in term_lower or "3" in term_lower:
                    term_code = "03"
                else:
                    # Fallback to first 2 characters if no pattern matches
                    term_code = timeline.term[:2].upper()
        
        # Get academic year (last 2 digits)
        year_code = "00"
        if timeline.academic_year_start:
            year_code = str(timeline.academic_year_start)[-2:]
        
        # Get university ID
        uni_id = faculty.user.university_id or str(faculty.user.id)
        
        # Count existing requests for this faculty to determine the requirement number
        existing_count = ClearanceRequest.objects.filter(
            faculty=faculty,
            clearance_timeline=timeline
        ).count()
        
        # Generate request number with padding (001, 002, etc.)
        request_number = str(existing_count + 1).zfill(3)
        
        # Build the request ID
        request_id = f"{year_code}{term_code}-{uni_id}-{dept_code}-{request_number}"
        
        clearance_request = ClearanceRequest.objects.create(
            request_id=request_id,
            faculty=faculty,
            clearance_timeline=timeline,
            requirement=requirement,
            status=ClearanceRequest.Status.PENDING,
            submission_notes=comment
        )
        
        print(f"Created clearance request: {clearance_request.id} with request_id: {request_id}")
        
    except Exception as e:
        print(f"Error creating clearance request: {e}")
        return JsonResponse({"detail": f"Error creating clearance request: {str(e)}"}, status=500)

    return JsonResponse({
        "id": str(clearance_request.id),
        "requestId": clearance_request.request_id,
        "requirementTitle": requirement_title,
        "comment": comment,
        "status": "pending",
        "submittedDate": clearance_request.submitted_date.isoformat()
    })


@csrf_exempt
def approver_assistant_approvers_api(request):
    try:
        user, err = _require_approver_user(request)
        if err:
            return err

        if request.method == "GET":
            def _full_name(u: User):
                parts = [(u.first_name or "").strip(), (u.middle_name or "").strip(), (u.last_name or "").strip()]
                parts = [p for p in parts if p]
                return " ".join(parts) if parts else u.email

            items: list[dict] = []

            # Assistants supervised by this approver (student assistants)
            assistants = (
                StudentAssistant.objects.select_related("user", "college", "department")
                .filter(supervisor_approver=user)
                .order_by("id")
            )
            for sa in assistants:
                u = sa.user
                items.append(
                    {
                        "id": str(u.id),
                        "name": _full_name(u),
                        "systemId": f"SYS-{u.id}",
                        "userRole": "Assistant Approver",
                        "assistantType": "student_assistant",
                        "universityId": u.university_id or "",
                        "college": sa.college.name if sa.college else "N/A",
                        "department": sa.department.name if sa.department else "N/A",
                        "office": "",
                        "email": u.email,
                        "isActive": u.get_active_roles().exists(),
                    }
                )

            # Admin-type assistants (these are regular Approvers supervised by this user)
            admin_assistants = (
                ApproverAssistant.objects.select_related("assistant", "college", "department", "office")
                .filter(supervisor=user)
                .order_by("id")
            )
            for aa in admin_assistants:
                admin_user = aa.assistant
                items.append(
                    {
                        "id": str(admin_user.id),
                        "name": _full_name(admin_user),
                        "systemId": f"SYS-{admin_user.id}",
                        "userRole": "Admin Assistant",
                        "assistantType": aa.assistant_type,
                        "universityId": admin_user.university_id or "",
                        "college": aa.college.name if aa.college else "N/A",
                        "department": aa.department.name if aa.department else "N/A",
                        "office": aa.office.name if aa.office else "N/A",
                        "email": admin_user.email,
                        "isActive": admin_user.get_active_roles().exists(),
                    }
                )

            return JsonResponse({"items": items})

        elif request.method == "POST":
            data, parse_err = _parse_json_body(request)
            if parse_err:
                return parse_err
            if not isinstance(data, dict):
                return JsonResponse({"detail": "Invalid payload"}, status=400)

            first_name = (data.get("firstName") or "").strip()
            middle_name = (data.get("middleName") or "").strip()
            last_name = (data.get("lastName") or "").strip()
            university_id = (data.get("universityId") or "").strip()
            email = _validate_xu_email(data.get("email") or "")
            is_active = bool(data.get("isActive", True))

            if not email:
                return JsonResponse({"detail": "Email must be an XU email (@xu.edu.ph or @my.xu.edu.ph)"}, status=400)
            if not university_id or not university_id.isdigit():
                return JsonResponse({"detail": "University ID must be a valid number"}, status=400)

            college_name = (data.get("college") or "").strip()
            dept_name = (data.get("department") or "").strip()
            office_name = (data.get("office") or "").strip()
            assistant_type = (data.get("assistantType") or "student_assistant").strip() or "student_assistant"
            
            # Get current approver's profile to determine scope
            from .models import Approver
            current_approver = None
            try:
                current_approver = Approver.objects.get(user=user)
            except Approver.DoesNotExist:
                return JsonResponse({"detail": "Approver profile not found"}, status=400)
            
            # Check if this is a College Dean (department with "Dean" in title)
            is_college_dean = False
            if current_approver.department and "dean" in current_approver.department.name.lower():
                is_college_dean = True
                # For College Dean, get the college from their department
                college = current_approver.department.college
            
            # Validation logic based on approver type
            if is_college_dean:
                # College Dean logic
                if not current_approver.department or not current_approver.department.college:
                    return JsonResponse({"detail": "College Dean must have an assigned department and college"}, status=400)
                
                # For College Dean, the college is fixed to their department's college
                if college_name and college_name.lower() != college.name.lower():
                    return JsonResponse({"detail": f"College must be {college.name}"}, status=400)
                
                # Set college to Dean's college
                college_name = college.name
                
                if assistant_type == "student_assistant":
                    # Student Assistant: restricted to the dean's own assigned department
                    if not dept_name:
                        return JsonResponse({"detail": "Department is required"}, status=400)
                    if dept_name.lower() != current_approver.department.name.lower():
                        return JsonResponse({"detail": f"You can only add assistants under your assigned department ({current_approver.department.name})"}, status=400)
                    
                    # Validate department belongs to Dean's college
                    department = Department.objects.filter(
                        name__iexact=dept_name,
                        college=college,
                        is_active=True
                    ).first()
                    if not department:
                        return JsonResponse({"detail": "Department not found in your college"}, status=400)
                    
                    # Check if the person being added is a Dean
                    # We'll validate this after user creation by checking their roles
                    
                else:  # admin assistant
                    # Admin: can add anyone from the department
                    if not dept_name and not office_name:
                        return JsonResponse({"detail": "Department or Office is required for Admin assistants"}, status=400)
                    
                    if dept_name:
                        department = Department.objects.filter(
                            name__iexact=dept_name,
                            college=college,
                            is_active=True
                        ).first()
                        if not department:
                            return JsonResponse({"detail": "Department not found in your college"}, status=400)
                        if current_approver.department and department.pk != current_approver.department.pk:
                            return JsonResponse({"detail": f"You can only add assistants under your assigned department ({current_approver.department.name})"}, status=400)
                    
                    if office_name:
                        office = Office.objects.filter(
                            name__iexact=office_name,
                            is_active=True
                        ).first()
                        if not office:
                            return JsonResponse({"detail": "Office not found"}, status=400)
                            
            elif current_approver.approver_type == "Department":
                # Department Chair logic (existing logic should work)
                pass
            elif current_approver.approver_type == "Office":
                # Office Admin logic (existing logic should work)  
                pass
            else:
                return JsonResponse({"detail": "Invalid approver type"}, status=400)
            
            # Original validation logic for non-College Dean types
            if assistant_type == "student_assistant":
                # Student assistant: need both college and department
                if not college_name:
                    return JsonResponse({"detail": "College is required"}, status=400)
                if not dept_name:
                    return JsonResponse({"detail": "Department is required"}, status=400)
            else:
                # Admin assistant: only need department OR office
                if not dept_name and not office_name:
                    return JsonResponse({"detail": "Department or Office is required for Admin assistants"}, status=400)

            # Skip redundant lookups for College Dean (already done above)
            if not is_college_dean:
                # Only look up college if it's provided (for student assistants)
                college = None
                if college_name:
                    college = College.objects.filter(name__iexact=college_name, is_active=True).first()
                    if not college:
                        return JsonResponse({"detail": "College not found"}, status=400)

                # Look up department if provided
                department = None
                if dept_name:
                    if college:  # Student assistant case
                        department = Department.objects.filter(
                            name__iexact=dept_name,
                            college=college,
                            is_active=True,
                        ).first()
                        if not department:
                            return JsonResponse({"detail": "Department not found"}, status=400)
                        if current_approver.department and department.pk != current_approver.department.pk:
                            return JsonResponse({"detail": f"You can only add assistants under your assigned department ({current_approver.department.name})"}, status=400)
                    else:  # Admin assistant case - find department by name only
                        department = Department.objects.filter(
                            name__iexact=dept_name,
                            is_active=True,
                        ).first()
                        if not department:
                            return JsonResponse({"detail": "Department not found"}, status=400)
                        if current_approver.department and department.pk != current_approver.department.pk:
                            return JsonResponse({"detail": f"You can only add assistants under your assigned department ({current_approver.department.name})"}, status=400)

                # Look up office if provided (for admin assistants)
                office = None
                if office_name:
                    office = Office.objects.filter(
                        name__iexact=office_name,
                        is_active=True,
                    ).first()
                    if not office:
                        return JsonResponse({"detail": "Office not found"}, status=400)

            with transaction.atomic():
                existing_email_user = User.objects.filter(email__iexact=email).first()
                existing_university_user = User.objects.filter(university_id__iexact=university_id).first()

                if existing_email_user and existing_university_user and existing_email_user.pk != existing_university_user.pk:
                    return JsonResponse({"detail": "Email and University ID belong to different existing users"}, status=400)
                if existing_email_user and not existing_university_user:
                    return JsonResponse({"detail": "Email already exists"}, status=400)
                if existing_university_user and not existing_email_user:
                    return JsonResponse({"detail": "University ID already exists"}, status=400)

                user_obj = existing_email_user or existing_university_user
                if user_obj:
                    user_obj.email = email
                    user_obj.university_id = university_id
                    user_obj.first_name = first_name
                    user_obj.middle_name = middle_name
                    user_obj.last_name = last_name
                    user_obj.save(update_fields=["email", "university_id", "first_name", "middle_name", "last_name"])
                else:
                    user_obj = User.objects.create(
                        email=email,
                        university_id=university_id,
                        first_name=first_name,
                        middle_name=middle_name,
                        last_name=last_name,
                    )

                # Additional validation for College Dean: Check if person being added is a Dean
                if is_college_dean and assistant_type == "student_assistant":
                    # Check if the user being created already has a Dean role for this college
                    from .models import Role, UserRole
                    dean_roles = UserRole.objects.filter(
                        user=user_obj,
                        role__name__in=['College Dean', 'College Admin'],
                        college=college,
                        is_active=True
                    )
                    if dean_roles.exists():
                        return JsonResponse({"detail": "Cannot add a Dean as a Student Assistant"}, status=400)

                # Student assistants are represented via StudentAssistant + Student Assistant role
                if assistant_type == "student_assistant":
                    sa, _ = StudentAssistant.objects.get_or_create(user=user_obj)
                    sa.college = college
                    sa.department = department
                    sa.supervisor_approver = user
                    sa.save(update_fields=["college", "department", "supervisor_approver"])

                    from .models import Role, UserRole

                    student_role, _ = Role.objects.get_or_create(
                        name="Student Assistant",
                        defaults={"description": "Student Assistant role"},
                    )
                    UserRole.objects.get_or_create(
                        user=user_obj,
                        role=student_role,
                        defaults={"is_active": True, "college": college, "department": department},
                    )
                else:
                    # Admin-type assistants are stored in ApproverAssistant and use the generic Approver role.
                    from .models import Role, UserRole

                    approver_role, _ = Role.objects.get_or_create(
                        name="Approver",
                        defaults={"description": "Approver role"},
                    )
                    UserRole.objects.get_or_create(
                        user=user_obj,
                        role=approver_role,
                        defaults={"is_active": True, "college": college, "department": department},
                    )

                    ApproverAssistant.objects.update_or_create(
                        assistant=user_obj,
                        supervisor=user,
                        defaults={
                            "assistant_type": assistant_type,
                            "college": college,
                            "department": department,
                            "office": office,
                        },
                    )

            return JsonResponse({"ok": True, "id": str(user_obj.id)})

        else:
            return JsonResponse({"detail": "Method not allowed"}, status=405)

    except Exception as e:
        import traceback
        return JsonResponse({"detail": f"Internal server error: {str(e)}", "traceback": traceback.format_exc()}, status=500)


@csrf_exempt
def approver_assistant_approver_detail_api(request, user_id):
    user, err = _require_approver_user(request)
    if err:
        return err

    try:
        user_id_int = int(user_id)
    except ValueError:
        return JsonResponse({"detail": "Invalid user ID"}, status=400)

    try:
        target_user = User.objects.get(pk=user_id_int)
    except User.DoesNotExist:
        return JsonResponse({"detail": "User not found"}, status=404)

    def _full_name(u: User):
        parts = [(u.first_name or "").strip(), (u.middle_name or "").strip(), (u.last_name or "").strip()]
        parts = [p for p in parts if p]
        return " ".join(parts) if parts else u.email

    if request.method == "GET":
        assistant_profile = getattr(target_user, "assistant_profile", None)
        if not assistant_profile:
            # Check if this is an admin-type ApproverAssistant instead
            aa = (
                ApproverAssistant.objects.select_related("assistant", "college", "department", "office")
                .filter(supervisor=user, assistant=target_user)
                .first()
            )
            if not aa:
                return JsonResponse({"detail": "Assistant profile not found"}, status=404)

            return JsonResponse(
                {
                    "item": {
                        "id": str(target_user.id),
                        "name": _full_name(target_user),
                        "systemId": f"SYS-{target_user.id}",
                        "userRole": "Admin Assistant",
                        "assistantType": aa.assistant_type,
                        "universityId": target_user.university_id or "",
                        "college": aa.college.name if aa.college else "N/A",
                        "department": aa.department.name if aa.department else (aa.office.name if aa.office else "N/A"),
                        "office": aa.office.name if aa.office else "",
                        "email": target_user.email,
                        "isActive": bool(aa.is_active and target_user.is_active),
                    }
                }
            )

        return JsonResponse(
            {
                "item": {
                    "id": str(target_user.id),
                    "name": _full_name(target_user),
                    "systemId": f"SYS-{target_user.id}",
                    "userRole": "Assistant Approver",
                    "assistantType": "student_assistant",
                    "universityId": target_user.university_id or "",
                    "college": assistant_profile.college.name if assistant_profile.college else "N/A",
                    "department": assistant_profile.department.name if assistant_profile.department else "N/A",
                    "office": "",
                    "email": target_user.email,
                    "isActive": bool(target_user.is_active),
                }
            }
        )

    if request.method == "DELETE":
        assistant_profile = getattr(target_user, "assistant_profile", None)
        # Prefer deleting StudentAssistant if it exists; otherwise check ApproverAssistant
        with transaction.atomic():
            if assistant_profile:
                assistant_profile.delete()
            ApproverAssistant.objects.filter(supervisor=user, assistant=target_user).delete()
            # Delete the user completely
            target_user.delete()

        return JsonResponse({"ok": True})

    if request.method not in {"PUT", "PATCH"}:
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    data, parse_err = _parse_json_body(request)
    if parse_err:
        return parse_err
    if not isinstance(data, dict):
        return JsonResponse({"detail": "Invalid payload"}, status=400)

    first_name = (data.get("firstName") or "").strip()
    middle_name = (data.get("middleName") or "").strip()
    last_name = (data.get("lastName") or "").strip()
    university_id = (data.get("universityId") or "").strip()
    email = _validate_xu_email(data.get("email") or "")
    is_active = bool(data.get("isActive", True))

    if not email:
        return JsonResponse({"detail": "Email must be an XU email (@xu.edu.ph or @my.xu.edu.ph)"}, status=400)
    if not university_id or not university_id.isdigit():
        return JsonResponse({"detail": "University ID must be a valid number"}, status=400)

    college_name = (data.get("college") or "").strip()
    dept_name = (data.get("department") or "").strip()
    office_name = (data.get("office") or "").strip()
    
    # Check if this is an admin assistant
    admin_assistant = (
        ApproverAssistant.objects.select_related("assistant", "college", "department", "office")
        .filter(supervisor=user, assistant=target_user)
        .first()
    )
    
    if admin_assistant:
        # Admin assistant: only need department OR office
        if not dept_name and not office_name:
            return JsonResponse({"detail": "Department or Office is required for Admin assistants"}, status=400)
        college_name = admin_assistant.college.name if admin_assistant.college else ""
    else:
        # Student assistant: need both college and department
        if not college_name:
            return JsonResponse({"detail": "College is required"}, status=400)
        if not dept_name:
            return JsonResponse({"detail": "Department is required"}, status=400)

    # Only look up college if it's provided (for student assistants)
    college = None
    if college_name:
        college = College.objects.filter(name__iexact=college_name, is_active=True).first()
        if not college:
            return JsonResponse({"detail": "College not found"}, status=400)

    # Look up department if provided
    department = None
    if dept_name:
        if college:  # Student assistant case
            department = Department.objects.filter(
                name__iexact=dept_name,
                college=college,
                is_active=True,
            ).first()
            if not department:
                return JsonResponse({"detail": "Department not found"}, status=400)
        else:  # Admin assistant case - find department by name only
            department = Department.objects.filter(
                name__iexact=dept_name,
                is_active=True,
            ).first()
            if not department:
                return JsonResponse({"detail": "Department not found"}, status=400)

    # Look up office if provided (for admin assistants)
    office = None
    if office_name:
        office = Office.objects.filter(
            name__iexact=office_name,
            is_active=True,
        ).first()
        if not office:
            return JsonResponse({"detail": "Office not found"}, status=400)

    assistant_profile = getattr(target_user, "assistant_profile", None)

    if not assistant_profile and not admin_assistant:
        return JsonResponse({"detail": "Assistant profile not found"}, status=404)

    with transaction.atomic():
        if User.objects.filter(email__iexact=email).exclude(pk=target_user.id).exists():
            return JsonResponse({"detail": "Email already exists"}, status=400)
        if User.objects.filter(university_id__iexact=university_id).exclude(pk=target_user.id).exists():
            return JsonResponse({"detail": "University ID already exists"}, status=400)

        # Update core user fields
        target_user.email = email
        target_user.university_id = university_id
        target_user.first_name = first_name
        target_user.middle_name = middle_name
        target_user.last_name = last_name
        target_user.is_active = is_active
        target_user.save(
            update_fields=[
                "email",
                "university_id",
                "first_name",
                "middle_name",
                "last_name",
                "is_active",
            ]
        )

        # Update either StudentAssistant or ApproverAssistant profile
        if assistant_profile:
            assistant_profile.college = college
            assistant_profile.department = department
            assistant_profile.save(update_fields=["college", "department"])
        if admin_assistant:
            admin_assistant.college = college
            admin_assistant.department = department
            admin_assistant.office = None
            admin_assistant.save(update_fields=["college", "department", "office"])

    return JsonResponse({"ok": True})


def get_approver_flow_config(timeline_id=None):
    """
    Get approver flow configuration for a specific timeline.
    Falls back to global config if no timeline-specific config exists.
    """
    config = None
    
    if timeline_id:
        try:
            timeline = ClearanceTimeline.objects.get(id=timeline_id)
            config = ApproverFlowConfig.objects.filter(clearance_timeline=timeline).order_by("-updated_at", "pk").first()
        except ClearanceTimeline.DoesNotExist:
            pass
        return config
    
    # Fallback to global config (null clearance_timeline)
    if not config:
        config = ApproverFlowConfig.objects.filter(clearance_timeline__isnull=True).order_by("-updated_at", "pk").first()
    
    return config


# New endpoints for Frontend V2

# Faculty additional endpoints
def faculty_archived_clearance_api(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)
    
    user = _get_authenticated_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication required"}, status=401)
    
    faculty = getattr(user, "faculty_profile", None)
    if not faculty:
        return JsonResponse({"detail": "Faculty profile not found"}, status=404)
    
    archived_timelines = ClearanceTimeline.objects.filter(archive_date__isnull=False).order_by("-archive_date")
    for timeline in archived_timelines:
        _ensure_archived_timeline_records(timeline)

    items = []
    for timeline in archived_timelines:
        has_archived_snapshot = ArchivedClearance.objects.filter(
            clearance_timeline=timeline,
            faculty=faculty,
        ).exists()

        if not has_archived_snapshot:
            continue

        start_year = str(timeline.academic_year_start or "")
        end_year = str(timeline.academic_year_end or "")
        items.append({
            "id": str(timeline.id),
            "name": timeline.name or _clearance_timeline_name(timeline.academic_year_start, timeline.academic_year_end, timeline.term),
            "academicYear": f"{start_year}-{end_year}",
            "semester": _term_to_label(timeline.term),
            "clearancePeriodStart": timeline.clearance_start_date.strftime("%m/%d/%Y"),
            "clearancePeriodEnd": timeline.clearance_end_date.strftime("%m/%d/%Y"),
            "lastUpdated": timeline.updated_at.strftime("%B %d, %Y, %H:%M %p"),
            "archivedDate": timeline.archive_date.strftime("%B %d, %Y, %H:%M %p"),
        })
    
    return JsonResponse({"items": items})

def faculty_view_clearance_api(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)
    
    user = _get_authenticated_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication required"}, status=401)
    
    faculty = getattr(user, "faculty_profile", None)
    if not faculty:
        return JsonResponse({"detail": "Faculty profile not found"}, status=404)

    timeline_id = (request.GET.get("timelineId") or request.GET.get("timeline_id") or "").strip()

    timeline = None
    if timeline_id:
        timeline = ClearanceTimeline.objects.filter(id=timeline_id).first()
        if not timeline:
            return JsonResponse({"detail": "Timeline not found"}, status=404)
    else:
        timeline = ClearanceTimeline.objects.filter(is_active=True).order_by("-academic_year_start", "-id").first()
    if not timeline:
        return JsonResponse({"detail": "No active clearance timeline"}, status=404)
    if timeline.archive_date:
        _ensure_archived_timeline_records(timeline)
        archived = ArchivedClearance.objects.filter(
            faculty=faculty,
            clearance_timeline=timeline,
        ).first()

        if not archived:
            return JsonResponse({"detail": "Archived clearance not found"}, status=404)

        archived_data = archived.clearance_data or {}
        archived_requests = archived_data.get("requests") or []
        clearance_requests = []
        for index, req in enumerate(archived_requests, start=1):
            clearance_requests.append({
                "id": req.get("id") or index,
                "requestId": req.get("requestId") or "",
                "title": req.get("title") or "",
                "description": req.get("description") or "",
                "status": req.get("status") or ClearanceRequest.Status.PENDING,
                "submissionNotes": req.get("submissionNotes") or "",
                "submissionLink": req.get("submissionLink") or "",
                "submittedDate": req.get("submittedDate"),
                "approvedDate": req.get("approvedDate"),
                "approvedBy": req.get("approvedBy"),
                "remarks": req.get("remarks") or "",
            })

        return JsonResponse({
            "timeline": {
                "id": str(timeline.id),
                "name": timeline.name or _clearance_timeline_name(timeline.academic_year_start, timeline.academic_year_end, timeline.term),
                "academicYear": f"{timeline.academic_year_start}-{timeline.academic_year_end}",
                "semester": _term_to_label(timeline.term),
                "archivedDate": timeline.archive_date.strftime("%B %d, %Y, %H:%M %p") if timeline.archive_date else None,
            },
            "clearance": {
                "id": archived.id,
                "academicYear": archived.academic_year,
                "term": archived.semester,
                "status": archived.status,
                "submittedDate": None,
                "completedDate": archived.last_updated.strftime("%Y-%m-%d %H:%M:%S") if archived.last_updated else None,
                "lastUpdated": archived.last_updated.strftime("%Y-%m-%d %H:%M:%S") if archived.last_updated else None,
                "missingApproval": archived_data.get("missing_approval", ""),
                "approvedCount": archived_data.get("approved_count", 0),
                "totalCount": archived_data.get("request_count", len(clearance_requests)),
            },
            "requests": clearance_requests,
        })

    clearance = Clearance.objects.filter(
        faculty=faculty, 
        academic_year=timeline.academic_year_start, 
        term=timeline.term
    ).first()
    
    if not clearance:
        return JsonResponse({"detail": "Clearance not found"}, status=404)
    
    requests = ClearanceRequest.objects.filter(
        faculty=faculty,
        clearance_timeline=timeline,
    ).select_related('requirement', 'approved_by')
    
    clearance_requests = []
    for req in requests:
        clearance_requests.append({
            "id": req.id,
            "requestId": req.request_id,
            "title": req.requirement.title,
            "description": req.requirement.description or "",
            "status": req.status,
            "submissionNotes": req.submission_notes,
            "submissionLink": req.submission_link,
            "submittedDate": req.submitted_date.strftime("%Y-%m-%d %H:%M:%S") if req.submitted_date else None,
            "approvedDate": req.approved_date.strftime("%Y-%m-%d %H:%M:%S") if req.approved_date else None,
            "approvedBy": req.approved_by.get_full_name() if req.approved_by else None,
            "remarks": req.remarks,
        })
    
    return JsonResponse({
        "timeline": {
            "id": str(timeline.id),
            "name": timeline.name or _clearance_timeline_name(timeline.academic_year_start, timeline.academic_year_end, timeline.term),
            "academicYear": f"{timeline.academic_year_start}-{timeline.academic_year_end}",
            "semester": _term_to_label(timeline.term),
            "archivedDate": None,
        },
        "clearance": {
            "id": clearance.id,
            "academicYear": clearance.academic_year,
            "term": clearance.term,
            "status": clearance.status,
            "submittedDate": clearance.submitted_date.strftime("%Y-%m-%d %H:%M:%S") if clearance.submitted_date else None,
            "completedDate": clearance.completed_date.strftime("%Y-%m-%d %H:%M:%S") if clearance.completed_date else None,
            "lastUpdated": clearance.updated_at.strftime("%Y-%m-%d %H:%M:%S") if getattr(clearance, "updated_at", None) else None,
            "missingApproval": "",
            "approvedCount": sum(1 for req in clearance_requests if req["status"] == ClearanceRequest.Status.APPROVED),
            "totalCount": len(clearance_requests),
        },
        "requests": clearance_requests
    })

# Approver endpoints
def approver_dashboard_api(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    user = _get_authenticated_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication required"}, status=401)

    # Check if user has Approver role
    allowed_approver_roles = ['Approver', 'Office Admin', 'College Admin', 'Department Chair']
    if not user.userrole_set.filter(role__name__in=allowed_approver_roles, is_active=True).exists():
        return JsonResponse({"detail": "Access denied"}, status=403)

    try:
        # Get approver profile information
        from .models import Approver
        approver_info = None
        approver = None
        try:
            approver = Approver.objects.get(user=user)
            approver_info = {
                "approver_type": approver.approver_type,
                "college": approver.college.name if approver.college else None,
                "department": approver.department.name if approver.department else None,
                "office": approver.office.name if approver.office else None,
            }
        except Approver.DoesNotExist:
            approver_info = None

        # Get active timeline using the same function as other endpoints
        timeline = _get_active_timeline()
        
        # Get pending clearance requests for this approver
        pending_requests = []
        total_requests = []
        if timeline:
            try:
                # Get requirements that this approver needs to approve
                requirements = Requirement.objects.filter(
                    clearance_timeline=timeline,
                    is_active=True
                ).select_related(
                    'created_by', 'clearance_timeline'
                ).prefetch_related(
                    'target_colleges', 'target_departments', 'target_offices', 'target_faculty'
                )
                
                # Filter requirements based on approver's scope using the existing _can_approver_access_requirement function
                filtered_requirements = []
                for req in requirements:
                    if approver and approver_info:
                        if _can_approver_access_requirement(approver, req):
                            filtered_requirements.append(req)
                    else:
                        # If no approver profile, include all requirements (fallback)
                        filtered_requirements.append(req)
                
                # Get all clearance requests (for total count)
                all_clearance_requests = ClearanceRequest.objects.filter(
                    clearance_timeline=timeline,
                    requirement__in=filtered_requirements
                ).select_related('faculty__user', 'requirement')
                
                # Get only pending clearance requests (for pending count)
                pending_clearance_requests = all_clearance_requests.filter(
                    status=ClearanceRequest.Status.PENDING
                )
                
                for req in pending_clearance_requests:
                    try:
                        # Get faculty name from faculty model, not user model
                        faculty = req.faculty
                        faculty_name = f"{faculty.first_name or ''} {faculty.middle_name or ''} {faculty.last_name or ''}".strip()
                        if not faculty_name:
                            faculty_name = faculty.user.email
                        
                        pending_requests.append({
                            "id": req.id,
                            "requestId": req.request_id,
                            "facultyName": faculty_name,
                            "facultyEmail": faculty.user.email,
                            "title": req.requirement.title,
                            "submittedDate": req.submitted_date.strftime("%Y-%m-%d") if req.submitted_date else None,
                        })
                    except Exception as e:
                        continue
                
                for req in all_clearance_requests:
                    try:
                        # Get faculty name from faculty model, not user model
                        faculty = req.faculty
                        faculty_name = f"{faculty.first_name or ''} {faculty.middle_name or ''} {faculty.last_name or ''}".strip()
                        if not faculty_name:
                            faculty_name = faculty.user.email
                        
                        total_requests.append({
                            "id": req.id,
                            "requestId": req.request_id,
                            "facultyName": faculty_name,
                            "facultyEmail": faculty.user.email,
                            "title": req.requirement.title,
                            "status": _to_request_status(req.status),
                            "submittedDate": req.submitted_date.strftime("%Y-%m-%d") if req.submitted_date else None,
                        })
                    except Exception as e:
                        continue
                        
            except Exception as e:
                # If there's an error in the main logic, return empty data
                pending_requests = []
                total_requests = []
        
        # Use the same timeline data format as active_clearance_timeline_api
        timeline_data = None
        if timeline:
            try:
                if timeline.academic_year_start is not None and timeline.academic_year_end is not None:
                    academic_year = f"{timeline.academic_year_start}–{timeline.academic_year_end}"
                else:
                    academic_year = ""
                
                timeline_data = {
                    "academicYear": academic_year,
                    "semester": _term_to_label(timeline.term)
                }
            except Exception as e:
                timeline_data = None
        
        return JsonResponse({
            "pendingRequests": pending_requests,
            "pendingCount": len(pending_requests),
            "totalRequests": total_requests,
            "totalCount": len(total_requests),
            "approverInfo": approver_info,
            "timeline": timeline_data
        })
        
    except Exception as e:
        # Return a safe response if anything goes wrong
        return JsonResponse({
            "pendingRequests": [],
            "pendingCount": 0,
            "totalRequests": [],
            "totalCount": 0,
            "approverInfo": None,
            "timeline": None,
            "error": f"Dashboard error: {str(e)}"
        })

@csrf_exempt
def approver_requirement_list_api(request):
    user = _get_authenticated_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication required"}, status=401)

    # Check if user has approver role
    user_roles = user.get_active_roles().values_list('role__name', flat=True)
    if 'Approver' not in user_roles:
        return JsonResponse({"detail": "Forbidden - Approver role required"}, status=403)

    if request.method == "GET":
        return _get_approver_requirements(user, request)
    elif request.method == "POST":
        return _create_approver_requirement(user, request)
    else:
        return JsonResponse({"detail": "Method not allowed"}, status=405)


def _get_approver_requirements(user, request):
    """Get requirements for the approver based on their role and scope"""
    timeline = _get_active_timeline()
    if not timeline:
        return JsonResponse({"items": []})

    # Get approver profile to determine scope
    try:
        approver_profile = user.approver_profile
    except AttributeError:
        return JsonResponse({"items": []})

    # Filter requirements based on approver's scope
    requirements = Requirement.objects.filter(
        clearance_timeline=timeline,
        is_active=True
    ).select_related(
        'created_by', 'clearance_timeline'
    ).prefetch_related(
        'target_colleges', 'target_departments', 'target_offices', 'target_faculty'
    ).order_by('-last_updated')

    # Apply role-based filtering
    filtered_requirements = []
    for req in requirements:
        if _can_approver_access_requirement(approver_profile, req):
            filtered_requirements.append(_serialize_approver_requirement(req))

    return JsonResponse({"items": filtered_requirements})


def _can_approver_access_requirement(approver_profile, requirement):
    """Check if approver can access this requirement based on their role and scope"""
    
    # Always allow access to requirements created by the user
    if requirement.created_by == approver_profile.user:
        return True
    
    # Check if the requirement creator is an Office Approver (OVPHE, etc.)
    # Department/College approvers should not see requirements created by Office Approvers
    creator_is_office_approver = False
    try:
        creator_approver_profile = requirement.created_by.approver_profile
        if creator_approver_profile.office:
            creator_office_name = creator_approver_profile.office.name.lower()
            if any(term in creator_office_name for term in ['vice president', 'ovphe', 'registrar', 'library', 'human resources', 'hr']):
                creator_is_office_approver = True
            elif not creator_approver_profile.college and not creator_approver_profile.department:
                creator_is_office_approver = True
    except AttributeError:
        pass
    
    # If creator is an Office Approver and current approver is not, deny access
    if creator_is_office_approver:
        return False
    
    # Determine approver type based on user's logic:
    # 1. College Dean: Has "Dean" in their department name
    # 2. Department Chair: Has both College and Department but no "Dean"
    # 3. Office Approver: Only has Office (priority over department/college if office is OVPHE-related)
    
    is_college_dean = False
    is_department_chair = False
    is_office_approver = False
    
    # Check for Office Approver first (especially for OVPHE)
    if approver_profile.office:
        office_name_lower = approver_profile.office.name.lower()
        # OVPHE and similar offices should be treated as Office Approvers even if they have college/department
        if any(term in office_name_lower for term in ['vice president', 'ovphe', 'registrar', 'library', 'human resources', 'hr']):
            is_office_approver = True
        # If they only have office (no college/department), they're definitely an Office Approver
        elif not approver_profile.college and not approver_profile.department:
            is_office_approver = True
    
    # If not identified as Office Approver, check for College/Department roles
    if not is_office_approver and approver_profile.department and approver_profile.college:
        # Check if this is a College Dean (has "Dean" in department name)
        if "dean" in approver_profile.department.name.lower():
            is_college_dean = True
        else:
            # This is a Department Chair (has college and department but no "Dean")
            is_department_chair = True
    
    # College Dean logic
    if is_college_dean:
        college = approver_profile.college
        department = approver_profile.department
        if requirement.recipient_scope in ['all', 'college']:
            return approver_profile.college in requirement.target_colleges.all()
        elif requirement.recipient_scope == 'department':
            # College Dean can only see requirements for their specific department
            return department in requirement.target_departments.all()
        elif requirement.recipient_scope == 'office':
            # College Dean should not see office-specific requirements
            return False
        elif requirement.recipient_scope == 'individual':
            # Check if any target faculty is under their specific department
            return requirement.target_faculty.filter(
                department=department
            ).exists()
    
    # Department Chair logic
    elif is_department_chair:
        department = approver_profile.department
        if requirement.recipient_scope == 'department':
            return department in requirement.target_departments.all()
        elif requirement.recipient_scope == 'college':
            # Department Chair should only see college-wide requirements if their department's college is targeted
            return department.college in requirement.target_colleges.all()
        elif requirement.recipient_scope == 'all':
            return True
        elif requirement.recipient_scope == 'office':
            # Department Chair should not see office-specific requirements
            return False
        elif requirement.recipient_scope == 'individual':
            # Department Chair should only see individual requirements for faculty in their specific department
            # BUT NOT if created by Office Approvers (handled above)
            return requirement.target_faculty.filter(
                department=department
            ).exists()
    
    # Office Approver logic
    elif is_office_approver:
        office = approver_profile.office
        if requirement.recipient_scope == 'office':
            return office in requirement.target_offices.all()
        elif requirement.recipient_scope == 'all':
            return True
        elif requirement.recipient_scope in ['college', 'department', 'individual']:
            # Office approvers should only see college/department/individual specific requirements
            # if their office is explicitly targeted as a recipient for that scope
            return office in requirement.target_offices.all()
    
    return False


def _serialize_approver_requirement(requirement):
    """Serialize requirement for approver view"""
    recipients = []
    
    if requirement.recipient_scope == 'all':
        recipients = ['All Faculty']
    elif requirement.recipient_scope == 'college':
        recipients = [college.name for college in requirement.target_colleges.all()]
    elif requirement.recipient_scope == 'department':
        recipients = [department.name for department in requirement.target_departments.all()]
    elif requirement.recipient_scope == 'office':
        recipients = [office.name for office in requirement.target_offices.all()]
    elif requirement.recipient_scope == 'individual':
        recipients = [f"{faculty.user.first_name} {faculty.user.last_name}" 
                     for faculty in requirement.target_faculty.all()]
    
    return {
        "id": requirement.id,
        "title": requirement.title or "",
        "description": requirement.description or "",
        "physicalSubmission": bool(requirement.required_physical),
        "recipients": ", ".join(recipients) if recipients else "",
        "lastUpdated": timezone.localtime(requirement.last_updated).strftime("%B %d, %Y, %I:%M %p") if requirement.last_updated else "",
        "createdBy": f"{requirement.created_by.first_name} {requirement.created_by.last_name}" if requirement.created_by else "",
        "clearanceTimeline": requirement.clearance_timeline.name if requirement.clearance_timeline else "",
        "recipientScope": requirement.recipient_scope,
        "targetColleges": [college.id for college in requirement.target_colleges.all()],
        "targetDepartments": [dept.id for dept in requirement.target_departments.all()],
        "targetOffices": [office.id for office in requirement.target_offices.all()],
        "targetFaculty": [faculty.id for faculty in requirement.target_faculty.all()],
        "approverFlowStepId": requirement.approver_flow_step.id if requirement.approver_flow_step else None,
        "approverFlowStepCategory": requirement.approver_flow_step.category if requirement.approver_flow_step else None,
    }


def _get_approver_flow_step_for_user(user):
    """Automatically determine the approver flow step for a user based on their role"""
    timeline = _get_active_timeline()
    if not timeline:
        return None
    
    # Get approver flow config for the active timeline
    config = timeline.approver_flow_configs.first()
    if not config:
        return None
    
    # Get user's approver profile
    try:
        approver_profile = user.approver_profile
    except AttributeError:
        return None
    
    # Determine approver type based on user's logic:
    # 1. College Dean: Has "Dean" in their department name
    # 2. Department Chair: Has both College and Department but no "Dean"
    # 3. Office Approver: Only has Office (priority over department/college if office is OVPHE-related)
    
    is_college_dean = False
    is_department_chair = False
    is_office_approver = False
    
    # Check for Office Approver first (especially for OVPHE)
    if approver_profile.office:
        office_name_lower = approver_profile.office.name.lower()
        # OVPHE and similar offices should be treated as Office Approvers even if they have college/department
        if any(term in office_name_lower for term in ['vice president', 'ovphe', 'registrar', 'library', 'human resources', 'hr']):
            is_office_approver = True
        # If they only have office (no college/department), they're definitely an Office Approver
        elif not approver_profile.college and not approver_profile.department:
            is_office_approver = True
    
    # If not identified as Office Approver, check for College/Department roles
    if not is_office_approver and approver_profile.department and approver_profile.college:
        # Check if this is a College Dean (has "Dean" in department name)
        if "dean" in approver_profile.department.name.lower():
            is_college_dean = True
        else:
            # This is a Department Chair (has college and department but no "Dean")
            is_department_chair = True
    
    # Find the matching flow step based on approver's role and scope
    flow_steps = config.steps.order_by('order').prefetch_related('colleges')
    
    for step in flow_steps:
        step_category = step.category.lower()
        
        # Department Chair matching
        if is_department_chair and 'department chair' in step_category:
            return step
        
        # College Dean matching - only match if user is actually a Dean
        elif is_college_dean and ('college dean' in step_category or 'dean' in step_category):
            return step
        
        # Office Approver matching
        elif is_office_approver and step.office and approver_profile.office:
            if step.office == approver_profile.office:
                return step
        
        # University-wide offices (fallback for specific office names)
        elif is_office_approver:
            office_name = approver_profile.office.name.lower()
            if 'registrar' in step_category and 'registrar' in office_name:
                return step
            elif 'library' in step_category and 'library' in office_name:
                return step
            elif 'human resources' in step_category and ('human resources' in office_name or 'hr' in office_name):
                return step
            elif 'vice president' in step_category and ('vice president' in office_name or 'ovphe' in office_name):
                return step
    
    return None


def _create_approver_requirement(user, request):
    """Create a new requirement"""
    timeline = _get_active_timeline()
    if not timeline:
        return JsonResponse({"detail": "No active clearance timeline"}, status=400)

    data, parse_err = _parse_json_body(request)
    if parse_err:
        return parse_err

    title = data.get("title", "").strip()
    description = data.get("description", "").strip()
    physical_submission = data.get("physicalSubmission", False)
    recipient_scope = data.get("recipientScope", "individual")
    target_colleges = data.get("targetColleges", [])
    target_departments = data.get("targetDepartments", [])
    target_offices = data.get("targetOffices", [])
    target_faculty = data.get("targetFaculty", [])

    if not title:
        return JsonResponse({"detail": "Title is required"}, status=400)
    
    # Automatically detect approver flow step based on user's role
    approver_flow_step = _get_approver_flow_step_for_user(user)
    if not approver_flow_step:
        return JsonResponse({"detail": "Could not determine approver flow step for your role. Please ensure you have an approver profile assigned."}, status=400)

    try:
        with transaction.atomic():
            requirement = Requirement.objects.create(
                title=title,
                description=description,
                required_physical=physical_submission,
                created_by=user,
                clearance_timeline=timeline,
                recipient_scope=recipient_scope,
                approver_flow_step=approver_flow_step
            )

            # Set target recipients based on scope
            if recipient_scope == 'college' and target_colleges:
                requirement.target_colleges.set(target_colleges)
            elif recipient_scope == 'department' and target_departments:
                requirement.target_departments.set(target_departments)
            elif recipient_scope == 'office' and target_offices:
                requirement.target_offices.set(target_offices)
            elif recipient_scope == 'individual' and target_faculty:
                requirement.target_faculty.set(target_faculty)

        return JsonResponse({
            "id": requirement.id,
            "message": "Requirement created successfully"
        })

    except Exception as e:
        return JsonResponse({"detail": f"Failed to create requirement: {str(e)}"}, status=500)


@csrf_exempt
def approver_requirement_detail_api(request, requirement_id):
    """Handle individual requirement operations (GET, PUT, DELETE)"""
    user = _get_authenticated_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication required"}, status=401)

    # Check if user has approver role
    user_roles = user.get_active_roles().values_list('role__name', flat=True)
    if 'Approver' not in user_roles:
        return JsonResponse({"detail": "Forbidden - Approver role required"}, status=403)

    try:
        requirement = Requirement.objects.get(id=requirement_id, is_active=True)
    except Requirement.DoesNotExist:
        return JsonResponse({"detail": "Requirement not found"}, status=404)

    # Check if user can access this requirement
    try:
        approver_profile = user.approver_profile
        if not _can_approver_access_requirement(approver_profile, requirement):
            return JsonResponse({"detail": "Forbidden - Cannot access this requirement"}, status=403)
    except AttributeError:
        return JsonResponse({"detail": "Forbidden - Approver profile not found"}, status=403)

    if request.method == "GET":
        return JsonResponse(_serialize_approver_requirement(requirement))
    elif request.method == "PUT":
        return _update_approver_requirement(user, requirement, request)
    elif request.method == "DELETE":
        return _delete_approver_requirement(user, requirement, request)
    else:
        return JsonResponse({"detail": "Method not allowed"}, status=405)


def _update_approver_requirement(user, requirement, request):
    """Update an existing requirement"""
    data, parse_err = _parse_json_body(request)
    if parse_err:
        return parse_err

    title = data.get("title", "").strip()
    description = data.get("description", "").strip()
    physical_submission = data.get("physicalSubmission", False)
    recipient_scope = data.get("recipientScope", requirement.recipient_scope)
    target_colleges = data.get("targetColleges", [])
    target_departments = data.get("targetDepartments", [])
    target_offices = data.get("targetOffices", [])
    target_faculty = data.get("targetFaculty", [])

    if not title:
        return JsonResponse({"detail": "Title is required"}, status=400)

    try:
        with transaction.atomic():
            requirement.title = title
            requirement.description = description
            requirement.required_physical = physical_submission
            requirement.recipient_scope = recipient_scope
            requirement.save()

            # Clear existing targets and set new ones
            requirement.target_colleges.clear()
            requirement.target_departments.clear()
            requirement.target_offices.clear()
            requirement.target_faculty.clear()

            # Set target recipients based on scope
            if recipient_scope == 'college' and target_colleges:
                requirement.target_colleges.set(target_colleges)
            elif recipient_scope == 'department' and target_departments:
                requirement.target_departments.set(target_departments)
            elif recipient_scope == 'office' and target_offices:
                requirement.target_offices.set(target_offices)
            elif recipient_scope == 'individual' and target_faculty:
                requirement.target_faculty.set(target_faculty)

        return JsonResponse({
            "id": requirement.id,
            "message": "Requirement updated successfully"
        })

    except Exception as e:
        return JsonResponse({"detail": f"Failed to update requirement: {str(e)}"}, status=500)


def _delete_approver_requirement(user, requirement, request):
    """Delete a requirement (soft delete by setting is_active=False)"""
    try:
        with transaction.atomic():
            requirement.is_active = False
            requirement.save()

        return JsonResponse({"message": "Requirement deleted successfully"})

    except Exception as e:
        return JsonResponse({"detail": f"Failed to delete requirement: {str(e)}"}, status=500)


def approver_faculty_options_api(request):
    """Get faculty options for recipient selection based on approver's role and scope"""
    user = _get_authenticated_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication required"}, status=401)

    # Check if user has approver role
    user_roles = user.get_active_roles().values_list('role__name', flat=True)
    if 'Approver' not in user_roles:
        return JsonResponse({"detail": "Forbidden - Approver role required"}, status=403)

    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    try:
        approver_profile = user.approver_profile
    except AttributeError:
        return JsonResponse({"options": []})

    # Get faculty based on approver's scope
    faculty_queryset = Faculty.objects.select_related('user', 'college', 'department').order_by('user__last_name', 'user__first_name')

    if approver_profile.college:
        # College Admin - all faculty in their college
        faculty_queryset = faculty_queryset.filter(college=approver_profile.college)
    elif approver_profile.department:
        # Department Chair - all faculty in their department
        faculty_queryset = faculty_queryset.filter(department=approver_profile.department)
    elif approver_profile.office:
        # Office Admin - all faculty
        pass  # No filtering needed
    else:
        return JsonResponse({"options": []})

    # Get search query
    query = (request.GET.get("query", "") or "").strip()
    if query:
        faculty_queryset = faculty_queryset.filter(
            Q(user__first_name__icontains=query) |
            Q(user__last_name__icontains=query) |
            Q(employee_id__icontains=query)
        )

    # Serialize faculty options
    options = []
    for faculty in faculty_queryset[:50]:  # Limit to 50 results
        name = f"{faculty.user.first_name} {faculty.user.last_name}".strip()
        if not name:
            name = faculty.user.email
        
        options.append({
            "id": str(faculty.id),
            "name": name,
            "subtitle": faculty.employee_id,
            "email": faculty.user.email,
            "college": faculty.college.name if faculty.college else "",
            "department": faculty.department.name if faculty.department else "",
        })

    return JsonResponse({"options": options})


def approver_college_department_options_api(request):
    """Get college and department options for recipient selection"""
    user = _get_authenticated_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication required"}, status=401)

    # Check if user has approver role
    user_roles = user.get_active_roles().values_list('role__name', flat=True)
    if 'Approver' not in user_roles:
        return JsonResponse({"detail": "Forbidden - Approver role required"}, status=403)

    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    try:
        approver_profile = user.approver_profile
    except AttributeError:
        return JsonResponse({"colleges": [], "departments": []})

    colleges = []
    departments = []

    if approver_profile.college:
        # College Admin - their college and its departments
        colleges = [{
            "id": approver_profile.college.id,
            "name": approver_profile.college.name,
            "abbreviation": approver_profile.college.abbreviation or ""
        }]
        departments = [
            {
                "id": dept.id,
                "name": dept.name,
                "abbreviation": dept.abbreviation or "",
                "college": dept.college.name
            }
            for dept in approver_profile.college.departments.filter(is_active=True)
        ]
    elif approver_profile.department:
        # Department Chair - their department and college
        colleges = [{
            "id": approver_profile.department.college.id,
            "name": approver_profile.department.college.name,
            "abbreviation": approver_profile.department.college.abbreviation or ""
        }]
        departments = [{
            "id": approver_profile.department.id,
            "name": approver_profile.department.name,
            "abbreviation": approver_profile.department.abbreviation or "",
            "college": approver_profile.department.college.name
        }]
    elif approver_profile.office:
        # Office Admin - all colleges and departments
        colleges = [
            {
                "id": college.id,
                "name": college.name,
                "abbreviation": college.abbreviation or ""
            }
            for college in College.objects.filter(is_active=True).order_by('name')
        ]
        departments = [
            {
                "id": dept.id,
                "name": dept.name,
                "abbreviation": dept.abbreviation or "",
                "college": dept.college.name
            }
            for dept in Department.objects.filter(is_active=True).select_related('college').order_by('college__name', 'name')
        ]

    return JsonResponse({"colleges": colleges, "departments": departments})


def faculty_requirements_api(request):
    """Get requirements for faculty based on their department/college/office"""
    user = _get_authenticated_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication required"}, status=401)

    # Check if user has faculty role
    if not user.userrole_set.filter(role__name='Faculty', is_active=True).exists():
        return JsonResponse({"detail": "Forbidden"}, status=403)

    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    timeline = _get_active_timeline()
    if not timeline:
        return JsonResponse({"items": []})

    try:
        faculty = user.faculty_profile
    except AttributeError:
        return JsonResponse({"items": []})

    # Get requirements that apply to this faculty
    requirements = Requirement.objects.filter(
        clearance_timeline=timeline,
        is_active=True
    ).select_related(
        'created_by', 'clearance_timeline'
    ).prefetch_related(
        'target_colleges', 'target_departments', 'target_offices', 'target_faculty'
    ).order_by('title', 'id')

    # Filter requirements based on faculty's profile
    applicable_requirements = []
    for req in requirements:
        if _requirement_applies_to_faculty(req, faculty):
            applicable_requirements.append(_serialize_faculty_requirement(req))

    return JsonResponse({"items": applicable_requirements})


def _requirement_applies_to_faculty(requirement, faculty):
    """Check if a requirement applies to a specific faculty member"""
    if requirement.recipient_scope == 'all':
        return True
    elif requirement.recipient_scope == 'college':
        return faculty.college and faculty.college in requirement.target_colleges.all()
    elif requirement.recipient_scope == 'department':
        return faculty.department and faculty.department in requirement.target_departments.all()
    elif requirement.recipient_scope == 'office':
        return faculty.office and faculty.office in requirement.target_offices.all()
    elif requirement.recipient_scope == 'individual':
        return faculty in requirement.target_faculty.all()
    return False


def _serialize_faculty_requirement(requirement):
    """Serialize requirement for faculty view"""
    return {
        "id": requirement.id,
        "title": requirement.title or "",
        "description": requirement.description or "",
        "physicalSubmission": bool(requirement.required_physical),
        "createdBy": f"{requirement.created_by.first_name} {requirement.created_by.last_name}" if requirement.created_by else "",
        "clearanceTimeline": requirement.clearance_timeline.name if requirement.clearance_timeline else "",
        "lastUpdated": timezone.localtime(requirement.last_updated).strftime("%B %d, %Y, %I:%M %p") if requirement.last_updated else "",
        "approverFlowStepCategory": requirement.approver_flow_step.category if requirement.approver_flow_step else None,
    }

def approver_clearance_api(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    user = _get_authenticated_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication required"}, status=401)

    # Check if user has Approver role
    if not user.userrole_set.filter(role__name='Approver', is_active=True).exists():
        return JsonResponse({"detail": "Access denied"}, status=403)

    active_timeline = _get_active_timeline()
    if not active_timeline:
        return JsonResponse({"items": []})

    # Get approver profile information
    from .models import Approver
    approver_info = None
    try:
        approver = Approver.objects.get(user=user)
        approver_info = {
            "approver_type": approver.approver_type,
            "college": approver.college,
            "department": approver.department,
            "office": approver.office,
        }
    except Approver.DoesNotExist:
        approver_info = None

    # Get requirements that this approver needs to approve
    requirements = Requirement.objects.filter(
        clearance_timeline=active_timeline,
        is_active=True
    ).select_related(
        'created_by', 'clearance_timeline'
    ).prefetch_related(
        'target_colleges', 'target_departments', 'target_offices', 'target_faculty'
    )
    
    # Filter requirements based on approver's scope using the same logic as requirement access
    filtered_requirements = []
    for req in requirements:
        if approver and approver_info:
            if _can_approver_access_requirement(approver, req):
                filtered_requirements.append(req)
        else:
            # If no approver profile, include all requirements (fallback)
            filtered_requirements.append(req)

    # Get clearance requests for the filtered requirements
    clearance_requests = ClearanceRequest.objects.select_related(
        'faculty',
        'faculty__college',
        'faculty__department',
        'requirement'
    ).filter(
        clearance_timeline=active_timeline,
        requirement__in=filtered_requirements
    ).order_by('-submitted_date')

    items = []
    for req in clearance_requests:
        faculty = req.faculty
        
        first_name = (getattr(faculty, "first_name", "") or "").strip()
        middle_name = (getattr(faculty, "middle_name", "") or "").strip()
        last_name = (getattr(faculty, "last_name", "") or "").strip()

        parts = [p for p in [first_name, middle_name, last_name] if p]
        full_name = " ".join(parts)

        college = getattr(getattr(faculty, "college", None), "name", "") or ""
        department = getattr(getattr(faculty, "department", None), "name", "") or ""
        faculty_type = getattr(faculty, "faculty_type", "") or ""
        employee_id = getattr(faculty, "employee_id", "") or ""

        items.append({
            "id": str(req.id),
            "requestId": req.request_id,
            "employeeId": employee_id,
            "name": full_name,
            "college": college,
            "department": department,
            "facultyType": faculty_type,
            "requirementTitle": req.requirement.title if req.requirement else "",
            "status": _to_request_status(req.status),
            "submittedDate": req.submitted_date.strftime("%Y-%m-%d") if req.submitted_date else None,
            "submissionNotes": req.submission_notes or "",
        })

    return JsonResponse({"items": items})

@csrf_exempt
@approver_required
def approver_action_api(request):
    user = _get_authenticated_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication required"}, status=401)

    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    try:
        data = json.loads(request.body.decode("utf-8") or "{}")
    except Exception:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)

    request_ids = data.get("request_ids", [])
    action = data.get("action")  # "approve" or "reject"
    remarks = data.get("remarks", "")

    if not request_ids or action not in ["approve", "reject"]:
        return JsonResponse({"detail": "Invalid request data"}, status=400)

    if action == "reject" and not remarks.strip():
        return JsonResponse({"detail": "Remarks are required for rejection"}, status=400)

    active_timeline = _get_active_timeline()
    if not active_timeline:
        return JsonResponse({"detail": "No active clearance timeline"}, status=400)

    # Get all clearance requests
    clearance_requests = ClearanceRequest.objects.filter(
        id__in=request_ids,
        clearance_timeline=active_timeline
    )

    if len(clearance_requests) != len(request_ids):
        return JsonResponse({"detail": "Some clearance requests not found"}, status=404)

    # Check if any requests are already processed
    processed_requests = []
    for cr in clearance_requests:
        if cr.status in [ClearanceRequest.Status.APPROVED, ClearanceRequest.Status.REJECTED]:
            processed_requests.append({
                "id": str(cr.id),
                "requestId": cr.request_id,
                "status": _to_request_status(cr.status),
                "message": "Request already processed"
            })

    if processed_requests:
        return JsonResponse({
            "detail": f"{len(processed_requests)} request(s) already processed and cannot be modified",
            "processed_requests": processed_requests
        }, status=400)

    # Validate permissions for all requests
    for cr in clearance_requests:
        if not _can_approver_access_request(user, cr):
            return JsonResponse({"detail": f"Permission denied for request {cr.request_id}"}, status=403)

    # Process all requests in a transaction
    with transaction.atomic():
        updated_requests = []
        for clearance_request in clearance_requests:
            old_status = clearance_request.status
            clearance_request.status = (
                ClearanceRequest.Status.APPROVED if action == "approve"
                else ClearanceRequest.Status.REJECTED
            )
            clearance_request.approved_by = user
            clearance_request.approved_date = timezone.now()
            clearance_request.remarks = remarks
            clearance_request.save()

            # Log the activity
            ActivityLog.objects.create(
                event_type=(
                    ActivityLog.EventType.APPROVED_CLEARANCE if action == "approve"
                    else ActivityLog.EventType.REJECTED_CLEARANCE
                ),
                user=user,
                faculty=clearance_request.faculty,
                requirement=clearance_request.requirement
            )

            updated_requests.append({
                "id": str(clearance_request.id),
                "requestId": clearance_request.request_id,
                "status": _to_request_status(clearance_request.status),
                "oldStatus": _to_request_status(old_status)
            })

    return JsonResponse({
        "success": True,
        "message": f"Successfully {action}d {len(updated_requests)} clearance request(s)",
        "updated_requests": updated_requests
    })

def approver_assistant_list_api(request):
    return JsonResponse({"items": []})

@csrf_exempt
def approver_activity_logs_api(request):
    if request.method == "POST":
        user = _get_authenticated_user(request)
        if not user:
            return JsonResponse({"detail": "Authentication required"}, status=401)

        data, jerr = _parse_json_body(request)
        if jerr:
            return jerr
        if data is None:
            return JsonResponse({"detail": "Invalid JSON"}, status=400)

        event_type = (data.get("event_type") or "").strip()
        details = data.get("details")
        if details is None:
            details = []

        if not event_type:
            return JsonResponse({"detail": "event_type is required"}, status=400)
        if event_type not in {c[0] for c in ActivityLog.EventType.choices}:
            return JsonResponse({"detail": "Invalid event_type"}, status=400)
        if not isinstance(details, list):
            return JsonResponse({"detail": "details must be a list"}, status=400)

        user_role = (data.get("user_role") or "").strip() or None

        obj = ActivityLog.objects.create(
            event_type=event_type,
            user=user,
            user_role=user_role,
            details=[str(x) for x in details if x is not None and str(x).strip()],
        )

        return JsonResponse(
            {
                "id": str(obj.id),
                "event_type": obj.event_type,
                "details": list(obj.details or []),
                "created_at": obj.created_at.isoformat() if obj.created_at else None,
            },
            status=201,
        )

    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    user = _get_authenticated_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication required"}, status=401)

    q = (request.GET.get("query") or "").strip().lower()
    page = int(request.GET.get("page") or 1)
    page_size = int(request.GET.get("pageSize") or 40)

    # Get activity logs related to this approver
    qs = ActivityLog.objects.select_related("user", "faculty", "requirement").filter(
        user=user
    )
    if q:
        qs = qs.filter(
            models.Q(event_type__icontains=q)
            | models.Q(approver_department__icontains=q)
            | models.Q(university_id__icontains=q)
            | models.Q(request_id__icontains=q)
            | models.Q(user__email__icontains=q)
            | models.Q(user__first_name__icontains=q)
            | models.Q(user__last_name__icontains=q)
        )

    total = qs.count()
    start = max(0, (page - 1) * page_size)
    logs = qs.order_by("-created_at", "pk")[start : start + page_size]

    items = []
    for log in logs:
        dt = timezone.localtime(log.created_at)
        title = str(log.event_type)
        if log.approver_department:
            title = f"{title} - {log.approver_department}"
        description = ""
        if log.request_id:
            description = f"Request: {log.request_id}"
        items.append(
            {
                "id": str(log.id),
                "dateLabel": dt.strftime("%m/%d/%Y"),
                "timeLabel": _format_time_label(dt),
                "variant": log.event_type,
                "title": title,
                "description": description,
                "firstName": (log.user.first_name if log.user else ""),
                "lastName": (log.user.last_name if log.user else ""),
            }
        )
    return JsonResponse({"items": items, "total": total})

def approver_notifications_api(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    user = _get_authenticated_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication required"}, status=401)

    notifications = Notification.objects.filter(user=user).order_by("-created_at", "-id")
    items = []
    for n in notifications:
        items.append(
            {
                "id": str(n.id),
                "title": n.title or "",
                "body": n.body or "",
                "status": n.status,
                "is_read": bool(n.is_read),
            }
        )
    return JsonResponse({"items": items})

def approver_archived_clearance_api(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)
    
    user = _get_authenticated_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication required"}, status=401)
    
    archived_timelines = ClearanceTimeline.objects.filter(archive_date__isnull=False).order_by("-archive_date")

    items = []
    for timeline in archived_timelines:
        if not _approver_scoped_archived_clearances(user, timeline).exists():
            continue
        start_year = str(timeline.academic_year_start or "")
        end_year = str(timeline.academic_year_end or "")
        items.append({
            "id": str(timeline.id),
            "name": timeline.name or _clearance_timeline_name(timeline.academic_year_start, timeline.academic_year_end, timeline.term),
            "academicYear": f"{start_year}-{end_year}",
            "semester": _term_to_label(timeline.term),
            "clearancePeriodStart": timeline.clearance_start_date.strftime("%m/%d/%Y"),
            "clearancePeriodEnd": timeline.clearance_end_date.strftime("%m/%d/%Y"),
            "lastUpdated": timeline.updated_at.strftime("%B %d, %Y, %H:%M %p"),
            "archivedDate": timeline.archive_date.strftime("%B %d, %Y, %H:%M %p"),
        })
    
    return JsonResponse({"items": items})

def approver_view_clearance_api(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    user = _get_authenticated_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication required"}, status=401)

    timeline_id = (request.GET.get("timelineId") or request.GET.get("timeline_id") or "").strip()
    status_filter = (request.GET.get("status") or "").strip().upper()

    if not timeline_id:
        return JsonResponse({"detail": "Missing timelineId"}, status=400)

    timeline = ClearanceTimeline.objects.filter(id=timeline_id, archive_date__isnull=False).first()
    if not timeline:
        return JsonResponse({"detail": "Archived timeline not found"}, status=404)

    items = [
        _serialize_archived_faculty_item(archived)
        for archived in _approver_scoped_archived_clearances(user, timeline)
    ]
    if status_filter in ["COMPLETED", "INCOMPLETE"]:
        items = [item for item in items if item.get("status") == status_filter]
    return JsonResponse({"items": items})


def approver_archived_individual_api(request):
    if request.method not in {"GET", "POST"}:
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    user = _get_authenticated_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication required"}, status=401)

    timeline_id = (request.GET.get("timelineId") or request.GET.get("timeline_id") or "").strip()
    archived_id = (request.GET.get("archivedId") or request.GET.get("id") or "").strip()

    if not timeline_id or not archived_id:
        return JsonResponse({"detail": "Missing timelineId or archivedId"}, status=400)

    timeline = ClearanceTimeline.objects.filter(id=timeline_id, archive_date__isnull=False).first()
    if not timeline:
        return JsonResponse({"detail": "Archived timeline not found"}, status=404)

    if request.method == "POST":
        try:
            data = json.loads(request.body.decode("utf-8") or "{}")
        except Exception:
            return JsonResponse({"detail": "Invalid JSON"}, status=400)

        request_id = (data.get("request_id") or "").strip()
        action = (data.get("action") or "").strip().lower()
        remarks = data.get("remarks", "")

        if not request_id or action not in ["approve", "reject"]:
            return JsonResponse({"detail": "Invalid request data"}, status=400)

        try:
            clearance_request = ClearanceRequest.objects.select_related("faculty", "requirement").get(
                request_id=request_id,
                clearance_timeline=timeline,
            )
        except ClearanceRequest.DoesNotExist:
            return JsonResponse({"detail": "Clearance request not found"}, status=404)

        if not _can_approver_access_request(user, clearance_request):
            return JsonResponse({"detail": "Permission denied"}, status=403)

        with transaction.atomic():
            clearance_request.status = (
                ClearanceRequest.Status.APPROVED if action == "approve"
                else ClearanceRequest.Status.REJECTED
            )
            clearance_request.approved_by = user
            clearance_request.approved_date = timezone.now()
            clearance_request.remarks = remarks
            clearance_request.save(update_fields=["status", "approved_by", "approved_date", "remarks"])

            ActivityLog.objects.create(
                event_type=(
                    ActivityLog.EventType.APPROVED_CLEARANCE if action == "approve"
                    else ActivityLog.EventType.REJECTED_CLEARANCE
                ),
                user=user,
                faculty=clearance_request.faculty,
                requirement=clearance_request.requirement,
            )

            _archive_clearance_timeline_records(timeline)

        archived = _approver_scoped_archived_clearances(user, timeline).filter(faculty=clearance_request.faculty).first()
        return JsonResponse({
            "success": True,
            "message": f"Clearance request {action}d successfully",
            "status": _to_request_status(clearance_request.status),
            "archivedId": str(archived.id) if archived else None,
        })

    archived = _approver_scoped_archived_clearances(user, timeline).filter(id=archived_id).first()
    if not archived:
        return JsonResponse({"detail": "Archived clearance not found"}, status=404)

    faculty = archived.faculty
    faculty_user = getattr(faculty, "user", None)
    requests = _approver_archived_requests_for_archived_clearance(user, archived)

    return JsonResponse({
        "timeline": {
            "id": str(timeline.id),
            "name": timeline.name or _clearance_timeline_name(timeline.academic_year_start, timeline.academic_year_end, timeline.term),
        },
        "item": {
            "id": str(archived.id),
            "employeeId": getattr(faculty, "employee_id", "") or "",
            "schoolId": getattr(faculty, "employee_id", "") or "",
            "name": _archived_faculty_display_name(faculty),
            "fullName": _archived_faculty_display_name(faculty),
            "schoolEmail": getattr(faculty_user, "email", "") or "",
            "college": getattr(getattr(faculty, "college", None), "name", "") or "",
            "department": getattr(getattr(faculty, "department", None), "name", "") or "",
            "facultyType": getattr(faculty, "faculty_type", "") or "",
            "status": "approved" if archived.status == ArchivedClearance.Status.COMPLETED else "pending",
            "missingApproval": (archived.clearance_data or {}).get("missing_approval", ""),
            "requests": requests,
        },
    })


def assistant_approver_archived_individual_api(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    user = _get_authenticated_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication required"}, status=401)

    timeline_id = (request.GET.get("timelineId") or request.GET.get("timeline_id") or "").strip()
    archived_id = (request.GET.get("archivedId") or request.GET.get("id") or "").strip()

    if not timeline_id or not archived_id:
        return JsonResponse({"detail": "Missing timelineId or archivedId"}, status=400)

    timeline = ClearanceTimeline.objects.filter(id=timeline_id, archive_date__isnull=False).first()
    if not timeline:
        return JsonResponse({"detail": "Archived timeline not found"}, status=404)

    archived = _assistant_scoped_archived_clearances(user, timeline).filter(id=archived_id).first()
    if not archived:
        return JsonResponse({"detail": "Archived clearance not found"}, status=404)

    faculty = archived.faculty
    faculty_user = getattr(faculty, "user", None)
    requests = _assistant_archived_requests_for_archived_clearance(archived)

    return JsonResponse({
        "timeline": {
            "id": str(timeline.id),
            "name": timeline.name or _clearance_timeline_name(timeline.academic_year_start, timeline.academic_year_end, timeline.term),
        },
        "item": {
            "id": str(archived.id),
            "employeeId": getattr(faculty, "employee_id", "") or "",
            "schoolId": getattr(faculty, "employee_id", "") or "",
            "name": _archived_faculty_display_name(faculty),
            "fullName": _archived_faculty_display_name(faculty),
            "schoolEmail": getattr(faculty_user, "email", "") or "",
            "college": getattr(getattr(faculty, "college", None), "name", "") or "",
            "department": getattr(getattr(faculty, "department", None), "name", "") or "",
            "facultyType": getattr(faculty, "faculty_type", "") or "",
            "status": "approved" if archived.status == ArchivedClearance.Status.COMPLETED else "pending",
            "missingApproval": (archived.clearance_data or {}).get("missing_approval", ""),
            "requests": requests,
        },
    })

@csrf_exempt
@approver_required
def approver_individual_approval_api(request):
    user = _get_authenticated_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication required"}, status=401)

    if request.method == "GET":
        # Get individual clearance request details
        request_id = request.GET.get("request_id")
        if not request_id:
            return JsonResponse({"detail": "Request ID required"}, status=400)
        
        try:
            clearance_request = ClearanceRequest.objects.get(
                request_id=request_id,
                clearance_timeline=_get_active_timeline()
            )
        except ClearanceRequest.DoesNotExist:
            return JsonResponse({"detail": "Clearance request not found"}, status=404)
        
        # Validate approver has permission to view this request
        if not _can_approver_access_request(user, clearance_request):
            return JsonResponse({"detail": "Permission denied"}, status=403)
        
        return JsonResponse(_serialize_assistant_individual_request(clearance_request))
    
    elif request.method == "POST":
        # Update clearance request status (approve/reject)
        try:
            data = json.loads(request.body.decode("utf-8") or "{}")
        except Exception:
            return JsonResponse({"detail": "Invalid JSON"}, status=400)
        
        request_id = data.get("request_id")
        action = data.get("action")  # "approve" or "reject"
        remarks = data.get("remarks", "")
        
        if not request_id or action not in ["approve", "reject"]:
            return JsonResponse({"detail": "Invalid request data"}, status=400)
        
        try:
            clearance_request = ClearanceRequest.objects.get(
                request_id=request_id,
                clearance_timeline=_get_active_timeline()
            )
        except ClearanceRequest.DoesNotExist:
            return JsonResponse({"detail": "Clearance request not found"}, status=404)
        
        # Validate approver has permission to approve this request
        if not _can_approver_access_request(user, clearance_request):
            return JsonResponse({"detail": "Permission denied"}, status=403)
        
        # Check if request is already processed
        if clearance_request.status in [ClearanceRequest.Status.APPROVED, ClearanceRequest.Status.REJECTED]:
            return JsonResponse({
                "detail": "This request has already been processed and cannot be modified",
                "current_status": _to_request_status(clearance_request.status)
            }, status=400)
        
        # Update the clearance request
        with transaction.atomic():
            clearance_request.status = (
                ClearanceRequest.Status.APPROVED if action == "approve" 
                else ClearanceRequest.Status.REJECTED
            )
            clearance_request.approved_by = user
            clearance_request.approved_date = timezone.now()
            clearance_request.remarks = remarks
            clearance_request.save()
            
            # Log the activity
            ActivityLog.objects.create(
                event_type=(
                    ActivityLog.EventType.APPROVED_CLEARANCE if action == "approve"
                    else ActivityLog.EventType.REJECTED_CLEARANCE
                ),
                user=user,
                faculty=clearance_request.faculty,
                requirement=clearance_request.requirement
            )
        
        return JsonResponse({
            "success": True,
            "message": f"Clearance request {action}d successfully",
            "status": _to_request_status(clearance_request.status)
        })
    
    else:
        return JsonResponse({"detail": "Method not allowed"}, status=405)

# Assistant Approver endpoints
@assistant_required
def assistant_approver_dashboard_api(request):
    return JsonResponse({"pendingRequests": [], "pendingCount": 0})

def assistant_approver_requirement_list_api(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    user = _get_authenticated_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication required"}, status=401)

    timeline = _get_active_timeline()
    if not timeline:
        return JsonResponse({"items": []})

    items = [
        _serialize_assistant_requirement(requirement)
        for requirement in _assistant_requirement_queryset(user, timeline)
    ]
    return JsonResponse({"items": items})

def assistant_approver_clearance_api(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    user = _get_authenticated_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication required"}, status=401)

    timeline = _get_active_timeline()
    if not timeline:
        return JsonResponse({"items": []})

    items = [
        _serialize_clearance_request_item(req)
        for req in _assistant_clearance_queryset(user, timeline)
    ]
    return JsonResponse({"items": items})

def assistant_approver_notifications_api(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    user = _get_authenticated_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication required"}, status=401)

    notifications = Notification.objects.filter(user=user).order_by("-created_at", "-id")
    items = []
    for n in notifications:
        items.append(
            {
                "id": str(n.id),
                "title": n.title or "",
                "body": n.body or "",
                "status": n.status,
                "is_read": bool(n.is_read),
            }
        )
    return JsonResponse({"items": items})

def assistant_approver_archived_clearance_api(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)
    
    user = _get_authenticated_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication required"}, status=401)
    
    archived_timelines = ClearanceTimeline.objects.filter(archive_date__isnull=False).order_by("-archive_date")

    items = []
    for timeline in archived_timelines:
        if not _assistant_scoped_archived_clearances(user, timeline).exists():
            continue
        start_year = str(timeline.academic_year_start or "")
        end_year = str(timeline.academic_year_end or "")
        items.append({
            "id": str(timeline.id),
            "name": timeline.name or _clearance_timeline_name(timeline.academic_year_start, timeline.academic_year_end, timeline.term),
            "academicYear": f"{start_year}-{end_year}",
            "semester": _term_to_label(timeline.term),
            "clearancePeriodStart": timeline.clearance_start_date.strftime("%m/%d/%Y"),
            "clearancePeriodEnd": timeline.clearance_end_date.strftime("%m/%d/%Y"),
            "lastUpdated": timeline.updated_at.strftime("%B %d, %Y, %H:%M %p"),
            "archivedDate": timeline.archive_date.strftime("%B %d, %Y, %H:%M %p"),
        })
    
    return JsonResponse({"items": items})


@csrf_exempt
def assistant_approver_individual_approval_api(request):
    user = _get_authenticated_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication required"}, status=401)

    timeline = _get_active_timeline()
    if not timeline:
        return JsonResponse({"detail": "No active clearance timeline"}, status=404)

    request_id = (request.GET.get("requestId") or request.GET.get("id") or "").strip()
    if request.method in {"POST", "PATCH"}:
        data, parse_err = _parse_json_body(request)
        if parse_err:
            return parse_err
        if not isinstance(data, dict):
            return JsonResponse({"detail": "Invalid payload"}, status=400)
        request_id = str(data.get("id") or data.get("requestId") or request_id).strip()

    if not request_id:
        return JsonResponse({"detail": "Missing requestId"}, status=400)

    req = _assistant_request_by_identifier(user, timeline, request_id)
    if not req:
        return JsonResponse({"detail": "Clearance request not found"}, status=404)

    if request.method == "GET":
        return JsonResponse(_serialize_assistant_individual_request(req))

    if request.method not in {"POST", "PATCH"}:
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    action = str(data.get("action") or "").strip().lower()
    remarks = str(data.get("remarks") or "").strip()
    if action not in {"approve", "reject"}:
        return JsonResponse({"detail": "Invalid action"}, status=400)
    if not remarks:
        return JsonResponse({"detail": "Remarks are required"}, status=400)

    req.status = ClearanceRequest.Status.APPROVED if action == "approve" else ClearanceRequest.Status.REJECTED
    req.remarks = remarks
    req.approved_by = user
    req.approved_date = timezone.now()
    req.save(update_fields=["status", "remarks", "approved_by", "approved_date"])

    ActivityLog.objects.create(
        event_type=(
            ActivityLog.EventType.APPROVED_CLEARANCE if action == "approve"
            else ActivityLog.EventType.REJECTED_CLEARANCE
        ),
        user=user,
        faculty=req.faculty,
        requirement=req.requirement,
    )

    if req.clearance_timeline and req.clearance_timeline.archive_date:
        _archive_clearance_timeline_records(req.clearance_timeline)

    return JsonResponse({"ok": True, **_serialize_assistant_individual_request(req)})

def assistant_approver_view_clearance_api(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    user = _get_authenticated_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication required"}, status=401)

    timeline_id = (request.GET.get("timelineId") or request.GET.get("timeline_id") or "").strip()
    status_filter = (request.GET.get("status") or "").strip().upper()

    if not timeline_id:
        return JsonResponse({"detail": "Missing timelineId"}, status=400)

    timeline = ClearanceTimeline.objects.filter(id=timeline_id, archive_date__isnull=False).first()
    if not timeline:
        return JsonResponse({"detail": "Archived timeline not found"}, status=404)

    items = [
        _serialize_archived_faculty_item(archived)
        for archived in _assistant_scoped_archived_clearances(user, timeline)
    ]
    if status_filter in ["COMPLETED", "INCOMPLETE"]:
        items = [item for item in items if item.get("status") == status_filter]
    return JsonResponse({"items": items})


@csrf_exempt
def assistant_approver_archived_individual_api(request):
    if request.method not in {"GET", "POST"}:
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    user = _get_authenticated_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication required"}, status=401)

    timeline_id = (request.GET.get("timelineId") or request.GET.get("timeline_id") or "").strip()
    archived_id = (request.GET.get("archivedId") or request.GET.get("id") or "").strip()

    if not timeline_id or not archived_id:
        return JsonResponse({"detail": "Missing timelineId or archivedId"}, status=400)

    timeline = ClearanceTimeline.objects.filter(id=timeline_id, archive_date__isnull=False).first()
    if not timeline:
        return JsonResponse({"detail": "Archived timeline not found"}, status=404)

    if request.method == "POST":
        try:
            data = json.loads(request.body.decode("utf-8") or "{}")
        except Exception:
            return JsonResponse({"detail": "Invalid JSON"}, status=400)

        request_id = (data.get("request_id") or data.get("requestId") or "").strip()
        action = (data.get("action") or "").strip().lower()
        remarks = str(data.get("remarks") or "").strip()

        if not request_id or action not in ["approve", "reject"]:
            return JsonResponse({"detail": "Invalid request data"}, status=400)
        if not remarks:
            return JsonResponse({"detail": "Remarks are required"}, status=400)

        req = _assistant_request_by_identifier(user, timeline, request_id)
        if not req:
            return JsonResponse({"detail": "Clearance request not found"}, status=404)

        with transaction.atomic():
            req.status = ClearanceRequest.Status.APPROVED if action == "approve" else ClearanceRequest.Status.REJECTED
            req.remarks = remarks
            req.approved_by = user
            req.approved_date = timezone.now()
            req.save(update_fields=["status", "remarks", "approved_by", "approved_date"])

            ActivityLog.objects.create(
                event_type=(
                    ActivityLog.EventType.APPROVED_CLEARANCE if action == "approve"
                    else ActivityLog.EventType.REJECTED_CLEARANCE
                ),
                user=user,
                faculty=req.faculty,
                requirement=req.requirement,
            )

            _archive_clearance_timeline_records(timeline)

        archived = _assistant_scoped_archived_clearances(user, timeline).filter(faculty=req.faculty).first()
        return JsonResponse({
            "success": True,
            "message": f"Clearance request {action}d successfully",
            "status": _to_request_status(req.status),
            "archivedId": str(archived.id) if archived else None,
        })

    archived = _assistant_scoped_archived_clearances(user, timeline).filter(id=archived_id).first()
    if not archived:
        return JsonResponse({"detail": "Archived clearance not found"}, status=404)

    faculty = archived.faculty
    faculty_user = getattr(faculty, "user", None)
    requests = _assistant_archived_requests_for_archived_clearance(archived)

    return JsonResponse({
        "timeline": {
            "id": str(timeline.id),
            "name": timeline.name or _clearance_timeline_name(timeline.academic_year_start, timeline.academic_year_end, timeline.term),
        },
        "item": {
            "id": str(archived.id),
            "employeeId": getattr(faculty, "employee_id", "") or "",
            "schoolId": getattr(faculty, "employee_id", "") or "",
            "name": _archived_faculty_display_name(faculty),
            "fullName": _archived_faculty_display_name(faculty),
            "schoolEmail": getattr(faculty_user, "email", "") or "",
            "college": getattr(getattr(faculty, "college", None), "name", "") or "",
            "department": getattr(getattr(faculty, "department", None), "name", "") or "",
            "facultyType": getattr(faculty, "faculty_type", "") or "",
            "status": "approved" if archived.status == ArchivedClearance.Status.COMPLETED else "pending",
            "missingApproval": (archived.clearance_data or {}).get("missing_approval", ""),
            "requests": requests,
        },
    })

# Additional OVPHE endpoints
def ovphe_tools_api(request):
    return JsonResponse({"tools": []})

def ovphe_archived_clearance_api(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)
    
    user = _get_authenticated_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication required"}, status=401)
    
    # Get archived timelines (where archive_date is not null)
    archived_timelines = ClearanceTimeline.objects.filter(archive_date__isnull=False).order_by("-archive_date")
    
    items = []
    for timeline in archived_timelines:
        start_year = str(timeline.academic_year_start or "")
        end_year = str(timeline.academic_year_end or "")
        items.append({
            "id": str(timeline.id),
            "name": timeline.name or _clearance_timeline_name(timeline.academic_year_start, timeline.academic_year_end, timeline.term),
            "academicYear": f"{start_year}-{end_year}",
            "semester": _term_to_label(timeline.term),
            "clearancePeriodStart": timeline.clearance_start_date.strftime("%m/%d/%Y"),
            "clearancePeriodEnd": timeline.clearance_end_date.strftime("%m/%d/%Y"),
            "lastUpdated": timeline.updated_at.strftime("%B %d, %Y, %H:%M %p"),
            "archivedDate": timeline.archive_date.strftime("%B %d, %Y, %H:%M %p"),
        })
    
    return JsonResponse({"items": items})

def ovphe_view_clearance_api(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)
    
    user = _get_authenticated_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication required"}, status=401)
    
    timeline_id = (request.GET.get("timelineId") or request.GET.get("timeline_id") or "").strip()
    status_filter = (request.GET.get("status") or "").strip().upper()
    
    if not timeline_id:
        return JsonResponse({"detail": "Missing timelineId"}, status=400)
    
    timeline = ClearanceTimeline.objects.filter(id=timeline_id, archive_date__isnull=False).first()
    if not timeline:
        return JsonResponse({"detail": "Archived timeline not found"}, status=404)

    items = _archived_clearance_items_for_timeline(timeline, status_filter)

    return JsonResponse({"items": items})

# Additional CISO endpoints
def ciso_tools_api(request):
    return JsonResponse({"tools": []})

@csrf_exempt
def ciso_college_office_configuration_api(request):
    if request.method == "GET":
        admin, err = _require_ciso_admin_user(request)
        if err:
            return err
        
        # Get colleges with their departments
        colleges = College.objects.filter(is_active=True).prefetch_related('department_set').order_by('name')
        colleges_data = []
        for college in colleges:
            departments = [{'id': dept.id, 'name': dept.name} for dept in college.department_set.filter(is_active=True).order_by('name')]
            colleges_data.append({
                'id': college.id,
                'name': college.name,
                'abbreviation': college.abbreviation or '',
                'departments': departments
            })
        
        # Get offices
        offices = Office.objects.filter(is_active=True).exclude(
            models.Q(name__iexact="Department Chair") |
            models.Q(name__icontains="Department Chair") |
            models.Q(name__iexact="College Dean") |
            models.Q(name__icontains="College Dean") |
            models.Q(name__iexact="Dean") |
            models.Q(name__icontains="Dean")
        ).order_by('name')
        offices_data = [{'id': office.id, 'name': office.name, 'abbreviation': office.abbreviation or ''} for office in offices]
        
        # Get approver flow configuration
        timeline_id = request.GET.get('timeline_id')
        config = None
        if timeline_id:
            try:
                timeline = ClearanceTimeline.objects.get(id=timeline_id)
                config = ApproverFlowConfig.objects.filter(clearance_timeline=timeline).order_by("-updated_at", "pk").first()
            except ClearanceTimeline.DoesNotExist:
                return JsonResponse({"detail": "Timeline not found"}, status=404)

        if not config and not timeline_id:
            config = ApproverFlowConfig.objects.filter(clearance_timeline__isnull=True).order_by("-updated_at", "pk").first()
        
        flow_steps = []
        if config:
            flow_steps = ApproverFlowStep.objects.filter(config=config).order_by('order').prefetch_related('colleges')
            for step in flow_steps:
                colleges_list = [{'id': college.id, 'name': college.name} for college in step.colleges.all()]
                flow_steps.append({
                    'id': step.id,
                    'category': step.category,
                    'order': step.order,
                    'office': {'id': step.office.id, 'name': step.office.name} if step.office else None,
                    'collegeIds': [str(c.id) for c in step.colleges.all()]
                })
        
        configuration = {
            'colleges': colleges_data,
            'offices': offices_data,
            'approverFlow': flow_steps
        }
        
        return JsonResponse({"configuration": configuration})
    
    elif request.method == "POST":
        admin, err = _require_ciso_admin_user(request)
        if err:
            return err
        
        try:
            data = json.loads(request.body)
            timeline_id = data.get('timelineId')
            if not timeline_id:
                return JsonResponse({"detail": "Timeline ID is required"}, status=400)
            
            try:
                timeline = ClearanceTimeline.objects.get(id=timeline_id)
                if timeline.is_active:
                    return JsonResponse({"detail": "Cannot save configuration for active timeline"}, status=400)
            except ClearanceTimeline.DoesNotExist:
                return JsonResponse({"detail": "Timeline not found"}, status=400)
            
            config, created = ApproverFlowConfig.objects.get_or_create(
                clearance_timeline_id=timeline_id,
                defaults={'created_by': admin}
            )
            if not created:
                config.updated_by = admin
                config.save()
            
            config.steps.all().delete()
            approver_flow_data = data.get('approverFlow', [])
            for i, step_data in enumerate(approver_flow_data):
                step = ApproverFlowStep.objects.create(
                    config=config,
                    category=step_data.get('category', ''),
                    order=i,
                    office_id=step_data.get('officeId') if step_data.get('officeId') else None,
                )
                # Add college associations if provided
                college_ids = step_data.get('collegeIds', [])
                if college_ids:
                    step.colleges.set(College.objects.filter(pk__in=college_ids, is_active=True))
            
            return JsonResponse({"message": "Configuration saved successfully"})
        except json.JSONDecodeError:
            return JsonResponse({"detail": "Invalid JSON"}, status=400)
        except Exception as e:
            return JsonResponse({"detail": str(e)}, status=500)
    
    else:
        return _json_method_not_allowed()

def _get_active_ciso_user(request):
    user, _ = _require_ciso_admin_user(request)
    return user


@csrf_exempt
def ciso_clearance_timeline_api(request):
    """Return clearance timelines for CISO semester selection.

    Response shape is aligned with the CISO Faculty Data Dump page, which
    expects either a "timelines" or "items" array of objects with at least:
    - id
    - academicYearStart / academicYearEnd
    - term (human-readable label)
    - clearanceStartDate / clearanceEndDate (ISO strings, optional)
    - isActive (bool)
    """

    if request.method == "GET":
        user = _get_authenticated_user(request)
        if not user:
            return JsonResponse({"detail": "Authentication required"}, status=401)

        if not user.userrole_set.filter(role__name="CISO", is_active=True).exists():
            return JsonResponse({"detail": "Forbidden"}, status=403)

        timelines = (
            ClearanceTimeline.objects.filter(archive_date__isnull=True)
            .order_by("-is_active", "-academic_year_start", "-academic_year_end", "-id")
        )

        items: list[dict] = []
        for t in timelines:
            items.append(
                {
                    "id": str(t.id),
                    "name": t.name or _clearance_timeline_name(t.academic_year_start, t.academic_year_end, t.term),
                    "academicYearStart": str(t.academic_year_start or ""),
                    "academicYearEnd": str(t.academic_year_end or ""),
                    "term": _term_to_label(t.term),
                    "clearanceStartDate": t.clearance_start_date.date().isoformat() if t.clearance_start_date else "",
                    "clearanceEndDate": t.clearance_end_date.date().isoformat() if t.clearance_end_date else "",
                    "setAsActive": bool(t.is_active),
                    "isActive": bool(t.is_active),
                    "createdAt": _format_timestamp(t.created_at),
                }
            )

        return JsonResponse({"items": items, "timelines": items})

    if request.method not in {"POST", "PUT", "DELETE"}:
        return JsonResponse({"detail": "Method not allowed"}, status=405)
    """Handle CRUD operations for clearance timelines for CISO."""

    user = _get_authenticated_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication required"}, status=401)

    if not user.userrole_set.filter(role__name="CISO", is_active=True).exists():
        return JsonResponse({"detail": "Forbidden"}, status=403)

    payload = _json_body(request)
    if payload is None:
        return JsonResponse({"detail": "Invalid JSON body"}, status=400)

    if request.method == "DELETE":
        timeline_id = payload.get("id")
        action = (payload.get("action") or "archive").strip().lower()
        if not timeline_id:
            return JsonResponse({"detail": "Missing id"}, status=400)

        timeline = ClearanceTimeline.objects.filter(id=timeline_id, archive_date__isnull=True).first()
        if not timeline:
            return JsonResponse({"detail": "Timeline not found"}, status=404)

        if action == "delete":
            return JsonResponse({"detail": "Delete is not allowed for clearance timelines"}, status=405)

        with transaction.atomic():
            timeline.archive_date = timezone.now()
            timeline.is_active = False
            timeline.save(update_fields=["archive_date", "is_active", "updated_at"])
            _archive_clearance_timeline_records(timeline)

        return JsonResponse({"ok": True, "archived": True})

    start_year = _parse_int(payload.get("academicYearStart") or payload.get("startYear"))
    end_year = _parse_int(payload.get("academicYearEnd") or payload.get("endYear")) or ((start_year + 1) if start_year is not None else None)
    term = _label_to_term(payload.get("term") or payload.get("semester"))
    clearance_start_date = _parse_iso_date(payload.get("clearanceStartDate") or payload.get("semesterStartDate"))
    clearance_end_date = _parse_iso_date(payload.get("clearanceEndDate") or payload.get("semesterEndDate"))
    set_as_active = bool(payload.get("setAsActive"))

    if start_year is None or end_year is None or term is None or clearance_start_date is None or clearance_end_date is None:
        return JsonResponse({"detail": "Missing or invalid timeline fields"}, status=400)

    if request.method == "POST":
        if set_as_active:
            ClearanceTimeline.objects.filter(is_active=True).update(is_active=False)

        timeline = ClearanceTimeline.objects.create(
            name=_clearance_timeline_name(start_year, end_year, term),
            academic_year_start=start_year,
            academic_year_end=end_year,
            term=term,
            clearance_start_date=clearance_start_date,
            clearance_end_date=clearance_end_date,
            created_by=user,
            is_active=set_as_active,
        )
        return JsonResponse({"id": str(timeline.id)}, status=201)

    timeline_id = payload.get("id")
    if not timeline_id:
        return JsonResponse({"detail": "Missing id"}, status=400)

    timeline = ClearanceTimeline.objects.filter(id=timeline_id).first()
    if not timeline:
        return JsonResponse({"detail": "Timeline not found"}, status=404)

    if set_as_active:
        ClearanceTimeline.objects.exclude(id=timeline.id).filter(is_active=True).update(is_active=False)

    timeline.name = _clearance_timeline_name(start_year, end_year, term)
    timeline.academic_year_start = start_year
    timeline.academic_year_end = end_year
    timeline.term = term
    timeline.clearance_start_date = clearance_start_date
    timeline.clearance_end_date = clearance_end_date
    timeline.is_active = set_as_active
    timeline.save(update_fields=[
        "name",
        "academic_year_start",
        "academic_year_end",
        "term",
        "clearance_start_date",
        "clearance_end_date",
        "is_active",
        "updated_at",
    ])

    return JsonResponse({"id": str(timeline.id)})

def ciso_archived_clearance_api(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)
    
    user = _get_authenticated_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication required"}, status=401)
    
    # Get archived timelines (where archive_date is not null)
    archived_timelines = ClearanceTimeline.objects.filter(archive_date__isnull=False).order_by("-archive_date")
    
    items = []
    for timeline in archived_timelines:
        start_year = str(timeline.academic_year_start or "")
        end_year = str(timeline.academic_year_end or "")
        items.append({
            "id": str(timeline.id),
            "name": timeline.name or _clearance_timeline_name(timeline.academic_year_start, timeline.academic_year_end, timeline.term),
            "academicYear": f"{start_year}-{end_year}",
            "semester": _term_to_label(timeline.term),
            "clearancePeriodStart": timeline.clearance_start_date.strftime("%m/%d/%Y"),
            "clearancePeriodEnd": timeline.clearance_end_date.strftime("%m/%d/%Y"),
            "lastUpdated": timeline.updated_at.strftime("%B %d, %Y, %H:%M %p"),
            "archivedDate": timeline.archive_date.strftime("%B %d, %Y, %H:%M %p"),
        })
    
    return JsonResponse({"items": items})

def ciso_view_clearance_api(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    user = _get_authenticated_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication required"}, status=401)

    timeline_id = (request.GET.get("timelineId") or request.GET.get("timeline_id") or "").strip()
    status_filter = (request.GET.get("status") or "").strip().upper()

    if not timeline_id:
        return JsonResponse({"detail": "Missing timelineId"}, status=400)

    timeline = ClearanceTimeline.objects.filter(id=timeline_id, archive_date__isnull=False).first()
    if not timeline:
        return JsonResponse({"detail": "Archived timeline not found"}, status=404)

    items = _archived_clearance_items_for_timeline(timeline, status_filter)
    return JsonResponse({"items": items})


def ciso_archived_individual_api(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    user = _get_authenticated_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication required"}, status=401)

    if not user.userrole_set.filter(role__name='CISO', is_active=True).exists():
        return JsonResponse({"detail": "Forbidden"}, status=403)

    timeline_id = (request.GET.get("timelineId") or request.GET.get("timeline_id") or "").strip()
    archived_id = (request.GET.get("archivedId") or request.GET.get("archived_id") or "").strip()

    if not timeline_id or not archived_id:
        return JsonResponse({"detail": "Missing timelineId or archivedId"}, status=400)

    timeline = ClearanceTimeline.objects.filter(id=timeline_id, archive_date__isnull=False).first()
    if not timeline:
        return JsonResponse({"detail": "Archived timeline not found"}, status=404)

    _ensure_archived_timeline_records(timeline)

    archived = ArchivedClearance.objects.select_related(
        "faculty",
        "faculty__user",
        "faculty__college",
        "faculty__department",
    ).filter(id=archived_id, clearance_timeline=timeline).first()
    if not archived:
        return JsonResponse({"detail": "Archived clearance not found"}, status=404)

    faculty = archived.faculty
    faculty_user = getattr(faculty, "user", None)
    archived_data = archived.clearance_data or {}
    archived_requests = archived_data.get("requests") or []

    requests = []
    for index, req in enumerate(archived_requests, start=1):
        requests.append({
            "id": req.get("id") or index,
            "requestId": req.get("requestId") or "",
            "title": req.get("title") or "",
            "description": req.get("description") or "",
            "status": req.get("status") or ClearanceRequest.Status.PENDING,
            "submissionNotes": req.get("submissionNotes") or "",
            "submissionLink": req.get("submissionLink") or "",
            "submittedDate": req.get("submittedDate"),
            "approvedDate": req.get("approvedDate"),
            "approvedBy": req.get("approvedBy"),
            "remarks": req.get("remarks") or "",
        })

    return JsonResponse({
        "timeline": {
            "id": str(timeline.id),
            "name": timeline.name or _clearance_timeline_name(timeline.academic_year_start, timeline.academic_year_end, timeline.term),
            "academicYear": f"{timeline.academic_year_start}-{timeline.academic_year_end}",
            "semester": _term_to_label(timeline.term),
            "archivedDate": timeline.archive_date.strftime("%B %d, %Y, %H:%M %p") if timeline.archive_date else None,
        },
        "faculty": {
            "id": str(archived.id),
            "employeeId": getattr(faculty, "employee_id", "") or "",
            "name": _archived_faculty_display_name(faculty),
            "schoolEmail": getattr(faculty_user, "email", "") or "",
            "college": getattr(getattr(faculty, "college", None), "name", "") or "",
            "department": getattr(getattr(faculty, "department", None), "name", "") or "",
            "facultyType": getattr(faculty, "faculty_type", "") or "",
        },
        "clearance": {
            "id": archived.id,
            "academicYear": archived.academic_year,
            "term": archived.semester,
            "status": archived.status,
            "submittedDate": None,
            "completedDate": archived.last_updated.strftime("%Y-%m-%d %H:%M:%S") if archived.last_updated else None,
            "lastUpdated": archived.last_updated.strftime("%Y-%m-%d %H:%M:%S") if archived.last_updated else None,
            "missingApproval": archived_data.get("missing_approval", ""),
            "approvedCount": archived_data.get("approved_count", 0),
            "totalCount": archived_data.get("request_count", len(requests)),
        },
        "requests": requests,
    })

def ciso_archived_faculty_api(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    # Get authenticated CISO user
    user = _get_authenticated_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication required"}, status=401)

    # Check if user has CISO role
    if not user.userrole_set.filter(role__name='CISO', is_active=True).exists():
        return JsonResponse({"detail": "Forbidden"}, status=403)

    # Get archived faculty dumps tied to clearance timelines
    dumps = FacultyDumpArchive.objects.select_related("clearance_timeline").order_by("-created_at", "-id")

    items = []
    for dump in dumps:
        tl = dump.clearance_timeline

        academic_year = (
            f"{dump.academic_year_start} - {dump.academic_year_end}"
            if dump.academic_year_start and dump.academic_year_end
            else ""
        )

        clearance_period = ""
        if tl and tl.clearance_start_date and tl.clearance_end_date:
            clearance_period = f"{tl.clearance_start_date.strftime('%m/%d/%Y')} - {tl.clearance_end_date.strftime('%m/%d/%Y')}"

        # Base filename as stored on disk (for download)
        csv_basename = ""
        if dump.dump_file_path:
            csv_basename = dump.dump_file_path.split("/")[-1]

        # Strip internal prefix "timeline-<id>-<timestamp>-" if present so that
        # the user-facing label only shows the original CSV name.
        original_name = csv_basename
        if csv_basename.startswith("timeline-"):
            parts = csv_basename.split("-", 3)
            if len(parts) == 4:
                original_name = parts[3]

        # Human-friendly display name, e.g. "2025 - 2026 First Semester - Faculty Dump.csv"
        term_label = _term_to_label(dump.term)
        if academic_year and term_label and original_name:
            csv_display_name = f"{academic_year} {term_label} - {original_name}"
        elif original_name:
            csv_display_name = original_name
        else:
            csv_display_name = ""

        items.append(
            {
                "id": str(dump.id),
                "academicYear": academic_year,
                "semester": _term_to_label(dump.term),
                "clearancePeriod": clearance_period,
                "archivedDate": _format_timestamp(dump.created_at),
                "csvFileName": csv_display_name,
                "csvFileSize": dump.dump_file_size or "",
                "totalFaculty": "",  # can be wired to analytics later
                "completedClearances": "",  # optional; not used for pure dumps
                "status": "COMPLETED",
                "facultyId": "",
                "facultyName": "",
                "employeeId": "",
                "csvDumpPath": dump.dump_file_path,
            }
        )

    return JsonResponse({"items": items})

def ciso_archived_faculty_download_api(request, archived_id: int):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    # Get authenticated CISO user
    user = _get_authenticated_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication required"}, status=401)

    # Check if user has CISO role
    if not user.userrole_set.filter(role__name='CISO', is_active=True).exists():
        return JsonResponse({"detail": "Forbidden"}, status=403)

    try:
        dump = FacultyDumpArchive.objects.get(id=archived_id)
    except FacultyDumpArchive.DoesNotExist:
        return JsonResponse({"detail": "Archived faculty dump not found"}, status=404)

    if not dump.dump_file_path:
        return JsonResponse({"detail": "CSV file not available for this archived faculty dump"}, status=404)

    # Try to serve the file
    try:
        import os
        from django.conf import settings
        
        # Construct the full file path
        file_path = os.path.join(settings.MEDIA_ROOT if hasattr(settings, 'MEDIA_ROOT') else '', dump.dump_file_path)
        
        if not os.path.exists(file_path):
            return JsonResponse({"detail": "CSV file not found on server"}, status=404)
        
        # Read and serve the file
        with open(file_path, 'rb') as f:
            response = HttpResponse(f.read(), content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="{dump.dump_file_path.split("/")[-1]}"'
            return response
            
    except Exception as e:
        return JsonResponse({"detail": "Error serving file: {str(e)}"}, status=500)
