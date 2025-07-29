import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, moment } from 'obsidian';

// Enhanced data validation utilities
class DataValidator {
	/**
	 * Validates chart data structure and content
	 */
	static validateChartData(data: any[]): boolean {
		if (!Array.isArray(data) || data.length === 0) {
			return false;
		}
		
		// Check if data has required properties
		return data.every(item => 
			item && 
			typeof item === 'object' &&
			(item.hasOwnProperty('label') || item.hasOwnProperty('date')) && 
			item.hasOwnProperty('value') &&
			item.label !== undefined &&
			item.value !== undefined &&
			!isNaN(Number(item.value)) &&
			isFinite(Number(item.value))
		);
	}

	/**
	 * Sanitizes and filters chart data, removing invalid entries
	 */
	static sanitizeChartData(data: any[]): any[] {
		if (!Array.isArray(data)) {
			console.warn('[DataValidator] Invalid data provided, expected array');
			return [];
		}
		
		const sanitized = data.filter(item => {
			if (!item || typeof item !== 'object') {
				return false;
			}
			
			// Ensure label exists and is not undefined
			if (item.label === undefined || item.label === null) {
				return false;
			}
			
			// Ensure value exists and is a valid number
			if (item.value === undefined || item.value === null || 
				isNaN(Number(item.value)) || !isFinite(Number(item.value))) {
				return false;
			}
			
			return true;
		}).map(item => ({
			...item,
			label: String(item.label).trim(),
			value: Number(item.value)
		}));

		if (sanitized.length !== data.length) {
			console.info(`[DataValidator] Filtered ${data.length - sanitized.length} invalid entries from chart data`);
		}

		return sanitized;
	}

	/**
	 * Validates date range inputs
	 */
	static validateDateRange(startDate: string, endDate: string): boolean {
		if (!startDate || !endDate || typeof startDate !== 'string' || typeof endDate !== 'string') {
			return false;
		}

		const start = new Date(startDate);
		const end = new Date(endDate);
		
		return !isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end;
	}

	/**
	 * Validates file objects
	 */
	static validateFile(file: any): file is TFile {
		return file && 
			typeof file === 'object' &&
			file.path && 
			typeof file.path === 'string' &&
			file.extension === 'md' &&
			file.stat &&
			typeof file.stat.ctime === 'number';
	}

