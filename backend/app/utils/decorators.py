from functools import wraps
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from .response import error_response

def require_role(*roles):
    """要求特定角色权限"""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            identity = get_jwt_identity()
            if identity.get('role') not in roles:
                return error_response('权限不足', 403)
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def require_login():
    """要求登录"""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def optional_login():
    """可选登录"""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                verify_jwt_in_request(optional=True)
            except:
                pass
            return fn(*args, **kwargs)
        return wrapper
    return decorator
