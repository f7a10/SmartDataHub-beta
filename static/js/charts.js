// Charts.js - Handles chart creation and management

// Define the ChartManager class
class ChartManager {
    constructor() {
        // Store active charts
        this.activeCharts = {};
        // Store chart data
        this.chartData = {};
        // Store chart options
        this.chartOptions = [];
        
        // Set colors based on current mode
        this.initColors();
        
        // Listen for theme changes
        document.addEventListener('themeChanged', () => {
            this.initColors();
            this.updateAllCharts();
        });
    }
    
    // Initialize colors based on current theme
    initColors() {
        const isDarkMode = document.body.classList.contains('dark-mode');
        
        // Color palettes for dark and light mode
        if (isDarkMode) {
            this.colors = {
                primary: '#a855f7',
                secondary: '#7928ca',
                background: 'rgba(168, 85, 247, 0.2)',
                border: 'rgba(121, 40, 202, 0.8)',
                gridLines: 'rgba(255, 255, 255, 0.1)',
                text: '#d1d5db',
                // Colorful palette for datasets
                palette: [
                    'rgba(168, 85, 247, 0.7)',   // Purple
                    'rgba(79, 209, 197, 0.7)',   // Teal
                    'rgba(245, 158, 11, 0.7)',   // Amber
                    'rgba(239, 68, 68, 0.7)',    // Red
                    'rgba(16, 185, 129, 0.7)',   // Green
                    'rgba(59, 130, 246, 0.7)',   // Blue
                    'rgba(236, 72, 153, 0.7)',   // Pink
                    'rgba(124, 58, 237, 0.7)'    // Violet
                ]
            };
        } else {
            this.colors = {
                primary: '#8b5cf6',
                secondary: '#6d28d9',
                background: 'rgba(139, 92, 246, 0.2)',
                border: 'rgba(109, 40, 217, 0.8)',
                gridLines: 'rgba(0, 0, 0, 0.1)',
                text: '#4b5563',
                // Colorful palette for datasets
                palette: [
                    'rgba(109, 40, 217, 0.7)',   // Violet
                    'rgba(6, 182, 212, 0.7)',    // Cyan
                    'rgba(234, 88, 12, 0.7)',    // Orange
                    'rgba(220, 38, 38, 0.7)',    // Red
                    'rgba(5, 150, 105, 0.7)',    // Emerald
                    'rgba(37, 99, 235, 0.7)',    // Blue
                    'rgba(219, 39, 119, 0.7)',   // Pink
                    'rgba(91, 33, 182, 0.7)'     // Purple
                ]
            };
        }
    }
    
    // Update all active charts with new colors
    updateAllCharts() {
        for (const chartType in this.activeCharts) {
            if (this.chartData[chartType]) {
                this.renderChart(chartType, this.chartData[chartType]);
            }
        }
    }

    // Initialize chart options based on API response
    setChartOptions(options) {
        this.chartOptions = options;
        this.renderChartOptions();
    }

    // Store chart data from API
    setChartData(data) {
        console.log('Setting chart data:', data);
        
        // Reset existing chart data
        this.chartData = {};
        
        // Make a deep copy of the data to prevent reference issues
        if (data && typeof data === 'object') {
            // Save a fresh copy of the chart data
            for (const chartType in data) {
                if (data.hasOwnProperty(chartType) && data[chartType]) {
                    this.chartData[chartType] = JSON.parse(JSON.stringify(data[chartType]));
                    console.log(`Stored fresh data for chart type: ${chartType}`);
                }
            }
        } else {
            console.warn('Invalid chart data format provided:', data);
        }
    }
    
    // Clear all active charts to prevent rendering conflicts
    clearAllCharts() {
        try {
            console.log('Clearing all active charts');
            // Destroy all active chart instances
            for (const chartType in this.activeCharts) {
                if (this.activeCharts[chartType]) {
                    try {
                        this.activeCharts[chartType].destroy();
                        console.log(`Chart ${chartType} destroyed successfully`);
                    } catch (error) {
                        console.warn(`Error destroying chart ${chartType}: ${error.message}`);
                    }
                }
            }
            
            // Reset active charts object
            this.activeCharts = {};
            
            return true;
        } catch (error) {
            console.error('Error clearing all charts:', error);
            return false;
        }
    }

