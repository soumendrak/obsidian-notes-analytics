import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, moment } from 'obsidian';

interface NotesAnalyticsSettings {
	showFileCreationHistory: boolean;
	showWordCountTracking: boolean;
	dateFormat: string;
	enableRealTimeUpdates: boolean;
	showAdvancedStats: boolean;
}

const DEFAULT_SETTINGS: NotesAnalyticsSettings = {
	showFileCreationHistory: true,
	showWordCountTracking: true,
	dateFormat: 'YYYY-MM-DD',
	enableRealTimeUpdates: true,
	showAdvancedStats: true
}

interface FileCreationData {
	path: string;
	createdDate: string;
	wordCount: number;
}

interface WordCountData {
	date: string;
	totalWords: number;
	filesCreated: number;
	avgWordsPerFile: number;
	cumulativeWords: number;
}

export default class NotesAnalyticsPlugin extends Plugin {
	settings: NotesAnalyticsSettings;
	private updateTimeout: number;

	async onload() {
		await this.loadSettings();

		// Add ribbon icon for analytics
		const ribbonIconEl = this.addRibbonIcon('bar-chart', 'Notes Analytics', (evt: MouseEvent) => {
			new AnalyticsModal(this.app, this).open();
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
				new AnalyticsModal(this.app, this).open();
			}
		});

		// Add command to show file creation history
		this.addCommand({
			id: 'show-file-creation-history',
			name: 'Show File Creation History',
			callback: () => {
				new FileCreationHistoryModal(this.app, this).open();
			}
		});

