/**
 * Advanced Analytics Service
 * Provides trends, predictions, correlations, and statistical analysis
 */

import { TFile, moment } from 'obsidian';

export interface TrendData {
	direction: 'increasing' | 'decreasing' | 'stable';
	strength: 'weak' | 'moderate' | 'strong';
	percentage: number;
	confidence: number;
	period: string;
}

export interface PredictionData {
	nextWeek: number;
	nextMonth: number;
	confidence: number;
	methodology: string;
}

export interface CorrelationData {
	metric1: string;
	metric2: string;
	coefficient: number;
	strength: 'very weak' | 'weak' | 'moderate' | 'strong' | 'very strong';
	significance: number;
}

export interface SeasonalPattern {
	pattern: 'weekday_bias' | 'weekend_bias' | 'monthly_cycle' | 'no_pattern';
	description: string;
	confidence: number;
}

export interface WritingInsights {
	mostProductiveDay: string;
	mostProductiveTime: string;
	averageSessionLength: number;
	consistencyScore: number;
	improvementSuggestions: string[];
}

export interface AdvancedMetrics {
	trends: {
		wordCount: TrendData;
		fileCreation: TrendData;
		productivity: TrendData;
	};
	predictions: {
		wordCount: PredictionData;
		fileCreation: PredictionData;
	};
	correlations: CorrelationData[];
	seasonalPatterns: SeasonalPattern[];
	insights: WritingInsights;
	statisticalSummary: {
		variance: number;
		standardDeviation: number;
		skewness: number;
		kurtosis: number;
	};
}

export class AdvancedAnalyticsService {
	private app: any;

	constructor(app: any) {
		this.app = app;
	}

	/**
	 * Calculate comprehensive advanced analytics
	 */
	async getAdvancedMetrics(): Promise<AdvancedMetrics> {
		const files = this.app.vault.getMarkdownFiles();
		const dailyData = await this.getDailyAnalyticsData(files);
		
		return {
			trends: await this.calculateTrends(dailyData),
			predictions: await this.calculatePredictions(dailyData),
			correlations: await this.calculateCorrelations(dailyData),
			seasonalPatterns: await this.identifySeasonalPatterns(dailyData),
			insights: await this.generateWritingInsights(dailyData),
			statisticalSummary: this.calculateStatisticalSummary(dailyData)
		};
	}

	/**
	 * Get daily analytics data for the last 90 days
	 */
	private async getDailyAnalyticsData(files: TFile[]) {
		const dailyData: Array<{
			date: string;
			wordCount: number;
			fileCount: number;
			avgWordsPerFile: number;
			dayOfWeek: number;
			hour: number;
		}> = [];

		// Group files by day
		const dailyGroups = new Map<string, TFile[]>();
		const now = moment();
		
		for (const file of files) {
			const fileDate = moment(file.stat.ctime);
			if (now.diff(fileDate, 'days') <= 90) {
				const dateKey = fileDate.format('YYYY-MM-DD');
				if (!dailyGroups.has(dateKey)) {
					dailyGroups.set(dateKey, []);
				}
				dailyGroups.get(dateKey)!.push(file);
			}
		}

		// Calculate metrics for each day
		for (const [dateKey, dayFiles] of dailyGroups) {
			let totalWords = 0;
			
			for (const file of dayFiles) {
				try {
					const content = await this.app.vault.read(file);
					totalWords += this.countWords(content);
				} catch (error) {
					console.warn('Failed to read file:', file.path);
				}
			}

			const date = moment(dateKey);
			dailyData.push({
				date: dateKey,
				wordCount: totalWords,
				fileCount: dayFiles.length,
				avgWordsPerFile: dayFiles.length > 0 ? totalWords / dayFiles.length : 0,
				dayOfWeek: date.day(),
				hour: date.hour()
			});
		}

		return dailyData.sort((a, b) => a.date.localeCompare(b.date));
	}

