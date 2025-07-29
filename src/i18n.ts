/**
 * Internationalization (i18n) system for Notes Analytics Plugin
 */

export interface TranslationKeys {
	// Dashboard
	'dashboard.title': string;
	'dashboard.refresh': string;
	'dashboard.loading': string;
	'dashboard.error': string;
	'dashboard.empty': string;
	'dashboard.retry': string;

	// Metrics
	'metrics.wordCount': string;
	'metrics.filesCreated': string;
	'metrics.averageWords': string;
	'metrics.cumulativeFiles': string;
	'metrics.writingStreak': string;
	'metrics.goalProgress': string;
	'metrics.activityHeatmap': string;
	'metrics.periodComparison': string;

	// Charts
	'charts.line': string;
	'charts.bar': string;
	'charts.area': string;
	'charts.pie': string;
	'charts.zoom': string;
	'charts.export': string;
	'charts.loading': string;
	'charts.error': string;
	'charts.noData': string;

	// Time filters
	'timeframe.today': string;
	'timeframe.week': string;
	'timeframe.month': string;
	'timeframe.quarter': string;
	'timeframe.year': string;
	'timeframe.allTime': string;
	'timeframe.custom': string;

	// Export
	'export.csv': string;
	'export.json': string;
	'export.png': string;
	'export.svg': string;
	'export.copy': string;
	'export.success': string;
	'export.error': string;

	// Settings
	'settings.title': string;
	'settings.dateFormat': string;
	'settings.dateFormatDesc': string;
	'settings.realTimeUpdates': string;
	'settings.realTimeUpdatesDesc': string;
	'settings.advancedStats': string;
	'settings.advancedStatsDesc': string;
	'settings.defaultChart': string;
	'settings.defaultChartDesc': string;
	'settings.chartExport': string;
	'settings.chartExportDesc': string;
	'settings.customDateRange': string;
	'settings.customDateRangeDesc': string;
	'settings.language': string;
	'settings.languageDesc': string;

	// Errors
	'error.failedToLoad': string;
	'error.failedToSave': string;
	'error.failedToExport': string;
	'error.failedToRefresh': string;
	'error.invalidDateRange': string;
	'error.noDataAvailable': string;

	// Accessibility
	'aria.dashboard': string;
	'aria.chartControls': string;
	'aria.metricCard': string;
	'aria.chartVisualization': string;
	'aria.exportControls': string;
	'aria.timeFrameSelector': string;

	// Keyboard shortcuts
	'shortcuts.dashboard': string;
	'shortcuts.charts': string;
	'shortcuts.refresh': string;
	'shortcuts.report': string;
}

