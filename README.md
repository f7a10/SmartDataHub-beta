# Smart Data Sense

An AI-powered data analysis platform that enables users to transform complex data into meaningful insights through interactive visualizations, advanced AI analysis capabilities, and user-friendly dashboard management.

## Features

- Data file upload and processing (CSV, Excel, JSON, TXT)
- Interactive data visualizations
- AI-powered data analysis insights
- Saved charts and reports management
- PDF report generation
- Conversation history with AI assistant

## Running Locally

### Requirements

- Python 3.8 or higher
- Virtual environment (recommended)

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd SmartDataSense
   ```

2. Create and activate a virtual environment (optional but recommended):
   ```
   # On Windows
   python -m venv venv
   venv\Scripts\activate

   # On macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install dependencies:
   ```
   pip install -r requirements-local.txt
   ```

4. Run the application:
   ```
   python run.py
   ```

5. Open your browser and navigate to:
   ```
   http://127.0.0.1:5000
   ```

### Environment Variables

These environment variables are optional when running locally (defaults will be used):

- `DATABASE_URL`: Connection string for PostgreSQL database (defaults to SQLite)
- `SESSION_SECRET`: Secret key for session management (defaults to a development key)
- `PORT`: Port to run the application on (defaults to 5000)
- `HOST`: Host to run the application on (defaults to 127.0.0.1)

### API Keys (Optional)

For AI features to work fully, you'll need:

- An OpenRouter API key (set as `OPENROUTER_API_KEY` environment variable)

## Project Structure

- `app.py`: Application factory and configuration
- `config.py`: Configuration settings
- `main.py`: Entry point for web servers like Gunicorn
- `models.py`: Database models
- `routes.py`: Route handlers and API endpoints
- `ai_integration.py`: AI assistant integration
- `file_processing.py`: Data file processing utilities
- `visualization.py`: Data visualization generation
- `templates/`: HTML templates
- `static/`: CSS, JavaScript, and other static files
- `uploads/`: Temporary storage for uploaded files
- `instance/`: Instance-specific files (SQLite database when used locally)

## License

[MIT License](LICENSE)