	/**
	 * Calculate trends for different metrics
	 */
	private async calculateTrends(dailyData: any[]): Promise<any> {
		if (dailyData.length < 7) {
			return {
				wordCount: { direction: 'stable', strength: 'weak', percentage: 0, confidence: 0, period: 'insufficient_data' },
				fileCreation: { direction: 'stable', strength: 'weak', percentage: 0, confidence: 0, period: 'insufficient_data' },
				productivity: { direction: 'stable', strength: 'weak', percentage: 0, confidence: 0, period: 'insufficient_data' }
			};
		}

		return {
			wordCount: this.calculateTrendForMetric(dailyData, 'wordCount'),
			fileCreation: this.calculateTrendForMetric(dailyData, 'fileCount'),
			productivity: this.calculateTrendForMetric(dailyData, 'avgWordsPerFile')
		};
	}

	private calculateTrendForMetric(data: any[], metric: string): TrendData {
		const values = data.map(d => d[metric]);
		const n = values.length;
		
		if (n < 2) {
			return {
				direction: 'stable',
				strength: 'weak',
				percentage: 0,
				confidence: 0,
				period: '0 days'
			};
		}

		// Calculate linear regression
		const x = values.map((_, i) => i);
		const y = values;
		
		const sumX = x.reduce((a, b) => a + b, 0);
		const sumY = y.reduce((a, b) => a + b, 0);
		const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
		const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
		
		const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
		const intercept = (sumY - slope * sumX) / n;
		
		// Calculate R-squared for confidence
		const yMean = sumY / n;
		const ssRes = y.reduce((sum, yi, i) => sum + Math.pow(yi - (slope * i + intercept), 2), 0);
		const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
		const rSquared = ssTot === 0 ? 1 : 1 - (ssRes / ssTot);
		
		// Determine trend direction and strength
		const firstValue = values[0] || 1;
		const lastValue = values[n - 1] || 1;
		const percentageChange = firstValue === 0 ? 0 : ((lastValue - firstValue) / Math.abs(firstValue)) * 100;
		
		let direction: 'increasing' | 'decreasing' | 'stable';
		if (Math.abs(slope) < 0.1) {
			direction = 'stable';
		} else if (slope > 0) {
			direction = 'increasing';
		} else {
			direction = 'decreasing';
		}
		
		let strength: 'weak' | 'moderate' | 'strong';
		if (Math.abs(percentageChange) < 10) {
			strength = 'weak';
		} else if (Math.abs(percentageChange) < 25) {
			strength = 'moderate';
		} else {
			strength = 'strong';
		}
		
		return {
			direction,
			strength,
			percentage: Math.round(percentageChange * 100) / 100,
			confidence: Math.round(rSquared * 100),
			period: `${n} days`
		};
	}

	/**
	 * Calculate predictions using simple moving average and trend analysis
	 */
	private async calculatePredictions(dailyData: any[]): Promise<any> {
		if (dailyData.length < 7) {
			return {
				wordCount: { nextWeek: 0, nextMonth: 0, confidence: 0, methodology: 'insufficient_data' },
				fileCreation: { nextWeek: 0, nextMonth: 0, confidence: 0, methodology: 'insufficient_data' }
			};
		}

		return {
			wordCount: this.calculatePredictionForMetric(dailyData, 'wordCount'),
			fileCreation: this.calculatePredictionForMetric(dailyData, 'fileCount')
		};
	}

	private calculatePredictionForMetric(data: any[], metric: string): PredictionData {
		const values = data.map(d => d[metric]);
		const n = values.length;
		
		// Use last 14 days for prediction if available
		const recentValues = values.slice(-Math.min(14, n));
		const recentAverage = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
		
		// Calculate trend from recent data
		const trend = this.calculateTrendForMetric(data.slice(-Math.min(14, n)), metric);
		const trendMultiplier = trend.direction === 'increasing' ? 1.1 : 
		                      trend.direction === 'decreasing' ? 0.9 : 1.0;
		
		const nextWeekPrediction = recentAverage * 7 * trendMultiplier;
		const nextMonthPrediction = recentAverage * 30 * trendMultiplier;
		
		return {
			nextWeek: Math.round(nextWeekPrediction),
			nextMonth: Math.round(nextMonthPrediction),
			confidence: Math.max(30, trend.confidence),
			methodology: 'moving_average_with_trend'
		};
	}

