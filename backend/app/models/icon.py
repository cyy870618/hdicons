from datetime import datetime
from . import db

class Icon(db.Model):
    __tablename__ = 'icons'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    type = db.Column(db.String(20), nullable=False)  # github / upload
    category = db.Column(db.String(50), nullable=False)
    upload_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    project_name = db.Column(db.String(255))
    project_url = db.Column(db.String(500))
    official_site = db.Column(db.String(500))
    install_guide = db.Column(db.String(500))
    install_video = db.Column(db.String(500))
    demo_url = db.Column(db.String(500))
    custom_props = db.Column(db.Text)  # JSON 格式
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    uploader = db.relationship('User', backref='icons')
    
    def to_dict(self):
        import json
        return {
            'id': self.id,
            'name': self.name,
            'filename': self.filename,
            'type': self.type,
            'category': self.category,
            'upload_user_id': self.upload_user_id,
            'project_name': self.project_name,
            'project_url': self.project_url,
            'official_site': self.official_site,
            'install_guide': self.install_guide,
            'install_video': self.install_video,
            'demo_url': self.demo_url,
            'custom_props': json.loads(self.custom_props) if self.custom_props else {},
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
