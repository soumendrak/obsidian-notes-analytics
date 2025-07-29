# Notes Analytics Plugin for Obsidian

A specialized analytics plugin for Obsidian that provides interactive chart visualizations for your note-taking patterns and writing productivity, featuring a comprehensive analytics dashboard for deep insights.

## Features

### 📊 Comprehensive Analytics Dashboard
- **Single Pane of Truth**: View all your analytics metrics in one unified dashboard
- **8 Different Metric Categories**: Word count trends, files created, average words per file, cumulative progress, writing streaks, goal progress, activity heatmap, and period comparisons
- **Interactive Chart Controls**: Switch between line, bar, area, and pie charts for each metric
- **Zoom-to-Detail**: Click the zoom button on any chart to view it in full-screen detail
- **Smart Filtering**: Filter data by time frame (week, month, quarter, year, all time, or custom ranges)
- **Real-time Updates**: Refresh all metrics simultaneously with one click
- **Responsive Design**: Optimized for various screen sizes and layouts
- **Professional Interface**: Clean, modern design that adapts to your Obsidian theme

### 📈 Interactive Chart Visualizations
- **Line Charts**: Visualize trends over time with smooth line graphs
- **Bar Charts**: Compare data across periods with clear bar visualizations
- **Area Charts**: Filled area charts showing data trends with gradient fills
- **Pie Charts**: Circular charts perfect for showing proportional data
- **Heatmap Calendar**: GitHub-style calendar showing daily writing activity intensity
- **Multiple Metrics**: Chart total words, files created, cumulative file count, average words per file, and cumulative data
- **Flexible Time Frames**: View daily, weekly, monthly, or yearly data
- **Custom Date Ranges**: Select specific date ranges for targeted analysis
- **Large Display**: Enhanced modal window with 1000x500px charts for better visibility
- **Dynamic Updates**: Charts update in real-time based on your selections
- **Color-coded Metrics**: Each metric type has its own distinctive color scheme
- **Advanced Export Options**: 
  - Export charts as PNG images
  - Export charts as SVG vector graphics
  - Copy charts directly to clipboard
  - Export data as CSV or JSON formats
- **Intuitive Interface**: Export controls positioned in top-right corner for easy access

### ⚙️ Customizable Settings
- Enable/disable real-time updates for better performance
- Toggle advanced statistics display (cumulative data)
- Customizable chart types and date formats
- Real-time status bar updates

## Usage

### Accessing Analytics
1. **Dashboard**: Click the dashboard icon in the left ribbon for the comprehensive analytics dashboard
2. **Individual Charts**: Click the bar chart icon in the left ribbon for single chart view
3. **Command Palette**: Use "Show Analytics Dashboard" or "Show Chart Visualizations" commands

### Dashboard Features
The Analytics Dashboard provides:
- **Grid Layout**: All metrics displayed in an organized grid with small preview charts
- **Chart Type Switching**: Toggle between different chart types for each metric using buttons
- **Time Frame Filtering**: Change the time period for all charts simultaneously
- **Zoom Functionality**: Click the zoom icon (⛶) on any chart to view it in full-screen mode
- **Smart Data**: Automatically adapts chart types based on data (e.g., heatmap always shows calendar view)
- **Loading States**: Visual feedback when refreshing data across all metrics

### Metrics Available
1. **Word Count Trends**: Track your daily writing progress and patterns
2. **Files Created**: Monitor file creation patterns and productivity
3. **Average Words per File**: Track writing depth and quality metrics
4. **Cumulative Progress**: Visualize your total writing growth over time
5. **Writing Streaks**: Monitor consistency and writing habits
6. **Goal Progress**: Track achievement of daily, weekly, and monthly writing goals
7. **Activity Heatmap**: GitHub-style calendar showing daily activity intensity
8. **Period Comparison**: Compare current vs previous periods (month, week, year)

### Chart Features
Interactive data visualizations featuring:
- **Smooth Animations**: Charts animate in with professional transition effects
- **Dynamic Controls**: Switch between chart types, time frames, and metrics instantly
- **Responsive Design**: Charts adapt to your theme and display preferences
- **Export Ready**: High-quality canvas-based charts for clear visualization

### Status Bar
The status bar shows real-time information:
- Total number of markdown files
- Total estimated word count (updates automatically when real-time updates are enabled)

## Settings

Configure the plugin behavior in Settings > Notes Analytics:

- **Enable Real-time Updates**: Update status bar and analytics automatically when files change
- **Show Advanced Statistics**: Display cumulative word counts and additional analytics
- **Default Chart Type**: Set your preferred chart type (line or bar charts)
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
The plugin reads file contents to provide accurate word count calculation for chart data. The status bar uses an optimized estimation based on file size for performance.

### Data Sources
- File creation times from Obsidian's file system API
- File statistics and content for accurate word count calculation
- Real-time vault monitoring for updates (when enabled)

### Performance Features
- Debounced updates to prevent excessive calculations
- Optional real-time updates that can be disabled for better performance
- Efficient caching of analytics data
- Hardware-accelerated canvas rendering for smooth chart performance

### Chart Technology
- Native HTML5 Canvas-based rendering for optimal performance
- No external dependencies - lightweight and fast
- Responsive design that adapts to theme colors
- Smooth animations and interactive controls

## Roadmap

Planned features for future releases:
- [x] Chart visualizations for analytics data (line charts, bar charts) ✅ **COMPLETED**
- [x] Enhanced chart types (pie charts, area charts, scatter plots) ✅ **COMPLETED**
- [x] Chart export functionality (PNG, SVG, PDF formats) ✅ **COMPLETED**
- [x] Export analytics data to CSV/JSON formats ✅ **COMPLETED**
- [x] Custom date ranges for analytics (e.g., last 30 days, custom periods) ✅ **COMPLETED**
- [x] Code refactoring and modularization ✅ **COMPLETED**
- [x] More detailed writing streak tracking with streak history ✅ **COMPLETED**
- [x] Interactive chart tooltips and data point details ✅ **COMPLETED**
- [x] File size analytics and growth tracking ✅ **COMPLETED**
- [x] Tags and folder-based analytics filtering ✅ **COMPLETED**
- [x] Writing goals and progress tracking ✅ **COMPLETED**
- [x] Integration with daily notes for better insights ✅ **COMPLETED**
- [x] Comparison views (for e.g. this month vs last month, this week vs last week, this year vs last year) ✅ **COMPLETED**
- [x] Heatmap calendar view of writing activity ✅ **COMPLETED**
- [x] Chart animation and transition effects ✅ **COMPLETED**

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
