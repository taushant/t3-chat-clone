import { Injectable, Logger } from '@nestjs/common';
import { 
  HighlightedCode, 
  Theme, 
  ThemeColors,
  SyntaxHighlightingStats,
  LanguageInfo,
} from '../types/markdown.types';

/**
 * Syntax Highlighter Service
 * Provides syntax highlighting for code blocks with theme support
 */
@Injectable()
export class SyntaxHighlighterService {
  private readonly logger = new Logger(SyntaxHighlighterService.name);
  private readonly themes = new Map<string, Theme>();
  private readonly supportedLanguages = new Set<string>();
  private highlightingStats: SyntaxHighlightingStats = {
    totalBlocks: 0,
    supportedLanguages: 0,
    unsupportedLanguages: 0,
    averageProcessingTime: 0,
    totalProcessingTime: 0,
    errorCount: 0,
  };

  constructor() {
    this.initializeThemes();
    this.initializeSupportedLanguages();
  }

  /**
   * Highlight code with syntax highlighting
   * @param code - Code to highlight
   * @param language - Programming language
   * @param theme - Theme name
   * @returns HighlightedCode
   */
  highlightCode(code: string, language: string, theme: string = 'default'): HighlightedCode {
    const startTime = Date.now();
    
    this.logger.debug(`Highlighting code, language: ${language}, theme: ${theme}`);

    try {
      // Get theme
      const themeObj = this.getTheme(theme);
      if (!themeObj) {
        throw new Error(`Theme '${theme}' not found`);
      }

      // Check if language is supported
      const isSupported = this.isLanguageSupported(language);
      if (!isSupported) {
        this.highlightingStats.unsupportedLanguages++;
        this.logger.warn(`Language '${language}' is not supported, using plain text`);
      } else {
        this.highlightingStats.supportedLanguages++;
      }

      // Perform syntax highlighting
      const highlightedHtml = this.performHighlighting(code, language, themeObj);
      
      // Generate CSS
      const css = this.generateCSS(themeObj);

      const processingTime = Date.now() - startTime;
      this.updateHighlightingStats(processingTime, isSupported);

      const result: HighlightedCode = {
        html: highlightedHtml,
        css,
        language,
        theme,
        lineNumbers: true,
        metadata: {
          language,
          lineCount: code.split('\n').length,
          characterCount: code.length,
          hasErrors: false,
          keywords: this.extractKeywords(code, language),
        },
      };

      this.logger.debug(`Syntax highlighting completed in ${processingTime}ms`);
      return result;

    } catch (error) {
      this.highlightingStats.errorCount++;
      this.logger.error(`Syntax highlighting failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Return fallback highlighting
      return this.createFallbackHighlighting(code, language, theme);
    }
  }

  /**
   * Get supported languages
   * @returns Array of supported language names
   */
  getSupportedLanguages(): string[] {
    return Array.from(this.supportedLanguages);
  }

  /**
   * Get available themes
   * @returns Array of available theme names
   */
  getAvailableThemes(): string[] {
    return Array.from(this.themes.keys());
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
   * Validate if a language is supported
   * @param language - Language to validate
   * @returns true if supported
   */
  validateLanguage(language: string): boolean {
    return this.isLanguageSupported(language);
  }

  /**
   * Get highlighting statistics
   * @returns SyntaxHighlightingStats
   */
  getHighlightingStats(): SyntaxHighlightingStats {
    return { ...this.highlightingStats };
  }

  /**
   * Reset highlighting statistics
   */
  resetHighlightingStats(): void {
    this.highlightingStats = {
      totalBlocks: 0,
      supportedLanguages: 0,
      unsupportedLanguages: 0,
      averageProcessingTime: 0,
      totalProcessingTime: 0,
      errorCount: 0,
    };
  }

  /**
   * Perform syntax highlighting
   * @param code - Code to highlight
   * @param language - Programming language
   * @param theme - Theme object
   * @returns Highlighted HTML
   */
  private performHighlighting(code: string, language: string, theme: Theme): string {
    if (!this.isLanguageSupported(language)) {
      return this.escapeHtml(code);
    }

    // Simple syntax highlighting implementation
    // In production, use a proper syntax highlighter like Prism.js or highlight.js
    const lines = code.split('\n');
    const highlightedLines = lines.map((line, index) => {
      const highlightedLine = this.highlightLine(line, language, theme);
      return `<span class="line-number">${index + 1}</span><span class="line-content">${highlightedLine}</span>`;
    });

    return `<div class="code-block" data-language="${language}">${highlightedLines.join('\n')}</div>`;
  }

  /**
   * Highlight a single line of code
   * @param line - Line of code
   * @param language - Programming language
   * @param theme - Theme object
   * @returns Highlighted line
   */
  private highlightLine(line: string, language: string, theme: Theme): string {
    let highlighted = this.escapeHtml(line);

    // Apply language-specific highlighting patterns
    switch (language) {
      case 'javascript':
      case 'typescript':
        highlighted = this.highlightJavaScript(highlighted, theme);
        break;
      case 'python':
        highlighted = this.highlightPython(highlighted, theme);
        break;
      case 'java':
        highlighted = this.highlightJava(highlighted, theme);
        break;
      case 'cpp':
      case 'c':
        highlighted = this.highlightCpp(highlighted, theme);
        break;
      case 'html':
        highlighted = this.highlightHtml(highlighted, theme);
        break;
      case 'css':
        highlighted = this.highlightCss(highlighted, theme);
        break;
      case 'json':
        highlighted = this.highlightJson(highlighted, theme);
        break;
      case 'sql':
        highlighted = this.highlightSql(highlighted, theme);
        break;
      default:
        // Use generic highlighting
        highlighted = this.highlightGeneric(highlighted, theme);
    }

    return highlighted;
  }

  /**
   * Highlight JavaScript/TypeScript code
   * @param line - Line of code
   * @param theme - Theme object
   * @returns Highlighted line
   */
  private highlightJavaScript(line: string, theme: Theme): string {
    // Keywords
    const keywords = ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'import', 'export', 'async', 'await', 'try', 'catch', 'throw', 'class', 'interface', 'type', 'extends', 'implements'];
    let highlighted = line;

    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      highlighted = highlighted.replace(regex, `<span class="keyword" style="color: ${theme.colors.keyword}">${keyword}</span>`);
    }

    // Strings
    highlighted = highlighted.replace(/(["'`])((?:\\.|(?!\1)[^\\])*?)\1/g, `<span class="string" style="color: ${theme.colors.string}">$1$2$1</span>`);

