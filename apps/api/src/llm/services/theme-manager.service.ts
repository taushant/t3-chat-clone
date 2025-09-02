import { Injectable, Logger } from '@nestjs/common';
import { Theme, ThemeColors } from '../types/markdown.types';

/**
 * Theme Manager Service
 * Manages themes for syntax highlighting and markdown rendering
 */
@Injectable()
export class ThemeManagerService {
  private readonly logger = new Logger(ThemeManagerService.name);
  private readonly themes = new Map<string, Theme>();
  private readonly defaultThemeName = 'default';

  constructor() {
    this.initializeDefaultThemes();
  }

  /**
   * Load a theme by name
   * @param themeName - Theme name
   * @returns Theme object
   */
  loadTheme(themeName: string): Theme {
    const theme = this.themes.get(themeName);
    if (!theme) {
      this.logger.warn(`Theme '${themeName}' not found, using default theme`);
      return this.getDefaultTheme();
    }

    this.logger.debug(`Loaded theme: ${themeName}`);
    return theme;
  }

  /**
   * Get the default theme
   * @returns Default theme
   */
  getDefaultTheme(): Theme {
    const defaultTheme = this.themes.get(this.defaultThemeName);
    if (!defaultTheme) {
      throw new Error('Default theme not found');
    }
    return defaultTheme;
  }

