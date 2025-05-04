import os
import platform

class Config:
    """Base configuration."""
    # Database configuration
    # Set default SQLite database for local development when DATABASE_URL is not provided
    basedir = os.path.abspath(os.path.dirname(__file__))
    
    # Default to SQLite for local development if DATABASE_URL is not provided
    if os.environ.get("DATABASE_URL"):
        SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL")
    else:
        # Create the instance directory if it doesn't exist
        os.makedirs(os.path.join(basedir, 'instance'), exist_ok=True)
        # Use different path format for Windows vs. Unix systems
        if platform.system() == 'Windows':
            SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(basedir, 'instance', 'smartdatasense.db')}"
        else:
            SQLALCHEMY_DATABASE_URI = f"sqlite:////{os.path.join(basedir, 'instance', 'smartdatasense.db')}"
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_recycle": 300,
        "pool_pre_ping": True,
    }
    
    # Upload settings
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max upload
    ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'xls', 'json', 'txt'}
    
    # Session configuration
    SESSION_TYPE = 'filesystem'
    SESSION_PERMANENT = False
