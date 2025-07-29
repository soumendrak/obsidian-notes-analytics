/**
 * Help and Documentation System
 * Provides in-app guidance, tooltips, tutorials, and user manual
 */

export interface HelpTopic {
	id: string;
	title: string;
	content: string;
	category: 'getting-started' | 'features' | 'troubleshooting' | 'advanced';
	tags: string[];
	lastUpdated: string;
}

export interface Tutorial {
	id: string;
	title: string;
	description: string;
	steps: TutorialStep[];
	estimatedTime: number;
	difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface TutorialStep {
	title: string;
	content: string;
	action?: {
		type: 'click' | 'type' | 'wait' | 'highlight';
		selector?: string;
		text?: string;
		duration?: number;
	};
	screenshot?: string;
}

export class HelpService {
	private helpTopics: HelpTopic[] = [];
	private tutorials: Tutorial[] = [];

	constructor() {
		this.initializeHelpContent();
		this.initializeTutorials();
	}

	/**
	 * Initialize help content
	 */
	private initializeHelpContent(): void {
		this.helpTopics = [
			{
				id: 'getting-started',
				title: 'Getting Started with Notes Analytics',
				content: `
# Getting Started

Welcome to Notes Analytics! This plugin provides comprehensive insights into your note-taking patterns and writing productivity.

## Quick Start
1. Click the dashboard icon in the left ribbon to open the Analytics Dashboard
2. Use the chart icon to view detailed chart visualizations
3. Configure settings in Settings > Plugin Options > Notes Analytics

## Key Features
- **Real-time Analytics**: Track your writing progress as you work
- **Interactive Charts**: Visualize your data with multiple chart types
- **Goal Tracking**: Set and monitor daily, weekly, and monthly goals
- **Export Options**: Share your progress with various export formats

## First Steps
1. Write some notes to generate data
2. Open the dashboard to see your first analytics
3. Explore different chart types and time ranges
4. Set up your goals in the settings
				`,
				category: 'getting-started',
				tags: ['basics', 'setup', 'first-time'],
				lastUpdated: '2025-01-29'
			},
			{
				id: 'dashboard-overview',
				title: 'Understanding the Analytics Dashboard',
				content: `
# Analytics Dashboard Overview

The Analytics Dashboard is your central hub for monitoring writing productivity and note-taking patterns.

## Dashboard Sections

### Metric Cards
Each card shows a specific metric with interactive charts:
- **Word Count Trends**: Track writing volume over time
- **Files Created**: Monitor note creation patterns
- **Average Words per File**: Measure writing depth
- **Cumulative Progress**: See overall growth
- **Writing Streak**: Track consistent writing habits
- **Goal Progress**: Monitor achievement of set targets

### Chart Controls
- **Chart Types**: Switch between line, bar, area, and pie charts
- **Time Filters**: View data for different periods
- **Zoom Feature**: Click the zoom button for detailed views

### Filter Options
- **Time Frame**: Choose from predefined ranges or custom dates
- **Custom Ranges**: Select specific start and end dates
- **Real-time Updates**: Automatically refresh data

## Tips for Best Use
- Check your dashboard regularly to stay motivated
- Use different chart types to spot patterns
- Set realistic goals based on your trends
- Export reports to track long-term progress
				`,
				category: 'features',
				tags: ['dashboard', 'charts', 'metrics'],
				lastUpdated: '2025-01-29'
			},
			{
				id: 'chart-types',
				title: 'Chart Types and When to Use Them',
				content: `
# Chart Types Guide

Different chart types help visualize your data in unique ways. Choose the right chart for your analysis needs.

## Line Charts
**Best for**: Trends over time, showing patterns and changes
**Use when**: You want to see how metrics change day by day
**Example**: Word count progression over a month

## Bar Charts
**Best for**: Comparing discrete periods or categories
**Use when**: Comparing specific time periods or values
**Example**: Files created per week comparison

## Area Charts
**Best for**: Showing cumulative data and filled trends
**Use when**: Emphasizing the volume or magnitude of change
**Example**: Total word count accumulation

## Pie Charts
**Best for**: Showing proportions and percentages
**Use when**: Displaying parts of a whole
**Example**: Distribution of file sizes or writing days

## Heatmaps
**Best for**: Calendar-based activity visualization
**Use when**: Tracking daily writing habits
**Example**: GitHub-style contribution calendar

## Tips for Chart Selection
- Use line charts for most time-based analysis
- Choose bar charts when comparing specific periods
- Select pie charts for composition analysis
- Try different types to discover new insights
				`,
				category: 'features',
				tags: ['charts', 'visualization', 'analysis'],
				lastUpdated: '2025-01-29'
			},
			{
				id: 'keyboard-shortcuts',
				title: 'Keyboard Shortcuts',
				content: `
# Keyboard Shortcuts

Boost your productivity with these keyboard shortcuts for quick access to analytics features.

## Global Shortcuts
- **Ctrl+Shift+A**: Open Analytics Dashboard
- **Ctrl+Shift+C**: Open Chart Visualizations
- **Ctrl+Shift+R**: Generate Full Analytics Report
- **Ctrl+Shift+F**: Refresh Analytics Data

## Dashboard Navigation
- **Tab/Shift+Tab**: Navigate between interactive elements
- **Arrow Keys**: Move between metric cards
- **Enter/Space**: Activate buttons and controls
- **Escape**: Close modals and dialogs
- **Ctrl+R**: Refresh dashboard (when focused)

## Chart Interactions
- **Click**: Activate chart type buttons
- **Enter**: Confirm chart type selection
- **Tab**: Navigate chart controls
- **Escape**: Exit full-screen chart view

## Accessibility Features
All shortcuts work with screen readers and keyboard-only navigation. The plugin includes:
- ARIA labels for all interactive elements
- Focus indicators for keyboard navigation
- Screen reader announcements for state changes
- High contrast mode support

## Customization
Keyboard shortcuts can be disabled in settings if they conflict with other plugins or your workflow preferences.
				`,
				category: 'features',
				tags: ['shortcuts', 'accessibility', 'navigation'],
				lastUpdated: '2025-01-29'
			},
			{
				id: 'export-sharing',
				title: 'Exporting and Sharing Your Analytics',
				content: `
# Export and Sharing Guide

Share your writing progress and analytics with various export options.

## Export Formats

### Chart Exports
- **PNG**: High-quality images for presentations
- **SVG**: Scalable vector graphics for print
- **Copy to Clipboard**: Quick sharing in messages

### Data Exports
- **CSV**: Spreadsheet-compatible data files
- **JSON**: Developer-friendly structured data
- **Markdown**: Formatted reports for notes
- **HTML**: Interactive web reports
- **PDF**: Print-ready documents

## Report Generation

### Comprehensive Reports
Generate full analytics reports including:
- Summary statistics
- Trend analysis
- Chart visualizations
- Writing insights
- Raw data tables

### Custom Reports
Customize your reports with:
- Specific date ranges
- Selected metrics
- Chart preferences
- Theme options (light/dark)

## Sharing Features

### Local Sharing
- Save reports to your vault
- Create backup files
- Generate shareable HTML files

### Export Organization
All exports are saved to "Analytics Exports" folder for easy organization and access.

## Best Practices
- Export regularly to track long-term progress
- Use different formats for different audiences
- Include charts in presentations for visual impact
- Backup your analytics data periodically
				`,
				category: 'features',
				tags: ['export', 'sharing', 'reports', 'backup'],
				lastUpdated: '2025-01-29'
			},
			{
				id: 'troubleshooting',
				title: 'Troubleshooting Common Issues',
				content: `
# Troubleshooting Guide

Solutions to common issues and problems you might encounter.

## Dashboard Not Loading
**Problem**: Dashboard shows blank or fails to open
**Solutions**:
1. Check if you have markdown files in your vault
2. Refresh analytics data (Ctrl+Shift+F)
3. Restart Obsidian
4. Check console for error messages (Ctrl+Shift+I)

## No Data Showing
**Problem**: Charts are empty or show "No data available"
**Solutions**:
1. Ensure you have created some notes
2. Check if files are excluded by patterns in settings
3. Try different time ranges
4. Verify file modification dates

## Performance Issues
**Problem**: Plugin is slow or unresponsive
**Solutions**:
1. Disable real-time updates in settings
2. Increase cache duration
3. Exclude large folders from analysis
4. Use compact view mode

## Charts Not Rendering
**Problem**: Charts appear broken or don't display
**Solutions**:
1. Clear browser cache
2. Update Obsidian to latest version
3. Check if other plugins conflict
4. Try different chart types

## Export Failures
**Problem**: Exports fail or create empty files
**Solutions**:
1. Check vault permissions
2. Ensure "Analytics Exports" folder exists
3. Try different export formats
4. Close other file-intensive applications

## Memory Issues
**Problem**: High memory usage or crashes
**Solutions**:
1. Reduce analysis time range
2. Exclude large folders
3. Clear analytics cache
4. Restart Obsidian regularly

## Getting Help
If problems persist:
1. Check the GitHub issues page
2. Enable debug logging in settings
3. Report bugs with error details
4. Join the community discussions
				`,
				category: 'troubleshooting',
				tags: ['problems', 'fixes', 'performance', 'errors'],
				lastUpdated: '2025-01-29'
			},
			{
				id: 'advanced-settings',
				title: 'Advanced Settings and Customization',
				content: `
# Advanced Settings Guide

Customize the plugin to fit your specific needs and workflow.

## Performance Settings

### Caching Options
- **Cache Duration**: How long to store calculated data
- **Memory Limit**: Maximum memory usage for cache
- **Auto-refresh Interval**: Frequency of automatic updates

### File Processing
- **Batch Size**: Number of files processed at once
- **Include Patterns**: File types to analyze
- **Exclude Patterns**: Files to ignore
- **Folder Filters**: Specific folders to include/exclude

## Visual Customization

### Chart Appearance
- **Color Themes**: Custom color schemes for charts
- **Chart Sizes**: Default dimensions for visualizations
- **Animation Settings**: Enable/disable chart animations

### Interface Options
- **Compact View**: Reduced spacing for smaller screens
- **Theme Integration**: Match Obsidian's light/dark themes
- **Language Selection**: Multi-language support

## Data Management

### Goals and Targets
- **Daily Word Goal**: Target words per day
- **Weekly File Goal**: Target files per week
- **Monthly Goals**: Long-term objectives

### Analytics Preferences
- **Advanced Analytics**: Enable trend analysis and predictions
- **Statistical Summaries**: Show detailed statistical information
- **Correlation Analysis**: Track relationships between metrics

## Integration Settings

### Keyboard Shortcuts
- **Enable/Disable**: Toggle shortcut functionality
- **Custom Bindings**: Modify default key combinations
- **Conflict Resolution**: Handle overlapping shortcuts

### Real-time Updates
- **File Watching**: Monitor file changes automatically
- **Update Frequency**: How often to refresh data
- **Background Processing**: Update analytics while working

## Data Privacy

### Local Storage
- All data remains in your vault
- No external services required
- Complete data ownership

### Export Control
- Choose what data to include in exports
- Control sharing permissions
- Secure backup options

## Performance Optimization Tips
1. Exclude temporary and cache folders
2. Use moderate cache sizes for large vaults
3. Disable real-time updates for better performance
4. Regularly clear old analytics data
				`,
				category: 'advanced',
				tags: ['settings', 'customization', 'performance', 'privacy'],
				lastUpdated: '2025-01-29'
			}
		];
	}

