import bcrypt
from datetime import datetime
from ..models import db
from ..models.user import User

class AuthService:
    def authenticate(self, username: str, password: str):
        """验证用户"""
        user = User.query.filter_by(username=username).first()
        if user and bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8')):
            user.last_login_at = datetime.utcnow()
            db.session.commit()
            return user
        return None
    
    def create_user(self, username: str, password: str, role_id: int = 2):
        """创建用户"""
        if User.query.filter_by(username=username).first():
            return None, '用户名已存在'
        
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        user = User(username=username, password_hash=password_hash, role_id=role_id)
        db.session.add(user)
        db.session.commit()
        return user, None
    
    def update_password(self, user_id: int, new_password: str):
        """更新密码"""
        user = User.query.get(user_id)
        if not user:
            return False, '用户不存在'
        
        user.password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        db.session.commit()
        return True, None
    
    def delete_user(self, user_id: int):
        """删除用户"""
        user = User.query.get(user_id)
        if not user:
            return False, '用户不存在'
        if user.role_id == 1 and User.query.filter_by(role_id=1).count() == 1:
            return False, '不能删除唯一的管理员'
        
        db.session.delete(user)
        db.session.commit()
        return True, None
