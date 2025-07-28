# Notes Analytics Plugin for Obsidian

A comprehensive analytics plugin for Obsidian that provides insights into your note-taking patterns and writing productivity.

## Features

### 📈 File Creation History
- Track when files were created over days, months, and years
- View detailed timeline of your note creation patterns
- See file creation trends and productivity insights
- Individual file word counts for each creation date

### 📊 Advanced Word Count Analytics
- Monitor word count growth over time with enhanced statistics
- Filter analytics by day, month, or year
- Track total words written and average words per file
- View cumulative word count progression
- Analyze productivity statistics and writing trends

### 🎯 Enhanced Dashboard Overview
- Comprehensive summary with key statistics
- Writing streak tracking - see how many consecutive days you've written
- Most productive day identification
- Oldest and newest file tracking
- Real-time status bar updates
- Easy access to different analytics views

### ⚙️ Customizable Settings
- Enable/disable real-time updates for better performance
- Toggle advanced statistics display
- Customizable date formats
- Individual feature toggles for file history and word count tracking

## Usage

### Accessing Analytics
1. **Ribbon Icon**: Click the bar chart icon in the left ribbon
2. **Command Palette**: Use "Open Notes Analytics" command
3. **Specific Views**: 
   - "Show File Creation History" - View file creation timeline
   - "Show Word Count Analytics" - View word count trends

### Analytics Views

#### File Creation History
Shows a chronological view of when your files were created, grouped by date. Each entry displays:
- File path
- Creation date
- Estimated word count

#### Word Count Analytics
Provides comprehensive statistical analysis of your writing patterns with:
- Selectable time frames (daily, monthly, yearly)
- Files created per period
- Total words written in each period
- Average words per file
- Cumulative word count progression (when advanced stats are enabled)
- Writing productivity trends over time

### Status Bar
The status bar shows real-time information:
- Total number of markdown files
- Total estimated word count (updates automatically when real-time updates are enabled)

## Settings

Configure the plugin behavior in Settings > Notes Analytics:

- **Show File Creation History**: Enable/disable file creation tracking
- **Show Word Count Tracking**: Enable/disable word count analytics
- **Enable Real-time Updates**: Update status bar and analytics automatically when files change
- **Show Advanced Statistics**: Display cumulative word counts, writing streaks, and additional analytics
- **Date Format**: Customize date display format (uses moment.js format)

## Installation

### Manual Installation
1. Download the latest release files (`main.js`, `styles.css`, `manifest.json`)
2. Create a folder `YourVault/.obsidian/plugins/obsidian-notes-analytics/`
3. Copy the downloaded files into this folder
4. Reload Obsidian and enable the plugin in Settings > Community Plugins

### Development Installation
1. Clone this repository into your vault's plugins folder:
   ```bash
   cd YourVault/.obsidian/plugins/
   git clone https://github.com/soumendrak/obsidian-notes-analytics.git
   ```
2. Navigate to the plugin folder and install dependencies:
   ```bash
   cd obsidian-notes-analytics
   npm install
   ```
3. Build the plugin:
   ```bash
   npm run build
   ```
4. Enable the plugin in Obsidian settings

## Development

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Building
```bash
# Install dependencies
npm install

# Development build with watch mode
npm run dev

# Production build
npm run build
```

### Project Structure
- `main.ts` - Main plugin code with analytics functionality
- `styles.css` - Plugin styling
- `manifest.json` - Plugin metadata
- `esbuild.config.mjs` - Build configuration

## Technical Details

### Word Count Calculation
The plugin reads file contents to provide accurate word count calculation. For performance optimization, the status bar uses an estimation based on file size, while detailed analytics use exact word counts from file contents.

### Data Sources
- File creation times from Obsidian's file system API
- File statistics and content for accurate word count calculation
- Real-time vault monitoring for updates (when enabled)

### Performance Features
- Debounced updates to prevent excessive calculations
- Optional real-time updates that can be disabled for better performance
- Efficient caching of analytics data

## Roadmap

Planned features for future releases:
- [ ] Chart visualizations for analytics data (line charts, bar charts)
- [ ] Export analytics data to CSV/JSON formats
- [ ] More detailed writing streak tracking with streak history
- [ ] Integration with daily notes for better insights
- [ ] Custom date ranges for analytics (e.g., last 30 days, custom periods)
- [ ] File size analytics and growth tracking
- [ ] Tags and folder-based analytics filtering
- [ ] Writing goals and progress tracking
- [ ] Comparison views (this month vs last month)
- [ ] Heatmap calendar view of writing activity

## Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you find this plugin helpful, consider:
- ⭐ Starring the repository
- 🐛 Reporting bugs or requesting features
- 💡 Contributing to the codebase

## Acknowledgments

Built using the Obsidian Plugin API and inspired by the need for better writing analytics in note-taking workflows.
