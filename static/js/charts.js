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
        // Chart colors
        this.colors = {
            primary: '#a855f7',
            secondary: '#7928ca',
            background: 'rgba(168, 85, 247, 0.2)',
            border: 'rgba(121, 40, 202, 0.8)',
            gridLines: 'rgba(255, 255, 255, 0.1)',
            text: '#d1d5db'
        };
    }

    // Initialize chart options based on API response
    setChartOptions(options) {
        this.chartOptions = options;
        this.renderChartOptions();
    }

    // Store chart data from API
    setChartData(data) {
        this.chartData = data;
    }

    // Render chart selection options
    renderChartOptions() {
        const container = document.getElementById('chartSelectionGrid');
        if (!container) return;

        container.innerHTML = '';

        this.chartOptions.forEach(option => {
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

            card.innerHTML = `
                <div class="chart-option-icon">
                    <i class="fas ${iconClass}"></i>
                </div>
                <div class="chart-option-name">${option.name}</div>
                <div class="chart-option-desc">${option.suitable ? 'Suitable for your data' : 'Not ideal for this data'}</div>
            `;

            card.addEventListener('click', () => this.toggleChartSelection(option.id));
            container.appendChild(card);
        });
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
        document.getElementById('analysisSection').scrollIntoView({ behavior: 'smooth' });
        
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
                        file_index: 0  // Default to first file
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
            
            this.activeCharts['line_chart'] = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: chartData.labels || [],
                    datasets: (chartData.datasets || []).map(dataset => ({
                        ...dataset,
                        borderColor: dataset.borderColor || this.colors.primary,
                        backgroundColor: dataset.backgroundColor || this.colors.background
                    }))
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
            
            this.activeCharts['bar_chart'] = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: chartData.labels || [],
                    datasets: (chartData.datasets || []).map(dataset => ({
                        ...dataset,
                        backgroundColor: dataset.backgroundColor || this.colors.primary,
                        borderColor: dataset.borderColor || this.colors.border,
                        borderWidth: dataset.borderWidth || 1
                    }))
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
        
        this.activeCharts['pie_chart'] = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: chartData.labels,
                datasets: chartData.datasets
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
        
        this.activeCharts['histogram'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartData.labels,
                datasets: chartData.datasets.map(dataset => ({
                    ...dataset,
                    backgroundColor: dataset.backgroundColor || this.colors.primary,
                    borderColor: dataset.borderColor || this.colors.border,
                    borderWidth: dataset.borderWidth || 1
                }))
            },
            options: histogramOptions
        });
    }

    // Render scatter plot
    renderScatterPlot(canvas, chartData, options) {
        const ctx = canvas.getContext('2d');
        
        this.activeCharts['scatter_plot'] = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: chartData.datasets.map(dataset => ({
                    ...dataset,
                    backgroundColor: dataset.backgroundColor || this.colors.primary,
                    borderColor: dataset.borderColor || this.colors.border
                }))
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
            const datasets = chartData.datasets.map(dataset => {
                const boxData = dataset.data[0];
                return {
                    label: dataset.label,
                    backgroundColor: dataset.backgroundColor || this.colors.background,
                    borderColor: dataset.borderColor || this.colors.border,
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
            this.activeCharts['box_plot'] = new Chart(ctx, {
                type: 'boxplot',
                data: {
                    labels: ['Box Plot'],
                    datasets: chartData.datasets
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
        
        this.activeCharts['radar_chart'] = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: chartData.labels,
                datasets: chartData.datasets.map(dataset => ({
                    ...dataset,
                    backgroundColor: dataset.backgroundColor || this.colors.background,
                    borderColor: dataset.borderColor || this.colors.primary
                }))
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
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
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
        
        this.activeCharts['bubble_chart'] = new Chart(ctx, {
            type: 'bubble',
            data: {
                datasets: chartData.datasets.map(dataset => ({
                    ...dataset,
                    backgroundColor: dataset.backgroundColor || this.colors.background,
                    borderColor: dataset.borderColor || this.colors.border
                }))
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
        });
        
        closeX.addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        // Render chart in modal
        const canvas = document.getElementById('chart-modal');
        this.renderChart(chartType, chartData);
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
