// Dashboard.js - Handles the dashboard UI and file upload functionality

// Define showSection globally so it can be accessed from different JS files
window.showSection = function(sectionName) {
    // Get all main sections
    const sections = {
        'dashboard': document.querySelector('.upload-section'),
        'savedCharts': document.getElementById('savedChartsSection'),
        'reports': document.getElementById('reportsSection'),
        'conversations': document.getElementById('conversationsSection')
    };
    
    // Hide all sections first
    Object.values(sections).forEach(section => {
        if (section) section.style.display = 'none';
    });
    
    // Get the AI chat section and dashboard section (analysis results area)
    const aiChatSection = document.getElementById('aiChatSection');
    const dashboardSection = document.getElementById('dashboardSection');
    
    // Always hide dashboard section when changing pages
    if (dashboardSection) {
        dashboardSection.style.display = 'none';
    }
    
    // Show the selected section
    if (sections[sectionName]) {
        sections[sectionName].style.display = 'block';
        
        // Only show AI Chat on the dashboard page
        if (sectionName === 'dashboard') {
            if (aiChatSection) aiChatSection.style.display = 'block';
        } else {
            if (aiChatSection) aiChatSection.style.display = 'none';
        }
        
        // Update active state in sidebar
        document.querySelectorAll('.sidebar-nav li').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to current nav item
        const navItems = {
            'dashboard': document.querySelector('.sidebar-nav li:first-child'),
            'savedCharts': document.querySelector('.sidebar-nav li:nth-child(2)'),
            'reports': document.querySelector('.sidebar-nav li:nth-child(3)'),
            'conversations': document.querySelector('.sidebar-nav li:nth-child(4)')
        };
        
        if (navItems[sectionName]) {
            navItems[sectionName].classList.add('active');
        }
    }
};

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
        
        // Update other indices in the DOM to maintain correct mapping
        if (sessionData.files.length > 0) {
            updateFileIndices();
        }
        
        // Remove file item from DOM
        fileList.removeChild(fileItem);
        
        // Remove file analysis controls if only one file left
        if (sessionData.files.length <= 1 && document.getElementById('file-analysis-controls')) {
            fileList.parentNode.removeChild(document.getElementById('file-analysis-controls'));
        }
        
        // Update analyze button state
        updateAnalyzeButtonState();
        
        // If no files left, clear the file input to allow re-selection of removed files
        if (sessionData.files.length === 0) {
            fileInput.value = '';
        }
    }
    
    // Update file indices after removal
    function updateFileIndices() {
        const fileItems = fileList.querySelectorAll('.file-item');
        fileItems.forEach((item, index) => {
            const checkbox = item.querySelector('.file-checkbox');
            const deleteBtn = item.querySelector('.delete-file');
            
            checkbox.id = `file-select-${index}`;
            checkbox.setAttribute('data-index', index);
            
            deleteBtn.setAttribute('data-index', index);
        });
    }
    
    // Analyze data function
    async function analyzeData() {
        if (sessionData.selectedFileIndices.length === 0) {
            showNotification('Please select at least one file to analyze', 'warning');
            return;
        }
        
        // Show loading spinner
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
        
        try {
            // Get selected files
            const selectedFiles = [];
            sessionData.selectedFileIndices.forEach(index => {
                if (index < sessionData.files.length) {
                    selectedFiles.push(sessionData.files[index]);
                }
            });
            
            // Upload files first if needed
            if (!sessionData.sessionId) {
                console.log('No session ID, uploading files first');
                await uploadFiles(selectedFiles);
            }
            
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
            
            // Get analysis results
            console.log('Fetching analysis with data:', {
                session_id: sessionData.sessionId,
                combine_files: sessionData.combineFiles,
                file_indices: sessionData.selectedFileIndices
            });
            
            const analysisResponse = await fetchAnalysis(
                sessionData.sessionId,
                sessionData.selectedFileIndices,
                sessionData.combineFiles
            );
            
            if (analysisResponse && analysisResponse.success) {
                console.log('Analysis response:', analysisResponse);
                
                // Display analysis results
                displayAnalysisResults(analysisResponse);
                
                // Show success notification
                showNotification('Analysis completed successfully', 'success');
            } else {
                console.error('Analysis failed:', analysisResponse ? analysisResponse.error : 'Unknown error');
                showNotification('Analysis failed: ' + (analysisResponse ? analysisResponse.error : 'Unknown error'), 'error');
                
                // Clear loading states
                metricsGrid.innerHTML = '';
                aiInsightsContent.innerHTML = "<div class='error-message'>Analysis failed. Please try again.</div>";
            }
        } catch (error) {
            console.error('Error in analyzeData:', error);
            showNotification('Error analyzing data: ' + error.message, 'error');
            
            // Clear loading states
            metricsGrid.innerHTML = '';
            aiInsightsContent.innerHTML = "<div class='error-message'>An error occurred during analysis. Please try again.</div>";
        } finally {
            // Reset button
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = 'Analyze Data';
            
            // Try to save conversation state
            saveCurrentConversation();
        }
    }
    
    // Upload files to server
    async function uploadFiles(files) {
        if (!files || files.length === 0) return;
        
        try {
            const formData = new FormData();
            files.forEach(file => {
                formData.append('files[]', file);
            });
            
            // Set flag to clear previous files
            formData.append('clear_previous', 'true');
            
            // Show loading notification
            showNotification('Uploading files...', 'info');
            
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('Files uploaded successfully:', result);
                sessionData.sessionId = result.session_id;
                return result;
            } else {
                console.error('File upload failed:', result.error);
                showNotification('File upload failed: ' + result.error, 'error');
                throw new Error(result.error || 'File upload failed');
            }
        } catch (error) {
            console.error('Error uploading files:', error);
            showNotification('Error uploading files: ' + error.message, 'error');
            throw error;
        }
    }
    
    // Fetch analysis from server
    async function fetchAnalysis(sessionId, fileIndices = [], combineFiles = false) {
        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    session_id: sessionId,
                    file_indices: fileIndices,
                    combine_files: combineFiles
                })
            });
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching analysis:', error);
            throw error;
        }
    }
    
    // Display analysis results
    function displayAnalysisResults(results) {
        try {
            console.log('Displaying analysis results:', results);
            
            // Show dashboard section only if we're on the dashboard page
            const currentActivePage = document.querySelector('.sidebar-nav li.active');
            const isDashboardActive = currentActivePage && currentActivePage === document.querySelector('.sidebar-nav li:first-child');
            
            if (isDashboardActive) {
                dashboardSection.style.display = 'block';
            } else {
                // If we're not on the dashboard page, switch to it first
                window.showSection('dashboard');
                dashboardSection.style.display = 'block';
            }
            
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
        try {
            if (!chartData || !chartData.data) {
                console.warn('Invalid chart data for rendering');
                return;
            }
            
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                console.warn('Could not get canvas context');
                return;
            }
            
            // Destroy any existing chart instance
            if (canvas.chartInstance) {
                canvas.chartInstance.destroy();
            }
            
            // Parse chart data if it's stored as string
            let chartConfig;
            if (typeof chartData.data === 'string') {
                try {
                    chartConfig = JSON.parse(chartData.data);
                } catch (e) {
                    console.error('Error parsing chart data:', e);
                    return;
                }
            } else {
                chartConfig = chartData.data;
            }
            
            // Create chart instance
            canvas.chartInstance = new Chart(ctx, {
                type: chartData.type,
                data: chartConfig,
                options: JSON.parse(chartData.config || '{}')
            });
            
        } catch (error) {
            console.error('Error rendering saved chart:', error);
        }
    }
    
    // View saved chart in modal
    function viewSavedChart(chartId) {
        // To be implemented - open modal with larger chart view
        alert(`Viewing chart ${chartId} (Modal view to be implemented)`);
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
                // Remove card from DOM
                cardElement.remove();
                
                // Check if there are any charts left
                const savedChartsGrid = document.getElementById('savedChartsGrid');
                if (savedChartsGrid.children.length === 0) {
                    savedChartsGrid.innerHTML = '<div class="empty-state">No saved charts found</div>';
                }
                
                showNotification('Chart deleted successfully', 'success');
            } else {
                showNotification('Failed to delete chart: ' + data.error, 'error');
            }
        } catch (error) {
            console.error('Error deleting chart:', error);
            showNotification('Error deleting chart: ' + error.message, 'error');
        }
    }
    
    // Open export report modal
    function openExportReportModal() {
        document.getElementById('exportReportModal').style.display = 'flex';
    }
    
    // Download report
    function downloadReport() {
        // To be implemented - handle report download
        alert('Report download functionality to be implemented');
    }
    
    // Show notification
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <span class="notification-message">${message}</span>
            <button class="close-notification"><i class="fas fa-times"></i></button>
        `;
        
        // Add to notifications container (create if it doesn't exist)
        let notificationsContainer = document.getElementById('notifications-container');
        if (!notificationsContainer) {
            notificationsContainer = document.createElement('div');
            notificationsContainer.id = 'notifications-container';
            document.body.appendChild(notificationsContainer);
        }
        
        notificationsContainer.appendChild(notification);
        
        // Add close button functionality
        notification.querySelector('.close-notification').addEventListener('click', () => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                notification.remove();
            }, 300);
        });
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.add('fade-out');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 5000);
    }
    
    // Start new analysis - clear current results and return to file selection
    function startNewAnalysis() {
        // Reset UI components
        fileList.innerHTML = '';
        metricsGrid.innerHTML = '';
        aiInsightsContent.innerHTML = '<div class="empty-state">Upload and analyze data to see AI insights</div>';
        
        // Hide dashboard section
        dashboardSection.style.display = 'none';
        
        // Reset file input to allow re-selection of same files
        fileInput.value = '';
        
        // Clear session data
        sessionData = {
            files: [],
            metrics: {},
            chartOptions: [],
            selectedFileIndices: [],
            combineFiles: false
        };
        
        // Clear charts
        if (chartManager && typeof chartManager.clearAllCharts === 'function') {
            chartManager.clearAllCharts();
        }
        
        // Create a new session
        createNewServerSession();
        
        // Show a notification
        showNotification('Ready for new analysis', 'info');
    }
    
    // Save conversation state before navigating away
    async function saveCurrentConversation() {
        try {
            // Check if AIChat is initialized and has current conversation
            if (!window.AIChat || !window.AIChat.getCurrentMessages || window.AIChat.getCurrentMessages().length <= 1) {
                console.log('No conversation to save or only welcome message present');
                return; // Only welcome message or no conversation
            }
            
            if (!sessionData.sessionId) {
                console.log('No session ID, cannot save conversation');
                return;
            }
            
            const messages = window.AIChat.getCurrentMessages();
            
            const response = await fetch('/api/conversations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    session_id: sessionData.sessionId,
                    messages: messages,
                    title: 'Analysis ' + new Date().toLocaleString()
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('Current conversation saved successfully');
            } else {
                console.warn('Failed to save conversation:', result.error);
            }
        } catch (error) {
            console.error('Error saving conversation:', error);
        }
    }
    
    // Create a new server session
    async function createNewServerSession() {
        try {
            const response = await fetch('/api/session/new', {
                method: 'POST'
            });
            
            const data = await response.json();
            
            if (data.success) {
                sessionData.sessionId = data.session_id;
                console.log('Created new server session:', data.session_id);
                
                // Also create a new conversation if user is authenticated
                if (window.AIChat && typeof window.AIChat.resetConversation === 'function') {
                    window.AIChat.resetConversation();
                }
            } else {
                console.warn('Failed to create new session:', data.error);
            }
        } catch (error) {
            console.error('Error creating new session:', error);
        }
    }
    
    // Initialize theme
    function initTheme() {
        // Check for saved theme preference
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
        }
        
        // Toggle dark mode button
        const toggleDarkMode = document.getElementById('toggleDarkMode');
        if (toggleDarkMode) {
            toggleDarkMode.addEventListener('click', function(e) {
                e.preventDefault();
                document.body.classList.toggle('dark-mode');
                
                // Save preference
                if (document.body.classList.contains('dark-mode')) {
                    localStorage.setItem('theme', 'dark');
                    this.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
                } else {
                    localStorage.setItem('theme', 'light');
                    this.innerHTML = '<i class="fas fa-moon"></i> Dark Mode';
                }
            });
            
            // Update button text based on current theme
            if (document.body.classList.contains('dark-mode')) {
                toggleDarkMode.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
            }
        }
    }
    
    // Initialize theme
    initTheme();
});