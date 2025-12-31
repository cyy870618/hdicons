from flask import Blueprint, request
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from ..services.auth_service import AuthService
from ..utils.response import success_response, error_response

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')
auth_service = AuthService()

@auth_bp.route('/login', methods=['POST'])
def login():
    """用户登录"""
    data = request.json or {}
    username = data.get('username', '').strip()
    password = data.get('password', '')
    
    if not username or not password:
        return error_response('用户名和密码不能为空')
    
    user = auth_service.authenticate(username, password)
    if not user:
        return error_response('用户名或密码错误', 401)
    
    token = create_access_token(identity={
        'id': user.id,
        'username': user.username,
        'role': user.role.name
    })
    
    return success_response({
        'token': token,
        'user': user.to_dict()
    }, '登录成功')

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """获取当前用户信息"""
    identity = get_jwt_identity()
    return success_response(identity)

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """修改密码"""
    identity = get_jwt_identity()
    data = request.json or {}
    new_password = data.get('new_password', '')
    
    if len(new_password) < 6:
        return error_response('密码长度至少6位')
    
    success, err = auth_service.update_password(identity['id'], new_password)
    if not success:
        return error_response(err)
    
    return success_response(message='密码修改成功')
