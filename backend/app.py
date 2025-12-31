import os
import threading
import time
from app import create_app
from flask import send_from_directory

app = create_app()

def init_icons_repo():
    """初始化图标仓库（可选）"""
    try:
        from app.services.git_service import GitService
        from app.services.thumbnail_service import ThumbnailService
        
        with app.app_context():
            git_service = GitService()
            result = git_service.clone_or_pull()
            print(f"Git 操作: {result['message']}")
            
            if result['success']:
                thumbnail_service = ThumbnailService()
                print("正在生成缩略图...")
                results = thumbnail_service.generate_all()
                for category, stats in results.items():
                    print(f"  {category}: 成功 {stats['success']}, 跳过 {stats['skipped']}, 失败 {stats['failed']}")
    except FileNotFoundError as e:
        print(f"警告: Git 未安装或不在 PATH 中，跳过仓库同步: {e}")
    except Exception as e:
        print(f"警告: 初始化图标仓库失败，服务器仍可启动: {e}")

def auto_check_updates():
    """自动检查更新线程"""
    while True:
        time.sleep(86400)  # 每天检查一次
        try:
            from app.services.git_service import GitService
            from app.services.thumbnail_service import ThumbnailService
            
            with app.app_context():
                git_service = GitService()
                result = git_service.clone_or_pull()
                if result['success']:
                    print(f"自动更新: {result['message']}")
                    if result['files_changed'] > 0:
                        thumbnail_service = ThumbnailService()
                        thumbnail_service.generate_all()
        except Exception as e:
            print(f"自动更新失败: {e}")

# 静态文件路由
@app.route('/icons/<path:filename>')
def serve_icons(filename):
    icons_dir = app.config.get('ICONS_DIR', 'icons')
    return send_from_directory(icons_dir, filename)

# 确保图标目录存在
with app.app_context():
    os.makedirs(app.config.get('ICONS_DIR', 'icons'), exist_ok=True)
    os.makedirs(app.config.get('UPLOAD_DIR', 'icons/upload'), exist_ok=True)
    os.makedirs(app.config.get('THUMBNAIL_DIR', 'icons/thumbnails'), exist_ok=True)

# 初始化（非阻塞）
init_thread = threading.Thread(target=init_icons_repo, daemon=True)
init_thread.start()

# 启动自动更新线程
update_thread = threading.Thread(target=auto_check_updates, daemon=True)
update_thread.start()

if __name__ == '__main__':
    print("=" * 50)
    print("HD-Icons 后端服务启动中...")
    print("访问地址: http://localhost:50560")
    print("=" * 50)
    app.run(host='0.0.0.0', port=50560, debug=True)
