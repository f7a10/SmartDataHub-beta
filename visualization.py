import pandas as pd
import numpy as np
import json
import logging
import os
import traceback
import time
from typing import Dict, Any, List, Optional, Union

# Set up logging
logging.basicConfig(level=logging.DEBUG,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DataVisualizer:
    """Class for generating visualizations from data files."""

    def __init__(self):
        """Initialize the DataVisualizer."""
        logger.info("DataVisualizer initialized")

    def generate_visualizations(self, data_files: List[str], combine_files: bool = False) -> Dict[str, Any]:
        """
        Generate visualizations from a list of data files.

        Args:
            data_files: List of paths to data files
            combine_files: Whether to combine all files for analysis

        Returns:
            Dict containing visualization data
        """
        try:
            if not data_files:
                logger.warning("No data files provided")
                return {"error": "No data files provided"}
                
            logger.info(f"Generating visualizations for {len(data_files)} files (combine_files={combine_files})")
            logger.debug(f"Files to process: {[os.path.basename(f) for f in data_files]}")

            if combine_files and len(data_files) > 1:
                logger.info(f"Generating visualizations for {len(data_files)} combined files")
                
                # Load and combine all dataframes
                dfs = []
                for file_path in data_files:
                    file_name = os.path.basename(file_path)
                    logger.debug(f"Loading file for combined analysis: {file_name}")
                    df = self._load_file(file_path)
                    if df is not None:
                        # Add source column
                        df['_source_file'] = file_name
                        dfs.append(df)
                        logger.debug(f"Added file {file_name} with shape {df.shape} to combined analysis")
                    else:
                        logger.warning(f"Failed to load file {file_name} for combined analysis")
                
                if not dfs:
                    logger.error("Failed to load any files for visualization")
                    return {"error": "Failed to load any files"}
                
                # Combine all dataframes
                try:
                    df = pd.concat(dfs, ignore_index=True)
                    logger.info(f"Combined {len(dfs)} files into dataframe with shape {df.shape}")
                except Exception as e:
                    logger.error(f"Error combining dataframes: {str(e)}")
                    # Fall back to first file
                    df = dfs[0]
                    logger.warning(f"Falling back to first file with shape {df.shape}")
            else:
                # Just process the file(s) provided
                file_to_process = data_files[0]  # Start with the first file by default
                file_name = os.path.basename(file_to_process)
                logger.info(f"Generating visualizations for single file: {file_name}")

                # Load the dataframe
                df = self._load_file(file_to_process)
                if df is None:
                    logger.error(f"Failed to load file {file_name} for visualization")
                    return {"error": f"Failed to load file {file_name}"}

            # Generate visualizations
            visualizations = {
                "line_chart": self.generate_line_chart(df),
                "bar_chart": self.generate_bar_chart(df),
                "pie_chart": self.generate_pie_chart(df),
                "histogram": self.generate_histogram(df),
                "scatter_plot": self.generate_scatter_plot(df),
                "heatmap": self.generate_heatmap(df),
                "box_plot": self.generate_box_plot(df),
                "radar_chart": self.generate_radar_chart(df),
                "bubble_chart": self.generate_bubble_chart(df)
            }

            logger.info(f"Generated {len(visualizations)} visualizations")
            return visualizations

        except Exception as e:
            logger.error(f"Error in generate_visualizations: {str(e)}")
            logger.error(traceback.format_exc())
            return {"error": str(e)}

    def _load_file(self, file_path: str) -> Optional[pd.DataFrame]:
        """
        Load a file into a pandas DataFrame.

        Args:
            file_path: Path to the file

        Returns:
            Pandas DataFrame or None if loading fails
        """
        try:
            # Get file extension
            import os
            _, ext = os.path.splitext(file_path)
            ext = ext.lower()
            
            logger.info(f"Loading file with extension {ext}: {os.path.basename(file_path)}")

            # Load based on extension
            if ext == '.csv':
                try:
                    # Try with different encodings and error handling
                    for encoding in ['utf-8', 'latin1', 'cp1252']:
                        try:
                            # First try to detect delimiter
                            with open(file_path, 'rb') as f:
                                sample = f.read(4096)
                                
                            # Check if file might be tab-delimited
                            if b'\t' in sample:
                                logger.debug(f"Detected tab delimiter in {os.path.basename(file_path)}")
                                df = pd.read_csv(file_path, encoding=encoding, sep='\t', on_bad_lines='skip')
                            else:
                                df = pd.read_csv(file_path, encoding=encoding, on_bad_lines='skip')
                            
                            # Check if we have a reasonable number of columns
                            if df.shape[1] <= 1 and ',' in str(sample):
                                logger.debug(f"Single column detected, trying comma delimiter for {os.path.basename(file_path)}")
                                df = pd.read_csv(file_path, encoding=encoding, sep=',', on_bad_lines='skip')
                                
                            # Check if we need to try more delimiters for proper column detection
                            if df.shape[1] <= 2 and df.shape[0] > 0:
                                for sep in [';', '|', ' ']:
                                    try:
                                        test_df = pd.read_csv(file_path, encoding=encoding, sep=sep, on_bad_lines='skip')
                                        if test_df.shape[1] > df.shape[1]:
                                            logger.debug(f"Found better delimiter '{sep}' with {test_df.shape[1]} columns")
                                            df = test_df
                                    except:
                                        continue
                            
                            logger.debug(f"Successfully loaded with encoding {encoding}, shape: {df.shape}")
                            break
                        except UnicodeDecodeError:
                            continue
                        except Exception as e:
                            logger.warning(f"Error with encoding {encoding}: {str(e)}")
                    else:
                        # If all standard approaches fail, try with engine='python' which is more flexible
                        logger.debug(f"Trying python engine for {os.path.basename(file_path)}")
                        df = pd.read_csv(file_path, encoding='latin1', engine='python', on_bad_lines='skip')
                        
                except Exception as csv_err:
                    logger.warning(f"CSV read error, trying alternative approach: {str(csv_err)}")
                    # Last resort: try fixed width format if all else fails
                    df = pd.read_fwf(file_path, encoding='latin1')
                    
            elif ext in ['.xlsx', '.xls']:
                try:
                    # Standard Excel read
                    df = pd.read_excel(file_path)
                except Exception as excel_err:
                    logger.warning(f"Excel read error: {str(excel_err)}")
                    # Try with explicit sheet name
                    xl = pd.ExcelFile(file_path)
                    if len(xl.sheet_names) > 0:
                        df = pd.read_excel(file_path, sheet_name=xl.sheet_names[0])
                    else:
                        raise ValueError("No valid sheets found in Excel file")
                        
            elif ext == '.json':
                try:
                    df = pd.read_json(file_path)
                except ValueError:
                    # Try loading as dictionary if array format fails
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    if isinstance(data, dict):
                        if any(isinstance(v, dict) for v in data.values()):
                            # Nested dictionary - normalize it
                            df = pd.json_normalize(data)
                        else:
                            df = pd.DataFrame.from_dict(data, orient='index')
                    else:
                        df = pd.DataFrame(data)
                        
            elif ext in ['.txt', '.dat']:
                # Try multiple methods to detect the correct delimiter
                try:
                    # First try automatic inference
                    df = pd.read_csv(file_path, sep=None, engine='python')
                    
                    # Check if we have a reasonable number of columns (at least 2)
                    if df.shape[1] <= 1:
                        logger.debug(f"Only {df.shape[1]} columns detected, trying alternative delimiters")
                        best_df = df
                        
                        # Try common delimiters
                        for sep in [',', '\t', ';', '|', ' ']:
                            try:
                                test_df = pd.read_csv(file_path, sep=sep, on_bad_lines='skip')
                                if test_df.shape[1] > best_df.shape[1]:
                                    logger.debug(f"Found better delimiter '{sep}' with {test_df.shape[1]} columns")
                                    best_df = test_df
                            except:
                                continue
                                
                        # Use the dataframe with the most columns
                        if best_df.shape[1] > df.shape[1]:
                            df = best_df
                        
                except Exception as txt_err:
                    logger.warning(f"Text file read error: {str(txt_err)}")
                    # Try fixed width format as a last resort
                    df = pd.read_fwf(file_path)
            else:
                logger.warning(f"Unsupported file type: {ext}")
                return None

            # Post-process the dataframe
            # Handle empty strings and convert to appropriate types
            df.replace('', pd.NA, inplace=True)
            
            # Try to convert string columns to numeric where appropriate
            for col in df.select_dtypes(include=['object']).columns:
                try:
                    numeric_values = pd.to_numeric(df[col], errors='coerce')
                    # If more than 70% of values are valid numbers, convert the column
                    if numeric_values.notna().mean() > 0.7:
                        df[col] = numeric_values
                except:
                    pass
                    
            # Try to convert date-like columns to datetime
            for col in df.select_dtypes(include=['object']).columns:
                try:
                    date_values = pd.to_datetime(df[col], errors='coerce')
                    # If more than 70% are valid dates, convert the column
                    if date_values.notna().mean() > 0.7:
                        df[col] = date_values
                except:
                    pass
                    
            logger.info(f"Successfully loaded file with shape: {df.shape}")
            return df

        except Exception as e:
            logger.error(f"Error loading file {file_path}: {str(e)}")
            logger.error(traceback.format_exc())
            return None

    def generate_line_chart(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Generate data for a line chart from a dataframe.

        Args:
            df: Pandas DataFrame

        Returns:
            Dict with line chart data
        """
        try:
            # Check if we have datetime and numeric columns
            datetime_cols = df.select_dtypes(include=['datetime64']).columns.tolist()
            numeric_cols = df.select_dtypes(include=['number']).columns.tolist()

            if not datetime_cols and not numeric_cols:
                # Try to convert potential date columns
                for col in df.columns:
                    if 'date' in col.lower() or 'time' in col.lower():
                        try:
                            df[col] = pd.to_datetime(df[col])
                            datetime_cols.append(col)
                        except:
                            pass

            # If we have datetime and numeric columns, create a time series
            if datetime_cols and numeric_cols:
                date_col = datetime_cols[0]
                numeric_col = numeric_cols[0]

                # Sort by date and prepare data
                df_sorted = df.sort_values(by=date_col)

                # Ensure we don't have too many points (limit to 50)
                if len(df_sorted) > 50:
                    step = len(df_sorted) // 50 + 1
                    df_sorted = df_sorted.iloc[::step, :]

                # Format dates and extract values
                dates = df_sorted[date_col].dt.strftime('%Y-%m-%d').tolist()
                values = df_sorted[numeric_col].tolist()

                return {
                    "type": "line",
                    "labels": dates,
                    "datasets": [{
                        "label": numeric_col,
                        "data": values,
                        "borderColor": "#a855f7",
                        "backgroundColor": "rgba(168, 85, 247, 0.1)",
                        "tension": 0.4
                    }]
                }
            else:
                # If no datetime columns, use index as x-axis
                if numeric_cols:
                    numeric_col = numeric_cols[0]
                    values = df[numeric_col].tolist()
                    labels = list(range(len(values)))

                    return {
                        "type": "line",
                        "labels": labels,
                        "datasets": [{
                            "label": numeric_col,
                            "data": values,
                            "borderColor": "#a855f7",
                            "backgroundColor": "rgba(168, 85, 247, 0.1)",
                            "tension": 0.4
                        }]
                    }

                logger.warning("No suitable columns for line chart")
                return {"error": "No suitable columns for line chart"}

        except Exception as e:
            logger.error(f"Error generating line chart: {str(e)}")
            logger.error(traceback.format_exc())
            return {"error": str(e)}

    def generate_bar_chart(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Generate data for a bar chart from a dataframe.

        Args:
            df: Pandas DataFrame

        Returns:
            Dict with bar chart data
        """
        try:
            categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
            numeric_cols = df.select_dtypes(include=['number']).columns.tolist()

            if categorical_cols and numeric_cols:
                cat_col = categorical_cols[0]
                num_col = numeric_cols[0]

                # Aggregate data by category
                grouped = df.groupby(cat_col)[num_col].mean().reset_index()

                # Sort by value and get top 10
                grouped = grouped.sort_values(by=num_col, ascending=False).head(10)

                return {
                    "type": "bar",
                    "labels": grouped[cat_col].tolist(),
                    "datasets": [{
                        "label": f"Average {num_col} by {cat_col}",
                        "data": grouped[num_col].tolist(),
                        "backgroundColor": "rgba(168, 85, 247, 0.7)",
                        "borderColor": "#7928ca",
                        "borderWidth": 1
                    }]
                }
            else:
                logger.warning("No suitable columns for bar chart")
                return {"error": "No suitable columns for bar chart"}

        except Exception as e:
            logger.error(f"Error generating bar chart: {str(e)}")
            logger.error(traceback.format_exc())
            return {"error": str(e)}

    def generate_pie_chart(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Generate data for a pie chart from a dataframe.

        Args:
            df: Pandas DataFrame

        Returns:
            Dict with pie chart data
        """
        try:
            categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()

            if categorical_cols:
                cat_col = categorical_cols[0]

                # Get value counts
                value_counts = df[cat_col].value_counts()

                # Limit to top 8 categories
                if len(value_counts) > 8:
                    other_count = value_counts[8:].sum()
                    value_counts = value_counts.iloc[:7]
                    value_counts['Other'] = other_count

                # Generate colors
                colors = [
                    "rgba(168, 85, 247, 0.8)",
                    "rgba(121, 40, 202, 0.8)",
                    "rgba(192, 132, 252, 0.8)",
                    "rgba(139, 92, 246, 0.8)",
                    "rgba(124, 58, 237, 0.8)",
                    "rgba(109, 40, 217, 0.8)",
                    "rgba(91, 33, 182, 0.8)",
                    "rgba(76, 29, 149, 0.8)"
                ]

                return {
                    "type": "pie",
                    "labels": value_counts.index.tolist(),
                    "datasets": [{
                        "data": value_counts.values.tolist(),
                        "backgroundColor": colors[:len(value_counts)],
                        "borderColor": "rgba(30, 32, 50, 0.7)",
                        "borderWidth": 1
                    }]
                }
            else:
                logger.warning("No suitable columns for pie chart")
                return {"error": "No suitable columns for pie chart"}

        except Exception as e:
            logger.error(f"Error generating pie chart: {str(e)}")
            logger.error(traceback.format_exc())
            return {"error": str(e)}

    def generate_histogram(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Generate data for a histogram from a dataframe.

        Args:
            df: Pandas DataFrame

        Returns:
            Dict with histogram data
        """
        try:
            numeric_cols = df.select_dtypes(include=['number']).columns.tolist()

            if numeric_cols:
                num_col = numeric_cols[0]

                # Create histogram
                hist, bin_edges = np.histogram(df[num_col].dropna(), bins=10)

                # Create bin labels
                bin_labels = [f"{bin_edges[i]:.1f}-{bin_edges[i+1]:.1f}" for i in range(len(bin_edges)-1)]

                return {
                    "type": "bar",
                    "labels": bin_labels,
                    "datasets": [{
                        "label": f"Distribution of {num_col}",
                        "data": hist.tolist(),
                        "backgroundColor": "rgba(168, 85, 247, 0.7)",
                        "borderColor": "rgba(121, 40, 202, 0.8)",
                        "borderWidth": 1
                    }]
                }
            else:
                logger.warning("No suitable columns for histogram")
                return {"error": "No suitable columns for histogram"}

        except Exception as e:
            logger.error(f"Error generating histogram: {str(e)}")
            logger.error(traceback.format_exc())
            return {"error": str(e)}

    def generate_scatter_plot(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Generate data for a scatter plot from a dataframe.

        Args:
            df: Pandas DataFrame

        Returns:
            Dict with scatter plot data
        """
        try:
            numeric_cols = df.select_dtypes(include=['number']).columns.tolist()

            if len(numeric_cols) >= 2:
                x_col = numeric_cols[0]
                y_col = numeric_cols[1]

                # Limit to 100 points for performance
                df_sample = df.sample(min(100, len(df))) if len(df) > 100 else df

                # Create dataset
                data = [{"x": float(x), "y": float(y)} for x, y in zip(df_sample[x_col], df_sample[y_col])]

                return {
                    "type": "scatter",
                    "datasets": [{
                        "label": f"{x_col} vs {y_col}",
                        "data": data,
                        "backgroundColor": "rgba(168, 85, 247, 0.7)",
                        "borderColor": "rgba(121, 40, 202, 0.8)",
                        "borderWidth": 1,
                        "pointRadius": 5,
                        "pointHoverRadius": 7
                    }]
                }
            else:
                logger.warning("Not enough numeric columns for scatter plot")
                return {"error": "Not enough numeric columns for scatter plot"}

        except Exception as e:
            logger.error(f"Error generating scatter plot: {str(e)}")
            logger.error(traceback.format_exc())
            return {"error": str(e)}

    def generate_heatmap(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Generate data for a correlation heatmap from a dataframe.

        Args:
            df: Pandas DataFrame

        Returns:
            Dict with heatmap data
        """
        try:
            numeric_cols = df.select_dtypes(include=['number']).columns.tolist()

            if len(numeric_cols) >= 2:
                # Limit to 8 columns for readability
                selected_cols = numeric_cols[:8]

                # Calculate correlation matrix
                corr_matrix = df[selected_cols].corr().round(2)

                # Prepare data for heatmap
                labels = selected_cols
                datasets = []

                for i, row_label in enumerate(labels):
                    data = []
                    for j, col_label in enumerate(labels):
                        data.append({
                            "x": col_label,
                            "y": row_label,
                            "v": float(corr_matrix.iloc[i, j])
                        })
                    datasets.extend(data)

                return {
                    "type": "heatmap",
                    "labels": labels,
                    "datasets": datasets
                }
            else:
                logger.warning("Not enough numeric columns for heatmap")
                return {"error": "Not enough numeric columns for heatmap"}

        except Exception as e:
            logger.error(f"Error generating heatmap: {str(e)}")
            logger.error(traceback.format_exc())
            return {"error": str(e)}

    def generate_box_plot(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Generate data for a box plot from a dataframe.

        Args:
            df: Pandas DataFrame

        Returns:
            Dict with box plot data
        """
        try:
            numeric_cols = df.select_dtypes(include=['number']).columns.tolist()

            if numeric_cols:
                # Limit to first 5 numeric columns
                selected_cols = numeric_cols[:5]
                
                datasets = []
                
                for col in selected_cols:
                    # Calculate box plot values
                    data = df[col].dropna()
                    q1 = float(data.quantile(0.25))
                    median = float(data.median())
                    q3 = float(data.quantile(0.75))
                    iqr = q3 - q1
                    whisker_bottom = float(max(data.min(), q1 - 1.5 * iqr))
                    whisker_top = float(min(data.max(), q3 + 1.5 * iqr))
                    
                    # Define outliers
                    outliers = data[(data < whisker_bottom) | (data > whisker_top)].tolist()
                    
                    datasets.append({
                        "label": col,
                        "data": [{
                            "min": whisker_bottom,
                            "q1": q1,
                            "median": median,
                            "q3": q3,
                            "max": whisker_top,
                            "outliers": outliers[:20] if outliers else []  # Limit outliers to 20 points
                        }],
                        "backgroundColor": "rgba(168, 85, 247, 0.5)",
                        "borderColor": "rgba(121, 40, 202, 0.8)",
                        "borderWidth": 1
                    })
                
                return {
                    "type": "boxplot",
                    "labels": [""],  # Single label as we're showing multiple columns
                    "datasets": datasets
                }
            else:
                logger.warning("No suitable columns for box plot")
                return {"error": "No suitable columns for box plot"}
                
        except Exception as e:
            logger.error(f"Error generating box plot: {str(e)}")
            logger.error(traceback.format_exc())
            return {"error": str(e)}

    def generate_radar_chart(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Generate data for a radar chart from a dataframe.

        Args:
            df: Pandas DataFrame

        Returns:
            Dict with radar chart data
        """
        try:
            categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
            numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
            
            if categorical_cols and len(numeric_cols) >= 3:
                cat_col = categorical_cols[0]
                # Limit to first 5 numeric columns
                selected_numeric_cols = numeric_cols[:5]
                
                # Get top 3 categories
                top_categories = df[cat_col].value_counts().head(3).index.tolist()
                
                datasets = []
                bg_colors = [
                    "rgba(168, 85, 247, 0.2)",
                    "rgba(121, 40, 202, 0.2)",
                    "rgba(192, 132, 252, 0.2)"
                ]
                border_colors = [
                    "rgba(168, 85, 247, 1)",
                    "rgba(121, 40, 202, 1)",
                    "rgba(192, 132, 252, 1)"
                ]
                
                # For each category, create a dataset
                for i, category in enumerate(top_categories):
                    category_data = df[df[cat_col] == category]
                    
                    # Calculate mean for each numeric column
                    means = [float(category_data[col].mean()) for col in selected_numeric_cols]
                    
                    datasets.append({
                        "label": str(category),
                        "data": means,
                        "backgroundColor": bg_colors[i % len(bg_colors)],
                        "borderColor": border_colors[i % len(border_colors)],
                        "borderWidth": 1,
                        "pointBackgroundColor": border_colors[i % len(border_colors)]
                    })
                
                return {
                    "type": "radar",
                    "labels": selected_numeric_cols,
                    "datasets": datasets
                }
                
            else:
                logger.warning("Not enough suitable columns for radar chart")
                return {"error": "Not enough suitable columns for radar chart"}
                
        except Exception as e:
            logger.error(f"Error generating radar chart: {str(e)}")
            logger.error(traceback.format_exc())
            return {"error": str(e)}

    def generate_bubble_chart(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Generate data for a bubble chart from a dataframe.

        Args:
            df: Pandas DataFrame

        Returns:
            Dict with bubble chart data
        """
        try:
            numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
            
            if len(numeric_cols) >= 3:
                x_col = numeric_cols[0]
                y_col = numeric_cols[1]
                r_col = numeric_cols[2]  # Column for bubble size
                
                # Limit to 50 points for performance
                df_sample = df.sample(min(50, len(df))) if len(df) > 50 else df
                
                # Normalize radius values to a reasonable range (5-20)
                r_min = df_sample[r_col].min()
                r_max = df_sample[r_col].max()
                r_range = max(r_max - r_min, 1)  # Avoid division by zero
                
                # Create dataset
                data = []
                for i, row in df_sample.iterrows():
                    # Scale the radius between 5 and 20
                    radius = 5 + ((row[r_col] - r_min) / r_range) * 15
                    
                    data.append({
                        "x": float(row[x_col]),
                        "y": float(row[y_col]),
                        "r": float(radius)
                    })
                
                return {
                    "type": "bubble",
                    "datasets": [{
                        "label": f"{x_col} vs {y_col} (size: {r_col})",
                        "data": data,
                        "backgroundColor": "rgba(168, 85, 247, 0.5)",
                        "borderColor": "rgba(121, 40, 202, 0.8)",
                        "borderWidth": 1,
                        "hoverBackgroundColor": "rgba(168, 85, 247, 0.7)"
                    }]
                }
                
            else:
                logger.warning("Not enough numeric columns for bubble chart")
                return {"error": "Not enough numeric columns for bubble chart"}
                
        except Exception as e:
            logger.error(f"Error generating bubble chart: {str(e)}")
            logger.error(traceback.format_exc())
            return {"error": str(e)}
