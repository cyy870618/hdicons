import os
import logging
from PIL import Image
from flask import current_app

logger = logging.getLogger(__name__)

class ThumbnailService:
    def __init__(self, size=(128, 128)):
        self.size = size
        self.supported_formats = ('.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tiff', '.ico', '.tif')
        self.failed_files = []
    
    def _get_dirs(self):
        icons_dir = current_app.config.get('ICONS_DIR')
        return {
            'icons': icons_dir,
            'thumbnails': os.path.join(icons_dir, 'thumbnails'),
            'hd_icons': os.path.join(icons_dir, 'HD-Icons'),
            'upload': os.path.join(icons_dir, 'upload')
        }
    
    def generate_thumbnail(self, image_path: str, thumbnail_path: str, retries: int = 3):
        """生成单个缩略图，带重试机制"""
        for attempt in range(retries):
            try:
                with Image.open(image_path) as img:
                    img.thumbnail(self.size)
                    os.makedirs(os.path.dirname(thumbnail_path), exist_ok=True)
                    img.save(thumbnail_path)
                return True
            except Exception as e:
                logger.warning(f"生成缩略图失败 (尝试 {attempt + 1}/{retries}): {image_path}, 错误: {e}")
                if attempt == retries - 1:
                    self.failed_files.append(image_path)
        return False
    
    def generate_for_category(self, category: str, progress_callback=None):
        """为指定分类生成所有缩略图"""
        dirs = self._get_dirs()
        
        if category == 'upload':
            source_dir = dirs['upload']
        else:
            source_dir = os.path.join(dirs['hd_icons'], category)
        
        thumbnail_dir = os.path.join(dirs['thumbnails'], category)
        
        if not os.path.exists(source_dir):
            return {'success': 0, 'failed': 0, 'skipped': 0}
        
        os.makedirs(thumbnail_dir, exist_ok=True)
        
        files = [f for f in os.listdir(source_dir) if f.lower().endswith(self.supported_formats)]
        total = len(files)
        success = 0
        skipped = 0
        
        for i, filename in enumerate(files):
            source_path = os.path.join(source_dir, filename)
            thumb_path = os.path.join(thumbnail_dir, filename)
            
            if os.path.exists(thumb_path):
                skipped += 1
            elif self.generate_thumbnail(source_path, thumb_path):
                success += 1
            
            if progress_callback:
                progress_callback(i + 1, total, filename)
        
        return {
            'success': success,
            'failed': total - success - skipped,
            'skipped': skipped
        }
    
    def generate_all(self, progress_callback=None):
        """生成所有缩略图"""
        categories = ['border-radius', 'circle', 'upload']  # SVG 不需要缩略图
        results = {}
        
        for category in categories:
            results[category] = self.generate_for_category(category, progress_callback)
        
        return results
    
    def retry_failed(self):
        """重试失败的文件"""
        retried = []
        for path in self.failed_files[:]:
            category = os.path.basename(os.path.dirname(path))
            filename = os.path.basename(path)
            dirs = self._get_dirs()
            thumb_path = os.path.join(dirs['thumbnails'], category, filename)
            
            if self.generate_thumbnail(path, thumb_path, retries=1):
                self.failed_files.remove(path)
                retried.append(filename)
        
        return retried
    
    def get_failed_files(self):
        """获取失败的文件列表"""
        return self.failed_files
