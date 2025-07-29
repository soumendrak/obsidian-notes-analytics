import { TFile, moment } from 'obsidian';
import { WordCountData, FileCreationData, AnalyticsSummary, TimeFilter } from './types';
import { StreakService } from './streakService';
import { FileSizeService } from './fileSizeService';

export class DataService {
	private app: any;
	private streakService: StreakService;
	private fileSizeService: FileSizeService;

	constructor(app: any) {
		this.app = app;
		this.streakService = new StreakService(app);
		this.fileSizeService = new FileSizeService(app.vault);
	}

	async getFileCreationData(timeFilter: TimeFilter, customStart?: string, customEnd?: string): Promise<FileCreationData[]> {
		const files = this.app.vault.getMarkdownFiles();
		const creationData: { [key: string]: number } = {};

		const now = moment();
		let startDate: moment.Moment;

		if (timeFilter === 'custom' && customStart && customEnd) {
			startDate = moment(customStart);
		} else {
			switch (timeFilter) {
				case 'daily':
					startDate = now.clone().subtract(30, 'days');
					break;
				case 'weekly':
					startDate = now.clone().subtract(12, 'weeks');
					break;
				case 'monthly':
					startDate = now.clone().subtract(12, 'months');
					break;
				case 'yearly':
					startDate = now.clone().subtract(5, 'years');
					break;
				default:
					startDate = now.clone().subtract(30, 'days');
			}
		}

		for (const file of files) {
			const createdDate = moment(file.stat.ctime);
			if (createdDate.isAfter(startDate)) {
				let key: string;
				
				switch (timeFilter) {
					case 'daily':
						key = createdDate.format('MMM DD');
						break;
					case 'weekly':
						key = `Week ${createdDate.format('WW YYYY')}`;
						break;
					case 'monthly':
						key = createdDate.format('MMM YYYY');
						break;
					case 'yearly':
						key = createdDate.format('YYYY');
						break;
					case 'custom':
						if (customStart && customEnd) {
							const duration = moment(customEnd).diff(moment(customStart), 'days');
							if (duration <= 31) {
								key = createdDate.format('MMM DD');
							} else if (duration <= 365) {
								key = createdDate.format('MMM YYYY');
							} else {
								key = createdDate.format('YYYY');
							}
						} else {
							key = createdDate.format('MMM DD');
						}
						break;
					default:
						key = createdDate.format('MMM DD');
				}
				
				creationData[key] = (creationData[key] || 0) + 1;
			}
		}

		return Object.entries(creationData)
			.map(([label, count]) => ({ label, count }))
			.sort((a, b) => {
				const dateA = this.parseLabel(a.label, timeFilter);
				const dateB = this.parseLabel(b.label, timeFilter);
				return dateA.valueOf() - dateB.valueOf();
			})
			.map((item, index, array) => {
				// Calculate cumulative count
				const cumulative = array.slice(0, index + 1).reduce((sum, curr) => sum + curr.count, 0);
				return { ...item, cumulative };
			});
	}

	async getWordCountData(timeFilter: TimeFilter, customStart?: string, customEnd?: string): Promise<WordCountData[]> {
		const files = this.app.vault.getMarkdownFiles();
		const wordCountData: { [key: string]: number } = {};

		const now = moment();
		let startDate: moment.Moment;

		if (timeFilter === 'custom' && customStart && customEnd) {
			startDate = moment(customStart);
		} else {
			switch (timeFilter) {
				case 'daily':
					startDate = now.clone().subtract(30, 'days');
					break;
				case 'weekly':
					startDate = now.clone().subtract(12, 'weeks');
					break;
				case 'monthly':
					startDate = now.clone().subtract(12, 'months');
					break;
				case 'yearly':
					startDate = now.clone().subtract(5, 'years');
					break;
				default:
					startDate = now.clone().subtract(30, 'days');
			}
		}

		for (const file of files) {
			const modifiedDate = moment(file.stat.mtime);
			if (modifiedDate.isAfter(startDate)) {
				const content = await this.app.vault.read(file);
				const wordCount = this.countWords(content);
				
				let key: string;
				
				switch (timeFilter) {
					case 'daily':
						key = modifiedDate.format('MMM DD');
						break;
					case 'weekly':
						key = `Week ${modifiedDate.format('WW YYYY')}`;
						break;
					case 'monthly':
						key = modifiedDate.format('MMM YYYY');
						break;
					case 'yearly':
						key = modifiedDate.format('YYYY');
						break;
					case 'custom':
						if (customStart && customEnd) {
							const duration = moment(customEnd).diff(moment(customStart), 'days');
							if (duration <= 31) {
								key = modifiedDate.format('MMM DD');
							} else if (duration <= 365) {
								key = modifiedDate.format('MMM YYYY');
							} else {
								key = modifiedDate.format('YYYY');
							}
						} else {
							key = modifiedDate.format('MMM DD');
						}
						break;
					default:
						key = modifiedDate.format('MMM DD');
				}
				
				wordCountData[key] = (wordCountData[key] || 0) + wordCount;
			}
		}

		return Object.entries(wordCountData)
			.map(([label, words]) => ({ label, words }))
			.sort((a, b) => {
				const dateA = this.parseLabel(a.label, timeFilter);
				const dateB = this.parseLabel(b.label, timeFilter);
				return dateA.valueOf() - dateB.valueOf();
			});
	}

