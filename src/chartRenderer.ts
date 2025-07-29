import { Notice } from 'obsidian';

export interface TooltipData {
	x: number;
	y: number;
	label: string;
	value: number;
	visible: boolean;
}

export class ChartRenderer {
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private width: number;
	private height: number;
	private padding = { top: 40, right: 40, bottom: 60, left: 80 };
	private tooltip: HTMLElement;
	private currentData: { label: string; value: number }[] = [];
	private dataPoints: Array<{x: number, y: number, label: string, value: number}> = [];

	constructor(canvas: HTMLCanvasElement, width: number = 1000, height: number = 500) {
		this.canvas = canvas;
		this.canvas.width = width;
		this.canvas.height = height;
		this.width = width;
		this.height = height;
		this.ctx = canvas.getContext('2d')!;
		this.setupTooltip();
		this.setupMouseEvents();
	}

	private setupTooltip() {
		this.tooltip = document.createElement('div');
		this.tooltip.className = 'chart-tooltip';
		this.tooltip.style.cssText = `
			position: absolute;
			background: rgba(0, 0, 0, 0.8);
			color: white;
			padding: 8px 12px;
			border-radius: 4px;
			font-size: 12px;
			pointer-events: none;
			z-index: 1000;
			display: none;
			font-family: var(--font-interface);
		`;
		document.body.appendChild(this.tooltip);
	}

	private setupMouseEvents() {
		this.canvas.addEventListener('mousemove', (event) => {
			const rect = this.canvas.getBoundingClientRect();
			const x = event.clientX - rect.left;
			const y = event.clientY - rect.top;
			
			this.handleMouseMove(x, y, event.clientX, event.clientY);
		});

		this.canvas.addEventListener('mouseleave', () => {
			this.hideTooltip();
		});
	}

	private handleMouseMove(canvasX: number, canvasY: number, screenX: number, screenY: number) {
		let nearestPoint = null;
		let minDistance = Infinity;

		for (const point of this.dataPoints) {
			const distance = Math.sqrt(
				Math.pow(canvasX - point.x, 2) + Math.pow(canvasY - point.y, 2)
			);
			
			if (distance < minDistance && distance < 20) { // 20px hover radius
				minDistance = distance;
				nearestPoint = point;
			}
		}

		if (nearestPoint) {
			this.showTooltip(nearestPoint.label, nearestPoint.value, screenX, screenY);
			this.canvas.style.cursor = 'pointer';
		} else {
			this.hideTooltip();
			this.canvas.style.cursor = 'default';
		}
	}

	private showTooltip(label: string, value: number, x: number, y: number) {
		this.tooltip.textContent = `${label}: ${value.toLocaleString()}`;
		this.tooltip.style.display = 'block';
		this.tooltip.style.left = `${x + 10}px`;
		this.tooltip.style.top = `${y - 30}px`;
	}

	private hideTooltip() {
		this.tooltip.style.display = 'none';
	}

	private getChartArea() {
		return {
			x: this.padding.left,
			y: this.padding.top,
			width: this.width - this.padding.left - this.padding.right,
			height: this.height - this.padding.top - this.padding.bottom
		};
	}

