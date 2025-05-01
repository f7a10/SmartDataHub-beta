import os
import json
import uuid
import logging
import time
import traceback
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime
from werkzeug.utils import secure_filename
from flask import (
    Blueprint, render_template, request, jsonify, current_app,
    session, send_from_directory, abort, redirect, url_for, flash
)
from werkzeug.security import generate_password_hash, check_password_hash
from urllib.parse import urlparse
from flask_login import current_user, login_user, logout_user, login_required

from app import db
from models import User, Conversation, Message, Upload, SavedChart, Report
from file_processing import DataProcessor
from ai_integration import get_ai_instance
from visualization import DataVisualizer

# Set up logging
logging.basicConfig(level=logging.DEBUG,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Create a Blueprint for routes
main = Blueprint('main', __name__)

# Initialize data processor and visualizer
data_processor = DataProcessor()
data_visualizer = DataVisualizer()

# Helper function to load a DataFrame dynamically
def load_dataframe(file_path):
    try:
        _, ext = os.path.splitext(file_path)
        ext = ext.lower()
        if ext == '.csv':
            try:
                df = pd.read_csv(file_path)
            except UnicodeDecodeError:
                df = pd.read_csv(file_path, encoding='latin1')
        elif ext in ['.xlsx', '.xls']:
            df = pd.read_excel(file_path)
        elif ext == '.json':
            try:
                df = pd.read_json(file_path)
            except ValueError:
                with open(file_path, 'r') as f:
                    data = json.load(f)
                if isinstance(data, dict):
                    df = pd.DataFrame.from_dict(data, orient='index')
                else:
                    df = pd.DataFrame(data)
        elif ext in ['.txt', '.dat']:
            df = pd.read_csv(file_path, sep=None, engine='python')
        else:
            logger.warning(f"Unsupported file type: {ext}")
            return None
        logger.info(f"Loaded dataframe from {file_path} with shape: {df.shape}")
        return df
    except Exception as e:
        logger.error(f"Error loading file {file_path}: {str(e)}")
        logger.error(traceback.format_exc())
        return None

@main.route('/')
def index():
    """Render the landing page."""
    logger.info("Rendering landing page")
    return render_template('index.html')

@main.route('/login', methods=['GET', 'POST'])
def login():
    """Handle user login."""
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))
    
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        remember = request.form.get('remember') == 'true'
        
        user = User.query.filter((User.username == username) | (User.email == username)).first()
        
        if user is None or not user.check_password(password):
            flash('Invalid username or password')
            return render_template('login.html', error="Invalid username or password")
        
        login_user(user, remember=remember)
        
        next_page = request.args.get('next')
        if not next_page or urlparse(next_page).netloc != '':
            next_page = url_for('main.dashboard')
        
        return redirect(next_page)
    
    return render_template('login.html')

@main.route('/register', methods=['GET', 'POST'])
def register():
    """Handle user registration."""
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))
    
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        
        if not all([username, email, password, confirm_password]):
            flash('All fields are required')
            return render_template('register.html', error="All fields are required")
        
        if password != confirm_password:
            flash('Passwords do not match')
            return render_template('register.html', error="Passwords do not match")
        
        # Check if username or email already exists
        if User.query.filter_by(username=username).first():
            flash('Username already exists')
            return render_template('register.html', error="Username already exists")
        
        if User.query.filter_by(email=email).first():
            flash('Email already exists')
            return render_template('register.html', error="Email already exists")
        
        # Create new user
        user = User(username=username, email=email)
        user.set_password(password)
        
        db.session.add(user)
        db.session.commit()
        
        flash('Registration successful. Please log in.')
        return redirect(url_for('main.login'))
    
    return render_template('register.html')

@main.route('/logout')
def logout():
    """Log out the user and redirect to the login page."""
    logout_user()
    return redirect(url_for('main.login'))

@main.route('/dashboard')
@login_required
def dashboard():
    """Render the main dashboard page."""
    logger.info(f"Rendering dashboard for user: {current_user.username}")
    
    # Get user's recent conversations
    recent_conversations = Conversation.query.filter_by(user_id=current_user.id).order_by(Conversation.created_at.desc()).limit(5).all()
    
    return render_template('dashboard.html', username=current_user.username, recent_conversations=recent_conversations)

@main.route('/api/login', methods=['POST'])
def api_login():
    """API endpoint for login."""
    try:
        data = request.get_json()
        username = data.get('username') or data.get('email')
        password = data.get('password')
        
        logger.info(f"API login attempt for user: {username}")
        
        # Find user by username or email
        user = User.query.filter((User.username == username) | (User.email == username)).first()
        
        if user and user.check_password(password):
            login_user(user)
            
            # Create a session ID if not exists
            if 'session_id' not in session:
                session['session_id'] = str(uuid.uuid4())
                
            logger.info(f"API login successful for user: {user.username}")
            
            return jsonify({
                'success': True,
                'user_id': user.id,
                'username': user.username
            })
        else:
            logger.warning("API login failed: Invalid credentials")
            return jsonify({
                'success': False,
                'message': 'Invalid credentials'
            }), 401
            
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            'success': False,
            'message': 'An error occurred during login'
        }), 500