	/**
	 * Initialize tutorial content
	 */
	private initializeTutorials(): void {
		this.tutorials = [
			{
				id: 'first-dashboard',
				title: 'Your First Analytics Dashboard',
				description: 'Learn how to open and navigate the analytics dashboard for the first time.',
				estimatedTime: 5,
				difficulty: 'beginner',
				steps: [
					{
						title: 'Open the Dashboard',
						content: 'Click the dashboard icon in the left ribbon or use Ctrl+Shift+A to open your analytics dashboard.',
						action: {
							type: 'highlight',
							selector: '.notes-analytics-ribbon-class'
						}
					},
					{
						title: 'Explore Metric Cards',
						content: 'Each card shows different aspects of your writing. Click the chart type buttons to change visualizations.',
						action: {
							type: 'highlight',
							selector: '.metric-card'
						}
					},
					{
						title: 'Try Different Time Ranges',
						content: 'Use the time frame selector to view data for different periods.',
						action: {
							type: 'highlight',
							selector: '.filter-select'
						}
					},
					{
						title: 'Zoom for Details',
						content: 'Click the zoom button on any chart to see it in full-screen detail.',
						action: {
							type: 'highlight',
							selector: '.zoom-btn'
						}
					},
					{
						title: 'Refresh Your Data',
						content: 'Use the refresh button or Ctrl+Shift+F to update your analytics with the latest data.',
						action: {
							type: 'click',
							selector: '.refresh-btn'
						}
					}
				]
			},
			{
				id: 'setup-goals',
				title: 'Setting Up Writing Goals',
				description: 'Configure daily, weekly, and monthly writing goals to track your progress.',
				estimatedTime: 3,
				difficulty: 'beginner',
				steps: [
					{
						title: 'Open Settings',
						content: 'Go to Settings > Plugin Options > Notes Analytics to access plugin settings.',
						action: {
							type: 'click',
							selector: '[data-plugin-id="notes-analytics"]'
						}
					},
					{
						title: 'Set Daily Word Goal',
						content: 'Enter your target number of words to write each day. Start with a realistic goal like 300-500 words.',
						action: {
							type: 'highlight',
							selector: 'input[name="dailyWordGoal"]'
						}
					},
					{
						title: 'Configure Weekly File Goal',
						content: 'Set how many new files you want to create each week. This could be 3-7 depending on your workflow.',
						action: {
							type: 'highlight',
							selector: 'input[name="weeklyFileGoal"]'
						}
					},
					{
						title: 'Set Monthly Target',
						content: 'Choose a monthly word count goal. This should be realistic but challenging.',
						action: {
							type: 'highlight',
							selector: 'input[name="monthlyWordGoal"]'
						}
					},
					{
						title: 'Save and Track',
						content: 'Save your settings and return to the dashboard to see your goal progress in the Goal Progress card.',
						action: {
							type: 'click',
							selector: '.mod-cta'
						}
					}
				]
			},
			{
				id: 'export-report',
				title: 'Creating Your First Export Report',
				description: 'Learn how to export and share your analytics data in various formats.',
				estimatedTime: 7,
				difficulty: 'intermediate',
				steps: [
					{
						title: 'Open Chart Visualizations',
						content: 'Click the chart icon in the ribbon or use Ctrl+Shift+C to open the chart viewer.',
						action: {
							type: 'click',
							selector: '.chart-ribbon-icon'
						}
					},
					{
						title: 'Choose Your Data',
						content: 'Select the metric and chart type you want to include in your export.',
						action: {
							type: 'highlight',
							selector: '.chart-controls'
						}
					},
					{
						title: 'Export Chart Image',
						content: 'Use the PNG or SVG buttons to export your chart as an image file.',
						action: {
							type: 'highlight',
							selector: '.export-controls'
						}
					},
					{
						title: 'Export Raw Data',
						content: 'Click CSV or JSON to export the underlying data for further analysis.',
						action: {
							type: 'click',
							selector: '.export-csv-btn'
						}
					},
					{
						title: 'Find Your Files',
						content: 'All exports are saved to the "Analytics Exports" folder in your vault for easy access.',
						action: {
							type: 'highlight',
							selector: '.file-explorer'
						}
					}
				]
			}
		];
	}

