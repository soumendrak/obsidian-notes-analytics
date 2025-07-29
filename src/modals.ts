import { App, Modal, Setting, Notice } from 'obsidian';
import { ChartRenderer } from './chartRenderer';
import { DataService } from './dataService';
import { StreakService } from './streakService';
import { NotesAnalyticsSettings, TimeFilter, ChartType, FileCreationData, WordCountData } from './types';

export class NotesAnalyticsModal extends Modal {
	private settings: NotesAnalyticsSettings;
	private dataService: DataService;
	private streakService: StreakService;
	private chartRenderer: ChartRenderer | null = null;
	private currentData: FileCreationData[] | WordCountData[] | Array<{ label: string; value: number }> = [];
	private currentDataType: 'files' | 'words' | 'cumulative-files' | 'file-sizes' | 'file-growth' = 'files';

	constructor(app: App, settings: NotesAnalyticsSettings) {
		super(app);
		this.settings = settings;
		this.dataService = new DataService(app);
		this.streakService = new StreakService(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('notes-analytics-modal');

		// Header with title and export controls
		const headerEl = contentEl.createDiv('analytics-header');
		
		const titleEl = headerEl.createEl('h2', { text: 'Notes Analytics' });
		titleEl.addClass('analytics-title');

		const exportControlsEl = headerEl.createDiv('export-controls');
		
		// Export buttons
		const exportPNGBtn = exportControlsEl.createEl('button', { text: 'PNG' });
		exportPNGBtn.addEventListener('click', () => this.exportChart('png'));
		
		const exportSVGBtn = exportControlsEl.createEl('button', { text: 'SVG' });
		exportSVGBtn.addEventListener('click', () => this.exportChart('svg'));
		
		const copyBtn = exportControlsEl.createEl('button', { text: 'Copy' });
		copyBtn.addEventListener('click', () => this.exportChart('copy'));

		const exportCSVBtn = exportControlsEl.createEl('button', { text: 'CSV' });
		exportCSVBtn.addEventListener('click', () => this.exportData('csv'));

		const exportJSONBtn = exportControlsEl.createEl('button', { text: 'JSON' });
		exportJSONBtn.addEventListener('click', () => this.exportData('json'));

		// Controls section
		const controlsEl = contentEl.createDiv('analytics-controls');
		
		// Data type selection
		new Setting(controlsEl)
			.setName('Data Type')
			.setDesc('Choose what data to analyze')
			.addDropdown(dropdown => dropdown
				.addOption('files', 'File Creation')
				.addOption('words', 'Word Count')
				.addOption('cumulative-files', 'Cumulative File Count')
				.addOption('file-sizes', 'File Size Distribution')
				.addOption('file-growth', 'File Size Growth')
				.setValue(this.currentDataType)
				.onChange(async (value: 'files' | 'words' | 'cumulative-files' | 'file-sizes' | 'file-growth') => {
					this.currentDataType = value;
					await this.updateChart();
				}));

		// Time filter selection
		let currentTimeFilter: TimeFilter = 'daily';
		new Setting(controlsEl)
			.setName('Time Filter')
			.setDesc('Choose the time range for analysis')
			.addDropdown(dropdown => dropdown
				.addOption('daily', 'Daily (Last 30 days)')
				.addOption('weekly', 'Weekly (Last 12 weeks)')
				.addOption('monthly', 'Monthly (Last 12 months)')
				.addOption('yearly', 'Yearly (Last 5 years)')
				.addOption('custom', 'Custom Range')
				.setValue(currentTimeFilter)
				.onChange(async (value: TimeFilter) => {
					currentTimeFilter = value;
					await this.updateChart();
				}));

		// Chart type selection
		let currentChartType: ChartType = this.settings.defaultChartType;
		new Setting(controlsEl)
			.setName('Chart Type')
			.setDesc('Choose how to visualize the data')
			.addDropdown(dropdown => dropdown
				.addOption('line', 'Line Chart')
				.addOption('bar', 'Bar Chart')
				.addOption('area', 'Area Chart')
				.addOption('pie', 'Pie Chart')
				.setValue(currentChartType)
				.onChange(async (value: ChartType) => {
					currentChartType = value;
					await this.renderChart();
				}));

		// Chart container
		const chartContainer = contentEl.createDiv('chart-container');
		const canvas = chartContainer.createEl('canvas');
		canvas.id = 'analytics-chart';
		this.chartRenderer = new ChartRenderer(canvas, 1000, 500);

		// Summary section
		const summaryEl = contentEl.createDiv('analytics-summary');
		this.updateSummary(summaryEl);

		// Load initial data
		this.updateChart();

		// Helper functions
		const updateChart = async () => {
			if (this.currentDataType === 'files') {
				this.currentData = await this.dataService.getFileCreationData(currentTimeFilter);
			} else if (this.currentDataType === 'words') {
				this.currentData = await this.dataService.getWordCountData(currentTimeFilter);
			} else if (this.currentDataType === 'cumulative-files') {
				this.currentData = await this.dataService.getCumulativeFileCountData(currentTimeFilter);
			} else if (this.currentDataType === 'file-sizes') {
				this.currentData = await this.dataService.getFileSizeDistributionData();
			} else if (this.currentDataType === 'file-growth') {
				this.currentData = await this.dataService.getFileSizeGrowthTrendData();
			}
			await this.renderChart();
		};

		const renderChart = async () => {
			if (!this.chartRenderer || this.currentData.length === 0) return;

			let title: string;
			switch (this.currentDataType) {
				case 'files':
					title = `File Creation - ${currentTimeFilter.charAt(0).toUpperCase() + currentTimeFilter.slice(1)}`;
					break;
				case 'words':
					title = `Word Count - ${currentTimeFilter.charAt(0).toUpperCase() + currentTimeFilter.slice(1)}`;
					break;
				case 'cumulative-files':
					title = `Cumulative File Count - ${currentTimeFilter.charAt(0).toUpperCase() + currentTimeFilter.slice(1)}`;
					break;
				case 'file-sizes':
					title = 'File Size Distribution';
					break;
				case 'file-growth':
					title = 'File Size Growth Trends';
					break;
				default:
					title = 'Analytics Data';
			}

			const chartData = this.currentData.map(item => ({
				label: item.label,
				value: 'count' in item ? item.count : 
					   'words' in item ? (item as WordCountData).words :
					   (item as { value: number }).value
			}));

			switch (currentChartType) {
				case 'line':
					this.chartRenderer.renderLineChart(chartData, title);
					break;
				case 'bar':
					this.chartRenderer.renderBarChart(chartData, title);
					break;
				case 'area':
					this.chartRenderer.renderAreaChart(chartData, title);
					break;
				case 'pie':
					this.chartRenderer.renderPieChart(chartData, title);
					break;
			}
		};

		// Bind functions to instance
		this.updateChart = updateChart;
		this.renderChart = renderChart;
	}

	private async updateSummary(summaryEl: HTMLElement) {
		summaryEl.empty();
		const summary = await this.dataService.getAnalyticsSummary();
		const streakData = await this.streakService.getWritingStreak();
		
		summaryEl.createEl('h3', { text: 'Summary Statistics' });
		
		const statsGrid = summaryEl.createDiv('stats-grid');
		
		this.createStatCard(statsGrid, 'Total Files', summary.totalFiles.toString());
		this.createStatCard(statsGrid, 'Total Words', summary.totalWords.toLocaleString());
		this.createStatCard(statsGrid, 'Files Today', summary.filesToday.toString());
		this.createStatCard(statsGrid, 'Files This Week', summary.filesThisWeek.toString());
		this.createStatCard(statsGrid, 'Files This Month', summary.filesThisMonth.toString());
		this.createStatCard(statsGrid, 'Avg Words/File', summary.avgWordsPerFile.toString());
		this.createStatCard(statsGrid, 'Most Active Day', summary.mostActiveDay);

		// Streak section
		const streakSection = summaryEl.createDiv('streak-section');
		streakSection.createEl('h3', { text: 'Writing Streak' });
		
		const streakGrid = streakSection.createDiv('stats-grid');
		this.createStatCard(streakGrid, 'Current Streak', `${streakData.currentStreak} day${streakData.currentStreak !== 1 ? 's' : ''}`, '🔥');
		this.createStatCard(streakGrid, 'Longest Streak', `${streakData.longestStreak} day${streakData.longestStreak !== 1 ? 's' : ''}`, '🏆');
		this.createStatCard(streakGrid, 'Last Write', streakData.lastWriteDate || 'No data', '📝');

		// Motivation message
		const motivationEl = streakSection.createDiv('streak-motivation');
		motivationEl.style.textAlign = 'center';
		motivationEl.style.padding = '16px';
		motivationEl.style.margin = '16px 0';
		motivationEl.style.background = 'var(--background-secondary)';
		motivationEl.style.borderRadius = '8px';
		motivationEl.style.fontSize = '16px';
		motivationEl.style.fontWeight = 'bold';
		motivationEl.style.color = 'var(--text-accent)';
		
		const motivationText = this.streakService.getStreakMotivation(streakData.currentStreak);
		motivationEl.setText(motivationText);

		// File size section
		const fileSizeSection = summaryEl.createDiv('file-size-section');
		fileSizeSection.createEl('h3', { text: 'File Size Analytics' });
		
		try {
			const fileSizeStats = await this.dataService.getFileSizeStats();
			const fileSizeGrid = fileSizeSection.createDiv('stats-grid');
			
			this.createStatCard(fileSizeGrid, 'Total Size', fileSizeStats.totalSizeFormatted, '💾');
			this.createStatCard(fileSizeGrid, 'Average Size', fileSizeStats.averageSizeFormatted, '📊');
			this.createStatCard(fileSizeGrid, 'Largest File', fileSizeStats.largestFile?.sizeFormatted || 'N/A', '🏆');
			this.createStatCard(fileSizeGrid, 'Small Files', fileSizeStats.sizeDistribution.small.toString(), '📄');
			this.createStatCard(fileSizeGrid, 'Large Files', fileSizeStats.sizeDistribution.large.toString(), '📚');

			// File size insights
			const insights = await this.dataService.getFileSizeInsights();
			if (insights.length > 0) {
				const insightsEl = fileSizeSection.createDiv('file-size-insights');
				insightsEl.style.marginTop = '16px';
				insightsEl.style.padding = '12px';
				insightsEl.style.background = 'var(--background-secondary)';
				insightsEl.style.borderRadius = '6px';
				insightsEl.style.fontSize = '14px';
				
				insights.slice(0, 3).forEach(insight => {
					const insightP = insightsEl.createEl('p');
					insightP.setText(insight);
					insightP.style.margin = '4px 0';
				});
			}
		} catch (error) {
			console.error('Failed to load file size stats:', error);
			const errorEl = fileSizeSection.createDiv();
			errorEl.setText('File size analytics unavailable');
			errorEl.style.color = 'var(--text-muted)';
		}
	}

	private createStatCard(container: HTMLElement, label: string, value: string, emoji?: string) {
		const card = container.createDiv('stat-card');
		const valueDiv = card.createEl('div', { cls: 'stat-value' });
		
		if (emoji) {
			valueDiv.innerHTML = `${emoji} ${value}`;
		} else {
			valueDiv.setText(value);
		}
		
		card.createEl('div', { text: label, cls: 'stat-label' });
	}

	private exportChart(format: 'png' | 'svg' | 'copy') {
		if (!this.chartRenderer) {
			new Notice('No chart to export');
			return;
		}

		const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
		const filename = `notes-analytics-${this.currentDataType}-${timestamp}`;

		switch (format) {
			case 'png':
				this.chartRenderer.exportToPNG(`${filename}.png`);
				new Notice('Chart exported as PNG');
				break;
			case 'svg':
				this.chartRenderer.exportToSVG(`${filename}.svg`);
				new Notice('Chart exported as SVG');
				break;
			case 'copy':
				this.chartRenderer.copyToClipboard();
				break;
		}
	}

	private exportData(format: 'csv' | 'json') {
		if (this.currentData.length === 0) {
			new Notice('No data to export');
			return;
		}

		const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
		const filename = `notes-analytics-${this.currentDataType}-${timestamp}`;

		switch (format) {
			case 'csv':
				if (this.currentDataType === 'files' || this.currentDataType === 'words') {
					this.dataService.exportToCSV(
						this.currentData as FileCreationData[] | WordCountData[], 
						this.currentDataType, 
						`${filename}.csv`
					);
				} else {
					// Handle file size data exports with generic format
					const genericData = this.currentData as Array<{ label: string; value: number }>;
					this.exportGenericData(genericData, format, filename);
				}
				new Notice('Data exported as CSV');
				break;
			case 'json':
				if (this.currentDataType === 'files' || this.currentDataType === 'words') {
					this.dataService.exportToJSON(
						this.currentData as FileCreationData[] | WordCountData[], 
						this.currentDataType, 
						`${filename}.json`
					);
				} else {
					// Handle file size data exports with generic format
					const genericData = this.currentData as Array<{ label: string; value: number }>;
					this.exportGenericData(genericData, format, filename);
				}
				new Notice('Data exported as JSON');
				break;
		}
	}

	// These will be bound to the actual functions in onOpen
	private async updateChart(): Promise<void> {}
	private async renderChart(): Promise<void> {}

	private exportGenericData(data: Array<{ label: string; value: number }>, format: 'csv' | 'json', filename: string) {
		const content = format === 'csv' 
			? this.convertToCSV(data)
			: JSON.stringify(data, null, 2);
		
		const blob = new Blob([content], { 
			type: format === 'csv' ? 'text/csv' : 'application/json' 
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${filename}.${format}`;
		a.click();
		URL.revokeObjectURL(url);
	}

	private convertToCSV(data: Array<{ label: string; value: number }>): string {
		const headers = ['Label', 'Value'];
		const rows = data.map(item => [item.label, item.value.toString()]);
		return [headers, ...rows].map(row => row.join(',')).join('\n');
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