    // Render chart selection options
    renderChartOptions() {
        const container = document.getElementById('chartSelectionGrid');
        if (!container) return;

        container.innerHTML = '';
        
        // Group charts by category
        const categories = {
            'basic': { title: 'Basic Charts', charts: [] },
            'advanced': { title: 'Advanced Analytics', charts: [] },
            'correlation': { title: 'Correlation Charts', charts: [] },
            'distribution': { title: 'Distribution Charts', charts: [] },
            'other': { title: 'Other Visualizations', charts: [] }
        };
        
        // Categorize charts
        this.chartOptions.forEach(option => {
            let category = 'other';
            
            // Determine category based on chart type
            if (['line', 'bar', 'pie'].includes(option.id)) {
                category = 'basic';
            } else if (['scatter', 'bubble'].includes(option.id)) {
                category = 'correlation';
            } else if (['histogram', 'box'].includes(option.id)) {
                category = 'distribution';
            } else if (['heatmap', 'radar'].includes(option.id)) {
                category = 'advanced';
            }
            
            categories[category].charts.push(option);
        });
        
        // Create chart selection boxes by category
        for (const categoryId in categories) {
            const category = categories[categoryId];
            
            // Only display categories that have charts
            if (category.charts.length === 0) continue;
            
            // Create category heading
            const categoryHeading = document.createElement('div');
            categoryHeading.className = 'chart-category-heading';
            categoryHeading.textContent = category.title;
            container.appendChild(categoryHeading);
            
            // Create chart selection grid for this category
            const categoryGrid = document.createElement('div');
            categoryGrid.className = 'chart-category-grid';
            
            // Add charts to this category
            category.charts.forEach(option => {
                const suitableClass = option.suitable ? 'suitable' : 'not-suitable';
                const card = document.createElement('div');
                card.className = `chart-option ${suitableClass}`;
                card.dataset.chartType = option.id;
                
                let iconClass = 'fa-chart-line';
                switch (option.icon) {
                    case 'chart-bar': iconClass = 'fa-chart-bar'; break;
                    case 'chart-pie': iconClass = 'fa-chart-pie'; break;
                    case 'chart-column': iconClass = 'fa-chart-column'; break;
                    case 'circle-dot': iconClass = 'fa-circle-dot'; break;
                    case 'th': iconClass = 'fa-th'; break;
                    case 'chart-boxplot': iconClass = 'fa-box'; break;
                    case 'spider': iconClass = 'fa-spider'; break;
                    case 'circle': iconClass = 'fa-circle'; break;
                }
                
                // Create checkbox for selection
                const checkbox = document.createElement('div');
                checkbox.className = 'chart-option-checkbox';
                checkbox.innerHTML = '<i class="far fa-square"></i><i class="fas fa-check-square"></i>';
                
                // Create the chart option card with more detailed info
                card.innerHTML = `
                    <div class="chart-option-header">
                        ${checkbox.outerHTML}
                        <div class="chart-option-icon">
                            <i class="fas ${iconClass}"></i>
                        </div>
                    </div>
                    <div class="chart-option-content">
                        <div class="chart-option-name">${option.name}</div>
                        <div class="chart-option-desc">${option.suitable ? 'Suitable for your data' : 'Not ideal for this data'}</div>
                    </div>
                `;
                
                card.addEventListener('click', () => this.toggleChartSelection(option.id));
                categoryGrid.appendChild(card);
            });
            
            container.appendChild(categoryGrid);
        }
    }

    // Toggle chart selection
    toggleChartSelection(chartType) {
        const chartOption = document.querySelector(`.chart-option[data-chart-type="${chartType}"]`);
        
        if (chartOption.classList.contains('selected')) {
            chartOption.classList.remove('selected');
            this.removeChart(chartType);
        } else {
            chartOption.classList.add('selected');
            this.createChart(chartType);
        }
    }