    // Numbers
    highlighted = highlighted.replace(/\b\d+(\.\d+)?\b/g, `<span class="number" style="color: ${theme.colors.number}">$&</span>`);

    // Comments
    highlighted = highlighted.replace(/\/\/.*$/g, `<span class="comment" style="color: ${theme.colors.comment}">$&</span>`);
    highlighted = highlighted.replace(/\/\*[\s\S]*?\*\//g, `<span class="comment" style="color: ${theme.colors.comment}">$&</span>`);

    return highlighted;
  }

  /**
   * Highlight Python code
   * @param line - Line of code
   * @param theme - Theme object
   * @returns Highlighted line
   */
  private highlightPython(line: string, theme: Theme): string {
    const keywords = ['def', 'class', 'if', 'else', 'elif', 'for', 'while', 'return', 'import', 'from', 'try', 'except', 'finally', 'with', 'as', 'pass', 'break', 'continue', 'yield', 'lambda'];
    let highlighted = line;

    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      highlighted = highlighted.replace(regex, `<span class="keyword" style="color: ${theme.colors.keyword}">${keyword}</span>`);
    }

    // Strings
    highlighted = highlighted.replace(/(["'`])((?:\\.|(?!\1)[^\\])*?)\1/g, `<span class="string" style="color: ${theme.colors.string}">$1$2$1</span>`);

    // Numbers
    highlighted = highlighted.replace(/\b\d+(\.\d+)?\b/g, `<span class="number" style="color: ${theme.colors.number}">$&</span>`);

    // Comments
    highlighted = highlighted.replace(/#.*$/g, `<span class="comment" style="color: ${theme.colors.comment}">$&</span>`);

    return highlighted;
  }

  /**
   * Highlight Java code
   * @param line - Line of code
   * @param theme - Theme object
   * @returns Highlighted line
   */
  private highlightJava(line: string, theme: Theme): string {
    const keywords = ['public', 'private', 'protected', 'static', 'final', 'abstract', 'class', 'interface', 'extends', 'implements', 'package', 'import', 'if', 'else', 'for', 'while', 'return', 'try', 'catch', 'finally', 'throw', 'throws'];
    let highlighted = line;

    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      highlighted = highlighted.replace(regex, `<span class="keyword" style="color: ${theme.colors.keyword}">${keyword}</span>`);
    }

    // Strings
    highlighted = highlighted.replace(/(["'`])((?:\\.|(?!\1)[^\\])*?)\1/g, `<span class="string" style="color: ${theme.colors.string}">$1$2$1</span>`);

    // Numbers
    highlighted = highlighted.replace(/\b\d+(\.\d+)?\b/g, `<span class="number" style="color: ${theme.colors.number}">$&</span>`);

    // Comments
    highlighted = highlighted.replace(/\/\/.*$/g, `<span class="comment" style="color: ${theme.colors.comment}">$&</span>`);
    highlighted = highlighted.replace(/\/\*[\s\S]*?\*\//g, `<span class="comment" style="color: ${theme.colors.comment}">$&</span>`);

    return highlighted;
  }

  /**
   * Highlight C/C++ code
   * @param line - Line of code
   * @param theme - Theme object
   * @returns Highlighted line
   */
  private highlightCpp(line: string, theme: Theme): string {
    const keywords = ['#include', '#define', '#ifdef', '#ifndef', '#endif', 'int', 'char', 'float', 'double', 'void', 'if', 'else', 'for', 'while', 'return', 'struct', 'union', 'enum', 'typedef', 'const', 'static', 'extern', 'auto', 'register', 'volatile'];
    let highlighted = line;

    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      highlighted = highlighted.replace(regex, `<span class="keyword" style="color: ${theme.colors.keyword}">${keyword}</span>`);
    }

    // Strings
    highlighted = highlighted.replace(/(["'`])((?:\\.|(?!\1)[^\\])*?)\1/g, `<span class="string" style="color: ${theme.colors.string}">$1$2$1</span>`);

    // Numbers
    highlighted = highlighted.replace(/\b\d+(\.\d+)?\b/g, `<span class="number" style="color: ${theme.colors.number}">$&</span>`);

    // Comments
    highlighted = highlighted.replace(/\/\/.*$/g, `<span class="comment" style="color: ${theme.colors.comment}">$&</span>`);
    highlighted = highlighted.replace(/\/\*[\s\S]*?\*\//g, `<span class="comment" style="color: ${theme.colors.comment}">$&</span>`);

    return highlighted;
  }

  /**
   * Highlight HTML code
   * @param line - Line of code
   * @param theme - Theme object
   * @returns Highlighted line
   */
  private highlightHtml(line: string, theme: Theme): string {
    let highlighted = line;

    // Tags
    highlighted = highlighted.replace(/<\/?[\w-]+/g, `<span class="tag" style="color: ${theme.colors.keyword}">$&</span>`);
    highlighted = highlighted.replace(/>/g, `<span class="tag" style="color: ${theme.colors.keyword}">></span>`);

    // Attributes
    highlighted = highlighted.replace(/(\w+)=/g, `<span class="attribute" style="color: ${theme.colors.variable}">$1</span>=`);

    // Attribute values
    highlighted = highlighted.replace(/="([^"]*)"/g, `="<span class="string" style="color: ${theme.colors.string}">$1</span>"`);

    return highlighted;
  }

  /**
   * Highlight CSS code
   * @param line - Line of code
   * @param theme - Theme object
   * @returns Highlighted line
   */
  private highlightCss(line: string, theme: Theme): string {
    let highlighted = line;

    // Selectors
    highlighted = highlighted.replace(/^[\w.-]+/g, `<span class="selector" style="color: ${theme.colors.keyword}">$&</span>`);

    // Properties
    highlighted = highlighted.replace(/(\w+):/g, `<span class="property" style="color: ${theme.colors.variable}">$1</span>:`);

    // Values
    highlighted = highlighted.replace(/:\s*([^;]+)/g, `: <span class="value" style="color: ${theme.colors.string}">$1</span>`);

    // Comments
    highlighted = highlighted.replace(/\/\*[\s\S]*?\*\//g, `<span class="comment" style="color: ${theme.colors.comment}">$&</span>`);

    return highlighted;
  }

  /**
   * Highlight JSON code
   * @param line - Line of code
   * @param theme - Theme object
   * @returns Highlighted line
   */
  private highlightJson(line: string, theme: Theme): string {
    let highlighted = line;

    // Keys
    highlighted = highlighted.replace(/"([^"]+)":/g, `"<span class="key" style="color: ${theme.colors.variable}">$1</span>":`);

    // Strings
    highlighted = highlighted.replace(/:\s*"([^"]*)"/g, `: "<span class="string" style="color: ${theme.colors.string}">$1</span>"`);

    // Numbers
    highlighted = highlighted.replace(/:\s*(\d+(\.\d+)?)/g, `: <span class="number" style="color: ${theme.colors.number}">$1</span>`);

    // Booleans
    highlighted = highlighted.replace(/:\s*(true|false)/g, `: <span class="boolean" style="color: ${theme.colors.constant}">$1</span>`);

    // Null
    highlighted = highlighted.replace(/:\s*null/g, `: <span class="null" style="color: ${theme.colors.constant}">null</span>`);

    return highlighted;
  }

  /**
   * Highlight SQL code
   * @param line - Line of code
   * @param theme - Theme object
   * @returns Highlighted line
   */
  private highlightSql(line: string, theme: Theme): string {
    const keywords = ['SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'TABLE', 'INDEX', 'VIEW', 'PROCEDURE', 'FUNCTION', 'TRIGGER', 'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'ORDER', 'GROUP', 'HAVING', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'AS', 'DISTINCT', 'TOP', 'LIMIT', 'OFFSET'];
    let highlighted = line;

    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      highlighted = highlighted.replace(regex, `<span class="keyword" style="color: ${theme.colors.keyword}">$&</span>`);
    }

    // Strings
    highlighted = highlighted.replace(/(["'`])((?:\\.|(?!\1)[^\\])*?)\1/g, `<span class="string" style="color: ${theme.colors.string}">$1$2$1</span>`);

    // Numbers
    highlighted = highlighted.replace(/\b\d+(\.\d+)?\b/g, `<span class="number" style="color: ${theme.colors.number}">$&</span>`);

    // Comments
    highlighted = highlighted.replace(/--.*$/g, `<span class="comment" style="color: ${theme.colors.comment}">$&</span>`);
    highlighted = highlighted.replace(/\/\*[\s\S]*?\*\//g, `<span class="comment" style="color: ${theme.colors.comment}">$&</span>`);

    return highlighted;
  }

  /**
   * Generic highlighting for unsupported languages
   * @param line - Line of code
   * @param theme - Theme object
   * @returns Highlighted line
   */
  private highlightGeneric(line: string, theme: Theme): string {
    let highlighted = line;

    // Strings
    highlighted = highlighted.replace(/(["'`])((?:\\.|(?!\1)[^\\])*?)\1/g, `<span class="string" style="color: ${theme.colors.string}">$1$2$1</span>`);

    // Numbers
    highlighted = highlighted.replace(/\b\d+(\.\d+)?\b/g, `<span class="number" style="color: ${theme.colors.number}">$&</span>`);

    return highlighted;
  }

  /**
   * Generate CSS for syntax highlighting
   * @param theme - Theme object
   * @returns CSS string
   */
  private generateCSS(theme: Theme): string {
    return `
      .code-block {
        background-color: ${theme.colors.background};
        color: ${theme.colors.foreground};
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 14px;
        line-height: 1.5;
        padding: 16px;
        border-radius: 8px;
        overflow-x: auto;
        border: 1px solid #e1e5e9;
      }
      
      .line-number {
        display: inline-block;
        width: 40px;
        text-align: right;
        margin-right: 16px;
        color: ${theme.colors.comment};
        user-select: none;
      }
      
      .line-content {
        display: inline-block;
        width: calc(100% - 56px);
      }
      
      .keyword { color: ${theme.colors.keyword}; font-weight: bold; }
      .string { color: ${theme.colors.string}; }
      .number { color: ${theme.colors.number}; }
      .comment { color: ${theme.colors.comment}; font-style: italic; }
      .function { color: ${theme.colors.function}; }
      .variable { color: ${theme.colors.variable}; }
      .type { color: ${theme.colors.type}; }
      .constant { color: ${theme.colors.constant}; }
      .operator { color: ${theme.colors.operator}; }
      .punctuation { color: ${theme.colors.punctuation}; }
      .tag { color: ${theme.colors.keyword}; }
      .attribute { color: ${theme.colors.variable}; }
      .selector { color: ${theme.colors.keyword}; }
      .property { color: ${theme.colors.variable}; }
      .value { color: ${theme.colors.string}; }
      .key { color: ${theme.colors.variable}; }
      .boolean { color: ${theme.colors.constant}; }
      .null { color: ${theme.colors.constant}; }
    `;
  }

  /**
   * Create fallback highlighting when highlighting fails
   * @param code - Code content
   * @param language - Programming language
   * @param theme - Theme name
   * @returns HighlightedCode
   */
  private createFallbackHighlighting(code: string, language: string, theme: string): HighlightedCode {
    const escapedCode = this.escapeHtml(code);
    const lines = escapedCode.split('\n');
    const numberedLines = lines.map((line, index) => 
      `<span class="line-number">${index + 1}</span><span class="line-content">${line}</span>`
    );

    return {
      html: `<div class="code-block" data-language="${language}">${numberedLines.join('\n')}</div>`,
      css: this.generateCSS(this.getTheme('default') || this.createDefaultTheme()),
      language,
      theme,
      lineNumbers: true,
      metadata: {
        language,
        lineCount: lines.length,
        characterCount: code.length,
        hasErrors: true,
        keywords: [],
      },
    };
  }

  /**
   * Escape HTML characters
   * @param text - Text to escape
   * @returns Escaped text
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Extract keywords from code
   * @param code - Code content
   * @param language - Programming language
   * @returns Array of keywords
   */
  private extractKeywords(code: string, language: string): string[] {
    // Simple keyword extraction - in production, use proper language parsers
    const keywordPatterns = [
      /\b(function|class|const|let|var|if|else|for|while|return|import|export|async|await|try|catch|throw)\b/g,
      /\b(public|private|protected|static|final|abstract|interface|extends|implements)\b/g,
      /\b(def|class|import|from|if|else|for|while|return|try|except|finally|with|as)\b/g,
    ];

    const keywords: string[] = [];
    for (const pattern of keywordPatterns) {
      const matches = code.match(pattern);
      if (matches) {
        keywords.push(...matches);
      }
    }

    return [...new Set(keywords)];
  }

  /**
   * Check if language is supported
   * @param language - Language to check
   * @returns true if supported
   */
  private isLanguageSupported(language: string): boolean {
    return this.supportedLanguages.has(language.toLowerCase());
  }

  /**
   * Update highlighting statistics
   * @param processingTime - Processing time in milliseconds
   * @param isSupported - Whether language is supported
   */
  private updateHighlightingStats(processingTime: number, isSupported: boolean): void {
    this.highlightingStats.totalBlocks++;
    this.highlightingStats.totalProcessingTime += processingTime;
    this.highlightingStats.averageProcessingTime = 
      this.highlightingStats.totalProcessingTime / this.highlightingStats.totalBlocks;
  }

  /**
   * Initialize supported languages
   */
  private initializeSupportedLanguages(): void {
    const languages = [
      'javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'go', 'rust',
      'php', 'ruby', 'html', 'css', 'json', 'yaml', 'xml', 'sql', 'bash',
      'shell', 'powershell', 'swift', 'kotlin', 'scala', 'r', 'matlab',
      'perl', 'lua', 'dart', 'elixir', 'clojure', 'haskell', 'ocaml',
    ];

    for (const lang of languages) {
      this.supportedLanguages.add(lang);
    }

    this.logger.log(`Initialized ${languages.length} supported languages for syntax highlighting`);
  }

  /**
   * Initialize themes
   */
  private initializeThemes(): void {
    // Default theme
    this.themes.set('default', this.createDefaultTheme());
    
    // Dark theme
    this.themes.set('dark', this.createDarkTheme());
    
    // Light theme
    this.themes.set('light', this.createLightTheme());
    
    // Monokai theme
    this.themes.set('monokai', this.createMonokaiTheme());

    this.logger.log(`Initialized ${this.themes.size} themes for syntax highlighting`);
  }

  /**
   * Create default theme
   * @returns Default theme
   */
  private createDefaultTheme(): Theme {
    return {
      name: 'default',
      displayName: 'Default',
      description: 'Default syntax highlighting theme',
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
    };
  }

  /**
   * Create dark theme
   * @returns Dark theme
   */
  private createDarkTheme(): Theme {
    return {
      name: 'dark',
      displayName: 'Dark',
      description: 'Dark syntax highlighting theme',
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
    };
  }

  /**
   * Create light theme
   * @returns Light theme
   */
  private createLightTheme(): Theme {
    return {
      name: 'light',
      displayName: 'Light',
      description: 'Light syntax highlighting theme',
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
    };
  }

  /**
   * Create Monokai theme
   * @returns Monokai theme
   */
  private createMonokaiTheme(): Theme {
    return {
      name: 'monokai',
      displayName: 'Monokai',
      description: 'Monokai syntax highlighting theme',
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
    };
  }
}