  /**
   * Validate a theme object
   * @param theme - Theme to validate
   * @returns true if valid
   */
  validateTheme(theme: Theme): boolean {
    if (!theme.name || !theme.displayName) {
      return false;
    }

    if (!theme.colors) {
      return false;
    }

    // Check required color properties
    const requiredColors: (keyof ThemeColors)[] = [
      'background', 'foreground', 'comment', 'keyword', 'string', 'number',
      'function', 'variable', 'type', 'constant', 'operator', 'punctuation',
      'error', 'warning'
    ];

    for (const color of requiredColors) {
      if (!theme.colors[color]) {
        this.logger.warn(`Theme '${theme.name}' missing required color: ${color}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Get theme CSS
   * @param theme - Theme object
   * @returns CSS string
   */
  getThemeCSS(theme: Theme): string {
    if (!this.validateTheme(theme)) {
      throw new Error(`Invalid theme: ${theme.name}`);
    }

    return `
      /* Theme: ${theme.displayName} */
      .theme-${theme.name} {
        --bg-color: ${theme.colors.background};
        --fg-color: ${theme.colors.foreground};
        --comment-color: ${theme.colors.comment};
        --keyword-color: ${theme.colors.keyword};
        --string-color: ${theme.colors.string};
        --number-color: ${theme.colors.number};
        --function-color: ${theme.colors.function};
        --variable-color: ${theme.colors.variable};
        --type-color: ${theme.colors.type};
        --constant-color: ${theme.colors.constant};
        --operator-color: ${theme.colors.operator};
        --punctuation-color: ${theme.colors.punctuation};
        --error-color: ${theme.colors.error};
        --warning-color: ${theme.colors.warning};
      }

      .theme-${theme.name} .code-block {
        background-color: var(--bg-color);
        color: var(--fg-color);
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 14px;
        line-height: 1.5;
        padding: 16px;
        border-radius: 8px;
        overflow-x: auto;
        border: 1px solid ${theme.isDark ? '#444' : '#e1e5e9'};
      }

      .theme-${theme.name} .line-number {
        display: inline-block;
        width: 40px;
        text-align: right;
        margin-right: 16px;
        color: var(--comment-color);
        user-select: none;
        opacity: 0.7;
      }

      .theme-${theme.name} .line-content {
        display: inline-block;
        width: calc(100% - 56px);
      }

      .theme-${theme.name} .keyword { 
        color: var(--keyword-color); 
        font-weight: bold; 
      }
      
      .theme-${theme.name} .string { 
        color: var(--string-color); 
      }
      
      .theme-${theme.name} .number { 
        color: var(--number-color); 
      }
      
      .theme-${theme.name} .comment { 
        color: var(--comment-color); 
        font-style: italic; 
      }
      
      .theme-${theme.name} .function { 
        color: var(--function-color); 
      }
      
      .theme-${theme.name} .variable { 
        color: var(--variable-color); 
      }
      
      .theme-${theme.name} .type { 
        color: var(--type-color); 
      }
      
      .theme-${theme.name} .constant { 
        color: var(--constant-color); 
      }
      
      .theme-${theme.name} .operator { 
        color: var(--operator-color); 
      }
      
      .theme-${theme.name} .punctuation { 
        color: var(--punctuation-color); 
      }
      
      .theme-${theme.name} .tag { 
        color: var(--keyword-color); 
      }
      
      .theme-${theme.name} .attribute { 
        color: var(--variable-color); 
      }
      
      .theme-${theme.name} .selector { 
        color: var(--keyword-color); 
      }
      
      .theme-${theme.name} .property { 
        color: var(--variable-color); 
      }
      
      .theme-${theme.name} .value { 
        color: var(--string-color); 
      }
      
      .theme-${theme.name} .key { 
        color: var(--variable-color); 
      }
      
      .theme-${theme.name} .boolean { 
        color: var(--constant-color); 
      }
      
      .theme-${theme.name} .null { 
        color: var(--constant-color); 
      }

      /* Markdown content styling */
      .theme-${theme.name} .markdown-content {
        background-color: var(--bg-color);
        color: var(--fg-color);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
      }

      .theme-${theme.name} .markdown-content h1,
      .theme-${theme.name} .markdown-content h2,
      .theme-${theme.name} .markdown-content h3,
      .theme-${theme.name} .markdown-content h4,
      .theme-${theme.name} .markdown-content h5,
      .theme-${theme.name} .markdown-content h6 {
        color: var(--fg-color);
        margin-top: 24px;
        margin-bottom: 16px;
        font-weight: 600;
        line-height: 1.25;
      }

      .theme-${theme.name} .markdown-content h1 {
        font-size: 2em;
        border-bottom: 1px solid ${theme.isDark ? '#444' : '#e1e5e9'};
        padding-bottom: 10px;
      }

      .theme-${theme.name} .markdown-content h2 {
        font-size: 1.5em;
        border-bottom: 1px solid ${theme.isDark ? '#444' : '#e1e5e9'};
        padding-bottom: 8px;
      }

      .theme-${theme.name} .markdown-content p {
        margin-bottom: 16px;
      }

      .theme-${theme.name} .markdown-content blockquote {
        margin: 16px 0;
        padding: 0 16px;
        color: var(--comment-color);
        border-left: 4px solid var(--comment-color);
      }

      .theme-${theme.name} .markdown-content code {
        background-color: ${theme.isDark ? '#2d2d2d' : '#f6f8fa'};
        color: var(--fg-color);
        padding: 2px 4px;
        border-radius: 3px;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 85%;
      }

      .theme-${theme.name} .markdown-content pre {
        background-color: ${theme.isDark ? '#2d2d2d' : '#f6f8fa'};
        border-radius: 6px;
        padding: 16px;
        overflow: auto;
        margin: 16px 0;
      }

      .theme-${theme.name} .markdown-content pre code {
        background-color: transparent;
        padding: 0;
        border-radius: 0;
      }

      .theme-${theme.name} .markdown-content hr {
        height: 2px;
        background-color: ${theme.isDark ? '#444' : '#e1e5e9'};
        border: none;
        margin: 24px 0;
      }

      .theme-${theme.name} .markdown-content a {
        color: var(--keyword-color);
        text-decoration: none;
      }

      .theme-${theme.name} .markdown-content a:hover {
        text-decoration: underline;
      }

      .theme-${theme.name} .markdown-content strong {
        font-weight: 600;
        color: var(--fg-color);
      }

      .theme-${theme.name} .markdown-content em {
        font-style: italic;
        color: var(--comment-color);
      }

      .theme-${theme.name} .markdown-content ul,
      .theme-${theme.name} .markdown-content ol {
        margin: 16px 0;
        padding-left: 24px;
      }

      .theme-${theme.name} .markdown-content li {
        margin: 4px 0;
      }

      .theme-${theme.name} .markdown-content table {
        border-collapse: collapse;
        margin: 16px 0;
        width: 100%;
      }

      .theme-${theme.name} .markdown-content th,
      .theme-${theme.name} .markdown-content td {
        border: 1px solid ${theme.isDark ? '#444' : '#e1e5e9'};
        padding: 8px 12px;
        text-align: left;
      }

      .theme-${theme.name} .markdown-content th {
        background-color: ${theme.isDark ? '#2d2d2d' : '#f6f8fa'};
        font-weight: 600;
      }
    `;
  }

  /**
   * Get all available themes
   * @returns Array of theme names
   */
  getAvailableThemes(): string[] {
    return Array.from(this.themes.keys());
  }

  /**
   * Get all theme objects
   * @returns Array of theme objects
   */
  getAllThemes(): Theme[] {
    return Array.from(this.themes.values());
  }

  /**
   * Add a custom theme
   * @param theme - Theme to add
   * @returns true if added successfully
   */
  addTheme(theme: Theme): boolean {
    if (!this.validateTheme(theme)) {
      this.logger.error(`Invalid theme: ${theme.name}`);
      return false;
    }

    this.themes.set(theme.name, theme);
    this.logger.log(`Added custom theme: ${theme.name}`);
    return true;
  }

  /**
   * Remove a theme
   * @param themeName - Theme name to remove
   * @returns true if removed successfully
   */
  removeTheme(themeName: string): boolean {
    if (themeName === this.defaultThemeName) {
      this.logger.warn(`Cannot remove default theme: ${themeName}`);
      return false;
    }

    const removed = this.themes.delete(themeName);
    if (removed) {
      this.logger.log(`Removed theme: ${themeName}`);
    } else {
      this.logger.warn(`Theme not found: ${themeName}`);
    }

    return removed;
  }

  /**
   * Get theme information
   * @param themeName - Theme name
   * @returns Theme object or null
   */
  getTheme(themeName: string): Theme | null {
    return this.themes.get(themeName) || null;
  }

  /**
   * Check if theme exists
   * @param themeName - Theme name
   * @returns true if exists
   */
  hasTheme(themeName: string): boolean {
    return this.themes.has(themeName);
  }

  /**
   * Get theme count
   * @returns Number of available themes
   */
  getThemeCount(): number {
    return this.themes.size;
  }

  /**
   * Initialize default themes
   */
  private initializeDefaultThemes(): void {
    // Default theme
    this.themes.set('default', {
      name: 'default',
      displayName: 'Default',
      description: 'Default theme with balanced colors',
      css: '',
      isDark: false,
      colors: {
        background: '#ffffff',
        foreground: '#333333',
        comment: '#6a737d',
        keyword: '#d73a49',
        string: '#032f62',
        number: '#005cc5',
        function: '#6f42c1',
        variable: '#e36209',
        type: '#005cc5',
        constant: '#005cc5',
        operator: '#d73a49',
        punctuation: '#24292e',
        error: '#d73a49',
        warning: '#e36209',
      },
    });

    // Dark theme
    this.themes.set('dark', {
      name: 'dark',
      displayName: 'Dark',
      description: 'Dark theme for low-light environments',
      css: '',
      isDark: true,
      colors: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        comment: '#6a9955',
        keyword: '#569cd6',
        string: '#ce9178',
        number: '#b5cea8',
        function: '#dcdcaa',
        variable: '#9cdcfe',
        type: '#4ec9b0',
        constant: '#4fc1ff',
        operator: '#d4d4d4',
        punctuation: '#d4d4d4',
        error: '#f44747',
        warning: '#ffcc02',
      },
    });

    // Light theme
    this.themes.set('light', {
      name: 'light',
      displayName: 'Light',
      description: 'Light theme for bright environments',
      css: '',
      isDark: false,
      colors: {
        background: '#f8f8f8',
        foreground: '#333333',
        comment: '#999988',
        keyword: '#000080',
        string: '#d14',
        number: '#009999',
        function: '#990000',
        variable: '#008080',
        type: '#445588',
        constant: '#009999',
        operator: '#000000',
        punctuation: '#000000',
        error: '#d73a49',
        warning: '#e36209',
      },
    });

    // Monokai theme
    this.themes.set('monokai', {
      name: 'monokai',
      displayName: 'Monokai',
      description: 'Monokai theme with vibrant colors',
      css: '',
      isDark: true,
      colors: {
        background: '#272822',
        foreground: '#f8f8f2',
        comment: '#75715e',
        keyword: '#f92672',
        string: '#e6db74',
        number: '#ae81ff',
        function: '#a6e22e',
        variable: '#f8f8f2',
        type: '#66d9ef',
        constant: '#ae81ff',
        operator: '#f92672',
        punctuation: '#f8f8f2',
        error: '#f92672',
        warning: '#e6db74',
      },
    });

    // GitHub theme
    this.themes.set('github', {
      name: 'github',
      displayName: 'GitHub',
      description: 'GitHub-style theme',
      css: '',
      isDark: false,
      colors: {
        background: '#ffffff',
        foreground: '#24292e',
        comment: '#6a737d',
        keyword: '#d73a49',
        string: '#032f62',
        number: '#005cc5',
        function: '#6f42c1',
        variable: '#e36209',
        type: '#005cc5',
        constant: '#005cc5',
        operator: '#d73a49',
        punctuation: '#24292e',
        error: '#d73a49',
        warning: '#e36209',
      },
    });

    // Solarized Dark theme
    this.themes.set('solarized-dark', {
      name: 'solarized-dark',
      displayName: 'Solarized Dark',
      description: 'Solarized dark theme',
      css: '',
      isDark: true,
      colors: {
        background: '#002b36',
        foreground: '#839496',
        comment: '#586e75',
        keyword: '#268bd2',
        string: '#2aa198',
        number: '#d33682',
        function: '#b58900',
        variable: '#cb4b16',
        type: '#6c71c4',
        constant: '#d33682',
        operator: '#268bd2',
        punctuation: '#839496',
        error: '#dc322f',
        warning: '#b58900',
      },
    });

    // Solarized Light theme
    this.themes.set('solarized-light', {
      name: 'solarized-light',
      displayName: 'Solarized Light',
      description: 'Solarized light theme',
      css: '',
      isDark: false,
      colors: {
        background: '#fdf6e3',
        foreground: '#586e75',
        comment: '#93a1a1',
        keyword: '#268bd2',
        string: '#2aa198',
        number: '#d33682',
        function: '#b58900',
        variable: '#cb4b16',
        type: '#6c71c4',
        constant: '#d33682',
        operator: '#268bd2',
        punctuation: '#586e75',
        error: '#dc322f',
        warning: '#b58900',
      },
    });

    this.logger.log(`Initialized ${this.themes.size} default themes`);
  }
}