    // Create and render a chart
    async createChart(chartType) {
        // Show loading state in dashboard section if hidden
        const dashboardSection = document.getElementById('dashboardSection');
        if (dashboardSection.style.display === 'none') {
            dashboardSection.style.display = 'block';
        }
        
        // Make the dashboard section visible by scrolling to it
        const analysisSection = document.getElementById('analysisSection');
        if (analysisSection) {
            analysisSection.scrollIntoView({ behavior: 'smooth' });
        } else {
            // Fallback - try scrolling to dashboard section instead
            dashboardSection?.scrollIntoView({ behavior: 'smooth' });
        }
        
        // Create chart container if it doesn't exist
        if (!document.getElementById(`chart-${chartType}`)) {
            const chartsGrid = document.getElementById('chartsGrid');
            
            const chartCard = document.createElement('div');
            chartCard.className = 'chart-card';
            chartCard.id = `chart-container-${chartType}`;
            
            const chartName = this.chartOptions.find(o => o.id === chartType)?.name || 'Chart';
            
            chartCard.innerHTML = `
                <div class="chart-header">
                    <h4>${chartName}</h4>
                    <div class="chart-controls">
                        <button class="chart-control-btn" data-action="expand" title="Expand">
                            <i class="fas fa-expand-alt"></i>
                        </button>
                        <button class="chart-control-btn" data-action="download" title="Download">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="chart-control-btn" data-action="remove" title="Remove">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div class="chart-body">
                    <canvas id="chart-${chartType}"></canvas>
                </div>
            `;
            
            chartsGrid.appendChild(chartCard);
            
            // Add event listeners to control buttons
            const expandBtn = chartCard.querySelector('[data-action="expand"]');
            const downloadBtn = chartCard.querySelector('[data-action="download"]');
            const removeBtn = chartCard.querySelector('[data-action="remove"]');
            
            expandBtn.addEventListener('click', () => this.expandChart(chartType));
            downloadBtn.addEventListener('click', () => this.downloadChart(chartType));
            removeBtn.addEventListener('click', () => {
                const chartOption = document.querySelector(`.chart-option[data-chart-type="${chartType}"]`);
                chartOption.classList.remove('selected');
                this.removeChart(chartType);
            });
        }

        // Check if we already have data for this chart
        if (this.chartData && this.chartData[chartType]) {
            this.renderChart(chartType, this.chartData[chartType]);
        } else {
            // Request chart data from the server
            try {
                const response = await fetch('/api/chart', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        chart_type: chartType,
                        file_index: window.sessionData?.selectedFileIndices?.[0] || 0  // Use selected file index if available
                    }),
                });
                
                const data = await response.json();
                
