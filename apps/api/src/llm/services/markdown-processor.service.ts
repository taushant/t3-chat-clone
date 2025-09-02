import { Injectable, Logger } from '@nestjs/common';
import { 
  ParsedMarkdown, 
  MarkdownBlock, 
  MarkdownMetadata,
  TableOfContents,
  TOCItem,
  CodeBlock,
  MarkdownBlockType,
  MarkdownProcessingOptions,
  MarkdownProcessingStats,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from '../types/markdown.types';

/**
 * Markdown Processor Service
 * Handles parsing, processing, and validation of markdown content
 */
@Injectable()
export class MarkdownProcessorService {
  private readonly logger = new Logger(MarkdownProcessorService.name);
  private readonly defaultOptions: MarkdownProcessingOptions = {
    enableSyntaxHighlighting: true,
    enableTableOfContents: true,
    enableSecurityValidation: true,
    maxContentLength: 1024 * 1024, // 1MB
    allowedLanguages: ['javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'go', 'rust', 'php', 'ruby', 'html', 'css', 'json', 'yaml', 'xml', 'sql', 'bash', 'shell'],
    theme: 'default',
    lineNumbers: true,
    wordWrap: true,
  };

  private processingStats: MarkdownProcessingStats = {
    totalDocuments: 0,
    totalBlocks: 0,
    totalCodeBlocks: 0,
    averageProcessingTime: 0,
    totalProcessingTime: 0,
    securityThreatsDetected: 0,
    validationErrors: 0,
  };

  /**
   * Parse markdown content into structured format
   * @param content - Raw markdown content
   * @param options - Processing options
   * @returns ParsedMarkdown
   */
  parseMarkdown(content: string, options: Partial<MarkdownProcessingOptions> = {}): ParsedMarkdown {
    const startTime = Date.now();
    const mergedOptions = { ...this.defaultOptions, ...options };

    this.logger.debug(`Parsing markdown content, length: ${content.length}`);

    // Validate content length
    if (content.length > mergedOptions.maxContentLength) {
      throw new Error(`Content exceeds maximum length of ${mergedOptions.maxContentLength} characters`);
    }

    // Parse blocks
    const blocks = this.parseBlocks(content);
    
    // Extract metadata
    const metadata = this.extractMetadata(content, blocks);
    
    // Generate table of contents
    const toc = mergedOptions.enableTableOfContents ? this.generateTableOfContents(blocks) : { items: [], maxDepth: 0 };
    
    // Extract code blocks
    const codeBlocks = this.extractCodeBlocks(content);

    const processingTime = Date.now() - startTime;
    this.updateProcessingStats(processingTime, blocks.length, codeBlocks.length);

    const result: ParsedMarkdown = {
      content,
      blocks,
      metadata,
      toc,
    };

    this.logger.debug(`Markdown parsing completed in ${processingTime}ms, blocks: ${blocks.length}, code blocks: ${codeBlocks.length}`);

    return result;
  }

  /**
   * Render parsed markdown to HTML
   * @param parsed - Parsed markdown
   * @param options - Rendering options
   * @returns HTML string
   */
  renderToHtml(parsed: ParsedMarkdown, options: any = {}): string {
    const startTime = Date.now();
    
    this.logger.debug(`Rendering markdown to HTML, blocks: ${parsed.blocks.length}`);

    let html = '<div class="markdown-content">\n';
    
    for (const block of parsed.blocks) {
      html += this.renderBlock(block, options);
    }
    
    html += '</div>';

    const processingTime = Date.now() - startTime;
    this.logger.debug(`HTML rendering completed in ${processingTime}ms`);

    return html;
  }

  /**
   * Sanitize HTML content to prevent XSS
   * @param html - HTML content
   * @returns Sanitized HTML
   */
  sanitizeHtml(html: string): string {
    // Basic HTML sanitization - in production, use a proper library like DOMPurify
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi, '')
      .replace(/<meta\b[^<]*(?:(?!<\/meta>)<[^<]*)*<\/meta>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/javascript:/gi, '');
  }

  /**
   * Extract code blocks from markdown content
   * @param content - Markdown content
   * @returns Array of code blocks
   */
  extractCodeBlocks(content: string): CodeBlock[] {
    const blocks = this.parseBlocks(content);
    return this.extractCodeBlocksFromBlocks(blocks);
  }

  /**
   * Validate markdown content for security threats
   * @param content - Markdown content
   * @returns ValidationResult
   */
  validateMarkdown(content: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const securityThreats: any[] = [];

    // Check for potential XSS
    if (content.includes('<script') || content.includes('javascript:')) {
      securityThreats.push({
        type: 'xss',
        severity: 'high',
        message: 'Potential XSS vulnerability detected',
        suggestion: 'Remove script tags and javascript: URLs',
      });
    }

    // Check for malicious links
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      const url = match[2];
      if (url.startsWith('javascript:') || url.startsWith('data:')) {
        securityThreats.push({
          type: 'malicious_link',
          severity: 'medium',
          message: `Potentially malicious link detected: ${url}`,
          suggestion: 'Use only http/https URLs',
        });
      }
    }

    // Check for code injection patterns
    if (content.includes('eval(') || content.includes('Function(')) {
      securityThreats.push({
        type: 'code_injection',
        severity: 'high',
        message: 'Potential code injection detected',
        suggestion: 'Remove eval() and Function() calls',
      });
    }

    // Check content length
    if (content.length > this.defaultOptions.maxContentLength) {
      errors.push({
        type: 'content_length',
        message: `Content exceeds maximum length of ${this.defaultOptions.maxContentLength} characters`,
        suggestion: 'Reduce content length',
      });
    }

    // Check for empty content
    if (content.trim().length === 0) {
      warnings.push({
        type: 'empty_content',
        message: 'Content is empty',
        suggestion: 'Add some content',
      });
    }

    this.processingStats.securityThreatsDetected += securityThreats.length;
    this.processingStats.validationErrors += errors.length;

    return {
      isValid: errors.length === 0 && securityThreats.length === 0,
      errors,
      warnings,
      securityThreats,
    };
  }

  /**
   * Get processing statistics
   * @returns MarkdownProcessingStats
   */
  getProcessingStats(): MarkdownProcessingStats {
    return { ...this.processingStats };
  }

  /**
   * Reset processing statistics
   */
  resetProcessingStats(): void {
    this.processingStats = {
      totalDocuments: 0,
      totalBlocks: 0,
      totalCodeBlocks: 0,
      averageProcessingTime: 0,
      totalProcessingTime: 0,
      securityThreatsDetected: 0,
      validationErrors: 0,
    };
  }

  /**
   * Parse markdown content into blocks
   * @param content - Markdown content
   * @returns Array of markdown blocks
   */
  private parseBlocks(content: string): MarkdownBlock[] {
    const lines = content.split('\n');
    const blocks: MarkdownBlock[] = [];
    let currentBlock: MarkdownBlock | null = null;
    let lineNumber = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      lineNumber++;

      // Skip empty lines
      if (line.trim() === '') {
        if (currentBlock) {
          currentBlock.endLine = lineNumber - 1;
          blocks.push(currentBlock);
          currentBlock = null;
        }
        continue;
      }

      // Check for headings
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        if (currentBlock) {
          currentBlock.endLine = lineNumber - 1;
          blocks.push(currentBlock);
        }
        currentBlock = {
          type: MarkdownBlockType.HEADING,
          content: headingMatch[2],
          level: headingMatch[1].length,
          startLine: lineNumber,
          endLine: lineNumber,
        };
        continue;
      }

      // Check for code blocks
      const codeBlockMatch = line.match(/^```(\w*)\s*$/);
      if (codeBlockMatch) {
        if (currentBlock && currentBlock.type === MarkdownBlockType.CODE_BLOCK) {
          // End of code block
          currentBlock.endLine = lineNumber - 1;
          blocks.push(currentBlock);
          currentBlock = null;
        } else {
          // Start of code block
          if (currentBlock) {
            currentBlock.endLine = lineNumber - 1;
            blocks.push(currentBlock);
          }
          currentBlock = {
            type: MarkdownBlockType.CODE_BLOCK,
            content: '',
            language: codeBlockMatch[1] || 'text',
            startLine: lineNumber,
            endLine: lineNumber,
          };
        }
        continue;
      }

      // Check for blockquotes
      if (line.startsWith('> ')) {
        if (currentBlock && currentBlock.type === MarkdownBlockType.BLOCKQUOTE) {
          currentBlock.content += '\n' + line.substring(2);
        } else {
          if (currentBlock) {
            currentBlock.endLine = lineNumber - 1;
            blocks.push(currentBlock);
          }
          currentBlock = {
            type: MarkdownBlockType.BLOCKQUOTE,
            content: line.substring(2),
            startLine: lineNumber,
            endLine: lineNumber,
          };
        }
        continue;
      }

      // Check for horizontal rules
      if (line.match(/^[-*_]{3,}$/)) {
        if (currentBlock) {
          currentBlock.endLine = lineNumber - 1;
          blocks.push(currentBlock);
        }
        blocks.push({
          type: MarkdownBlockType.HORIZONTAL_RULE,
          content: '',
          startLine: lineNumber,
          endLine: lineNumber,
        });
        currentBlock = null;
        continue;
      }

      // Regular paragraph or list item
      if (currentBlock && currentBlock.type === MarkdownBlockType.PARAGRAPH) {
        currentBlock.content += '\n' + line;
      } else {
        if (currentBlock) {
          currentBlock.endLine = lineNumber - 1;
          blocks.push(currentBlock);
        }
        currentBlock = {
          type: MarkdownBlockType.PARAGRAPH,
          content: line,
          startLine: lineNumber,
          endLine: lineNumber,
        };
      }
    }

    // Add the last block
    if (currentBlock) {
      currentBlock.endLine = lineNumber;
      blocks.push(currentBlock);
    }

    return blocks;
  }

  /**
   * Extract metadata from markdown content
   * @param content - Markdown content
   * @param blocks - Parsed blocks
   * @returns MarkdownMetadata
   */
  private extractMetadata(content: string, blocks: MarkdownBlock[]): MarkdownMetadata {
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
    const readingTime = Math.ceil(wordCount / 200); // Average reading speed: 200 words per minute

    // Extract title from first heading
    const firstHeading = blocks.find(block => block.type === MarkdownBlockType.HEADING);
    const title = firstHeading?.content || 'Untitled';

    // Extract description from first paragraph
    const firstParagraph = blocks.find(block => block.type === MarkdownBlockType.PARAGRAPH);
    const description = firstParagraph?.content.substring(0, 160) || '';

    return {
      title,
      description,
      tags: [],
      wordCount,
      readingTime,
      lastModified: new Date(),
    };
  }

  /**
   * Generate table of contents from blocks
   * @param blocks - Parsed blocks
   * @returns TableOfContents
   */
  private generateTableOfContents(blocks: MarkdownBlock[]): TableOfContents {
    const headings = blocks.filter(block => block.type === MarkdownBlockType.HEADING);
    const items: TOCItem[] = [];
    let maxDepth = 0;

    for (const heading of headings) {
      const level = heading.level || 1;
      maxDepth = Math.max(maxDepth, level);

      const item: TOCItem = {
        id: this.generateHeadingId(heading.content),
        title: heading.content,
        level,
        children: [],
        startLine: heading.startLine,
      };

      items.push(item);
    }

    return { items, maxDepth };
  }

  /**
   * Extract code blocks from parsed blocks
   * @param blocks - Parsed blocks
   * @returns Array of code blocks
   */
  private extractCodeBlocksFromBlocks(blocks: MarkdownBlock[]): CodeBlock[] {
    const codeBlocks: CodeBlock[] = [];

    for (const block of blocks) {
      if (block.type === MarkdownBlockType.CODE_BLOCK) {
        const codeBlock: CodeBlock = {
          id: `code-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          language: block.language || 'text',
          code: block.content,
          startLine: block.startLine,
          endLine: block.endLine,
          metadata: {
            language: block.language || 'text',
            lineCount: block.content.split('\n').length,
            characterCount: block.content.length,
            hasErrors: false,
            keywords: this.extractKeywords(block.content),
          },
        };

        codeBlocks.push(codeBlock);
      }
    }

    return codeBlocks;
  }

  /**
   * Render a single markdown block to HTML
   * @param block - Markdown block
   * @param options - Rendering options
   * @returns HTML string
   */
  private renderBlock(block: MarkdownBlock, options: any = {}): string {
    switch (block.type) {
      case MarkdownBlockType.HEADING:
        const level = block.level || 1;
        const id = this.generateHeadingId(block.content);
        return `<h${level} id="${id}">${this.escapeHtml(block.content)}</h${level}>\n`;

      case MarkdownBlockType.PARAGRAPH:
        return `<p>${this.processInlineMarkdown(block.content)}</p>\n`;

      case MarkdownBlockType.CODE_BLOCK:
        const language = block.language || 'text';
        const escapedCode = this.escapeHtml(block.content);
        return `<pre><code class="language-${language}">${escapedCode}</code></pre>\n`;

      case MarkdownBlockType.BLOCKQUOTE:
        return `<blockquote>${this.processInlineMarkdown(block.content)}</blockquote>\n`;

      case MarkdownBlockType.HORIZONTAL_RULE:
        return '<hr>\n';

      default:
        return `<div class="unknown-block">${this.escapeHtml(block.content)}</div>\n`;
    }
  }

  /**
   * Process inline markdown (bold, italic, links, etc.)
   * @param content - Content to process
   * @returns Processed HTML
   */
  private processInlineMarkdown(content: string): string {
    // Bold text
    content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    content = content.replace(/__(.*?)__/g, '<strong>$1</strong>');

    // Italic text
    content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');
    content = content.replace(/_(.*?)_/g, '<em>$1</em>');

    // Inline code
    content = content.replace(/`(.*?)`/g, '<code>$1</code>');

    // Links
    content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    return content;
  }

  /**
   * Generate heading ID from content
   * @param content - Heading content
   * @returns Generated ID
   */
  private generateHeadingId(content: string): string {
    return content
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Extract keywords from code content
   * @param code - Code content
   * @returns Array of keywords
   */
  private extractKeywords(code: string): string[] {
    // Simple keyword extraction - in production, use proper language parsers
    const keywords = code.match(/\b(function|class|const|let|var|if|else|for|while|return|import|export|async|await|try|catch|throw)\b/g);
    return keywords ? [...new Set(keywords)] : [];
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
   * Update processing statistics
   * @param processingTime - Processing time in milliseconds
   * @param blockCount - Number of blocks processed
   * @param codeBlockCount - Number of code blocks processed
   */
  private updateProcessingStats(processingTime: number, blockCount: number, codeBlockCount: number): void {
    this.processingStats.totalDocuments++;
    this.processingStats.totalBlocks += blockCount;
    this.processingStats.totalCodeBlocks += codeBlockCount;
    this.processingStats.totalProcessingTime += processingTime;
    this.processingStats.averageProcessingTime = 
      this.processingStats.totalProcessingTime / this.processingStats.totalDocuments;
  }
}
