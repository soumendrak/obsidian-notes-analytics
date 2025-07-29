import { App, PluginSettingTab, Setting } from 'obsidian';
import { NotesAnalyticsSettings, ChartType } from './types';
import NotesAnalyticsPlugin from '../main';

export class NotesAnalyticsSettingsTab extends PluginSettingTab {
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
			.setName('Date Format')
			.setDesc('How dates should be formatted in exports')
			.addText(text => text
				.setPlaceholder('YYYY-MM-DD')
				.setValue(this.plugin.settings.dateFormat)
				.onChange(async (value) => {
					this.plugin.settings.dateFormat = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Enable Real-time Updates')
			.setDesc('Update analytics when files are modified')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableRealTimeUpdates)
				.onChange(async (value) => {
					this.plugin.settings.enableRealTimeUpdates = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Show Advanced Statistics')
			.setDesc('Display additional statistical information')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showAdvancedStats)
				.onChange(async (value) => {
					this.plugin.settings.showAdvancedStats = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Default Chart Type')
			.setDesc('The chart type to show when opening analytics')
			.addDropdown(dropdown => dropdown
				.addOption('line', 'Line Chart')
				.addOption('bar', 'Bar Chart')
				.addOption('area', 'Area Chart')
				.addOption('pie', 'Pie Chart')
				.setValue(this.plugin.settings.defaultChartType)
				.onChange(async (value: ChartType) => {
					this.plugin.settings.defaultChartType = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Enable Chart Export')
			.setDesc('Allow exporting charts as images')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableChartExport)
				.onChange(async (value) => {
					this.plugin.settings.enableChartExport = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Enable Custom Date Range')
			.setDesc('Allow selecting custom date ranges for analysis')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableCustomDateRange)
				.onChange(async (value) => {
					this.plugin.settings.enableCustomDateRange = value;
					await this.plugin.saveSettings();
				}));
	}
}
