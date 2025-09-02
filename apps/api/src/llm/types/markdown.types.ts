/**
 * Types for markdown processing and rendering
 */

export interface ParsedMarkdown {
  content: string;
  blocks: MarkdownBlock[];
  metadata: MarkdownMetadata;
  toc: TableOfContents;
}

export interface MarkdownBlock {
  type: MarkdownBlockType;
  content: string;
  level?: number; // For headings
  language?: string; // For code blocks
  startLine: number;
  endLine: number;
  metadata?: Record<string, any>;
}

export interface MarkdownMetadata {
  title?: string;
  description?: string;
  author?: string;
  tags: string[];
  wordCount: number;
  readingTime: number; // in minutes
  lastModified: Date;
}

export interface TableOfContents {
  items: TOCItem[];
  maxDepth: number;
}

export interface TOCItem {
  id: string;
  title: string;
  level: number;
  children: TOCItem[];
  startLine: number;
}

export interface CodeBlock {
  id: string;
  language: string;
  code: string;
  startLine: number;
  endLine: number;
  metadata: CodeBlockMetadata;
}

export interface CodeBlockMetadata {
  language: string;
  detectedLanguage?: string;
  lineCount: number;
  characterCount: number;
  hasErrors: boolean;
  complexity?: number;
  keywords: string[];
}

export interface FormattedCodeBlock {
  id: string;
  language: string;
  code: string;
  highlightedCode: string;
  css: string;
  metadata: CodeBlockMetadata;
  theme: string;
}

export interface HighlightedCode {
  html: string;
  css: string;
  language: string;
  theme: string;
  lineNumbers: boolean;
  metadata: CodeBlockMetadata;
}

export interface Theme {
  name: string;
  displayName: string;
  description: string;
  css: string;
  isDark: boolean;
  colors: ThemeColors;
}

export interface ThemeColors {
  background: string;
  foreground: string;
  comment: string;
  keyword: string;
  string: string;
  number: string;
  function: string;
  variable: string;
  type: string;
  constant: string;
  operator: string;
  punctuation: string;
  error: string;
  warning: string;
}

export interface MarkdownSecurityThreat {
  type: SecurityThreatType;
  severity: ThreatSeverity;
  message: string;
  line?: number;
  column?: number;
  suggestion?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  securityThreats: MarkdownSecurityThreat[];
}

export interface ValidationError {
  type: string;
  message: string;
  line?: number;
  column?: number;
  suggestion?: string;
}

export interface ValidationWarning {
  type: string;
  message: string;
  line?: number;
  column?: number;
  suggestion?: string;
}

export interface MarkdownProcessingOptions {
  enableSyntaxHighlighting: boolean;
  enableTableOfContents: boolean;
  enableSecurityValidation: boolean;
  maxContentLength: number;
  allowedLanguages: string[];
  theme: string;
  lineNumbers: boolean;
  wordWrap: boolean;
}

export interface MarkdownRenderOptions {
  theme: string;
  lineNumbers: boolean;
  wordWrap: boolean;
  maxWidth?: number;
  fontSize?: number;
  fontFamily?: string;
  customCSS?: string;
}

export enum MarkdownBlockType {
  HEADING = 'heading',
  PARAGRAPH = 'paragraph',
  CODE_BLOCK = 'code_block',
  INLINE_CODE = 'inline_code',
  LIST = 'list',
  LIST_ITEM = 'list_item',
  BLOCKQUOTE = 'blockquote',
  TABLE = 'table',
  TABLE_ROW = 'table_row',
  TABLE_CELL = 'table_cell',
  LINK = 'link',
  IMAGE = 'image',
  BOLD = 'bold',
  ITALIC = 'italic',
  STRIKETHROUGH = 'strikethrough',
  HORIZONTAL_RULE = 'horizontal_rule',
  HTML = 'html',
}

export enum SecurityThreatType {
  XSS = 'xss',
  CODE_INJECTION = 'code_injection',
  MALICIOUS_LINK = 'malicious_link',
  SCRIPT_INJECTION = 'script_injection',
  IFRAME_INJECTION = 'iframe_injection',
  DATA_EXFILTRATION = 'data_exfiltration',
  CSRF = 'csrf',
  UNKNOWN = 'unknown',
}

export enum ThreatSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface LanguageInfo {
  name: string;
  aliases: string[];
  extensions: string[];
  mimeType: string;
  description: string;
  isSupported: boolean;
}

export interface SyntaxHighlightingStats {
  totalBlocks: number;
  supportedLanguages: number;
  unsupportedLanguages: number;
  averageProcessingTime: number;
  totalProcessingTime: number;
  errorCount: number;
}

export interface MarkdownProcessingStats {
  totalDocuments: number;
  totalBlocks: number;
  totalCodeBlocks: number;
  averageProcessingTime: number;
  totalProcessingTime: number;
  securityThreatsDetected: number;
  validationErrors: number;
}

