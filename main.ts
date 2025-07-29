import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, moment } from 'obsidian';

interface NotesAnalyticsSettings {
	dateFormat: string;
	enableRealTimeUpdates: boolean;
	showAdvancedStats: boolean;
	defaultChartType: 'line' | 'bar' | 'area' | 'pie';
	enableChartExport: boolean;
	enableCustomDateRange: boolean;
	dailyWordGoal: number;
	weeklyFileGoal: number;
	monthlyWordGoal: number;
}

const DEFAULT_SETTINGS: NotesAnalyticsSettings = {
	dateFormat: 'YYYY-MM-DD',
	enableRealTimeUpdates: true,
	showAdvancedStats: true,
	defaultChartType: 'line',
	enableChartExport: true,
	enableCustomDateRange: true,
	dailyWordGoal: 500,
	weeklyFileGoal: 7,
	monthlyWordGoal: 15000
}

interface WordCountData {
	date: string;
	totalWords: number;
	filesCreated: number;
	avgWordsPerFile: number;
	cumulativeWords: number;
	cumulativeFiles: number;
}

interface FileSizeData {
	fileName: string;
	size: number;
	sizeFormatted: string;
	category: 'small' | 'medium' | 'large' | 'very-large';
}

// Chart utilities for data visualization
class ChartRenderer {
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private width: number;
	private height: number;
	private padding = { top: 40, right: 40, bottom: 60, left: 80 };

	constructor(canvas: HTMLCanvasElement, width: number = 900, height: number = 600) {
		this.canvas = canvas;
		this.canvas.width = width;
		this.canvas.height = height;
		this.width = width;
		this.height = height;
		this.ctx = canvas.getContext('2d')!;
	}

	private getChartArea() {
		return {
			x: this.padding.left,
			y: this.padding.top,
			width: this.width - this.padding.left - this.padding.right,
			height: this.height - this.padding.top - this.padding.bottom
		};
	}

	private drawGrid(chartArea: any, xLabels: string[], maxValue: number) {
		const { ctx } = this;
		ctx.strokeStyle = 'var(--background-modifier-border)';
		ctx.lineWidth = 1;

		// Horizontal grid lines
		const steps = 5;
		for (let i = 0; i <= steps; i++) {
			const y = chartArea.y + (chartArea.height * i / steps);
			ctx.beginPath();
			ctx.moveTo(chartArea.x, y);
			ctx.lineTo(chartArea.x + chartArea.width, y);
			ctx.stroke();

			// Y-axis labels
			const value = Math.round(maxValue * (steps - i) / steps);
			ctx.fillStyle = 'var(--text-muted)';
			ctx.font = '12px var(--font-interface)';
			ctx.textAlign = 'right';
			ctx.fillText(value.toString(), chartArea.x - 10, y + 4);
		}

		// Vertical grid lines and X-axis labels
		const stepX = chartArea.width / Math.max(1, xLabels.length - 1);
		xLabels.forEach((label, i) => {
			const x = chartArea.x + (i * stepX);
			
			// Grid line
			ctx.beginPath();
			ctx.moveTo(x, chartArea.y);
			ctx.lineTo(x, chartArea.y + chartArea.height);
			ctx.stroke();

			// X-axis label
			ctx.fillStyle = 'var(--text-muted)';
			ctx.font = '12px var(--font-interface)';
			ctx.textAlign = 'center';
			ctx.save();
			ctx.translate(x, chartArea.y + chartArea.height + 20);
			ctx.rotate(-Math.PI / 4);
			ctx.fillText(label, 0, 0);
			ctx.restore();
		});
	}

	renderLineChart(data: { label: string; value: number }[], title: string, color: string = '#007acc') {
		const { ctx } = this;
		const chartArea = this.getChartArea();

		// Clear canvas
		ctx.clearRect(0, 0, this.width, this.height);

		if (data.length === 0) {
			ctx.fillStyle = 'var(--text-muted)';
			ctx.font = '16px var(--font-interface)';
			ctx.textAlign = 'center';
			ctx.fillText('No data available', this.width / 2, this.height / 2);
			return;
		}

		const maxValue = Math.max(...data.map(d => d.value));
		const labels = data.map(d => d.label);

		// Draw grid and axes
		this.drawGrid(chartArea, labels, maxValue);

		// Draw title
		ctx.fillStyle = 'var(--text-accent)';
		ctx.font = 'bold 16px var(--font-interface)';
		ctx.textAlign = 'center';
		ctx.fillText(title, this.width / 2, 25);

		// Draw line
		ctx.strokeStyle = color;
		ctx.lineWidth = 3;
		ctx.beginPath();

		const stepX = chartArea.width / Math.max(1, data.length - 1);
		data.forEach((point, i) => {
			const x = chartArea.x + (i * stepX);
			const y = chartArea.y + chartArea.height - (point.value / maxValue * chartArea.height);

			if (i === 0) {
				ctx.moveTo(x, y);
			} else {
				ctx.lineTo(x, y);
			}
		});
		ctx.stroke();

		// Draw points
		ctx.fillStyle = color;
		data.forEach((point, i) => {
			const x = chartArea.x + (i * stepX);
			const y = chartArea.y + chartArea.height - (point.value / maxValue * chartArea.height);

			ctx.beginPath();
			ctx.arc(x, y, 4, 0, Math.PI * 2);
			ctx.fill();
		});
	}

