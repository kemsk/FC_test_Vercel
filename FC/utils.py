from functools import wraps
from django.core.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404
from .models import User, College, Department, Office, ClearanceTimeline


def role_required(*required_roles):
    """
    Decorator to require specific roles for view access
    Usage: @role_required('CISO', 'College Admin')
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not request.user.is_authenticated:
                raise PermissionDenied
                
            user_roles = request.user.get_active_roles().values_list('role__name', flat=True)
            
            if not any(role in user_roles for role in required_roles):
                raise PermissionDenied
                
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator


def approver_required(view_func):
    """
    Decorator to require approver role (handles college, department, and office contexts)
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            raise PermissionDenied
            
        # Check context-specific approver permissions
        college_id = kwargs.get('college_id') or request.GET.get('college_id')
        department_id = kwargs.get('department_id') or request.GET.get('department_id')
        office_id = kwargs.get('office_id') or request.GET.get('office_id')
        
        if college_id:
            college = get_object_or_404(College, id=college_id)
            if not request.user.is_approver(college=college):
                raise PermissionDenied
        elif department_id:
            department = get_object_or_404(Department, id=department_id)
            if not request.user.is_approver(department=department):
                raise PermissionDenied
        elif office_id:
            office = get_object_or_404(Office, id=office_id)
            if not request.user.is_approver(office=office):
                raise PermissionDenied
        else:
            # Check if user is any approver
            if not request.user.is_approver():
                raise PermissionDenied
                
        return view_func(request, *args, **kwargs)
    return wrapper


def ciso_admin_required(view_func):
    """
    Decorator to require CISO admin role
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated or not request.user.is_ciso_admin():
            raise PermissionDenied
        return view_func(request, *args, **kwargs)
    return wrapper


def ovphe_required(view_func):
    """
    Decorator to require OVPHE role
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated or not request.user.is_ovphe_admin():
            raise PermissionDenied
        return view_func(request, *args, **kwargs)
    return wrapper


def get_active_timeline():
    """
    Get the currently active clearance timeline
    """
    return ClearanceTimeline.objects.filter(is_active=True).first()


def get_user_accessible_colleges(user):
    """
    Get colleges that user has access to based on their roles
    """
    colleges = set()
    
    # CISO and OVPHEs can access all colleges
    if user.is_ciso_admin() or user.is_ovphe_admin():
        colleges.update(College.objects.filter(is_active=True))
    
    # College admins can access their assigned colleges
    user_roles = user.get_active_roles().filter(role__name='College Admin')
    for user_role in user_roles:
        if user_role.college:
            colleges.add(user_role.college)
    
    # Department chairs can access their college
    user_roles = user.get_active_roles().filter(role__name='Department Chair')
    for user_role in user_roles:
        if user_role.department and user_role.department.college:
            colleges.add(user_role.department.college)
    
    return list(colleges)


def get_user_accessible_departments(user):
    """
    Get departments that user has access to based on their roles
    """
    departments = set()
    
    # CISO and OVPHEs can access all departments
    if user.is_ciso_admin() or user.is_ovphe_admin():
        departments.update(Department.objects.filter(is_active=True))
    
    # College admins can access all departments in their colleges
    user_roles = user.get_active_roles().filter(role__name='College Admin')
    for user_role in user_roles:
        if user_role.college:
            departments.update(user_role.college.departments.filter(is_active=True))
    
    # Department chairs can access their department
    user_roles = user.get_active_roles().filter(role__name='Department Chair')
    for user_role in user_roles:
        if user_role.department:
            departments.add(user_role.department)
    
    return list(departments)


def get_user_accessible_offices(user):
    """
    Get offices that user has access to based on their roles
    """
    offices = set()
    
    # CISO and OVPHEs can access all offices
    if user.is_ciso_admin() or user.is_ovphe_admin():
        offices.update(Office.objects.filter(is_active=True))
    
    # Office admins can access their office
    user_roles = user.get_active_roles().filter(role__name='Office Admin')
    for user_role in user_roles:
        if user_role.office:
            offices.add(user_role.office)
    
    return list(offices)


def can_create_assistant(user, assistant_type, target_college=None, target_department=None, target_office=None):
    """
    Check if user can create assistant of given type for target
    """
    # CISO can create any assistant
    if user.is_ciso_admin():
        return True
    
    # College admins can create department chairs, office admins, and assistants for their college
    if user.is_college_admin(target_college):
        if assistant_type in ['dept_chair', 'office_admin', 'student_assistant']:
            return True
    
    # Department chairs can create assistants and admin secondment for their department
    if user.is_department_chair(target_department):
        if assistant_type in ['admin_secondment', 'student_assistant']:
            return True
    
    # Office admins can create assistants for their office
    if user.is_office_admin(target_office):
        if assistant_type == 'student_assistant':
            return True
    
    return False


def get_dropdown_options_for_user(user):
    """
    Get dropdown options for creating assistants based on user's role
    """
    options = []
    
    if user.is_ciso_admin():
        # CISO can create anything
        options.extend([
            {'value': 'college_admin', 'label': 'College Admin'},
            {'value': 'dept_chair', 'label': 'Department Chair'},
            {'value': 'office_admin', 'label': 'Office Admin'},
            {'value': 'student_assistant', 'label': 'Student Assistant'},
        ])
        
        # Add all colleges
        for college in College.objects.filter(is_active=True):
            options.append({'value': f'college_{college.id}', 'label': college.name})
    
    elif user.is_college_admin():
        # College admin dropdown
        options.append({'value': 'college_admin', 'label': 'College Admin'})
        
        # Add departments in their college
        user_roles = user.get_active_roles().filter(role__name='College Admin')
        for user_role in user_roles:
            if user_role.college:
                for dept in user_role.college.departments.filter(is_active=True):
                    options.append({'value': f'dept_{dept.id}', 'label': dept.name})
    
    elif user.is_department_chair():
        # Department chair can only see their own department
        user_roles = user.get_active_roles().filter(role__name='Department Chair')
        for user_role in user_roles:
            if user_role.department:
                options.append({'value': f'dept_{user_role.department.id}', 'label': user_role.department.name})
    
    elif user.is_office_admin():
        # Office admin can only see their own office
        user_roles = user.get_active_roles().filter(role__name='Office Admin')
        for user_role in user_roles:
            if user_role.office:
                options.append({'value': f'office_{user_role.office.id}', 'label': user_role.office.name})
    
    return options
