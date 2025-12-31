from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import db
from ..models.user import User
from ..services.auth_service import AuthService
from ..utils.response import success_response, error_response, paginated_response
from ..utils.decorators import require_role

user_bp = Blueprint('user', __name__, url_prefix='/api/users')
auth_service = AuthService()

@user_bp.route('', methods=['GET'])
@require_role('admin')
def get_users():
    """获取用户列表"""
    page = int(request.args.get('page', 1))
    page_size = int(request.args.get('page_size', 20))
    
    query = User.query
    total = query.count()
    users = query.offset((page - 1) * page_size).limit(page_size).all()
    
    return paginated_response(
        [u.to_dict() for u in users],
        total, page, page_size
    )

@user_bp.route('', methods=['POST'])
@require_role('admin')
def create_user():
    """创建用户"""
    data = request.json or {}
    username = data.get('username', '').strip()
    password = data.get('password', '')
    role_id = data.get('role_id', 2)
    
    if not username or not password:
        return error_response('用户名和密码不能为空')
    
    if len(password) < 6:
        return error_response('密码长度至少6位')
    
    user, err = auth_service.create_user(username, password, role_id)
    if not user:
        return error_response(err)
    
    return success_response(user.to_dict(), '用户创建成功')

@user_bp.route('/<int:user_id>', methods=['PUT'])
@require_role('admin')
def update_user(user_id):
    """更新用户"""
    user = User.query.get(user_id)
    if not user:
        return error_response('用户不存在')
    
    data = request.json or {}
    
    if 'role_id' in data:
        # 不能修改唯一管理员的角色
        if user.role_id == 1 and data['role_id'] != 1:
            admin_count = User.query.filter_by(role_id=1).count()
            if admin_count == 1:
                return error_response('不能修改唯一管理员的角色')
        user.role_id = data['role_id']
    
    if 'password' in data and data['password']:
        if len(data['password']) < 6:
            return error_response('密码长度至少6位')
        auth_service.update_password(user_id, data['password'])
    
    db.session.commit()
    return success_response(user.to_dict(), '用户更新成功')

@user_bp.route('/<int:user_id>', methods=['DELETE'])
@require_role('admin')
def delete_user(user_id):
    """删除用户"""
    identity = get_jwt_identity()
    
    if identity['id'] == user_id:
        return error_response('不能删除自己')
    
    success, err = auth_service.delete_user(user_id)
    if not success:
        return error_response(err)
    
    return success_response(message='用户删除成功')
