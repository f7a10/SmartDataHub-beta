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
        window.showSection('dashboard');
    });
    
    // Session data
    let sessionData = {
        files: [],
        metrics: {},
        chartOptions: [],
        sessionId: null,
        selectedFileIndices: [],
        combineFiles: false
    };
    
    // Initialize event listeners
    initEventListeners();
    
    // Initialize dashboard
    function initEventListeners() {
        // File input change event
        fileInput.addEventListener('change', handleFileSelection);
        
        // New Analysis buttons
        const newAnalysisBtn = document.getElementById('newAnalysisBtn');
        if (newAnalysisBtn) {
            newAnalysisBtn.addEventListener('click', startNewAnalysis);
        }
        
        const mainNewAnalysisBtn = document.getElementById('mainNewAnalysisBtn');
        if (mainNewAnalysisBtn) {
            mainNewAnalysisBtn.addEventListener('click', startNewAnalysis);
        }
        
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
            window.showSection('savedCharts');
            loadSavedCharts();
        });
        
        reportsLink.addEventListener('click', function(e) {
            e.preventDefault();
            window.showSection('reports');
            loadReports();
        });
        
        conversationsLink.addEventListener('click', function(e) {
            e.preventDefault();
            window.showSection('conversations');
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
            // Reset selected files and combined flag
            sessionData.selectedFileIndices = [];
            sessionData.combineFiles = false;
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
            const fileIndex = sessionData.files.length - 1;
            
            // Add to selected indices by default
            sessionData.selectedFileIndices.push(fileIndex);
            
            // Create file item element
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <div class="file-select">
                    <input type="checkbox" id="file-select-${fileIndex}" class="file-checkbox" data-index="${fileIndex}" checked>
                </div>
                <div class="file-name">${file.name}</div>
                <button class="delete-file" data-file="${file.name}" data-index="${fileIndex}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            fileList.appendChild(fileItem);
            
            // Add checkbox event
            const checkbox = fileItem.querySelector('.file-checkbox');
            checkbox.addEventListener('change', function() {
                const index = parseInt(this.getAttribute('data-index'));
                if (this.checked) {
                    // Add to selected indices
                    if (!sessionData.selectedFileIndices.includes(index)) {
                        sessionData.selectedFileIndices.push(index);
                    }
                } else {
                    // Remove from selected indices
                    sessionData.selectedFileIndices = sessionData.selectedFileIndices.filter(i => i !== index);
                }
                
                // Update analyze button state
                updateAnalyzeButtonState();
            });
            
            // Add delete button event
            fileItem.querySelector('.delete-file').addEventListener('click', function() {
                const fileName = this.getAttribute('data-file');
                const index = parseInt(this.getAttribute('data-index'));
                removeFile(fileName, fileItem, index);
            });
        }
        
        // Add file analysis controls if multiple files
        if (sessionData.files.length > 1 && !document.getElementById('file-analysis-controls')) {
            addFileAnalysisControls();
        }
        
        // Enable analyze button if files are present
        updateAnalyzeButtonState();
    }
    
    // Add controls for file analysis options
    function addFileAnalysisControls() {
        const controlsContainer = document.createElement('div');
        controlsContainer.id = 'file-analysis-controls';
        controlsContainer.className = 'file-analysis-controls';
        controlsContainer.innerHTML = `
            <div class="control-group">
                <button id="select-all-files" class="btn-sm">Select All</button>
                <button id="deselect-all-files" class="btn-sm">Deselect All</button>
            </div>
        `;
        
        // Insert after file list
        fileList.parentNode.insertBefore(controlsContainer, fileList.nextSibling);
        
        // Add event listeners
        
        // Select all files
        document.getElementById('select-all-files').addEventListener('click', function() {
            const checkboxes = document.querySelectorAll('.file-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = true;
                const index = parseInt(checkbox.getAttribute('data-index'));
                if (!sessionData.selectedFileIndices.includes(index)) {
                    sessionData.selectedFileIndices.push(index);
                }
            });
            updateAnalyzeButtonState();
        });
        
        // Deselect all files
        document.getElementById('deselect-all-files').addEventListener('click', function() {
            const checkboxes = document.querySelectorAll('.file-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
            sessionData.selectedFileIndices = [];
            updateAnalyzeButtonState();
        });
    }
    
    // Update analyze button state
    function updateAnalyzeButtonState() {
        analyzeBtn.disabled = sessionData.selectedFileIndices.length === 0;
    }
    
    // Remove file from list
    function removeFile(fileName, fileItem, index) {
        // Remove from session data
        sessionData.files = sessionData.files.filter(file => file.name !== fileName);
        
        // Remove from selected indices
        sessionData.selectedFileIndices = sessionData.selectedFileIndices.filter(i => i !== index);
        
        // Remove from UI
        fileItem.remove();
        
        // Remove file analysis controls if only one file left
        if (sessionData.files.length <= 1 && document.getElementById('file-analysis-controls')) {
            document.getElementById('file-analysis-controls').remove();
            sessionData.combineFiles = false;
        }
        
        // Update file indices in the UI
        updateFileIndices();
        
        // Update analyze button state
        updateAnalyzeButtonState();
    }
    
    // Update file indices in the UI after removing a file
    function updateFileIndices() {
        const fileItems = document.querySelectorAll('.file-item');
        fileItems.forEach((item, newIndex) => {
            const checkbox = item.querySelector('.file-checkbox');
            const deleteBtn = item.querySelector('.delete-file');
            
            if (checkbox) {
                checkbox.id = `file-select-${newIndex}`;
                checkbox.setAttribute('data-index', newIndex);
            }
            
            if (deleteBtn) {
                deleteBtn.setAttribute('data-index', newIndex);
            }
        });
        
        // Update selected indices
        const newSelectedIndices = [];
        document.querySelectorAll('.file-checkbox:checked').forEach(checkbox => {
            newSelectedIndices.push(parseInt(checkbox.getAttribute('data-index')));
        });
        sessionData.selectedFileIndices = newSelectedIndices;
    }
    
    // Analyze data
    async function analyzeData() {
        // Show loading state
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
        
        try {
            // Reset the previous analysis results
            sessionData.metrics = {};
            sessionData.chartOptions = [];
            
            // Clear the metrics grid
            metricsGrid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Calculating metrics...</div>';
            
            // Clear AI insights
            aiInsightsContent.innerHTML = "<div class='loading-message'>Generating insights...</div>";
            
            // Clean up previous charts to avoid rendering conflicts
            try {
                if (chartManager && typeof chartManager.clearAllCharts === 'function') {
                    chartManager.clearAllCharts();
                    console.log('Clearing all active charts');
                }
                
                // Reset chart containers if they exist
                const chartsContainers = document.querySelectorAll('[id^="chart-container-"]');
                chartsContainers.forEach(container => {
                    const canvasId = container.querySelector('canvas')?.id;
                    if (canvasId) {
                        const chartType = canvasId.replace('chart-', '');
                        container.innerHTML = `<canvas id="${canvasId}"></canvas>`;
                    }
                });
                console.log('Previous charts cleaned up successfully');
            } catch (clearError) {
                console.warn('Error clearing previous charts:', clearError);
            }
            
            // First, upload the files if not already done
            if (!sessionData.sessionId) {
                const uploadResult = await uploadFiles(sessionData.files);
                
                if (uploadResult.success) {
                    // Store session id
                    sessionData.sessionId = uploadResult.session_id;
                } else {
                    showNotification('Error uploading files: ' + (uploadResult.error || 'Unknown error'), 'error');
                    return;
                }
            }
            
            // Now, analyze the uploaded files with options
            const analysisResult = await fetchAnalysis(
                sessionData.sessionId, 
                sessionData.selectedFileIndices,
                sessionData.combineFiles
            );
            
            if (analysisResult.success) {
                // Store data in session with fresh copies
                sessionData.metrics = analysisResult.metrics ? { ...analysisResult.metrics } : {};
                sessionData.chartOptions = analysisResult.chart_options ? [ ...analysisResult.chart_options ] : [];
                
                // Additional logging to debug data flow
                console.log('Retrieved metrics from server:', analysisResult.metrics);
                console.log('Updated session metrics:', sessionData.metrics);
                
                // Update UI with results - forcing display to refresh with new data
                dashboardSection.style.display = 'block';  // Make sure the section is visible
                displayAnalysisResults(analysisResult);
            } else {
                showNotification('Error analyzing files: ' + (analysisResult.error || 'Unknown error'), 'error');
                // Clear any stale UI elements on error
                metricsGrid.innerHTML = '<div class="error-state">Analysis failed. Please try again.</div>';
                aiInsightsContent.innerHTML = "<div class='error-message'>Unable to generate insights. Please try again.</div>";
            }
        } catch (error) {
            console.error('Error during analysis:', error);
            showNotification('An error occurred during analysis', 'error');
            // Clear any stale UI elements on error
            metricsGrid.innerHTML = '<div class="error-state">Analysis failed. Please try again.</div>';
            aiInsightsContent.innerHTML = "<div class='error-message'>Unable to generate insights. Please try again.</div>";
        } finally {
            // Reset button state
            analyzeBtn.disabled = sessionData.selectedFileIndices.length === 0;
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
            
            // Add a clear_previous flag to tell the server to clear previous files
            formData.append('clear_previous', 'true');
            
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
    async function fetchAnalysis(sessionId, fileIndices = [], combineFiles = false) {
        try {
            // Create data object for POST request
            const requestData = {
                session_id: sessionId,
                combine_files: combineFiles
            };
            
            // Add file indices if provided
            if (fileIndices && fileIndices.length > 0) {
                requestData.file_indices = fileIndices;
            }
            
            console.log('Fetching analysis with data:', requestData);
            
            // Use POST method to avoid URL length limitations and encoding issues
            const response = await fetch('/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });
            
            const data = await response.json();
            console.log('Analysis response:', data);
            
            return data;
        } catch (error) {
            console.error('Error fetching analysis:', error);
            return { success: false, error: 'Network error occurred' };
        }
    }
    
    // Display analysis results
    function displayAnalysisResults(results) {
        try {
            console.log('Displaying analysis results:', results);
            
            // Show dashboard section
            dashboardSection.style.display = 'block';
            
            // Display metrics - with extra logging
            if (results.metrics) {
                console.log('Metrics found in results:', results.metrics);
                displayMetrics(results.metrics);
            } else {
                console.warn('No metrics found in analysis results');
                // Use empty metrics as fallback
                displayMetrics({
                    file_count: results.files ? results.files.length : 0,
                    total_rows: 'N/A',
                    total_columns: 'N/A'
                });
            }
            
            // Initialize chart options and data with careful error handling
            setTimeout(() => {
                try {
                    // Initialize chart options first
                    if (results.chart_options && Array.isArray(results.chart_options) && results.chart_options.length > 0) {
                        chartManager.setChartOptions(results.chart_options);
                        console.log('Chart options set successfully');
                    } else {
                        console.warn('No valid chart options received');
                    }
                    
                    // Then set chart data - delay to prevent race conditions
                    setTimeout(() => {
                        try {
                            if (results.visualizations && typeof results.visualizations === 'object') {
                                chartManager.setChartData(results.visualizations);
                                console.log('Chart data set successfully');
                            } else {
                                console.warn('No valid visualizations data received');
                            }
                        } catch (chartDataError) {
                            console.error('Error setting chart data:', chartDataError);
                        }
                    }, 100);
                } catch (chartOptionsError) {
                    console.error('Error setting chart options:', chartOptionsError);
                }
            }, 100);
            
            // Display AI insights
            if (results.ai_insights) {
                // Use the marked library for proper Markdown rendering if available
                if (typeof marked !== 'undefined') {
                    try {
                        // Configure marked options
                        marked.setOptions({
                            breaks: true,              // Add <br> on single line breaks
                            gfm: true,                 // GitHub Flavored Markdown
                            headerIds: false,          // Don't add IDs to headers
                            mangle: false,             // Don't mangle email addresses
                            smartLists: true,          // Use smarter list behavior
                            smartypants: true,         // Use "smart" typographic punctuation
                            xhtml: false               // Don't close tags with a slash
                        });
                        
                        // Parse Markdown to HTML
                        aiInsightsContent.innerHTML = marked.parse(results.ai_insights);
                    } catch (e) {
                        console.error('Error parsing Markdown for AI insights:', e);
                        // Fall back to basic formatting if marked fails
                        aiInsightsContent.innerHTML = formatBasicMarkdown(results.ai_insights);
                    }
                } else {
                    // Fall back to basic formatting if marked isn't available
                    aiInsightsContent.innerHTML = formatBasicMarkdown(results.ai_insights);
                }
            } else {
                aiInsightsContent.innerHTML = "<div class='empty-message'>No AI insights available for this data.</div>";
            }
            
            // Helper function for basic Markdown formatting
            function formatBasicMarkdown(content) {
                return content
                    .replace(/# (.*)/g, '<h1>$1</h1>')
                    .replace(/## (.*)/g, '<h2>$1</h2>')
                    .replace(/### (.*)/g, '<h3>$1</h3>')
                    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
                    .replace(/- (.*)/g, '<ul><li>$1</li></ul>')
                    .replace(/<\/ul><ul>/g, '')  // Combine consecutive list items
                    .replace(/\n/g, '<br>');
            }
            
            // Safely scroll to dashboard section
            try {
                dashboardSection.scrollIntoView({ behavior: 'smooth' });
            } catch (scrollError) {
                console.warn('Smooth scrolling not supported:', scrollError);
                try {
                    // Fallback to standard scrollIntoView
                    dashboardSection.scrollIntoView();
                } catch (e) {
                    console.error('Cannot scroll to dashboard section:', e);
                }
            }
        } catch (error) {
            console.error('Error displaying analysis results:', error);
            showNotification('Error displaying analysis results. Please try again.', 'error');
        }
    }
    
    // Display metrics
    function displayMetrics(metrics) {
        console.log('Displaying metrics:', metrics);
        if (!metrics) {
            console.warn('No metrics provided to displayMetrics function');
            return;
        }
        
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
                console.log(`Creating metric card for ${metric.key}: ${metrics[metric.key]}`);
                const card = document.createElement('div');
                card.className = 'metric-card';
                card.innerHTML = `
                    <span class="metric-value">${metrics[metric.key]}</span>
                    <span class="metric-label">${metric.label}</span>
                `;
                metricsGrid.appendChild(card);
            } else {
                console.warn(`Metric ${metric.key} not found in provided metrics object`);
            }
        });
        
        // Add any additional metrics provided by the server
        for (const [key, value] of Object.entries(metrics)) {
            // Skip session_id and combined_analysis metrics
            if (!metricDisplays.some(m => m.key === key) && 
                key !== 'session_id' && 
                key !== 'combined_analysis') {
                
                console.log(`Adding additional metric ${key}: ${value}`);
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
        
        // Store metrics in session data for reference
        sessionData.metrics = { ...metrics };
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
    
    // Use the global showSection function directly
    // No local function needed as window.showSection is already defined
    
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
    
    // Start a new analysis session
    function startNewAnalysis() {
        // Show confirmation dialog
        if (confirm("Start a new analysis? This will save your current conversation and start a new analysis.")) {
            // Save current conversation first, then create new session
            saveCurrentConversation().then(() => {
                // Reset session data
                sessionData = {
                    files: [],
                    metrics: {},
                    chartOptions: [],
                    sessionId: null,
                    selectedFileIndices: [],
                    combineFiles: false
                };
                
                // Clear UI elements
                fileList.innerHTML = '';
                if (document.getElementById('file-analysis-controls')) {
                    document.getElementById('file-analysis-controls').remove();
                }
                
                // Reset file input
                fileInput.value = '';
                
                // Disable analyze button
                analyzeBtn.disabled = true;
                
                // Clear charts and metrics if displayed
                if (chartManager && typeof chartManager.clearAllCharts === 'function') {
                    chartManager.clearAllCharts();
                }
                
                metricsGrid.innerHTML = '';
                
                // Reset chat section
                if (window.AIChat && typeof window.AIChat.resetChat === 'function') {
                    window.AIChat.resetChat();
                }
                
                // Show upload section, hide dashboard section
                window.showSection('dashboard');
                dashboardSection.style.display = 'none';
                
                // Clear AI insights
                if (aiInsightsContent) {
                    aiInsightsContent.innerHTML = '';
                }
                
                // Create a new session on the server side
                createNewServerSession();
                
                // Show success notification
                showNotification('Previous conversation saved and new analysis started', 'success');
            });
        }
    }
    
    // Save current conversation before starting a new one
    async function saveCurrentConversation() {
        try {
            // Check if AIChat has an active conversation
            if (window.AIChat && typeof window.AIChat.saveCurrentConversation === 'function') {
                await window.AIChat.saveCurrentConversation();
                console.log('Current conversation saved successfully');
            } else {
                console.log('No active conversation to save or saveCurrentConversation not available');
            }
        } catch (error) {
            console.error('Error saving conversation:', error);
        }
    }
    
    // Create a new session on the server
    async function createNewServerSession() {
        try {
            const formData = new FormData();
            formData.append('clear_previous', 'true');
            
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    sessionData.sessionId = data.session_id;
                    console.log('New session created:', sessionData.sessionId);
                }
            }
        } catch (error) {
            console.error('Error creating new session:', error);
        }
    }
    
    // Dark mode toggle functionality
    const toggleDarkModeBtn = document.getElementById('toggleDarkMode');
    const profileLink = document.getElementById('profileLink');
    const profileModal = document.getElementById('profileModal');
    const closeProfileModal = document.getElementById('closeProfileModal');
    const closeProfileBtn = document.getElementById('closeProfileBtn');
    
    // Check for saved theme preference or default to dark mode
    function initTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
            document.body.classList.add('light-mode');
            toggleDarkModeBtn.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
        } else {
            document.body.classList.remove('light-mode');
            toggleDarkModeBtn.innerHTML = '<i class="fas fa-moon"></i> Dark Mode';
        }
        
        // Dispatch initial theme event for components that need to know the current theme
        setTimeout(() => {
            document.dispatchEvent(new CustomEvent('themeChanged', {
                detail: {
                    theme: document.body.classList.contains('light-mode') ? 'light' : 'dark'
                }
            }));
        }, 100);
    }
    
    // Initialize theme on page load
    initTheme();
    
    // Toggle between dark and light mode
    toggleDarkModeBtn.addEventListener('click', function(e) {
        e.preventDefault();
        
        if (document.body.classList.contains('light-mode')) {
            // Switch to dark mode
            document.body.classList.remove('light-mode');
            localStorage.setItem('theme', 'dark');
            toggleDarkModeBtn.innerHTML = '<i class="fas fa-moon"></i> Dark Mode';
        } else {
            // Switch to light mode
            document.body.classList.add('light-mode');
            localStorage.setItem('theme', 'light');
            toggleDarkModeBtn.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
        }
        
        // Dispatch a custom event so chart colors can be updated
        document.dispatchEvent(new CustomEvent('themeChanged', {
            detail: {
                theme: document.body.classList.contains('light-mode') ? 'light' : 'dark'
            }
        }));
    });
    
    // Profile modal functionality
    profileLink.addEventListener('click', function(e) {
        e.preventDefault();
        profileModal.style.display = 'block';
    });
    
    // Close profile modal when clicking the X button
    closeProfileModal.addEventListener('click', function() {
        profileModal.style.display = 'none';
    });
    
    // Close profile modal when clicking the Close button
    closeProfileBtn.addEventListener('click', function() {
        profileModal.style.display = 'none';
    });
    
    // Close profile modal when clicking outside the modal
    window.addEventListener('click', function(e) {
        if (e.target === profileModal) {
            profileModal.style.display = 'none';
        }
    });
});