	/**
	 * Get help topic by ID
	 */
	getHelpTopic(id: string): HelpTopic | undefined {
		return this.helpTopics.find(topic => topic.id === id);
	}

	/**
	 * Search help topics
	 */
	searchHelpTopics(query: string): HelpTopic[] {
		const lowercaseQuery = query.toLowerCase();
		return this.helpTopics.filter(topic =>
			topic.title.toLowerCase().includes(lowercaseQuery) ||
			topic.content.toLowerCase().includes(lowercaseQuery) ||
			topic.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
		);
	}

	/**
	 * Get help topics by category
	 */
	getHelpTopicsByCategory(category: string): HelpTopic[] {
		return this.helpTopics.filter(topic => topic.category === category);
	}

	/**
	 * Get all tutorials
	 */
	getTutorials(): Tutorial[] {
		return this.tutorials;
	}

	/**
	 * Get tutorial by ID
	 */
	getTutorial(id: string): Tutorial | undefined {
		return this.tutorials.find(tutorial => tutorial.id === id);
	}

	/**
	 * Generate contextual help based on current state
	 */
	getContextualHelp(context: string): HelpTopic[] {
		const contextMap: Record<string, string[]> = {
			'dashboard': ['dashboard-overview', 'chart-types'],
			'charts': ['chart-types', 'export-sharing'],
			'settings': ['advanced-settings', 'troubleshooting'],
			'export': ['export-sharing', 'troubleshooting'],
			'first-time': ['getting-started', 'first-dashboard']
		};

		const relevantIds = contextMap[context] || [];
		return relevantIds.map(id => this.getHelpTopic(id)).filter(Boolean) as HelpTopic[];
	}

