import { TFile, moment } from 'obsidian';

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

export class StreakService {
	private app: any;

	constructor(app: any) {
		this.app = app;
	}

	async getWritingStreak(): Promise<StreakData> {
		const files = this.app.vault.getMarkdownFiles();
		const writingDays = new Set<string>();

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

		// Calculate longest streak and detailed history
		const streakHistory: Array<{ date: string; streak: number; isActive: boolean }> = [];
		tempStreak = 0;
		
		for (let i = 0; i < sortedDays.length; i++) {
			const currentDay = sortedDays[i];
			const previousDay = i > 0 ? sortedDays[i - 1] : null;
			
			if (previousDay && moment(currentDay).diff(moment(previousDay), 'days') === 1) {
				tempStreak++;
			} else {
				tempStreak = 1;
			}
			
			longestStreak = Math.max(longestStreak, tempStreak);
			
			streakHistory.push({
				date: currentDay,
				streak: tempStreak,
				isActive: moment(currentDay).isSameOrAfter(moment().subtract(currentStreak, 'days'))
			});
		}

		const lastWriteDate = sortedDays.length > 0 ? sortedDays[sortedDays.length - 1] : '';
		const motivation = this.getStreakMotivation(currentStreak);
		const streakLevel = this.getStreakLevel(currentStreak);

		return {
			currentStreak,
			longestStreak,
			streakHistory: streakHistory.slice(-30), // Last 30 days
			lastWriteDate,
			motivation,
			streakLevel
		};
	}

	async getStreakCalendarData(year: number = moment().year()): Promise<CalendarData[]> {
		const files = this.app.vault.getMarkdownFiles();
		const dailyData = new Map<string, { hasActivity: boolean; wordCount: number; filesCreated: number }>();

		// Initialize all days of the year
		const startDate = moment(`${year}-01-01`);
		const endDate = moment(`${year}-12-31`);
		
		for (let date = startDate.clone(); date.isSameOrBefore(endDate); date.add(1, 'day')) {
			const dateKey = date.format('YYYY-MM-DD');
			dailyData.set(dateKey, { hasActivity: false, wordCount: 0, filesCreated: 0 });
		}

		// Process files for the year
		for (const file of files) {
			const modifiedDate = moment(file.stat.mtime);
			const createdDate = moment(file.stat.ctime);
			
			// Count modifications
			if (modifiedDate.year() === year) {
				const dateKey = modifiedDate.format('YYYY-MM-DD');
				const existing = dailyData.get(dateKey) || { hasActivity: false, wordCount: 0, filesCreated: 0 };
				
				try {
					const content = await this.app.vault.read(file);
					const wordCount = this.countWords(content);
					
					dailyData.set(dateKey, {
						hasActivity: true,
						wordCount: existing.wordCount + wordCount,
						filesCreated: existing.filesCreated
					});
				} catch (error) {
					dailyData.set(dateKey, {
						hasActivity: true,
						wordCount: existing.wordCount,
						filesCreated: existing.filesCreated
					});
				}
			}
			
			// Count file creations
			if (createdDate.year() === year) {
				const dateKey = createdDate.format('YYYY-MM-DD');
				const existing = dailyData.get(dateKey) || { hasActivity: false, wordCount: 0, filesCreated: 0 };
				
				dailyData.set(dateKey, {
					hasActivity: true,
					wordCount: existing.wordCount,
					filesCreated: existing.filesCreated + 1
				});
			}
		}

		return Array.from(dailyData.entries()).map(([date, data]) => ({
			date,
			hasActivity: data.hasActivity,
			wordCount: data.wordCount,
			filesCreated: data.filesCreated,
			intensity: this.getIntensityLevel(data.wordCount, data.filesCreated)
		}));
	}

	async getStreakStats(): Promise<{
		streaksThisYear: number;
		averageStreakLength: number;
		longestStreakThisYear: number;
		daysWrittenThisYear: number;
		consistencyPercentage: number;
	}> {
		const currentYear = moment().year();
		const calendarData = await this.getStreakCalendarData(currentYear);
		const daysWritten = calendarData.filter(day => day.hasActivity).length;
		const daysInYear = moment().dayOfYear();
		
		// Calculate streaks this year
		let streaksThisYear = 0;
		let longestStreakThisYear = 0;
		let currentYearStreak = 0;
		let totalStreakDays = 0;

		for (const day of calendarData) {
			if (day.hasActivity) {
				currentYearStreak++;
				totalStreakDays++;
			} else {
				if (currentYearStreak > 0) {
					streaksThisYear++;
					longestStreakThisYear = Math.max(longestStreakThisYear, currentYearStreak);
					currentYearStreak = 0;
				}
			}
		}

		// Handle ongoing streak
		if (currentYearStreak > 0) {
			streaksThisYear++;
			longestStreakThisYear = Math.max(longestStreakThisYear, currentYearStreak);
		}

		const averageStreakLength = streaksThisYear > 0 ? Math.round(totalStreakDays / streaksThisYear) : 0;
		const consistencyPercentage = Math.round((daysWritten / daysInYear) * 100);

		return {
			streaksThisYear,
			averageStreakLength,
			longestStreakThisYear,
			daysWrittenThisYear: daysWritten,
			consistencyPercentage
		};
	}

	private countWords(text: string): number {
		return text
			.replace(/[^\w\s]/g, ' ')
			.split(/\s+/)
			.filter(word => word.length > 0)
			.length;
	}

	private getIntensityLevel(wordCount: number, filesCreated: number): 'none' | 'low' | 'medium' | 'high' | 'extreme' {
		if (!wordCount && !filesCreated) return 'none';
		
		const totalActivity = wordCount + (filesCreated * 100); // Weight file creation more
		
		if (totalActivity < 100) return 'low';
		if (totalActivity < 500) return 'medium';
		if (totalActivity < 1000) return 'high';
		return 'extreme';
	}

	getStreakLevel(currentStreak: number): 'beginner' | 'building' | 'strong' | 'legendary' {
		if (currentStreak < 3) return 'beginner';
		if (currentStreak < 7) return 'building';
		if (currentStreak < 30) return 'strong';
		return 'legendary';
	}

	getStreakMotivation(currentStreak: number): string {
		if (currentStreak === 0) {
			return "Start your writing journey today! 🚀";
		} else if (currentStreak < 3) {
			return `Great start! ${currentStreak} day${currentStreak > 1 ? 's' : ''} and counting! 💪`;
		} else if (currentStreak < 7) {
			return `Building momentum! ${currentStreak} days strong! 🔥`;
		} else if (currentStreak < 30) {
			return `Incredible dedication! ${currentStreak} days in a row! ⭐`;
		} else {
			return `Amazing achievement! ${currentStreak} days streak! You're a writing legend! 🏆`;
		}
	}

	getStreakEmoji(level: 'beginner' | 'building' | 'strong' | 'legendary'): string {
		switch (level) {
			case 'beginner': return '🌱';
			case 'building': return '🔥';
			case 'strong': return '⭐';
			case 'legendary': return '🏆';
		}
	}
}