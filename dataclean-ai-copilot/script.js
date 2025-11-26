class DataCleanAI {
    constructor() {
        this.currentData = null;
        this.cleanedData = null;
        this.issues = [];
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const autoCleanBtn = document.getElementById('autoCleanBtn');
        const downloadBtn = document.getElementById('downloadBtn');

        // File upload handling
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        fileInput.addEventListener('change', this.handleFileSelect.bind(this));

        // Button handlers
        autoCleanBtn.addEventListener('click', this.autoCleanData.bind(this));
        downloadBtn.addEventListener('click', this.downloadCleanedData.bind(this));
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    async processFile(file) {
        if (!file.name.toLowerCase().endsWith('.csv')) {
            alert('Please upload a CSV file.');
            return;
        }

        this.showProgress('Reading file...');
        
        try {
            const text = await this.readFileAsText(file);
            this.currentData = this.parseCSV(text);
            
            this.showProgress('Analyzing data quality...');
            await this.sleep(1000); // Simulate processing time
            
            this.analyzeDataQuality();
            this.displayAnalysis();
            this.hideProgress();
        } catch (error) {
            console.error('Error processing file:', error);
            alert('Error processing file. Please try again.');
            this.hideProgress();
        }
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    parseCSV(text) {
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            if (values.length === headers.length) {
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index];
                });
                data.push(row);
            }
        }

        return { headers, data };
    }

    analyzeDataQuality() {
        this.issues = [];
        const { headers, data } = this.currentData;

        // Check for missing values
        this.checkMissingValues(headers, data);
        
        // Check for duplicates
        this.checkDuplicates(data);
        
        // Check data types and formats
        this.checkDataTypes(headers, data);
        
        // Check for outliers
        this.checkOutliers(headers, data);
        
        // Check for inconsistent formatting
        this.checkInconsistentFormatting(headers, data);
    }

    checkMissingValues(headers, data) {
        headers.forEach(header => {
            const missingCount = data.filter(row => 
                !row[header] || row[header].trim() === '' || row[header].toLowerCase() === 'null'
            ).length;
            
            if (missingCount > 0) {
                const percentage = ((missingCount / data.length) * 100).toFixed(1);
                this.issues.push({
                    type: 'error',
                    title: `Missing Values in '${header}'`,
                    description: `${missingCount} missing values (${percentage}% of data)`,
                    recommendation: this.getMissingValueRecommendation(percentage, header),
                    column: header,
                    severity: missingCount > data.length * 0.1 ? 'high' : 'medium'
                });
            }
        });
    }

    checkDuplicates(data) {
        const seen = new Set();
        let duplicates = 0;
        
        data.forEach(row => {
            const rowString = JSON.stringify(row);
            if (seen.has(rowString)) {
                duplicates++;
            } else {
                seen.add(rowString);
            }
        });

        if (duplicates > 0) {
            this.issues.push({
                type: 'warning',
                title: 'Duplicate Records Found',
                description: `${duplicates} duplicate rows detected`,
                recommendation: 'Remove duplicate records to ensure data integrity and accurate analysis.',
                severity: 'medium'
            });
        }
    }

    checkDataTypes(headers, data) {
        headers.forEach(header => {
            const values = data.map(row => row[header]).filter(v => v && v.trim());
            
            // Check for mixed data types
            const hasNumbers = values.some(v => !isNaN(v) && !isNaN(parseFloat(v)));
            const hasText = values.some(v => isNaN(v) || isNaN(parseFloat(v)));
            
            if (hasNumbers && hasText && values.length > 0) {
                this.issues.push({
                    type: 'warning',
                    title: `Mixed Data Types in '${header}'`,
                    description: 'Column contains both numeric and text values',
                    recommendation: 'Standardize data types for consistent analysis. Consider separating into different columns or converting to a common format.',
                    column: header,
                    severity: 'medium'
                });
            }
        });
    }

    checkOutliers(headers, data) {
        headers.forEach(header => {
            const numericValues = data
                .map(row => parseFloat(row[header]))
                .filter(v => !isNaN(v));
            
            if (numericValues.length > 10) {
                const sorted = numericValues.sort((a, b) => a - b);
                const q1 = sorted[Math.floor(sorted.length * 0.25)];
                const q3 = sorted[Math.floor(sorted.length * 0.75)];
                const iqr = q3 - q1;
                const lowerBound = q1 - 1.5 * iqr;
                const upperBound = q3 + 1.5 * iqr;
                
                const outliers = numericValues.filter(v => v < lowerBound || v > upperBound);
                
                if (outliers.length > 0) {
                    this.issues.push({
                        type: 'info',
                        title: `Potential Outliers in '${header}'`,
                        description: `${outliers.length} potential outliers detected`,
                        recommendation: 'Review outliers to determine if they are data entry errors or legitimate extreme values. Consider capping or transforming if necessary.',
                        column: header,
                        severity: 'low'
                    });
                }
            }
        });
    }

    checkInconsistentFormatting(headers, data) {
        headers.forEach(header => {
            const values = data.map(row => row[header]).filter(v => v && v.trim());
            
            // Check for inconsistent case
            const hasUpperCase = values.some(v => v !== v.toLowerCase());
            const hasLowerCase = values.some(v => v !== v.toUpperCase());
            
            if (hasUpperCase && hasLowerCase && values.length > 0) {
                this.issues.push({
                    type: 'info',
                    title: `Inconsistent Case in '${header}'`,
                    description: 'Column contains mixed upper and lower case values',
                    recommendation: 'Standardize text case (e.g., Title Case, lowercase, or UPPERCASE) for consistency.',
                    column: header,
                    severity: 'low'
                });
            }
        });
    }

    getMissingValueRecommendation(percentage, column) {
        if (percentage > 50) {
            return `Consider removing the '${column}' column as it has too many missing values, or investigate data collection issues.`;
        } else if (percentage > 20) {
            return `Use advanced imputation techniques like KNN or regression-based imputation for '${column}'.`;
        } else if (percentage > 5) {
            return `Fill missing values with median (for numeric) or mode (for categorical) values in '${column}'.`;
        } else {
            return `Remove rows with missing values in '${column}' or use simple imputation techniques.`;
        }
    }

    calculateQualityScore() {
        const totalRecords = this.currentData.data.length;
        const totalColumns = this.currentData.headers.length;
        const totalCells = totalRecords * totalColumns;
        
        let issueWeight = 0;
        this.issues.forEach(issue => {
            switch (issue.severity) {
                case 'high': issueWeight += 30; break;
                case 'medium': issueWeight += 15; break;
                case 'low': issueWeight += 5; break;
            }
        });
        
        const maxPossibleIssues = totalColumns * 30; // Assuming worst case
        const score = Math.max(0, Math.min(100, 100 - (issueWeight / maxPossibleIssues) * 100));
        return Math.round(score);
    }

    displayAnalysis() {
        const analysisSection = document.getElementById('analysisSection');
        const issuesCount = document.getElementById('issuesCount');
        const qualityScore = document.getElementById('qualityScore');
        const totalRecords = document.getElementById('totalRecords');
        const issuesContainer = document.getElementById('issuesContainer');

        // Update metrics
        issuesCount.textContent = this.issues.length;
        qualityScore.textContent = this.calculateQualityScore() + '%';
        totalRecords.textContent = this.currentData.data.length.toLocaleString();

        // Display issues
        issuesContainer.innerHTML = '';
        
        if (this.issues.length === 0) {
            issuesContainer.innerHTML = '<div class="issue-item info"><div class="issue-title">🎉 No Issues Detected!</div><div class="issue-description">Your data appears to be clean and ready for analysis.</div></div>';
        } else {
            this.issues.forEach(issue => {
                const issueElement = document.createElement('div');
                issueElement.className = `issue-item ${issue.type}`;
                issueElement.innerHTML = `
                    <div class="issue-title">${issue.title}</div>
                    <div class="issue-description">${issue.description}</div>
                    <div class="ai-recommendation">${issue.recommendation}</div>
                `;
                issuesContainer.appendChild(issueElement);
            });
        }

        analysisSection.style.display = 'block';
    }

    async autoCleanData() {
        if (!this.currentData) return;

        this.showProgress('Applying AI-powered cleaning...');
        await this.sleep(2000); // Simulate processing time

        this.cleanedData = JSON.parse(JSON.stringify(this.currentData)); // Deep copy
        
        // Apply cleaning operations
        this.removeDuplicates();
        this.handleMissingValues();
        this.standardizeFormatting();
        
        this.showProgress('Finalizing cleaned dataset...');
        await this.sleep(1000);
        
        this.hideProgress();
        alert('Data cleaning completed! You can now download the cleaned dataset.');
        document.getElementById('downloadBtn').style.display = 'inline-flex';
    }

    removeDuplicates() {
        const seen = new Set();
        this.cleanedData.data = this.cleanedData.data.filter(row => {
            const rowString = JSON.stringify(row);
            if (seen.has(rowString)) {
                return false;
            }
            seen.add(rowString);
            return true;
        });
    }

    handleMissingValues() {
        this.cleanedData.headers.forEach(header => {
            const values = this.cleanedData.data
                .map(row => row[header])
                .filter(v => v && v.trim() && v.toLowerCase() !== 'null');
            
            if (values.length > 0) {
                // For numeric columns, use median
                const numericValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
                if (numericValues.length > values.length * 0.7) {
                    const median = this.calculateMedian(numericValues);
                    this.cleanedData.data.forEach(row => {
                        if (!row[header] || row[header].trim() === '' || row[header].toLowerCase() === 'null') {
                            row[header] = median.toString();
                        }
                    });
                } else {
                    // For text columns, use mode
                    const mode = this.calculateMode(values);
                    this.cleanedData.data.forEach(row => {
                        if (!row[header] || row[header].trim() === '' || row[header].toLowerCase() === 'null') {
                            row[header] = mode;
                        }
                    });
                }
            }
        });
    }

    standardizeFormatting() {
        this.cleanedData.headers.forEach(header => {
            this.cleanedData.data.forEach(row => {
                if (row[header]) {
                    // Trim whitespace
                    row[header] = row[header].trim();
                    
                    // Standardize case for text that looks like names or categories
                    if (isNaN(row[header]) && row[header].length > 0) {
                        // Simple heuristic: if it contains spaces, use title case
                        if (row[header].includes(' ')) {
                            row[header] = this.toTitleCase(row[header]);
                        }
                    }
                }
            });
        });
    }

    calculateMedian(numbers) {
        const sorted = numbers.sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    }

    calculateMode(values) {
        const frequency = {};
        values.forEach(value => {
            frequency[value] = (frequency[value] || 0) + 1;
        });
        return Object.keys(frequency).reduce((a, b) => frequency[a] > frequency[b] ? a : b);
    }

    toTitleCase(str) {
        return str.toLowerCase().split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    downloadCleanedData() {
        if (!this.cleanedData) return;

        const csv = this.convertToCSV(this.cleanedData);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cleaned_data.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    convertToCSV(data) {
        const headers = data.headers.join(',');
        const rows = data.data.map(row => 
            data.headers.map(header => `"${row[header] || ''}"`).join(',')
        ).join('\n');
        return headers + '\n' + rows;
    }

    showProgress(text) {
        const progressSection = document.getElementById('progressSection');
        const progressText = document.getElementById('progressText');
        const progressFill = document.getElementById('progressFill');
        
        progressText.textContent = text;
        progressSection.style.display = 'block';
        
        // Animate progress bar
        let width = 0;
        const interval = setInterval(() => {
            width += Math.random() * 10;
            if (width >= 90) {
                clearInterval(interval);
                width = 90;
            }
            progressFill.style.width = width + '%';
        }, 100);
    }

    hideProgress() {
        const progressSection = document.getElementById('progressSection');
        const progressFill = document.getElementById('progressFill');
        
        progressFill.style.width = '100%';
        setTimeout(() => {
            progressSection.style.display = 'none';
            progressFill.style.width = '0%';
        }, 500);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new DataCleanAI();
});