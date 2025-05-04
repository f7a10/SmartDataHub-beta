import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
from app import db

class User(UserMixin, db.Model):
    """User model for authentication."""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    
    # Relationships
    conversations = db.relationship('Conversation', backref='user', lazy='dynamic')
    uploads = db.relationship('Upload', backref='user', lazy='dynamic')
    
    def set_password(self, password):
        """Set password hash."""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check password against hash."""
        return check_password_hash(self.password_hash, password)
    
    def __repr__(self):
        return f'<User {self.username}>'

class Conversation(db.Model):
    """Model for storing AI conversations."""
    __tablename__ = 'conversations'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(128), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    
    # Relationships
    messages = db.relationship('Message', backref='conversation', lazy='dynamic', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Conversation {self.id}>'

class Message(db.Model):
    """Model for storing individual messages in a conversation."""
    __tablename__ = 'messages'
    
    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey('conversations.id'), nullable=False)
    is_user = db.Column(db.Boolean, default=True)  # True for user message, False for AI response
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    
    def __repr__(self):
        return f'<Message {self.id} {"User" if self.is_user else "AI"}>'

class Upload(db.Model):
    """Model for tracking user file uploads."""
    __tablename__ = 'uploads'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    filename = db.Column(db.String(256), nullable=False)
    original_filename = db.Column(db.String(256), nullable=False)
    file_type = db.Column(db.String(32), nullable=False)
    file_size = db.Column(db.Integer, nullable=False)  # Size in bytes
    upload_date = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    session_id = db.Column(db.String(64), nullable=False)
    active = db.Column(db.Boolean, default=True)  # Whether the file is active in the current session
    
    def __repr__(self):
        return f'<Upload {self.filename}>'

class SavedChart(db.Model):
    """Model for saving user generated charts."""
    __tablename__ = 'saved_charts'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    chart_type = db.Column(db.String(64), nullable=False)
    chart_title = db.Column(db.String(256), nullable=True)
    chart_data = db.Column(db.Text, nullable=False)  # JSON data
    chart_config = db.Column(db.Text, nullable=True)  # JSON config
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    
    def __repr__(self):
        return f'<SavedChart {self.id}>'

class Report(db.Model):
    """Model for saving generated reports."""
    __tablename__ = 'reports'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(256), nullable=False)
    description = db.Column(db.Text, nullable=True)
    chart_ids = db.Column(db.Text, nullable=False)  # JSON array of chart IDs
    content = db.Column(db.Text, nullable=True)  # Report content in markdown format
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    
    def __repr__(self):
        return f'<Report {self.id}>'
