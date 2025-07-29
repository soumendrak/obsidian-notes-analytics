export interface NotesAnalyticsSettings {
	dateFormat: string;
	enableRealTimeUpdates: boolean;
	showAdvancedStats: boolean;
	defaultChartType: 'line' | 'bar' | 'area' | 'pie';
	enableChartExport: boolean;
	enableCustomDateRange: boolean;
	defaultTimeFrame: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

export const DEFAULT_SETTINGS: NotesAnalyticsSettings = {
	dateFormat: 'YYYY-MM-DD',
	enableRealTimeUpdates: true,
	showAdvancedStats: true,
	defaultChartType: 'line',
	enableChartExport: true,
	enableCustomDateRange: true,
	defaultTimeFrame: 'daily'
};

export interface WordCountData {
	label: string;
	words: number;
}

export interface FileCreationData {
	label: string;
	count: number;
	cumulative?: number;
}

export interface AnalyticsSummary {
	totalFiles: number;
	totalWords: number;
	filesToday: number;
	filesThisWeek: number;
	filesThisMonth: number;
	avgWordsPerFile: number;
	mostActiveDay: string;
	currentStreak: number;
	longestStreak: number;
}

export interface StreakData {
	currentStreak: number;
	longestStreak: number;
	streakHistory: Array<{
		date: string;
		streak: number;
		isActive: boolean;
	}>;
	lastWriteDate: string;
	motivation: string;
	streakLevel: 'beginner' | 'building' | 'strong' | 'legendary';
}

export interface CalendarData {
	date: string;
	hasActivity: boolean;
	wordCount: number;
	filesCreated: number;
	intensity: 'none' | 'low' | 'medium' | 'high' | 'extreme';
}

export interface StreakStats {
	streaksThisYear: number;
	averageStreakLength: number;
	longestStreakThisYear: number;
	daysWrittenThisYear: number;
	consistencyPercentage: number;
}

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
		small: number;
		medium: number;
		large: number;
		veryLarge: number;
	};
	topFilesBySize: FileSizeData[];
	recentGrowth: FileSizeGrowthData[];
}

export type TimeFilter = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
export type ChartType = 'line' | 'bar' | 'area' | 'pie';
export type ExportFormat = 'csv' | 'json';
