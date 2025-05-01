import pandas as pd
import numpy as np
import os
import json
import logging
import traceback
from pathlib import Path

# Set up logging
logging.basicConfig(level=logging.DEBUG,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DataProcessor:
    """Process data files and extract information."""
    
    def __init__(self):
        """Initialize the DataProcessor."""
        logger.info("DataProcessor initialized")
    
    def process_file(self, file_path):
        """
        Process a data file and return summary information.
        
        Args:
            file_path: Path to the data file
            
        Returns:
            Dictionary with processed data information
        """
        try:
            logger.info(f"Processing file: {file_path}")
            
            # Get file extension
            _, ext = os.path.splitext(file_path)
            ext = ext.lower()
            
            # Load the file into a DataFrame
            df = self.load_dataframe(file_path)
            
            if df is None:
                return {"success": False, "error": "Failed to load file"}
            
            # Generate summary statistics
            summary = self.generate_summary(df)
            
            return {
                "success": True,
                "summary": summary,
                "file_type": ext,
                "file_name": os.path.basename(file_path)
            }
            
        except Exception as e:
            logger.error(f"Error processing file {file_path}: {str(e)}")
            logger.error(traceback.format_exc())
            return {"success": False, "error": str(e)}
    
    def load_dataframe(self, file_path):
        """
        Load a file into a pandas DataFrame.
        
        Args:
            file_path: Path to the data file
            
        Returns:
            pandas DataFrame or None if loading fails
        """
        try:
            # Get file extension
            _, ext = os.path.splitext(file_path)
            ext = ext.lower()
            
            # Load based on file type
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
                    # Try loading as dictionary if array format fails
                    with open(file_path, 'r') as f:
                        data = json.load(f)
                    if isinstance(data, dict):
                        df = pd.DataFrame.from_dict(data, orient='index')
                    else:
                        df = pd.DataFrame(data)
            elif ext in ['.txt', '.dat']:
                # Try to infer delimiter
                df = pd.read_csv(file_path, sep=None, engine='python')
            else:
                logger.warning(f"Unsupported file type: {ext}")
                return None
            
            logger.info(f"Successfully loaded dataframe with shape: {df.shape}")
            return df
            
        except Exception as e:
            logger.error(f"Error loading file {file_path}: {str(e)}")
            logger.error(traceback.format_exc())
            return None
    
    def generate_summary(self, df):
        """
        Generate summary statistics for a DataFrame.
        
        Args:
            df: pandas DataFrame
            
        Returns:
            Dictionary with summary statistics
        """
        try:
            # Basic information
            summary = {
                "shape": {"rows": df.shape[0], "columns": df.shape[1]},
                "columns": list(df.columns),
                "dtypes": {col: str(df[col].dtype) for col in df.columns},
                "missing_data": {col: int(df[col].isnull().sum()) for col in df.columns},
                "numeric_columns": {},
                "categorical_columns": {},
                "total_missing": int(df.isnull().sum().sum()),
                "missing_percentage": float(df.isnull().sum().sum() / (df.shape[0] * df.shape[1]) * 100)
            }
            
            # Numeric column statistics
            for col in df.select_dtypes(include=['number']).columns:
                col_data = df[col].dropna()
                if len(col_data) > 0:
                    summary["numeric_columns"][str(col)] = {
                        "min": float(col_data.min()),
                        "max": float(col_data.max()),
                        "mean": float(col_data.mean()),
                        "median": float(col_data.median()),
                        "std": float(col_data.std()),
                        "missing": int(df[col].isnull().sum()),
                        "missing_percentage": float(df[col].isnull().sum() / len(df) * 100)
                    }
            
            # Categorical column statistics
            for col in df.select_dtypes(include=['object', 'category']).columns:
                value_counts = df[col].value_counts().head(10).to_dict()
                # Convert keys to strings (in case they're not)
                str_value_counts = {str(k): int(v) for k, v in value_counts.items()}
                
                summary["categorical_columns"][str(col)] = {
                    "value_counts": str_value_counts,
                    "unique_count": int(df[col].nunique()),
                    "missing": int(df[col].isnull().sum()),
                    "missing_percentage": float(df[col].isnull().sum() / len(df) * 100)
                }
            
            # Try to detect datetime columns and convert them
            for col in df.columns:
                if col not in summary["numeric_columns"] and col not in summary["categorical_columns"]:
                    try:
                        # Try to convert to datetime
                        pd.to_datetime(df[col])
                        summary["datetime_columns"] = summary.get("datetime_columns", {})
                        summary["datetime_columns"][str(col)] = {
                            "min": str(pd.to_datetime(df[col]).min()),
                            "max": str(pd.to_datetime(df[col]).max()),
                            "missing": int(df[col].isnull().sum()),
                            "missing_percentage": float(df[col].isnull().sum() / len(df) * 100)
                        }
                    except:
                        pass
            
            return summary
            
        except Exception as e:
            logger.error(f"Error generating summary: {str(e)}")
            logger.error(traceback.format_exc())
            return {"error": str(e)}