@main.route('/api/register', methods=['POST'])
def api_register():
    """API endpoint for user registration."""
    try:
        data = request.get_json()
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        
        logger.info(f"API registration attempt for username: {username}, email: {email}")
        
        # Validate input
        if not all([username, email, password]):
            return jsonify({
                'success': False,
                'message': 'All fields are required'
            }), 400
        
        # Check if username or email already exists
        if User.query.filter_by(username=username).first():
            return jsonify({
                'success': False,
                'message': 'Username already exists'
            }), 400
        
        if User.query.filter_by(email=email).first():
            return jsonify({
                'success': False,
                'message': 'Email already exists'
            }), 400
        
        # Create new user
        user = User(username=username, email=email)
        user.set_password(password)
        
        db.session.add(user)
        db.session.commit()
        
        logger.info(f"User registered successfully: {username}")
        
        return jsonify({
            'success': True,
            'message': 'Registration successful'
        })
        
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        logger.error(traceback.format_exc())
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'An error occurred during registration'
        }), 500

@main.route('/upload', methods=['POST'])
@login_required
def upload_files():
    """
    Handle file uploads, save them, and return a response.
    """
    logger.info("Handling file upload request")
    logger.debug(f"Request files: {request.files}")

    try:
        # Check if we should clear previous files
        clear_previous = request.form.get('clear_previous', 'false').lower() == 'true'
        logger.debug(f"Clear previous files flag: {clear_previous}")
        
        # Check if any files were uploaded
        uploaded_files = []
        if 'files[]' in request.files:
            uploaded_files = request.files.getlist('files[]')
            logger.debug(f"Found files under 'files[]': {[f.filename for f in uploaded_files]}")
        else:
            for key in request.files:
                if request.files.getlist(key):
                    uploaded_files = request.files.getlist(key)
                    logger.debug(f"Found files under '{key}': {[f.filename for f in uploaded_files]}")
                    break

        if not uploaded_files or uploaded_files[0].filename == '':
            logger.warning("No files found in request")
            return jsonify({"success": False, "error": "No files selected"}), 400

        # Create a new session ID if needed or if clear_previous is true
        if 'session_id' not in session or clear_previous:
            if clear_previous and 'session_id' in session:
                old_session_id = session['session_id']
                # Mark old session as inactive in the database
                Upload.query.filter_by(session_id=old_session_id, user_id=current_user.id).update({'active': False})
                db.session.commit()
                logger.info(f"Marked files from previous session {old_session_id} as inactive")
                
            # Generate a new session ID
            session['session_id'] = str(uuid.uuid4())
            logger.info(f"Created new session_id: {session['session_id']}")

        # List to store saved files
        saved_files = []
        upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
        session_folder = os.path.join(upload_folder, session['session_id'])
        os.makedirs(session_folder, exist_ok=True)

        for file in uploaded_files:
            if file and file.filename:
                try:
                    filename = secure_filename(file.filename)
                    file_path = os.path.join(session_folder, filename)
                    file.save(file_path)
                    
                    # Save upload record in database
                    file_size = os.path.getsize(file_path)
                    file_type = os.path.splitext(filename)[1].lower()[1:]
                    
                    upload = Upload(
                        user_id=current_user.id,
                        filename=filename,
                        original_filename=file.filename,
                        file_type=file_type,
                        file_size=file_size,
                        session_id=session['session_id']
                    )
                    db.session.add(upload)
                    
                    saved_files.append(file_path)
                    logger.info(f"Successfully saved file: {filename} to {file_path}")
                except Exception as e:
                    logger.error(f"Error saving file {file.filename}: {str(e)}")
                    logger.error(traceback.format_exc())

        if not saved_files:
            logger.warning("No files were successfully saved")
            return jsonify({"success": False, "error": "Failed to save any files"}), 500
        
        # Commit the database changes
        db.session.commit()

        return jsonify({
            "success": True,
            "message": f"Successfully uploaded {len(saved_files)} file(s)",
            "files": [os.path.basename(f) for f in saved_files],
            "session_id": session['session_id']
        })

    except Exception as e:
        logger.error(f"Exception in upload_files: {str(e)}")
        logger.error(traceback.format_exc())
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@main.route('/analyze', methods=['GET', 'POST'])
@login_required
def analyze_data():
    """
    Analyze the uploaded files and generate visualizations.
    """
    logger.info("Handling analyze data request")
    try:
        if 'session_id' not in session:
            logger.warning("No session ID found")
            return jsonify({"success": False, "error": "No active session"}), 400

        # Get request parameters - either from JSON body (POST) or query params (GET)
        if request.method == 'POST':
            data = request.get_json() or {}
        else:
            data = request.args.to_dict()
            
        # Parse parameters
        file_indices_param = data.get('file_indices', [])
        if isinstance(file_indices_param, str):
            try:
                # Try to parse as JSON string
                file_indices = json.loads(file_indices_param)
            except json.JSONDecodeError:
                # Fall back to comma-separated string
                file_indices = [int(idx.strip()) for idx in file_indices_param.split(',') if idx.strip().isdigit()]
        else:
            file_indices = file_indices_param
            
        # Check for frontend 'combine' parameter and fall back to 'combine_files'
        combine_param = data.get('combine', data.get('combine_files', False))
        if isinstance(combine_param, str):
            combine_files = combine_param.lower() in ['true', '1', 'yes']
        else:
            combine_files = bool(combine_param)
        
        logger.debug(f"Analysis parameters: file_indices={file_indices}, combine_files={combine_files}")
        
        session_id = session['session_id']
        logger.debug(f"Using session_id: {session_id}")
        upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
        session_folder = os.path.join(upload_folder, session_id)

        if not os.path.exists(session_folder):
            logger.warning(f"Session folder does not exist: {session_folder}")
            return jsonify({"success": False, "error": "No files found for session"}), 404

        # Get all files from database that are active for this session
        active_uploads = Upload.query.filter_by(session_id=session_id, 
                                              user_id=current_user.id, 
                                              active=True).all()
        
        # Get the actual file paths
        all_files = [os.path.join(session_folder, upload.filename) 
                    for upload in active_uploads 
                    if os.path.isfile(os.path.join(session_folder, upload.filename))]

        if not all_files:
            logger.warning(f"No active files found for session: {session_id}")
            return jsonify({"success": False, "error": "No active files found"}), 404
            
        # If file_indices is provided, filter the files
        files = all_files
        if file_indices and len(file_indices) > 0:
            try:
                # Convert indices to integers and filter files
                indices = [int(i) for i in file_indices]
                files = [all_files[i] for i in indices if 0 <= i < len(all_files)]
                logger.debug(f"Selected files by indices {indices}: {files}")
                
                # If only one file is selected, don't combine regardless of settings
                if len(files) == 1:
                    combine_files = False
                    logger.debug("Single file selected, disabling combine_files")
            except Exception as idx_error:
                logger.error(f"Error selecting files by indices: {str(idx_error)}")
                # Fall back to using all files
                files = all_files
                logger.debug("Falling back to using all files")
        
        logger.debug(f"Found files: {files}")
        logger.info(f"Processing {len(files)} files (combine_files: {combine_files})")
        
        # Create a deep copy of the selected file list to avoid any reference issues
        selected_files = list(files)
        
        # Process data with combine_files flag
        processed_data = process_files_directly(selected_files, combine_files)

        if not processed_data.get("success", False):
            logger.warning("File processing failed")
            return jsonify({"success": False, "error": "File processing failed", "details": processed_data}), 500

        # Generate dashboard data with the selected files 
        dashboard_data = generate_dashboard_data_from_files(processed_data, selected_files, session_id, combine_files)
        
        # Add file information to response
        dashboard_data["files"] = [os.path.basename(f) for f in selected_files]
        dashboard_data["all_files"] = [os.path.basename(f) for f in all_files]
        dashboard_data["selected_file_count"] = len(selected_files)
        dashboard_data["combine_files"] = combine_files
        dashboard_data["file_indices"] = file_indices if file_indices else list(range(len(all_files)))
        dashboard_data["success"] = True
        
        # Add timestamp to force frontend cache refresh
        dashboard_data["timestamp"] = int(time.time())

        try:
            ai_client = get_ai_instance()
            if ai_client:
                data_summary = {
                    "files": [os.path.basename(f) for f in files],
                    "metrics": dashboard_data.get("metrics", {}),
                    "data_overview": processed_data,
                    "combine_files": combine_files
                }
                ai_insights = ai_client.analyze_data_initial(data_summary)
                dashboard_data["ai_insights"] = ai_insights
            else:
                dashboard_data["ai_insights"] = "AI analysis is not available at the moment."
        except Exception as ai_error:
            logger.error(f"Error generating AI insights: {str(ai_error)}")
            dashboard_data["ai_insights"] = "Unable to generate AI insights at this time."

        return jsonify(dashboard_data)

    except Exception as e:
        logger.error(f"Exception in analyze_data: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"success": False, "error": str(e)}), 500

def process_files_directly(file_paths, combine_files=False):
    """
    Direct file processing to extract summary data from files.
    
    Args:
        file_paths: List of paths to files to process
        combine_files: If True, combines all files into one dataframe for analysis
    
    Returns:
        Dictionary with processed data information
    """
    results = {"success": False}
    file_data = {}
    combined_df = None
    
    try:
        if combine_files and len(file_paths) > 1:
            logger.info(f"Processing {len(file_paths)} files in combined mode")
            all_dfs = []
            
            # First try to load all files
            for file_path in file_paths:
                file_name = os.path.basename(file_path)
                _, ext = os.path.splitext(file_path)
                ext = ext.lower()
                
                try:
                    if ext == '.csv':
                        df = pd.read_csv(file_path, encoding='utf-8', on_bad_lines='skip')
                    elif ext in ['.xlsx', '.xls']:
                        df = pd.read_excel(file_path)
                    elif ext == '.json':
                        df = pd.read_json(file_path)
                    else:
                        df = pd.read_csv(file_path, sep=None, engine='python', on_bad_lines='skip')
                    
                    # Add a source column to track which file the data came from
                    df['_source_file'] = file_name
                    all_dfs.append(df)
                    logger.info(f"Successfully loaded file {file_name} with shape {df.shape}")
                except Exception as file_error:
                    logger.error(f"Error loading file {file_name} for combined analysis: {str(file_error)}")
                    # If any file fails, we'll fall back to individual processing
                    combine_files = False
                    break
            
            # If all files loaded successfully, combine them
            if combine_files and all_dfs:
                try:
                    combined_df = pd.concat(all_dfs, ignore_index=True)
                    logger.info(f"Combined {len(all_dfs)} files into dataframe with shape {combined_df.shape}")
                    
                    # Process the combined dataframe
                    summary = {
                        "shape": {"rows": combined_df.shape[0], "columns": combined_df.shape[1]},
                        "columns": list(combined_df.columns),
                        "dtypes": {col: str(combined_df[col].dtype) for col in combined_df.columns},
                        "missing_data": {col: int(combined_df[col].isnull().sum()) for col in combined_df.columns},
                        "numeric_columns": {},
                        "categorical_columns": {},
                        "source_files": [os.path.basename(f) for f in file_paths]
                    }
                    
                    for col in combined_df.select_dtypes(include=['number']).columns:
                        if col == '_source_file':
                            continue
                        summary["numeric_columns"][str(col)] = {
                            "min": float(combined_df[col].min()) if not pd.isna(combined_df[col].min()) else 0,
                            "max": float(combined_df[col].max()) if not pd.isna(combined_df[col].max()) else 0,
                            "mean": float(combined_df[col].mean()) if not pd.isna(combined_df[col].mean()) else 0,
                            "median": float(combined_df[col].median()) if not pd.isna(combined_df[col].median()) else 0,
                            "std": float(combined_df[col].std()) if not pd.isna(combined_df[col].std()) else 0
                        }
                    
                    for col in combined_df.select_dtypes(include=['object', 'category']).columns:
                        value_counts = combined_df[col].value_counts().head(10).to_dict()
                        # Convert keys to strings (in case they're not)
                        str_value_counts = {str(k): int(v) for k, v in value_counts.items()}
                        summary["categorical_columns"][str(col)] = str_value_counts
                    
                    # Add file breakdown information
                    summary["file_breakdown"] = combined_df['_source_file'].value_counts().to_dict()
                    
                    # Store as combined data
                    file_data["combined_data"] = summary
                    
                    # Set success flag and return
                    results = {
                        "success": True,
                        "data": file_data,
                        "combined": True
                    }
                    return results
                    
                except Exception as combine_error:
                    logger.error(f"Error combining files: {str(combine_error)}")
                    logger.error(traceback.format_exc())
                    # Fall back to individual processing
                    combine_files = False
        
        # If not combining or combining failed, process files individually
        logger.info(f"Processing {len(file_paths)} files individually")
        for file_path in file_paths:
            file_name = os.path.basename(file_path)
            _, ext = os.path.splitext(file_path)
            ext = ext.lower()

            try:
                if ext == '.csv':
                    df = pd.read_csv(file_path, encoding='utf-8', on_bad_lines='skip')
                elif ext in ['.xlsx', '.xls']:
                    df = pd.read_excel(file_path)
                elif ext == '.json':
                    df = pd.read_json(file_path)
                else:
                    df = pd.read_csv(file_path, sep=None, engine='python', on_bad_lines='skip')

                logger.info(f"Successfully loaded file {file_name} with shape {df.shape}")

                summary = {
                    "shape": {"rows": df.shape[0], "columns": df.shape[1]},
                    "columns": list(df.columns),
                    "dtypes": {col: str(df[col].dtype) for col in df.columns},
                    "missing_data": {col: int(df[col].isnull().sum()) for col in df.columns},
                    "numeric_columns": {},
                    "categorical_columns": {}
                }

                for col in df.select_dtypes(include=['number']).columns:
                    summary["numeric_columns"][str(col)] = {
                        "min": float(df[col].min()) if not pd.isna(df[col].min()) else 0,
                        "max": float(df[col].max()) if not pd.isna(df[col].max()) else 0,
                        "mean": float(df[col].mean()) if not pd.isna(df[col].mean()) else 0,
                        "median": float(df[col].median()) if not pd.isna(df[col].median()) else 0,
                        "std": float(df[col].std()) if not pd.isna(df[col].std()) else 0
                    }

                for col in df.select_dtypes(include=['object', 'category']).columns:
                    value_counts = df[col].value_counts().head(10).to_dict()
                    # Convert keys to strings (in case they're not)
                    str_value_counts = {str(k): int(v) for k, v in value_counts.items()}
                    summary["categorical_columns"][str(col)] = str_value_counts

                file_data[file_name] = summary

            except Exception as file_error:
                logger.error(f"Error processing file {file_name}: {str(file_error)}")
                logger.error(traceback.format_exc())
                file_data[file_name] = {"error": str(file_error)}

        results = {
            "success": True,
            "data": file_data,
            "combined": False
        }

    except Exception as e:
        logger.error(f"Error in process_files_directly: {str(e)}")
        logger.error(traceback.format_exc())
        results = {
            "success": False,
            "error": str(e)
        }

    return results

def generate_dashboard_data_from_files(processed_data, file_paths, session_id, combine_files=False):
    """
    Generate dashboard data based on processed files.
    
    Args:
        processed_data: Dictionary with processed data information
        file_paths: List of paths to files
        session_id: Current session ID
        combine_files: Whether files were combined for analysis
        
    Returns:
        Dictionary with dashboard data
    """
    logger.info(f"Generating dashboard data from {len(file_paths)} files")
    logger.debug(f"Processed data keys: {processed_data.keys()}")
    
    dashboard_data = {
        "metrics": {},
        "chart_options": [],
        "visualizations": {}
    }
    
    try:
        # Extract metrics
        is_combined = processed_data.get("combined", False)
        total_rows = 0
        total_columns = 0
        unique_columns = set()
        file_count = len(file_paths)
        
        logger.debug(f"Processing metrics with is_combined={is_combined}, file_count={file_count}")
        
        # Check if we have any data to process
        if "data" not in processed_data or not processed_data["data"]:
            logger.warning("No data found in processed_data")
            # Provide minimal metrics
            dashboard_data["metrics"] = {
                "file_count": file_count,
                "total_rows": 0,
                "total_columns": 0,
                "unique_columns": 0,
                "session_id": session_id,
                "combined_analysis": is_combined
            }
            return dashboard_data
            
        # Get file metrics differently based on whether data is combined or not
        if is_combined:
            # For combined analysis, metrics are already aggregated
            combined_info = processed_data.get("data", {}).get("combined_data", {})
            logger.debug(f"Combined info keys: {combined_info.keys() if combined_info else 'None'}")
            
            if "shape" in combined_info:
                shape_info = combined_info["shape"]
                logger.debug(f"Shape info: {shape_info}")
                total_rows = shape_info.get("rows", 0)
                total_columns = shape_info.get("columns", 0)
                unique_columns = set(combined_info.get("columns", []))
                logger.info(f"Combined metrics: rows={total_rows}, cols={total_columns}, unique_cols={len(unique_columns)}")
            else:
                logger.warning("No shape information found in combined data")
        else:
            # For individual file analysis, sum up metrics
            logger.debug(f"Data keys in processed_data: {processed_data.get('data', {}).keys()}")
            
            for file_name, file_info in processed_data.get("data", {}).items():
                # Skip the combined_data key if it exists but we're in individual mode
                if file_name == "combined_data":
                    continue
                    
                logger.debug(f"Processing file metrics for {file_name}")
                
                if "shape" in file_info:
                    file_rows = file_info["shape"].get("rows", 0)
                    file_cols = file_info["shape"].get("columns", 0)
                    file_columns = file_info.get("columns", [])
                    
                    total_rows += file_rows
                    total_columns = max(total_columns, file_cols)  # Using max for total columns
                    unique_columns.update(file_columns)
                    
                    logger.debug(f"File {file_name}: rows={file_rows}, cols={file_cols}, columns={len(file_columns)}")
                else:
                    logger.warning(f"No shape information found for file {file_name}")
            
            logger.info(f"Individual metrics: rows={total_rows}, cols={total_columns}, unique_cols={len(unique_columns)}")
        
        # Create metrics object for dashboard
        metrics = {
            "file_count": file_count,
            "total_rows": total_rows,
            "total_columns": total_columns,  # Use actual column count
            "unique_columns": len(unique_columns),
            "session_id": session_id,
            "combined_analysis": is_combined
        }
        
        logger.info(f"Final metrics: {metrics}")
        dashboard_data["metrics"] = metrics
        
        # Generate chart options
        chart_options = []
        
        # Load the first file to generate chart previews
        if file_paths:
            df = load_dataframe(file_paths[0])
            if df is not None:
                # Generate chart options based on data types
                chart_types = [
                    {"id": "line_chart", "name": "Line Chart", "icon": "chart-line"},
                    {"id": "bar_chart", "name": "Bar Chart", "icon": "chart-bar"},
                    {"id": "pie_chart", "name": "Pie Chart", "icon": "chart-pie"},
                    {"id": "histogram", "name": "Histogram", "icon": "chart-column"},
                    {"id": "scatter_plot", "name": "Scatter Plot", "icon": "circle-dot"},
                    {"id": "box_plot", "name": "Box Plot", "icon": "chart-boxplot"},
                    {"id": "radar_chart", "name": "Radar Chart", "icon": "spider"},
                    {"id": "bubble_chart", "name": "Bubble Chart", "icon": "circle"}
                ]
                
                # Add suitable chart types based on data columns
                has_numeric = len(df.select_dtypes(include=['number']).columns) > 0
                has_categorical = len(df.select_dtypes(include=['object', 'category']).columns) > 0
                has_datetime = len(df.select_dtypes(include=['datetime']).columns) > 0
                has_multiple_numeric = len(df.select_dtypes(include=['number']).columns) >= 2
                
                for chart_type in chart_types:
                    is_suitable = False
                    
                    if chart_type["id"] in ["line_chart"]:
                        is_suitable = has_numeric and has_datetime
                    elif chart_type["id"] in ["bar_chart"]:
                        is_suitable = has_numeric and has_categorical
                    elif chart_type["id"] in ["pie_chart"]:
                        is_suitable = has_categorical
                    elif chart_type["id"] in ["histogram", "box_plot"]:
                        is_suitable = has_numeric
                    elif chart_type["id"] in ["scatter_plot", "bubble_chart"]:
                        is_suitable = has_multiple_numeric
                    elif chart_type["id"] in ["radar_chart"]:
                        is_suitable = has_multiple_numeric and has_categorical
                    
                    chart_options.append({
                        "id": chart_type["id"],
                        "name": chart_type["name"],
                        "icon": chart_type["icon"],
                        "suitable": is_suitable
                    })
                
                # Generate some initial visualizations
                visualizer = DataVisualizer()
                dashboard_data["visualizations"] = visualizer.generate_visualizations(file_paths)
        
        dashboard_data["chart_options"] = chart_options
        
    except Exception as e:
        logger.error(f"Error in generate_dashboard_data_from_files: {str(e)}")
        logger.error(traceback.format_exc())
        dashboard_data["error"] = str(e)
    
    return dashboard_data

@main.route('/api/chart', methods=['POST'])
@login_required
def generate_chart():
    """
    Generate a specific chart based on request.
    """
    try:
        data = request.get_json()
        chart_type = data.get('chart_type')
        file_index = data.get('file_index', 0)
        
        logger.info(f"Chart generation request received - Type: {chart_type}, File Index: {file_index}")
        
        if 'session_id' not in session:
            logger.warning("No active session found for chart generation")
            return jsonify({"success": False, "error": "No active session"}), 400
            
        session_id = session['session_id']
        upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
        session_folder = os.path.join(upload_folder, session_id)
        
        if not os.path.exists(session_folder):
            logger.warning(f"Session folder not found: {session_folder}")
            return jsonify({"success": False, "error": "No files found for session"}), 404
            
        # Get all files in session folder
        files = [os.path.join(session_folder, f) for f in os.listdir(session_folder)
                if os.path.isfile(os.path.join(session_folder, f))]
                
        if not files:
            logger.warning(f"No files found in session folder: {session_folder}")
            return jsonify({"success": False, "error": "No files found"}), 404
        
        # Log available files for debugging
        logger.debug(f"Available files: {[os.path.basename(f) for f in files]}")
        
        # Safely handle file index
        if isinstance(file_index, str):
            try:
                file_index = int(file_index)
            except ValueError:
                logger.warning(f"Invalid file index format: {file_index}, defaulting to 0")
                file_index = 0
                
        # Use the specified file if index is valid, otherwise use the first file
        if 0 <= file_index < len(files):
            file_path = files[file_index]
            logger.info(f"Using file at index {file_index}: {os.path.basename(file_path)}")
        else:
            file_path = files[0]
            logger.warning(f"File index {file_index} out of range, using first file: {os.path.basename(file_path)}")
            
        # Load dataframe from selected file
        logger.debug(f"Loading dataframe from {file_path}")
        df = load_dataframe(file_path)
        
        if df is None:
            return jsonify({"success": False, "error": "Could not load file"}), 500
            
        visualizer = DataVisualizer()
        
        if chart_type == 'line_chart':
            chart_data = visualizer.generate_line_chart(df)
        elif chart_type == 'bar_chart':
            chart_data = visualizer.generate_bar_chart(df)
        elif chart_type == 'pie_chart':
            chart_data = visualizer.generate_pie_chart(df)
        elif chart_type == 'histogram':
            chart_data = visualizer.generate_histogram(df)
        elif chart_type == 'scatter_plot':
            chart_data = visualizer.generate_scatter_plot(df)
        elif chart_type == 'box_plot':
            chart_data = visualizer.generate_box_plot(df)
        elif chart_type == 'radar_chart':
            chart_data = visualizer.generate_radar_chart(df)
        elif chart_type == 'bubble_chart':
            chart_data = visualizer.generate_bubble_chart(df)
        else:
            return jsonify({"success": False, "error": f"Unsupported chart type: {chart_type}"}), 400
            
        # Save the generated chart
        chart_json = json.dumps(chart_data)
        saved_chart = SavedChart(
            user_id=current_user.id,
            chart_type=chart_type,
            chart_title=f"{chart_type.replace('_', ' ').title()} - {os.path.basename(file_path)}",
            chart_data=chart_json
        )
        
        db.session.add(saved_chart)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "chart_id": saved_chart.id,
            "chart_data": chart_data
        })
        
    except Exception as e:
        logger.error(f"Error generating chart: {str(e)}")
        logger.error(traceback.format_exc())
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@main.route('/api/chat', methods=['POST'])
@login_required
def chat_with_ai():
    """
    Process user message and get AI response.
    """
    try:
        data = request.get_json()
        message = data.get('message')
        conversation_id = data.get('conversation_id')
        session_id = session.get('session_id')
        
        if not message:
            return jsonify({"success": False, "error": "No message provided"}), 400
            
        # Get or create conversation
        if conversation_id:
            conversation = Conversation.query.filter_by(id=conversation_id, user_id=current_user.id).first()
            if not conversation:
                return jsonify({"success": False, "error": "Conversation not found"}), 404
        else:
            # Create new conversation
            conversation = Conversation(
                user_id=current_user.id,
                title=f"Conversation {datetime.now().strftime('%Y-%m-%d %H:%M')}"
            )
            db.session.add(conversation)
            db.session.commit()
            
        # Save user message
        user_message = Message(
            conversation_id=conversation.id,
            is_user=True,
            content=message
        )
        db.session.add(user_message)
        
        # Get AI response
        ai_client = get_ai_instance()
        
        if ai_client:
            # Get file data if available
            file_data = None
            if session_id:
                upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
                session_folder = os.path.join(upload_folder, session_id)
                
                if os.path.exists(session_folder):
                    files = [os.path.join(session_folder, f) for f in os.listdir(session_folder)
                            if os.path.isfile(os.path.join(session_folder, f))]
                    
                    if files:
                        file_data = process_files_directly(files)
            
            # Get chat history
            chat_history = []
            for msg in conversation.messages.order_by(Message.timestamp).all():
                role = "user" if msg.is_user else "assistant"
                chat_history.append({"role": role, "content": msg.content})
            
            # Generate AI response
            ai_response_text = ai_client.chat(message, chat_history, file_data)
            
            # Save AI response
            ai_message = Message(
                conversation_id=conversation.id,
                is_user=False,
                content=ai_response_text
            )
            db.session.add(ai_message)
            db.session.commit()
            
            return jsonify({
                "success": True,
                "conversation_id": conversation.id,
                "response": ai_response_text
            })
        else:
            return jsonify({
                "success": False,
                "error": "AI service is not available"
            }), 503
            
    except Exception as e:
        logger.error(f"Error in chat_with_ai: {str(e)}")
        logger.error(traceback.format_exc())
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@main.route('/api/conversations', methods=['GET'])
@login_required
def get_conversations():
    """
    Get user conversations.
    """
    try:
        conversations = Conversation.query.filter_by(user_id=current_user.id).order_by(Conversation.created_at.desc()).all()
        
        result = []
        for conv in conversations:
            result.append({
                "id": conv.id,
                "title": conv.title,
                "created_at": conv.created_at.isoformat(),
                "message_count": conv.messages.count()
            })
            
        return jsonify({
            "success": True,
            "conversations": result
        })
        
    except Exception as e:
        logger.error(f"Error getting conversations: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"success": False, "error": str(e)}), 500

@main.route('/api/conversations/<int:conversation_id>', methods=['GET'])
@login_required
def get_conversation(conversation_id):
    """
    Get messages for a specific conversation.
    """
    try:
        conversation = Conversation.query.filter_by(id=conversation_id, user_id=current_user.id).first()
        
        if not conversation:
            return jsonify({"success": False, "error": "Conversation not found"}), 404
            
        messages = []
        for msg in conversation.messages.order_by(Message.timestamp).all():
            messages.append({
                "id": msg.id,
                "content": msg.content,
                "is_user": msg.is_user,
                "timestamp": msg.timestamp.isoformat()
            })
            
        return jsonify({
            "success": True,
            "conversation": {
                "id": conversation.id,
                "title": conversation.title,
                "created_at": conversation.created_at.isoformat(),
                "messages": messages
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting conversation: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"success": False, "error": str(e)}), 500

@main.route('/api/report/generate', methods=['POST'])
@login_required
def generate_report():
    """
    Generate a report from selected charts.
    """
    try:
        data = request.get_json()
        chart_ids = data.get('chart_ids', [])
        title = data.get('title', f"Report {datetime.now().strftime('%Y-%m-%d %H:%M')}")
        description = data.get('description', '')
        
        if not chart_ids:
            return jsonify({"success": False, "error": "No charts selected"}), 400
            
        # Verify all charts belong to the user
        for chart_id in chart_ids:
            chart = SavedChart.query.filter_by(id=chart_id).first()
            if not chart or chart.user_id != current_user.id:
                return jsonify({"success": False, "error": f"Chart {chart_id} not found or not owned by user"}), 404
                
        # Create new report
        report = Report(
            user_id=current_user.id,
            title=title,
            description=description,
            chart_ids=json.dumps(chart_ids)
        )
        
        db.session.add(report)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "report_id": report.id,
            "message": "Report generated successfully"
        })
        
    except Exception as e:
        logger.error(f"Error generating report: {str(e)}")
        logger.error(traceback.format_exc())
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@main.route('/api/charts/saved', methods=['GET'])
@login_required
def get_saved_charts():
    """
    Get user's saved charts.
    """
    try:
        charts = SavedChart.query.filter_by(user_id=current_user.id).order_by(SavedChart.created_at.desc()).all()
        
        result = []
        for chart in charts:
            result.append({
                "id": chart.id,
                "title": chart.chart_title,
                "type": chart.chart_type,
                "created_at": chart.created_at.isoformat()
            })
            
        return jsonify({
            "success": True,
            "charts": result
        })
        
    except Exception as e:
        logger.error(f"Error getting saved charts: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"success": False, "error": str(e)}), 500

@main.route('/api/charts/<int:chart_id>', methods=['GET'])
@login_required
def get_chart(chart_id):
    """
    Get a specific chart.
    """
    try:
        chart = SavedChart.query.filter_by(id=chart_id, user_id=current_user.id).first()
        
        if not chart:
            return jsonify({"success": False, "error": "Chart not found"}), 404
            
        chart_data = json.loads(chart.chart_data)
        
        return jsonify({
            "success": True,
            "chart": {
                "id": chart.id,
                "title": chart.chart_title,
                "type": chart.chart_type,
                "data": chart_data,
                "created_at": chart.created_at.isoformat()
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting chart: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"success": False, "error": str(e)}), 500

@main.route('/api/reports', methods=['GET'])
@login_required
def get_reports():
    """
    Get user's reports.
    """
    try:
        reports = Report.query.filter_by(user_id=current_user.id).order_by(Report.created_at.desc()).all()
        
        result = []
        for report in reports:
            chart_ids = json.loads(report.chart_ids)
            result.append({
                "id": report.id,
                "title": report.title,
                "description": report.description,
                "chart_count": len(chart_ids),
                "created_at": report.created_at.isoformat()
            })
            
        return jsonify({
            "success": True,
            "reports": result
        })
        
    except Exception as e:
        logger.error(f"Error getting reports: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"success": False, "error": str(e)}), 500

@main.route('/api/reports/<int:report_id>', methods=['GET'])
@login_required
def get_report(report_id):
    """
    Get a specific report with its charts.
    """
    try:
        report = Report.query.filter_by(id=report_id, user_id=current_user.id).first()
        
        if not report:
            return jsonify({"success": False, "error": "Report not found"}), 404
            
        chart_ids = json.loads(report.chart_ids)
        charts = []
        
        for chart_id in chart_ids:
            chart = SavedChart.query.filter_by(id=chart_id).first()
            if chart:
                charts.append({
                    "id": chart.id,
                    "title": chart.chart_title,
                    "type": chart.chart_type,
                    "data": json.loads(chart.chart_data)
                })
                
        return jsonify({
            "success": True,
            "report": {
                "id": report.id,
                "title": report.title,
                "description": report.description,
                "created_at": report.created_at.isoformat(),
                "charts": charts
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting report: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"success": False, "error": str(e)}), 500

@main.route('/api/welcome-message', methods=['GET'])
@login_required
def get_welcome_message():
    """
    Get AI welcome message with suggested prompts.
    """
    try:
        welcome_message = "👋 Hello! I'm your AI assistant. I can help analyze your data and provide insights. What would you like to know about your files?"
        
        suggested_prompts = [
            "Suggest charts that fit my files",
            "Give me a brief analysis",
            "What patterns do you see in my data?",
            "How can I improve data quality?"
        ]
        
        return jsonify({
            "success": True,
            "welcome_message": welcome_message,
            "suggested_prompts": suggested_prompts
        })
        
    except Exception as e:
        logger.error(f"Error getting welcome message: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"success": False, "error": str(e)}), 500
