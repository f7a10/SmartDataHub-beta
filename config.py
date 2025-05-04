import os

class Config:
    """Base configuration."""
    # Database - include a fallback to SQLite if DATABASE_URL isn't available
    database_url = os.environ.get("DATABASE_URL")
    
    # Print debug information
    if database_url:
        print("Using DATABASE_URL from environment variables")
    else:
        import pathlib
        base_dir = pathlib.Path(__file__).parent.absolute()
        database_url = f"sqlite:///{base_dir}/app.db"
        print(f"DATABASE_URL not found in environment variables. Using SQLite database: {database_url}")
    
    SQLALCHEMY_DATABASE_URI = database_url
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
