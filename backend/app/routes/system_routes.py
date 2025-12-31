from flask import Blueprint, request, current_app
from flask_jwt_extended import jwt_required
from ..models import db
from ..models.config import SystemConfig
from ..utils.response import success_response, error_response
from ..utils.decorators import require_role

system_bp = Blueprint('system', __name__, url_prefix='/api/system')

@system_bp.route('/config', methods=['GET'])
def get_config():
    """获取系统配置（公开）"""
    # 只返回公开配置
    public_keys = ['title', 'custom_url']
    configs = SystemConfig.query.filter(SystemConfig.key.in_(public_keys)).all()
    
    result = {c.key: c.value for c in configs}
    
    # 添加环境变量配置
    result['title'] = result.get('title') or current_app.config.get('TITLE', '小迪的图标库')
    result['custom_url'] = result.get('custom_url') or current_app.config.get('CUSTOM_URL', '')
    
    return success_response(result)

@system_bp.route('/config/all', methods=['GET'])
@require_role('admin')
def get_all_config():
    """获取所有系统配置（管理员）"""
    configs = SystemConfig.query.all()
    return success_response([c.to_dict() for c in configs])

@system_bp.route('/config', methods=['PUT'])
@require_role('admin')
def update_config():
    """更新系统配置"""
    data = request.json or {}
    
    for key, value in data.items():
        config = SystemConfig.query.filter_by(key=key).first()
        if config:
            config.value = value
        else:
            config = SystemConfig(key=key, value=value)
            db.session.add(config)
    
    db.session.commit()
    return success_response(message='配置更新成功')

@system_bp.route('/info', methods=['GET'])
def get_system_info():
    """获取系统信息"""
    return success_response({
        'version': '2.0.0',
        'name': 'HD-Icons',
        'author': '小迪同学'
    })
