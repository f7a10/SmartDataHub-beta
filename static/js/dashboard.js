// Dashboard.js - Handles the dashboard UI and file upload functionality

document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const fileInput = document.getElementById('fileInput');
    const dropZone = document.getElementById('dropZone');
    const fileList = document.getElementById('fileList');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const dashboardSection = document.getElementById('dashboardSection');
    const metricsGrid = document.getElementById('metricsGrid');
    const aiInsightsContent = document.getElementById('aiInsightsContent');
    const savedChartsLink = document.getElementById('savedChartsLink');
    const reportsLink = document.getElementById('reportsLink');
    const conversationsLink = document.getElementById('conversationsLink');
    const exportReportBtn = document.getElementById('exportReportBtn');
    
    // Navigation sections
    const mainSections = {
        'dashboard': document.querySelector('.upload-section'),
        'savedCharts': document.getElementById('savedChartsSection'),
        'reports': document.getElementById('reportsSection'),
        'conversations': document.getElementById('conversationsSection')
    };
    
    // Add click listener to the Dashboard link in the sidebar
    document.querySelector('.sidebar-nav li:first-child a').addEventListener('click', function(e) {
        e.preventDefault();
        showSection('dashboard');
    });
    
    // Session data
    let sessionData = {
        files: [],
        metrics: {},
        chartOptions: [],
        sessionId: null
    };
    
    // Initialize event listeners
    initEventListeners();
    
    // Initialize dashboard
    function initEventListeners() {
        // File input change event
        fileInput.addEventListener('change', handleFileSelection);
        
        // File drop zone events
        dropZone.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.classList.add('drag-over');
        });
        
        dropZone.addEventListener('dragleave', function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.classList.remove('drag-over');
        });
        
        dropZone.addEventListener('drop', function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.classList.remove('drag-over');
            
            if (e.dataTransfer.files.length > 0) {
                handleFileSelection({ target: { files: e.dataTransfer.files } });
            }
        });
        
        // Analyze button click
        analyzeBtn.addEventListener('click', analyzeData);
        
        // Navigation links
        savedChartsLink.addEventListener('click', function(e) {
            e.preventDefault();
            showSection('savedCharts');
            loadSavedCharts();
        });
        
        reportsLink.addEventListener('click', function(e) {
            e.preventDefault();
            showSection('reports');
            loadReports();
        });
        
        conversationsLink.addEventListener('click', function(e) {
            e.preventDefault();
            showSection('conversations');
            // Call the loadConversations function from AIChat
            if (window.AIChat && window.AIChat.loadConversations) {
                window.AIChat.loadConversations();
            }
        });
        
        // Export report button
        exportReportBtn.addEventListener('click', openExportReportModal);
    }
    
    // Handle file selection
    function handleFileSelection(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        
        // Clear file list if this is a new upload
        if (sessionData.files.length === 0) {
            fileList.innerHTML = '';
        }
        
        // Process each file
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            // Check file type
            const extension = file.name.split('.').pop().toLowerCase();
            const allowedExtensions = ['csv', 'xlsx', 'xls', 'json', 'txt'];
            
            if (!allowedExtensions.includes(extension)) {
                showNotification(`File type .${extension} is not supported`, 'error');
                continue;
            }
            
            // Check if file is already in the list
            if (sessionData.files.some(f => f.name === file.name)) {
                showNotification(`File ${file.name} is already added`, 'warning');
                continue;
            }
            
            // Add file to session data
            sessionData.files.push(file);
            
            // Create file item element
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <div class="file-name">${file.name}</div>
                <button class="delete-file" data-file="${file.name}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            fileList.appendChild(fileItem);
            
            // Add delete button event
            fileItem.querySelector('.delete-file').addEventListener('click', function() {
                const fileName = this.getAttribute('data-file');
                removeFile(fileName, fileItem);
            });
        }
        
        // Enable analyze button if files are present
        analyzeBtn.disabled = sessionData.files.length === 0;
    }
    
    // Remove file from list
    function removeFile(fileName, fileItem) {
        // Remove from session data
        sessionData.files = sessionData.files.filter(file => file.name !== fileName);
        
        // Remove from UI
        fileItem.remove();
        
        // Disable analyze button if no files are left
        analyzeBtn.disabled = sessionData.files.length === 0;
    }
    
    // Analyze data
    async function analyzeData() {
        // Show loading state
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
        
        try {
            // First, upload the files
            const uploadResult = await uploadFiles(sessionData.files);
            
            if (uploadResult.success) {
                // Store session id
                sessionData.sessionId = uploadResult.session_id;
                
                // Now, analyze the uploaded files
                const analysisResult = await fetchAnalysis(sessionData.sessionId);
                
                if (analysisResult.success) {
                    // Store data in session
                    sessionData.metrics = analysisResult.metrics || {};
                    sessionData.chartOptions = analysisResult.chart_options || [];
                    
                    // Update UI with results
                    displayAnalysisResults(analysisResult);
                } else {
                    showNotification('Error analyzing files: ' + (analysisResult.error || 'Unknown error'), 'error');
                }
            } else {
                showNotification('Error uploading files: ' + (uploadResult.error || 'Unknown error'), 'error');
            }
        } catch (error) {
            console.error('Error during analysis:', error);
            showNotification('An error occurred during analysis', 'error');
        } finally {
            // Reset button state
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '<i class="fas fa-chart-line"></i> Analyze Data';
        }
    }
    
    // Upload files to server
    async function uploadFiles(files) {
        try {
            const formData = new FormData();
            
            // Add each file to form data
            for (let i = 0; i < files.length; i++) {
                formData.append('files[]', files[i]);
            }
            
            // Send request
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });
            
            return await response.json();
        } catch (error) {
            console.error('Error uploading files:', error);
            return { success: false, error: 'Network error occurred' };
        }
    }
    
    // Fetch analysis results
    async function fetchAnalysis(sessionId) {
        try {
            const response = await fetch(`/analyze?session_id=${sessionId}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching analysis:', error);
            return { success: false, error: 'Network error occurred' };
        }
    }
    
    // Display analysis results
    function displayAnalysisResults(results) {
        // Show dashboard section
        dashboardSection.style.display = 'block';
        
        // Display metrics
        displayMetrics(results.metrics);
        
        // Initialize chart options
        if (results.chart_options && results.chart_options.length > 0) {
            chartManager.setChartOptions(results.chart_options);
        }
        
        // Set chart data
        if (results.visualizations) {
            chartManager.setChartData(results.visualizations);
        }
        
        // Display AI insights
        if (results.ai_insights) {
            aiInsightsContent.textContent = results.ai_insights;
        } else {
            aiInsightsContent.textContent = "No AI insights available for this data.";
        }
        
        // Scroll to dashboard section
        dashboardSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Display metrics
    function displayMetrics(metrics) {
        if (!metrics) return;
        
        metricsGrid.innerHTML = '';
        
        // Define metrics to display
        const metricDisplays = [
            { key: 'file_count', label: 'Files', icon: 'fa-file' },
            { key: 'total_rows', label: 'Total Rows', icon: 'fa-table-list' },
            { key: 'total_columns', label: 'Total Columns', icon: 'fa-table-columns' }
        ];
        
        // Create metric cards
        metricDisplays.forEach(metric => {
            if (metrics[metric.key] !== undefined) {
                const card = document.createElement('div');
                card.className = 'metric-card';
                card.innerHTML = `
                    <span class="metric-value">${metrics[metric.key]}</span>
                    <span class="metric-label">${metric.label}</span>
                `;
                metricsGrid.appendChild(card);
            }
        });
        
        // Add any additional metrics provided by the server
        for (const [key, value] of Object.entries(metrics)) {
            if (!metricDisplays.some(m => m.key === key) && key !== 'session_id') {
                const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                const card = document.createElement('div');
                card.className = 'metric-card';
                card.innerHTML = `
                    <span class="metric-value">${value}</span>
                    <span class="metric-label">${label}</span>
                `;
                metricsGrid.appendChild(card);
            }
        }
    }
    
    // Load saved charts
    async function loadSavedCharts() {
        const savedChartsGrid = document.getElementById('savedChartsGrid');
        savedChartsGrid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading saved charts...</div>';
        
        try {
            const response = await fetch('/api/charts/saved');
            const data = await response.json();
            
            if (data.success && data.charts) {
                displaySavedCharts(data.charts);
            } else {
                savedChartsGrid.innerHTML = '<div class="empty-state">No saved charts found</div>';
            }
        } catch (error) {
            console.error('Error loading saved charts:', error);
            savedChartsGrid.innerHTML = '<div class="error-state">Error loading saved charts</div>';
        }
    }
    
    // Display saved charts
    function displaySavedCharts(charts) {
        const savedChartsGrid = document.getElementById('savedChartsGrid');
        savedChartsGrid.innerHTML = '';
        
        if (charts.length === 0) {
            savedChartsGrid.innerHTML = '<div class="empty-state">No saved charts found</div>';
            return;
        }
        
        charts.forEach(chart => {
            const card = document.createElement('div');
            card.className = 'saved-chart-card';
            card.innerHTML = `
                <div class="saved-chart-header">
                    <h4>${chart.title}</h4>
                </div>
                <div class="saved-chart-body">
                    <canvas id="saved-chart-${chart.id}"></canvas>
                </div>
                <div class="saved-chart-footer">
                    <div class="chart-date">${new Date(chart.created_at).toLocaleDateString()}</div>
                    <div class="saved-chart-actions">
                        <button class="view-chart-btn" data-id="${chart.id}">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="delete-chart-btn" data-id="${chart.id}">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
            savedChartsGrid.appendChild(card);
            
            // Add event listeners to buttons
            card.querySelector('.view-chart-btn').addEventListener('click', () => {
                viewSavedChart(chart.id);
            });
            
            card.querySelector('.delete-chart-btn').addEventListener('click', () => {
                deleteSavedChart(chart.id, card);
            });
            
            // Load chart data and render
            loadSavedChart(chart.id);
        });
    }
    
    // Load individual saved chart
    async function loadSavedChart(chartId) {
        try {
            const response = await fetch(`/api/charts/${chartId}`);
            const data = await response.json();
            
            if (data.success && data.chart) {
                const canvas = document.getElementById(`saved-chart-${chartId}`);
                if (canvas) {
                    renderSavedChart(canvas, data.chart);
                }
            }
        } catch (error) {
            console.error(`Error loading chart ${chartId}:`, error);
        }
    }
    
    // Render saved chart
    function renderSavedChart(canvas, chartData) {
        const ctx = canvas.getContext('2d');
        
        // Create chart based on type
        new Chart(ctx, {
            type: chartData.type.replace('_', ''),
            data: chartData.data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
    
    // View saved chart details
    function viewSavedChart(chartId) {
        // Implementation for viewing detailed chart
        console.log('View chart:', chartId);
    }
    
    // Delete saved chart
    async function deleteSavedChart(chartId, cardElement) {
        if (!confirm('Are you sure you want to delete this chart?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/charts/${chartId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                cardElement.remove();
                showNotification('Chart deleted successfully', 'success');
            } else {
                showNotification('Error deleting chart: ' + (data.error || 'Unknown error'), 'error');
            }
        } catch (error) {
            console.error('Error deleting chart:', error);
            showNotification('Network error occurred', 'error');
        }
    }
    
    // Show section and hide others
    // Make showSection globally available
    window.showSection = function(sectionName) {
        // Update active state in sidebar
        const navItems = document.querySelectorAll('.sidebar-nav li');
        navItems.forEach(item => item.classList.remove('active'));
        
        if (sectionName === 'dashboard') {
            navItems[0].classList.add('active');
        } else if (sectionName === 'savedCharts') {
            navItems[1].classList.add('active');
        } else if (sectionName === 'reports') {
            navItems[2].classList.add('active');
        } else if (sectionName === 'conversations') {
            navItems[3].classList.add('active');
        }
        
        // Hide all sections
        for (const section in mainSections) {
            if (mainSections[section]) {
                mainSections[section].style.display = 'none';
            }
        }
        
        // Also hide the AI chat and dashboard sections when not on dashboard
        const aiChatSection = document.getElementById('aiChatSection');
        if (sectionName !== 'dashboard') {
            aiChatSection.style.display = 'none';
            dashboardSection.style.display = 'none';
        } else {
            aiChatSection.style.display = 'block';
            // Only show dashboard if we have analyzed data
            dashboardSection.style.display = sessionData.sessionId ? 'block' : 'none';
        }
        
        // Show selected section
        if (mainSections[sectionName]) {
            mainSections[sectionName].style.display = 'block';
        }
    };
    
    // Local reference for internal use
    function showSection(sectionName) {
        window.showSection(sectionName);
    }
    
    // Open export report modal
    function openExportReportModal() {
        // Get modal elements
        const modal = document.getElementById('reportModal');
        const reportPreview = document.getElementById('reportPreview');
        const downloadBtn = document.getElementById('downloadReportBtn');
        const closeModal = modal.querySelector('.close-modal');
        const cancelBtn = modal.querySelector('.btn-cancel');
        
        // Generate report preview
        reportPreview.innerHTML = '';
        
        // Add report header
        const reportHeader = document.createElement('div');
        reportHeader.className = 'report-header-preview';
        reportHeader.innerHTML = `
            <h2>Data Analysis Report</h2>
            <p>Generated on ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
        `;
        reportPreview.appendChild(reportHeader);
        
        // Add metrics section
        if (Object.keys(sessionData.metrics).length > 0) {
            const metricsSection = document.createElement('div');
            metricsSection.className = 'report-metrics-preview';
            metricsSection.innerHTML = '<h3>Data Metrics</h3>';
            
            const metricsList = document.createElement('ul');
            for (const [key, value] of Object.entries(sessionData.metrics)) {
                if (key !== 'session_id') {
                    const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    metricsList.innerHTML += `<li><strong>${label}:</strong> ${value}</li>`;
                }
            }
            
            metricsSection.appendChild(metricsList);
            reportPreview.appendChild(metricsSection);
        }
        
        // Add charts section
        const selectedCharts = Object.keys(chartManager.activeCharts);
        if (selectedCharts.length > 0) {
            const chartsSection = document.createElement('div');
            chartsSection.className = 'report-charts-preview';
            chartsSection.innerHTML = '<h3>Visualizations</h3>';
            
            selectedCharts.forEach(chartType => {
                const chartName = chartManager.chartOptions.find(o => o.id === chartType)?.name || 'Chart';
                const chartItem = document.createElement('div');
                chartItem.className = 'report-chart-item';
                chartItem.innerHTML = `
                    <h4>${chartName}</h4>
                    <div class="chart-preview-container">
                        <canvas id="report-preview-${chartType}"></canvas>
                    </div>
                `;
                chartsSection.appendChild(chartItem);
            });
            
            reportPreview.appendChild(chartsSection);
            
            // Render chart previews
            selectedCharts.forEach(chartType => {
                const canvas = document.getElementById(`report-preview-${chartType}`);
                if (canvas && chartManager.chartData[chartType]) {
                    const ctx = canvas.getContext('2d');
                    const chartData = chartManager.chartData[chartType];
                    
                    new Chart(ctx, {
                        type: chartType.replace('_', ''),
                        data: chartData,
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {
                                    display: true,
                                    position: 'bottom'
                                }
                            }
                        }
                    });
                }
            });
        }
        
        // Add AI insights section
        if (aiInsightsContent.textContent) {
            const insightsSection = document.createElement('div');
            insightsSection.className = 'report-insights-preview';
            insightsSection.innerHTML = `
                <h3>AI Insights</h3>
                <div class="insights-content">${aiInsightsContent.textContent}</div>
            `;
            reportPreview.appendChild(insightsSection);
        }
        
        // Show modal
        modal.style.display = 'block';
        
        // Add event listeners
        downloadBtn.addEventListener('click', downloadReport);
        
        closeModal.addEventListener('click', function() {
            modal.style.display = 'none';
        });
        
        cancelBtn.addEventListener('click', function() {
            modal.style.display = 'none';
        });
        
        // Close on outside click
        window.addEventListener('click', function(event) {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
    
    // Download report as PDF
    function downloadReport() {
        const reportPreview = document.getElementById('reportPreview');
        const { jsPDF } = window.jspdf;
        
        // Create PDF
        html2canvas(reportPreview).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
            const imgX = (pdfWidth - imgWidth * ratio) / 2;
            const imgY = 30;
            
            // Add title
            pdf.setFontSize(20);
            pdf.text('Data Analysis Report', pdfWidth / 2, 20, { align: 'center' });
            
            // Add image
            pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
            
            // Save PDF
            pdf.save('data-analysis-report.pdf');
        });
    }
    
    // Show notification
    function showNotification(message, type = 'info') {
        // Check if notification container exists
        let notificationContainer = document.querySelector('.notification-container');
        
        if (!notificationContainer) {
            // Create notification container
            notificationContainer = document.createElement('div');
            notificationContainer.className = 'notification-container';
            document.body.appendChild(notificationContainer);
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close"><i class="fas fa-times"></i></button>
        `;
        
        // Add to container
        notificationContainer.appendChild(notification);
        
        // Add event listener to close button
        notification.querySelector('.notification-close').addEventListener('click', function() {
            notification.remove();
        });
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 5000);
    }
});
