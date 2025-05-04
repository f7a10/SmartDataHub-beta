#!/usr/bin/env python3
"""
Run this file to start the application in development mode.
"""
import os
from app import create_app

if __name__ == '__main__':
    app = create_app()
    
    # Check if we're running on Replit
    is_replit = os.environ.get('REPL_ID') is not None
    
    if is_replit:
        # On Replit, we'll let gunicorn handle this
        print("Running on Replit - use 'gunicorn --bind 0.0.0.0:5000 main:app' to start")
    else:
        # In local development, use Flask's development server
        # Get port from environment variable or default to 5000
        port = int(os.environ.get('PORT', 5000))
        host = os.environ.get('HOST', '127.0.0.1')
        
        print(f"Starting development server at http://{host}:{port}")
        app.run(host=host, port=port, debug=True)