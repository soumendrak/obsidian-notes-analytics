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
	private animationFrame: number | null = null;
	private animationStartTime: number = 0;
	private animationDuration: number = 1000; // 1 second
	private isAnimating: boolean = false;

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

	private easeInOutCubic(t: number): number {
		return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
	}

	private animateChart(renderFunction: (progress: number) => void) {
		if (this.animationFrame) {
			cancelAnimationFrame(this.animationFrame);
		}

		this.isAnimating = true;
		this.animationStartTime = performance.now();

		const animate = (currentTime: number) => {
			const elapsed = currentTime - this.animationStartTime;
			const rawProgress = Math.min(elapsed / this.animationDuration, 1);
			const easedProgress = this.easeInOutCubic(rawProgress);

			renderFunction(easedProgress);

			if (rawProgress < 1) {
				this.animationFrame = requestAnimationFrame(animate);
			} else {
				this.isAnimating = false;
				this.animationFrame = null;
			}
		};

		this.animationFrame = requestAnimationFrame(animate);
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

			// X-axis label (check for valid label)
			if (label && label !== 'undefined') {
				ctx.fillStyle = 'var(--text-muted)';
				ctx.font = '12px var(--font-interface)';
				ctx.textAlign = 'center';
				ctx.save();
				ctx.translate(x, chartArea.y + chartArea.height + 20);
				ctx.rotate(-Math.PI / 4);
				ctx.fillText(label, 0, 0);
				ctx.restore();
			}
		});
	}

	renderLineChart(data: { label: string; value: number }[], title: string, color: string = '#007acc') {
		const { ctx } = this;
		const chartArea = this.getChartArea();

		if (data.length === 0) {
			ctx.clearRect(0, 0, this.width, this.height);
			ctx.fillStyle = 'var(--text-muted)';
			ctx.font = '16px var(--font-interface)';
			ctx.textAlign = 'center';
			ctx.fillText('No data available', this.width / 2, this.height / 2);
			return;
		}

		const maxValue = Math.max(...data.map(d => d.value));
		const labels = data.map(d => d.label);

		this.animateChart((progress: number) => {
			// Clear canvas
			ctx.clearRect(0, 0, this.width, this.height);

			// Draw grid and axes
			this.drawGrid(chartArea, labels, maxValue);

			// Draw title
			ctx.fillStyle = 'var(--text-accent)';
			ctx.font = 'bold 16px var(--font-interface)';
			ctx.textAlign = 'center';
			ctx.fillText(title, this.width / 2, 25);

			// Draw animated line
			ctx.strokeStyle = color;
			ctx.lineWidth = 3;
			ctx.beginPath();

			const stepX = chartArea.width / Math.max(1, data.length - 1);
			const visiblePoints = Math.floor(data.length * progress);
			
			data.slice(0, visiblePoints + 1).forEach((point, i) => {
				const x = chartArea.x + (i * stepX);
				let y = chartArea.y + chartArea.height - (point.value / maxValue * chartArea.height);
				
				// Apply easing to the last point being drawn
				if (i === visiblePoints && progress < 1) {
					const nextPoint = data[i + 1];
					if (nextPoint) {
						const nextY = chartArea.y + chartArea.height - (nextPoint.value / maxValue * chartArea.height);
						const pointProgress = (data.length * progress) - i;
						y = y + (nextY - y) * pointProgress;
					}
				}

				if (i === 0) {
					ctx.moveTo(x, y);
				} else {
					ctx.lineTo(x, y);
				}
			});
			ctx.stroke();

			// Draw animated points
			ctx.fillStyle = color;
			data.slice(0, visiblePoints + 1).forEach((point, i) => {
				const x = chartArea.x + (i * stepX);
				let y = chartArea.y + chartArea.height - (point.value / maxValue * chartArea.height);
				
				// Apply easing to the last point being drawn
				if (i === visiblePoints && progress < 1) {
					const nextPoint = data[i + 1];
					if (nextPoint) {
						const nextY = chartArea.y + chartArea.height - (nextPoint.value / maxValue * chartArea.height);
						const pointProgress = (data.length * progress) - i;
						y = y + (nextY - y) * pointProgress;
					}
				}

				ctx.beginPath();
				ctx.arc(x, y, 4, 0, Math.PI * 2);
				ctx.fill();
			});
		});
	}

	renderBarChart(data: { label: string; value: number }[], title: string, color: string = '#007acc') {
		const { ctx } = this;
		const chartArea = this.getChartArea();

		if (data.length === 0) {
			ctx.clearRect(0, 0, this.width, this.height);
			ctx.fillStyle = 'var(--text-muted)';
			ctx.font = '16px var(--font-interface)';
			ctx.textAlign = 'center';
			ctx.fillText('No data available', this.width / 2, this.height / 2);
			return;
		}

		const maxValue = Math.max(...data.map(d => d.value));
		const labels = data.map(d => d.label);

		this.animateChart((progress: number) => {
			// Clear canvas
			ctx.clearRect(0, 0, this.width, this.height);

			// Draw grid and axes
			this.drawGrid(chartArea, labels, maxValue);

			// Draw title
			ctx.fillStyle = 'var(--text-accent)';
			ctx.font = 'bold 16px var(--font-interface)';
			ctx.textAlign = 'center';
			ctx.fillText(title, this.width / 2, 25);

			// Draw animated bars
			const barWidth = chartArea.width / data.length * 0.8;
			const barSpacing = chartArea.width / data.length * 0.2;

			data.forEach((point, i) => {
				const fullBarHeight = (point.value / maxValue) * chartArea.height;
				const barHeight = fullBarHeight * progress;
				const x = chartArea.x + (i * (barWidth + barSpacing)) + barSpacing / 2;
				const y = chartArea.y + chartArea.height - barHeight;

				// Bar
				ctx.fillStyle = color;
				ctx.fillRect(x, y, barWidth, barHeight);

				// Bar border
				ctx.strokeStyle = color;
				ctx.lineWidth = 1;
				ctx.strokeRect(x, y, barWidth, barHeight);

				// Value labels on bars (only show when animation is complete)
				if (progress > 0.8 && barHeight > 20) {
					ctx.fillStyle = 'white';
					ctx.font = '12px var(--font-interface)';
					ctx.textAlign = 'center';
					ctx.fillText(point.value.toString(), x + barWidth / 2, y + 15);
				}
			});
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

	renderHeatmapCalendar(data: { label: string; value: number }[], title: string, color: string = '#28a745') {
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

		// Process calendar data - extract dates and values
		const calendarData = new Map<string, number>();
		data.forEach(item => {
			// Extract date from label (format: "YYYY-MM-DD (X files, Y words)")
			const dateMatch = item.label.match(/^(\d{4}-\d{2}-\d{2})/);
			if (dateMatch) {
				calendarData.set(dateMatch[1], item.value);
			}
		});

		// Calendar grid settings
		const cellSize = Math.min(12, (chartArea.width - 100) / 53); // ~53 weeks in a year
		const cellSpacing = 2;
		const monthLabelHeight = 20;
		const dayLabelWidth = 20;

		// Month labels
		const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
		ctx.fillStyle = 'var(--text-muted)';
		ctx.font = '12px var(--font-interface)';
		ctx.textAlign = 'left';

		// Day labels (Mon, Wed, Fri)
		const dayLabels = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];
		dayLabels.forEach((label, i) => {
			if (label) {
				ctx.fillText(label, chartArea.x, chartArea.y + monthLabelHeight + (i * (cellSize + cellSpacing)) + cellSize);
			}
		});

		// Get max intensity for color scaling
		const maxIntensity = Math.max(...data.map(d => d.value));

		// Start from beginning of year
		const year = moment().year();
		const startDate = moment(`${year}-01-01`);
		
		// Draw month labels and grid
		for (let month = 0; month < 12; month++) {
			const monthStart = moment(`${year}-${String(month + 1).padStart(2, '0')}-01`);
			const weekOfYear = monthStart.week() - startDate.week();
			
			// Month label
			if (weekOfYear >= 0 && weekOfYear * (cellSize + cellSpacing) + dayLabelWidth < chartArea.width) {
				ctx.fillText(
					months[month], 
					chartArea.x + dayLabelWidth + (weekOfYear * (cellSize + cellSpacing)), 
					chartArea.y + 15
				);
			}
		}

		// Draw calendar cells
		for (let week = 0; week < 53; week++) {
			for (let day = 0; day < 7; day++) {
				const currentDate = startDate.clone().add(week * 7 + day, 'days');
				if (currentDate.year() !== year) continue;

				const dateKey = currentDate.format('YYYY-MM-DD');
				const intensity = calendarData.get(dateKey) || 0;
				
				// Calculate position
				const x = chartArea.x + dayLabelWidth + (week * (cellSize + cellSpacing));
				const y = chartArea.y + monthLabelHeight + (day * (cellSize + cellSpacing));
				
				// Skip if outside bounds
				if (x + cellSize > chartArea.x + chartArea.width) break;

				// Calculate color intensity based on activity
				let fillColor = 'var(--background-modifier-border)';
				if (intensity > 0) {
					const alpha = Math.max(0.1, Math.min(1, intensity / 100));
					fillColor = color + Math.round(alpha * 255).toString(16).padStart(2, '0');
				}

				// Draw cell
				ctx.fillStyle = fillColor;
				ctx.fillRect(x, y, cellSize, cellSize);
				
				// Cell border
				ctx.strokeStyle = 'var(--background-primary)';
				ctx.lineWidth = 1;
				ctx.strokeRect(x, y, cellSize, cellSize);
			}
		}

		// Draw legend
		const legendY = chartArea.y + chartArea.height - 30;
		ctx.fillStyle = 'var(--text-muted)';
		ctx.font = '11px var(--font-interface)';
		ctx.textAlign = 'center';
		ctx.fillText('Less', chartArea.x + dayLabelWidth, legendY + 15);
		
		// Legend gradient squares
		for (let i = 0; i < 5; i++) {
			const alpha = (i + 1) / 5;
			const legendColor = color + Math.round(alpha * 255).toString(16).padStart(2, '0');
			ctx.fillStyle = legendColor;
			ctx.fillRect(chartArea.x + dayLabelWidth + 30 + (i * 12), legendY, 10, 10);
			ctx.strokeStyle = 'var(--background-primary)';
			ctx.strokeRect(chartArea.x + dayLabelWidth + 30 + (i * 12), legendY, 10, 10);
		}
		
		ctx.fillStyle = 'var(--text-muted)';
		ctx.fillText('More', chartArea.x + dayLabelWidth + 30 + (5 * 12) + 15, legendY + 15);
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

		// Add ribbon icon for dashboard
		const dashboardRibbonIconEl = this.addRibbonIcon('layout-dashboard', 'Analytics Dashboard', (evt: MouseEvent) => {
			new AnalyticsDashboardModal(this.app, this).open();
		});
		dashboardRibbonIconEl.addClass('notes-analytics-ribbon-class');

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

		this.addCommand({
			id: 'show-analytics-dashboard',
			name: 'Show Analytics Dashboard',
			callback: () => {
				new AnalyticsDashboardModal(this.app, this).open();
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

	// Comparison Views Methods
	async getComparisonData(period: 'month' | 'week' | 'year'): Promise<{ label: string; current: number; previous: number; change: number; changePercent: number }[]> {
		const files = this.app.vault.getMarkdownFiles();
		let currentPeriodData: { totalWords: number; filesCreated: number; avgWordsPerFile: number } = {
			totalWords: 0,
			filesCreated: 0,
			avgWordsPerFile: 0
		};
		let previousPeriodData: { totalWords: number; filesCreated: number; avgWordsPerFile: number } = {
			totalWords: 0,
			filesCreated: 0,
			avgWordsPerFile: 0
		};

		let currentStart: moment.Moment, currentEnd: moment.Moment;
		let previousStart: moment.Moment, previousEnd: moment.Moment;

		switch (period) {
			case 'month':
				currentStart = moment().startOf('month');
				currentEnd = moment().endOf('month');
				previousStart = moment().subtract(1, 'month').startOf('month');
				previousEnd = moment().subtract(1, 'month').endOf('month');
				break;
			case 'week':
				currentStart = moment().startOf('week');
				currentEnd = moment().endOf('week');
				previousStart = moment().subtract(1, 'week').startOf('week');
				previousEnd = moment().subtract(1, 'week').endOf('week');
				break;
			case 'year':
				currentStart = moment().startOf('year');
				currentEnd = moment().endOf('year');
				previousStart = moment().subtract(1, 'year').startOf('year');
				previousEnd = moment().subtract(1, 'year').endOf('year');
				break;
		}

		// Process files for current period
		for (const file of files) {
			const fileDate = moment(file.stat.ctime);
			const wordCount = await this.getWordCount(file);

			if (fileDate.isBetween(currentStart, currentEnd, 'day', '[]')) {
				currentPeriodData.totalWords += wordCount;
				currentPeriodData.filesCreated++;
			}

			if (fileDate.isBetween(previousStart, previousEnd, 'day', '[]')) {
				previousPeriodData.totalWords += wordCount;
				previousPeriodData.filesCreated++;
			}
		}

		// Calculate averages
		currentPeriodData.avgWordsPerFile = currentPeriodData.filesCreated > 0 
			? Math.round(currentPeriodData.totalWords / currentPeriodData.filesCreated) 
			: 0;
		previousPeriodData.avgWordsPerFile = previousPeriodData.filesCreated > 0 
			? Math.round(previousPeriodData.totalWords / previousPeriodData.filesCreated) 
			: 0;

		// Calculate changes and percentages
		const wordChange = currentPeriodData.totalWords - previousPeriodData.totalWords;
		const wordChangePercent = previousPeriodData.totalWords > 0 
			? Math.round((wordChange / previousPeriodData.totalWords) * 100) 
			: 0;

		const fileChange = currentPeriodData.filesCreated - previousPeriodData.filesCreated;
		const fileChangePercent = previousPeriodData.filesCreated > 0 
			? Math.round((fileChange / previousPeriodData.filesCreated) * 100) 
			: 0;

		const avgWordChange = currentPeriodData.avgWordsPerFile - previousPeriodData.avgWordsPerFile;
		const avgWordChangePercent = previousPeriodData.avgWordsPerFile > 0 
			? Math.round((avgWordChange / previousPeriodData.avgWordsPerFile) * 100) 
			: 0;

		return [
			{
				label: 'Total Words',
				current: currentPeriodData.totalWords,
				previous: previousPeriodData.totalWords,
				change: wordChange,
				changePercent: wordChangePercent
			},
			{
				label: 'Files Created',
				current: currentPeriodData.filesCreated,
				previous: previousPeriodData.filesCreated,
				change: fileChange,
				changePercent: fileChangePercent
			},
			{
				label: 'Avg Words/File',
				current: currentPeriodData.avgWordsPerFile,
				previous: previousPeriodData.avgWordsPerFile,
				change: avgWordChange,
				changePercent: avgWordChangePercent
			}
		];
	}

	// Heatmap Calendar Data
	async getHeatmapCalendarData(year: number = moment().year()): Promise<{ label: string; value: number }[]> {
		const files = this.app.vault.getMarkdownFiles();
		const dailyActivity = new Map<string, { wordCount: number; fileCount: number }>();

		// Initialize all days of the year
		const startDate = moment(`${year}-01-01`);
		const endDate = moment(`${year}-12-31`);
		
		for (let date = startDate.clone(); date.isSameOrBefore(endDate); date.add(1, 'day')) {
			const dateKey = date.format('YYYY-MM-DD');
			dailyActivity.set(dateKey, { wordCount: 0, fileCount: 0 });
		}

		// Process files for the year
		for (const file of files) {
			const fileDate = moment(file.stat.ctime);
			const modifiedDate = moment(file.stat.mtime);
			
			// Count file creation
			if (fileDate.year() === year) {
				const dateKey = fileDate.format('YYYY-MM-DD');
				const existing = dailyActivity.get(dateKey) || { wordCount: 0, fileCount: 0 };
				existing.fileCount++;
				
				try {
					const wordCount = await this.getWordCount(file);
					existing.wordCount += wordCount;
				} catch (error) {
					// Skip files that can't be read
				}
				
				dailyActivity.set(dateKey, existing);
			}
			
			// Count file modifications (different from creation date)
			if (modifiedDate.year() === year && !modifiedDate.isSame(fileDate, 'day')) {
				const dateKey = modifiedDate.format('YYYY-MM-DD');
				const existing = dailyActivity.get(dateKey) || { wordCount: 0, fileCount: 0 };
				
				try {
					const wordCount = await this.getWordCount(file);
					existing.wordCount += Math.round(wordCount * 0.3); // Weight modifications less than creation
				} catch (error) {
					// Skip files that can't be read
				}
				
				dailyActivity.set(dateKey, existing);
			}
		}

		// Calculate activity intensity and return as chart data
		const maxActivity = Math.max(...Array.from(dailyActivity.values()).map(data => data.wordCount + (data.fileCount * 50)));
		
		return Array.from(dailyActivity.entries()).map(([date, data]) => {
			const activity = data.wordCount + (data.fileCount * 50); // Weight files as 50 words each
			const intensity = maxActivity > 0 ? Math.round((activity / maxActivity) * 100) : 0;
			
			return {
				label: `${date} (${data.fileCount} files, ${data.wordCount} words)`,
				value: intensity
			};
		}).sort((a, b) => a.label.localeCompare(b.label));
	}

	// Writing Streak Data
	async getWritingStreakData(): Promise<{ currentStreak: number; longestStreak: number; thisMonthDays: number }> {
		const files = this.app.vault.getMarkdownFiles();
		const writingDays = new Set<string>();
		const thisMonth = moment().format('YYYY-MM');

		// Collect all days with writing activity (creation or modification)
		for (const file of files) {
			const modifiedDate = moment(file.stat.mtime).format('YYYY-MM-DD');
			const createdDate = moment(file.stat.ctime).format('YYYY-MM-DD');
			
			writingDays.add(modifiedDate);
			writingDays.add(createdDate);
		}

		const sortedDays = Array.from(writingDays).sort();
		
		// Calculate current streak
		let currentStreak = 0;
		let longestStreak = 0;
		let tempStreak = 0;
		const today = moment().format('YYYY-MM-DD');
		const yesterday = moment().subtract(1, 'day').format('YYYY-MM-DD');

		// Check if we have activity today or yesterday (streak continues)
		const hasRecentActivity = writingDays.has(today) || writingDays.has(yesterday);
		
		if (hasRecentActivity) {
			// Count backwards from today/yesterday
			let checkDate = writingDays.has(today) ? moment() : moment().subtract(1, 'day');
			
			while (writingDays.has(checkDate.format('YYYY-MM-DD'))) {
				currentStreak++;
				checkDate.subtract(1, 'day');
			}
		}

		// Calculate longest streak
		for (let i = 0; i < sortedDays.length; i++) {
			const currentDay = sortedDays[i];
			const previousDay = i > 0 ? sortedDays[i - 1] : null;
			
			if (previousDay && moment(currentDay).diff(moment(previousDay), 'days') === 1) {
				tempStreak++;
			} else {
				tempStreak = 1;
			}
			
			longestStreak = Math.max(longestStreak, tempStreak);
		}

		// Calculate this month activity days
		const thisMonthDays = Array.from(writingDays).filter(day => day.startsWith(thisMonth)).length;

		return {
			currentStreak,
			longestStreak,
			thisMonthDays
		};
	}
}

// Comprehensive Analytics Dashboard Modal
class AnalyticsDashboardModal extends Modal {
	plugin: NotesAnalyticsPlugin;
	private currentTimeFrame: string = 'month';
	private currentDateRange: { start: string; end: string } | null = null;
	private dashboardContainer: HTMLElement;
	private filtersContainer: HTMLElement;
	private metricsGrid: HTMLElement;
	private zoomedChart: HTMLElement | null = null;
	private chartRenderers: Map<string, ChartRenderer> = new Map();

	constructor(app: App, plugin: NotesAnalyticsPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		
		// Apply the dashboard modal class to the modal container itself
		this.modalEl.addClass('analytics-dashboard-modal');
		
		// Set the modal to full width and height
		this.modalEl.style.width = '100vw';
		this.modalEl.style.height = '100vh';
		this.modalEl.style.maxWidth = 'none';
		this.modalEl.style.maxHeight = 'none';
		this.modalEl.style.left = '0';
		this.modalEl.style.top = '0';
		this.modalEl.style.transform = 'none';
		this.modalEl.style.margin = '0';
		
		// Dashboard header
		const headerDiv = contentEl.createDiv('dashboard-header');
		headerDiv.createEl('h2', { text: 'Analytics Dashboard', cls: 'dashboard-title' });
		headerDiv.createEl('p', { text: 'Comprehensive view of your writing analytics', cls: 'dashboard-subtitle' });

		// Filters section
		this.createFiltersSection(contentEl);

		// Main dashboard container
		this.dashboardContainer = contentEl.createDiv('dashboard-container');
		this.createMetricsGrid();

		// Load initial data
		this.refreshDashboard();
	}

	private createFiltersSection(container: HTMLElement) {
		this.filtersContainer = container.createDiv('filters-section');
		
		const filtersRow = this.filtersContainer.createDiv('filters-row');

		// Time frame filter
		const timeFrameDiv = filtersRow.createDiv('filter-group');
		timeFrameDiv.createEl('label', { text: 'Time Frame:' });
		const timeFrameSelect = timeFrameDiv.createEl('select', { cls: 'filter-select' });
		
		const timeFrames = [
			{ value: 'day', text: 'Today' },
			{ value: 'week', text: 'This Week' },
			{ value: 'month', text: 'This Month' },
			{ value: 'quarter', text: 'This Quarter' },
			{ value: 'year', text: 'This Year' },
			{ value: 'all', text: 'All Time' },
			{ value: 'custom', text: 'Custom Range' }
		];

		timeFrames.forEach(frame => {
			const option = timeFrameSelect.createEl('option', { value: frame.value, text: frame.text });
			if (frame.value === this.currentTimeFrame) option.selected = true;
		});

		timeFrameSelect.onchange = () => {
			this.currentTimeFrame = timeFrameSelect.value;
			if (this.currentTimeFrame === 'custom') {
				this.showCustomDatePicker();
			} else {
				this.currentDateRange = null;
				this.refreshDashboard();
			}
		};

		// Custom date range inputs (initially hidden)
		const customDateDiv = filtersRow.createDiv('filter-group custom-date-range');
		customDateDiv.style.display = 'none';
		
		customDateDiv.createEl('label', { text: 'From:' });
		const startDateInput = customDateDiv.createEl('input', { type: 'date', cls: 'date-input' });
		
		customDateDiv.createEl('label', { text: 'To:' });
		const endDateInput = customDateDiv.createEl('input', { type: 'date', cls: 'date-input' });

		const applyDateBtn = customDateDiv.createEl('button', { text: 'Apply', cls: 'mod-cta' });
		applyDateBtn.onclick = () => {
			if (startDateInput.value && endDateInput.value) {
				this.currentDateRange = {
					start: startDateInput.value,
					end: endDateInput.value
				};
				this.refreshDashboard();
			}
		};

		// Refresh button
		const refreshBtn = filtersRow.createDiv('filter-group').createEl('button', { 
			text: '↻ Refresh', 
			cls: 'mod-cta refresh-btn' 
		});
		refreshBtn.onclick = () => this.refreshDashboard();
	}

	private showCustomDatePicker() {
		const customDateDiv = this.filtersContainer.querySelector('.custom-date-range') as HTMLElement;
		customDateDiv.style.display = this.currentTimeFrame === 'custom' ? 'flex' : 'none';
	}

	private createMetricsGrid() {
		this.metricsGrid = this.dashboardContainer.createDiv('metrics-grid');

		// Define all metrics with their configurations
		const metrics = [
			{
				id: 'words',
				title: 'Word Count Trends',
				description: 'Track your daily writing progress',
				color: '#007acc',
				chartTypes: ['line', 'bar', 'area']
			},
			{
				id: 'files',
				title: 'Files Created',
				description: 'Monitor file creation patterns',
				color: '#28a745',
				chartTypes: ['line', 'bar', 'area']
			},
			{
				id: 'avgWords',
				title: 'Average Words per File',
				description: 'Track writing depth and quality',
				color: '#ffc107',
				chartTypes: ['line', 'bar', 'area']
			},
			{
				id: 'cumulative',
				title: 'Cumulative Progress',
				description: 'See your total writing growth',
				color: '#6f42c1',
				chartTypes: ['line', 'area']
			},
			{
				id: 'streaks',
				title: 'Writing Streaks',
				description: 'Track consistency and habits',
				color: '#fd7e14',
				chartTypes: ['line', 'bar']
			},
			{
				id: 'goals',
				title: 'Goal Progress',
				description: 'Monitor writing goals achievement',
				color: '#dc3545',
				chartTypes: ['pie', 'bar']
			},
			{
				id: 'heatmap',
				title: 'Activity Heatmap',
				description: 'Visualize writing activity patterns',
				color: '#28a745',
				chartTypes: ['heatmap']
			},
			{
				id: 'comparison',
				title: 'Period Comparison',
				description: 'Compare current vs previous periods',
				color: '#17a2b8',
				chartTypes: ['bar', 'line']
			}
		];

		metrics.forEach(metric => {
			const metricCard = this.createMetricCard(metric);
			this.metricsGrid.appendChild(metricCard);
		});
	}

	private createMetricCard(metric: any): HTMLElement {
		const card = createDiv('metric-card');
		card.setAttribute('data-metric', metric.id);

		// Card header
		const header = card.createDiv('metric-header');
		const titleDiv = header.createDiv('metric-title-area');
		titleDiv.createEl('h3', { text: metric.title, cls: 'metric-title' });
		titleDiv.createEl('p', { text: metric.description, cls: 'metric-description' });

		// Chart type selector
		const chartTypeDiv = header.createDiv('chart-type-selector');
		metric.chartTypes.forEach((type: string, index: number) => {
			const btn = chartTypeDiv.createEl('button', { 
				text: type.charAt(0).toUpperCase() + type.slice(1),
				cls: index === 0 ? 'chart-type-btn active' : 'chart-type-btn'
			});
			btn.onclick = () => {
				chartTypeDiv.querySelectorAll('.chart-type-btn').forEach(b => b.removeClass('active'));
				btn.addClass('active');
				this.renderMetricChart(metric.id, type);
			};
		});

		// Zoom button
		const zoomBtn = header.createEl('button', { text: '⛶', cls: 'zoom-btn', title: 'Zoom to full view' });
		zoomBtn.onclick = () => this.zoomToChart(metric.id);

		// Chart container
		const chartContainer = card.createDiv('metric-chart-container');
		const canvas = chartContainer.createEl('canvas', { cls: 'metric-chart' });
		canvas.width = 350;
		canvas.height = 200;

		// Create renderer
		const renderer = new ChartRenderer(canvas, 350, 200);
		this.chartRenderers.set(metric.id, renderer);

		return card;
	}

	private async renderMetricChart(metricId: string, chartType: string) {
		const renderer = this.chartRenderers.get(metricId);
		if (!renderer) return;

		try {
			let data: any[] = [];
			let title = '';
			let color = '#007acc';

			// Get the metric configuration
			const metricCard = this.metricsGrid.querySelector(`[data-metric="${metricId}"]`) as HTMLElement;
			const metricConfig = this.getMetricConfig(metricId);
			color = metricConfig.color;

			// Convert timeframe to valid type
			const validTimeFrame = this.getValidTimeFrame(this.currentTimeFrame);

			switch (metricId) {
				case 'words':
					const wordData = await this.plugin.getWordCountAnalytics(validTimeFrame);
					data = wordData.filter(d => d.date && d.date !== 'undefined')
						.map(d => ({ label: d.date, value: d.totalWords || 0 }));
					title = 'Word Count Progress';
					break;
				case 'files':
					const fileData = await this.plugin.getWordCountAnalytics(validTimeFrame);
					data = fileData.filter(d => d.date && d.date !== 'undefined')
						.map(d => ({ label: d.date, value: d.filesCreated || 0 }));
					title = 'Files Created';
					break;
				case 'avgWords':
					const avgData = await this.plugin.getWordCountAnalytics(validTimeFrame);
					data = avgData.filter(d => d.date && d.date !== 'undefined')
						.map(d => ({ label: d.date, value: d.avgWordsPerFile || 0 }));
					title = 'Average Words per File';
					break;
				case 'cumulative':
					const cumData = await this.plugin.getWordCountAnalytics(validTimeFrame);
					data = cumData.filter(d => d.date && d.date !== 'undefined')
						.map(d => ({ label: d.date, value: d.cumulativeWords || 0 }));
					title = 'Cumulative Word Count';
					break;
				case 'streaks':
					const streakData = await this.plugin.getWritingStreakData();
					data = [
						{ label: 'Current Streak', value: streakData.currentStreak },
						{ label: 'Longest Streak', value: streakData.longestStreak },
						{ label: 'This Month Activity', value: streakData.thisMonthDays }
					];
					title = 'Writing Streaks';
					break;
				case 'goals':
					data = await this.plugin.getWritingGoalsProgress();
					title = 'Writing Goals Progress';
					break;
				case 'heatmap':
					data = await this.plugin.getHeatmapCalendarData();
					title = 'Writing Activity Heatmap';
					chartType = 'heatmap'; // Force heatmap rendering
					break;
				case 'comparison':
					const compData = await this.plugin.getComparisonData('month');
					data = this.formatComparisonData(compData, 'Month');
					title = 'This Month vs Last Month';
					break;
			}

			// Render based on chart type
			switch (chartType) {
				case 'line':
					renderer.renderLineChart(data, title, color);
					break;
				case 'bar':
					renderer.renderBarChart(data, title, color);
					break;
				case 'area':
					renderer.renderAreaChart(data, title, color);
					break;
				case 'pie':
					renderer.renderPieChart(data, title);
					break;
				case 'heatmap':
					renderer.renderHeatmapCalendar(data, title, color);
					break;
			}
		} catch (error) {
			console.error(`Error rendering ${metricId} chart:`, error);
		}
	}

	private getValidTimeFrame(timeFrame: string): 'year' | 'month' | 'week' | 'day' {
		switch (timeFrame) {
			case 'year':
			case 'quarter':
				return 'year';
			case 'month':
				return 'month';
			case 'week':
				return 'week';
			case 'day':
				return 'day';
			default:
				return 'month';
		}
	}

	private getMetricConfig(metricId: string) {
		const configs: Record<string, any> = {
			words: { color: '#007acc', title: 'Word Count Trends' },
			files: { color: '#28a745', title: 'Files Created' },
			avgWords: { color: '#ffc107', title: 'Average Words per File' },
			cumulative: { color: '#6f42c1', title: 'Cumulative Progress' },
			streaks: { color: '#fd7e14', title: 'Writing Streaks' },
			goals: { color: '#dc3545', title: 'Goal Progress' },
			heatmap: { color: '#28a745', title: 'Activity Heatmap' },
			comparison: { color: '#17a2b8', title: 'Period Comparison' }
		};
		return configs[metricId] || { color: '#007acc', title: 'Chart' };
	}

	private formatComparisonData(comparisonData: any, period: string): { label: string; value: number }[] {
		return [
			{ label: `Current ${period}`, value: comparisonData.current },
			{ label: `Previous ${period}`, value: comparisonData.previous }
		];
	}

	private async refreshDashboard() {
		// Show loading state
		this.metricsGrid.addClass('loading');

		try {
			// Refresh all metric charts
			const metricCards = this.metricsGrid.querySelectorAll('.metric-card');
			
			// Convert NodeList to Array for iteration
			Array.from(metricCards).forEach(async (card) => {
				const metricId = card.getAttribute('data-metric');
				const activeChartType = card.querySelector('.chart-type-btn.active')?.textContent?.toLowerCase() || 'line';
				
				if (metricId) {
					await this.renderMetricChart(metricId, activeChartType);
				}
			});
		} catch (error) {
			console.error('Error refreshing dashboard:', error);
			new Notice('Error refreshing dashboard data');
		} finally {
			this.metricsGrid.removeClass('loading');
		}
	}

	private zoomToChart(metricId: string) {
		if (this.zoomedChart) {
			this.exitZoomMode();
			return;
		}

		// Create zoomed overlay
		const overlay = this.dashboardContainer.createDiv('zoomed-chart-overlay');
		
		// Header with title and close button
		const header = overlay.createDiv('zoomed-header');
		const metricConfig = this.getMetricConfig(metricId);
		header.createEl('h2', { text: metricConfig.title, cls: 'zoomed-title' });
		
		const closeBtn = header.createEl('button', { text: '✕', cls: 'close-zoom-btn' });
		closeBtn.onclick = () => this.exitZoomMode();

		// Chart type selector for zoomed view
		const chartTypeDiv = header.createDiv('zoomed-chart-types');
		const originalCard = this.metricsGrid.querySelector(`[data-metric="${metricId}"]`);
		const originalButtons = originalCard?.querySelectorAll('.chart-type-btn');
		
		originalButtons?.forEach(btn => {
			const newBtn = chartTypeDiv.createEl('button', { 
				text: btn.textContent || '',
				cls: btn.hasClass('active') ? 'chart-type-btn active' : 'chart-type-btn'
			});
			newBtn.onclick = () => {
				chartTypeDiv.querySelectorAll('.chart-type-btn').forEach(b => b.removeClass('active'));
				newBtn.addClass('active');
				this.renderZoomedChart(metricId, newBtn.textContent?.toLowerCase() || 'line');
			};
		});

		// Large chart container
		const chartContainer = overlay.createDiv('zoomed-chart-container');
		const canvas = chartContainer.createEl('canvas', { cls: 'zoomed-chart' });
		canvas.width = 1000;
		canvas.height = 600;

		// Create large renderer
		const renderer = new ChartRenderer(canvas, 1000, 600);
		this.zoomedChart = overlay;

		// Render with active chart type
		const activeType = originalCard?.querySelector('.chart-type-btn.active')?.textContent?.toLowerCase() || 'line';
		this.renderZoomedChart(metricId, activeType, renderer);
	}

	private async renderZoomedChart(metricId: string, chartType: string, customRenderer?: ChartRenderer) {
		if (!this.zoomedChart) return;

		const canvas = this.zoomedChart.querySelector('canvas') as HTMLCanvasElement;
		const renderer = customRenderer || new ChartRenderer(canvas, 1000, 600);

		// Get fresh data for the zoomed view
		const metricConfig = this.getMetricConfig(metricId);
		let data: any[] = [];
		let title = metricConfig.title;
		const validTimeFrame = this.getValidTimeFrame(this.currentTimeFrame);

		switch (metricId) {
			case 'words':
				const wordData = await this.plugin.getWordCountAnalytics(validTimeFrame);
				data = wordData.filter(d => d.date && d.date !== 'undefined')
					.map(d => ({ label: d.date, value: d.totalWords || 0 }));
				break;
			case 'files':
				const fileData = await this.plugin.getWordCountAnalytics(validTimeFrame);
				data = fileData.filter(d => d.date && d.date !== 'undefined')
					.map(d => ({ label: d.date, value: d.filesCreated || 0 }));
				break;
			case 'avgWords':
				const avgData = await this.plugin.getWordCountAnalytics(validTimeFrame);
				data = avgData.filter(d => d.date && d.date !== 'undefined')
					.map(d => ({ label: d.date, value: d.avgWordsPerFile || 0 }));
				break;
			case 'cumulative':
				const cumData = await this.plugin.getWordCountAnalytics(validTimeFrame);
				data = cumData.filter(d => d.date && d.date !== 'undefined')
					.map(d => ({ label: d.date, value: d.cumulativeWords || 0 }));
				break;
			case 'streaks':
				const streakData = await this.plugin.getWritingStreakData();
				data = [
					{ label: 'Current Streak', value: streakData.currentStreak },
					{ label: 'Longest Streak', value: streakData.longestStreak },
					{ label: 'This Month Activity', value: streakData.thisMonthDays }
				];
				break;
			case 'goals':
				data = await this.plugin.getWritingGoalsProgress();
				break;
			case 'heatmap':
				data = await this.plugin.getHeatmapCalendarData();
				chartType = 'heatmap';
				break;
			case 'comparison':
				const compData = await this.plugin.getComparisonData('month');
				data = this.formatComparisonData(compData, 'Month');
				break;
		}

		// Render the large chart
		switch (chartType) {
			case 'line':
				renderer.renderLineChart(data, title, metricConfig.color);
				break;
			case 'bar':
				renderer.renderBarChart(data, title, metricConfig.color);
				break;
			case 'area':
				renderer.renderAreaChart(data, title, metricConfig.color);
				break;
			case 'pie':
				renderer.renderPieChart(data, title);
				break;
			case 'heatmap':
				renderer.renderHeatmapCalendar(data, title, metricConfig.color);
				break;
		}
	}

	private exitZoomMode() {
		if (this.zoomedChart) {
			this.zoomedChart.remove();
			this.zoomedChart = null;
		}
	}

	onClose() {
		// Remove the CSS class from modal
		this.modalEl.removeClass('analytics-dashboard-modal');
		
		// Clean up chart renderers
		this.chartRenderers.forEach(renderer => {
			// Clean up if possible - ChartRenderer doesn't have destroy method yet
			// Just clear the map
		});
		this.chartRenderers.clear();
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
			metricSelect.createEl('option', { value: 'comparisonMonth', text: 'This Month vs Last Month' });
			metricSelect.createEl('option', { value: 'comparisonWeek', text: 'This Week vs Last Week' });
			metricSelect.createEl('option', { value: 'comparisonYear', text: 'This Year vs Last Year' });
			metricSelect.createEl('option', { value: 'heatmapCalendar', text: 'Writing Activity Heatmap Calendar' });
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
			const metric = metricSelect.value as keyof WordCountData | 'fileSizeDistribution' | 'largestFiles' | 'fileSizeGrowth' | 'tagAnalytics' | 'folderAnalytics' | 'writingGoals' | 'comparisonMonth' | 'comparisonWeek' | 'comparisonYear' | 'heatmapCalendar';

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
				} else if (metric === 'comparisonMonth') {
					const comparisonData = await this.plugin.getComparisonData('month');
					chartData = this.formatComparisonData(comparisonData, 'Month');
				} else if (metric === 'comparisonWeek') {
					const comparisonData = await this.plugin.getComparisonData('week');
					chartData = this.formatComparisonData(comparisonData, 'Week');
				} else if (metric === 'comparisonYear') {
					const comparisonData = await this.plugin.getComparisonData('year');
					chartData = this.formatComparisonData(comparisonData, 'Year');
				} else if (metric === 'heatmapCalendar') {
					const heatmapData = await this.plugin.getHeatmapCalendarData();
					chartData = heatmapData;
				} else {
					// Standard word count analytics
					const data = await this.plugin.getWordCountAnalytics(timeFrame);
					if (data.length === 0) {
						chartContainer.removeChild(loadingMsg);
						chartContainer.createEl('p', { text: 'No data available for chart' });
						return;
					}
					chartData = data.filter(item => item.date && item.date !== 'undefined')
						.reverse().map(item => ({
							label: item.date,
							value: (item[metric as keyof WordCountData] as number) || 0
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
					case 'comparisonMonth':
						title = 'This Month vs Last Month Comparison';
						color = '#6f42c1';
						break;
					case 'comparisonWeek':
						title = 'This Week vs Last Week Comparison';
						color = '#fd7e14';
						break;
					case 'comparisonYear':
						title = 'This Year vs Last Year Comparison';
						color = '#dc3545';
						break;
					case 'heatmapCalendar':
						title = `Writing Activity Heatmap Calendar ${moment().year()}`;
						color = '#28a745';
						break;
				}

				// Render chart based on type
				switch (chartType) {
					case 'line':
						if (metric === 'heatmapCalendar') {
							renderer.renderHeatmapCalendar(chartData, title, color);
						} else {
							renderer.renderLineChart(chartData, title, color);
						}
						break;
					case 'bar':
						if (metric === 'heatmapCalendar') {
							renderer.renderHeatmapCalendar(chartData, title, color);
						} else {
							renderer.renderBarChart(chartData, title, color);
						}
						break;
					case 'area':
						if (metric === 'heatmapCalendar') {
							renderer.renderHeatmapCalendar(chartData, title, color);
						} else {
							renderer.renderAreaChart(chartData, title, color);
						}
						break;
					case 'pie':
						if (metric === 'heatmapCalendar') {
							renderer.renderHeatmapCalendar(chartData, title, color);
						} else {
							renderer.renderPieChart(chartData, title);
						}
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

	formatComparisonData(comparisonData: { label: string; current: number; previous: number; change: number; changePercent: number }[], period: string): { label: string; value: number }[] {
		const result: { label: string; value: number }[] = [];
		
		comparisonData.forEach(item => {
			// Current period values
			result.push({
				label: `Current ${period} ${item.label}`,
				value: item.current
			});
			
			// Previous period values  
			result.push({
				label: `Previous ${period} ${item.label}`,
				value: item.previous
			});
		});

		// Add change percentages as separate entries
		comparisonData.forEach(item => {
			if (item.changePercent !== 0) {
				result.push({
					label: `${item.label} Change (%)`,
					value: Math.abs(item.changePercent)
				});
			}
		});

		return result;
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
