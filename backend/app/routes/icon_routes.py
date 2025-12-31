import os
from flask import Blueprint, request, send_from_directory, current_app, make_response
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..services.icon_service import IconService
from ..services.thumbnail_service import ThumbnailService
from ..services.git_service import GitService
from ..utils.response import success_response, error_response, paginated_response
from ..utils.decorators import require_login, require_role

icon_bp = Blueprint('icon', __name__, url_prefix='/api')

def get_icon_service():
    return IconService()

def get_thumbnail_service():
    return ThumbnailService()

def get_git_service():
    return GitService()

@icon_bp.route('/icons', methods=['GET'])
def get_icons():
    """获取图标列表"""
    icon_service = get_icon_service()
    icon_type = request.args.get('type', 'all')
    category = request.args.get('category', 'all')
    search = request.args.get('search', '')
    page = int(request.args.get('page', 1))
    page_size = int(request.args.get('page_size', 100))
    
    icons, total = icon_service.get_icons(icon_type, category, search, page, page_size)
    
    # 添加 URL 信息
    base_url = request.host_url.rstrip('/')
    for icon in icons:
        urls = icon_service.get_icon_urls(icon, base_url)
        icon.update(urls)
    
    return paginated_response(icons, total, page, page_size)

@icon_bp.route('/icons/<path:filename>', methods=['DELETE'])
@require_login()
def delete_icon(filename):
    """删除图标（仅限用户上传）"""
    icon_service = get_icon_service()
    identity = get_jwt_identity()
    is_admin = identity.get('role') == 'admin'
    
    success, err = icon_service.delete_icon(filename, identity['id'], is_admin)
    if not success:
        return error_response(err)
    
    return success_response(message='删除成功')

@icon_bp.route('/icons/upload', methods=['POST'])
@require_login()
def upload_icon():
    """上传图标"""
    if 'file' not in request.files:
        return error_response('没有文件上传')
    
    files = request.files.getlist('file')
    if not files:
        return error_response('没有选择文件')
    
    identity = get_jwt_identity()
    upload_dir = current_app.config.get('UPLOAD_DIR')
    os.makedirs(upload_dir, exist_ok=True)
    
    allowed_formats = ('.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.tiff', '.apng', '.ico', '.tif')
    uploaded = []
    
    for file in files:
        if file.filename and file.filename.lower().endswith(allowed_formats):
            filepath = os.path.join(upload_dir, file.filename)
            file.save(filepath)
            uploaded.append(file.filename)
    
    # 生成缩略图
    if uploaded:
        get_thumbnail_service().generate_for_category('upload')
    
    return success_response({'uploaded': uploaded}, f'成功上传 {len(uploaded)} 个文件')

@icon_bp.route('/icons/json', methods=['POST'])
@require_login()
def generate_json():
    """生成图标 JSON"""
    icon_service = get_icon_service()
    data = request.json or {}
    icon_ids = data.get('icon_ids', [])
    
    # 获取所有图标或指定图标
    if icon_ids:
        # TODO: 根据 ID 筛选
        icons, _ = icon_service.get_icons()
    else:
        icons, _ = icon_service.get_icons()
    
    base_url = data.get('base_url', 'https://raw.githubusercontent.com/xushier/HD-Icons/main')
    json_data = icon_service.generate_icons_json(icons, base_url)
    
    return success_response(json_data)

@icon_bp.route('/check-update', methods=['GET'])
def check_update():
    """检查更新"""
    git_service = get_git_service()
    result = git_service.clone_or_pull()
    
    if result['success'] and result['files_changed'] > 0:
        # 生成新增图标的缩略图
        get_thumbnail_service().generate_all()
    
    if not result['success']:
        tips = git_service.get_troubleshooting_tips(result['message'])
        result['tips'] = tips
    
    return success_response(result)

@icon_bp.route('/thumbnails/retry', methods=['POST'])
@require_role('admin')
def retry_thumbnails():
    """重试失败的缩略图"""
    retried = get_thumbnail_service().retry_failed()
    return success_response({'retried': retried}, f'重试了 {len(retried)} 个文件')

@icon_bp.route('/thumbnails/status', methods=['GET'])
def get_thumbnail_status():
    """获取缩略图状态"""
    failed = get_thumbnail_service().get_failed_files()
    return success_response({
        'failed_count': len(failed),
        'failed_files': [os.path.basename(f) for f in failed]
    })


# 静态文件服务
@icon_bp.route('/icons/<path:subpath>')
def serve_icons(subpath):
    """提供图标文件"""
    icons_dir = current_app.config.get('ICONS_DIR')
    response = make_response(send_from_directory(icons_dir, subpath))
    response.headers['Cache-Control'] = 'public, max-age=15768000'
    return response