	/**
	 * Validates settings object structure
	 */
	static validateSettings(settings: any): boolean {
		if (!settings || typeof settings !== 'object') {
			return false;
		}

		// Check required properties exist and have correct types
		const requiredStringFields = ['dateFormat', 'defaultChartType'];
		const requiredBooleanFields = ['enableRealTimeUpdates', 'showAdvancedStats', 'enableChartExport', 'enableCustomDateRange'];
		const requiredNumberFields = ['dailyWordGoal', 'weeklyFileGoal', 'monthlyWordGoal'];

		for (const field of requiredStringFields) {
			if (!settings.hasOwnProperty(field) || typeof settings[field] !== 'string') {
				return false;
			}
		}

		for (const field of requiredBooleanFields) {
			if (!settings.hasOwnProperty(field) || typeof settings[field] !== 'boolean') {
				return false;
			}
		}

		for (const field of requiredNumberFields) {
			if (!settings.hasOwnProperty(field) || typeof settings[field] !== 'number' || settings[field] < 0) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Validates and sanitizes word count data
	 */
	static validateWordCountData(data: any[]): boolean {
		if (!Array.isArray(data)) {
			return false;
		}

		return data.every(item => 
			item &&
			typeof item === 'object' &&
			typeof item.date === 'string' &&
			typeof item.totalWords === 'number' &&
			typeof item.filesCreated === 'number' &&
			typeof item.avgWordsPerFile === 'number' &&
			item.totalWords >= 0 &&
			item.filesCreated >= 0 &&
			item.avgWordsPerFile >= 0
		);
	}
}

// Enhanced cache system for analytics data with performance optimization
class AnalyticsCache {
	private cache: Map<string, { data: any; timestamp: number; ttl: number; size: number }> = new Map();
	private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
	private readonly MAX_CACHE_SIZE = 50; // Maximum number of cached items
	private readonly MAX_MEMORY_MB = 10; // Maximum cache memory in MB
	private hitCount = 0;
	private missCount = 0;

	/**
	 * Set data in cache with TTL and size tracking
	 */
	set(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {
		// Calculate approximate data size
		const dataSize = this.calculateDataSize(data);
		
		// Check if we need to evict items due to memory constraints
		this.evictIfNecessary(dataSize);
		
		this.cache.set(key, {
			data: JSON.parse(JSON.stringify(data)), // Deep clone to prevent mutations
			timestamp: Date.now(),
			ttl,
			size: dataSize
		});

		console.debug(`[AnalyticsCache] Cached "${key}" (${this.formatBytes(dataSize)})`);
	}

	/**
	 * Get data from cache with automatic expiration
	 */
	get(key: string): any | null {
		const item = this.cache.get(key);
		if (!item) {
			this.missCount++;
			return null;
		}

		// Check if expired
		if (Date.now() - item.timestamp > item.ttl) {
			this.cache.delete(key);
			this.missCount++;
			console.debug(`[AnalyticsCache] Cache expired for "${key}"`);
			return null;
		}

		this.hitCount++;
		console.debug(`[AnalyticsCache] Cache hit for "${key}"`);
		return JSON.parse(JSON.stringify(item.data)); // Return deep clone
	}

	/**
	 * Check if cache has valid entry for key
	 */
	has(key: string): boolean {
		const item = this.cache.get(key);
		if (!item) {
			return false;
		}

		if (Date.now() - item.timestamp > item.ttl) {
			this.cache.delete(key);
			return false;
		}

		return true;
	}

	/**
	 * Clear all cache entries
	 */
	clear(): void {
		console.info(`[AnalyticsCache] Clearing cache (${this.cache.size} items)`);
		this.cache.clear();
		this.hitCount = 0;
		this.missCount = 0;
	}

	/**
	 * Invalidate cache entries by pattern
	 */
	invalidatePattern(pattern: string): void {
		const keysToDelete: string[] = [];
		
		for (const key of this.cache.keys()) {
			if (key.includes(pattern)) {
				keysToDelete.push(key);
			}
		}

		keysToDelete.forEach(key => {
			this.cache.delete(key);
			console.debug(`[AnalyticsCache] Invalidated "${key}"`);
		});

		if (keysToDelete.length > 0) {
			console.info(`[AnalyticsCache] Invalidated ${keysToDelete.length} entries matching "${pattern}"`);
		}
	}

	/**
	 * Get cache statistics
	 */
	getStats(): { hitRate: number; totalMemoryMB: number; entryCount: number; hitCount: number; missCount: number } {
		const totalRequests = this.hitCount + this.missCount;
		const hitRate = totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0;
		
		let totalMemory = 0;
		this.cache.forEach(item => totalMemory += item.size);

		return {
			hitRate: Math.round(hitRate * 100) / 100,
			totalMemoryMB: Math.round((totalMemory / (1024 * 1024)) * 100) / 100,
			entryCount: this.cache.size,
			hitCount: this.hitCount,
			missCount: this.missCount
		};
	}

	/**
	 * Calculate approximate size of data in bytes
	 */
	private calculateDataSize(data: any): number {
		try {
			return new Blob([JSON.stringify(data)]).size;
		} catch (error) {
			// Fallback estimation
			return JSON.stringify(data).length * 2; // Rough estimate (UTF-16)
		}
	}

	/**
	 * Evict cache entries if memory limit exceeded
	 */
	private evictIfNecessary(newDataSize: number): void {
		let totalMemory = newDataSize;
		this.cache.forEach(item => totalMemory += item.size);

		const maxMemoryBytes = this.MAX_MEMORY_MB * 1024 * 1024;

		// If we exceed memory limit or entry count, evict oldest entries
		if (totalMemory > maxMemoryBytes || this.cache.size >= this.MAX_CACHE_SIZE) {
			const entries = Array.from(this.cache.entries())
				.sort((a, b) => a[1].timestamp - b[1].timestamp); // Sort by timestamp (oldest first)

			let evictedCount = 0;
			let freedMemory = 0;

			// Evict oldest entries until we're under limits
			while ((totalMemory > maxMemoryBytes || this.cache.size >= this.MAX_CACHE_SIZE) && entries.length > 0) {
				const [key, item] = entries.shift()!;
				this.cache.delete(key);
				totalMemory -= item.size;
				freedMemory += item.size;
				evictedCount++;
			}

			if (evictedCount > 0) {
				console.info(`[AnalyticsCache] Evicted ${evictedCount} entries, freed ${this.formatBytes(freedMemory)}`);
			}
		}
	}

	/**
	 * Format bytes for logging
	 */
	private formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}
}

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
			new Notice('Failed to copy chart to clipboard. Please try a different format.');
			console.error('Failed to copy to clipboard:', error);
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

// Performance monitoring utilities
class PerformanceMonitor {
	private metrics: Map<string, { startTime: number; totalTime: number; callCount: number }> = new Map();
	private memoryBaseline: number = 0;

	/**
	 * Start timing an operation
	 */
	startTimer(operation: string): void {
		if (!this.metrics.has(operation)) {
			this.metrics.set(operation, { startTime: 0, totalTime: 0, callCount: 0 });
		}
		
		const metric = this.metrics.get(operation)!;
		metric.startTime = performance.now();
	}

	/**
	 * End timing an operation and record the duration
	 */
	endTimer(operation: string): number {
		const metric = this.metrics.get(operation);
		if (!metric || metric.startTime === 0) {
			console.warn(`[PerformanceMonitor] Timer not started for operation: ${operation}`);
			return 0;
		}

		const duration = performance.now() - metric.startTime;
		metric.totalTime += duration;
		metric.callCount += 1;
		metric.startTime = 0;

		console.debug(`[PerformanceMonitor] ${operation}: ${duration.toFixed(2)}ms`);
		return duration;
	}

	/**
	 * Time an async operation automatically
	 */
	async timeAsync<T>(operation: string, fn: () => Promise<T>): Promise<T> {
		this.startTimer(operation);
		try {
			const result = await fn();
			this.endTimer(operation);
			return result;
		} catch (error) {
			this.endTimer(operation);
			throw error;
		}
	}

	/**
	 * Get performance statistics
	 */
	getStats(): { operation: string; avgTime: number; totalTime: number; callCount: number }[] {
		const stats: { operation: string; avgTime: number; totalTime: number; callCount: number }[] = [];
		
		this.metrics.forEach((metric, operation) => {
			if (metric.callCount > 0) {
				stats.push({
					operation,
					avgTime: Math.round((metric.totalTime / metric.callCount) * 100) / 100,
					totalTime: Math.round(metric.totalTime * 100) / 100,
					callCount: metric.callCount
				});
			}
		});

		return stats.sort((a, b) => b.totalTime - a.totalTime);
	}

	/**
	 * Get current memory usage (approximate)
	 */
	getMemoryUsage(): { used: number; total: number } {
		if ('memory' in performance) {
			const memory = (performance as any).memory;
			return {
				used: Math.round((memory.usedJSHeapSize / 1024 / 1024) * 100) / 100,
				total: Math.round((memory.totalJSHeapSize / 1024 / 1024) * 100) / 100
			};
		}
		return { used: 0, total: 0 };
	}

	/**
	 * Log performance summary
	 */
	logSummary(): void {
		const stats = this.getStats();
		const memory = this.getMemoryUsage();
		
		console.group('[Performance Summary]');
		console.table(stats);
		
		if (memory.used > 0) {
			console.info(`Memory Usage: ${memory.used}MB / ${memory.total}MB`);
		}
		
		console.groupEnd();
	}

	/**
	 * Reset all metrics
	 */
	reset(): void {
		this.metrics.clear();
		console.info('[PerformanceMonitor] Metrics reset');
	}
}

export default class NotesAnalyticsPlugin extends Plugin {
	settings: NotesAnalyticsSettings;
	private updateTimeout: number | undefined;
	private cache: AnalyticsCache;
	private performanceMonitor: PerformanceMonitor;
	private lastFileModificationTime: number = 0;
	private debouncedCacheInvalidation: number | undefined;
	private statusBarUpdateInProgress: boolean = false;

	/**
	 * Setup keyboard shortcuts for accessibility
	 */
	private setupKeyboardShortcuts(): void {
		// Add keyboard shortcut for dashboard
		this.addCommand({
			id: 'open-analytics-dashboard',
			name: 'Open Analytics Dashboard',
			hotkeys: [{ modifiers: ['Ctrl', 'Shift'], key: 'a' }],
			callback: () => {
				try {
					new AnalyticsDashboardModal(this.app, this).open();
				} catch (error) {
					console.error('[Notes Analytics] Error opening dashboard:', error);
					new Notice('Failed to open analytics dashboard. Please try again.');
				}
			}
		});

		// Add keyboard shortcut for charts
		this.addCommand({
			id: 'open-chart-visualizations',
			name: 'Open Chart Visualizations',
			hotkeys: [{ modifiers: ['Ctrl', 'Shift'], key: 'c' }],
			callback: () => {
				try {
					new ChartVisualizationsModal(this.app, this).open();
				} catch (error) {
					console.error('[Notes Analytics] Error opening chart visualizations:', error);
					new Notice('Failed to open analytics charts. Please try again.');
				}
			}
		});

		// Add keyboard shortcut for full report
		this.addCommand({
			id: 'generate-full-report',
			name: 'Generate Full Analytics Report',
			hotkeys: [{ modifiers: ['Ctrl', 'Shift'], key: 'r' }],
			callback: async () => {
				try {
					const analytics = await this.getAllAnalytics();
					new Notice('Analytics report generated in console');
					console.log('Full Analytics Report:', analytics);
				} catch (error) {
					console.error('[Notes Analytics] Error generating report:', error);
					new Notice('Failed to generate analytics report. Please try again.');
				}
			}
		});

		// Add keyboard shortcut for refresh analytics
		this.addCommand({
			id: 'refresh-analytics',
			name: 'Refresh Analytics Data',
			hotkeys: [{ modifiers: ['Ctrl', 'Shift'], key: 'f' }],
			callback: () => {
				try {
					this.cache.clear();
					new Notice('Analytics data refreshed');
				} catch (error) {
					console.error('[Notes Analytics] Error refreshing analytics:', error);
					new Notice('Failed to refresh analytics data. Please try again.');
				}
			}
		});
	}

	async onload() {
		try {
			console.info('[Notes Analytics] Plugin loading...');
			
			// Initialize performance monitoring and caching
			this.performanceMonitor = new PerformanceMonitor();
			this.cache = new AnalyticsCache();
			this.lastFileModificationTime = Date.now();

			console.info('[Notes Analytics] Performance monitoring and caching initialized');
			
			// Load settings with validation
			await this.loadSettings();

			let statusBarItemEl: HTMLElement | null = null;

			// Add ribbon icons with error handling
			try {
				const ribbonIconEl = this.addRibbonIcon('bar-chart', 'Notes Analytics', (evt: MouseEvent) => {
					try {
						new ChartVisualizationsModal(this.app, this).open();
					} catch (error) {
						console.error('[Notes Analytics] Error opening chart visualizations:', error);
						new Notice('Failed to open analytics charts. Please try again.');
					}
				});
				ribbonIconEl.addClass('notes-analytics-ribbon-class');

				const dashboardRibbonIconEl = this.addRibbonIcon('layout-dashboard', 'Analytics Dashboard', (evt: MouseEvent) => {
					try {
						new AnalyticsDashboardModal(this.app, this).open();
					} catch (error) {
						console.error('[Notes Analytics] Error opening dashboard:', error);
						new Notice('Failed to open analytics dashboard. Please try again.');
					}
				});
				dashboardRibbonIconEl.addClass('notes-analytics-ribbon-class');
			} catch (error) {
				console.error('[Notes Analytics] Error adding ribbon icons:', error);
				// Continue loading without ribbon icons
			}

			// Setup keyboard shortcuts and accessibility features
			try {
				this.setupKeyboardShortcuts();
				console.info('[Notes Analytics] Keyboard shortcuts configured');
			} catch (error) {
				console.error('[Notes Analytics] Error setting up keyboard shortcuts:', error);
				// Continue loading without shortcuts
			}

			// Add status bar with error handling
			try {
				statusBarItemEl = this.addStatusBarItem();
				if (statusBarItemEl) {
					this.updateStatusBar(statusBarItemEl);
				}
			} catch (error) {
				console.error('[Notes Analytics] Error adding status bar:', error);
				// Continue loading without status bar
			}

			// Add commands with error handling
			try {
				this.addCommand({
					id: 'open-notes-analytics',
					name: 'Open Notes Analytics',
					callback: () => {
						try {
							new ChartVisualizationsModal(this.app, this).open();
						} catch (error) {
							console.error('[Notes Analytics] Error in command callback:', error);
							new Notice('Failed to open analytics. Please try again.');
						}
					}
				});

				this.addCommand({
					id: 'show-chart-visualizations',
					name: 'Show Chart Visualizations',
					callback: () => {
						try {
							new ChartVisualizationsModal(this.app, this).open();
						} catch (error) {
							console.error('[Notes Analytics] Error in command callback:', error);
							new Notice('Failed to show chart visualizations. Please try again.');
						}
					}
				});

				this.addCommand({
					id: 'show-analytics-dashboard',
					name: 'Show Analytics Dashboard',
					callback: () => {
						try {
							new AnalyticsDashboardModal(this.app, this).open();
						} catch (error) {
							console.error('[Notes Analytics] Error in command callback:', error);
							new Notice('Failed to show analytics dashboard. Please try again.');
						}
					}
				});
			} catch (error) {
				console.error('[Notes Analytics] Error adding commands:', error);
				// Continue loading without commands
			}

			// Add settings tab with error handling
			try {
				this.addSettingTab(new NotesAnalyticsSettingTab(this.app, this));
			} catch (error) {
				console.error('[Notes Analytics] Error adding settings tab:', error);
				// Continue loading without settings tab
			}

			// Register file events for real-time updates with error handling
			if (this.settings.enableRealTimeUpdates) {
				try {
					this.registerEvent(
						this.app.vault.on('create', (file) => {
							try {
								if (file instanceof TFile && file.extension === 'md') {
									this.invalidateAnalyticsCache('file-create');
									if (statusBarItemEl) {
										this.updateStatusBar(statusBarItemEl);
									}
								}
							} catch (error) {
								console.warn('[Notes Analytics] Error in create event handler:', error);
							}
						})
					);

					this.registerEvent(
						this.app.vault.on('modify', (file) => {
							try {
								if (file instanceof TFile && file.extension === 'md') {
									// Debounced cache invalidation to avoid excessive cache clearing
									this.debouncedInvalidateCache('file-modify');
									
									if (statusBarItemEl) {
										// Debounce updates to avoid too frequent updates
										clearTimeout(this.updateTimeout);
										this.updateTimeout = window.setTimeout(() => {
											try {
												if (statusBarItemEl) {
													this.updateStatusBar(statusBarItemEl);
												}
											} catch (error) {
												console.warn('[Notes Analytics] Error in delayed status update:', error);
											}
										}, 2000);
									}
								}
							} catch (error) {
								console.warn('[Notes Analytics] Error in modify event handler:', error);
							}
						})
					);

					this.registerEvent(
						this.app.vault.on('delete', (file) => {
							try {
								if (file instanceof TFile && file.extension === 'md') {
									this.invalidateAnalyticsCache('file-delete');
									if (statusBarItemEl) {
										this.updateStatusBar(statusBarItemEl);
									}
								}
							} catch (error) {
								console.warn('[Notes Analytics] Error in delete event handler:', error);
							}
						})
					);
				} catch (error) {
					console.error('[Notes Analytics] Error registering vault events:', error);
					// Continue loading without event handlers
				}
			}

			// Set up periodic status bar updates with error handling
			try {
				if (this.settings.enableRealTimeUpdates && statusBarItemEl) {
					this.registerInterval(window.setInterval(() => {
						try {
							if (statusBarItemEl) {
								this.updateStatusBar(statusBarItemEl);
							}
						} catch (error) {
							console.warn('[Notes Analytics] Error in periodic status update:', error);
						}
					}, 30000)); // Update every 30 seconds
				} else if (statusBarItemEl) {
					// Update once on load
					this.updateStatusBar(statusBarItemEl);
				}
			} catch (error) {
				console.error('[Notes Analytics] Error setting up status bar updates:', error);
				// Continue without periodic updates
			}

			console.info('[Notes Analytics] Plugin loaded successfully');
		} catch (error) {
			console.error('[Notes Analytics] Critical error during plugin load:', error);
			new Notice('Notes Analytics plugin failed to load. Please check the console for details.');
			// Plugin can still be partially functional even if some features fail
		}
	}

	onunload() {
		try {
			console.info('[Notes Analytics] Plugin unloading...');
			
			// Clean up timeouts
			if (this.updateTimeout) {
				clearTimeout(this.updateTimeout);
				this.updateTimeout = undefined;
			}

			if (this.debouncedCacheInvalidation) {
				clearTimeout(this.debouncedCacheInvalidation);
				this.debouncedCacheInvalidation = undefined;
			}

			// Log performance summary before cleanup
			if (this.performanceMonitor) {
				this.performanceMonitor.logSummary();
				
				// Log cache statistics
				if (this.cache) {
					const cacheStats = this.cache.getStats();
					console.info('[Notes Analytics] Cache Statistics:', cacheStats);
				}
			}

			// Clear cache and cleanup resources
			if (this.cache) {
				this.cache.clear();
			}

			console.info('[Notes Analytics] Plugin unloaded successfully');
		} catch (error) {
			console.error('[Notes Analytics] Error during plugin unload:', error);
		}
	}

	async loadSettings() {
		try {
			const loadedData = await this.loadData();
			
			// Merge with defaults
			const mergedSettings = Object.assign({}, DEFAULT_SETTINGS, loadedData);
			
			// Validate the merged settings
			if (DataValidator.validateSettings(mergedSettings)) {
				this.settings = mergedSettings;
				console.info('[Notes Analytics] Settings loaded and validated successfully');
			} else {
				console.warn('[Notes Analytics] Invalid settings detected, using defaults');
				this.settings = Object.assign({}, DEFAULT_SETTINGS);
				
				// Save the corrected settings
				await this.saveSettings();
			}
		} catch (error) {
			console.error('[Notes Analytics] Error loading settings, using defaults:', error);
			this.settings = Object.assign({}, DEFAULT_SETTINGS);
			
			// Try to save default settings
			try {
				await this.saveSettings();
			} catch (saveError) {
				console.error('[Notes Analytics] Failed to save default settings:', saveError);
			}
		}
	}

	async saveSettings() {
		try {
			// Validate settings before saving
			if (!DataValidator.validateSettings(this.settings)) {
				console.warn('[Notes Analytics] Invalid settings detected before save, using defaults');
				this.settings = Object.assign({}, DEFAULT_SETTINGS);
			}
			
			await this.saveData(this.settings);
		} catch (error) {
			console.error('[Notes Analytics] Error saving settings:', error);
			new Notice('Failed to save analytics settings. Please try again.');
		}
	}

	private async updateStatusBar(statusBarItemEl: HTMLElement) {
		try {
			// Prevent excessive updates with throttling
			if (this.statusBarUpdateInProgress) {
				return;
			}
			this.statusBarUpdateInProgress = true;

			if (!statusBarItemEl) {
				return;
			}

			// Show loading state
			statusBarItemEl.setText('📊 Loading...');

			const files = this.app.vault.getMarkdownFiles();
			const totalFiles = files ? files.length : 0;
			
			if (totalFiles === 0) {
				statusBarItemEl.setText(`📊 No markdown files found`);
				statusBarItemEl.title = 'No markdown files found in vault';
				return;
			}

			const totalWords = await this.getTotalWordCount(files);
			
			// Format numbers for better readability
			const formattedWords = totalWords >= 1000 
				? `${(totalWords / 1000).toFixed(1)}k` 
				: totalWords.toString();
			
			const formattedFiles = totalFiles >= 1000 
				? `${(totalFiles / 1000).toFixed(1)}k` 
				: totalFiles.toString();

			statusBarItemEl.setText(`📊 ${formattedFiles} files • ${formattedWords} words`);
			
			// Add detailed tooltip
			statusBarItemEl.title = `Analytics: ${totalFiles} files, ${totalWords.toLocaleString()} words total. Click to open dashboard.`;
		} catch (error) {
			console.warn('[Notes Analytics] Error updating status bar:', error);
			// Show minimal info if there's an error
			if (statusBarItemEl) {
				statusBarItemEl.setText('📊 Analytics unavailable');
				statusBarItemEl.title = 'Analytics temporarily unavailable. Click to try again.';
			}
		} finally {
			this.statusBarUpdateInProgress = false;
		}
	}

	/**
	 * Invalidate cache entries related to analytics
	 */
	private invalidateAnalyticsCache(reason: string): void {
		if (!this.cache) return;

		try {
			// Invalidate relevant cache patterns based on the reason
			switch (reason) {
				case 'file-create':
				case 'file-delete':
					// These operations affect counts and cumulative data
					this.cache.invalidatePattern('wordcount');
					this.cache.invalidatePattern('analytics');
					this.cache.invalidatePattern('summary');
					this.cache.invalidatePattern('comparison');
					break;
				case 'file-modify':
					// File modifications mainly affect word counts
					this.cache.invalidatePattern('wordcount');
					this.cache.invalidatePattern('totalwords');
					break;
				case 'settings-change':
					// Settings changes might affect all analytics
					this.cache.clear();
					break;
				default:
					// Clear specific pattern or all if unknown reason
					this.cache.invalidatePattern(reason);
			}

			this.lastFileModificationTime = Date.now();
			console.debug(`[Notes Analytics] Cache invalidated (${reason})`);
		} catch (error) {
			console.warn('[Notes Analytics] Error invalidating cache:', error);
		}
	}

	/**
	 * Debounced cache invalidation to prevent excessive cache clearing
	 */
	private debouncedInvalidateCache(reason: string): void {
		// Clear existing timeout
		if (this.debouncedCacheInvalidation) {
			clearTimeout(this.debouncedCacheInvalidation);
		}

		// Set new timeout for cache invalidation
		this.debouncedCacheInvalidation = window.setTimeout(() => {
			this.invalidateAnalyticsCache(reason);
			this.debouncedCacheInvalidation = undefined;
		}, 1000); // 1 second debounce
	}

	/**
	 * Get analytics data with caching
	 */
	private async getCachedAnalytics<T>(
		cacheKey: string,
		dataFetcher: () => Promise<T>,
		ttl: number = 5 * 60 * 1000 // 5 minutes default
	): Promise<T> {
		if (!this.cache) {
			return await dataFetcher();
		}

		// Check cache first
		const cached = this.cache.get(cacheKey);
		if (cached !== null) {
			return cached as T;
		}

		// Fetch fresh data with performance monitoring
		return await this.performanceMonitor.timeAsync(`fetch-${cacheKey}`, async () => {
			const data = await dataFetcher();
			
			// Cache the result
			this.cache.set(cacheKey, data, ttl);
			
			return data;
		});
	}

	/**
	 * Get performance and cache statistics
	 */
	public getPerformanceStats(): {
		cache: {
			hitRate: number;
			entryCount: number;
			hitCount: number;
			missCount: number;
			memoryUsage: string;
		};
		performance: {
			totalOperations: number;
			averageTime: number;
			totalTime: number;
			operations: { operation: string; avgTime: number; totalTime: number; callCount: number }[];
		};
	} {
		const cacheStats = this.cache?.getStats() || {
			hitCount: 0,
			missCount: 0,
			entryCount: 0,
			totalMemoryMB: 0,
			hitRate: 0
		};

		const performanceStatsArray = this.performanceMonitor?.getStats() || [];

		// Calculate aggregate performance stats
		const totalOperations = performanceStatsArray.reduce((sum, stat) => sum + stat.callCount, 0);
		const totalTime = performanceStatsArray.reduce((sum, stat) => sum + stat.totalTime, 0);
		const averageTime = totalOperations > 0 ? totalTime / totalOperations : 0;

		return {
			cache: {
				hitRate: Math.round(cacheStats.hitRate),
				entryCount: cacheStats.entryCount,
				hitCount: cacheStats.hitCount,
				missCount: cacheStats.missCount,
				memoryUsage: `${Math.round(cacheStats.totalMemoryMB * 1024)}KB`
			},
			performance: {
				totalOperations,
				averageTime: Math.round(averageTime),
				totalTime: Math.round(totalTime),
				operations: performanceStatsArray
			}
		};
	}

	async getTotalWordCount(files: TFile[]): Promise<number> {
		// Enhanced input validation
		if (!files || !Array.isArray(files) || files.length === 0) {
			return 0;
		}

		// Cache key based on files length and modification times
		const cacheKey = `totalwords-${files.length}-${this.lastFileModificationTime}`;
		
		return await this.getCachedAnalytics(cacheKey, async () => {
			let totalWords = 0;
			let processedFiles = 0;
			let errorCount = 0;
			
			try {
				// Batch processing for better performance
				const BATCH_SIZE = 50; // Process files in batches to prevent UI blocking
				
				for (let i = 0; i < files.length; i += BATCH_SIZE) {
					const batch = files.slice(i, i + BATCH_SIZE);
					
					// Process batch in parallel with limited concurrency
					const batchPromises = batch.map(async (file) => {
						try {
							return await this.getWordCount(file);
						} catch (error) {
							errorCount++;
							console.warn(`[Notes Analytics] Error processing file "${file?.path || 'unknown'}":`, error.message);
							return 0; // Return 0 for failed files
						}
					});

					const batchResults = await Promise.all(batchPromises);
					
					// Sum up batch results
					batchResults.forEach(wordCount => {
						totalWords += wordCount;
						processedFiles++;
					});

					// Small delay between batches to prevent UI freezing
					if (i + BATCH_SIZE < files.length) {
						await new Promise(resolve => setTimeout(resolve, 1));
					}
				}

				if (errorCount > 0) {
					console.info(`[Notes Analytics] Processed ${processedFiles} files successfully, ${errorCount} files had errors`);
				}

				return Math.max(0, totalWords); // Ensure non-negative result
			} catch (error) {
				console.error('[Notes Analytics] Critical error in getTotalWordCount:', error);
				return 0;
			}
		}, 10 * 60 * 1000); // Cache for 10 minutes - word counts don't change frequently
	}

	async getWordCount(file: TFile): Promise<number> {
		// Enhanced input validation
		if (!file || !file.path || file.extension !== 'md') {
			return 0;
		}
		
		try {
			// For more accurate word count, read the file content
			const content = await this.app.vault.read(file);
			if (!content || typeof content !== 'string' || content.trim().length === 0) {
				return 0;
			}

			// Enhanced markdown content cleaning for better word count accuracy
			const cleanContent = content
				.replace(/```[\s\S]*?```/g, '') // Remove code blocks
				.replace(/`[^`]*`/g, '') // Remove inline code
				.replace(/!\[[^\]]*\]\([^)]*\)/g, '') // Remove images
				.replace(/\[[^\]]*\]\([^)]*\)/g, '') // Remove links
				.replace(/#{1,6}\s+/g, '') // Remove headers
				.replace(/[*_~]{1,3}/g, '') // Remove emphasis
				.replace(/^\s*[-*+]\s+/gm, '') // Remove list markers
				.replace(/^\s*\d+\.\s+/gm, '') // Remove numbered lists
				.replace(/^\s*>\s+/gm, '') // Remove blockquotes
				.replace(/\s+/g, ' ') // Normalize whitespace
				.trim();

			if (!cleanContent) {
				return 0;
			}

			// Simple word count: split by whitespace and filter empty strings
			const words = cleanContent.split(/\s+/).filter(word => word.length > 0);
			return Math.max(0, words.length); // Ensure non-negative result
		} catch (error) {
			console.warn(`[Notes Analytics] Unable to read file "${file.path}" for word count:`, error.message);
			
			// Fallback to size-based estimation if reading fails
			try {
				if (file.stat && file.stat.size > 0) {
					return Math.floor(file.stat.size / 5); // Rough estimate: 5 chars per word
				}
			} catch (statError) {
				console.warn(`[Notes Analytics] Unable to get file stats for "${file.path}":`, statError.message);
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
		// Create cache key based on file count and last modification time
		const fileCount = this.app.vault.getMarkdownFiles().length;
		const cacheKey = `tag-analytics-${fileCount}-${this.lastFileModificationTime}`;
		
		return await this.getCachedAnalytics(cacheKey, async () => {
			try {
				const files = this.app.vault.getMarkdownFiles();
				if (!files || files.length === 0) {
					return [];
				}

				const tagCounts = new Map<string, number>();
				let processedFiles = 0;
				let errorCount = 0;

				// Process files in batches
				const BATCH_SIZE = 50;
				for (let i = 0; i < files.length; i += BATCH_SIZE) {
					const batch = files.slice(i, i + BATCH_SIZE);
					
					const batchPromises = batch.map(async (file) => {
						try {
							const content = await this.app.vault.read(file);
							if (!content || typeof content !== 'string') {
								return null;
							}

							// Extract tags using regex (both #tag and [[tag]] formats)
							const tagMatches = content.match(/#[\w\-_]+/g) || [];
							const wikiTagMatches = content.match(/\[\[([^\]]+)\]\]/g) || [];
							
							const fileTags = new Set<string>();

							// Process hashtags
							tagMatches.forEach(tag => {
								if (tag && tag.length > 1) {
									const cleanTag = tag.substring(1); // Remove #
									if (cleanTag.length > 0) {
										fileTags.add(cleanTag);
									}
								}
							});

							// Process wiki-style tags (only if they look like tags)
							wikiTagMatches.forEach(match => {
								if (match && match.length > 4) {
									const tag = match.slice(2, -2); // Remove [[ and ]]
									if (tag.length > 0 && tag.length < 30 && !tag.includes('/')) { // Basic filter for tag-like content
										fileTags.add(tag);
									}
								}
							});

							return Array.from(fileTags);
						} catch (error) {
							console.warn(`[Notes Analytics] Error processing file "${file?.path || 'unknown'}":`, error.message);
							return null;
						}
					});

					const batchResults = await Promise.all(batchPromises);
					
					batchResults.forEach(tags => {
						if (tags) {
							tags.forEach(tag => {
								if (tag && typeof tag === 'string') {
									tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
								}
							});
							processedFiles++;
						} else {
							errorCount++;
						}
					});

					// Small delay between batches for UI responsiveness
					if (i + BATCH_SIZE < files.length) {
						await new Promise(resolve => setTimeout(resolve, 1));
					}
				}

				if (errorCount > 0) {
					console.info(`[Notes Analytics] Tag analytics: ${processedFiles} files processed, ${errorCount} errors`);
				}

				return Array.from(tagCounts.entries())
					.sort((a, b) => b[1] - a[1])
					.slice(0, 15) // Top 15 tags
					.map(([tag, count]) => ({
						label: tag.length > 20 ? tag.substring(0, 17) + '...' : tag,
						value: Math.max(0, count)
					}));
			} catch (error) {
				console.error('[Notes Analytics] Critical error in getTagAnalytics:', error);
				return [];
			}
		}, 10 * 60 * 1000); // Cache for 10 minutes
	}

	async getFolderAnalytics(): Promise<{ label: string; value: number }[]> {
		// Create cache key based on file count and last modification time
		const fileCount = this.app.vault.getMarkdownFiles().length;
		const cacheKey = `folder-analytics-${fileCount}-${this.lastFileModificationTime}`;
		
		return await this.getCachedAnalytics(cacheKey, async () => {
			try {
				const files = this.app.vault.getMarkdownFiles();
				if (!files || files.length === 0) {
					return [];
				}

				const folderCounts = new Map<string, number>();

				files.forEach(file => {
					try {
						if (!file || !file.path || typeof file.path !== 'string') {
							return;
						}

						const lastSlashIndex = file.path.lastIndexOf('/');
						const folderPath = lastSlashIndex > -1 ? file.path.substring(0, lastSlashIndex) : '';
						const folder = folderPath || 'Root';
						
						// Sanitize folder name
						if (folder.length <= 200) { // Reasonable limit for folder names
							folderCounts.set(folder, (folderCounts.get(folder) || 0) + 1);
						}
					} catch (error) {
						console.warn(`[Notes Analytics] Error processing file path "${file?.path || 'unknown'}":`, error.message);
					}
				});

				return Array.from(folderCounts.entries())
					.sort((a, b) => b[1] - a[1])
					.slice(0, 10) // Top 10 folders
					.map(([folder, count]) => ({
						label: folder.length > 25 ? '...' + folder.substring(folder.length - 22) : folder,
						value: Math.max(0, count)
					}));
			} catch (error) {
				console.error('[Notes Analytics] Critical error in getFolderAnalytics:', error);
				return [];
			}
		}, 15 * 60 * 1000); // Cache for 15 minutes
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
		// Create cache key based on parameters
		const cacheKey = `daterange-${startDate}-${endDate}-${groupBy}-${this.lastFileModificationTime}`;
		
		return await this.getCachedAnalytics(cacheKey, async () => {
			try {
				// Enhanced input validation
				if (!startDate || !endDate || typeof startDate !== 'string' || typeof endDate !== 'string') {
					console.error('[Notes Analytics] Invalid date parameters provided');
					return [];
				}

				if (!['day', 'week', 'month'].includes(groupBy)) {
					console.warn('[Notes Analytics] Invalid groupBy parameter, defaulting to "day"');
					groupBy = 'day';
				}

				const files = this.app.vault.getMarkdownFiles();
				if (!files || files.length === 0) {
					return [];
				}

				const dataMap = new Map<string, WordCountData>();
				
				const start = moment(startDate);
				const end = moment(endDate);

				// Validate date range
				if (!start.isValid() || !end.isValid()) {
					console.error('[Notes Analytics] Invalid date format provided');
					return [];
				}

				if (start.isAfter(end)) {
					console.warn('[Notes Analytics] Start date is after end date, swapping dates');
					// Swap the dates by creating new moments
					const startTemp = end.clone();
					const endTemp = start.clone();
					start.year(startTemp.year()).month(startTemp.month()).date(startTemp.date());
					end.year(endTemp.year()).month(endTemp.month()).date(endTemp.date());
				}

				let processedFiles = 0;
				let errorCount = 0;

				// Process files in batches for better performance
				const BATCH_SIZE = 100;
				for (let i = 0; i < files.length; i += BATCH_SIZE) {
					const batch = files.slice(i, i + BATCH_SIZE);
					
					// Process batch with limited concurrency
					const batchPromises = batch.map(async (file) => {
						try {
							// Validate file has creation time
							if (!file.stat || !file.stat.ctime) {
								return null;
							}

							const fileDate = moment(file.stat.ctime);
							if (!fileDate.isValid()) {
								return null;
							}
							
							// Skip files outside the date range
							if (fileDate.isBefore(start) || fileDate.isAfter(end)) {
								return null;
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

							const wordCount = await this.getWordCount(file);
							
							// Validate word count result
							if (typeof wordCount === 'number' && wordCount >= 0) {
								return { dateKey, wordCount };
							}
							return null;
						} catch (error) {
							console.warn(`[Notes Analytics] Error processing file "${file?.path || 'unknown'}":`, error.message);
							return null;
						}
					});

					const batchResults = await Promise.all(batchPromises);
					
					// Process batch results
					batchResults.forEach(result => {
						if (result) {
							const { dateKey, wordCount } = result;
							
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
							data.totalWords += wordCount;
							data.filesCreated += 1;
							processedFiles++;
						} else {
							errorCount++;
						}
					});

					// Small delay between batches
					if (i + BATCH_SIZE < files.length) {
						await new Promise(resolve => setTimeout(resolve, 1));
					}
				}

				if (errorCount > 0) {
					console.info(`[Notes Analytics] Date range analysis: ${processedFiles} files processed, ${errorCount} errors`);
				}

				// Calculate averages and cumulative data
				const sortedData = Array.from(dataMap.values()).sort((a, b) => a.date.localeCompare(b.date));
				let cumulativeWords = 0;
				let cumulativeFiles = 0;
				
				sortedData.forEach(item => {
					try {
						item.avgWordsPerFile = item.filesCreated > 0 ? Math.round(item.totalWords / item.filesCreated) : 0;
						cumulativeWords += Math.max(0, item.totalWords || 0);
						cumulativeFiles += Math.max(0, item.filesCreated || 0);
						item.cumulativeWords = cumulativeWords;
						item.cumulativeFiles = cumulativeFiles;
					} catch (error) {
						console.warn('[Notes Analytics] Error calculating cumulative data:', error.message);
						// Set safe defaults
						item.avgWordsPerFile = 0;
						item.cumulativeWords = cumulativeWords;
						item.cumulativeFiles = cumulativeFiles;
					}
				});

				return sortedData; // Return in ascending order (oldest to newest) for proper chart display
			} catch (error) {
				console.error('[Notes Analytics] Critical error in getWordCountAnalyticsForDateRange:', error);
				return [];
			}
		}, 15 * 60 * 1000); // Cache for 15 minutes
	}

	async getWordCountAnalytics(timeFrame: 'day' | 'week' | 'month' | 'year'): Promise<WordCountData[]> {
		// Create cache key based on timeframe and file modifications
		const fileCount = this.app.vault.getMarkdownFiles().length;
		const cacheKey = `wordcount-analytics-${timeFrame}-${fileCount}-${this.lastFileModificationTime}`;
		
		return await this.getCachedAnalytics(cacheKey, async () => {
			try {
				// Enhanced input validation
				if (!['day', 'week', 'month', 'year'].includes(timeFrame)) {
					console.warn('[Notes Analytics] Invalid timeFrame parameter, defaulting to "day"');
					timeFrame = 'day';
				}

				const files = this.app.vault.getMarkdownFiles();
				if (!files || files.length === 0) {
					return [];
				}

				const dataMap = new Map<string, WordCountData>();
				let processedFiles = 0;
				let errorCount = 0;

				// Process files in batches
				const BATCH_SIZE = 50;
				for (let i = 0; i < files.length; i += BATCH_SIZE) {
					const batch = files.slice(i, i + BATCH_SIZE);
					
					const batchPromises = batch.map(async (file) => {
						try {
							if (!file || !file.stat || !file.stat.ctime) {
								return null;
							}

							const fileDate = moment(file.stat.ctime);
							if (!fileDate.isValid()) {
								return null;
							}

							let dateKey: string;

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

							const wordCount = await this.getWordCount(file);
							
							// Validate word count result
							if (typeof wordCount === 'number' && wordCount >= 0) {
								return { dateKey, wordCount };
							}
							return null;
						} catch (error) {
							console.warn(`[Notes Analytics] Error processing file "${file?.path || 'unknown'}":`, error.message);
							return null;
						}
					});

					const batchResults = await Promise.all(batchPromises);
					
					// Process batch results
					batchResults.forEach(result => {
						if (result) {
							const { dateKey, wordCount } = result;
							
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
							data.totalWords += wordCount;
							data.filesCreated += 1;
							processedFiles++;
						} else {
							errorCount++;
						}
					});

					// Small delay between batches
					if (i + BATCH_SIZE < files.length) {
						await new Promise(resolve => setTimeout(resolve, 1));
					}
				}

				if (errorCount > 0) {
					console.info(`[Notes Analytics] Word count analytics (${timeFrame}): ${processedFiles} files processed, ${errorCount} errors`);
				}

				// Calculate averages and cumulative data
				const sortedData = Array.from(dataMap.values()).sort((a, b) => a.date.localeCompare(b.date));
				let cumulativeWords = 0;
				let cumulativeFiles = 0;
				
				sortedData.forEach(item => {
					try {
						item.avgWordsPerFile = item.filesCreated > 0 ? Math.round(item.totalWords / item.filesCreated) : 0;
						cumulativeWords += Math.max(0, item.totalWords || 0);
						cumulativeFiles += Math.max(0, item.filesCreated || 0);
						item.cumulativeWords = cumulativeWords;
						item.cumulativeFiles = cumulativeFiles;
					} catch (error) {
						console.warn('[Notes Analytics] Error calculating cumulative data:', error.message);
						// Set safe defaults
						item.avgWordsPerFile = 0;
						item.cumulativeWords = cumulativeWords;
						item.cumulativeFiles = cumulativeFiles;
					}
				});

				return sortedData; // Return in ascending order (oldest to newest) for proper chart display
			} catch (error) {
				console.error('[Notes Analytics] Critical error in getWordCountAnalytics:', error);
				return [];
			}
		}, 10 * 60 * 1000); // Cache for 10 minutes
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
		const cacheKey = 'analytics-summary';
		
		return await this.getCachedAnalytics(cacheKey, async () => {
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
		}); // Close getCachedAnalytics call
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
			new Notice('Failed to export analytics data. Please check your file permissions.');
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
	private isLoading: boolean = false;
	private loadingOverlay: HTMLElement | null = null;

	constructor(app: App, plugin: NotesAnalyticsPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		
		// Apply the dashboard modal class to the modal container itself
		this.modalEl.addClass('analytics-dashboard-modal');
		
		// Set accessibility attributes
		this.modalEl.setAttribute('role', 'dialog');
		this.modalEl.setAttribute('aria-label', 'Analytics Dashboard');
		this.modalEl.setAttribute('aria-modal', 'true');
		contentEl.setAttribute('tabindex', '0');
		
		// Set the modal to full width and height
		this.modalEl.style.width = '100vw';
		this.modalEl.style.height = '100vh';
		this.modalEl.style.maxWidth = 'none';
		this.modalEl.style.maxHeight = 'none';
		this.modalEl.style.left = '0';
		this.modalEl.style.top = '0';
		this.modalEl.style.transform = 'none';
		this.modalEl.style.margin = '0';

		// Setup keyboard navigation
		this.setupKeyboardNavigation(contentEl);
		
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
		this.filtersContainer.setAttribute('role', 'group');
		this.filtersContainer.setAttribute('aria-label', 'Analytics filters');
		
		const filtersRow = this.filtersContainer.createDiv('filters-row');

		// Time frame filter
		const timeFrameDiv = filtersRow.createDiv('filter-group');
		const timeFrameLabel = timeFrameDiv.createEl('label', { text: 'Time Frame:' });
		const timeFrameSelect = timeFrameDiv.createEl('select', { cls: 'filter-select' });
		
		// Connect label to select
		const timeFrameId = 'timeframe-select';
		timeFrameSelect.setAttribute('id', timeFrameId);
		timeFrameLabel.setAttribute('for', timeFrameId);
		timeFrameSelect.setAttribute('aria-label', 'Select time frame for analytics');
		
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
		customDateDiv.setAttribute('role', 'group');
		customDateDiv.setAttribute('aria-label', 'Custom date range selection');
		
		const startLabel = customDateDiv.createEl('label', { text: 'From:' });
		const startDateInput = customDateDiv.createEl('input', { type: 'date', cls: 'date-input' });
		const startDateId = 'start-date-input';
		startDateInput.setAttribute('id', startDateId);
		startLabel.setAttribute('for', startDateId);
		startDateInput.setAttribute('aria-label', 'Start date for custom range');
		
		const endLabel = customDateDiv.createEl('label', { text: 'To:' });
		const endDateInput = customDateDiv.createEl('input', { type: 'date', cls: 'date-input' });
		const endDateId = 'end-date-input';
		endDateInput.setAttribute('id', endDateId);
		endLabel.setAttribute('for', endDateId);
		endDateInput.setAttribute('aria-label', 'End date for custom range');

		const applyDateBtn = customDateDiv.createEl('button', { text: 'Apply', cls: 'mod-cta' });
		applyDateBtn.setAttribute('aria-label', 'Apply custom date range filter');
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
		card.setAttribute('role', 'region');
		card.setAttribute('aria-label', `${metric.title} analytics card`);
		card.setAttribute('tabindex', '0');

		// Card header
		const header = card.createDiv('metric-header');
		const titleDiv = header.createDiv('metric-title-area');
		const titleEl = titleDiv.createEl('h3', { text: metric.title, cls: 'metric-title' });
		titleEl.setAttribute('id', `title-${metric.id}`);
		const descEl = titleDiv.createEl('p', { text: metric.description, cls: 'metric-description' });
		descEl.setAttribute('id', `desc-${metric.id}`);

		// Set aria-describedby for the card
		card.setAttribute('aria-describedby', `desc-${metric.id}`);

		// Chart type selector
		const chartTypeDiv = header.createDiv('chart-type-selector');
		chartTypeDiv.setAttribute('role', 'group');
		chartTypeDiv.setAttribute('aria-label', 'Chart type selection');
		
		metric.chartTypes.forEach((type: string, index: number) => {
			const btn = chartTypeDiv.createEl('button', { 
				text: type.charAt(0).toUpperCase() + type.slice(1),
				cls: index === 0 ? 'chart-type-btn active' : 'chart-type-btn'
			});
			btn.setAttribute('aria-pressed', index === 0 ? 'true' : 'false');
			btn.setAttribute('aria-label', `Show ${type} chart for ${metric.title}`);
			
			btn.onclick = () => {
				// Update ARIA states
				chartTypeDiv.querySelectorAll('.chart-type-btn').forEach(b => {
					b.removeClass('active');
					b.setAttribute('aria-pressed', 'false');
				});
				btn.addClass('active');
				btn.setAttribute('aria-pressed', 'true');
				
				this.renderMetricChart(metric.id, type);
			};
		});

		// Zoom button
		const zoomBtn = header.createEl('button', { text: '⛶', cls: 'zoom-btn', title: 'Zoom to full view' });
		zoomBtn.setAttribute('aria-label', `Zoom ${metric.title} chart to full view`);
		zoomBtn.onclick = () => this.zoomToChart(metric.id);

		// Chart container
		const chartContainer = card.createDiv('metric-chart-container');
		chartContainer.setAttribute('role', 'img');
		chartContainer.setAttribute('aria-label', `${metric.title} chart visualization`);
		
		const canvas = chartContainer.createEl('canvas', { cls: 'metric-chart' });
		canvas.width = 350;
		canvas.height = 200;
		canvas.setAttribute('aria-hidden', 'true'); // Canvas is decorative, container provides label

		// Create renderer
		const renderer = new ChartRenderer(canvas, 350, 200);
		this.chartRenderers.set(metric.id, renderer);

		return card;
	}

	private async renderMetricChart(metricId: string, chartType: string) {
		const renderer = this.chartRenderers.get(metricId);
		if (!renderer) return;

		// Add loading state to specific metric card
		const metricCard = this.metricsGrid.querySelector(`[data-metric="${metricId}"]`) as HTMLElement;
		if (metricCard) {
			this.setCardLoadingState(metricCard, true);
		}

		try {
			let data: any[] = [];
			let title = '';
			let color = '#007acc';

			// Get the metric configuration
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
			new Notice(`Failed to render ${metricId} chart. Please try refreshing the dashboard.`);
			console.error(`Error rendering ${metricId} chart:`, error);
			
			// Show error state in card
			if (metricCard) {
				this.setCardErrorState(metricCard, `Failed to load ${metricId} data`);
			}
		} finally {
			// Remove loading state
			if (metricCard) {
				this.setCardLoadingState(metricCard, false);
			}
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
		if (this.isLoading) return;
		
		this.setLoadingState(true);

		try {
			// Refresh all metric charts with individual loading states
			const metricCards = this.metricsGrid.querySelectorAll('.metric-card');
			
			// Create promises for parallel loading with staggered start
			const refreshPromises: Promise<void>[] = [];
			
			// Convert NodeList to Array for iteration
			Array.from(metricCards).forEach((card, index) => {
				const metricId = card.getAttribute('data-metric');
				const activeChartType = card.querySelector('.chart-type-btn.active')?.textContent?.toLowerCase() || 'line';
				
				if (metricId) {
					// Stagger the start of each chart refresh by 100ms for better UX
					const refreshPromise = new Promise<void>((resolve) => {
						setTimeout(async () => {
							try {
								await this.renderMetricChart(metricId, activeChartType);
							} catch (error) {
								console.error(`Error refreshing ${metricId}:`, error);
							} finally {
								resolve();
							}
						}, index * 100);
					});
					refreshPromises.push(refreshPromise);
				}
			});

			// Wait for all charts to complete
			await Promise.all(refreshPromises);

			// Show success message
			new Notice('Dashboard refreshed successfully!');
		} catch (error) {
			console.error('Error refreshing dashboard:', error);
			new Notice('Error refreshing dashboard data. Please try again.');
		} finally {
			this.setLoadingState(false);
		}
	}

	private setLoadingState(loading: boolean) {
		this.isLoading = loading;
		
		if (loading) {
			if (!this.loadingOverlay) {
				this.loadingOverlay = this.contentEl.createDiv('loading-overlay');
				this.loadingOverlay.innerHTML = `
					<div class="loading-spinner">
						<div class="spinner"></div>
						<p>Loading analytics data...</p>
					</div>
				`;
			}
			this.loadingOverlay.style.display = 'flex';
			this.metricsGrid.addClass('loading-blur');
		} else {
			if (this.loadingOverlay) {
				this.loadingOverlay.style.display = 'none';
			}
			this.metricsGrid.removeClass('loading-blur');
		}
	}

	/**
	 * Set loading state for individual metric cards
	 */
	private setCardLoadingState(card: HTMLElement, loading: boolean) {
		const chartContainer = card.querySelector('.metric-chart-container') as HTMLElement;
		if (!chartContainer) return;

		if (loading) {
			// Add loading spinner to the specific card
			let loadingSpinner = card.querySelector('.card-loading-spinner') as HTMLElement;
			if (!loadingSpinner) {
				loadingSpinner = chartContainer.createDiv('card-loading-spinner');
				loadingSpinner.innerHTML = `
					<div class="small-spinner"></div>
					<span>Loading...</span>
				`;
			}
			loadingSpinner.style.display = 'flex';
			chartContainer.addClass('loading-blur');
		} else {
			const loadingSpinner = card.querySelector('.card-loading-spinner') as HTMLElement;
			if (loadingSpinner) {
				loadingSpinner.style.display = 'none';
			}
			chartContainer.removeClass('loading-blur');
		}
	}

	/**
	 * Set error state for individual metric cards
	 */
	private setCardErrorState(card: HTMLElement, errorMessage: string) {
		const chartContainer = card.querySelector('.metric-chart-container') as HTMLElement;
		if (!chartContainer) return;

		// Remove any existing error message
		const existingError = card.querySelector('.card-error-message');
		if (existingError) {
			existingError.remove();
		}

		// Add error message
		const errorDiv = chartContainer.createDiv('card-error-message');
		errorDiv.innerHTML = `
			<div class="error-icon">⚠️</div>
			<div class="error-text">${errorMessage}</div>
			<button class="retry-btn" onclick="this.closest('.metric-card').dispatchEvent(new CustomEvent('retry'))">
				Retry
			</button>
		`;

		// Add retry functionality
		card.addEventListener('retry', () => {
			errorDiv.remove();
			const metricId = card.getAttribute('data-metric');
			const activeType = card.querySelector('.chart-type-btn.active')?.textContent?.toLowerCase() || 'line';
			if (metricId) {
				this.renderMetricChart(metricId, activeType);
			}
		});
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

	/**
	 * Setup keyboard navigation for accessibility
	 */
	private setupKeyboardNavigation(contentEl: HTMLElement): void {
		contentEl.addEventListener('keydown', (event: KeyboardEvent) => {
			switch (event.key) {
				case 'Escape':
					this.close();
					event.preventDefault();
					break;
				case 'Tab':
					this.handleTabNavigation(event);
					break;
				case 'Enter':
				case ' ':
					if (event.target instanceof HTMLElement) {
						const button = event.target.closest('button, .clickable');
						if (button instanceof HTMLElement) {
							button.click();
							event.preventDefault();
						}
					}
					break;
				case 'ArrowLeft':
				case 'ArrowRight':
					this.handleArrowNavigation(event);
					break;
				case 'r':
					if (event.ctrlKey) {
						this.refreshDashboard();
						event.preventDefault();
					}
					break;
			}
		});

		// Focus management
		contentEl.focus();
	}

	/**
	 * Handle tab navigation for focusable elements
	 */
	private handleTabNavigation(event: KeyboardEvent): void {
		const focusableElements = this.getFocusableElements();
		const currentIndex = focusableElements.indexOf(event.target as HTMLElement);
		
		if (currentIndex === -1) return;

		event.preventDefault();
		
		let nextIndex: number;
		if (event.shiftKey) {
			// Shift+Tab: go to previous element
			nextIndex = currentIndex > 0 ? currentIndex - 1 : focusableElements.length - 1;
		} else {
			// Tab: go to next element
			nextIndex = currentIndex < focusableElements.length - 1 ? currentIndex + 1 : 0;
		}

		focusableElements[nextIndex]?.focus();
	}

	/**
	 * Handle arrow key navigation for grid layouts
	 */
	private handleArrowNavigation(event: KeyboardEvent): void {
		const cards = Array.from(this.metricsGrid.querySelectorAll('.metric-card')) as HTMLElement[];
		const currentCard = event.target as HTMLElement;
		const currentIndex = cards.findIndex(card => card.contains(currentCard));
		
		if (currentIndex === -1) return;

		event.preventDefault();
		
		let nextIndex: number;
		if (event.key === 'ArrowLeft') {
			nextIndex = currentIndex > 0 ? currentIndex - 1 : cards.length - 1;
		} else {
			nextIndex = currentIndex < cards.length - 1 ? currentIndex + 1 : 0;
		}

		cards[nextIndex]?.focus();
	}

	/**
	 * Get all focusable elements in the modal
	 */
	private getFocusableElements(): HTMLElement[] {
		const selectors = [
			'button',
			'[href]',
			'input',
			'select',
			'textarea',
			'[tabindex]:not([tabindex="-1"])',
			'.metric-card'
		];
		
		return Array.from(this.contentEl.querySelectorAll(selectors.join(', '))) as HTMLElement[];
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
		
		// Set accessibility attributes
		this.modalEl.setAttribute('role', 'dialog');
		this.modalEl.setAttribute('aria-label', 'Chart Visualizations');
		this.modalEl.setAttribute('aria-modal', 'true');
		contentEl.setAttribute('tabindex', '0');
		
		// Set larger modal size
		this.modalEl.style.width = '98vw';
		this.modalEl.style.maxWidth = '1400px';
		this.modalEl.style.height = '95vh';
		this.modalEl.style.maxHeight = '900px';
		
		const titleEl = contentEl.createEl('h2', { text: 'Chart Visualizations' });
		titleEl.setAttribute('id', 'chart-modal-title');
		this.modalEl.setAttribute('aria-labelledby', 'chart-modal-title');

		// Create header with controls and export buttons
		const headerDiv = contentEl.createDiv('chart-header');
		
		// Chart controls on the left
		const selectorDiv = headerDiv.createDiv('chart-controls');
		selectorDiv.setAttribute('role', 'group');
		selectorDiv.setAttribute('aria-label', 'Chart configuration controls');
		
		const typeDiv = selectorDiv.createDiv('control-group');
		const typeLabel = typeDiv.createEl('label', { text: 'Chart Type: ' });
		const typeSelect = typeDiv.createEl('select');
		const typeSelectId = 'chart-type-select';
		typeSelect.setAttribute('id', typeSelectId);
		typeLabel.setAttribute('for', typeSelectId);
		typeSelect.setAttribute('aria-label', 'Select chart type');
		
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

			// Show loading message with progress indicator
			chartContainer.empty();
			const loadingContainer = chartContainer.createDiv('chart-loading-container');
			const loadingSpinner = loadingContainer.createDiv('chart-loading-spinner');
			loadingSpinner.innerHTML = `
				<div class="spinner-large"></div>
				<div class="loading-text">
					<h3>Generating Chart</h3>
					<p>Processing ${metric} data...</p>
					<div class="progress-bar">
						<div class="progress-fill" style="width: 0%"></div>
					</div>
				</div>
			`;

			// Simulate progress for user feedback
			const progressFill = loadingSpinner.querySelector('.progress-fill') as HTMLElement;
			const loadingText = loadingSpinner.querySelector('.loading-text p') as HTMLElement;
			
			const updateProgress = (percentage: number, message: string) => {
				if (progressFill) progressFill.style.width = `${percentage}%`;
				if (loadingText) loadingText.textContent = message;
			};

			try {
				updateProgress(10, 'Fetching data...');
				let chartData: { label: string; value: number }[] = [];

				// Handle different metric types
				if (metric === 'fileSizeDistribution') {
					updateProgress(30, 'Analyzing file sizes...');
					const fileSizeData = await this.plugin.getFileSizeDistribution();
					chartData = fileSizeData;
				} else if (metric === 'largestFiles') {
					updateProgress(30, 'Finding largest files...');
					const largestFilesData = await this.plugin.getLargestFiles(10);
					chartData = largestFilesData;
				} else if (metric === 'fileSizeGrowth') {
					updateProgress(30, 'Calculating growth trends...');
					const fileSizeGrowthData = await this.plugin.getFileSizeGrowthTrends();
					chartData = fileSizeGrowthData;
				} else if (metric === 'tagAnalytics') {
					updateProgress(30, 'Analyzing tags...');
					const tagData = await this.plugin.getTagAnalytics();
					chartData = tagData;
				} else if (metric === 'folderAnalytics') {
					updateProgress(30, 'Analyzing folders...');
					const folderData = await this.plugin.getFolderAnalytics();
					chartData = folderData;
				} else if (metric === 'writingGoals') {
					updateProgress(30, 'Calculating goal progress...');
					const goalsData = await this.plugin.getWritingGoalsProgress();
					chartData = goalsData;
				} else if (metric === 'comparisonMonth') {
					updateProgress(30, 'Comparing monthly data...');
					const comparisonData = await this.plugin.getComparisonData('month');
					chartData = this.formatComparisonData(comparisonData, 'Month');
				} else if (metric === 'comparisonWeek') {
					updateProgress(30, 'Comparing weekly data...');
					const comparisonData = await this.plugin.getComparisonData('week');
					chartData = this.formatComparisonData(comparisonData, 'Week');
				} else if (metric === 'comparisonYear') {
					updateProgress(30, 'Comparing yearly data...');
					const comparisonData = await this.plugin.getComparisonData('year');
					chartData = this.formatComparisonData(comparisonData, 'Year');
				} else if (metric === 'heatmapCalendar') {
					updateProgress(30, 'Building heatmap calendar...');
					const heatmapData = await this.plugin.getHeatmapCalendarData();
					chartData = heatmapData;
				} else {
					updateProgress(30, 'Processing analytics data...');
					// Standard word count analytics
					const data = await this.plugin.getWordCountAnalytics(timeFrame);
					if (data.length === 0) {
						chartContainer.removeChild(loadingContainer);
						chartContainer.createEl('p', { text: 'No data available for chart' });
						return;
					}
					chartData = data.filter(item => item.date && item.date !== 'undefined')
						.map(item => ({
							label: item.date,
							value: (item[metric as keyof WordCountData] as number) || 0
						}));
				}

				updateProgress(60, 'Preparing chart data...');
				
				if (chartData.length === 0) {
					chartContainer.removeChild(loadingContainer);
					const emptyState = chartContainer.createDiv('empty-state');
					emptyState.innerHTML = `
						<div class="empty-icon">📊</div>
						<h3>No Data Available</h3>
						<p>There's no data to display for the selected metric and time frame.</p>
						<button class="mod-cta" onclick="location.reload()">Refresh Data</button>
					`;
					return;
				}

				updateProgress(80, 'Rendering chart...');

				// Create canvas for chart with larger size
				const newCanvas = chartContainer.createEl('canvas', { 
					attr: { 
						id: 'analytics-chart',
						width: '1000',
						height: '500'
					} 
				});

				updateProgress(90, 'Finalizing visualization...');

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

				updateProgress(95, 'Applying final touches...');

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

				updateProgress(100, 'Complete!');

				// Remove loading container after a brief delay
				setTimeout(() => {
					if (chartContainer.contains(loadingContainer)) {
						chartContainer.removeChild(loadingContainer);
					}
				}, 500);

				// Configure export buttons in header
				if (this.plugin.settings.enableChartExport && exportPngBtn) {
					exportDiv.style.display = 'flex';
					
					exportPngBtn.onclick = () => {
						new Notice('Exporting chart as PNG...');
						renderer.exportToPNG(`${metric}-${timeFrame}-chart.png`);
					};
					exportSvgBtn.onclick = () => {
						new Notice('Exporting chart as SVG...');
						renderer.exportToSVG(`${metric}-${timeFrame}-chart.svg`);
					};
					copyBtn.onclick = () => {
						new Notice('Copying chart to clipboard...');
						renderer.copyToClipboard();
					};
					exportCsvBtn.onclick = () => {
						new Notice('Exporting data as CSV...');
						this.plugin.exportAnalyticsData(timeFrame, 'csv');
					};
					exportJsonBtn.onclick = () => {
						new Notice('Exporting data as JSON...');
						this.plugin.exportAnalyticsData(timeFrame, 'json');
					};
				}

			} catch (error) {
				if (chartContainer.contains(loadingContainer)) {
					chartContainer.removeChild(loadingContainer);
				}
				
				// Show error state
				const errorState = chartContainer.createDiv('error-state');
				errorState.innerHTML = `
					<div class="error-icon">⚠️</div>
					<h3>Error Loading Chart</h3>
					<p>Failed to load chart data: ${error.message}</p>
					<div class="error-actions">
						<button class="mod-cta retry-chart-btn">Retry</button>
						<button class="mod-muted report-error-btn">Report Issue</button>
					</div>
				`;

				const retryBtn = errorState.querySelector('.retry-chart-btn') as HTMLButtonElement;
				const reportBtn = errorState.querySelector('.report-error-btn') as HTMLButtonElement;
				
				retryBtn.onclick = () => {
					chartContainer.removeChild(errorState);
					updateChart();
				};
				
				reportBtn.onclick = () => {
					new Notice('Error details copied to clipboard');
					navigator.clipboard.writeText(`Chart Error: ${error.message}\nMetric: ${metric}\nTimeFrame: ${timeFrame}\nChartType: ${chartType}`);
				};

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
