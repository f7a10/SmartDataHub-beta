import os
import logging
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from sqlalchemy.orm import DeclarativeBase
from werkzeug.middleware.proxy_fix import ProxyFix

# Try to load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
    print("Loaded environment variables from .env file")
except ImportError:
    print("python-dotenv not installed. Install with: pip install python-dotenv")
except Exception as e:
    print(f"Error loading .env file: {e}")

# Print environment variables for debugging
print(f"DATABASE_URL environment variable: {os.environ.get('DATABASE_URL')}")
print(f"SESSION_SECRET environment variable: {os.environ.get('SESSION_SECRET')}")

# Set up logging
logging.basicConfig(level=logging.DEBUG,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Setup SQLAlchemy base class
class Base(DeclarativeBase):
    pass

# Initialize extensions
db = SQLAlchemy(model_class=Base)
login_manager = LoginManager()

def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__)
    
    # Configure the application
    app.config.from_object('config.Config')
    
    # Secret key from environment variable
    app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key")
    
    # Fix for proxies so url_for generates https URLs
    app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)
    
    # Configure upload folder
    upload_folder = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
    os.makedirs(upload_folder, exist_ok=True)
    app.config['UPLOAD_FOLDER'] = upload_folder
    
    # Initialize extensions with app
    db.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = 'main.login'
    
    @login_manager.user_loader
    def load_user(user_id):
        from models import User
        return User.query.get(int(user_id))
    
    # Register blueprints
    from routes import main
    app.register_blueprint(main)
    
    with app.app_context():
        # Import models to ensure tables are created
        import models
        
        # Create all tables
        db.create_all()
        logger.info("Database tables created")
    
    return app