	renderLineChart(data: { label: string; value: number }[], title: string, color: string = '#007acc') {
		this.currentData = data;
		this.dataPoints = [];
		const { ctx } = this;
		const chartArea = this.getChartArea();

		// Clear canvas
		ctx.clearRect(0, 0, this.width, this.height);

		if (data.length === 0) {
			this.showNoDataMessage();
			return;
		}

		// Draw title
		this.drawTitle(title);

		const maxValue = Math.max(...data.map(d => d.value));

		if (data.length === 1) {
			// Single point
			const x = chartArea.x + chartArea.width / 2;
			const y = chartArea.y + chartArea.height - (data[0].value / maxValue * chartArea.height);
			ctx.fillStyle = color;
			ctx.beginPath();
			ctx.arc(x, y, 6, 0, Math.PI * 2);
			ctx.fill();
			
			// Store data point for tooltip
			this.dataPoints.push({ x, y, label: data[0].label, value: data[0].value });
			return;
		}

		// Draw line
		const stepX = chartArea.width / (data.length - 1);
		ctx.strokeStyle = color;
		ctx.lineWidth = 3;
		ctx.beginPath();

		data.forEach((point, i) => {
			const x = chartArea.x + (i * stepX);
			const y = chartArea.y + chartArea.height - (point.value / maxValue * chartArea.height);
			
			// Store data point for tooltip
			this.dataPoints.push({ x, y, label: point.label, value: point.value });
			
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
		ctx.clearRect(0, 0, this.width, this.height); canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private width: number;
	private height: number;
	private padding = { top: 40, right: 40, bottom: 60, left: 80 };
	private tooltip: HTMLElement;
	private currentData: { label: string; value: number }[] = [];

	constructor(canvas: HTMLCanvasElement, width: number = 1000, height: number = 500) {
		this.canvas = canvas;
		this.canvas.width = width;
		this.canvas.height = height;
		this.width = width;
		this.height = height;
		this.ctx = canvas.getContext('2d')!;
		this.setupTooltip();
		this.setupMouseEvents();
	}

	private getChartArea() {
		return {
			x: this.padding.left,
			y: this.padding.top,
			width: this.width - this.padding.left - this.padding.right,
			height: this.height - this.padding.top - this.padding.bottom
		};
	}

	private drawAxes(maxValue: number, data: { label: string; value: number }[]) {
		const { ctx } = this;
		const chartArea = this.getChartArea();

		// Draw axes
		ctx.strokeStyle = 'var(--text-muted)';
		ctx.lineWidth = 1;
		
		// Y-axis
		ctx.beginPath();
		ctx.moveTo(chartArea.x, chartArea.y);
		ctx.lineTo(chartArea.x, chartArea.y + chartArea.height);
		ctx.stroke();

		// X-axis
		ctx.beginPath();
		ctx.moveTo(chartArea.x, chartArea.y + chartArea.height);
		ctx.lineTo(chartArea.x + chartArea.width, chartArea.y + chartArea.height);
		ctx.stroke();

		// Y-axis labels
		ctx.fillStyle = 'var(--text-muted)';
		ctx.font = '12px var(--font-interface)';
		ctx.textAlign = 'right';
		for (let i = 0; i <= 5; i++) {
			const y = chartArea.y + (chartArea.height / 5) * i;
			const value = Math.round(maxValue * (5 - i) / 5);
			ctx.fillText(value.toString(), chartArea.x - 10, y + 4);
		}

		// X-axis labels
		ctx.textAlign = 'center';
		data.forEach((point, i) => {
			const x = chartArea.x + (i * chartArea.width / (data.length - 1));
			ctx.fillText(point.label, x, chartArea.y + chartArea.height + 20);
		});
	}

	renderLineChart(data: { label: string; value: number }[], title: string, color: string = '#007acc') {
		this.currentData = data;
		const { ctx } = this;
		const chartArea = this.getChartArea();

		// Clear canvas
		ctx.clearRect(0, 0, this.width, this.height);

		if (data.length === 0) {
			this.showNoDataMessage();
			return;
		}

		// Draw title
		this.drawTitle(title);

		const maxValue = Math.max(...data.map(d => d.value));
		this.drawAxes(maxValue, data);

		if (data.length === 1) {
			// Single point
			const x = chartArea.x + chartArea.width / 2;
			const y = chartArea.y + chartArea.height - (data[0].value / maxValue * chartArea.height);
			ctx.fillStyle = color;
			ctx.beginPath();
			ctx.arc(x, y, 6, 0, Math.PI * 2);
			ctx.fill();
			return;
		}

		// Draw line
		const stepX = chartArea.width / (data.length - 1);
		ctx.strokeStyle = color;
		ctx.lineWidth = 3;
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
			this.showNoDataMessage();
			return;
		}

		// Draw title
		this.drawTitle(title);

		const maxValue = Math.max(...data.map(d => d.value));

		// Draw grid lines
		ctx.strokeStyle = 'var(--background-modifier-border)';
		ctx.lineWidth = 1;
		for (let i = 0; i <= 5; i++) {
			const y = chartArea.y + (chartArea.height / 5) * i;
			ctx.beginPath();
			ctx.moveTo(chartArea.x, y);
			ctx.lineTo(chartArea.x + chartArea.width, y);
			ctx.stroke();
		}

		// Y-axis labels
		ctx.fillStyle = 'var(--text-muted)';
		ctx.font = '12px var(--font-interface)';
		ctx.textAlign = 'right';
		for (let i = 0; i <= 5; i++) {
			const y = chartArea.y + (chartArea.height / 5) * i;
			const value = Math.round(maxValue * (5 - i) / 5);
			ctx.fillText(value.toString(), chartArea.x - 10, y + 4);
		}

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

			// X-axis labels
			ctx.fillStyle = 'var(--text-muted)';
			ctx.font = '12px var(--font-interface)';
			ctx.textAlign = 'center';
			ctx.fillText(point.label, x + barWidth / 2, chartArea.y + chartArea.height + 20);

			// Value labels on bars
			if (barHeight > 20) {
				ctx.fillStyle = 'white';
				ctx.font = '12px var(--font-interface)';
				ctx.textAlign = 'center';
				ctx.fillText(point.value.toString(), x + barWidth / 2, y + 15);
			}
		});
	}