export const translations: Record<string, Partial<TranslationKeys>> = {
	en: {
		// Dashboard
		'dashboard.title': 'Analytics Dashboard',
		'dashboard.refresh': 'Refresh Dashboard',
		'dashboard.loading': 'Loading analytics data...',
		'dashboard.error': 'Failed to load analytics data',
		'dashboard.empty': 'No data available',
		'dashboard.retry': 'Retry',

		// Metrics
		'metrics.wordCount': 'Word Count Trends',
		'metrics.filesCreated': 'Files Created',
		'metrics.averageWords': 'Average Words per File',
		'metrics.cumulativeFiles': 'Cumulative File Count',
		'metrics.writingStreak': 'Writing Streak',
		'metrics.goalProgress': 'Goal Progress',
		'metrics.activityHeatmap': 'Activity Heatmap',
		'metrics.periodComparison': 'Period Comparison',

		// Charts
		'charts.line': 'Line Chart',
		'charts.bar': 'Bar Chart',
		'charts.area': 'Area Chart',
		'charts.pie': 'Pie Chart',
		'charts.zoom': 'Zoom to full view',
		'charts.export': 'Export Chart',
		'charts.loading': 'Generating chart...',
		'charts.error': 'Failed to generate chart',
		'charts.noData': 'No data to display',

		// Time filters
		'timeframe.today': 'Today',
		'timeframe.week': 'This Week',
		'timeframe.month': 'This Month',
		'timeframe.quarter': 'This Quarter',
		'timeframe.year': 'This Year',
		'timeframe.allTime': 'All Time',
		'timeframe.custom': 'Custom Range',

		// Export
		'export.csv': 'Export CSV',
		'export.json': 'Export JSON',
		'export.png': 'Export PNG',
		'export.svg': 'Export SVG',
		'export.copy': 'Copy to Clipboard',
		'export.success': 'Export successful',
		'export.error': 'Export failed',

		// Settings
		'settings.title': 'Notes Analytics Settings',
		'settings.dateFormat': 'Date Format',
		'settings.dateFormatDesc': 'How dates should be formatted in exports',
		'settings.realTimeUpdates': 'Enable Real-time Updates',
		'settings.realTimeUpdatesDesc': 'Update analytics when files are modified',
		'settings.advancedStats': 'Show Advanced Statistics',
		'settings.advancedStatsDesc': 'Display additional statistical information',
		'settings.defaultChart': 'Default Chart Type',
		'settings.defaultChartDesc': 'The chart type to show when opening analytics',
		'settings.chartExport': 'Enable Chart Export',
		'settings.chartExportDesc': 'Allow exporting charts as images',
		'settings.customDateRange': 'Enable Custom Date Range',
		'settings.customDateRangeDesc': 'Allow selecting custom date ranges for analysis',
		'settings.language': 'Language',
		'settings.languageDesc': 'Select your preferred language',

		// Errors
		'error.failedToLoad': 'Failed to load analytics data. Please try again.',
		'error.failedToSave': 'Failed to save settings. Please try again.',
		'error.failedToExport': 'Failed to export data. Please try again.',
		'error.failedToRefresh': 'Failed to refresh data. Please try again.',
		'error.invalidDateRange': 'Invalid date range selected.',
		'error.noDataAvailable': 'No data available for the selected period.',

		// Accessibility
		'aria.dashboard': 'Analytics Dashboard',
		'aria.chartControls': 'Chart configuration controls',
		'aria.metricCard': 'analytics card',
		'aria.chartVisualization': 'chart visualization',
		'aria.exportControls': 'Export controls',
		'aria.timeFrameSelector': 'Select time frame for analytics',

		// Keyboard shortcuts
		'shortcuts.dashboard': 'Open Analytics Dashboard',
		'shortcuts.charts': 'Open Chart Visualizations',
		'shortcuts.refresh': 'Refresh Analytics Data',
		'shortcuts.report': 'Generate Full Analytics Report',
	},

	es: {
		// Dashboard
		'dashboard.title': 'Panel de Análisis',
		'dashboard.refresh': 'Actualizar Panel',
		'dashboard.loading': 'Cargando datos de análisis...',
		'dashboard.error': 'Error al cargar datos de análisis',
		'dashboard.empty': 'No hay datos disponibles',
		'dashboard.retry': 'Reintentar',

		// Metrics
		'metrics.wordCount': 'Tendencias de Conteo de Palabras',
		'metrics.filesCreated': 'Archivos Creados',
		'metrics.averageWords': 'Promedio de Palabras por Archivo',
		'metrics.cumulativeFiles': 'Conteo Acumulativo de Archivos',
		'metrics.writingStreak': 'Racha de Escritura',
		'metrics.goalProgress': 'Progreso de Objetivos',
		'metrics.activityHeatmap': 'Mapa de Calor de Actividad',
		'metrics.periodComparison': 'Comparación de Períodos',

		// Charts
		'charts.line': 'Gráfico de Línea',
		'charts.bar': 'Gráfico de Barras',
		'charts.area': 'Gráfico de Área',
		'charts.pie': 'Gráfico Circular',
		'charts.zoom': 'Ampliar a vista completa',
		'charts.export': 'Exportar Gráfico',

		// Time filters
		'timeframe.today': 'Hoy',
		'timeframe.week': 'Esta Semana',
		'timeframe.month': 'Este Mes',
		'timeframe.quarter': 'Este Trimestre',
		'timeframe.year': 'Este Año',
		'timeframe.allTime': 'Todo el Tiempo',
		'timeframe.custom': 'Rango Personalizado',

		// Settings
		'settings.title': 'Configuración de Análisis de Notas',
		'settings.language': 'Idioma',
		'settings.languageDesc': 'Selecciona tu idioma preferido',
	},

	fr: {
		// Dashboard
		'dashboard.title': 'Tableau de Bord Analytique',
		'dashboard.refresh': 'Actualiser le Tableau de Bord',
		'dashboard.loading': 'Chargement des données analytiques...',
		'dashboard.error': 'Échec du chargement des données analytiques',
		'dashboard.empty': 'Aucune donnée disponible',
		'dashboard.retry': 'Réessayer',

		// Metrics
		'metrics.wordCount': 'Tendances du Nombre de Mots',
		'metrics.filesCreated': 'Fichiers Créés',
		'metrics.averageWords': 'Moyenne de Mots par Fichier',
		'metrics.cumulativeFiles': 'Nombre Cumulatif de Fichiers',
		'metrics.writingStreak': 'Séquence d\'Écriture',
		'metrics.goalProgress': 'Progrès des Objectifs',
		'metrics.activityHeatmap': 'Carte de Chaleur d\'Activité',
		'metrics.periodComparison': 'Comparaison de Périodes',

		// Charts
		'charts.line': 'Graphique Linéaire',
		'charts.bar': 'Graphique en Barres',
		'charts.area': 'Graphique en Aires',
		'charts.pie': 'Graphique Circulaire',
		'charts.zoom': 'Agrandir en vue complète',

		// Time filters
		'timeframe.today': 'Aujourd\'hui',
		'timeframe.week': 'Cette Semaine',
		'timeframe.month': 'Ce Mois',
		'timeframe.quarter': 'Ce Trimestre',
		'timeframe.year': 'Cette Année',
		'timeframe.allTime': 'Tout le Temps',
		'timeframe.custom': 'Plage Personnalisée',

		// Settings
		'settings.title': 'Paramètres d\'Analyse des Notes',
		'settings.language': 'Langue',
		'settings.languageDesc': 'Sélectionnez votre langue préférée',
	},

	de: {
		// Dashboard
		'dashboard.title': 'Analytics Dashboard',
		'dashboard.refresh': 'Dashboard Aktualisieren',
		'dashboard.loading': 'Lade Analytics-Daten...',
		'dashboard.error': 'Fehler beim Laden der Analytics-Daten',
		'dashboard.empty': 'Keine Daten verfügbar',
		'dashboard.retry': 'Wiederholen',

		// Metrics
		'metrics.wordCount': 'Wortanzahl-Trends',
		'metrics.filesCreated': 'Erstellte Dateien',
		'metrics.averageWords': 'Durchschnittliche Wörter pro Datei',
		'metrics.cumulativeFiles': 'Kumulative Dateianzahl',
		'metrics.writingStreak': 'Schreibsträhne',
		'metrics.goalProgress': 'Zielfortschritt',
		'metrics.activityHeatmap': 'Aktivitäts-Heatmap',
		'metrics.periodComparison': 'Zeitraumvergleich',

		// Charts
		'charts.line': 'Liniendiagramm',
		'charts.bar': 'Balkendiagramm',
		'charts.area': 'Flächendiagramm',
		'charts.pie': 'Kreisdiagramm',
		'charts.zoom': 'Auf Vollansicht zoomen',

		// Time filters
		'timeframe.today': 'Heute',
		'timeframe.week': 'Diese Woche',
		'timeframe.month': 'Dieser Monat',
		'timeframe.quarter': 'Dieses Quartal',
		'timeframe.year': 'Dieses Jahr',
		'timeframe.allTime': 'Alle Zeit',
		'timeframe.custom': 'Benutzerdefinierter Bereich',

		// Settings
		'settings.title': 'Notizen-Analytics Einstellungen',
		'settings.language': 'Sprache',
		'settings.languageDesc': 'Wählen Sie Ihre bevorzugte Sprache',
	},

	zh: {
		// Dashboard
		'dashboard.title': '分析仪表板',
		'dashboard.refresh': '刷新仪表板',
		'dashboard.loading': '正在加载分析数据...',
		'dashboard.error': '加载分析数据失败',
		'dashboard.empty': '没有可用数据',
		'dashboard.retry': '重试',

		// Metrics
		'metrics.wordCount': '词汇计数趋势',
		'metrics.filesCreated': '创建的文件',
		'metrics.averageWords': '每个文件的平均词数',
		'metrics.cumulativeFiles': '累积文件计数',
		'metrics.writingStreak': '写作连续',
		'metrics.goalProgress': '目标进度',
		'metrics.activityHeatmap': '活动热图',
		'metrics.periodComparison': '时期比较',

		// Charts
		'charts.line': '折线图',
		'charts.bar': '柱状图',
		'charts.area': '面积图',
		'charts.pie': '饼图',
		'charts.zoom': '放大到全视图',

		// Time filters
		'timeframe.today': '今天',
		'timeframe.week': '本周',
		'timeframe.month': '本月',
		'timeframe.quarter': '本季度',
		'timeframe.year': '今年',
		'timeframe.allTime': '所有时间',
		'timeframe.custom': '自定义范围',

		// Settings
		'settings.title': '笔记分析设置',
		'settings.language': '语言',
		'settings.languageDesc': '选择您的首选语言',
	},

	ja: {
		// Dashboard
		'dashboard.title': 'アナリティクスダッシュボード',
		'dashboard.refresh': 'ダッシュボードを更新',
		'dashboard.loading': 'アナリティクスデータを読み込み中...',
		'dashboard.error': 'アナリティクスデータの読み込みに失敗しました',
		'dashboard.empty': '利用可能なデータがありません',
		'dashboard.retry': '再試行',

		// Metrics
		'metrics.wordCount': '単語数トレンド',
		'metrics.filesCreated': '作成されたファイル',
		'metrics.averageWords': 'ファイルあたりの平均単語数',
		'metrics.cumulativeFiles': '累積ファイル数',
		'metrics.writingStreak': '執筆ストリーク',
		'metrics.goalProgress': '目標進捗',
		'metrics.activityHeatmap': 'アクティビティヒートマップ',
		'metrics.periodComparison': '期間比較',

		// Charts
		'charts.line': '折れ線グラフ',
		'charts.bar': '棒グラフ',
		'charts.area': 'エリアチャート',
		'charts.pie': '円グラフ',
		'charts.zoom': 'フルビューにズーム',

		// Time filters
		'timeframe.today': '今日',
		'timeframe.week': '今週',
		'timeframe.month': '今月',
		'timeframe.quarter': '今四半期',
		'timeframe.year': '今年',
		'timeframe.allTime': '全期間',
		'timeframe.custom': 'カスタム範囲',

		// Settings
		'settings.title': 'ノート分析設定',
		'settings.language': '言語',
		'settings.languageDesc': '優先言語を選択してください',
	}
};

