// Reports.js - Handles report generation and management

document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const reportsList = document.getElementById('reportsList');
    const createReportForm = document.getElementById('createReportForm');
    const chartSelectionForReport = document.getElementById('chartSelectionForReport');
    const downloadReportBtn = document.getElementById('downloadReportBtn');
    
    // Initialize reports functionality
    initReports();
    
    function initReports() {
        // Event listeners
        if (createReportForm) {
            createReportForm.addEventListener('submit', handleReportFormSubmit);
        }
        
        // Initialize download button
        if (downloadReportBtn) {
            downloadReportBtn.addEventListener('click', downloadCurrentReport);
        }
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
                loadSavedChartsForReportCreation();
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
    
    // Display reports list
    function displayReportsList(reports) {
        reportsList.innerHTML = '';
        
        if (reports.length === 0) {
            reportsList.innerHTML = '<div class="empty-state">No reports found</div>';
            return;
        }
        
        reports.forEach(report => {
            const card = document.createElement('div');
            card.className = 'report-card';
            card.innerHTML = `
                <div class="report-header">
                    <div class="report-title">${report.title}</div>
                    <div class="report-date">${new Date(report.created_at).toLocaleDateString()}</div>
                </div>
                <div class="report-body">
                    <div class="report-description">${report.description || 'No description provided'}</div>
                    <div class="report-charts">
                        ${report.chart_count} chart${report.chart_count !== 1 ? 's' : ''} included
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
    
    // Load saved charts for report creation
    async function loadSavedChartsForReportCreation() {
        if (!chartSelectionForReport) return;
        
        chartSelectionForReport.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading charts...</div>';
        
        try {
            const response = await fetch('/api/charts/saved');
            const data = await response.json();
            
            if (data.success && data.charts) {
                displayChartSelection(data.charts);
            } else {
                chartSelectionForReport.innerHTML = '<div class="empty-state">No saved charts found</div>';
            }
        } catch (error) {
            console.error('Error loading saved charts:', error);
            chartSelectionForReport.innerHTML = '<div class="error-state">Error loading charts</div>';
        }
    }
    
    // Display chart selection for report creation
    function displayChartSelection(charts) {
        chartSelectionForReport.innerHTML = '';
        
        if (charts.length === 0) {
            chartSelectionForReport.innerHTML = '<div class="empty-state">No saved charts found</div>';
            return;
        }
        
        charts.forEach(chart => {
            const chartItem = document.createElement('div');
            chartItem.className = 'chart-checkbox-item';
            chartItem.innerHTML = `
                <input type="checkbox" id="chart-${chart.id}" name="selected_charts" value="${chart.id}">
                <label for="chart-${chart.id}">${chart.title}</label>
            `;
            chartSelectionForReport.appendChild(chartItem);
        });
    }
    
    // Handle report form submission
    async function handleReportFormSubmit(event) {
        event.preventDefault();
        
        const reportTitle = document.getElementById('reportTitle').value.trim();
        const reportDescription = document.getElementById('reportDescription').value.trim();
        const selectedCharts = Array.from(document.querySelectorAll('input[name="selected_charts"]:checked')).map(cb => parseInt(cb.value));
        
        if (!reportTitle) {
            alert('Please enter a report title');
            return;
        }
        
        if (selectedCharts.length === 0) {
            alert('Please select at least one chart');
            return;
        }
        
        // Show loading state
        const submitBtn = createReportForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        
        try {
            const response = await fetch('/api/report/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: reportTitle,
                    description: reportDescription,
                    chart_ids: selectedCharts
                }),
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert('Report generated successfully!');
                
                // Reset form
                createReportForm.reset();
                
                // Reload reports list
                loadReports();
            } else {
                alert('Error generating report: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error generating report:', error);
            alert('Network error occurred');
        } finally {
            // Reset button state
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
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
        
        // Add charts section
        if (report.charts && report.charts.length > 0) {
            const chartsSection = document.createElement('div');
            chartsSection.className = 'report-charts-preview';
            chartsSection.innerHTML = '<h3>Visualizations</h3>';
            
            report.charts.forEach((chart, index) => {
                const chartItem = document.createElement('div');
                chartItem.className = 'report-chart-item';
                chartItem.innerHTML = `
                    <h4>${chart.title}</h4>
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
                        display: true,
                        position: 'bottom',
                        labels: {
                            color: 'white'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(30, 32, 50, 0.8)',
                        titleColor: 'white',
                        bodyColor: 'white'
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'white'
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'white'
                        }
                    }
                }
            }
        });
    }
    
    // Download report
    async function downloadReport(reportId) {
        try {
            // Show loading indicator
            const loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'loading-overlay';
            loadingIndicator.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Generating report...</div>';
            document.body.appendChild(loadingIndicator);
            
            // Use the new download API endpoint that generates PDF content
            const format = 'pdf'; // Set to PDF format
            
            try {
                // Create a hidden anchor element to trigger the download
                const downloadLink = document.createElement('a');
                downloadLink.href = `/api/reports/${reportId}/download?format=${format}`;
                downloadLink.download = `report_${reportId}.pdf`;
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
                
                // Success message
                setTimeout(() => {
                    alert('Report downloaded successfully!');
                }, 1000);
            } catch (downloadError) {
                console.error('Error downloading report file:', downloadError);
                alert('Error downloading report. Please try again.');
                
                // Fallback to old method if the new endpoint fails
                const response = await fetch(`/api/reports/${reportId}`);
                const data = await response.json();
                
                if (data.success && data.report) {
                    generatePDFFromReport(data.report);
                } else {
                    alert('Error loading report: ' + (data.error || 'Unknown error'));
                }
            }
        } catch (error) {
            console.error('Error downloading report:', error);
            alert('Network error occurred');
        } finally {
            // Remove loading indicator
            const loadingIndicator = document.querySelector('.loading-overlay');
            if (loadingIndicator) {
                document.body.removeChild(loadingIndicator);
            }
        }
    }
    
    // Download current report in modal
    function downloadCurrentReport() {
        const reportId = this.dataset ? this.dataset.reportId : null;
        if (reportId) {
            downloadReport(reportId);
        } else {
            // Generate PDF from current modal content
            const reportPreview = document.getElementById('reportPreview');
            
            try {
                // Make sure jsPDF is defined and properly loaded
                if (typeof window.jspdf === 'undefined') {
                    // Use the global jsPDF object
                    window.jspdf = window.jspdf || window.jsPDF;
                }
                
                // Use html2canvas and jsPDF
                html2canvas(reportPreview).then(canvas => {
                    const imgData = canvas.toDataURL('image/png');
                    
                    // Use the jsPDF constructor properly
                    const pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');
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
                }).catch(err => {
                    console.error('Error generating PDF:', err);
                    alert('Error generating PDF: ' + err.message);
                });
            } catch (error) {
                console.error('Error in PDF generation:', error);
                alert('Could not generate PDF. Please check the console for details.');
            }
        }
    }
    
    // Generate PDF from report data
    function generatePDFFromReport(report) {
        // Create a temporary container
        const tempContainer = document.createElement('div');
        tempContainer.className = 'report-pdf-container';
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '-9999px';
        
        // Add report content
        tempContainer.innerHTML = `
            <div class="report-header-preview">
                <h2>${report.title}</h2>
                <p>Generated on ${new Date(report.created_at).toLocaleDateString()}</p>
                ${report.description ? `<div class="report-description">${report.description}</div>` : ''}
            </div>
        `;
        
        // Add charts section
        if (report.charts && report.charts.length > 0) {
            const chartsSection = document.createElement('div');
            chartsSection.className = 'report-charts-preview';
            chartsSection.innerHTML = '<h3>Visualizations</h3>';
            
            report.charts.forEach((chart, index) => {
                const chartItem = document.createElement('div');
                chartItem.className = 'report-chart-item';
                chartItem.innerHTML = `
                    <h4>${chart.title}</h4>
                    <div class="chart-preview-container">
                        <canvas id="pdf-canvas-${index}"></canvas>
                    </div>
                `;
                chartsSection.appendChild(chartItem);
            });
            
            tempContainer.appendChild(chartsSection);
        }
        
        // Add to document
        document.body.appendChild(tempContainer);
        
        // Render charts
        if (report.charts && report.charts.length > 0) {
            report.charts.forEach((chart, index) => {
                const canvas = document.getElementById(`pdf-canvas-${index}`);
                if (canvas) {
                    renderReportChart(canvas, chart);
                }
            });
        }
        
        // Convert to PDF
        try {
            // Make sure jsPDF is defined and properly loaded
            if (typeof window.jspdf === 'undefined') {
                // Use the global jsPDF object
                window.jspdf = window.jspdf || window.jsPDF;
            }
            
            html2canvas(tempContainer).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                
                // Use the jsPDF constructor properly
                const pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const imgWidth = canvas.width;
                const imgHeight = canvas.height;
                const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
                const imgX = (pdfWidth - imgWidth * ratio) / 2;
                const imgY = 30;
                
                // Add title
                pdf.setFontSize(20);
                pdf.text(report.title, pdfWidth / 2, 20, { align: 'center' });
                
                // Add image
                pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
                
                // Save PDF
                pdf.save(`${report.title.toLowerCase().replace(/\s+/g, '-')}.pdf`);
                
                // Clean up
                document.body.removeChild(tempContainer);
            }).catch(err => {
                console.error('Error generating PDF:', err);
                alert('Error generating PDF: ' + err.message);
                // Clean up on error
                if (document.body.contains(tempContainer)) {
                    document.body.removeChild(tempContainer);
                }
            });
        } catch (error) {
            console.error('Error in PDF generation:', error);
            alert('Could not generate PDF. Please check the console for details.');
            // Clean up on error
            if (document.body.contains(tempContainer)) {
                document.body.removeChild(tempContainer);
            }
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
                cardElement.remove();
                alert('Report deleted successfully');
            } else {
                alert('Error deleting report: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error deleting report:', error);
            alert('Network error occurred');
        }
    }
    
    // Public methods
    window.ReportsManager = {
        loadReports: loadReports
    };
});
