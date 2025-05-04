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
            logger.info(f"Loading file: {os.path.basename(file_path)}")
            
            # Get file extension
            _, ext = os.path.splitext(file_path)
            ext = ext.lower()
            
            # Load based on file type
            if ext == '.csv':
                try:
                    # First check file content to determine the best approach
                    with open(file_path, 'rb') as f:
                        sample = f.read(4096)
                        sample_str = str(sample)
                    
                    # Detect potential delimiters
                    potential_delimiters = []
                    for delim in [',', '\t', ';', '|']:
                        if delim in sample_str:
                            potential_delimiters.append(delim)
                    
                    logger.debug(f"Potential delimiters detected: {potential_delimiters}")
                    
                    # Try with different encodings and potential delimiters
                    best_df = None
                    max_columns = 0
                    
                    for encoding in ['utf-8', 'latin1', 'cp1252']:
                        # If we found a good dataframe, no need to try more encodings
                        if best_df is not None and best_df.shape[1] >= 6:
                            break
                            
                        # Try auto-detection first
                        try:
                            df = pd.read_csv(file_path, encoding=encoding, on_bad_lines='skip', engine='python')
                            if df.shape[1] > max_columns:
                                best_df = df
                                max_columns = df.shape[1]
                                logger.debug(f"Auto-detected delimiter with encoding {encoding} found {df.shape[1]} columns")
                        except Exception as e:
                            logger.debug(f"Auto-detection failed with encoding {encoding}: {str(e)}")
                        
                        # Try each potential delimiter
                        for sep in potential_delimiters:
                            try:
                                df = pd.read_csv(file_path, encoding=encoding, sep=sep, on_bad_lines='skip')
                                if df.shape[1] > max_columns:
                                    best_df = df
                                    max_columns = df.shape[1]
                                    logger.debug(f"Delimiter '{sep}' with encoding {encoding} found {df.shape[1]} columns")
                            except Exception as e:
                                logger.debug(f"Error with delimiter '{sep}' and encoding {encoding}: {str(e)}")
                    
                    # If we found a dataframe with columns, use it
                    if best_df is not None:
                        df = best_df
                        logger.info(f"Selected dataframe with {df.shape[1]} columns")
                    else:
                        # If all approaches failed, try one more flexible approach
                        logger.warning("All standard approaches failed, trying flexible CSV reading")
                        df = pd.read_csv(file_path, encoding='latin1', engine='python', 
                                        on_bad_lines='skip', sep=None)
                        
                except Exception as csv_err:
                    logger.warning(f"CSV read error, trying alternative approach: {str(csv_err)}")
                    # Last resort: try with fixed width format
                    df = pd.read_fwf(file_path, encoding='latin1')
            
            elif ext in ['.xlsx', '.xls']:
                try:
                    # First try standard Excel read
                    df = pd.read_excel(file_path)
                except Exception as excel_err:
                    logger.warning(f"Excel read error: {str(excel_err)}")
                    # Try reading all sheets and select the one with most columns
                    try:
                        xl = pd.ExcelFile(file_path)
                        if len(xl.sheet_names) > 0:
                            best_sheet = None
                            max_columns = 0
                            
                            for sheet in xl.sheet_names:
                                try:
                                    sheet_df = pd.read_excel(file_path, sheet_name=sheet)
                                    if sheet_df.shape[1] > max_columns:
                                        best_sheet = sheet
                                        max_columns = sheet_df.shape[1]
                                except:
                                    continue
                            
                            if best_sheet:
                                df = pd.read_excel(file_path, sheet_name=best_sheet)
                                logger.info(f"Selected sheet '{best_sheet}' with {df.shape[1]} columns")
                            else:
                                df = pd.read_excel(file_path, sheet_name=xl.sheet_names[0])
                        else:
                            raise ValueError("No valid sheets found in Excel file")
                    except Exception as e:
                        logger.error(f"Failed to read Excel file: {str(e)}")
                        raise e
            
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
                # Try multiple approaches to find the best delimiter
                best_df = None
                max_columns = 0
                
                # Try inferring delimiter with python engine
                try:
                    df = pd.read_csv(file_path, sep=None, engine='python')
                    if df.shape[1] > max_columns:
                        best_df = df
                        max_columns = df.shape[1]
                except Exception as e:
                    logger.debug(f"Error inferring delimiter: {str(e)}")
                
                # Try common delimiters explicitly
                for sep in [',', '\t', '|', ';', ' ']:
                    try:
                        df = pd.read_csv(file_path, sep=sep, on_bad_lines='skip')
                        if df.shape[1] > max_columns:
                            best_df = df
                            max_columns = df.shape[1]
                            logger.debug(f"Delimiter '{sep}' found {df.shape[1]} columns")
                    except Exception as e:
                        logger.debug(f"Error with delimiter '{sep}': {str(e)}")
                
                # Try fixed width if other methods don't find many columns
                if max_columns < 3:
                    try:
                        df = pd.read_fwf(file_path)
                        if df.shape[1] > max_columns:
                            best_df = df
                            max_columns = df.shape[1]
                            logger.debug(f"Fixed width format found {df.shape[1]} columns")
                    except Exception as e:
                        logger.debug(f"Error with fixed width format: {str(e)}")
                
                # Use the best dataframe we found
                if best_df is not None:
                    df = best_df
                    logger.info(f"Selected text file parsing method with {df.shape[1]} columns")
                else:
                    raise ValueError("Unable to parse text file with any method")
            else:
                logger.warning(f"Unsupported file type: {ext}")
                return None
            
            # Post-processing to clean up dataframe
            # Replace empty strings with NaN
            df.replace('', pd.NA, inplace=True)
            
            # Check for columns that are all NaN and drop them
            if df.shape[1] > 0:
                columns_to_drop = [col for col in df.columns if df[col].isna().all()]
                if columns_to_drop:
                    logger.info(f"Dropping {len(columns_to_drop)} columns that contain only NaN values")
                    df = df.drop(columns=columns_to_drop)
            
            # Convert object columns that should be numeric
            for col in df.select_dtypes(include=['object']).columns:
                try:
                    # Check if column can be converted to numeric
                    numeric_values = pd.to_numeric(df[col], errors='coerce')
                    # If more than 70% of values are valid numbers, convert the column
                    if numeric_values.notna().mean() > 0.7:
                        df[col] = numeric_values
                except:
                    pass
            
            # Check for date columns and convert them
            for col in df.select_dtypes(include=['object']).columns:
                try:
                    # Try to convert to datetime
                    dt_col = pd.to_datetime(df[col], errors='coerce')
                    # If more than 70% are valid dates, convert the column
                    if dt_col.notna().mean() > 0.7:
                        df[col] = dt_col
                except:
                    pass
            
            logger.info(f"Successfully loaded dataframe with shape: {df.shape}")
            
            # Check the shape, if we have columns but only 1 row, transpose might work better
            if df.shape[1] >= 1 and df.shape[0] == 1:
                try:
                    transposed = df.T
                    logger.info(f"Transposing dataframe to shape: {transposed.shape}")
                    if transposed.shape[1] >= 1:
                        # Only use transpose if it gives us at least one column
                        df = transposed
                except Exception as e:
                    logger.warning(f"Error attempting to transpose: {str(e)}")
            
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