	/**
	 * Generate quick tips based on user behavior
	 */
	getQuickTips(): string[] {
		return [
			"💡 Use Ctrl+Shift+A to quickly open your analytics dashboard",
			"📊 Try different chart types to discover new insights in your data",
			"🎯 Set realistic daily word goals to stay motivated",
			"📈 Check your writing streak to maintain consistency",
			"💾 Export your progress regularly to track long-term trends",
			"🔍 Use custom date ranges to analyze specific time periods",
			"⚡ Enable real-time updates to see changes as you write",
			"🎨 Customize chart colors in settings to match your theme",
			"📱 The dashboard is mobile-friendly for checking progress on the go",
			"🔄 Refresh your data after major writing sessions for accurate metrics"
		];
	}

	/**
	 * Get FAQ entries
	 */
	getFAQ(): Array<{ question: string; answer: string }> {
		return [
			{
				question: "Why is my dashboard showing no data?",
				answer: "Make sure you have created some markdown files in your vault. The plugin only analyzes .md files. Also check if your files are excluded by the folder/pattern filters in settings."
			},
			{
				question: "How often does the plugin update my analytics?",
				answer: "By default, analytics update every 5 minutes when real-time updates are enabled. You can change this interval in settings or manually refresh using Ctrl+Shift+F."
			},
			{
				question: "Can I exclude certain folders from analysis?",
				answer: "Yes! Go to Settings > Notes Analytics and add folder patterns to the exclude list. For example, add '.trash' or 'Archive' to exclude those folders."
			},
			{
				question: "How do I export my analytics data?",
				answer: "Open the chart visualization modal and use the export buttons in the top-right corner. You can export as PNG, SVG, CSV, or JSON formats."
			},
			{
				question: "Is my data sent to external servers?",
				answer: "No, all analytics data stays completely local in your Obsidian vault. Nothing is sent to external servers, ensuring complete privacy."
			},
			{
				question: "Can I customize the appearance of charts?",
				answer: "Yes! You can customize chart colors, themes, and sizes in the plugin settings. The charts also automatically adapt to your Obsidian theme."
			},
			{
				question: "How do I set up writing goals?",
				answer: "Go to Settings > Notes Analytics and set your daily word goal, weekly file goal, and monthly word goal. Your progress will show in the Goal Progress card."
			},
			{
				question: "What's the difference between word count and file count metrics?",
				answer: "Word count tracks the total number of words you've written, while file count tracks how many separate notes you've created. Both provide different insights into your writing habits."
			}
		];
	}
}

/**
 * Interactive Help Modal
 */
export class HelpModal {
	private app: any;
	private helpService: HelpService;
	private modal: any;

