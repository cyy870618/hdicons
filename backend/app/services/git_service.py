import os
import re
import subprocess
import logging
from typing import Optional, Callable
from flask import current_app

logger = logging.getLogger(__name__)

class GitService:
    def __init__(self):
        self.repo_url = 'https://github.com/xushier/HD-Icons.git'
    
    def _get_repo_dir(self):
        return current_app.config.get('HD_ICONS_DIR')
    
    def get_proxy_config(self) -> dict:
        """获取代理配置"""
        return {
            'http_proxy': current_app.config.get('ALL_PROXY', ''),
            'github_proxy': current_app.config.get('GITHUB_PROXY_URL', '')
        }
    
    def set_git_proxy(self):
        """设置 Git 代理"""
        proxy = self.get_proxy_config()
        if proxy['http_proxy']:
            subprocess.run(['git', 'config', '--global', 'http.proxy', proxy['http_proxy']], 
                         capture_output=True)
            subprocess.run(['git', 'config', '--global', 'https.proxy', proxy['http_proxy']], 
                         capture_output=True)
    
    def get_repo_url(self) -> str:
        """获取仓库 URL（支持 GitHub 代理）"""
        proxy = self.get_proxy_config()
        if proxy['github_proxy']:
            return self.repo_url.replace('https://github.com', proxy['github_proxy'])
        return self.repo_url
    
    def clone_or_pull(self, progress_callback: Optional[Callable] = None) -> dict:
        """克隆或拉取仓库"""
        self.set_git_proxy()
        repo_url = self.get_repo_url()
        repo_dir = self._get_repo_dir()
        
        result = {
            'action': '',
            'success': False,
            'message': '',
            'files_changed': 0
        }
        
        # 确保父目录存在
        os.makedirs(os.path.dirname(repo_dir), exist_ok=True)
        
        if not os.path.exists(repo_dir):
            # 克隆
            result['action'] = 'clone'
            if progress_callback:
                progress_callback('正在克隆仓库...')
            
            try:
                proc = subprocess.run(
                    ['git', 'clone', repo_url, repo_dir],
                    capture_output=True, text=True, timeout=600
                )
                if proc.returncode == 0:
                    result['success'] = True
                    result['message'] = '仓库克隆成功'
                else:
                    result['message'] = f'克隆失败: {proc.stderr}'
            except subprocess.TimeoutExpired:
                result['message'] = '克隆超时，请检查网络连接或配置代理'
            except Exception as e:
                result['message'] = f'克隆异常: {str(e)}'
        
        elif os.path.exists(os.path.join(repo_dir, '.git')):
            # 拉取更新
            result['action'] = 'pull'
            if progress_callback:
                progress_callback('正在检查更新...')
            
            try:
                proc = subprocess.run(
                    ['git', '-C', repo_dir, 'pull'],
                    capture_output=True, text=True, timeout=120
                )
                
                if proc.returncode == 0:
                    result['success'] = True
                    if 'Already up to date' in proc.stdout or 'Already up-to-date' in proc.stdout:
                        result['message'] = '已是最新版本'
                    else:
                        match = re.search(r'(\d+) files? changed', proc.stdout)
                        if match:
                            result['files_changed'] = int(match.group(1))
                        result['message'] = f'更新成功，更新了 {result["files_changed"]} 个文件'
                else:
                    result['message'] = f'更新失败: {proc.stderr}'
            except subprocess.TimeoutExpired:
                result['message'] = '更新超时，请检查网络连接'
            except Exception as e:
                result['message'] = f'更新异常: {str(e)}'
        else:
            # 目录存在但不是 Git 仓库
            result['message'] = 'HD-Icons 目录存在但不是有效的 Git 仓库'
        
        return result
    
    def get_troubleshooting_tips(self, error_message: str) -> list:
        """根据错误信息提供排查建议"""
        tips = []
        
        if 'timeout' in error_message.lower():
            tips.append('网络连接超时，请检查网络是否正常')
            tips.append('可以配置 ALL_PROXY 环境变量设置 HTTP 代理')
            tips.append('可以配置 GITHUB_PROXY_URL 环境变量使用 GitHub 镜像')
        
        if 'could not resolve host' in error_message.lower():
            tips.append('无法解析 GitHub 域名，请检查 DNS 配置')
            tips.append('可以尝试使用 GITHUB_PROXY_URL 环境变量')
        
        if 'permission denied' in error_message.lower():
            tips.append('权限不足，请检查目录权限')
        
        if not tips:
            tips.append('请检查网络连接')
            tips.append('如果在中国大陆，建议配置代理')
        
        return tips
