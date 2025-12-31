import os
from datetime import timedelta

class Config:
    # 基础配置
    SECRET_KEY = os.getenv('SECRET_KEY', 'hd-icons-secret-key-2025')
    
    # JWT 配置
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-2025')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)
    
    # 数据库配置
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///hd_icons.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # 原有环境变量
    ALL_PROXY = os.getenv('ALL_PROXY', '')
    CUSTOM_URL = os.getenv('CUSTOM_URL', 'https://raw.githubusercontent.com/xushier/HD-Icons/refs/heads/main')
    TITLE = os.getenv('TITLE', '小迪的图标库')
    
    # 新增环境变量
    GITHUB_PROXY_URL = os.getenv('GITHUB_PROXY_URL', '')
    DEFAULT_USERNAME = os.getenv('DEFAULT_USERNAME', 'admin')
    DEFAULT_PASSWORD = os.getenv('DEFAULT_PASSWORD', 'hdicons')
    
    # 图标目录配置
    ICONS_DIR = os.getenv('ICONS_DIR', os.path.join(os.getcwd(), 'icons'))
    UPLOAD_DIR = os.path.join(ICONS_DIR, 'upload')
    THUMBNAIL_DIR = os.path.join(ICONS_DIR, 'thumbnails')
    
    # GitHub 仓库
    GITHUB_REPO_URL = 'https://github.com/xushier/HD-Icons.git'
    HD_ICONS_DIR = os.path.join(ICONS_DIR, 'HD-Icons')