export class I18nService {
	private currentLanguage: string = 'en';
	private fallbackLanguage: string = 'en';

	constructor(language: string = 'en') {
		this.setLanguage(language);
	}

	setLanguage(language: string): void {
		if (translations[language]) {
			this.currentLanguage = language;
		} else {
			console.warn(`[Notes Analytics] Language "${language}" not supported, falling back to English`);
			this.currentLanguage = this.fallbackLanguage;
		}
	}

	getLanguage(): string {
		return this.currentLanguage;
	}

	getSupportedLanguages(): Array<{ code: string; name: string }> {
		return [
			{ code: 'en', name: 'English' },
			{ code: 'es', name: 'Español' },
			{ code: 'fr', name: 'Français' },
			{ code: 'de', name: 'Deutsch' },
			{ code: 'zh', name: '中文' },
			{ code: 'ja', name: '日本語' }
		];
	}

	t(key: keyof TranslationKeys, ...args: any[]): string {
		const currentTranslations = translations[this.currentLanguage];
		const fallbackTranslations = translations[this.fallbackLanguage];
		
		let translation = currentTranslations?.[key] || fallbackTranslations?.[key] || key;
		
		// Simple interpolation for arguments
		if (args.length > 0) {
			args.forEach((arg, index) => {
				translation = translation.replace(`{${index}}`, String(arg));
			});
		}
		
		return translation;
	}

	// Helper method to get browser language
	static getBrowserLanguage(): string {
		const browserLang = navigator.language || (navigator as any).userLanguage;
		const langCode = browserLang.split('-')[0].toLowerCase();
		
		// Check if we support this language
		if (translations[langCode]) {
			return langCode;
		}
		
		return 'en'; // Default to English
	}

	// Helper method to format numbers based on locale
	formatNumber(num: number): string {
		try {
			return new Intl.NumberFormat(this.currentLanguage).format(num);
		} catch {
			return num.toLocaleString();
		}
	}

	// Helper method to format dates based on locale
	formatDate(date: Date): string {
		try {
			return new Intl.DateTimeFormat(this.currentLanguage).format(date);
		} catch {
			return date.toLocaleDateString();
		}
	}
}
