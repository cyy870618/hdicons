from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from .models import db
from .config import Config

jwt = JWTManager()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # 初始化扩展
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    jwt.init_app(app)
    db.init_app(app)
    
    # 注册蓝图
    from .routes.auth_routes import auth_bp
    from .routes.icon_routes import icon_bp
    from .routes.user_routes import user_bp
    from .routes.system_routes import system_bp
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(icon_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(system_bp)
    
    # 创建数据库表和初始数据
    with app.app_context():
        db.create_all()
        from .services.init_service import init_default_data
        init_default_data()
    
    return app
