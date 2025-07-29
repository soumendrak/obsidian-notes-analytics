/**
 * Export and Sharing Service
 * Handles data export, report generation, and sharing functionality
 */

import { moment, Notice } from 'obsidian';

export interface ExportOptions {
	format: 'pdf' | 'csv' | 'json' | 'markdown' | 'html';
	includeCharts: boolean;
	dateRange: {
		start: string;
		end: string;
	};
	sections: {
		summary: boolean;
		trends: boolean;
		charts: boolean;
		insights: boolean;
		rawData: boolean;
	};
	chartSize: 'small' | 'medium' | 'large';
	theme: 'light' | 'dark';
}

export interface ShareableReport {
	title: string;
	generatedAt: string;
	dateRange: string;
	summary: any;
	charts: Array<{
		title: string;
		type: string;
		data: any;
		base64Image?: string;
	}>;
	insights: string[];
	rawData: any[];
	metadata: {
		totalFiles: number;
		totalWords: number;
		analysisVersion: string;
	};
}

export class ExportService {
	private app: any;
	private vault: any;

	constructor(app: any) {
		this.app = app;
		this.vault = app.vault;
	}

	/**
	 * Export analytics data in various formats
	 */
	async exportData(data: any, options: ExportOptions): Promise<void> {
		try {
			switch (options.format) {
				case 'csv':
					await this.exportToCSV(data, options);
					break;
				case 'json':
					await this.exportToJSON(data, options);
					break;
				case 'markdown':
					await this.exportToMarkdown(data, options);
					break;
				case 'html':
					await this.exportToHTML(data, options);
					break;
				case 'pdf':
					await this.exportToPDF(data, options);
					break;
				default:
					throw new Error(`Unsupported export format: ${options.format}`);
			}
			new Notice(`Analytics exported successfully as ${options.format.toUpperCase()}`);
		} catch (error) {
			console.error('Export failed:', error);
			new Notice('Export failed. Please try again.');
		}
	}

	/**
	 * Generate a comprehensive shareable report
	 */
	async generateShareableReport(analyticsData: any, chartImages: any[]): Promise<ShareableReport> {
		const now = moment();
		
		return {
			title: 'Notes Analytics Report',
			generatedAt: now.format('YYYY-MM-DD HH:mm:ss'),
			dateRange: `${analyticsData.dateRange?.start || 'All time'} - ${analyticsData.dateRange?.end || now.format('YYYY-MM-DD')}`,
			summary: analyticsData.summary,
			charts: chartImages.map((chart, index) => ({
				title: chart.title || `Chart ${index + 1}`,
				type: chart.type || 'line',
				data: chart.data,
				base64Image: chart.base64Image
			})),
			insights: analyticsData.insights || [],
			rawData: analyticsData.rawData || [],
			metadata: {
				totalFiles: analyticsData.summary?.totalFiles || 0,
				totalWords: analyticsData.summary?.totalWords || 0,
				analysisVersion: '1.0.0'
			}
		};
	}

	/**
	 * Export to CSV format
	 */
	private async exportToCSV(data: any, options: ExportOptions): Promise<void> {
		let csvContent = '';

		// Add summary section
		if (options.sections.summary && data.summary) {
			csvContent += 'SUMMARY\n';
			csvContent += 'Metric,Value\n';
			Object.entries(data.summary).forEach(([key, value]) => {
				csvContent += `${key},${value}\n`;
			});
			csvContent += '\n';
		}

		// Add raw data section
		if (options.sections.rawData && data.rawData) {
			csvContent += 'RAW DATA\n';
			if (data.rawData.length > 0) {
				// Headers
				const headers = Object.keys(data.rawData[0]);
				csvContent += headers.join(',') + '\n';
				
				// Data rows
				data.rawData.forEach((row: any) => {
					const values = headers.map(header => {
						const value = row[header];
						// Escape commas and quotes
						if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
							return `"${value.replace(/"/g, '""')}"`;
						}
						return value;
					});
					csvContent += values.join(',') + '\n';
				});
			}
		}