		// Add command to show word count analytics
		this.addCommand({
			id: 'show-word-count-analytics',
			name: 'Show Word Count Analytics',
			callback: () => {
				new WordCountAnalyticsModal(this.app, this).open();
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

	async getFileCreationData(): Promise<FileCreationData[]> {
		const files = this.app.vault.getMarkdownFiles();
		const result: FileCreationData[] = [];
		
		for (const file of files) {
			const wordCount = await this.getWordCount(file);
			result.push({
				path: file.path,
				createdDate: moment(file.stat.ctime).format(this.settings.dateFormat),
				wordCount: wordCount
			});
		}
		
		return result;
	}

	async getWordCountAnalytics(timeFrame: 'day' | 'month' | 'year'): Promise<WordCountData[]> {
		const files = this.app.vault.getMarkdownFiles();
		const dataMap = new Map<string, WordCountData>();

		for (const file of files) {
			let dateKey: string;
			const fileDate = moment(file.stat.ctime);

			switch (timeFrame) {
				case 'day':
					dateKey = fileDate.format('YYYY-MM-DD');
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
					cumulativeWords: 0
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
		
		sortedData.forEach(item => {
			item.avgWordsPerFile = item.filesCreated > 0 ? Math.round(item.totalWords / item.filesCreated) : 0;
			cumulativeWords += item.totalWords;
			item.cumulativeWords = cumulativeWords;
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
}

class AnalyticsModal extends Modal {
	plugin: NotesAnalyticsPlugin;

	constructor(app: App, plugin: NotesAnalyticsPlugin) {
		super(app);
		this.plugin = plugin;
	}

	async onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		
		contentEl.createEl('h2', { text: 'Notes Analytics Dashboard' });

		// Summary section
		const summaryDiv = contentEl.createDiv('analytics-summary');
		summaryDiv.createEl('h3', { text: 'Summary' });
		summaryDiv.createEl('p', { text: 'Loading analytics...' });
		
		// Load analytics summary
		try {
			const summary = await this.plugin.getAnalyticsSummary();
			summaryDiv.empty();
			summaryDiv.createEl('h3', { text: 'Summary' });
			
			const statsGrid = summaryDiv.createDiv('stats-grid');
			statsGrid.createEl('p', { text: `📁 Total Files: ${summary.totalFiles}` });
			statsGrid.createEl('p', { text: `📝 Total Words: ${summary.totalWords.toLocaleString()}` });
			statsGrid.createEl('p', { text: `📊 Average Words/File: ${summary.avgWordsPerFile}` });
			
			if (this.plugin.settings.showAdvancedStats) {
				statsGrid.createEl('p', { text: `🔥 Current Streak: ${summary.streak} days` });
				statsGrid.createEl('p', { text: `🚀 Most Productive Day: ${summary.mostProductiveDay}` });
				if (summary.oldestFile) {
					statsGrid.createEl('p', { text: `📅 Oldest File: ${summary.oldestFile.split('/').pop()}` });
				}
				if (summary.newestFile) {
					statsGrid.createEl('p', { text: `✨ Newest File: ${summary.newestFile.split('/').pop()}` });
				}
			}
		} catch (error) {
			summaryDiv.empty();
			summaryDiv.createEl('h3', { text: 'Summary' });
			summaryDiv.createEl('p', { text: 'Error loading analytics summary' });
			console.error('Summary error:', error);
		}

		// Buttons for different analytics views
		const buttonsDiv = contentEl.createDiv('analytics-buttons');
		
		const historyBtn = buttonsDiv.createEl('button', { text: 'File Creation History' });
		historyBtn.onclick = () => {
			this.close();
			new FileCreationHistoryModal(this.app, this.plugin).open();
		};

		const wordCountBtn = buttonsDiv.createEl('button', { text: 'Word Count Analytics' });
		wordCountBtn.onclick = () => {
			this.close();
			new WordCountAnalyticsModal(this.app, this.plugin).open();
		};
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class FileCreationHistoryModal extends Modal {
	plugin: NotesAnalyticsPlugin;

	constructor(app: App, plugin: NotesAnalyticsPlugin) {
		super(app);
		this.plugin = plugin;
	}

	async onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		
		contentEl.createEl('h2', { text: 'File Creation History' });

		const fileData = await this.plugin.getFileCreationData();
		
		// Group files by creation date
		const groupedData = new Map<string, FileCreationData[]>();
		fileData.forEach(file => {
			if (!groupedData.has(file.createdDate)) {
				groupedData.set(file.createdDate, []);
			}
			groupedData.get(file.createdDate)!.push(file);
		});

		// Sort dates in descending order
		const sortedDates = Array.from(groupedData.keys()).sort((a, b) => b.localeCompare(a));

		sortedDates.forEach(date => {
			const dateSection = contentEl.createDiv('date-section');
			const files = groupedData.get(date)!;
			
			dateSection.createEl('h3', { text: `${date} (${files.length} files)` });
			
			const filesList = dateSection.createEl('ul');
			files.forEach(file => {
				const listItem = filesList.createEl('li');
				listItem.createEl('span', { text: file.path });
				listItem.createEl('span', { text: ` (${file.wordCount} words)`, cls: 'word-count' });
			});
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class WordCountAnalyticsModal extends Modal {
	plugin: NotesAnalyticsPlugin;

	constructor(app: App, plugin: NotesAnalyticsPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		
		contentEl.createEl('h2', { text: 'Word Count Analytics' });

		// Time frame selector
		const selectorDiv = contentEl.createDiv('timeframe-selector');
		selectorDiv.createEl('label', { text: 'Time Frame: ' });
		
		const select = selectorDiv.createEl('select');
		select.createEl('option', { value: 'day', text: 'Daily' });
		select.createEl('option', { value: 'month', text: 'Monthly' });
		select.createEl('option', { value: 'year', text: 'Yearly' });

		const analyticsDiv = contentEl.createDiv('word-count-analytics');

		const updateAnalytics = async (timeFrame: 'day' | 'month' | 'year') => {
			analyticsDiv.empty();
			
			// Show loading message
			analyticsDiv.createEl('p', { text: 'Loading analytics...' });
			
			try {
				const data = await this.plugin.getWordCountAnalytics(timeFrame);
				analyticsDiv.empty(); // Clear loading message
				
				if (data.length === 0) {
					analyticsDiv.createEl('p', { text: 'No data available' });
					return;
				}

				const table = analyticsDiv.createEl('table');
				table.addClass('analytics-table');
				
				const header = table.createEl('thead').createEl('tr');
				header.createEl('th', { text: 'Period' });
				header.createEl('th', { text: 'Files Created' });
				header.createEl('th', { text: 'Words in Period' });
				header.createEl('th', { text: 'Avg Words/File' });
				if (this.plugin.settings.showAdvancedStats) {
					header.createEl('th', { text: 'Cumulative Words' });
				}

				const tbody = table.createEl('tbody');
				data.forEach(item => {
					const row = tbody.createEl('tr');
					row.createEl('td', { text: item.date });
					row.createEl('td', { text: item.filesCreated.toString() });
					row.createEl('td', { text: item.totalWords.toString() });
					row.createEl('td', { text: item.avgWordsPerFile.toString() });
					if (this.plugin.settings.showAdvancedStats) {
						row.createEl('td', { text: item.cumulativeWords.toString() });
					}
				});
			} catch (error) {
				analyticsDiv.empty();
				analyticsDiv.createEl('p', { text: 'Error loading analytics data' });
				console.error('Analytics error:', error);
			}
		};

		select.onchange = () => {
			updateAnalytics(select.value as 'day' | 'month' | 'year');
		};

		// Initial load with daily view
		updateAnalytics('day');
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
			.setName('Show File Creation History')
			.setDesc('Enable file creation history tracking')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showFileCreationHistory)
				.onChange(async (value) => {
					this.plugin.settings.showFileCreationHistory = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Show Word Count Tracking')
			.setDesc('Enable word count analytics tracking')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showWordCountTracking)
				.onChange(async (value) => {
					this.plugin.settings.showWordCountTracking = value;
					await this.plugin.saveSettings();
				}));

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
			.setName('Date Format')
			.setDesc('Format for displaying dates (using moment.js format)')
			.addText(text => text
				.setPlaceholder('YYYY-MM-DD')
				.setValue(this.plugin.settings.dateFormat)
				.onChange(async (value) => {
					this.plugin.settings.dateFormat = value;
					await this.plugin.saveSettings();
				}));
	}
}