	/**
	 * Calculate correlations between different metrics
	 */
	private async calculateCorrelations(dailyData: any[]): Promise<CorrelationData[]> {
		if (dailyData.length < 10) {
			return [];
		}

		const correlations: CorrelationData[] = [];
		const metrics = ['wordCount', 'fileCount', 'avgWordsPerFile'];
		
		for (let i = 0; i < metrics.length; i++) {
			for (let j = i + 1; j < metrics.length; j++) {
				const metric1 = metrics[i];
				const metric2 = metrics[j];
				
				const correlation = this.calculatePearsonCorrelation(
					dailyData.map(d => d[metric1]),
					dailyData.map(d => d[metric2])
				);
				
				if (!isNaN(correlation)) {
					correlations.push({
						metric1,
						metric2,
						coefficient: Math.round(correlation * 1000) / 1000,
						strength: this.interpretCorrelationStrength(Math.abs(correlation)),
						significance: Math.round((1 - Math.abs(correlation)) * 100)
					});
				}
			}
		}
		
		return correlations;
	}

	private calculatePearsonCorrelation(x: number[], y: number[]): number {
		const n = x.length;
		if (n !== y.length || n === 0) return NaN;
		
		const sumX = x.reduce((a, b) => a + b, 0);
		const sumY = y.reduce((a, b) => a + b, 0);
		const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
		const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
		const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);
		
		const numerator = n * sumXY - sumX * sumY;
		const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
		