	renderAreaChart(data: { label: string; value: number }[], title: string, color: string = '#007acc') {
		const { ctx } = this;
		const chartArea = this.getChartArea();

		// Clear canvas
		ctx.clearRect(0, 0, this.width, this.height);

		if (data.length === 0) {
			this.showNoDataMessage();
			return;
		}

		// Draw title
		this.drawTitle(title);

		const maxValue = Math.max(...data.map(d => d.value));
		this.drawAxes(maxValue, data);

		if (data.length === 1) {
			// Single point as a bar
			const x = chartArea.x + chartArea.width / 2 - 10;
			const barHeight = data[0].value / maxValue * chartArea.height;
			const y = chartArea.y + chartArea.height - barHeight;
			
			ctx.fillStyle = color + '80';
			ctx.fillRect(x, y, 20, barHeight);
			return;
		}

		// Create area path
		const stepX = chartArea.width / (data.length - 1);
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
		gradient.addColorStop(0, color + '80');
		gradient.addColorStop(1, color + '20');
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

	renderPieChart(data: { label: string; value: number }[], title: string, colors: string[] = ['#007acc', '#28a745', '#dc3545', '#ffc107', '#6f42c1', '#fd7e14']) {
		const { ctx } = this;
		const chartArea = this.getChartArea();

		// Clear canvas
		ctx.clearRect(0, 0, this.width, this.height);

		if (data.length === 0) {
			this.showNoDataMessage();
			return;
		}

		// Draw title
		this.drawTitle(title);

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

	private drawTitle(title: string) {
		this.ctx.fillStyle = 'var(--text-normal)';
		this.ctx.font = 'bold 16px var(--font-interface)';
		this.ctx.textAlign = 'center';
		this.ctx.fillText(title, this.width / 2, 25);
	}

	private showNoDataMessage() {
		this.ctx.fillStyle = 'var(--text-muted)';
		this.ctx.font = '16px var(--font-interface)';
		this.ctx.textAlign = 'center';
		this.ctx.fillText('No data available', this.width / 2, this.height / 2);
	}

	// Export methods
	exportToPNG(filename: string = 'chart.png') {
		const link = document.createElement('a');
		link.download = filename;
		link.href = this.canvas.toDataURL('image/png');
		link.click();
	}

	exportToSVG(filename: string = 'chart.svg') {
		const svgData = this.canvasToSVG();
		const blob = new Blob([svgData], { type: 'image/svg+xml' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = filename;
		link.click();
		URL.revokeObjectURL(url);
	}

	async copyToClipboard() {
		try {
			const blob = await new Promise<Blob>((resolve) => {
				this.canvas.toBlob((blob) => {
					resolve(blob!);
				}, 'image/png');
			});

			if (navigator.clipboard && window.ClipboardItem) {
				const item = new ClipboardItem({ 'image/png': blob });
				await navigator.clipboard.write([item]);
				new Notice('Chart copied to clipboard!');
			} else {
				const dataURL = this.canvas.toDataURL('image/png');
				await navigator.clipboard.writeText(dataURL);
				new Notice('Chart data URL copied to clipboard!');
			}
		} catch (error) {
			new Notice('Failed to copy chart to clipboard');
			console.error('Clipboard error:', error);
		}
	}

	private canvasToSVG(): string {
		const imageData = this.canvas.toDataURL();
		return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
     width="${this.width}" height="${this.height}" viewBox="0 0 ${this.width} ${this.height}">
  <image x="0" y="0" width="${this.width}" height="${this.height}" xlink:href="${imageData}"/>
</svg>`;
	}

	private setupTooltip() {
		this.tooltip = document.createElement('div');
		this.tooltip.className = 'chart-tooltip';
		this.tooltip.style.position = 'absolute';
		this.tooltip.style.background = 'var(--background-primary)';
		this.tooltip.style.border = '1px solid var(--background-modifier-border)';
		this.tooltip.style.borderRadius = '4px';
		this.tooltip.style.padding = '8px';
		this.tooltip.style.fontSize = '12px';
		this.tooltip.style.fontFamily = 'var(--font-interface)';
		this.tooltip.style.pointerEvents = 'none';
		this.tooltip.style.opacity = '0';
		this.tooltip.style.transition = 'opacity 0.2s';
		this.tooltip.style.zIndex = '1000';
		this.tooltip.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
		document.body.appendChild(this.tooltip);
	}

	private setupMouseEvents() {
		this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
		this.canvas.addEventListener('mouseleave', () => this.hideTooltip());
	}

	private handleMouseMove(e: MouseEvent) {
		const rect = this.canvas.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		const dataPoint = this.getDataPointAtPosition(x, y);
		if (dataPoint) {
			this.showTooltip(e.clientX, e.clientY, dataPoint);
		} else {
			this.hideTooltip();
		}
	}

	private getDataPointAtPosition(x: number, y: number): { label: string; value: number } | null {
		if (this.currentData.length === 0) return null;

		const chartArea = this.getChartArea();
		const stepX = chartArea.width / Math.max(1, this.currentData.length - 1);
		const maxValue = Math.max(...this.currentData.map(d => d.value));

		for (let i = 0; i < this.currentData.length; i++) {
			const pointX = chartArea.x + (i * stepX);
			const pointY = chartArea.y + chartArea.height - (this.currentData[i].value / maxValue * chartArea.height);

			// Check if mouse is within 10 pixels of the data point
			if (Math.abs(x - pointX) <= 10 && Math.abs(y - pointY) <= 10) {
				return this.currentData[i];
			}
		}

		return null;
	}

	private showTooltip(x: number, y: number, dataPoint: { label: string; value: number }) {
		this.tooltip.innerHTML = `
			<div style="font-weight: bold;">${dataPoint.label}</div>
			<div>Value: ${dataPoint.value.toLocaleString()}</div>
		`;
		this.tooltip.style.left = (x + 10) + 'px';
		this.tooltip.style.top = (y - 10) + 'px';
		this.tooltip.style.opacity = '1';
	}

	private hideTooltip() {
		this.tooltip.style.opacity = '0';
	}

	destroy() {
		if (this.tooltip && this.tooltip.parentNode) {
			this.tooltip.parentNode.removeChild(this.tooltip);
		}
		this.canvas.removeEventListener('mousemove', (e) => this.handleMouseMove(e));
		this.canvas.removeEventListener('mouseleave', () => this.hideTooltip());
	}
}
