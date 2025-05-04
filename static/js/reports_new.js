// Reports.js - Handles report generation and management

document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const reportsList = document.getElementById('reportsList');
    const reportFileSelection = document.getElementById('reportFileSelection');
    const reportUploadArea = document.getElementById('reportUploadArea');
    const reportFileInput = document.getElementById('reportFileInput');
    const availableChartsGrid = document.getElementById('availableChartsGrid');
    const selectedChartsGrid = document.getElementById('selectedChartsGrid');
    const reportAiChat = document.getElementById('reportAiChat');
    const reportAiInput = document.getElementById('reportAiInput');
    const sendReportAiRequest = document.getElementById('sendReportAiRequest');
    const reportPreviewContent = document.getElementById('reportPreviewContent');
    const saveGeneratedReport = document.getElementById('saveGeneratedReport');
    const downloadReportBtn = document.getElementById('downloadReportBtn');
    
    // State management 
    const reportState = {
        selectedFiles: [],
        selectedCharts: [],
        reportDetails: {
            title: '',
            description: ''
        },
        aiChat: [],
        reportContent: '',
        uploadedFiles: [] // Track newly uploaded files
    };
    
    // Initialize reports functionality
    initReports();
    
    function initReports() {
        // Tab navigation
        const tabButtons = document.querySelectorAll('.reports-tab-btn');
        tabButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Remove active class from all tabs
                tabButtons.forEach(btn => btn.classList.remove('active'));
                const tabContents = document.querySelectorAll('.reports-tab-content');
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked tab
                this.classList.add('active');
                const tabId = this.getAttribute('data-tab');
                document.getElementById(`${tabId}-tab`).classList.add('active');
            });
        });
        
        // File upload initialization
        initializeFileUpload();
        
        // Step navigation
        setupStepNavigation();
        
        // AI chat events
        if (sendReportAiRequest) {
            sendReportAiRequest.addEventListener('click', handleAiRequest);
        }
        
        // AI suggestion pills
        const suggestionPills = document.querySelectorAll('.ai-suggestion-pill');
        suggestionPills.forEach(pill => {
            pill.addEventListener('click', function() {
                const prompt = this.getAttribute('data-prompt');
                if (reportAiInput) {
                    reportAiInput.value = prompt;
                    reportAiInput.focus();
                }
            });
        });
        
        // Save report button
        if (saveGeneratedReport) {
            saveGeneratedReport.addEventListener('click', saveReport);
        }
        
        // Initialize download button
        if (downloadReportBtn) {
            downloadReportBtn.addEventListener('click', downloadCurrentReport);
        }
    }
    
    // Initialize file upload functionality
    function initializeFileUpload() {
        if (!reportUploadArea || !reportFileInput) return;
        
        // Handle file input change
        reportFileInput.addEventListener('change', handleFileSelect);
        
        // Handle drag and drop
        reportUploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.classList.add('drag-over');
        });
        
        reportUploadArea.addEventListener('dragleave', function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.classList.remove('drag-over');
        });
        
        reportUploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                uploadFiles(files);
            }
        });
        
        // Handle click on upload area
        reportUploadArea.addEventListener('click', function() {
            reportFileInput.click();
        });
    }
    
    // Handle file select from input
    function handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            uploadFiles(files);
        }
    }
    
    // Upload files to server
    async function uploadFiles(files) {
        // Show loading state
        reportFileSelection.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Uploading files...</div>';
        
        const formData = new FormData();
        
        // Add all files to form data
        for (let i = 0; i < files.length; i++) {
            formData.append('files[]', files[i]);
        }
        
        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Refresh file list with newly uploaded files
                loadFilesForReportCreation();
                
                // Show success message
                showNotification('Files uploaded successfully', 'success');
            } else {
                reportFileSelection.innerHTML = `
                    <div class="error-state">
                        <p>Error: ${data.error || 'Failed to upload files'}</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error uploading files:', error);
            reportFileSelection.innerHTML = '<div class="error-state">Network error while uploading files</div>';
        }
    }
    
    // Show notification
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
    
    // Setup step navigation
    function setupStepNavigation() {
        // Next step buttons
        const nextButtons = document.querySelectorAll('.btn-next-step');
        nextButtons.forEach(button => {
            button.addEventListener('click', function() {
                const nextStepId = this.getAttribute('data-next');
                if (validateCurrentStep(nextStepId)) {
                    navigateToStep(nextStepId);
                }
            });
        });
        
        // Previous step buttons
        const prevButtons = document.querySelectorAll('.btn-prev-step');
        prevButtons.forEach(button => {
            button.addEventListener('click', function() {
                const prevStepId = this.getAttribute('data-prev');
                navigateToStep(prevStepId);
            });
        });
    }
    
    // Validate current step before moving to next
    function validateCurrentStep(nextStepId) {
        // Get current active step id
        const currentStep = document.querySelector('.report-step.active').id;
        
        switch (currentStep) {
            case 'step-1':
                // Validate file selection
                if (reportState.selectedFiles.length === 0) {
                    alert('Please select at least one file');
                    return false;
                }
                break;
                
            case 'step-2':
                // Validate chart selection
                if (reportState.selectedCharts.length === 0) {
                    alert('Please select at least one chart');
                    return false;
                }
                break;
                
            case 'step-3':
                // Validate report details
                const title = document.getElementById('reportTitle').value.trim();
                if (!title) {
                    alert('Please enter a report title');
                    return false;
                }
                
                // Update report state
                reportState.reportDetails = {
                    title: title,
                    description: document.getElementById('reportDescription').value.trim()
                };
                
                // If moving to AI step, initialize with welcome message
                if (nextStepId === 'step-4' && reportAiChat) {
                    if (reportState.aiChat.length === 0) {
                        // Add AI welcome message
                        addAiMessage(`I'm ready to help you create a report about your data. What would you like to include in your report?`);
                    }
                }
                break;
        }
        
        return true;
    }
    
    // Navigate between steps
    function navigateToStep(stepId) {
        // Update step indicators
        const steps = document.querySelectorAll('.report-step');
        steps.forEach(step => {
            step.classList.remove('active');
            
            // Mark previous steps as completed
            const stepNumber = parseInt(step.id.split('-')[1]);
            const targetNumber = parseInt(stepId.split('-')[1]);
            
            if (stepNumber < targetNumber) {
                step.classList.add('completed');
            } else {
                step.classList.remove('completed');
            }
        });
        
        // Set active step
        document.getElementById(stepId).classList.add('active');
        
        // Show corresponding content
        const contents = document.querySelectorAll('.report-step-content');
        contents.forEach(content => content.classList.remove('active'));
        document.getElementById(`${stepId}-content`).classList.add('active');
    }
    
    // Load reports list - exposing globally for navigation
    window.loadReports = async function() {
        if (!reportsList) return;
        
        reportsList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading reports...</div>';
        
        try {
            const response = await fetch('/api/reports');
            const data = await response.json();
            
            if (data.success && data.reports) {
                displayReportsList(data.reports);
                
                // Load file selection and available charts for report creation
                loadFilesForReportCreation();
                loadChartsForReportCreation();
            } else {
                reportsList.innerHTML = '<div class="empty-state">No reports found</div>';
            }
        } catch (error) {
            console.error('Error loading reports:', error);
            reportsList.innerHTML = '<div class="error-state">Error loading reports</div>';
        }
    };
    
    // Local reference
    const loadReports = window.loadReports;
    
    // Load files for report creation
    async function loadFilesForReportCreation() {
        if (!reportFileSelection) return;
        
        reportFileSelection.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading files...</div>';
        
        try {
            // Get files from session
            const response = await fetch('/api/files/session');
            const data = await response.json();
            
            if (data.success && data.files && data.files.length > 0) {
                displayFileSelection(data.files);
            } else {
                reportFileSelection.innerHTML = `
                    <div class="empty-state">
                        <p>No files found in current session</p>
                        <p>Please upload files in the Dashboard first</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading files:', error);
            reportFileSelection.innerHTML = '<div class="error-state">Error loading files</div>';
        }
    }
    
    // Display file selection for report creation
    function displayFileSelection(files) {
        reportFileSelection.innerHTML = '';
        
        files.forEach((file, index) => {
            const fileIcon = getFileIcon(file.filename);
            const fileItem = document.createElement('div');
            fileItem.className = 'report-file-item';
            fileItem.dataset.fileIndex = index;
            fileItem.innerHTML = `
                <div class="file-icon">
                    <i class="${fileIcon}"></i>
                </div>
                <div class="file-name">${file.original_filename}</div>
                <div class="file-info">
                    ${formatFileSize(file.file_size)} • ${file.file_type.toUpperCase()}
                </div>
            `;
            
            // Add click event to select/deselect file
            fileItem.addEventListener('click', function() {
                const fileIndex = parseInt(this.dataset.fileIndex);
                if (this.classList.contains('selected')) {
                    // Deselect
                    this.classList.remove('selected');
                    reportState.selectedFiles = reportState.selectedFiles.filter(idx => idx !== fileIndex);
                } else {
                    // Select
                    this.classList.add('selected');
                    reportState.selectedFiles.push(fileIndex);
                }
            });
            
            reportFileSelection.appendChild(fileItem);
        });
    }
    
    // Get appropriate icon for file type
    function getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        
        switch (ext) {
            case 'csv':
                return 'fas fa-file-csv';
            case 'xlsx':
            case 'xls':
                return 'fas fa-file-excel';
            case 'json':
                return 'fas fa-file-code';
            case 'txt':
                return 'fas fa-file-alt';
            default:
                return 'fas fa-file';
        }
    }
    
    // Format file size
    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        else return (bytes / 1048576).toFixed(1) + ' MB';
    }
    
    // Load charts for report creation
    async function loadChartsForReportCreation() {
        if (!availableChartsGrid) return;
        
        availableChartsGrid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading charts...</div>';
        
        try {
            const response = await fetch('/api/charts/saved');
            const data = await response.json();
            
            if (data.success && data.charts && data.charts.length > 0) {
                displayChartSelection(data.charts);
            } else {
                availableChartsGrid.innerHTML = `
                    <div class="empty-state">
                        <p>No saved charts found</p>
                        <p>Please create and save charts in the Dashboard first</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading charts:', error);
            availableChartsGrid.innerHTML = '<div class="error-state">Error loading charts</div>';
        }
    }
    
    // Display chart selection for report creation
    function displayChartSelection(charts) {
        availableChartsGrid.innerHTML = '';
        
        if (charts.length === 0) {
            availableChartsGrid.innerHTML = `
                <div class="empty-state">
                    <p>No saved charts found</p>
                    <p>Please create and save charts in the Dashboard first</p>
                </div>
            `;
            return;
        }
        
        charts.forEach(chart => {
            const chartCard = document.createElement('div');
            chartCard.className = 'report-chart-card';
            chartCard.dataset.chartId = chart.id;
            chartCard.innerHTML = `
                <div class="report-chart-preview">
                    <i class="${getChartTypeIcon(chart.type)} fa-2x"></i>
                </div>
                <div class="report-chart-info">
                    <div class="report-chart-title">${chart.title || 'Unnamed Chart'}</div>
                    <div class="report-chart-type">${formatChartType(chart.type)}</div>
                </div>
            `;
            
            // Add click event to select/deselect chart
            chartCard.addEventListener('click', function() {
                const chartId = parseInt(this.dataset.chartId);
                if (this.classList.contains('selected')) {
                    // Deselect
                    this.classList.remove('selected');
                    reportState.selectedCharts = reportState.selectedCharts.filter(id => id !== chartId);
                    updateSelectedChartsList();
                } else {
                    // Select
                    this.classList.add('selected');
                    reportState.selectedCharts.push(chartId);
                    updateSelectedChartsList(charts);
                }
            });
            
            availableChartsGrid.appendChild(chartCard);
        });
    }
    
    // Update the selected charts pills display
    function updateSelectedChartsList(allCharts) {
        if (!selectedChartsGrid) return;
        
        if (reportState.selectedCharts.length === 0) {
            selectedChartsGrid.innerHTML = '<div class="no-selected-charts">No charts selected</div>';
            return;
        }
        
        selectedChartsGrid.innerHTML = '';
        
        reportState.selectedCharts.forEach(chartId => {
            // Find chart info
            const chart = allCharts.find(c => c.id === chartId);
            if (!chart) return;
            
            const chartPill = document.createElement('div');
            chartPill.className = 'selected-chart-pill';
            chartPill.innerHTML = `
                <span>${chart.title || 'Unnamed Chart'}</span>
                <button class="remove-chart-btn" data-chart-id="${chartId}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            // Add event to remove button
            chartPill.querySelector('.remove-chart-btn').addEventListener('click', function(e) {
                e.stopPropagation();
                const chartId = parseInt(this.dataset.chartId);
                
                // Update selection state
                reportState.selectedCharts = reportState.selectedCharts.filter(id => id !== chartId);
                
                // Update visual selection
                const chartCard = document.querySelector(`.report-chart-card[data-chart-id="${chartId}"]`);
                if (chartCard) {
                    chartCard.classList.remove('selected');
                }
                
                // Update pills
                updateSelectedChartsList(allCharts);
            });
            
            selectedChartsGrid.appendChild(chartPill);
        });
    }
    
    // Get icon for chart type
    function getChartTypeIcon(chartType) {
        switch (chartType) {
            case 'bar_chart':
            case 'bar':
                return 'fas fa-chart-bar';
            case 'line_chart':
            case 'line':
                return 'fas fa-chart-line';
            case 'pie_chart':
            case 'pie':
                return 'fas fa-chart-pie';
            case 'scatter_plot':
            case 'scatter':
                return 'fas fa-braille';
            case 'histogram':
                return 'fas fa-chart-column';
            case 'box_plot':
                return 'fas fa-chart-boxplot';
            case 'heatmap':
                return 'fas fa-fire';
            case 'radar_chart':
            case 'radar':
                return 'fas fa-star';
            case 'bubble_chart':
            case 'bubble':
                return 'fas fa-circle';
            default:
                return 'fas fa-chart-simple';
        }
    }
    
    // Format chart type for display
    function formatChartType(chartType) {
        if (!chartType) return 'Chart';
        
        // Remove _chart suffix if present
        let type = chartType.replace('_chart', '');
        
        // Capitalize first letter of each word
        return type.split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ') + ' Chart';
    }
    
    // Handle AI request for report generation
    async function handleAiRequest() {
        if (!reportAiInput || !reportAiChat) return;
        
        const userPrompt = reportAiInput.value.trim();
        if (!userPrompt) {
            alert('Please enter a prompt for the AI');
            return;
        }
        
        // Add user message to chat
        addUserMessage(userPrompt);
        
        // Clear input
        reportAiInput.value = '';
        
        // Show loading state
        sendReportAiRequest.disabled = true;
        const originalBtnText = sendReportAiRequest.innerHTML;
        sendReportAiRequest.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        
        try {
            // Get selected chart details
            const chartIdsParam = reportState.selectedCharts.join(',');
            const fileIndicesParam = reportState.selectedFiles.join(',');
            
            const response = await fetch('/api/report/ai-generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt: userPrompt,
                    chart_ids: reportState.selectedCharts,
                    file_indices: reportState.selectedFiles,
                    title: reportState.reportDetails.title,
                    description: reportState.reportDetails.description
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Add AI response to chat
                addAiMessage(data.response);
                
                // Update report preview
                updateReportPreview(data.report_content);
                
                // Save the generated content
                reportState.reportContent = data.report_content;
            } else {
                addAiMessage(`Error: ${data.error || 'Unknown error occurred'}`);
            }
        } catch (error) {
            console.error('Error generating AI report:', error);
            addAiMessage('Sorry, an error occurred while generating the report. Please try again.');
        } finally {
            // Reset button state
            sendReportAiRequest.disabled = false;
            sendReportAiRequest.innerHTML = originalBtnText;
        }
    }
    
    // Add user message to chat
    function addUserMessage(message) {
        if (!reportAiChat) return;
        
        const messageEl = document.createElement('div');
        messageEl.className = 'report-ai-message user-message';
        messageEl.textContent = message;
        reportAiChat.appendChild(messageEl);
        
        // Store in state
        reportState.aiChat.push({
            role: 'user',
            content: message
        });
        
        // Scroll to bottom
        reportAiChat.scrollTop = reportAiChat.scrollHeight;
    }
    
    // Add AI message to chat
    function addAiMessage(message) {
        if (!reportAiChat) return;
        
        const messageEl = document.createElement('div');
        messageEl.className = 'report-ai-message ai-message';
        
        // Support basic markdown formatting
        const formattedMessage = message
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
            
        messageEl.innerHTML = formattedMessage;
        reportAiChat.appendChild(messageEl);
        
        // Store in state
        reportState.aiChat.push({
            role: 'assistant',
            content: message
        });
        
        // Scroll to bottom
        reportAiChat.scrollTop = reportAiChat.scrollHeight;
    }
    
    // Update report preview with generated content
    function updateReportPreview(content) {
        if (!reportPreviewContent) return;
        
        // Format content as markdown with basic styling
        reportPreviewContent.innerHTML = content
            .replace(/# (.*)/g, '<h1>$1</h1>')
            .replace(/## (.*)/g, '<h2>$1</h2>')
            .replace(/### (.*)/g, '<h3>$1</h3>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            .replace(/- (.*)/g, '<ul><li>$1</li></ul>')
            .replace(/<\/ul><ul>/g, '')  // Combine consecutive list items
            .replace(/\n/g, '<br>');
    }
    
    // Save the generated report
    async function saveReport() {
        if (!reportState.reportContent || !reportState.reportDetails.title) {
            alert('Please generate a report content first');
            return;
        }
        
        if (reportState.selectedCharts.length === 0) {
            alert('Please select at least one chart for the report');
            return;
        }
        
        // Show loading state
        saveGeneratedReport.disabled = true;
        const originalBtnText = saveGeneratedReport.innerHTML;
        saveGeneratedReport.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        
        try {
            const response = await fetch('/api/report/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: reportState.reportDetails.title,
                    description: reportState.reportDetails.description,
                    chart_ids: reportState.selectedCharts,
                    content: reportState.reportContent
                }),
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert('Report saved successfully!');
                
                // Reset report state
                reportState.selectedFiles = [];
                reportState.selectedCharts = [];
                reportState.reportDetails = {
                    title: '',
                    description: ''
                };
                reportState.aiChat = [];
                reportState.reportContent = '';
                
                // Switch to Reports tab
                document.querySelector('.reports-tab-btn[data-tab="existing-reports"]').click();
                
                // Reload reports list
                loadReports();
            } else {
                alert('Error saving report: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error saving report:', error);
            alert('Network error occurred');
        } finally {
            // Reset button state
            saveGeneratedReport.disabled = false;
            saveGeneratedReport.innerHTML = originalBtnText;
        }
    }
    
    // Display reports list
    function displayReportsList(reports) {
        reportsList.innerHTML = '';
        
        if (reports.length === 0) {
            reportsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-file-alt fa-3x"></i></div>
                    <p>No reports found</p>
                    <p>Click on "Create New Report" to get started</p>
                </div>
            `;
            return;
        }
        
        reports.forEach(report => {
            const card = document.createElement('div');
            card.className = 'report-card';
            
            // Create chart tags HTML
            let chartTagsHtml = '';
            if (report.charts && report.charts.length > 0) {
                const maxTagsToShow = 3;
                const chartTags = report.charts.slice(0, maxTagsToShow).map(chart => 
                    `<div class="report-chart-tag">${formatChartType(chart.type)}</div>`
                ).join('');
                
                // Add indicator for additional charts
                if (report.charts.length > maxTagsToShow) {
                    chartTagsHtml = `
                        ${chartTags}
                        <div class="report-chart-tag">+${report.charts.length - maxTagsToShow} more</div>
                    `;
                } else {
                    chartTagsHtml = chartTags;
                }
            }
            
            card.innerHTML = `
                <div class="report-header">
                    <div class="report-title">${report.title}</div>
                    <div class="report-date">${new Date(report.created_at).toLocaleDateString()}</div>
                </div>
                <div class="report-body">
                    <div class="report-description">${report.description || 'No description provided'}</div>
                    <div class="report-charts">
                        ${chartTagsHtml}
                    </div>
                </div>
                <div class="report-actions">
                    <button class="report-action-btn view-report-btn" data-id="${report.id}">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="report-action-btn download-report-btn" data-id="${report.id}">
                        <i class="fas fa-download"></i> Download
                    </button>
                    <button class="report-action-btn delete-report-btn" data-id="${report.id}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            `;
            reportsList.appendChild(card);
            
            // Add event listeners
            card.querySelector('.view-report-btn').addEventListener('click', () => {
                viewReport(report.id);
            });
            
            card.querySelector('.download-report-btn').addEventListener('click', () => {
                downloadReport(report.id);
            });
            
            card.querySelector('.delete-report-btn').addEventListener('click', () => {
                deleteReport(report.id, card);
            });
        });
    }
    
    // View report
    async function viewReport(reportId) {
        try {
            const response = await fetch(`/api/reports/${reportId}`);
            const data = await response.json();
            
            if (data.success && data.report) {
                displayReportModal(data.report);
            } else {
                alert('Error loading report: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error loading report:', error);
            alert('Network error occurred');
        }
    }
    
    // Display report in modal
    function displayReportModal(report) {
        // Get modal elements
        const modal = document.getElementById('reportModal');
        const reportPreview = document.getElementById('reportPreview');
        const downloadBtn = document.getElementById('downloadReportBtn');
        const closeModal = modal.querySelector('.close-modal');
        const cancelBtn = modal.querySelector('.btn-cancel');
        
        // Clear previous content
        reportPreview.innerHTML = '';
        
        // Add report header
        const reportHeader = document.createElement('div');
        reportHeader.className = 'report-header-preview';
        reportHeader.innerHTML = `
            <h2>${report.title}</h2>
            <p>Generated on ${new Date(report.created_at).toLocaleDateString()}</p>
            ${report.description ? `<div class="report-description">${report.description}</div>` : ''}
        `;
        reportPreview.appendChild(reportHeader);
        
        // Add report content if available
        if (report.content) {
            const contentSection = document.createElement('div');
            contentSection.className = 'report-content-preview';
            contentSection.innerHTML = report.content
                .replace(/# (.*)/g, '<h1>$1</h1>')
                .replace(/## (.*)/g, '<h2>$1</h2>')
                .replace(/### (.*)/g, '<h3>$1</h3>')
                .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                .replace(/\*([^*]+)\*/g, '<em>$1</em>')
                .replace(/- (.*)/g, '<ul><li>$1</li></ul>')
                .replace(/<\/ul><ul>/g, '')  // Combine consecutive list items
                .replace(/\n/g, '<br>');
            reportPreview.appendChild(contentSection);
        }
        
        // Add charts section
        if (report.charts && report.charts.length > 0) {
            const chartsSection = document.createElement('div');
            chartsSection.className = 'report-charts-preview';
            chartsSection.innerHTML = '<h3>Visualizations</h3>';
            
            report.charts.forEach((chart, index) => {
                const chartItem = document.createElement('div');
                chartItem.className = 'report-chart-item';
                chartItem.innerHTML = `
                    <h4>${chart.title || 'Unnamed Chart'}</h4>
                    <div class="chart-preview-container">
                        <canvas id="report-canvas-${index}"></canvas>
                    </div>
                `;
                chartsSection.appendChild(chartItem);
            });
            
            reportPreview.appendChild(chartsSection);
            
            // Render charts
            setTimeout(() => {
                report.charts.forEach((chart, index) => {
                    const canvas = document.getElementById(`report-canvas-${index}`);
                    if (canvas) {
                        renderReportChart(canvas, chart);
                    }
                });
            }, 100);
        }
        
        // Show modal
        modal.style.display = 'block';
        
        // Store report ID for downloading
        downloadBtn.dataset.reportId = report.id;
        
        // Add event listeners
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
    
    // Render chart in report preview
    function renderReportChart(canvas, chartData) {
        if (!canvas || !chartData || !chartData.data) return;
        
        const ctx = canvas.getContext('2d');
        
        try {
            // Destroy existing chart if any
            if (canvas.chart) {
                canvas.chart.destroy();
            }
            
            // Create new chart
            canvas.chart = new Chart(ctx, {
                type: chartData.data.type || 'bar',
                data: {
                    labels: chartData.data.labels || [],
                    datasets: chartData.data.datasets || []
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim()
                            }
                        },
                        tooltip: {
                            enabled: true
                        }
                    },
                    scales: {
                        x: {
                            ticks: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim()
                            },
                            grid: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim()
                            }
                        },
                        y: {
                            ticks: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim()
                            },
                            grid: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim()
                            }
                        }
                    }
                }
            });
        } catch (e) {
            console.error('Error rendering chart:', e);
            canvas.parentElement.innerHTML = `<div class="chart-error">Error rendering chart: ${e.message}</div>`;
        }
    }
    
    // Download report
    async function downloadReport(reportId) {
        try {
            // Show loading overlay
            const loadingOverlay = document.createElement('div');
            loadingOverlay.className = 'loading-overlay';
            loadingOverlay.innerHTML = `
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin spinner-icon"></i>
                    <p>Generating report PDF...</p>
                </div>
            `;
            document.body.appendChild(loadingOverlay);
            
            const response = await fetch(`/api/reports/${reportId}/download?format=pdf`);
            
            if (!response.ok) {
                let errorMessage = 'Failed to download report';
                try {
                    // Try to parse as JSON, but don't fail if it's not JSON
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        const errorData = await response.json();
                        errorMessage = errorData.error || errorMessage;
                    } else {
                        // If it's not JSON, just use the status text
                        errorMessage = `Error: ${response.status} ${response.statusText}`;
                    }
                } catch (parseError) {
                    console.error('Error parsing error response:', parseError);
                }
                throw new Error(errorMessage);
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `report-${reportId}.md`; // Changed to .md since we're returning markdown
            document.body.appendChild(a);
            a.click();
            
            // Cleanup
            window.URL.revokeObjectURL(url);
            a.remove();
            
        } catch (error) {
            console.error('Error downloading report:', error);
            alert('Error downloading report: ' + error.message);
        } finally {
            // Remove loading overlay
            const loadingOverlay = document.querySelector('.loading-overlay');
            if (loadingOverlay) {
                loadingOverlay.remove();
            }
        }
    }
    
    // Download current report from modal
    function downloadCurrentReport() {
        const reportId = this.dataset.reportId;
        if (reportId) {
            downloadReport(reportId);
            // Close modal
            document.getElementById('reportModal').style.display = 'none';
        }
    }
    
    // Delete report
    async function deleteReport(reportId, cardElement) {
        if (!confirm('Are you sure you want to delete this report?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/reports/${reportId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Remove card from UI
                cardElement.remove();
                
                // Check if we have any reports left
                if (reportsList.children.length === 0) {
                    reportsList.innerHTML = `
                        <div class="empty-state">
                            <div class="empty-icon"><i class="fas fa-file-alt fa-3x"></i></div>
                            <p>No reports found</p>
                            <p>Click on "Create New Report" to get started</p>
                        </div>
                    `;
                }
            } else {
                alert('Error deleting report: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error deleting report:', error);
            alert('Network error occurred');
        }
    }
});