	renderBarChart(data: { label: string; value: number }[], title: string, color: string = '#007acc') {
		const { ctx } = this;
		const chartArea = this.getChartArea();

		// Clear canvas
		ctx.clearRect(0, 0, this.width, this.height);

		if (data.length === 0) {
			ctx.fillStyle = 'var(--text-muted)';
			ctx.font = '16px var(--font-interface)';
			ctx.textAlign = 'center';
			ctx.fillText('No data available', this.width / 2, this.height / 2);
			return;
		}

		const maxValue = Math.max(...data.map(d => d.value));
		const labels = data.map(d => d.label);

		// Draw grid and axes
		this.drawGrid(chartArea, labels, maxValue);

		// Draw title
		ctx.fillStyle = 'var(--text-accent)';
		ctx.font = 'bold 16px var(--font-interface)';
		ctx.textAlign = 'center';
		ctx.fillText(title, this.width / 2, 25);

		// Draw bars
		const barWidth = chartArea.width / data.length * 0.8;
		const barSpacing = chartArea.width / data.length * 0.2;

		data.forEach((point, i) => {
			const barHeight = (point.value / maxValue) * chartArea.height;
			const x = chartArea.x + (i * (barWidth + barSpacing)) + barSpacing / 2;
			const y = chartArea.y + chartArea.height - barHeight;

			// Bar
			ctx.fillStyle = color;
			ctx.fillRect(x, y, barWidth, barHeight);

			// Bar border
			ctx.strokeStyle = color;
			ctx.lineWidth = 1;
			ctx.strokeRect(x, y, barWidth, barHeight);

			// Value labels on bars
			if (barHeight > 20) {
				ctx.fillStyle = 'white';
				ctx.font = '12px var(--font-interface)';
				ctx.textAlign = 'center';
				ctx.fillText(point.value.toString(), x + barWidth / 2, y + 15);
			}
		});
	}

	renderPieChart(data: { label: string; value: number }[], title: string, colors: string[] = ['#007acc', '#28a745', '#dc3545', '#ffc107', '#6f42c1', '#fd7e14']) {
		const { ctx } = this;
		const chartArea = this.getChartArea();

		// Clear canvas
		ctx.clearRect(0, 0, this.width, this.height);

		if (data.length === 0) {
			ctx.fillStyle = 'var(--text-muted)';
			ctx.font = '16px var(--font-interface)';
			ctx.textAlign = 'center';
			ctx.fillText('No data available', this.width / 2, this.height / 2);
			return;
		}

		// Draw title
		ctx.fillStyle = 'var(--text-normal)';
		ctx.font = 'bold 16px var(--font-interface)';
		ctx.textAlign = 'center';
		ctx.fillText(title, this.width / 2, 25);

		const total = data.reduce((sum, item) => sum + item.value, 0);
		const centerX = chartArea.x + chartArea.width / 2;
		const centerY = chartArea.y + chartArea.height / 2;
		const radius = Math.min(chartArea.width, chartArea.height) / 2 - 40;

		let currentAngle = -Math.PI / 2; // Start at top

		// Draw pie slices
		data.forEach((item, i) => {
			const sliceAngle = (item.value / total) * 2 * Math.PI;
			const color = colors[i % colors.length];

			ctx.beginPath();
			ctx.moveTo(centerX, centerY);
			ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
			ctx.closePath();
			ctx.fillStyle = color;
			ctx.fill();
			ctx.strokeStyle = 'var(--background-primary)';
			ctx.lineWidth = 2;
			ctx.stroke();

			// Draw labels
			const labelAngle = currentAngle + sliceAngle / 2;
			const labelX = centerX + Math.cos(labelAngle) * (radius + 25);
			const labelY = centerY + Math.sin(labelAngle) * (radius + 25);
			
			ctx.fillStyle = 'var(--text-normal)';
			ctx.font = '12px var(--font-interface)';
			ctx.textAlign = 'center';
			ctx.fillText(item.label, labelX, labelY);
			
			// Draw percentage
			const percentage = Math.round((item.value / total) * 100);
			ctx.fillText(`${percentage}%`, labelX, labelY + 15);

			currentAngle += sliceAngle;
		});
	}

	renderAreaChart(data: { label: string; value: number }[], title: string, color: string = '#007acc') {
		const { ctx } = this;
		const chartArea = this.getChartArea();

		// Clear canvas
		ctx.clearRect(0, 0, this.width, this.height);

		if (data.length === 0) {
			ctx.fillStyle = 'var(--text-muted)';
			ctx.font = '16px var(--font-interface)';
			ctx.textAlign = 'center';
			ctx.fillText('No data available', this.width / 2, this.height / 2);
			return;
		}

		// Draw title
		ctx.fillStyle = 'var(--text-normal)';
		ctx.font = 'bold 16px var(--font-interface)';
		ctx.textAlign = 'center';
		ctx.fillText(title, this.width / 2, 25);

		const maxValue = Math.max(...data.map(d => d.value));
		const stepX = chartArea.width / (data.length - 1);

		// Draw grid lines
		ctx.strokeStyle = 'var(--background-modifier-border)';
		ctx.lineWidth = 1;
		
		// Horizontal grid lines
		for (let i = 0; i <= 5; i++) {
			const y = chartArea.y + (chartArea.height / 5) * i;
			ctx.beginPath();
			ctx.moveTo(chartArea.x, y);
			ctx.lineTo(chartArea.x + chartArea.width, y);
			ctx.stroke();
			
			// Y-axis labels
			const value = Math.round(maxValue * (5 - i) / 5);
			ctx.fillStyle = 'var(--text-muted)';
			ctx.font = '12px var(--font-interface)';
			ctx.textAlign = 'right';
			ctx.fillText(value.toString(), chartArea.x - 10, y + 4);
		}

		// Draw x-axis labels
		ctx.fillStyle = 'var(--text-muted)';
		ctx.textAlign = 'center';
		data.forEach((point, i) => {
			const x = chartArea.x + (i * stepX);
			ctx.fillText(point.label, x, chartArea.y + chartArea.height + 20);
		});

		// Create area path
		ctx.beginPath();
		ctx.moveTo(chartArea.x, chartArea.y + chartArea.height);

		// Draw line to first point
		const firstY = chartArea.y + chartArea.height - (data[0].value / maxValue * chartArea.height);
		ctx.lineTo(chartArea.x, firstY);

		// Draw curve through all points
		data.forEach((point, i) => {
			const x = chartArea.x + (i * stepX);
			const y = chartArea.y + chartArea.height - (point.value / maxValue * chartArea.height);
			ctx.lineTo(x, y);
		});

		// Close area to bottom
		ctx.lineTo(chartArea.x + chartArea.width, chartArea.y + chartArea.height);
		ctx.closePath();

		// Fill area with gradient
		const gradient = ctx.createLinearGradient(0, chartArea.y, 0, chartArea.y + chartArea.height);
		gradient.addColorStop(0, color + '80'); // 50% opacity
		gradient.addColorStop(1, color + '20'); // 12% opacity
		ctx.fillStyle = gradient;
		ctx.fill();

		// Draw line on top
		ctx.beginPath();
		data.forEach((point, i) => {
			const x = chartArea.x + (i * stepX);
			const y = chartArea.y + chartArea.height - (point.value / maxValue * chartArea.height);
			
			if (i === 0) {
				ctx.moveTo(x, y);
			} else {
				ctx.lineTo(x, y);
			}
		});
		ctx.strokeStyle = color;
		ctx.lineWidth = 3;
		ctx.stroke();

		// Draw points
		ctx.fillStyle = color;
		data.forEach((point, i) => {
			const x = chartArea.x + (i * stepX);
			const y = chartArea.y + chartArea.height - (point.value / maxValue * chartArea.height);

			ctx.beginPath();
			ctx.arc(x, y, 4, 0, Math.PI * 2);
			ctx.fill();
		});
	}

