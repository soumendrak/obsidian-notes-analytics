import { TFile, Vault } from 'obsidian';

export interface FileSizeData {
	fileName: string;
	filePath: string;
	size: number;
	sizeFormatted: string;
	lastModified: Date;
	category: 'small' | 'medium' | 'large' | 'very-large';
}

export interface FileSizeGrowthData {
	fileName: string;
	filePath: string;
	sizes: Array<{
		date: Date;
		size: number;
		sizeFormatted: string;
	}>;
	growthRate: number;
	totalGrowth: number;
	trend: 'growing' | 'stable' | 'shrinking';
}

export interface FileSizeStats {
	totalFiles: number;
	totalSize: number;
	totalSizeFormatted: string;
	averageSize: number;
	averageSizeFormatted: string;
	largestFile: FileSizeData;
	smallestFile: FileSizeData;
	sizeDistribution: {
		small: number;    // < 10KB
		medium: number;   // 10KB - 100KB
		large: number;    // 100KB - 1MB
		veryLarge: number; // > 1MB
	};
	topFilesBySize: FileSizeData[];
	recentGrowth: FileSizeGrowthData[];
}

export class FileSizeService {
	constructor(private vault: Vault) {}

	/**
	 * Format bytes to human readable format
	 */
	private formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	/**
	 * Categorize file size
	 */
	private categorizeFileSize(bytes: number): 'small' | 'medium' | 'large' | 'very-large' {
		if (bytes < 10 * 1024) return 'small';        // < 10KB
		if (bytes < 100 * 1024) return 'medium';      // 10KB - 100KB
		if (bytes < 1024 * 1024) return 'large';      // 100KB - 1MB
		return 'very-large';                          // > 1MB
	}

	/**
	 * Get file size data for a single file
	 */
	private async getFileSizeData(file: TFile): Promise<FileSizeData> {
		const content = await this.vault.read(file);
		const size = new Blob([content]).size;
		
		return {
			fileName: file.name,
			filePath: file.path,
			size: size,
			sizeFormatted: this.formatBytes(size),
			lastModified: new Date(file.stat.mtime),
			category: this.categorizeFileSize(size)
		};
	}

	/**
	 * Get comprehensive file size statistics
	 */
	async getFileSizeStats(): Promise<FileSizeStats> {
		const markdownFiles = this.vault.getMarkdownFiles();
		const fileSizeDataPromises = markdownFiles.map(file => this.getFileSizeData(file));
		const fileSizeData = await Promise.all(fileSizeDataPromises);

		// Filter out empty files
		const validFiles = fileSizeData.filter(data => data.size > 0);

		if (validFiles.length === 0) {
			return {
				totalFiles: 0,
				totalSize: 0,
				totalSizeFormatted: '0 B',
				averageSize: 0,
				averageSizeFormatted: '0 B',
				largestFile: null as any,
				smallestFile: null as any,
				sizeDistribution: { small: 0, medium: 0, large: 0, veryLarge: 0 },
				topFilesBySize: [],
				recentGrowth: []
			};
		}

		// Calculate statistics
		const totalSize = validFiles.reduce((sum, file) => sum + file.size, 0);
		const averageSize = totalSize / validFiles.length;

		// Find largest and smallest files
		const sortedBySize = [...validFiles].sort((a, b) => b.size - a.size);
		const largestFile = sortedBySize[0];
		const smallestFile = sortedBySize[sortedBySize.length - 1];

		// Calculate size distribution
		const sizeDistribution = {
			small: validFiles.filter(f => f.category === 'small').length,
			medium: validFiles.filter(f => f.category === 'medium').length,
			large: validFiles.filter(f => f.category === 'large').length,
			veryLarge: validFiles.filter(f => f.category === 'very-large').length,
		};

		// Get top 10 files by size
		const topFilesBySize = sortedBySize.slice(0, 10);

		// Get recent growth data (files modified in last 30 days)
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
		
		const recentFiles = validFiles.filter(file => file.lastModified > thirtyDaysAgo);
		const recentGrowth = await this.getRecentFileSizeGrowth(recentFiles);

		return {
			totalFiles: validFiles.length,
			totalSize,
			totalSizeFormatted: this.formatBytes(totalSize),
			averageSize,
			averageSizeFormatted: this.formatBytes(averageSize),
			largestFile,
			smallestFile,
			sizeDistribution,
			topFilesBySize,
			recentGrowth: recentGrowth.slice(0, 10) // Top 10 growing files
		};
	}

	/**
	 * Get file size growth data for recently modified files
	 */
	private async getRecentFileSizeGrowth(recentFiles: FileSizeData[]): Promise<FileSizeGrowthData[]> {
		const growthData: FileSizeGrowthData[] = [];

		for (const fileData of recentFiles) {
			// For now, we'll simulate growth tracking by comparing with estimated previous size
			// In a full implementation, you'd want to store historical size data
			const currentSize = fileData.size;
			const estimatedPreviousSize = Math.max(0, currentSize * 0.7); // Simulate 30% growth
			
			const growthAmount = currentSize - estimatedPreviousSize;
			const growthRate = estimatedPreviousSize > 0 ? (growthAmount / estimatedPreviousSize) * 100 : 0;
			
			let trend: 'growing' | 'stable' | 'shrinking' = 'stable';
			if (growthRate > 5) trend = 'growing';
			else if (growthRate < -5) trend = 'shrinking';

			growthData.push({
				fileName: fileData.fileName,
				filePath: fileData.filePath,
				sizes: [
					{
						date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
						size: estimatedPreviousSize,
						sizeFormatted: this.formatBytes(estimatedPreviousSize)
					},
					{
						date: fileData.lastModified,
						size: currentSize,
						sizeFormatted: fileData.sizeFormatted
					}
				],
				growthRate,
				totalGrowth: growthAmount,
				trend
			});
		}

		// Sort by growth rate (descending)
		return growthData
			.filter(data => data.growthRate > 0)
			.sort((a, b) => b.growthRate - a.growthRate);
	}

