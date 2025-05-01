import os
import json
import logging
import traceback
import requests
from typing import Dict, List, Any, Optional

# Set up logging
logging.basicConfig(level=logging.DEBUG,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def get_ai_instance():
    """
    Factory function to get an AI client instance.
    Returns the appropriate AI client based on available configuration.
    """
    try:
        # Currently, we only have one AI implementation
        return SimpleAIClient()
    except Exception as e:
        logger.error(f"Error initializing AI client: {str(e)}")
        logger.error(traceback.format_exc())
        return None

class SimpleAIClient:
    """A simple AI client that generates responses based on data."""
    
    def __init__(self):
        """Initialize the AI client."""
        logger.info("SimpleAIClient initialized")
    
    def analyze_data_initial(self, data_summary: Dict[str, Any]) -> str:
        """
        Generate initial insights from data summary.
        
        Args:
            data_summary: Dictionary containing data overview
            
        Returns:
            String with AI-generated insights
        """
        try:
            # Extract information from the data summary
            files = data_summary.get("files", [])
            metrics = data_summary.get("metrics", {})
            data_overview = data_summary.get("data_overview", {})
            
            # Generate insights
            insights = []
            
            # Basic file information
            file_count = len(files)
            insights.append(f"I've analyzed {file_count} file{'s' if file_count != 1 else ''}: {', '.join(files)}.")
            
            # Add metrics insights
            if metrics:
                total_rows = metrics.get("total_rows", 0)
                total_cols = metrics.get("total_columns", 0)
                insights.append(f"Your data contains {total_rows} rows and {total_cols} columns in total.")
            
            # Look for patterns and issues in the data
            if data_overview and data_overview.get("success", False):
                data = data_overview.get("data", {})
                
                # For each file
                for file_name, file_info in data.items():
                    if "error" in file_info:
                        insights.append(f"⚠️ There was an issue analyzing {file_name}: {file_info['error']}")
                        continue
                    
                    # Shape info
                    if "shape" in file_info:
                        rows = file_info["shape"]["rows"]
                        cols = file_info["shape"]["columns"]
                        insights.append(f"📊 {file_name} has {rows} rows and {cols} columns.")
                    
                    # Missing data
                    missing_data = file_info.get("missing_data", {})
                    if any(missing_data.values()):
                        cols_with_missing = sum(1 for v in missing_data.values() if v > 0)
                        insights.append(f"⚠️ {file_name} has missing values in {cols_with_missing} columns.")
                    
                    # Numeric columns insights
                    numeric_cols = file_info.get("numeric_columns", {})
                    if numeric_cols:
                        insights.append(f"📈 {file_name} contains {len(numeric_cols)} numeric columns that can be visualized with charts.")
                    
                    # Categorical columns insights
                    cat_cols = file_info.get("categorical_columns", {})
                    if cat_cols:
                        insights.append(f"🏷️ {file_name} contains {len(cat_cols)} categorical columns that can be used for grouping and filtering.")
            
            # Add recommendations for visualizations
            insights.append("\n👉 Recommended next steps:")
            insights.append("1. Try using different chart types to explore your data")
            insights.append("2. Ask me specific questions about patterns or trends")
            insights.append("3. Request more detailed analysis of particular columns")
            
            return "\n".join(insights)
            
        except Exception as e:
            logger.error(f"Error in analyze_data_initial: {str(e)}")
            logger.error(traceback.format_exc())
            return "I encountered an error analyzing your data. Please try again or contact support."
    
    def chat(self, user_message: str, chat_history: List[Dict[str, str]] = None, file_data: Dict[str, Any] = None) -> str:
        """
        Generate a response to a user message.
        
        Args:
            user_message: The user's message
            chat_history: Optional list of previous messages
            file_data: Optional data from uploaded files
            
        Returns:
            AI-generated response
        """
        try:
            if chat_history is None:
                chat_history = []
                
            # Process specific command patterns
            if "suggest charts" in user_message.lower():
                return self._suggest_charts(file_data)
                
            elif "brief analysis" in user_message.lower():
                return self._generate_brief_analysis(file_data)
                
            elif "help" in user_message.lower() or "what can you do" in user_message.lower():
                return self._get_help_message()
            
            # Handle data-specific questions if file data is available
            if file_data and file_data.get("success", False):
                response = self._generate_data_specific_response(user_message, file_data)
                if response:
                    return response
            
            # Default responses based on the question type
            if "how" in user_message.lower():
                return "To accomplish that, I would recommend analyzing your data first to identify patterns. Would you like me to suggest some charts that might help visualize the relationships in your data?"
                
            elif "why" in user_message.lower():
                return "That's an interesting question. The answer likely lies in the patterns within your data. I can help you explore different variables and their relationships to find a potential explanation."
                
            elif "what" in user_message.lower():
                return "Based on the data you've provided, I can help analyze various aspects. Could you specify which particular aspect of the data you're interested in understanding better?"
                
            # Generic fallback response
            return "I'm here to help you analyze your data and provide insights. You can ask me to suggest charts, provide a brief analysis, or ask specific questions about your data."
            
        except Exception as e:
            logger.error(f"Error in chat: {str(e)}")
            logger.error(traceback.format_exc())
            return "I encountered an error processing your request. Please try again or contact support."
    
    def _suggest_charts(self, file_data: Optional[Dict[str, Any]]) -> str:
        """Generate chart suggestions based on the file data."""
        if not file_data or not file_data.get("success", False):
            return "I don't have any file data to analyze. Please upload some files first."
            
        suggestions = [
            "Based on your data, here are some chart suggestions:",
            ""
        ]
        
        data_info = file_data.get("data", {})
        
        for file_name, file_info in data_info.items():
            if "shape" not in file_info:
                continue
                
            suggestions.append(f"For {file_name}:")
            
            # Check for numeric columns
            numeric_cols = file_info.get("numeric_columns", {})
            cat_cols = file_info.get("categorical_columns", {})
            
            if numeric_cols and len(numeric_cols) >= 2:
                suggestions.append("• Scatter Plot - to visualize relationships between numeric variables")
                suggestions.append("• Correlation Heatmap - to see how all numeric variables relate to each other")
                
            if numeric_cols and cat_cols:
                suggestions.append("• Bar Chart - to compare numeric values across categories")
                suggestions.append("• Box Plot - to see distribution of numeric values within categories")
                
            if len(numeric_cols) == 1:
                suggestions.append("• Histogram - to visualize the distribution of values")
                
            if cat_cols:
                suggestions.append("• Pie Chart - to show proportion of categories")
                
            if len(numeric_cols) >= 3:
                suggestions.append("• Bubble Chart - to visualize three dimensions of data")
                
            suggestions.append("")
            
        suggestions.append("Would you like me to explain any of these chart types in more detail?")
        
        return "\n".join(suggestions)
    
    def _generate_brief_analysis(self, file_data: Optional[Dict[str, Any]]) -> str:
        """Generate a brief analysis of the file data."""
        if not file_data or not file_data.get("success", False):
            return "I don't have any file data to analyze. Please upload some files first."
            
        analysis = [
            "Here's a brief analysis of your data:",
            ""
        ]
        
        data_info = file_data.get("data", {})
        
        total_rows = 0
        total_cols = 0
        missing_data_issues = False
        
        for file_name, file_info in data_info.items():
            if "shape" not in file_info:
                continue
                
            rows = file_info["shape"]["rows"]
            cols = file_info["shape"]["columns"]
            total_rows += rows
            total_cols += cols
            
            # Check for missing data
            missing_data = file_info.get("missing_data", {})
            if any(missing_data.values()):
                missing_data_issues = True
        
        analysis.append(f"📊 Overview: Your dataset contains {total_rows} total rows and {total_cols} columns across {len(data_info)} files.")
        
        if missing_data_issues:
            analysis.append("⚠️ Data Quality: I detected missing values in your data. This might affect the accuracy of analysis.")
        
        # Add insights about the data structure
        for file_name, file_info in data_info.items():
            if "shape" not in file_info:
                continue
                
            analysis.append(f"\n📁 {file_name}:")
            
            # Numeric columns
            numeric_cols = file_info.get("numeric_columns", {})
            if numeric_cols:
                analysis.append(f"• Contains {len(numeric_cols)} numeric columns")
                
                # Basic stats for first numeric column as an example
                if numeric_cols:
                    first_col = list(numeric_cols.keys())[0]
                    col_stats = numeric_cols[first_col]
                    analysis.append(f"  Example: '{first_col}' ranges from {col_stats.get('min', 0):.2f} to {col_stats.get('max', 0):.2f} with avg {col_stats.get('mean', 0):.2f}")
            
            # Categorical columns
            cat_cols = file_info.get("categorical_columns", {})
            if cat_cols:
                analysis.append(f"• Contains {len(cat_cols)} categorical columns")
                
                # Most frequent category for first categorical column
                if cat_cols:
                    first_col = list(cat_cols.keys())[0]
                    col_stats = cat_cols[first_col]
                    value_counts = col_stats.get("value_counts", {})
                    if value_counts:
                        most_common = max(value_counts.items(), key=lambda x: x[1])
                        analysis.append(f"  Example: In '{first_col}', the most common value is '{most_common[0]}' ({most_common[1]} occurrences)")
        
        analysis.append("\n💡 Recommendations:")
        analysis.append("• Try using charts to visualize distributions and relationships")
        analysis.append("• Consider exploring correlations between numeric variables")
        analysis.append("• Look for patterns in how categories relate to numeric values")
        
        return "\n".join(analysis)
    
    def _get_help_message(self) -> str:
        """Return a help message explaining the AI capabilities."""
        help_message = [
            "👋 I'm your AI data assistant. Here's how I can help you analyze your data:",
            "",
            "📊 Data Analysis:",
            "• Suggest the best charts for your data",
            "• Provide a brief summary of your dataset",
            "• Identify patterns, trends, and outliers",
            "• Explain correlations between variables",
            "",
            "🤔 Ask me questions like:",
            "• \"What insights can you find in my data?\"",
            "• \"What's the relationship between X and Y?\"",
            "• \"Are there any outliers in my dataset?\"",
            "• \"What patterns do you notice?\"",
            "",
            "📈 Visualization Help:",
            "• \"Suggest charts that fit my files\"",
            "• \"What's the best way to visualize X?\"",
            "• \"Help me interpret this chart\"",
            "",
            "Just upload your data files and start asking questions!"
        ]
        
        return "\n".join(help_message)
    
    def _generate_data_specific_response(self, user_message: str, file_data: Dict[str, Any]) -> Optional[str]:
        """Generate a response specific to the user's data."""
        try:
            message_lower = user_message.lower()
            data_info = file_data.get("data", {})
            
            # Look for mentions of specific columns
            for file_name, file_info in data_info.items():
                all_columns = (list(file_info.get("numeric_columns", {}).keys()) +
                              list(file_info.get("categorical_columns", {}).keys()))
                
                for col in all_columns:
                    if col.lower() in message_lower:
                        # User is asking about a specific column
                        return self._generate_column_insight(col, file_info, file_name)
            
            # Check if asking about correlation or relationship
            if any(term in message_lower for term in ["correlation", "relationship", "related", "correlate"]):
                return self._generate_correlation_insight(data_info)
            
            # Check if asking about distribution
            if any(term in message_lower for term in ["distribution", "spread", "range"]):
                return self._generate_distribution_insight(data_info)
            
            # Check if asking about outliers
            if "outlier" in message_lower:
                return self._generate_outlier_insight(data_info)
                
            return None
            
        except Exception as e:
            logger.error(f"Error in _generate_data_specific_response: {str(e)}")
            return None
    
    def _generate_column_insight(self, column_name: str, file_info: Dict[str, Any], file_name: str) -> str:
        """Generate insight about a specific column."""
        # Check if it's a numeric column
        numeric_cols = file_info.get("numeric_columns", {})
        if column_name in numeric_cols:
            stats = numeric_cols[column_name]
            return (
                f"Looking at '{column_name}' in {file_name}:\n\n"
                f"• Range: {stats.get('min', 0):.2f} to {stats.get('max', 0):.2f}\n"
                f"• Average (mean): {stats.get('mean', 0):.2f}\n"
                f"• Median: {stats.get('median', 0):.2f}\n"
                f"• Standard deviation: {stats.get('std', 0):.2f}\n\n"
                f"This column would be well visualized using a histogram or box plot."
            )
        
        # Check if it's a categorical column
        cat_cols = file_info.get("categorical_columns", {})
        if column_name in cat_cols:
            stats = cat_cols[column_name]
            value_counts = stats.get("value_counts", {})
            
            top_values = sorted(value_counts.items(), key=lambda x: x[1], reverse=True)[:3]
            top_values_str = "\n".join([f"• {value}: {count} occurrences" for value, count in top_values])
            
            return (
                f"Looking at '{column_name}' in {file_name}:\n\n"
                f"This is a categorical column with {stats.get('unique_count', 0)} unique values.\n\n"
                f"Most common values:\n{top_values_str}\n\n"
                f"This column would be well visualized using a bar chart or pie chart."
            )
        
        return f"I couldn't find detailed information about '{column_name}' in {file_name}."
    
    def _generate_correlation_insight(self, data_info: Dict[str, Any]) -> str:
        """Generate insight about correlations in the data."""
        for file_name, file_info in data_info.items():
            numeric_cols = file_info.get("numeric_columns", {})
            
            if len(numeric_cols) >= 2:
                cols = list(numeric_cols.keys())[:2]
                return (
                    f"To analyze correlations in {file_name}, I recommend:\n\n"
                    f"1. Use a scatter plot to visualize the relationship between '{cols[0]}' and '{cols[1]}'\n"
                    f"2. Generate a correlation heatmap to see relationships between all numeric variables\n"
                    f"3. Consider calculating Pearson correlation coefficients for precise measurement\n\n"
                    f"Would you like me to suggest specific chart configurations for correlation analysis?"
                )
        
        return "I couldn't find multiple numeric columns in your data to analyze correlations. Correlations require at least two numeric variables to compare."
    
    def _generate_distribution_insight(self, data_info: Dict[str, Any]) -> str:
        """Generate insight about distributions in the data."""
        for file_name, file_info in data_info.items():
            numeric_cols = file_info.get("numeric_columns", {})
            
            if numeric_cols:
                col = list(numeric_cols.keys())[0]
                stats = numeric_cols[col]
                
                return (
                    f"Looking at the distribution of '{col}' in {file_name}:\n\n"
                    f"• Range: {stats.get('min', 0):.2f} to {stats.get('max', 0):.2f}\n"
                    f"• Center: mean={stats.get('mean', 0):.2f}, median={stats.get('median', 0):.2f}\n"
                    f"• Spread: standard deviation={stats.get('std', 0):.2f}\n\n"
                    f"To visualize this distribution, I recommend using a histogram or box plot. "
                    f"The relationship between the mean and median can indicate if the distribution is skewed."
                )
        
        return "I couldn't find numeric columns in your data to analyze distributions. Distributions typically refer to how numeric values are spread."
    
    def _generate_outlier_insight(self, data_info: Dict[str, Any]) -> str:
        """Generate insight about potential outliers in the data."""
        for file_name, file_info in data_info.items():
            numeric_cols = file_info.get("numeric_columns", {})
            
            if numeric_cols:
                col = list(numeric_cols.keys())[0]
                stats = numeric_cols[col]
                
                std = stats.get('std', 0)
                mean = stats.get('mean', 0)
                max_val = stats.get('max', 0)
                min_val = stats.get('min', 0)
                
                # Simple heuristic: check if max or min is more than 3 std devs from mean
                potential_outliers = False
                if std > 0:
                    if abs(max_val - mean) > 3 * std or abs(min_val - mean) > 3 * std:
                        potential_outliers = True
                
                if potential_outliers:
                    return (
                        f"Looking at '{col}' in {file_name}, I notice potential outliers:\n\n"
                        f"• The data ranges from {min_val:.2f} to {max_val:.2f}\n"
                        f"• The mean is {mean:.2f} with a standard deviation of {std:.2f}\n\n"
                        f"Since some values are more than 3 standard deviations from the mean, "
                        f"outliers may be present. I recommend using a box plot to visualize these outliers."
                    )
                else:
                    return (
                        f"Looking at '{col}' in {file_name}, I don't immediately see strong evidence of outliers:\n\n"
                        f"• The data ranges from {min_val:.2f} to {max_val:.2f}\n"
                        f"• The mean is {mean:.2f} with a standard deviation of {std:.2f}\n\n"
                        f"However, a box plot would give you a clearer picture of any potential outliers in the data."
                    )
        
        return "I couldn't find numeric columns in your data to analyze for outliers. Outlier detection requires numeric data."