		// Save file
		const fileName = `analytics-export-${moment().format('YYYY-MM-DD-HHmmss')}.csv`;
		await this.saveFile(fileName, csvContent);
	}

	/**
	 * Export to JSON format
	 */
	private async exportToJSON(data: any, options: ExportOptions): Promise<void> {
		const exportData = {
			exportedAt: moment().toISOString(),
			options: options,
			data: data
		};

		const jsonContent = JSON.stringify(exportData, null, 2);
		const fileName = `analytics-export-${moment().format('YYYY-MM-DD-HHmmss')}.json`;
		await this.saveFile(fileName, jsonContent);
	}

	/**
	 * Export to Markdown format
	 */
	private async exportToMarkdown(data: any, options: ExportOptions): Promise<void> {
		let markdown = '';

		// Title and metadata
		markdown += `# Notes Analytics Report\n\n`;
		markdown += `**Generated:** ${moment().format('YYYY-MM-DD HH:mm:ss')}\n`;
		markdown += `**Date Range:** ${options.dateRange.start} to ${options.dateRange.end}\n\n`;

		// Summary section
		if (options.sections.summary && data.summary) {
			markdown += `## Summary\n\n`;
			Object.entries(data.summary).forEach(([key, value]) => {
				const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
				markdown += `- **${formattedKey}:** ${value}\n`;
			});
			markdown += '\n';
		}

		// Trends section
		if (options.sections.trends && data.trends) {
			markdown += `## Trends\n\n`;
			Object.entries(data.trends).forEach(([metric, trend]: [string, any]) => {
				markdown += `### ${metric.charAt(0).toUpperCase() + metric.slice(1)}\n`;
				markdown += `- **Direction:** ${trend.direction}\n`;
				markdown += `- **Strength:** ${trend.strength}\n`;
				markdown += `- **Change:** ${trend.percentage}%\n`;
				markdown += `- **Confidence:** ${trend.confidence}%\n\n`;
			});
		}

		// Insights section
		if (options.sections.insights && data.insights) {
			markdown += `## Insights\n\n`;
			if (Array.isArray(data.insights)) {
				data.insights.forEach((insight: string) => {
					markdown += `- ${insight}\n`;
				});
			} else {
				Object.entries(data.insights).forEach(([key, value]) => {
					markdown += `### ${key.charAt(0).toUpperCase() + key.slice(1)}\n`;
					markdown += `${value}\n\n`;
				});
			}
			markdown += '\n';
		}

		// Raw data section
		if (options.sections.rawData && data.rawData && data.rawData.length > 0) {
			markdown += `## Raw Data\n\n`;
			
			// Create table
			const headers = Object.keys(data.rawData[0]);
			markdown += `| ${headers.join(' | ')} |\n`;
			markdown += `| ${headers.map(() => '---').join(' | ')} |\n`;
			
			data.rawData.forEach((row: any) => {
				const values = headers.map(header => row[header] || '');
				markdown += `| ${values.join(' | ')} |\n`;
			});
			markdown += '\n';
		}

		const fileName = `analytics-report-${moment().format('YYYY-MM-DD-HHmmss')}.md`;
		await this.saveFile(fileName, markdown);
	}

	/**
	 * Export to HTML format
	 */
	private async exportToHTML(data: any, options: ExportOptions): Promise<void> {
		let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Notes Analytics Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: ${options.theme === 'dark' ? '#1a1a1a' : '#ffffff'};
            color: ${options.theme === 'dark' ? '#e0e0e0' : '#333333'};
        }
        .header {
            border-bottom: 2px solid #007acc;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .summary-card {
            background: ${options.theme === 'dark' ? '#2a2a2a' : '#f8f9fa'};
            padding: 20px;
            border-radius: 8px;
            border: 1px solid ${options.theme === 'dark' ? '#404040' : '#dee2e6'};
        }
        .chart-container {
            margin: 20px 0;
            text-align: center;
        }
        .chart-image {
            max-width: 100%;
            height: auto;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            border: 1px solid ${options.theme === 'dark' ? '#404040' : '#dee2e6'};
            padding: 12px;
            text-align: left;
        }
        th {
            background: ${options.theme === 'dark' ? '#333333' : '#f8f9fa'};
            font-weight: 600;
        }
        .insight {
            background: ${options.theme === 'dark' ? '#2a2a2a' : '#e8f4fd'};
            border-left: 4px solid #007acc;
            padding: 15px;
            margin: 10px 0;
        }
        @media print {
            body { background: white; color: black; }
            .chart-image { break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Notes Analytics Report</h1>
        <p><strong>Generated:</strong> ${moment().format('YYYY-MM-DD HH:mm:ss')}</p>
        <p><strong>Date Range:</strong> ${options.dateRange.start} to ${options.dateRange.end}</p>
    </div>
`;

		// Summary section
		if (options.sections.summary && data.summary) {
			html += `<section><h2>Summary</h2><div class="summary-grid">`;
			Object.entries(data.summary).forEach(([key, value]) => {
				const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
				html += `<div class="summary-card"><h3>${formattedKey}</h3><p style="font-size: 1.5em; font-weight: bold; color: #007acc;">${value}</p></div>`;
			});
			html += `</div></section>`;
		}

		// Charts section
		if (options.sections.charts && data.charts) {
			html += `<section><h2>Charts</h2>`;
			data.charts.forEach((chart: any) => {
				if (chart.base64Image) {
					html += `
                    <div class="chart-container">
                        <h3>${chart.title}</h3>
                        <img src="data:image/png;base64,${chart.base64Image}" alt="${chart.title}" class="chart-image">
                    </div>`;
				}
			});
			html += `</section>`;
		}

		// Insights section
		if (options.sections.insights && data.insights) {
			html += `<section><h2>Insights</h2>`;
			if (Array.isArray(data.insights)) {
				data.insights.forEach((insight: string) => {
					html += `<div class="insight">${insight}</div>`;
				});
			}
			html += `</section>`;
		}

		html += `</body></html>`;

		const fileName = `analytics-report-${moment().format('YYYY-MM-DD-HHmmss')}.html`;
		await this.saveFile(fileName, html);
	}

	/**
	 * Export to PDF format (simplified version)
	 */
	private async exportToPDF(data: any, options: ExportOptions): Promise<void> {
		// For now, generate HTML and provide instructions for PDF conversion
		await this.exportToHTML(data, options);
		new Notice('HTML report generated. Use your browser\'s print function to save as PDF.');
	}

	/**
	 * Save file to vault
	 */
	private async saveFile(fileName: string, content: string): Promise<void> {
		try {
			// Create exports folder if it doesn't exist
			const exportFolder = 'Analytics Exports';
			if (!await this.vault.adapter.exists(exportFolder)) {
				await this.vault.createFolder(exportFolder);
			}

			const filePath = `${exportFolder}/${fileName}`;
			await this.vault.create(filePath, content);
		} catch (error) {
			// If file already exists, create with timestamp
			const timestamp = Date.now();
			const baseName = fileName.replace(/\.[^/.]+$/, "");
			const extension = fileName.split('.').pop();
			const newFileName = `${baseName}-${timestamp}.${extension}`;
			const filePath = `Analytics Exports/${newFileName}`;
			await this.vault.create(filePath, content);
		}
	}

	/**
	 * Create backup of analytics data
	 */
	async createBackup(analyticsData: any): Promise<void> {
		const backup = {
			version: '1.0.0',
			createdAt: moment().toISOString(),
			data: analyticsData
		};

		const fileName = `analytics-backup-${moment().format('YYYY-MM-DD-HHmmss')}.json`;
		await this.saveFile(fileName, JSON.stringify(backup, null, 2));
		new Notice('Analytics backup created successfully');
	}

	/**
	 * Restore analytics data from backup
	 */
	async restoreFromBackup(backupFile: string): Promise<any> {
		try {
			const content = await this.vault.read(backupFile);
			const backup = JSON.parse(content);
			
			if (backup.version && backup.data) {
				new Notice('Analytics data restored successfully');
				return backup.data;
			} else {
				throw new Error('Invalid backup file format');
			}
		} catch (error) {
			console.error('Restore failed:', error);
			new Notice('Failed to restore analytics data');
			throw error;
		}
	}

	/**
	 * Generate sharing URL (simplified - would need backend service)
	 */
	async generateSharingLink(report: ShareableReport): Promise<string> {
		// This would typically upload to a sharing service
		// For now, just create a local HTML file
		const shareData = {
			id: Date.now().toString(),
			report: report,
			expiresAt: moment().add(30, 'days').toISOString()
		};

		const html = this.generateShareHTML(report);
		const fileName = `shared-report-${shareData.id}.html`;
		await this.saveFile(fileName, html);
		
		return `local://Analytics Exports/${fileName}`;
	}

	private generateShareHTML(report: ShareableReport): string {
		return `
<!DOCTYPE html>
<html>
<head>
    <title>${report.title}</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { border-bottom: 2px solid #007acc; padding-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .card { background: #f8f9fa; padding: 20px; border-radius: 8px; }
        .chart { margin: 20px 0; text-align: center; }
        .insight { background: #e8f4fd; border-left: 4px solid #007acc; padding: 15px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${report.title}</h1>
        <p>Generated: ${report.generatedAt}</p>
        <p>Date Range: ${report.dateRange}</p>
    </div>
    
    <div class="summary">
        ${Object.entries(report.summary || {}).map(([key, value]) => 
            `<div class="card"><h3>${key}</h3><p style="font-size: 1.5em; color: #007acc;">${value}</p></div>`
        ).join('')}
    </div>
    
    ${report.charts.map(chart => 
        chart.base64Image ? 
        `<div class="chart">
            <h3>${chart.title}</h3>
            <img src="data:image/png;base64,${chart.base64Image}" style="max-width: 100%;">
        </div>` : ''
    ).join('')}
    
    <div>
        <h2>Insights</h2>
        ${report.insights.map(insight => `<div class="insight">${insight}</div>`).join('')}
    </div>
</body>
</html>`;
	}
}
