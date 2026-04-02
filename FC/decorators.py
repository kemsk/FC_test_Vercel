from django.shortcuts import redirect
from django.urls import reverse
from functools import wraps

# Role mapping based on numeric values
ROLE_MAPPING = {
    1: 'CISO', 
    2: 'OVPHE',
    3: 'APPROVER',
    4: 'ASSISTANT_APPROVER',
    5: 'FACULTY'
}

# Dashboard file paths for each role
ROLE_DASHBOARD_PATHS = {
    1: '/CISO-dashboard',
    2: '/OVPHE-dashboard',
    3: '/approver-dashboard',
    4: '/assistant-approver-dashboard',
    5: '/faculty-dashboard',
}

# Helper functions for role management
def get_role_value_for_user(user):
    """Get the primary role value for a user based on their active roles"""
    user_roles = user.get_active_roles().values_list('role__name', flat=True)
    
    # Priority mapping for users with multiple roles
    role_priority = [
        ('CISO', 1),
        ('OVPHE', 2),
        ('College Admin', 3),
        ('Department Chair', 3),
        ('Office Admin', 3),
        ('Student Assistant', 4),
        ('Faculty', 5)
    ]
    
    for role_name, role_value in role_priority:
        if role_name in user_roles:
            return role_value
    
    return 5  # Default to Faculty

def get_role_value_for_name(role_name):
    """Get role value for a specific role name"""
    role_mapping = {
        'ciso': 1,
        'ovphe': 2,
        'approver': 3,
        'assistant': 4,
        'faculty': 5
    }
    return role_mapping.get(role_name.lower())

def get_role_name_for_value(role_value):
    """Get role display name for role value"""
    return ROLE_MAPPING.get(role_value, 'FACULTY')

def get_user_role_names(user):
    """Get all role names for a user"""
    return list(user.get_active_roles().values_list('role__name', flat=True))

# View folder access mapping
ROLE_VIEW_ACCESS = {
    1: ['ciso'],  # CISO can access ciso folder
    2: ['ovphe'],  # OVPHE can access ovphe folder
    3: ['approver'],  # APPROVER can access approver folder
    4: ['assistant'],  # ASSISTANT_APPROVER can access assistant folder
    5: ['faculty'],  # FACULTY can access faculty folder
}

def login_required(view_func):
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if not request.session.get('user_authenticated'):
            return redirect(reverse('fc:login'))
        return view_func(request, *args, **kwargs)
    return _wrapped_view

def role_required(*allowed_roles):
    """
    Check if user has required role (by numeric value)
    allowed_roles: numeric role values (1-7)
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            if not request.session.get('user_authenticated'):
                return redirect(reverse('fc:login'))
            
            user_role_value = request.session.get('user_role_value')
            if user_role_value not in allowed_roles:
                # Redirect to appropriate dashboard based on role
                return redirect(get_role_dashboard_url(user_role_value))
            
            return view_func(request, *args, **kwargs)
        return _wrapped_view
    return decorator

def view_folder_required(*allowed_folders):
    """
    Check if user can access specific view folder
    allowed_folders: folder names like ['hro', 'ciso', 'ovphe', etc.]
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            if not request.session.get('user_authenticated'):
                return redirect(reverse('fc:login'))
            
            user_role_value = request.session.get('user_role_value')
            user_accessible_folders = ROLE_VIEW_ACCESS.get(user_role_value, [])
            
            # Check if user can access any of the required folders
            if not any(folder in user_accessible_folders for folder in allowed_folders):
                return redirect(get_role_dashboard_url(user_role_value))
            
            return view_func(request, *args, **kwargs)
        return _wrapped_view
    return decorator

def get_role_dashboard_url(role_value):
    """Get the appropriate dashboard URL based on role"""
    return ROLE_DASHBOARD_PATHS.get(role_value, '/pages/faculty/faculty_member_dashboard')

# Specific role decorators using numeric values
def ciso_required(view_func):
    return role_required(1)(view_func)

def ovphe_required(view_func):
    return role_required(2)(view_func)

def approver_required(view_func):
    return role_required(3)(view_func)

def assistant_required(view_func):
    return role_required(4)(view_func)

def faculty_required(view_func):
    return role_required(5)(view_func)

# View folder access decorators
def ciso_views_required(view_func):
    return view_folder_required('ciso')(view_func)

def ovphe_views_required(view_func):
    return view_folder_required('ovphe')(view_func)

def approver_views_required(view_func):
    return view_folder_required('approver')(view_func)

def assistant_views_required(view_func):
    return view_folder_required('assistant')(view_func)

def faculty_views_required(view_func):
    return view_folder_required('faculty')(view_func)