	async getAnalyticsSummary(): Promise<AnalyticsSummary> {
		const files = this.app.vault.getMarkdownFiles();
		let totalWords = 0;
		let totalFiles = files.length;
		
		// Calculate total word count
		for (const file of files) {
			const content = await this.app.vault.read(file);
			totalWords += this.countWords(content);
		}

		// Files created today
		const today = moment().startOf('day');
		const filesToday = files.filter((file: TFile) => 
			moment(file.stat.ctime).isAfter(today)
		).length;

		// Files created this week
		const weekStart = moment().startOf('week');
		const filesThisWeek = files.filter((file: TFile) => 
			moment(file.stat.ctime).isAfter(weekStart)
		).length;

		// Files created this month
		const monthStart = moment().startOf('month');
		const filesThisMonth = files.filter((file: TFile) => 
			moment(file.stat.ctime).isAfter(monthStart)
		).length;

		// Average words per file
		const avgWordsPerFile = totalFiles > 0 ? Math.round(totalWords / totalFiles) : 0;

		// Most active day (day with most file creations)
		const dayActivity: { [key: string]: number } = {};
		files.forEach((file: TFile) => {
			const day = moment(file.stat.ctime).format('dddd');
			dayActivity[day] = (dayActivity[day] || 0) + 1;
		});
		
		const mostActiveDay = Object.entries(dayActivity)
			.sort(([,a], [,b]) => b - a)[0]?.[0] || 'No data';

		// Get streak data
		const streakData = await this.streakService.getWritingStreak();

		return {
			totalFiles,
			totalWords,
			filesToday,
			filesThisWeek,
			filesThisMonth,
			avgWordsPerFile,
			mostActiveDay,
			currentStreak: streakData.currentStreak,
			longestStreak: streakData.longestStreak
		};
	}

	async exportToCSV(data: FileCreationData[] | WordCountData[], type: 'files' | 'words', filename?: string): Promise<void> {
		let csvContent = '';
		
		if (type === 'files') {
			csvContent = 'Date,Files Created\n';
			(data as FileCreationData[]).forEach(item => {
				csvContent += `"${item.label}",${item.count}\n`;
			});
		} else {
			csvContent = 'Date,Word Count\n';
			(data as WordCountData[]).forEach(item => {
				csvContent += `"${item.label}",${item.words}\n`;
			});
		}

		const blob = new Blob([csvContent], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = filename || `${type}-analytics.csv`;
		link.click();
		URL.revokeObjectURL(url);
	}

	async exportToJSON(data: FileCreationData[] | WordCountData[], type: 'files' | 'words', filename?: string): Promise<void> {
		const jsonData = {
			type: type === 'files' ? 'File Creation Analytics' : 'Word Count Analytics',
			exportDate: moment().format('YYYY-MM-DD HH:mm:ss'),
			data: data
		};

		const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = filename || `${type}-analytics.json`;
		link.click();
		URL.revokeObjectURL(url);
	}

	private countWords(text: string): number {
		return text
			.replace(/[^\w\s]/g, ' ')
			.split(/\s+/)
			.filter(word => word.length > 0)
			.length;
	}

	private parseLabel(label: string, timeFilter: TimeFilter): moment.Moment {
		switch (timeFilter) {
			case 'daily':
				return moment(label, 'MMM DD');
			case 'weekly':
				const weekMatch = label.match(/Week (\d+) (\d+)/);
				if (weekMatch) {
					return moment().year(parseInt(weekMatch[2])).week(parseInt(weekMatch[1]));
				}
				return moment(label, 'MMM DD');
			case 'monthly':
				return moment(label, 'MMM YYYY');
			case 'yearly':
				return moment(label, 'YYYY');
			default:
				return moment(label, 'MMM DD');
		}
	}

	// Cumulative file count method
	async getCumulativeFileCountData(timeFilter: TimeFilter, customStart?: string, customEnd?: string): Promise<Array<{ label: string; value: number }>> {
		const fileCreationData = await this.getFileCreationData(timeFilter, customStart, customEnd);
		return fileCreationData.map(item => ({
			label: item.label,
			value: item.cumulative || 0
		}));
	}

	// File size service methods
	getFileSizeService(): FileSizeService {
		return this.fileSizeService;
	}

	async getFileSizeStats() {
		return await this.fileSizeService.getFileSizeStats();
	}

	async getFileSizeDistributionData() {
		return await this.fileSizeService.getFileSizeDistributionData();
	}

	async getTopFilesSizeData(limit: number = 10) {
		return await this.fileSizeService.getTopFilesSizeData(limit);
	}

	async getFileSizeGrowthTrendData() {
		return await this.fileSizeService.getFileSizeGrowthTrendData();
	}

	async getAverageFileSizeOverTime() {
		return await this.fileSizeService.getAverageFileSizeOverTime();
	}

	async getFileSizeInsights() {
		return await this.fileSizeService.getFileSizeInsights();
	}
}
