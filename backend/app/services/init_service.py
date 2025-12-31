import json
import bcrypt
from flask import current_app
from ..models import db
from ..models.user import User
from ..models.role import Role
from ..models.config import SystemConfig

def init_default_data():
    """初始化默认数据"""
    # 初始化角色
    init_roles()
    # 初始化默认管理员
    init_default_admin()
    # 初始化系统配置
    init_system_config()

def init_roles():
    """初始化角色"""
    admin_permissions = json.dumps([
        "search", "view", "copy", "upload", 
        "delete_own", "delete_others", "edit_icon", "manage_user"
    ])
    user_permissions = json.dumps([
        "search", "view", "copy", "upload", "delete_own"
    ])
    
    if not Role.query.filter_by(name='admin').first():
        admin_role = Role(id=1, name='admin', permissions=admin_permissions)
        db.session.add(admin_role)
    
    if not Role.query.filter_by(name='user').first():
        user_role = Role(id=2, name='user', permissions=user_permissions)
        db.session.add(user_role)
    
    db.session.commit()

def init_default_admin():
    """初始化默认管理员"""
    username = current_app.config.get('DEFAULT_USERNAME', 'admin')
    password = current_app.config.get('DEFAULT_PASSWORD', 'hdicons')
    
    if not User.query.filter_by(username=username).first():
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        admin_user = User(
            username=username,
            password_hash=password_hash,
            role_id=1
        )
        db.session.add(admin_user)
        db.session.commit()

def init_system_config():
    """初始化系统配置"""
    default_configs = [
        ('title', current_app.config.get('TITLE', '小迪的图标库'), '网站标题'),
        ('custom_url', current_app.config.get('CUSTOM_URL', ''), '自定义复制地址前缀'),
        ('http_proxy', current_app.config.get('ALL_PROXY', ''), 'HTTP代理地址'),
        ('github_proxy_url', current_app.config.get('GITHUB_PROXY_URL', ''), 'GitHub代理地址'),
    ]
    
    for key, value, description in default_configs:
        if not SystemConfig.query.filter_by(key=key).first():
            config = SystemConfig(key=key, value=value, description=description)
            db.session.add(config)
    
    db.session.commit()