		return denominator === 0 ? 0 : numerator / denominator;
	}

	private interpretCorrelationStrength(abs: number): 'very weak' | 'weak' | 'moderate' | 'strong' | 'very strong' {
		if (abs < 0.2) return 'very weak';
		if (abs < 0.4) return 'weak';
		if (abs < 0.6) return 'moderate';
		if (abs < 0.8) return 'strong';
		return 'very strong';
	}

	/**
	 * Identify seasonal patterns in writing behavior
	 */
	private async identifySeasonalPatterns(dailyData: any[]): Promise<SeasonalPattern[]> {
		const patterns: SeasonalPattern[] = [];
		
		if (dailyData.length < 14) {
			return patterns;
		}

		// Analyze day-of-week patterns
		const dayOfWeekAvg = new Array(7).fill(0);
		const dayOfWeekCount = new Array(7).fill(0);
		
		dailyData.forEach(day => {
			const dow = day.dayOfWeek;
			dayOfWeekAvg[dow] += day.wordCount;
			dayOfWeekCount[dow]++;
		});
		
		for (let i = 0; i < 7; i++) {
			if (dayOfWeekCount[i] > 0) {
				dayOfWeekAvg[i] /= dayOfWeekCount[i];
			}
		}
		
		const weekdayAvg = (dayOfWeekAvg[1] + dayOfWeekAvg[2] + dayOfWeekAvg[3] + dayOfWeekAvg[4] + dayOfWeekAvg[5]) / 5;
		const weekendAvg = (dayOfWeekAvg[0] + dayOfWeekAvg[6]) / 2;
		
		if (weekdayAvg > weekendAvg * 1.2) {
			patterns.push({
				pattern: 'weekday_bias',
				description: 'You tend to write more on weekdays than weekends',
				confidence: Math.min(90, Math.round((weekdayAvg / weekendAvg - 1) * 100))
			});
		} else if (weekendAvg > weekdayAvg * 1.2) {
			patterns.push({
				pattern: 'weekend_bias',
				description: 'You tend to write more on weekends than weekdays',
				confidence: Math.min(90, Math.round((weekendAvg / weekdayAvg - 1) * 100))
			});
		}
		
		return patterns;
	}

	/**
	 * Generate writing insights and recommendations
	 */
	private async generateWritingInsights(dailyData: any[]): Promise<WritingInsights> {
		if (dailyData.length === 0) {
			return {
				mostProductiveDay: 'No data',
				mostProductiveTime: 'No data',
				averageSessionLength: 0,
				consistencyScore: 0,
				improvementSuggestions: ['Write more regularly to get insights']
			};
		}

		// Find most productive day
		const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
		const dayTotals = new Array(7).fill(0);
		const dayCounts = new Array(7).fill(0);
		
		dailyData.forEach(day => {
			dayTotals[day.dayOfWeek] += day.wordCount;
			dayCounts[day.dayOfWeek]++;
		});
		
		let maxAvg = 0;
		let mostProductiveDay = 'Monday';
		for (let i = 0; i < 7; i++) {
			const avg = dayCounts[i] > 0 ? dayTotals[i] / dayCounts[i] : 0;
			if (avg > maxAvg) {
				maxAvg = avg;
				mostProductiveDay = dayNames[i];
			}
		}

		// Calculate consistency score (inverse of coefficient of variation)
		const wordCounts = dailyData.map(d => d.wordCount);
		const mean = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length;
		const variance = wordCounts.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / wordCounts.length;
		const stdDev = Math.sqrt(variance);
		const coefficientOfVariation = mean === 0 ? 1 : stdDev / mean;
		const consistencyScore = Math.round(Math.max(0, (1 - Math.min(1, coefficientOfVariation)) * 100));

		// Generate improvement suggestions
		const suggestions: string[] = [];
		
		if (consistencyScore < 50) {
			suggestions.push('Try to write more consistently each day');
		}
		
		if (mean < 100) {
			suggestions.push('Consider setting a daily word count goal');
		}
		
		const activeDays = dailyData.filter(d => d.wordCount > 0).length;
		if (activeDays < dailyData.length * 0.7) {
			suggestions.push('Try to write something every day, even if it\'s just a few words');
		}
		
		if (suggestions.length === 0) {
			suggestions.push('Great work! Keep up your consistent writing habits');
		}

		return {
			mostProductiveDay,
			mostProductiveTime: 'Morning', // Simplified for now
			averageSessionLength: Math.round(mean),
			consistencyScore,
			improvementSuggestions: suggestions
		};
	}

	/**
	 * Calculate statistical summary
	 */
	private calculateStatisticalSummary(dailyData: any[]) {
		if (dailyData.length === 0) {
			return {
				variance: 0,
				standardDeviation: 0,
				skewness: 0,
				kurtosis: 0
			};
		}

		const wordCounts = dailyData.map(d => d.wordCount);
		const n = wordCounts.length;
		const mean = wordCounts.reduce((a, b) => a + b, 0) / n;
		
		const variance = wordCounts.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / n;
		const standardDeviation = Math.sqrt(variance);
		
		// Calculate skewness (measure of asymmetry)
		const skewness = n > 2 ? 
			wordCounts.reduce((sum, value) => sum + Math.pow((value - mean) / standardDeviation, 3), 0) / n : 0;
		
		// Calculate kurtosis (measure of tail heaviness)
		const kurtosis = n > 3 ?
			wordCounts.reduce((sum, value) => sum + Math.pow((value - mean) / standardDeviation, 4), 0) / n - 3 : 0;
		
		return {
			variance: Math.round(variance * 100) / 100,
			standardDeviation: Math.round(standardDeviation * 100) / 100,
			skewness: Math.round(skewness * 1000) / 1000,
			kurtosis: Math.round(kurtosis * 1000) / 1000
		};
	}

	private countWords(text: string): number {
		return text.trim().split(/\s+/).filter(word => word.length > 0).length;
	}
}
