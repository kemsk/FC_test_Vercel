import jwt
import logging
from django.conf import settings
from datetime import datetime, timedelta
from .models import User

logger = logging.getLogger(__name__)

def generate_jwt_token(user):
    """Generate JWT token with logging"""
    try:
        # Get user roles for payload
        user_roles = list(user.get_active_roles().values_list('role__name', flat=True))
        
        payload = {
            'user_id': user.id,
            'email': user.email,
            'university_id': getattr(user, 'university_id', ''),
            'first_name': getattr(user, 'first_name', ''),
            'last_name': getattr(user, 'last_name', ''),
            'roles': user_roles,
            'exp': datetime.utcnow() + timedelta(hours=24),
            'iat': datetime.utcnow()
        }
        
        token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
        
        # Log token generation (first 50 chars for security)
        logger.info(f"JWT Generated for user {user.email} (ID: {user.id}): {token[:50]}...")
        logger.info(f"JWT Payload: user_id={user.id}, email={user.email}, roles={user_roles}")
        
        return token
    except Exception as e:
        logger.error(f"Error generating JWT token for user {user.email}: {str(e)}")
        raise

def validate_jwt_token(token):
    """Validate JWT token with logging"""
    try:
        if not token:
            logger.warning("JWT validation failed: No token provided")
            return None
            
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        user_id = payload.get('user_id')
        email = payload.get('email')
        
        logger.info(f"JWT Validated for user_id: {user_id}, email: {email}")
        
        # Verify user still exists and is active
        try:
            user = User.objects.get(id=user_id, email=email)
            logger.info(f"JWT User verified: {user.email}")
            return payload
        except User.DoesNotExist:
            logger.error(f"JWT validation failed: User not found for user_id {user_id}")
            return None
            
    except jwt.ExpiredSignatureError:
        logger.warning("JWT Token expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.error(f"JWT Invalid: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"JWT validation error: {str(e)}")
        return None

def get_user_from_jwt_token(token):
    """Get user object from JWT token"""
    payload = validate_jwt_token(token)
    if not payload:
        return None
    
    try:
        user_id = payload.get('user_id')
        user = User.objects.get(id=user_id)
        logger.info(f"User retrieved from JWT: {user.email}")
        return user
    except User.DoesNotExist:
        logger.error(f"User not found from JWT token for user_id: {user_id}")
        return None

def refresh_jwt_token(token):
    """Refresh JWT token with logging"""
    try:
        payload = validate_jwt_token(token)
        if not payload:
            logger.warning("Cannot refresh token: Invalid token")
            return None
            
        # Get user from token
        user = get_user_from_jwt_token(token)
        if not user:
            logger.warning("Cannot refresh token: User not found")
            return None
            
        # Generate new token
        new_token = generate_jwt_token(user)
        logger.info(f"JWT Token refreshed for user: {user.email}")
        
        return new_token
    except Exception as e:
        logger.error(f"Error refreshing JWT token: {str(e)}")
        return None

def log_jwt_request(request):
    """Log JWT token from request for debugging"""
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    if auth_header.startswith('Bearer '):
        token = auth_header[7:]  # Remove 'Bearer ' prefix
        logger.info(f"JWT Request token: {token[:50]}...")
    else:
        logger.warning("Request missing JWT Authorization header")
