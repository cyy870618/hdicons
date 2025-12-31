import os
import json
from flask import current_app
from ..models import db
from ..models.icon import Icon

class IconService:
    def __init__(self):
        self.icons_dir = None
        self.categories = ['border-radius', 'circle', 'svg', 'upload']
        self.supported_formats = ('.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.tiff', '.apng', '.ico', '.tif')
    
    def _get_icons_dir(self):
        if not self.icons_dir:
            self.icons_dir = current_app.config.get('ICONS_DIR')
        return self.icons_dir
    
    def get_icons(self, icon_type='all', category='all', search='', page=1, page_size=100):
        """获取图标列表"""
        icons = []
        icons_dir = self._get_icons_dir()
        
        categories_to_scan = self.categories if category == 'all' else [category]
        
        for cat in categories_to_scan:
            if cat == 'upload':
                folder_path = os.path.join(icons_dir, 'upload')
            else:
                folder_path = os.path.join(icons_dir, 'HD-Icons', cat)
            
            if not os.path.exists(folder_path):
                continue
            
            for filename in os.listdir(folder_path):
                if filename.lower().endswith(self.supported_formats):
                    if search and search.lower() not in filename.lower():
                        continue
                    
                    icon_data = {
                        'name': os.path.splitext(filename)[0],
                        'filename': filename,
                        'type': 'upload' if cat == 'upload' else 'github',
                        'category': cat
                    }
                    icons.append(icon_data)
        
        # 分页
        total = len(icons)
        start = (page - 1) * page_size
        end = start + page_size
        
        return icons[start:end], total
    
    def get_icon_urls(self, icon, base_url):
        """生成图标的各种 URL"""
        icons_dir = self._get_icons_dir()
        
        if icon['type'] == 'upload':
            original_path = f"/icons/upload/{icon['filename']}"
            thumbnail_path = f"/icons/thumbnails/upload/{icon['filename']}"
        else:
            original_path = f"/icons/HD-Icons/{icon['category']}/{icon['filename']}"
            thumbnail_path = f"/icons/thumbnails/{icon['category']}/{icon['filename']}"
        
        # SVG 不需要缩略图
        if icon['filename'].lower().endswith('.svg'):
            thumbnail_path = original_path
        
        return {
            'original_url': f"{base_url}{original_path}",
            'thumbnail_url': f"{base_url}{thumbnail_path}",
            'copy_url': f"{base_url}{original_path}"
        }
    
    def delete_icon(self, filename: str, user_id: int = None, is_admin: bool = False):
        """删除图标（仅限用户上传的图标）"""
        icons_dir = self._get_icons_dir()
        original_path = os.path.join(icons_dir, 'upload', filename)
        thumbnail_path = os.path.join(icons_dir, 'thumbnails', 'upload', filename)
        
        if not os.path.exists(original_path):
            return False, '文件不存在'
        
        # TODO: 检查权限（通过数据库记录的上传者）
        
        try:
            if os.path.exists(original_path):
                os.remove(original_path)
            if os.path.exists(thumbnail_path):
                os.remove(thumbnail_path)
            return True, None
        except Exception as e:
            return False, str(e)
    
    def update_icon_props(self, icon_id: int, props: dict):
        """更新图标属性"""
        icon = Icon.query.get(icon_id)
        if not icon:
            return None, '图标不存在'
        
        if 'project_name' in props:
            icon.project_name = props['project_name']
        if 'project_url' in props:
            icon.project_url = props['project_url']
        if 'official_site' in props:
            icon.official_site = props['official_site']
        if 'install_guide' in props:
            icon.install_guide = props['install_guide']
        if 'install_video' in props:
            icon.install_video = props['install_video']
        if 'demo_url' in props:
            icon.demo_url = props['demo_url']
        if 'custom_props' in props:
            icon.custom_props = json.dumps(props['custom_props'])
        
        db.session.commit()
        return icon, None
    
    def generate_icons_json(self, icons, base_url):
        """生成图标 JSON（兼容 generate_hd_icons_json.py 格式）"""
        return {
            'name': 'HD-Icons',
            'description': 'By 小迪',
            'icons': [
                {
                    'name': icon['name'],
                    'url': f"{base_url}/{icon['category']}/{icon['filename']}"
                }
                for icon in icons
            ]
        }