	constructor(app: any) {
		this.app = app;
		this.helpService = new HelpService();
	}

	/**
	 * Show help modal with specific topic
	 */
	showHelp(topicId?: string): void {
		// Implementation would create and show a modal with help content
		// This is a simplified version - full implementation would need Obsidian Modal class
		const topic = topicId ? this.helpService.getHelpTopic(topicId) : null;
		
		if (topic) {
			console.log(`Showing help for: ${topic.title}`);
			console.log(topic.content);
		} else {
			this.showHelpIndex();
		}
	}

	/**
	 * Show help index with all topics
	 */
	private showHelpIndex(): void {
		const categories = ['getting-started', 'features', 'troubleshooting', 'advanced'];
		
		console.log("=== Notes Analytics Help ===");
		categories.forEach(category => {
			const topics = this.helpService.getHelpTopicsByCategory(category);
			console.log(`\n${category.toUpperCase()}:`);
			topics.forEach(topic => {
				console.log(`- ${topic.title}`);
			});
		});
	}

	/**
	 * Show quick tips
	 */
	showQuickTips(): void {
		const tips = this.helpService.getQuickTips();
		console.log("=== Quick Tips ===");
		tips.forEach((tip, index) => {
			console.log(`${index + 1}. ${tip}`);
		});
	}
}
