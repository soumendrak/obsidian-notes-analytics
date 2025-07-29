import { App, Plugin, Editor, MarkdownView } from 'obsidian';
import { NotesAnalyticsModal } from './src/modals';
import { NotesAnalyticsSettingsTab } from './src/settings';
import { NotesAnalyticsSettings, DEFAULT_SETTINGS } from './src/types';

export default class NotesAnalyticsPlugin extends Plugin {
	settings: NotesAnalyticsSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('bar-chart-3', 'Notes Analytics', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			this.openAnalyticsModal();
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('notes-analytics-ribbon-class');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-notes-analytics',
			name: 'Open Notes Analytics',
			callback: () => {
				this.openAnalyticsModal();
			}
		});

		// This adds a command that can only be triggered in the editor
		this.addCommand({
			id: 'open-notes-analytics-editor',
			name: 'Open Notes Analytics (Editor)',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.openAnalyticsModal();
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new NotesAnalyticsSettingsTab(this.app, this));
	}

	onunload() {
		// Clean up resources if needed
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private openAnalyticsModal() {
		new NotesAnalyticsModal(this.app, this.settings).open();
	}
}
