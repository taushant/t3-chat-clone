import { Injectable, Logger } from '@nestjs/common';
import { 
  CodeBlock, 
  FormattedCodeBlock, 
  CodeBlockMetadata,
  ValidationResult,
  ValidationError,
  LanguageInfo,
} from '../types/markdown.types';

/**
 * Code Block Processor Service
 * Handles detection, processing, and validation of code blocks
 */
@Injectable()
export class CodeBlockProcessorService {
  private readonly logger = new Logger(CodeBlockProcessorService.name);
  private readonly supportedLanguages: Map<string, LanguageInfo> = new Map();
  private readonly languageAliases: Map<string, string> = new Map();

  constructor() {
    this.initializeSupportedLanguages();
  }

  /**
   * Detect code blocks in content
   * @param content - Content to analyze
   * @returns Array of detected code blocks
   */
  detectCodeBlocks(content: string): CodeBlock[] {
    const codeBlocks: CodeBlock[] = [];
    const lines = content.split('\n');
    let inCodeBlock = false;
    let currentBlock: Partial<CodeBlock> | null = null;
    let lineNumber = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      lineNumber++;

      // Check for code block start
      const codeBlockMatch = line.match(/^```(\w*)\s*$/);
      if (codeBlockMatch && !inCodeBlock) {
        inCodeBlock = true;
        currentBlock = {
          id: this.generateCodeBlockId(),
          language: codeBlockMatch[1] || 'text',
          code: '',
          startLine: lineNumber,
          endLine: lineNumber,
          metadata: {
            language: codeBlockMatch[1] || 'text',
            lineCount: 0,
            characterCount: 0,
            hasErrors: false,
            keywords: [],
          },
        };
        continue;
      }

      // Check for code block end
      if (line.match(/^```\s*$/) && inCodeBlock && currentBlock) {
        inCodeBlock = false;
        currentBlock.endLine = lineNumber;
        currentBlock.metadata!.lineCount = currentBlock.code!.split('\n').length;
        currentBlock.metadata!.characterCount = currentBlock.code!.length;
        currentBlock.metadata!.keywords = this.extractKeywords(currentBlock.code!);
        
        codeBlocks.push(currentBlock as CodeBlock);
        currentBlock = null;
        continue;
      }