                if (data.success) {
                    this.chartData[chartType] = data.chart_data;
                    this.renderChart(chartType, data.chart_data);
                } else {
                    console.error('Error generating chart:', data.error);
                    this.showChartError(chartType, data.error || 'Failed to generate chart');
                }
            } catch (error) {
                console.error('Error requesting chart:', error);
                this.showChartError(chartType, 'Network error occurred');
            }
        }
    }

    // Render a chart with data
    renderChart(chartType, chartData) {
        const canvasId = `chart-${chartType}`;
        let canvas = document.getElementById(canvasId);
        
        if (!canvas) {
            console.error(`Canvas element not found: ${canvasId}`);
            return;
        }
        
        // Scroll to make the chart visible
        const chartContainer = document.getElementById(`chart-container-${chartType}`);
        if (chartContainer) {
            chartContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        try {
            // If chart already exists, destroy it
            if (this.activeCharts[chartType]) {
                try {
                    this.activeCharts[chartType].destroy();
                } catch (error) {
                    console.warn(`Failed to destroy previous chart: ${error.message}`);
                }
                delete this.activeCharts[chartType];
            }
            
            // Create a fresh canvas to prevent Chart.js issues
            const chartWrapper = canvas.parentNode;
            if (chartWrapper) {
                const newCanvas = document.createElement('canvas');
                newCanvas.id = canvasId;
                chartWrapper.replaceChild(newCanvas, canvas);
                canvas = newCanvas;
            }
        } catch (error) {
            console.error(`Error preparing chart canvas: ${error.message}`);
        }
        
        // Default chart options
        const defaultOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: this.colors.text
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(30, 32, 50, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: this.colors.border,
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    grid: {
                        color: this.colors.gridLines
                    },
                    ticks: {
                        color: this.colors.text
                    }
                },
                y: {
                    grid: {
                        color: this.colors.gridLines
                    },
                    ticks: {
                        color: this.colors.text
                    }
                }
            }
        };
        
        // Type-specific chart rendering
        switch (chartType) {
            case 'line_chart':
                this.renderLineChart(canvas, chartData, defaultOptions);
                break;
            case 'bar_chart':
                this.renderBarChart(canvas, chartData, defaultOptions);
                break;
            case 'pie_chart':
                this.renderPieChart(canvas, chartData);
                break;
            case 'histogram':
                this.renderHistogram(canvas, chartData, defaultOptions);
                break;
            case 'scatter_plot':
                this.renderScatterPlot(canvas, chartData, defaultOptions);
                break;

            case 'box_plot':
                this.renderBoxPlot(canvas, chartData, defaultOptions);
                break;
            case 'radar_chart':
                this.renderRadarChart(canvas, chartData);
                break;
            case 'bubble_chart':
                this.renderBubbleChart(canvas, chartData, defaultOptions);
                break;
            default:
                console.error(`Unsupported chart type: ${chartType}`);
                this.showChartError(chartType, 'Unsupported chart type');
        }
    }

    // Render line chart
    renderLineChart(canvas, chartData, options) {
        try {
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
                console.error('Could not get 2D context for line chart');
                return;
            }
            
            // Get datasets and apply color palette
            const datasets = (chartData.datasets || []).map((dataset, index) => {
                const colorIndex = index % this.colors.palette.length;
                return {
                    ...dataset,
                    borderColor: dataset.borderColor || this.colors.palette[colorIndex],
                    backgroundColor: dataset.backgroundColor || this.colors.palette[colorIndex].replace('0.7', '0.2')
                };
            });
            
            this.activeCharts['line_chart'] = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: chartData.labels || [],
                    datasets: datasets
                },
                options: options
            });
        } catch (error) {
            console.error(`Error rendering line chart: ${error.message}`);
            this.showChartError('line_chart', 'Failed to render chart');
        }
    }

    // Render bar chart
    renderBarChart(canvas, chartData, options) {
        try {
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
                console.error('Could not get 2D context for bar chart');
                return;
            }
            
            // Apply color palette to datasets
            const datasets = (chartData.datasets || []).map((dataset, index) => {
                const colorIndex = index % this.colors.palette.length;
                return {
                    ...dataset,
                    backgroundColor: dataset.backgroundColor || this.colors.palette[colorIndex],
                    borderColor: dataset.borderColor || this.colors.palette[colorIndex].replace('0.7', '0.9'),
                    borderWidth: dataset.borderWidth || 1
                };
            });
            
            this.activeCharts['bar_chart'] = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: chartData.labels || [],
                    datasets: datasets
                },
                options: options
            });
        } catch (error) {
            console.error(`Error rendering bar chart: ${error.message}`);
            this.showChartError('bar_chart', 'Failed to render chart');
        }
    }

    // Render pie chart
    renderPieChart(canvas, chartData) {
        const ctx = canvas.getContext('2d');
        
        // Apply color palette to datasets
        const datasets = chartData.datasets.map(dataset => {
            // Generate colors for each segment using our palette
            const backgroundColors = [];
            const borderColors = [];
            
            for (let i = 0; i < chartData.labels.length; i++) {
                const colorIndex = i % this.colors.palette.length;
                backgroundColors.push(this.colors.palette[colorIndex]);
                borderColors.push(this.colors.palette[colorIndex].replace('0.7', '0.9'));
            }
            
            return {
                ...dataset,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1
            };
        });
        
        this.activeCharts['pie_chart'] = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: chartData.labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: this.colors.text
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(30, 32, 50, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff'
                    }
                }
            }
        });
    }

    // Render histogram (bar chart with specific options)
    renderHistogram(canvas, chartData, options) {
        const ctx = canvas.getContext('2d');
        
        const histogramOptions = {
            ...options,
            plugins: {
                ...options.plugins,
                tooltip: {
                    ...options.plugins.tooltip,
                    callbacks: {
                        label: function(context) {
                            return `Count: ${context.raw}`;
                        }
                    }
                }
            },
            scales: {
                ...options.scales,
                y: {
                    ...options.scales.y,
                    title: {
                        display: true,
                        text: 'Frequency',
                        color: this.colors.text
                    }
                }
            }
        };
        
        // Apply color palette to datasets
        const datasets = chartData.datasets.map((dataset, index) => {
            const colorIndex = index % this.colors.palette.length;
            return {
                ...dataset,
                backgroundColor: dataset.backgroundColor || this.colors.palette[colorIndex],
                borderColor: dataset.borderColor || this.colors.palette[colorIndex].replace('0.7', '0.9'),
                borderWidth: dataset.borderWidth || 1
            };
        });
        
        this.activeCharts['histogram'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartData.labels,
                datasets: datasets
            },
            options: histogramOptions
        });
    }

    // Render scatter plot
    renderScatterPlot(canvas, chartData, options) {
        const ctx = canvas.getContext('2d');
        
        // Apply color palette to datasets
        const datasets = chartData.datasets.map((dataset, index) => {
            const colorIndex = index % this.colors.palette.length;
            return {
                ...dataset,
                backgroundColor: dataset.backgroundColor || this.colors.palette[colorIndex],
                borderColor: dataset.borderColor || this.colors.palette[colorIndex].replace('0.7', '0.9'),
                borderWidth: dataset.borderWidth || 1
            };
        });
        
        this.activeCharts['scatter_plot'] = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: datasets
            },
            options: options
        });
    }

    // Render heatmap (using Chart.js plugin or custom rendering)
    renderHeatmap(canvas, chartData) {
        const ctx = canvas.getContext('2d');
        const labels = chartData.labels;
        const data = chartData.datasets;
        
        // Create matrix from data
        const matrix = [];
        for (let i = 0; i < labels.length; i++) {
            const row = [];
            for (let j = 0; j < labels.length; j++) {
                const point = data.find(p => p.x === labels[j] && p.y === labels[i]);
                row.push(point ? point.v : 0);
            }
            matrix.push(row);
        }
        
        // Create datasets for heatmap
        const datasets = [];
        for (let i = 0; i < labels.length; i++) {
            datasets.push({
                label: labels[i],
                data: matrix[i],
                backgroundColor: function(context) {
                    const value = context.dataset.data[context.dataIndex];
                    // Color scale from blue (negative) to white (zero) to red (positive)
                    if (value < 0) {
                        // Blue to white gradient for negative values
                        const alpha = Math.min(Math.abs(value), 1); // Max alpha is 1
                        return `rgba(59, 130, 246, ${alpha})`;
                    } else {
                        // White to purple gradient for positive values
                        const alpha = Math.min(value, 1); // Max alpha is 1
                        return `rgba(168, 85, 247, ${alpha})`;
                    }
                },
                borderColor: 'rgba(20, 22, 40, 0.5)',
                borderWidth: 1
            });
        }
        
        this.activeCharts['heatmap'] = new Chart(ctx, {
            type: 'matrix',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Correlation Matrix',
                    data: data.map(point => ({
                        x: point.x,
                        y: point.y,
                        v: point.v
                    })),
                    backgroundColor: function(context) {
                        const value = context.dataset.data[context.dataIndex].v;
                        // Color scale from blue (negative) to white (zero) to purple (positive)
                        if (value < 0) {
                            // Blue to white gradient for negative values
                            const alpha = Math.min(Math.abs(value), 1); // Max alpha is 1
                            return `rgba(59, 130, 246, ${alpha})`;
                        } else {
                            // White to purple gradient for positive values
                            const alpha = Math.min(value, 1); // Max alpha is 1
                            return `rgba(168, 85, 247, ${alpha})`;
                        }
                    },
                    borderColor: 'rgba(20, 22, 40, 0.5)',
                    borderWidth: 1,
                    width: function(context) {
                        // Return a fixed width
                        return 20;
                    },
                    height: function(context) {
                        // Return a fixed height
                        return 20;
                    }
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                return `${context[0].dataset.data[context[0].dataIndex].x} vs ${context[0].dataset.data[context[0].dataIndex].y}`;
                            },
                            label: function(context) {
                                return `Correlation: ${context.dataset.data[context.dataIndex].v.toFixed(2)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'category',
                        labels: labels,
                        ticks: {
                            color: this.colors.text
                        },
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        type: 'category',
                        labels: labels,
                        ticks: {
                            color: this.colors.text
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    // Render box plot
    renderBoxPlot(canvas, chartData, options) {
        const ctx = canvas.getContext('2d');
        
        // Register boxplot elements and controller if needed
        if (!Chart.controllers.boxplot) {
            // Fall back to a bar chart to display min, median, max
            const datasets = chartData.datasets.map((dataset, index) => {
                const boxData = dataset.data[0];
                const colorIndex = index % this.colors.palette.length;
                return {
                    label: dataset.label,
                    backgroundColor: dataset.backgroundColor || this.colors.palette[colorIndex].replace('0.7', '0.5'),
                    borderColor: dataset.borderColor || this.colors.palette[colorIndex].replace('0.7', '0.9'),
                    borderWidth: 1,
                    data: [boxData.median],
                    minBar: boxData.min,
                    maxBar: boxData.max
                };
            });
            
            this.activeCharts['box_plot'] = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Box Plot'],
                    datasets: datasets
                },
                options: {
                    ...options,
                    plugins: {
                        ...options.plugins,
                        tooltip: {
                            ...options.plugins.tooltip,
                            callbacks: {
                                label: function(context) {
                                    const dataset = context.dataset;
                                    return [
                                        `${dataset.label}:`,
                                        `Min: ${dataset.minBar}`,
                                        `Median: ${dataset.data[0]}`,
                                        `Max: ${dataset.maxBar}`
                                    ];
                                }
                            }
                        }
                    }
                }
            });
        } else {
            // Use actual boxplot plugin if available
            // Apply color palette 
            const datasets = chartData.datasets.map((dataset, index) => {
                const colorIndex = index % this.colors.palette.length;
                return {
                    ...dataset,
                    backgroundColor: dataset.backgroundColor || this.colors.palette[colorIndex].replace('0.7', '0.5'),
                    borderColor: dataset.borderColor || this.colors.palette[colorIndex].replace('0.7', '0.9')
                };
            });
            
            this.activeCharts['box_plot'] = new Chart(ctx, {
                type: 'boxplot',
                data: {
                    labels: ['Box Plot'],
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }
    }

    // Render radar chart
    renderRadarChart(canvas, chartData) {
        const ctx = canvas.getContext('2d');
        
        // Apply color palette to datasets
        const datasets = chartData.datasets.map((dataset, index) => {
            const colorIndex = index % this.colors.palette.length;
            return {
                ...dataset,
                backgroundColor: dataset.backgroundColor || this.colors.palette[colorIndex].replace('0.7', '0.3'),
                borderColor: dataset.borderColor || this.colors.palette[colorIndex].replace('0.7', '0.9'),
                borderWidth: 2
            };
        });
        
        // Adjust scale colors based on dark/light mode
        const isDarkMode = document.body.classList.contains('dark-mode');
        const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        
        this.activeCharts['radar_chart'] = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: chartData.labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                elements: {
                    line: {
                        borderWidth: 2
                    },
                    point: {
                        radius: 3
                    }
                },
                scales: {
                    r: {
                        angleLines: {
                            color: gridColor
                        },
                        grid: {
                            color: gridColor
                        },
                        pointLabels: {
                            color: this.colors.text
                        },
                        ticks: {
                            color: this.colors.text,
                            backdropColor: 'transparent'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: this.colors.text
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(30, 32, 50, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff'
                    }
                }
            }
        });
    }

    // Render bubble chart
    renderBubbleChart(canvas, chartData, options) {
        const ctx = canvas.getContext('2d');
        
        // Apply color palette to datasets
        const datasets = chartData.datasets.map((dataset, index) => {
            const colorIndex = index % this.colors.palette.length;
            return {
                ...dataset,
                backgroundColor: dataset.backgroundColor || this.colors.palette[colorIndex].replace('0.7', '0.6'),
                borderColor: dataset.borderColor || this.colors.palette[colorIndex].replace('0.7', '0.9'),
                borderWidth: dataset.borderWidth || 1
            };
        });
        
        this.activeCharts['bubble_chart'] = new Chart(ctx, {
            type: 'bubble',
            data: {
                datasets: datasets
            },
            options: options
        });
    }

    // Remove a chart
    removeChart(chartType) {
        // Destroy chart instance
        if (this.activeCharts[chartType]) {
            this.activeCharts[chartType].destroy();
            delete this.activeCharts[chartType];
        }
        
        // Remove chart container
        const chartContainer = document.getElementById(`chart-container-${chartType}`);
        if (chartContainer) {
            chartContainer.remove();
        }
        
        // Hide dashboard section if no charts are visible
        const chartsGrid = document.getElementById('chartsGrid');
        if (chartsGrid && chartsGrid.children.length === 0) {
            const dashboardSection = document.getElementById('dashboardSection');
            if (Object.keys(this.activeCharts).length === 0) {
                dashboardSection.style.display = 'none';
            }
        }
    }

    // Expand chart in a modal
    expandChart(chartType) {
        const chartData = this.chartData[chartType];
        const chartName = this.chartOptions.find(o => o.id === chartType)?.name || 'Chart Details';
        
        // Get modal elements
        const modal = document.getElementById('chartDetailModal');
        const modalTitle = document.getElementById('chartDetailTitle');
        const chartContainer = document.getElementById('chartDetailContainer');
        const saveBtn = document.getElementById('saveChartBtn');
        const closeBtn = modal.querySelector('.btn-close');
        const closeX = modal.querySelector('.close-modal');
        
        // Set modal content
        modalTitle.textContent = chartName;
        chartContainer.innerHTML = '<canvas id="chart-modal"></canvas>';
        
        // Show modal
        modal.style.display = 'block';
        
        // Add event listeners
        saveBtn.dataset.chartType = chartType;
        saveBtn.addEventListener('click', () => this.saveChart(chartType));
        
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            // Clean up the modal chart
            if (this.activeCharts['modal']) {
                try {
                    this.activeCharts['modal'].destroy();
                } catch (error) {
                    console.warn('Error destroying modal chart:', error);
                }
                delete this.activeCharts['modal'];
            }
        });
        
        closeX.addEventListener('click', () => {
            modal.style.display = 'none';
            // Clean up the modal chart
            if (this.activeCharts['modal']) {
                try {
                    this.activeCharts['modal'].destroy();
                } catch (error) {
                    console.warn('Error destroying modal chart:', error);
                }
                delete this.activeCharts['modal'];
            }
        });
        
        // Render chart in modal
        // Need to create a special version for modal
        const canvas = document.getElementById('chart-modal');
        const ctx = canvas.getContext('2d');

        try {
            // Clone chart data to avoid reference issues
            const modalChartData = JSON.parse(JSON.stringify(chartData));
            
            // Create default chart options with proper colors
            const defaultOptions = {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: {
                            color: this.colors.gridLines
                        },
                        ticks: {
                            color: this.colors.text
                        }
                    },
                    y: {
                        grid: {
                            color: this.colors.gridLines
                        },
                        ticks: {
                            color: this.colors.text
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: this.colors.text
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(30, 32, 50, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff'
                    }
                }
            };
            
            // Create chart based on type
            let chart;
            if (chartType === 'bar_chart') {
                // Apply color palette to datasets for bar chart
                if (modalChartData.datasets) {
                    modalChartData.datasets = modalChartData.datasets.map((dataset, index) => {
                        const colorIndex = index % this.colors.palette.length;
                        return {
                            ...dataset,
                            backgroundColor: dataset.backgroundColor || this.colors.palette[colorIndex],
                            borderColor: dataset.borderColor || this.colors.palette[colorIndex].replace('0.7', '0.9')
                        };
                    });
                }
                
                chart = new Chart(ctx, {
                    type: 'bar',
                    data: modalChartData,
                    options: defaultOptions
                });
            } else if (chartType === 'line_chart') {
                // Apply color palette to datasets for line chart
                if (modalChartData.datasets) {
                    modalChartData.datasets = modalChartData.datasets.map((dataset, index) => {
                        const colorIndex = index % this.colors.palette.length;
                        return {
                            ...dataset,
                            borderColor: dataset.borderColor || this.colors.palette[colorIndex],
                            backgroundColor: dataset.backgroundColor || this.colors.palette[colorIndex].replace('0.7', '0.2')
                        };
                    });
                }
                
                chart = new Chart(ctx, {
                    type: 'line',
                    data: modalChartData,
                    options: defaultOptions
                });
            } else if (chartType === 'pie_chart') {
                // Apply color palette to datasets for pie chart
                if (modalChartData.datasets) {
                    modalChartData.datasets = modalChartData.datasets.map(dataset => {
                        // Generate colors for each segment
                        const backgroundColors = [];
                        const borderColors = [];
                        
                        for (let i = 0; i < (modalChartData.labels?.length || 0); i++) {
                            const colorIndex = i % this.colors.palette.length;
                            backgroundColors.push(this.colors.palette[colorIndex]);
                            borderColors.push(this.colors.palette[colorIndex].replace('0.7', '0.9'));
                        }
                        
                        return {
                            ...dataset,
                            backgroundColor: backgroundColors,
                            borderColor: borderColors
                        };
                    });
                }
                
                chart = new Chart(ctx, {
                    type: 'pie',
                    data: modalChartData,
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'right',
                                labels: {
                                    color: this.colors.text
                                }
                            },
                            tooltip: {
                                backgroundColor: 'rgba(30, 32, 50, 0.8)',
                                titleColor: '#fff',
                                bodyColor: '#fff'
                            }
                        }
                    }
                });
            } else if (chartType === 'scatter_plot') {
                // Apply color palette to datasets for scatter plot
                if (modalChartData.datasets) {
                    modalChartData.datasets = modalChartData.datasets.map((dataset, index) => {
                        const colorIndex = index % this.colors.palette.length;
                        return {
                            ...dataset,
                            backgroundColor: dataset.backgroundColor || this.colors.palette[colorIndex],
                            borderColor: dataset.borderColor || this.colors.palette[colorIndex].replace('0.7', '0.9')
                        };
                    });
                }
                
                chart = new Chart(ctx, {
                    type: 'scatter',
                    data: modalChartData,
                    options: defaultOptions
                });
            } else if (chartType === 'radar_chart') {
                // Apply color palette to datasets for radar chart
                if (modalChartData.datasets) {
                    modalChartData.datasets = modalChartData.datasets.map((dataset, index) => {
                        const colorIndex = index % this.colors.palette.length;
                        return {
                            ...dataset,
                            backgroundColor: dataset.backgroundColor || this.colors.palette[colorIndex].replace('0.7', '0.3'),
                            borderColor: dataset.borderColor || this.colors.palette[colorIndex].replace('0.7', '0.9')
                        };
                    });
                }
                
                // Adjust scale colors based on dark/light mode
                const isDarkMode = document.body.classList.contains('dark-mode');
                const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
                
                chart = new Chart(ctx, {
                    type: 'radar',
                    data: modalChartData,
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        elements: {
                            line: {
                                borderWidth: 2
                            },
                            point: {
                                radius: 3
                            }
                        },
                        scales: {
                            r: {
                                angleLines: {
                                    color: gridColor
                                },
                                grid: {
                                    color: gridColor
                                },
                                pointLabels: {
                                    color: this.colors.text
                                },
                                ticks: {
                                    color: this.colors.text,
                                    backdropColor: 'transparent'
                                }
                            }
                        },
                        plugins: {
                            legend: {
                                labels: {
                                    color: this.colors.text
                                }
                            },
                            tooltip: {
                                backgroundColor: 'rgba(30, 32, 50, 0.8)',
                                titleColor: '#fff',
                                bodyColor: '#fff'
                            }
                        }
                    }
                });
            } else if (chartType === 'bubble_chart') {
                // Apply color palette to datasets for bubble chart
                if (modalChartData.datasets) {
                    modalChartData.datasets = modalChartData.datasets.map((dataset, index) => {
                        const colorIndex = index % this.colors.palette.length;
                        return {
                            ...dataset,
                            backgroundColor: dataset.backgroundColor || this.colors.palette[colorIndex].replace('0.7', '0.6'),
                            borderColor: dataset.borderColor || this.colors.palette[colorIndex].replace('0.7', '0.9')
                        };
                    });
                }
                
                chart = new Chart(ctx, {
                    type: 'bubble',
                    data: modalChartData,
                    options: defaultOptions
                });
            } else {
                console.error('Unsupported chart type for modal view:', chartType);
            }
            
            this.activeCharts['modal'] = chart;
        } catch (error) {
            console.error('Error rendering chart in modal:', error);
        }
    }

    // Save chart for later use
    async saveChart(chartType) {
        try {
            if (!this.chartData || !this.chartData[chartType]) {
                console.error('No chart data available for', chartType);
                alert('No chart data available to save');
                return;
            }
            
            // Get chart details for a better title
            const chartName = this.chartOptions.find(o => o.id === chartType)?.name || 'Chart';
            const fileName = document.querySelector('.file-info-name')?.textContent || 'Data';
            
            const chartTitle = `${chartName} - ${fileName}`;
            
            // Make API request to save the chart
            const response = await fetch('/api/chart', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chart_type: chartType,
                    chart_title: chartTitle,
                    file_index: 0  // Default to first file
                }),
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Show success message
                alert('Chart saved successfully!');
                
                // Update the chart data if needed
                if (data.chart_data) {
                    this.chartData[chartType] = data.chart_data;
                }
                
                // Close modal if open
                const modal = document.getElementById('chartDetailModal');
                if (modal && modal.style.display === 'block') {
                    modal.style.display = 'none';
                }
            } else {
                console.error('Error saving chart:', data.error);
                alert('Failed to save chart: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error saving chart:', error);
            alert('Network error occurred while saving chart');
        }
    }

    // Download chart as image
    downloadChart(chartType) {
        if (!this.activeCharts[chartType]) return;
        
        const chartName = this.chartOptions.find(o => o.id === chartType)?.name || 'chart';
        const canvas = document.getElementById(`chart-${chartType}`);
        
        // Create a temporary link
        const link = document.createElement('a');
        link.download = `${chartName.toLowerCase().replace(/\s+/g, '-')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    // Show error message when chart fails to render
    showChartError(chartType, errorMessage) {
        const chartBody = document.querySelector(`#chart-container-${chartType} .chart-body`);
        if (chartBody) {
            chartBody.innerHTML = `
                <div class="chart-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${errorMessage}</p>
                </div>
            `;
        }
    }
}

// Create global instance
const chartManager = new ChartManager();
