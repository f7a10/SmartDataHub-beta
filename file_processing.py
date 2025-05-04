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
                    # Try with different encodings and error handling
                    for encoding in ['utf-8', 'latin1', 'cp1252']:
                        try:
                            df = pd.read_csv(file_path, encoding=encoding, on_bad_lines='skip')
                            break
                        except UnicodeDecodeError:
                            continue
                        except Exception as e:
                            logger.warning(f"Error with encoding {encoding}: {str(e)}")
                    else:
                        # If all encodings fail, try with a more permissive approach
                        df = pd.read_csv(file_path, encoding='latin1', on_bad_lines='skip', 
                                         error_bad_lines=False, warn_bad_lines=True)
                except Exception as csv_err:
                    logger.warning(f"CSV read error: {str(csv_err)}")
                    # Last resort: try to read with engine='python' which can sometimes handle problematic files
                    df = pd.read_csv(file_path, encoding='latin1', engine='python', on_bad_lines='skip')
            
            elif ext in ['.xlsx', '.xls']:
                try:
                    # Try standard Excel read
                    df = pd.read_excel(file_path)
                except Exception as excel_err:
                    logger.warning(f"Excel read error: {str(excel_err)}")
                    # Try with sheet_name parameter to get first sheet
                    xl = pd.ExcelFile(file_path)
                    if len(xl.sheet_names) > 0:
                        df = pd.read_excel(file_path, sheet_name=xl.sheet_names[0])
                    else:
                        raise ValueError("No valid sheets found in Excel file")
            
            elif ext == '.json':
                try:
                    # Standard JSON format
                    df = pd.read_json(file_path)
                except ValueError as json_err:
                    logger.warning(f"JSON format error: {str(json_err)}")
                    # Try multiple approaches for non-standard JSON
                    with open(file_path, 'r', encoding='utf-8') as f:
                        try:
                            data = json.load(f)
                            
                            # Handle different JSON structures
                            if isinstance(data, dict):
                                if any(isinstance(v, dict) for v in data.values()):
                                    # Nested dictionary - normalize it
                                    df = pd.json_normalize(data)
                                else:
                                    # Simple dictionary
                                    df = pd.DataFrame.from_dict(data, orient='index')
                            elif isinstance(data, list):
                                if all(isinstance(item, dict) for item in data):
                                    # List of dictionaries
                                    df = pd.DataFrame(data)
                                else:
                                    # List of values
                                    df = pd.DataFrame(data)
                            else:
                                # Unknown structure
                                df = pd.DataFrame([data])
                                
                        except Exception as e:
                            # Try line-delimited JSON
                            try:
                                records = []
                                with open(file_path, 'r', encoding='utf-8') as f:
                                    for line in f:
                                        try:
                                            records.append(json.loads(line))
                                        except json.JSONDecodeError:
                                            continue
                                if records:
                                    df = pd.DataFrame(records)
                                else:
                                    raise ValueError("No valid JSON records found")
                            except Exception:
                                raise ValueError(f"Unable to parse JSON file: {str(e)}")
            
            elif ext in ['.txt', '.dat']:
                # Try multiple delimiters and infer the best one
                try:
                    # First try to let pandas infer the delimiter
                    df = pd.read_csv(file_path, sep=None, engine='python')
                except Exception as txt_err:
                    logger.warning(f"Text file inference error: {str(txt_err)}")
                    # Try common delimiters if inference fails
                    for sep in [',', '\t', '|', ';', ' ']:
                        try:
                            df = pd.read_csv(file_path, sep=sep, on_bad_lines='skip')
                            # Check if we got more than one column, if not continue trying
                            if df.shape[1] > 1:
                                break
                        except:
                            continue
                    else:
                        # If all separators fail, try fixed width
                        df = pd.read_fwf(file_path)
            else:
                logger.warning(f"Unsupported file type: {ext}")
                return None
            
            # Post-processing to clean up dataframe
            # Replace empty strings with NaN
            df.replace('', pd.NA, inplace=True)
            
            # Convert object columns that should be numeric
            for col in df.select_dtypes(include=['object']).columns:
                try:
                    # Check if column can be converted to numeric
                    numeric_values = pd.to_numeric(df[col], errors='coerce')
                    # If more than 80% of values are valid numbers, convert the column
                    if numeric_values.notna().mean() > 0.8:
                        df[col] = numeric_values
                except:
                    pass
            
            # Check for date columns and convert them
            for col in df.select_dtypes(include=['object']).columns:
                try:
                    # Try to convert to datetime
                    dt_col = pd.to_datetime(df[col], errors='coerce')
                    # If more than 80% are valid dates, convert the column
                    if dt_col.notna().mean() > 0.8:
                        df[col] = dt_col
                except:
                    pass
            
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