	// Export chart as PNG
	exportToPNG(filename: string = 'chart.png') {
		const link = document.createElement('a');
		link.download = filename;
		link.href = this.canvas.toDataURL('image/png');
		link.click();
	}

	// Export chart as SVG
	exportToSVG(filename: string = 'chart.svg') {
		// Create SVG string representation of the canvas
		const svgData = this.canvasToSVG();
		const blob = new Blob([svgData], { type: 'image/svg+xml' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = filename;
		link.click();
		URL.revokeObjectURL(url);
	}

	// Copy chart to clipboard
	async copyToClipboard() {
		try {
			// Convert canvas to blob
			const blob = await new Promise<Blob>((resolve) => {
				this.canvas.toBlob((blob) => {
					resolve(blob!);
				}, 'image/png');
			});

			// Copy to clipboard using modern API
			if (navigator.clipboard && window.ClipboardItem) {
				const item = new ClipboardItem({ 'image/png': blob });
				await navigator.clipboard.write([item]);
				new Notice('Chart copied to clipboard!');
			} else {
				// Fallback: copy as data URL to clipboard (text)
				const dataURL = this.canvas.toDataURL('image/png');
				await navigator.clipboard.writeText(dataURL);
				new Notice('Chart data URL copied to clipboard!');
			}
		} catch (error) {
			console.error('Failed to copy to clipboard:', error);
			new Notice('Failed to copy chart to clipboard');
		}
	}

	// Convert canvas content to SVG (simplified)
	private canvasToSVG(): string {
		const svgWidth = this.width;
		const svgHeight = this.height;
		
		// Get image data from canvas
		const dataURL = this.canvas.toDataURL('image/png');
		
		// Create SVG with embedded image
		const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
	<image width="${svgWidth}" height="${svgHeight}" xlink:href="${dataURL}"/>
</svg>`;
		
		return svg;
	}
}

export default class NotesAnalyticsPlugin extends Plugin {
	settings: NotesAnalyticsSettings;
	private updateTimeout: number;

	async onload() {
		await this.loadSettings();

		// Add ribbon icon for analytics
		const ribbonIconEl = this.addRibbonIcon('bar-chart', 'Notes Analytics', (evt: MouseEvent) => {
			new ChartVisualizationsModal(this.app, this).open();
		});
		ribbonIconEl.addClass('notes-analytics-ribbon-class');

		// Add status bar item
		const statusBarItemEl = this.addStatusBarItem();
		this.updateStatusBar(statusBarItemEl);

		// Add command to open analytics modal
		this.addCommand({
			id: 'open-notes-analytics',
			name: 'Open Notes Analytics',
			callback: () => {
				new ChartVisualizationsModal(this.app, this).open();
			}
		});

		// Add command to show chart visualizations
		this.addCommand({
			id: 'show-chart-visualizations',
			name: 'Show Chart Visualizations',
			callback: () => {
				new ChartVisualizationsModal(this.app, this).open();
			}
		});

		// Add settings tab
		this.addSettingTab(new NotesAnalyticsSettingTab(this.app, this));

		// Register file events for real-time updates
		if (this.settings.enableRealTimeUpdates) {
			this.registerEvent(
				this.app.vault.on('create', (file) => {
					if (file instanceof TFile && file.extension === 'md') {
						this.updateStatusBar(statusBarItemEl);
					}
				})
			);

			this.registerEvent(
				this.app.vault.on('modify', (file) => {
					if (file instanceof TFile && file.extension === 'md') {
						// Debounce updates to avoid too frequent updates
						clearTimeout(this.updateTimeout);
						this.updateTimeout = window.setTimeout(() => {
							this.updateStatusBar(statusBarItemEl);
						}, 2000);
					}
				})
			);

			this.registerEvent(
				this.app.vault.on('delete', (file) => {
					if (file instanceof TFile && file.extension === 'md') {
						this.updateStatusBar(statusBarItemEl);
					}
				})
			);
		}

		// Update status bar periodically
		if (this.settings.enableRealTimeUpdates) {
			this.registerInterval(window.setInterval(() => {
				this.updateStatusBar(statusBarItemEl);
			}, 30000)); // Update every 30 seconds
		} else {
			// Update once on load
			this.updateStatusBar(statusBarItemEl);
		}
	}

	onunload() {
		// Clean up timeout if it exists
		if (this.updateTimeout) {
			clearTimeout(this.updateTimeout);
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private async updateStatusBar(statusBarItemEl: HTMLElement) {
		const files = this.app.vault.getMarkdownFiles();
		const totalFiles = files.length;
		const totalWords = await this.getTotalWordCount(files);
		statusBarItemEl.setText(`📊 ${totalFiles} files, ${totalWords} words`);
	}

	async getTotalWordCount(files: TFile[]): Promise<number> {
		let totalWords = 0;
		for (const file of files) {
			totalWords += await this.getWordCount(file);
		}
		return totalWords;
	}

	async getWordCount(file: TFile): Promise<number> {
		try {
			// For more accurate word count, read the file content
			const content = await this.app.vault.read(file);
			// Simple word count: split by whitespace and filter empty strings
			const words = content.trim().split(/\s+/).filter(word => word.length > 0);
			return words.length;
		} catch (error) {
			// Fallback to size-based estimation if reading fails
			if (file.stat) {
				return Math.floor(file.stat.size / 5); // Rough estimate: 5 chars per word
			}
			return 0;
		}
	}

	private formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	private categorizeFileSize(bytes: number): 'small' | 'medium' | 'large' | 'very-large' {
		if (bytes < 10 * 1024) return 'small';        // < 10KB
		if (bytes < 100 * 1024) return 'medium';      // 10KB - 100KB
		if (bytes < 1024 * 1024) return 'large';      // 100KB - 1MB
		return 'very-large';                          // > 1MB
	}

	async getFileSize(file: TFile): Promise<number> {
		try {
			const content = await this.app.vault.read(file);
			return new Blob([content]).size;
		} catch (error) {
			return file.stat.size || 0;
		}
	}

	async getFileSizeDistribution(): Promise<{ label: string; value: number }[]> {
		const files = this.app.vault.getMarkdownFiles();
		const categories = { small: 0, medium: 0, large: 0, 'very-large': 0 };

		for (const file of files) {
			const size = await this.getFileSize(file);
			const category = this.categorizeFileSize(size);
			categories[category]++;
		}

		return [
			{ label: 'Small (<10KB)', value: categories.small },
			{ label: 'Medium (10-100KB)', value: categories.medium },
			{ label: 'Large (100KB-1MB)', value: categories.large },
			{ label: 'Very Large (>1MB)', value: categories['very-large'] }
		].filter(item => item.value > 0);
	}

	async getLargestFiles(limit: number = 10): Promise<{ label: string; value: number }[]> {
		const files = this.app.vault.getMarkdownFiles();
		const fileSizes: { name: string; size: number }[] = [];

		for (const file of files) {
			const size = await this.getFileSize(file);
			fileSizes.push({ name: file.name, size });
		}

		return fileSizes
			.sort((a, b) => b.size - a.size)
			.slice(0, limit)
			.map(file => ({
				label: file.name.length > 20 ? file.name.substring(0, 17) + '...' : file.name,
				value: file.size
			}));
	}

	async getFileSizeGrowthTrends(): Promise<{ label: string; value: number }[]> {
		const files = this.app.vault.getMarkdownFiles();
		const growthCategories = { 'Growing': 0, 'Stable': 0, 'Shrinking': 0 };
		
		// Get files modified in the last 30 days
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
		
		for (const file of files) {
			if (file.stat.mtime > thirtyDaysAgo.getTime()) {
				// Simulate growth classification based on modification frequency and size
				const size = await this.getFileSize(file);
				const modificationDays = Math.floor((Date.now() - file.stat.mtime) / (1000 * 60 * 60 * 24));
				
				// Simple heuristic: classify based on size and recent modification
				if (size > 50 * 1024 && modificationDays < 7) { // Large files modified recently = growing
					growthCategories['Growing']++;
				} else if (size < 10 * 1024 || modificationDays > 14) { // Small files or old modifications = stable/shrinking
					growthCategories['Stable']++;
				} else {
					growthCategories['Shrinking']++;
				}
			}
		}

		return Object.entries(growthCategories)
			.filter(([_, count]) => count > 0)
			.map(([trend, count]) => ({ label: trend, value: count }));
	}

	async getTagAnalytics(): Promise<{ label: string; value: number }[]> {
		const files = this.app.vault.getMarkdownFiles();
		const tagCounts = new Map<string, number>();

		for (const file of files) {
			try {
				const content = await this.app.vault.read(file);
				// Extract tags using regex (both #tag and [[tag]] formats)
				const tagMatches = content.match(/#[\w\-_]+/g) || [];
				const wikiTagMatches = content.match(/\[\[([^\]]+)\]\]/g) || [];
				
				// Process hashtags
				tagMatches.forEach(tag => {
					const cleanTag = tag.substring(1); // Remove #
					tagCounts.set(cleanTag, (tagCounts.get(cleanTag) || 0) + 1);
				});

				// Process wiki-style tags (only if they look like tags)
				wikiTagMatches.forEach(match => {
					const tag = match.slice(2, -2); // Remove [[ and ]]
					if (tag.length < 30 && !tag.includes('/')) { // Basic filter for tag-like content
						tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
					}
				});
			} catch (error) {
				// Skip files that can't be read
				continue;
			}
		}

		return Array.from(tagCounts.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 15) // Top 15 tags
			.map(([tag, count]) => ({
				label: tag.length > 20 ? tag.substring(0, 17) + '...' : tag,
				value: count
			}));
	}

	async getFolderAnalytics(): Promise<{ label: string; value: number }[]> {
		const files = this.app.vault.getMarkdownFiles();
		const folderCounts = new Map<string, number>();

		files.forEach(file => {
			const folderPath = file.path.substring(0, file.path.lastIndexOf('/'));
			const folder = folderPath || 'Root';
			folderCounts.set(folder, (folderCounts.get(folder) || 0) + 1);
		});

		return Array.from(folderCounts.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 10) // Top 10 folders
			.map(([folder, count]) => ({
				label: folder.length > 25 ? '...' + folder.substring(folder.length - 22) : folder,
				value: count
			}));
	}

	async getWritingGoalsProgress(): Promise<{ label: string; value: number }[]> {
		const files = this.app.vault.getMarkdownFiles();
		const today = moment().startOf('day');
		const weekStart = moment().startOf('week');
		const monthStart = moment().startOf('month');

		// Daily word progress
		let todayWords = 0;
		const todayFiles = files.filter(file => moment(file.stat.ctime).isAfter(today));
		for (const file of todayFiles) {
			todayWords += await this.getWordCount(file);
		}

		// Weekly file progress
		const weekFiles = files.filter(file => moment(file.stat.ctime).isAfter(weekStart)).length;

		// Monthly word progress
		let monthWords = 0;
		const monthFiles = files.filter(file => moment(file.stat.ctime).isAfter(monthStart));
		for (const file of monthFiles) {
			monthWords += await this.getWordCount(file);
		}

		const dailyProgress = Math.min(100, (todayWords / this.settings.dailyWordGoal) * 100);
		const weeklyProgress = Math.min(100, (weekFiles / this.settings.weeklyFileGoal) * 100);
		const monthlyProgress = Math.min(100, (monthWords / this.settings.monthlyWordGoal) * 100);

		return [
			{ label: `Daily Words (${todayWords}/${this.settings.dailyWordGoal})`, value: Math.round(dailyProgress) },
			{ label: `Weekly Files (${weekFiles}/${this.settings.weeklyFileGoal})`, value: Math.round(weeklyProgress) },
			{ label: `Monthly Words (${monthWords}/${this.settings.monthlyWordGoal})`, value: Math.round(monthlyProgress) }
		];
	}

	async getWordCountAnalyticsForDateRange(startDate: string, endDate: string, groupBy: 'day' | 'week' | 'month' = 'day'): Promise<WordCountData[]> {
		const files = this.app.vault.getMarkdownFiles();
		const dataMap = new Map<string, WordCountData>();
		
		const start = moment(startDate);
		const end = moment(endDate);

		for (const file of files) {
			const fileDate = moment(file.stat.ctime);
			
			// Skip files outside the date range
			if (fileDate.isBefore(start) || fileDate.isAfter(end)) {
				continue;
			}

			let dateKey: string;

			switch (groupBy) {
				case 'day':
					dateKey = fileDate.format('YYYY-MM-DD');
					break;
				case 'week':
					const startOfWeek = fileDate.clone().startOf('isoWeek');
					const endOfWeek = fileDate.clone().endOf('isoWeek');
					dateKey = `${startOfWeek.format('YYYY-MM-DD')} to ${endOfWeek.format('MM-DD')}`;
					break;
				case 'month':
					dateKey = fileDate.format('YYYY-MM');
					break;
				default:
					dateKey = fileDate.format('YYYY-MM-DD');
			}

			if (!dataMap.has(dateKey)) {
				dataMap.set(dateKey, {
					date: dateKey,
					totalWords: 0,
					filesCreated: 0,
					avgWordsPerFile: 0,
					cumulativeWords: 0,
					cumulativeFiles: 0
				});
			}

			const data = dataMap.get(dateKey)!;
			const wordCount = await this.getWordCount(file);
			data.totalWords += wordCount;
			data.filesCreated += 1;
		}

		// Calculate averages and cumulative data
		const sortedData = Array.from(dataMap.values()).sort((a, b) => a.date.localeCompare(b.date));
		let cumulativeWords = 0;
		let cumulativeFiles = 0;
		
		sortedData.forEach(item => {
			item.avgWordsPerFile = item.filesCreated > 0 ? Math.round(item.totalWords / item.filesCreated) : 0;
			cumulativeWords += item.totalWords;
			cumulativeFiles += item.filesCreated;
			item.cumulativeWords = cumulativeWords;
			item.cumulativeFiles = cumulativeFiles;
		});

		return sortedData.reverse(); // Return in descending order for recent first
	}

	async getWordCountAnalytics(timeFrame: 'day' | 'week' | 'month' | 'year'): Promise<WordCountData[]> {
		const files = this.app.vault.getMarkdownFiles();
		const dataMap = new Map<string, WordCountData>();

		for (const file of files) {
			let dateKey: string;
			const fileDate = moment(file.stat.ctime);

			switch (timeFrame) {
				case 'day':
					dateKey = fileDate.format('YYYY-MM-DD');
					break;
				case 'week':
					// Get start of week (Monday) and format as "YYYY-MM-DD to YYYY-MM-DD"
					const startOfWeek = fileDate.clone().startOf('isoWeek');
					const endOfWeek = fileDate.clone().endOf('isoWeek');
					dateKey = `${startOfWeek.format('YYYY-MM-DD')} to ${endOfWeek.format('MM-DD')}`;
					break;
				case 'month':
					dateKey = fileDate.format('YYYY-MM');
					break;
				case 'year':
					dateKey = fileDate.format('YYYY');
					break;
				default:
					dateKey = fileDate.format('YYYY-MM-DD');
			}

			if (!dataMap.has(dateKey)) {
				dataMap.set(dateKey, {
					date: dateKey,
					totalWords: 0,
					filesCreated: 0,
					avgWordsPerFile: 0,
					cumulativeWords: 0,
					cumulativeFiles: 0
				});
			}

			const data = dataMap.get(dateKey)!;
			const wordCount = await this.getWordCount(file);
			data.totalWords += wordCount;
			data.filesCreated += 1;
		}

		// Calculate averages and cumulative data
		const sortedData = Array.from(dataMap.values()).sort((a, b) => a.date.localeCompare(b.date));
		let cumulativeWords = 0;
		let cumulativeFiles = 0;
		
		sortedData.forEach(item => {
			item.avgWordsPerFile = item.filesCreated > 0 ? Math.round(item.totalWords / item.filesCreated) : 0;
			cumulativeWords += item.totalWords;
			cumulativeFiles += item.filesCreated;
			item.cumulativeWords = cumulativeWords;
			item.cumulativeFiles = cumulativeFiles;
		});

		return sortedData.reverse(); // Return in descending order for recent first
	}

	async getAnalyticsSummary(): Promise<{
		totalFiles: number;
		totalWords: number;
		avgWordsPerFile: number;
		oldestFile: string;
		newestFile: string;
		mostProductiveDay: string;
		streak: number;
	}> {
		const files = this.app.vault.getMarkdownFiles();
		const totalFiles = files.length;
		const totalWords = await this.getTotalWordCount(files);
		const avgWordsPerFile = totalFiles > 0 ? Math.round(totalWords / totalFiles) : 0;

		// Find oldest and newest files
		let oldestFile = '';
		let newestFile = '';
		let oldestTime = Date.now();
		let newestTime = 0;

		// Get daily analytics for streak calculation
		const dailyData = await this.getWordCountAnalytics('day');
		
		files.forEach(file => {
			if (file.stat.ctime < oldestTime) {
				oldestTime = file.stat.ctime;
				oldestFile = file.path;
			}
			if (file.stat.ctime > newestTime) {
				newestTime = file.stat.ctime;
				newestFile = file.path;
			}
		});

		// Find most productive day
		let mostProductiveDay = '';
		let maxWords = 0;
		dailyData.forEach(day => {
			if (day.totalWords > maxWords) {
				maxWords = day.totalWords;
				mostProductiveDay = day.date;
			}
		});

		// Calculate current writing streak
		let streak = 0;
		const today = moment();
		for (let i = 0; i < dailyData.length; i++) {
			const dayData = dailyData[i];
			const dayMoment = moment(dayData.date);
			if (today.diff(dayMoment, 'days') === i && dayData.filesCreated > 0) {
				streak++;
			} else {
				break;
			}
		}

		return {
			totalFiles,
			totalWords,
			avgWordsPerFile,
			oldestFile,
			newestFile,
			mostProductiveDay,
			streak
		};
	}

	async exportAnalyticsData(timeFrame: 'day' | 'week' | 'month' | 'year', format: 'csv' | 'json' = 'csv') {
		try {
			const data = await this.getWordCountAnalytics(timeFrame);
			const summary = await this.getAnalyticsSummary();
			
			let content: string;
			let filename: string;
			
			if (format === 'csv') {
				// CSV format
				const headers = ['Date', 'Files Created', 'Total Words', 'Avg Words per File', 'Cumulative Words', 'Cumulative Files'];
				const csvRows = [headers.join(',')];
				
				data.forEach(item => {
					const row = [
						item.date,
						item.filesCreated.toString(),
						item.totalWords.toString(),
						item.avgWordsPerFile.toString(),
						item.cumulativeWords.toString(),
						item.cumulativeFiles.toString()
					];
					csvRows.push(row.join(','));
				});
				
				// Add summary at the end
				csvRows.push('');
				csvRows.push('Summary');
				csvRows.push(`Total Files,${summary.totalFiles}`);
				csvRows.push(`Total Words,${summary.totalWords}`);
				csvRows.push(`Average Words per File,${summary.avgWordsPerFile}`);
				csvRows.push(`Writing Streak,${summary.streak} days`);
				csvRows.push(`Most Productive Day,${summary.mostProductiveDay}`);
				
				content = csvRows.join('\n');
				filename = `obsidian-analytics-${timeFrame}-${moment().format('YYYY-MM-DD')}.csv`;
			} else {
				// JSON format
				const exportData = {
					exportDate: moment().format('YYYY-MM-DD HH:mm:ss'),
					timeFrame: timeFrame,
					summary: summary,
					data: data
				};
				content = JSON.stringify(exportData, null, 2);
				filename = `obsidian-analytics-${timeFrame}-${moment().format('YYYY-MM-DD')}.json`;
			}
			
			// Create and download file
			const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'application/json' });
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = filename;
			link.click();
			URL.revokeObjectURL(url);
			
			new Notice(`Analytics data exported as ${filename}`);
		} catch (error) {
			new Notice('Error exporting analytics data');
			console.error('Export error:', error);
		}
	}
}

class ChartVisualizationsModal extends Modal {
	plugin: NotesAnalyticsPlugin;

	constructor(app: App, plugin: NotesAnalyticsPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		
		// Set larger modal size
		this.modalEl.style.width = '98vw';
		this.modalEl.style.maxWidth = '1400px';
		this.modalEl.style.height = '95vh';
		this.modalEl.style.maxHeight = '900px';
		
		contentEl.createEl('h2', { text: 'Chart Visualizations' });

		// Create header with controls and export buttons
		const headerDiv = contentEl.createDiv('chart-header');
		
		// Chart controls on the left
		const selectorDiv = headerDiv.createDiv('chart-controls');
		
		const typeDiv = selectorDiv.createDiv('control-group');
		typeDiv.createEl('label', { text: 'Chart Type: ' });
		const typeSelect = typeDiv.createEl('select');
		typeSelect.createEl('option', { value: 'line', text: 'Line Chart' });
		typeSelect.createEl('option', { value: 'bar', text: 'Bar Chart' });
		typeSelect.createEl('option', { value: 'area', text: 'Area Chart' });
		typeSelect.createEl('option', { value: 'pie', text: 'Pie Chart' });
		typeSelect.value = this.plugin.settings.defaultChartType;

		const timeDiv = selectorDiv.createDiv('control-group');
		timeDiv.createEl('label', { text: 'Time Frame: ' });
		const timeSelect = timeDiv.createEl('select');
		timeSelect.createEl('option', { value: 'day', text: 'Daily' });
		timeSelect.createEl('option', { value: 'week', text: 'Weekly' });
		timeSelect.createEl('option', { value: 'month', text: 'Monthly' });
		timeSelect.createEl('option', { value: 'year', text: 'Yearly' });

		const metricDiv = selectorDiv.createDiv('control-group');
		metricDiv.createEl('label', { text: 'Metric: ' });
		const metricSelect = metricDiv.createEl('select');
		metricSelect.createEl('option', { value: 'totalWords', text: 'Total Words' });
		metricSelect.createEl('option', { value: 'filesCreated', text: 'Files Created' });
		metricSelect.createEl('option', { value: 'avgWordsPerFile', text: 'Avg Words/File' });
		if (this.plugin.settings.showAdvancedStats) {
			metricSelect.createEl('option', { value: 'cumulativeWords', text: 'Cumulative Words' });
			metricSelect.createEl('option', { value: 'cumulativeFiles', text: 'Cumulative File Count' });
			metricSelect.createEl('option', { value: 'fileSizeDistribution', text: 'File Size Distribution' });
			metricSelect.createEl('option', { value: 'largestFiles', text: 'Largest Files' });
			metricSelect.createEl('option', { value: 'fileSizeGrowth', text: 'File Size Growth Trends' });
			metricSelect.createEl('option', { value: 'tagAnalytics', text: 'Tag Usage Analytics' });
			metricSelect.createEl('option', { value: 'folderAnalytics', text: 'Folder Analytics' });
			metricSelect.createEl('option', { value: 'writingGoals', text: 'Writing Goals Progress' });
		}

		// Export controls in top right
		const exportDiv = headerDiv.createDiv('export-controls-header');
		let exportPngBtn: HTMLButtonElement;
		let exportSvgBtn: HTMLButtonElement;
		let copyBtn: HTMLButtonElement;
		let exportCsvBtn: HTMLButtonElement;
		let exportJsonBtn: HTMLButtonElement;
		
		if (this.plugin.settings.enableChartExport) {
			exportPngBtn = exportDiv.createEl('button', { 
				text: '📊 PNG', 
				cls: 'export-button-header' 
			});
			
			exportSvgBtn = exportDiv.createEl('button', { 
				text: '🎨 SVG', 
				cls: 'export-button-header' 
			});
			
			copyBtn = exportDiv.createEl('button', { 
				text: '📋 Copy', 
				cls: 'export-button-header' 
			});

			exportCsvBtn = exportDiv.createEl('button', { 
				text: '📄 CSV', 
				cls: 'export-button-header' 
			});

			exportJsonBtn = exportDiv.createEl('button', { 
				text: '📋 JSON', 
				cls: 'export-button-header' 
			});

			// We'll set up click handlers after chart is created
			exportDiv.style.display = 'none'; // Hide until chart is loaded
		}

		// Chart container
		const chartContainer = contentEl.createDiv('chart-container');

		const updateChart = async () => {
			const timeFrame = timeSelect.value as 'day' | 'week' | 'month' | 'year';
			const chartType = typeSelect.value as 'line' | 'bar' | 'area' | 'pie';
			const metric = metricSelect.value as keyof WordCountData | 'fileSizeDistribution' | 'largestFiles' | 'fileSizeGrowth' | 'tagAnalytics' | 'folderAnalytics' | 'writingGoals';

			// Show loading message
			chartContainer.empty();
			const loadingMsg = chartContainer.createEl('p', { text: 'Loading chart...' });

			try {
				let chartData: { label: string; value: number }[] = [];

				// Handle different metric types
				if (metric === 'fileSizeDistribution') {
					const fileSizeData = await this.plugin.getFileSizeDistribution();
					chartData = fileSizeData;
				} else if (metric === 'largestFiles') {
					const largestFilesData = await this.plugin.getLargestFiles(10);
					chartData = largestFilesData;
				} else if (metric === 'fileSizeGrowth') {
					const fileSizeGrowthData = await this.plugin.getFileSizeGrowthTrends();
					chartData = fileSizeGrowthData;
				} else if (metric === 'tagAnalytics') {
					const tagData = await this.plugin.getTagAnalytics();
					chartData = tagData;
				} else if (metric === 'folderAnalytics') {
					const folderData = await this.plugin.getFolderAnalytics();
					chartData = folderData;
				} else if (metric === 'writingGoals') {
					const goalsData = await this.plugin.getWritingGoalsProgress();
					chartData = goalsData;
				} else {
					// Standard word count analytics
					const data = await this.plugin.getWordCountAnalytics(timeFrame);
					if (data.length === 0) {
						chartContainer.removeChild(loadingMsg);
						chartContainer.createEl('p', { text: 'No data available for chart' });
						return;
					}
					chartData = data.reverse().map(item => ({
						label: item.date,
						value: item[metric as keyof WordCountData] as number
					}));
				}

				chartContainer.removeChild(loadingMsg);
				
				if (chartData.length === 0) {
					chartContainer.createEl('p', { text: 'No data available for chart' });
					return;
				}

				// Create canvas for chart with larger size
				const newCanvas = chartContainer.createEl('canvas', { 
					attr: { 
						id: 'analytics-chart',
						width: '1000',
						height: '500'
					} 
				});

				// Create chart renderer with larger size
				const renderer = new ChartRenderer(newCanvas, 1000, 500);
				
				// Generate title and color based on metric
				let title = '';
				let color = '#4a90e2';
				
				switch (metric) {
					case 'totalWords':
						title = 'Total Words';
						color = '#4a90e2';
						break;
					case 'filesCreated':
						title = 'Files Created';
						color = '#7ed321';
						break;
					case 'avgWordsPerFile':
						title = 'Average Words per File';
						color = '#f5a623';
						break;
					case 'cumulativeWords':
						title = 'Cumulative Words';
						color = '#9013fe';
						break;
					case 'cumulativeFiles':
						title = 'Cumulative File Count';
						color = '#ff6b6b';
						break;
					case 'fileSizeDistribution':
						title = 'File Size Distribution';
						color = '#17a2b8';
						break;
					case 'largestFiles':
						title = 'Largest Files by Size';
						color = '#e83e8c';
						break;
					case 'fileSizeGrowth':
						title = 'File Size Growth Trends';
						color = '#28a745';
						break;
					case 'tagAnalytics':
						title = 'Tag Usage Analytics';
						color = '#6f42c1';
						break;
					case 'folderAnalytics':
						title = 'Folder Distribution';
						color = '#fd7e14';
						break;
					case 'writingGoals':
						title = 'Writing Goals Progress (%)';
						color = '#20c997';
						break;
				}

				// Render chart based on type
				switch (chartType) {
					case 'line':
						renderer.renderLineChart(chartData, title, color);
						break;
					case 'bar':
						renderer.renderBarChart(chartData, title, color);
						break;
					case 'area':
						renderer.renderAreaChart(chartData, title, color);
						break;
					case 'pie':
						renderer.renderPieChart(chartData, title);
						break;
				}

				// Configure export buttons in header
				if (this.plugin.settings.enableChartExport && exportPngBtn) {
					exportDiv.style.display = 'flex';
					
					exportPngBtn.onclick = () => renderer.exportToPNG(`${metric}-${timeFrame}-chart.png`);
					exportSvgBtn.onclick = () => renderer.exportToSVG(`${metric}-${timeFrame}-chart.svg`);
					copyBtn.onclick = () => renderer.copyToClipboard();
					exportCsvBtn.onclick = () => {
						this.plugin.exportAnalyticsData(timeFrame, 'csv');
					};
					exportJsonBtn.onclick = () => {
						this.plugin.exportAnalyticsData(timeFrame, 'json');
					};
				}

			} catch (error) {
				chartContainer.removeChild(loadingMsg);
				chartContainer.createEl('p', { text: 'Error loading chart data' });
				console.error('Chart loading error:', error);
			}
		};

		// Event listeners
		typeSelect.onchange = updateChart;
		timeSelect.onchange = updateChart;
		metricSelect.onchange = updateChart;

		// Initial chart load
		updateChart();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class NotesAnalyticsSettingTab extends PluginSettingTab {
	plugin: NotesAnalyticsPlugin;

	constructor(app: App, plugin: NotesAnalyticsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Notes Analytics Settings' });

		new Setting(containerEl)
			.setName('Enable Real-time Updates')
			.setDesc('Update status bar and analytics in real-time')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableRealTimeUpdates)
				.onChange(async (value) => {
					this.plugin.settings.enableRealTimeUpdates = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Show Advanced Statistics')
			.setDesc('Display cumulative word counts and additional analytics')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showAdvancedStats)
				.onChange(async (value) => {
					this.plugin.settings.showAdvancedStats = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Default Chart Type')
			.setDesc('Default chart type for visualizations')
			.addDropdown(dropdown => dropdown
				.addOption('line', 'Line Chart')
				.addOption('bar', 'Bar Chart')
				.addOption('area', 'Area Chart')
				.addOption('pie', 'Pie Chart')
				.setValue(this.plugin.settings.defaultChartType)
				.onChange(async (value: 'line' | 'bar' | 'area' | 'pie') => {
					this.plugin.settings.defaultChartType = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Enable Chart Export')
			.setDesc('Show export buttons to save charts as PNG/SVG images, copy to clipboard, and export data')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableChartExport)
				.onChange(async (value) => {
					this.plugin.settings.enableChartExport = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Enable Custom Date Range')
			.setDesc('Allow custom date range selection for analytics')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableCustomDateRange)
				.onChange(async (value) => {
					this.plugin.settings.enableCustomDateRange = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Date Format')
			.setDesc('Format for displaying dates (using moment.js format)')
			.addText(text => text
				.setPlaceholder('YYYY-MM-DD')
				.setValue(this.plugin.settings.dateFormat)
				.onChange(async (value) => {
					this.plugin.settings.dateFormat = value;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h3', { text: 'Writing Goals' });

		new Setting(containerEl)
			.setName('Daily Word Goal')
			.setDesc('Target number of words to write each day')
			.addText(text => text
				.setPlaceholder('500')
				.setValue(this.plugin.settings.dailyWordGoal.toString())
				.onChange(async (value) => {
					const goal = parseInt(value) || 500;
					this.plugin.settings.dailyWordGoal = goal;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Weekly File Goal')
			.setDesc('Target number of files to create each week')
			.addText(text => text
				.setPlaceholder('7')
				.setValue(this.plugin.settings.weeklyFileGoal.toString())
				.onChange(async (value) => {
					const goal = parseInt(value) || 7;
					this.plugin.settings.weeklyFileGoal = goal;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Monthly Word Goal')
			.setDesc('Target number of words to write each month')
			.addText(text => text
				.setPlaceholder('15000')
				.setValue(this.plugin.settings.monthlyWordGoal.toString())
				.onChange(async (value) => {
					const goal = parseInt(value) || 15000;
					this.plugin.settings.monthlyWordGoal = goal;
					await this.plugin.saveSettings();
				}));
	}
}