      // Add line to current code block
      if (inCodeBlock && currentBlock) {
        currentBlock.code += (currentBlock.code ? '\n' : '') + line;
      }
    }

    this.logger.debug(`Detected ${codeBlocks.length} code blocks in content`);
    return codeBlocks;
  }

  /**
   * Identify programming language from code content
   * @param code - Code content
   * @param language - Suggested language
   * @returns Detected language
   */
  identifyLanguage(code: string, language?: string): string {
    // If language is already specified and supported, use it
    if (language && this.isLanguageSupported(language)) {
      return language;
    }

    // Try to detect language from code patterns
    const detectedLanguage = this.detectLanguageFromCode(code);
    
    if (detectedLanguage) {
      this.logger.debug(`Detected language: ${detectedLanguage} for code snippet`);
      return detectedLanguage;
    }

    // Fallback to text
    return 'text';
  }

  /**
   * Format a code block with enhanced metadata
   * @param block - Code block to format
   * @returns Formatted code block
   */
  formatCodeBlock(block: CodeBlock): FormattedCodeBlock {
    const startTime = Date.now();
    
    this.logger.debug(`Formatting code block ${block.id}, language: ${block.language}`);

    // Identify the correct language
    const identifiedLanguage = this.identifyLanguage(block.code, block.language);
    
    // Update metadata
    const updatedMetadata: CodeBlockMetadata = {
      ...block.metadata,
      language: identifiedLanguage,
      detectedLanguage: identifiedLanguage !== block.language ? identifiedLanguage : undefined,
      lineCount: block.code.split('\n').length,
      characterCount: block.code.length,
      hasErrors: this.hasSyntaxErrors(block.code, identifiedLanguage),
      keywords: this.extractKeywords(block.code),
    };

    // Generate formatted code block
    const formattedBlock: FormattedCodeBlock = {
      id: block.id,
      language: identifiedLanguage,
      code: block.code,
      highlightedCode: block.code, // Will be enhanced by syntax highlighter
      css: '', // Will be populated by syntax highlighter
      metadata: updatedMetadata,
      theme: 'default',
    };

    const processingTime = Date.now() - startTime;
    this.logger.debug(`Code block formatting completed in ${processingTime}ms`);

    return formattedBlock;
  }

  /**
   * Validate a code block
   * @param block - Code block to validate
   * @returns Validation result
   */
  validateCodeBlock(block: CodeBlock): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Check if language is supported
    if (!this.isLanguageSupported(block.language)) {
      warnings.push({
        type: 'unsupported_language',
        message: `Language '${block.language}' is not supported`,
        line: block.startLine,
        suggestion: `Use one of the supported languages: ${Array.from(this.supportedLanguages.keys()).join(', ')}`,
      });
    }

    // Check code length
    if (block.code.length > 10000) {
      warnings.push({
        type: 'code_too_long',
        message: 'Code block is very long and may impact performance',
        line: block.startLine,
        suggestion: 'Consider breaking into smaller blocks',
      });
    }

    // Check for potential security issues
    if (this.hasSecurityIssues(block.code, block.language)) {
      errors.push({
        type: 'security_issue',
        message: 'Code block contains potentially dangerous patterns',
        line: block.startLine,
        suggestion: 'Review code for security vulnerabilities',
      });
    }

    // Check for syntax errors
    if (this.hasSyntaxErrors(block.code, block.language)) {
      errors.push({
        type: 'syntax_error',
        message: 'Code block contains syntax errors',
        line: block.startLine,
        suggestion: 'Fix syntax errors before processing',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      securityThreats: [],
    };
  }

  /**
   * Get supported languages
   * @returns Array of supported language information
   */
  getSupportedLanguages(): LanguageInfo[] {
    return Array.from(this.supportedLanguages.values());
  }

  /**
   * Check if a language is supported
   * @param language - Language to check
   * @returns true if supported
   */
  isLanguageSupported(language: string): boolean {
    const normalizedLanguage = language.toLowerCase();
    return this.supportedLanguages.has(normalizedLanguage) || 
           this.languageAliases.has(normalizedLanguage);
  }

  /**
   * Get language information
   * @param language - Language name
   * @returns Language information or null
   */
  getLanguageInfo(language: string): LanguageInfo | null {
    const normalizedLanguage = language.toLowerCase();
    
    // Check direct match
    if (this.supportedLanguages.has(normalizedLanguage)) {
      return this.supportedLanguages.get(normalizedLanguage)!;
    }
    
    // Check aliases
    if (this.languageAliases.has(normalizedLanguage)) {
      const actualLanguage = this.languageAliases.get(normalizedLanguage)!;
      return this.supportedLanguages.get(actualLanguage)!;
    }
    
    return null;
  }

  /**
   * Initialize supported languages
   */
  private initializeSupportedLanguages(): void {
    const languages: LanguageInfo[] = [
      {
        name: 'javascript',
        aliases: ['js', 'node', 'nodejs'],
        extensions: ['.js', '.mjs', '.cjs'],
        mimeType: 'application/javascript',
        description: 'JavaScript programming language',
        isSupported: true,
      },
      {
        name: 'typescript',
        aliases: ['ts'],
        extensions: ['.ts', '.tsx'],
        mimeType: 'application/typescript',
        description: 'TypeScript programming language',
        isSupported: true,
      },
      {
        name: 'python',
        aliases: ['py', 'python3'],
        extensions: ['.py', '.pyw'],
        mimeType: 'text/x-python',
        description: 'Python programming language',
        isSupported: true,
      },
      {
        name: 'java',
        aliases: ['java8', 'java11', 'java17'],
        extensions: ['.java'],
        mimeType: 'text/x-java-source',
        description: 'Java programming language',
        isSupported: true,
      },
      {
        name: 'cpp',
        aliases: ['c++', 'cxx'],
        extensions: ['.cpp', '.cc', '.cxx'],
        mimeType: 'text/x-c++src',
        description: 'C++ programming language',
        isSupported: true,
      },
      {
        name: 'c',
        aliases: ['c99', 'c11'],
        extensions: ['.c', '.h'],
        mimeType: 'text/x-csrc',
        description: 'C programming language',
        isSupported: true,
      },
      {
        name: 'go',
        aliases: ['golang'],
        extensions: ['.go'],
        mimeType: 'text/x-go',
        description: 'Go programming language',
        isSupported: true,
      },
      {
        name: 'rust',
        aliases: ['rs'],
        extensions: ['.rs'],
        mimeType: 'text/x-rust',
        description: 'Rust programming language',
        isSupported: true,
      },
      {
        name: 'php',
        aliases: ['php7', 'php8'],
        extensions: ['.php'],
        mimeType: 'application/x-httpd-php',
        description: 'PHP programming language',
        isSupported: true,
      },
      {
        name: 'ruby',
        aliases: ['rb'],
        extensions: ['.rb'],
        mimeType: 'text/x-ruby',
        description: 'Ruby programming language',
        isSupported: true,
      },
      {
        name: 'html',
        aliases: ['htm'],
        extensions: ['.html', '.htm'],
        mimeType: 'text/html',
        description: 'HTML markup language',
        isSupported: true,
      },
      {
        name: 'css',
        aliases: ['css3'],
        extensions: ['.css'],
        mimeType: 'text/css',
        description: 'CSS stylesheet language',
        isSupported: true,
      },
      {
        name: 'json',
        aliases: ['json5'],
        extensions: ['.json'],
        mimeType: 'application/json',
        description: 'JSON data format',
        isSupported: true,
      },
      {
        name: 'yaml',
        aliases: ['yml'],
        extensions: ['.yaml', '.yml'],
        mimeType: 'text/yaml',
        description: 'YAML data format',
        isSupported: true,
      },
      {
        name: 'xml',
        aliases: ['xml1.0', 'xml1.1'],
        extensions: ['.xml'],
        mimeType: 'application/xml',
        description: 'XML markup language',
        isSupported: true,
      },
      {
        name: 'sql',
        aliases: ['mysql', 'postgresql', 'sqlite'],
        extensions: ['.sql'],
        mimeType: 'text/x-sql',
        description: 'SQL query language',
        isSupported: true,
      },
      {
        name: 'bash',
        aliases: ['sh', 'shell', 'zsh'],
        extensions: ['.sh', '.bash', '.zsh'],
        mimeType: 'text/x-sh',
        description: 'Bash shell script',
        isSupported: true,
      },
    ];

    // Populate supported languages map
    for (const lang of languages) {
      this.supportedLanguages.set(lang.name, lang);
      
      // Add aliases
      for (const alias of lang.aliases) {
        this.languageAliases.set(alias, lang.name);
      }
    }

    this.logger.log(`Initialized ${languages.length} supported languages`);
  }

  /**
   * Detect language from code patterns
   * @param code - Code content
   * @returns Detected language or null
   */
  private detectLanguageFromCode(code: string): string | null {
    const languagePatterns = [
      { language: 'javascript', patterns: [/function\s+\w+/, /const\s+\w+\s*=/, /let\s+\w+\s*=/, /var\s+\w+\s*=/] },
      { language: 'typescript', patterns: [/interface\s+\w+/, /type\s+\w+\s*=/, /:\s*\w+\[\]/, /:\s*Promise</] },
      { language: 'python', patterns: [/def\s+\w+/, /import\s+\w+/, /from\s+\w+\s+import/, /print\s*\(/] },
      { language: 'java', patterns: [/public\s+class\s+\w+/, /private\s+\w+\s+\w+/, /System\.out\.print/] },
      { language: 'cpp', patterns: [/#include\s*<.*>/, /std::/, /using\s+namespace\s+std/] },
      { language: 'c', patterns: [/#include\s*<.*>/, /int\s+main\s*\(/, /printf\s*\(/] },
      { language: 'go', patterns: [/package\s+\w+/, /func\s+\w+/, /import\s*\(/, /fmt\.Print/] },
      { language: 'rust', patterns: [/fn\s+\w+/, /let\s+\w+/, /use\s+\w+/, /println!/] },
      { language: 'php', patterns: [/<\?php/, /\$\w+/, /echo\s+/, /function\s+\w+/] },
      { language: 'ruby', patterns: [/def\s+\w+/, /require\s+/, /puts\s+/, /class\s+\w+/] },
      { language: 'html', patterns: [/<html/, /<head/, /<body/, /<div/] },
      { language: 'css', patterns: [/\.[\w-]+\s*{/, /#[\w-]+\s*{/, /@media/, /@import/] },
      { language: 'json', patterns: [/^\s*{/, /^\s*\[/, /"[\w-]+"\s*:/] },
      { language: 'yaml', patterns: [/^\s*\w+:\s*$/, /^\s*-\s+/, /^\s*#/] },
      { language: 'xml', patterns: [/<\?xml/, /<[\w-]+>/, /<\/[\w-]+>/] },
      { language: 'sql', patterns: [/SELECT\s+/, /FROM\s+/, /WHERE\s+/, /INSERT\s+INTO/] },
      { language: 'bash', patterns: [/#!/bin/, /echo\s+/, /if\s+\[/, /for\s+\w+\s+in/] },
    ];

    for (const { language, patterns } of languagePatterns) {
      if (patterns.some((pattern: RegExp) => pattern.test(code))) {
        return language;
      }
    }

    return null;
  }

  /**
   * Check for security issues in code
   * @param code - Code content
   * @param language - Programming language
   * @returns true if security issues found
   */
  private hasSecurityIssues(code: string, language: string): boolean {
    const dangerousPatterns = [
      /eval\s*\(/,
      /Function\s*\(/,
      /setTimeout\s*\(/,
      /setInterval\s*\(/,
      /document\.write/,
      /innerHTML\s*=/,
      /outerHTML\s*=/,
      /exec\s*\(/,
      /system\s*\(/,
      /shell_exec\s*\(/,
    ];

    return dangerousPatterns.some(pattern => pattern.test(code));
  }

  /**
   * Check for syntax errors in code
   * @param code - Code content
   * @param language - Programming language
   * @returns true if syntax errors found
   */
  private hasSyntaxErrors(code: string, language: string): boolean {
    // Basic syntax error detection - in production, use proper language parsers
    const commonErrors = [
      /[{}]\s*[{}]/, // Unmatched braces
      /\(\s*\)\s*{/, // Empty function parameters
      /;\s*;/, // Double semicolons
      /,\s*,/, // Double commas
    ];

    return commonErrors.some(pattern => pattern.test(code));
  }

  /**
   * Extract keywords from code
   * @param code - Code content
   * @returns Array of keywords
   */
  private extractKeywords(code: string): string[] {
    const keywordPatterns = [
      /\b(function|class|const|let|var|if|else|for|while|return|import|export|async|await|try|catch|throw)\b/g,
      /\b(public|private|protected|static|final|abstract|interface|extends|implements)\b/g,
      /\b(def|class|import|from|if|else|for|while|return|try|except|finally|with|as)\b/g,
      /\b(public|private|protected|static|final|abstract|class|interface|extends|implements|package|import)\b/g,
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
   * Generate unique code block ID
   * @returns Generated ID
   */
  private generateCodeBlockId(): string {
    return `code-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }
}