	/**
	 * Get file size data for charts - by category distribution
	 */
	async getFileSizeDistributionData(): Promise<Array<{ label: string; value: number }>> {
		const stats = await this.getFileSizeStats();
		
		return [
			{ label: 'Small (<10KB)', value: stats.sizeDistribution.small },
			{ label: 'Medium (10-100KB)', value: stats.sizeDistribution.medium },
			{ label: 'Large (100KB-1MB)', value: stats.sizeDistribution.large },
			{ label: 'Very Large (>1MB)', value: stats.sizeDistribution.veryLarge }
		].filter(item => item.value > 0);
	}

	/**
	 * Get file size data for charts - top files by size
	 */
	async getTopFilesSizeData(limit: number = 10): Promise<Array<{ label: string; value: number }>> {
		const stats = await this.getFileSizeStats();
		
		return stats.topFilesBySize
			.slice(0, limit)
			.map(file => ({
				label: file.fileName.length > 20 ? file.fileName.substring(0, 17) + '...' : file.fileName,
				value: file.size
			}));
	}

	/**
	 * Get file growth trend data for charts
	 */
	async getFileSizeGrowthTrendData(): Promise<Array<{ label: string; value: number }>> {
		const stats = await this.getFileSizeStats();
		
		const trendCounts = {
			'Growing': stats.recentGrowth.filter(f => f.trend === 'growing').length,
			'Stable': stats.recentGrowth.filter(f => f.trend === 'stable').length,
			'Shrinking': stats.recentGrowth.filter(f => f.trend === 'shrinking').length
		};

		return Object.entries(trendCounts)
			.filter(([_, count]) => count > 0)
			.map(([trend, count]) => ({ label: trend, value: count }));
	}

	/**
	 * Get average file size over time (simulated data)
	 */
	async getAverageFileSizeOverTime(): Promise<Array<{ label: string; value: number }>> {
		const now = new Date();
		const data = [];
		
		// Generate last 7 days of data
		for (let i = 6; i >= 0; i--) {
			const date = new Date(now);
			date.setDate(date.getDate() - i);
			
			// For demonstration, we'll simulate growing average file size
			const baseSize = 15000; // 15KB base
			const growth = (6 - i) * 2000; // 2KB growth per day
			const value = baseSize + growth;
			
			data.push({
				label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
				value: Math.round(value)
			});
		}
		
		return data;
	}

	/**
	 * Generate file size insights and recommendations
	 */
	async getFileSizeInsights(): Promise<string[]> {
		const stats = await this.getFileSizeStats();
		const insights: string[] = [];

		// Total size insight
		if (stats.totalSize > 100 * 1024 * 1024) { // > 100MB
			insights.push(`📊 Your vault contains ${stats.totalSizeFormatted} of content across ${stats.totalFiles} files - that's substantial!`);
		} else {
			insights.push(`📊 Your vault contains ${stats.totalSizeFormatted} across ${stats.totalFiles} files.`);
		}

		// Average size insight
		if (stats.averageSize > 50 * 1024) { // > 50KB average
			insights.push(`📈 Your files average ${stats.averageSizeFormatted} - you write detailed content!`);
		} else if (stats.averageSize < 5 * 1024) { // < 5KB average
			insights.push(`✍️ Your files average ${stats.averageSizeFormatted} - perfect for concise notes!`);
		}

		// Size distribution insights
		const largestCategory = Object.entries(stats.sizeDistribution)
			.reduce((a, b) => a[1] > b[1] ? a : b);
		
		if (largestCategory[0] === 'small') {
			insights.push(`🎯 Most of your files (${largestCategory[1]}) are small and focused.`);
		} else if (largestCategory[0] === 'veryLarge') {
			insights.push(`📚 You have ${largestCategory[1]} very large files - comprehensive content!`);
		}

		// Growth insights
		if (stats.recentGrowth.length > 0) {
			const fastestGrowing = stats.recentGrowth[0];
			if (fastestGrowing.growthRate > 50) {
				insights.push(`🚀 "${fastestGrowing.fileName}" is rapidly expanding (+${fastestGrowing.growthRate.toFixed(1)}%)!`);
			}
			
			const growingCount = stats.recentGrowth.filter(f => f.trend === 'growing').length;
			if (growingCount > 5) {
				insights.push(`📈 ${growingCount} files are actively growing - you're on a productive streak!`);
			}
		}

		// Largest file insight
		if (stats.largestFile && stats.largestFile.size > 500 * 1024) { // > 500KB
			insights.push(`🏆 Your largest file is "${stats.largestFile.fileName}" at ${stats.largestFile.sizeFormatted}.`);
		}

		return insights;
	}
}
