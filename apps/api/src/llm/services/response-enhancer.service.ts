import { Injectable, Logger } from '@nestjs/common';
import { 
  ProcessedResponse,
  ProcessedChunk,
  ResponseEnhancer,
  ResponseEnhancements,
  ChunkEnhancements,
  Link,
  Image,
  CodeBlock,
  Table,
  Citation,
  Summary,
  SummaryType,
} from '../types/response-processing.types';

/**
 * Response Enhancer Service
 * Enhances processed responses with additional metadata and features
 */
@Injectable()
export class ResponseEnhancerService {
  private readonly logger = new Logger(ResponseEnhancerService.name);
  private readonly enhancers: ResponseEnhancer[] = [];

  constructor() {
    this.initializeEnhancers();
  }

  /**
   * Enhance a processed response
   * @param response - Processed response to enhance
   * @returns Enhanced response
   */
  async enhanceResponse(response: ProcessedResponse): Promise<ProcessedResponse> {
    const startTime = Date.now();
    
    this.logger.debug(`Enhancing response ${response.id}`);

    try {
      // Apply all enabled enhancers
      for (const enhancer of this.enhancers) {
        if (enhancer.isEnabled) {
          try {
            response = await enhancer.enhanceResponse(response);
            this.logger.debug(`Applied enhancer: ${enhancer.name}`);
          } catch (error) {
            this.logger.warn(`Enhancer ${enhancer.name} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      // Add metadata
      response = await this.addMetadata(response);

      this.logger.debug(`Response enhancement completed in ${Date.now() - startTime}ms`);

      return response;

    } catch (error) {
      this.logger.error(`Response enhancement failed:`, error);
      throw error;
    }
  }

  /**
   * Enhance a processed chunk
   * @param chunk - Processed chunk to enhance
   * @returns Enhanced chunk
   */
  async enhanceChunk(chunk: ProcessedChunk): Promise<ProcessedChunk> {
    const startTime = Date.now();
    
    this.logger.debug(`Enhancing chunk ${chunk.id}`);

    try {
      // Apply all enabled enhancers
      for (const enhancer of this.enhancers) {
        if (enhancer.isEnabled) {
          try {
            chunk = await enhancer.enhanceChunk(chunk);
            this.logger.debug(`Applied enhancer to chunk: ${enhancer.name}`);
          } catch (error) {
            this.logger.warn(`Enhancer ${enhancer.name} failed for chunk: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      this.logger.debug(`Chunk enhancement completed in ${Date.now() - startTime}ms`);

      return chunk;

    } catch (error) {
      this.logger.error(`Chunk enhancement failed:`, error);
      throw error;
    }
  }

  /**
   * Optimize response for display
   * @param response - Processed response
   * @returns Optimized response
   */
  async optimizeForDisplay(response: ProcessedResponse): Promise<ProcessedResponse> {
    this.logger.debug(`Optimizing response ${response.id} for display`);

    try {
      // Optimize content for display
      response.processedContent = this.optimizeContentForDisplay(response.processedContent);

      // Enhance links with metadata
      response.enhancements.linksExtracted = await this.enhanceLinks(response.enhancements.linksExtracted);

      // Enhance images with metadata
      response.enhancements.imagesExtracted = await this.enhanceImages(response.enhancements.imagesExtracted);

      // Enhance code blocks with syntax highlighting
      response.enhancements.codeBlocksExtracted = await this.enhanceCodeBlocks(response.enhancements.codeBlocksExtracted);

      // Enhance tables with formatting
      response.enhancements.tablesExtracted = await this.enhanceTables(response.enhancements.tablesExtracted);

      // Enhance citations with metadata
      response.enhancements.citationsExtracted = await this.enhanceCitations(response.enhancements.citationsExtracted);

      // Generate additional summaries if needed
      if (response.enhancements.summariesGenerated.length === 0) {
        response.enhancements.summariesGenerated = await this.generateAdditionalSummaries(response.processedContent);
      }

      return response;

    } catch (error) {
      this.logger.error(`Display optimization failed:`, error);
      throw error;
    }
  }

  /**
   * Add a custom enhancer
   * @param enhancer - Enhancer to add
   */
  addEnhancer(enhancer: ResponseEnhancer): void {
    this.enhancers.push(enhancer);
    this.enhancers.sort((a, b) => a.priority - b.priority);
    this.logger.log(`Added enhancer: ${enhancer.name}`);
  }

  /**
   * Remove an enhancer
   * @param name - Enhancer name
   */
  removeEnhancer(name: string): void {
    const index = this.enhancers.findIndex(e => e.name === name);
    if (index !== -1) {
      this.enhancers.splice(index, 1);
      this.logger.log(`Removed enhancer: ${name}`);
    }
  }

  /**
   * Get all enhancers
   * @returns Array of enhancers
   */
  getEnhancers(): ResponseEnhancer[] {
    return [...this.enhancers];
  }

  /**
   * Optimize content for display
   * @param content - Content to optimize
   * @returns Optimized content
   */
  private optimizeContentForDisplay(content: string): string {
    // Normalize whitespace
    content = content.replace(/\r\n/g, '\n');
    content = content.replace(/\r/g, '\n');
    
    // Remove excessive line breaks
    content = content.replace(/\n{3,}/g, '\n\n');
    
    // Normalize spaces
    content = content.replace(/[ \t]+/g, ' ');
    
    // Trim whitespace
    content = content.trim();
    
    return content;
  }

  /**
   * Enhance links with metadata
   * @param links - Array of links
   * @returns Enhanced links
   */
  private async enhanceLinks(links: Link[]): Promise<Link[]> {
    const enhancedLinks: Link[] = [];

    for (const link of links) {
      try {
        const enhancedLink: Link = {
          ...link,
          metadata: {
            ...link.metadata,
            // Add additional metadata like favicon, description, etc.
            favicon: await this.getFavicon(link.url) || undefined,
            description: await this.getLinkDescription(link.url) || undefined,
            image: await this.getLinkImage(link.url) || undefined,
          },
        };
        enhancedLinks.push(enhancedLink);
      } catch (error) {
        this.logger.warn(`Failed to enhance link ${link.url}:`, error);
        enhancedLinks.push(link); // Keep original link if enhancement fails
      }
    }

    return enhancedLinks;
  }

  /**
   * Enhance images with metadata
   * @param images - Array of images
   * @returns Enhanced images
   */
  private async enhanceImages(images: Image[]): Promise<Image[]> {
    const enhancedImages: Image[] = [];

    for (const image of images) {
      try {
        const enhancedImage: Image = {
          ...image,
          metadata: {
            ...image.metadata,
            // Add additional metadata like dimensions, format, etc.
            mimeType: await this.getImageMimeType(image.url) || undefined,
            description: await this.getImageDescription(image.url) || undefined,
            caption: await this.getImageCaption(image.url) || undefined,
          },
        };
        enhancedImages.push(enhancedImage);
      } catch (error) {
        this.logger.warn(`Failed to enhance image ${image.url}:`, error);
        enhancedImages.push(image); // Keep original image if enhancement fails
      }
    }

    return enhancedImages;
  }

  /**
   * Enhance code blocks with syntax highlighting
   * @param codeBlocks - Array of code blocks
   * @returns Enhanced code blocks
   */
  private async enhanceCodeBlocks(codeBlocks: CodeBlock[]): Promise<CodeBlock[]> {
    const enhancedCodeBlocks: CodeBlock[] = [];

    for (const codeBlock of codeBlocks) {
      try {
        const enhancedCodeBlock: CodeBlock = {
          ...codeBlock,
          highlightedCode: await this.highlightCode(codeBlock.code, codeBlock.language),
          metadata: {
            ...codeBlock.metadata,
            // Add additional metadata like complexity, imports, etc.
            complexity: await this.calculateCodeComplexity(codeBlock.code),
            imports: await this.extractImports(codeBlock.code, codeBlock.language),
            functions: await this.extractFunctions(codeBlock.code, codeBlock.language),
            classes: await this.extractClasses(codeBlock.code, codeBlock.language),
            language: codeBlock.language || 'text',
            detectedLanguage: await this.detectLanguage(codeBlock.code),
            hasErrors: await this.detectSyntaxErrors(codeBlock.code, codeBlock.language),
            keywords: await this.extractKeywords(codeBlock.code, codeBlock.language),
            lineCount: codeBlock.lineCount,
            characterCount: codeBlock.characterCount,
          },
        };
        enhancedCodeBlocks.push(enhancedCodeBlock);
      } catch (error) {
        this.logger.warn(`Failed to enhance code block:`, error);
        enhancedCodeBlocks.push(codeBlock); // Keep original code block if enhancement fails
      }
    }

    return enhancedCodeBlocks;
  }

  /**
   * Enhance tables with formatting
   * @param tables - Array of tables
   * @returns Enhanced tables
   */
  private async enhanceTables(tables: Table[]): Promise<Table[]> {
    const enhancedTables: Table[] = [];

    for (const table of tables) {
      try {
        const enhancedTable: Table = {
          ...table,
          metadata: {
            ...table.metadata,
            // Add additional metadata like data types, summary, etc.
            dataTypes: await this.inferDataTypes(table),
            summary: await this.generateTableSummary(table),
            hasHeader: table.metadata?.hasHeader || false,
            isStructured: table.metadata?.isStructured || false,
          },
        };
        enhancedTables.push(enhancedTable);
      } catch (error) {
        this.logger.warn(`Failed to enhance table:`, error);
        enhancedTables.push(table); // Keep original table if enhancement fails
      }
    }

    return enhancedTables;
  }

  /**
   * Enhance citations with metadata
   * @param citations - Array of citations
   * @returns Enhanced citations
   */
  private async enhanceCitations(citations: Citation[]): Promise<Citation[]> {
    const enhancedCitations: Citation[] = [];

    for (const citation of citations) {
      try {
        const enhancedCitation: Citation = {
          ...citation,
          metadata: {
            ...citation.metadata,
            // Add additional metadata like DOI, ISBN, etc.
            doi: await this.extractDOI(citation.text) || undefined,
            isbn: await this.extractISBN(citation.text) || undefined,
          },
        };
        enhancedCitations.push(enhancedCitation);
      } catch (error) {
        this.logger.warn(`Failed to enhance citation:`, error);
        enhancedCitations.push(citation); // Keep original citation if enhancement fails
      }
    }

    return enhancedCitations;
  }

  /**
   * Generate additional summaries
   * @param content - Content to summarize
   * @returns Array of summaries
   */
  private async generateAdditionalSummaries(content: string): Promise<Summary[]> {
    const summaries: Summary[] = [];

    try {
      // Generate keyword summary
      const keywords = await this.extractKeywords(content);
      if (keywords.length > 0) {
        summaries.push({
          id: this.generateSummaryId(),
          type: SummaryType.KEYWORDS,
          content: keywords.join(', '),
          length: keywords.join(', ').length,
          confidence: 0.8,
          metadata: {
            method: 'keyword-extraction',
            parameters: { maxKeywords: 10 },
            processingTime: 0,
            originalLength: content.length,
            compressionRatio: keywords.join(', ').length / content.length,
          },
        });
      }

      // Generate bullet points summary
      const bulletPoints = await this.generateBulletPoints(content);
      if (bulletPoints.length > 0) {
        summaries.push({
          id: this.generateSummaryId(),
          type: SummaryType.BULLET_POINTS,
          content: bulletPoints.join('\n'),
          length: bulletPoints.join('\n').length,
          confidence: 0.7,
          metadata: {
            method: 'bullet-point-extraction',
            parameters: { maxPoints: 5 },
            processingTime: 0,
            originalLength: content.length,
            compressionRatio: bulletPoints.join('\n').length / content.length,
          },
        });
      }
    } catch (error) {
      this.logger.warn(`Failed to generate additional summaries:`, error);
    }

    return summaries;
  }

  /**
   * Add metadata to response
   * @param response - Response to add metadata to
   * @returns Response with metadata
   */
  private async addMetadata(response: ProcessedResponse): Promise<ProcessedResponse> {
    // Add processing metadata
    response.metadata.processingTime = Date.now() - response.timestamp.getTime();
    
    // Add enhancement metadata
    response.enhancements.markdownProcessed = this.hasMarkdown(response.processedContent);
    response.enhancements.syntaxHighlighted = this.hasCodeBlocks(response.processedContent);
    
    return response;
  }

  /**
   * Get favicon for URL
   * @param url - URL to get favicon for
   * @returns Favicon URL or null
   */
  private async getFavicon(url: string): Promise<string | null> {
    try {
      const urlObj = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}`;
    } catch {
      return null;
    }
  }

  /**
   * Get link description
   * @param url - URL to get description for
   * @returns Description or null
   */
  private async getLinkDescription(url: string): Promise<string | null> {
    // In production, this would fetch the page and extract meta description
    return null;
  }

  /**
   * Get link image
   * @param url - URL to get image for
   * @returns Image URL or null
   */
  private async getLinkImage(url: string): Promise<string | null> {
    // In production, this would fetch the page and extract og:image
    return null;
  }

  /**
   * Get image MIME type
   * @param url - Image URL
   * @returns MIME type or null
   */
  private async getImageMimeType(url: string): Promise<string | null> {
    try {
      const extension = url.split('.').pop()?.toLowerCase();
      const mimeTypes: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
      };
      return mimeTypes[extension || ''] || null;
    } catch {
      return null;
    }
  }

  /**
   * Get image description
   * @param url - Image URL
   * @returns Description or null
   */
  private async getImageDescription(url: string): Promise<string | null> {
    // In production, this would use image analysis or alt text
    return null;
  }

  /**
   * Get image caption
   * @param url - Image URL
   * @returns Caption or null
   */
  private async getImageCaption(url: string): Promise<string | null> {
    // In production, this would use image analysis
    return null;
  }

  /**
   * Highlight code
   * @param code - Code to highlight
   * @param language - Programming language
   * @returns Highlighted code
   */
  private async highlightCode(code: string, language: string): Promise<string> {
    // In production, this would use a syntax highlighter
    return code;
  }

  /**
   * Calculate code complexity
   * @param code - Code to analyze
   * @returns Complexity score
   */
  private async calculateCodeComplexity(code: string): Promise<number> {
    const lines = code.split('\n').length;
    const complexity = Math.min(1, lines / 100); // Simple complexity based on line count
    return complexity;
  }

  /**
   * Extract imports from code
   * @param code - Code to analyze
   * @param language - Programming language
   * @returns Array of imports
   */
  private async extractImports(code: string, language: string): Promise<string[]> {
    const imports: string[] = [];
    
    if (language === 'javascript' || language === 'typescript') {
      const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(code)) !== null) {
        imports.push(match[1]);
      }
    } else if (language === 'python') {
      const importRegex = /(?:from\s+(\S+)\s+)?import\s+(\S+)/g;
      let match;
      while ((match = importRegex.exec(code)) !== null) {
        if (match[1]) {
          imports.push(match[1]);
        } else {
          imports.push(match[2]);
        }
      }
    }
    
    return imports;
  }

  /**
   * Extract functions from code
   * @param code - Code to analyze
   * @param language - Programming language
   * @returns Array of function names
   */
  private async extractFunctions(code: string, language: string): Promise<string[]> {
    const functions: string[] = [];
    
    if (language === 'javascript' || language === 'typescript') {
      const functionRegex = /function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?\(/g;
      let match;
      while ((match = functionRegex.exec(code)) !== null) {
        functions.push(match[1] || match[2]);
      }
    } else if (language === 'python') {
      const functionRegex = /def\s+(\w+)/g;
      let match;
      while ((match = functionRegex.exec(code)) !== null) {
        functions.push(match[1]);
      }
    }
    
    return functions;
  }

  /**
   * Extract classes from code
   * @param code - Code to analyze
   * @param language - Programming language
   * @returns Array of class names
   */
  private async extractClasses(code: string, language: string): Promise<string[]> {
    const classes: string[] = [];
    
    if (language === 'javascript' || language === 'typescript') {
      const classRegex = /class\s+(\w+)/g;
      let match;
      while ((match = classRegex.exec(code)) !== null) {
        classes.push(match[1]);
      }
    } else if (language === 'python') {
      const classRegex = /class\s+(\w+)/g;
      let match;
      while ((match = classRegex.exec(code)) !== null) {
        classes.push(match[1]);
      }
    }
    
    return classes;
  }

  /**
   * Infer data types from table
   * @param table - Table to analyze
   * @returns Array of data types
   */
  private async inferDataTypes(table: Table): Promise<string[]> {
    const dataTypes: string[] = [];
    
    for (let i = 0; i < table.columnCount; i++) {
      const columnData = table.rows.map(row => row[i]).filter(cell => cell);
      
      if (columnData.length === 0) {
        dataTypes.push('unknown');
        continue;
      }
      
      // Simple type inference
      const firstCell = columnData[0];
      if (/^\d+$/.test(firstCell)) {
        dataTypes.push('integer');
      } else if (/^\d+\.\d+$/.test(firstCell)) {
        dataTypes.push('float');
      } else if (/^\d{4}-\d{2}-\d{2}/.test(firstCell)) {
        dataTypes.push('date');
      } else {
        dataTypes.push('string');
      }
    }
    
    return dataTypes;
  }

  /**
   * Generate table summary
   * @param table - Table to summarize
   * @returns Table summary
   */
  private async generateTableSummary(table: Table): Promise<string> {
    return `Table with ${table.rowCount} rows and ${table.columnCount} columns: ${table.headers.join(', ')}`;
  }

  /**
   * Extract DOI from citation
   * @param text - Citation text
   * @returns DOI or null
   */
  private async extractDOI(text: string): Promise<string | null> {
    const doiRegex = /10\.\d{4,}\/[^\s]+/;
    const match = text.match(doiRegex);
    return match ? match[0] : null;
  }

  /**
   * Extract ISBN from citation
   * @param text - Citation text
   * @returns ISBN or null
   */
  private async extractISBN(text: string): Promise<string | null> {
    const isbnRegex = /(?:ISBN(?:-1[03])?:?\s*)?(?:978|979)[- ]?[0-9]{1,5}[- ]?[0-9]{1,7}[- ]?[0-9]{1,6}[- ]?[0-9]/;
    const match = text.match(isbnRegex);
    return match ? match[0] : null;
  }

  /**
   * Extract keywords from content
   * @param content - Content to analyze
   * @returns Array of keywords
   */
  private async extractKeywords(content: string): Promise<string[]> {
    // Simple keyword extraction based on word frequency
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    const wordCounts = new Map<string, number>();
    for (const word of words) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }
    
    return Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Generate bullet points from content
   * @param content - Content to analyze
   * @returns Array of bullet points
   */
  private async generateBulletPoints(content: string): Promise<string[]> {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    return sentences.slice(0, 5).map(sentence => `• ${sentence.trim()}`);
  }

  /**
   * Check if content has markdown
   * @param content - Content to check
   * @returns true if has markdown
   */
  private hasMarkdown(content: string): boolean {
    const markdownPatterns = [
      /#{1,6}\s+/m, // Headers
      /\*\*.*?\*\*/, // Bold
      /\*.*?\*/, // Italic
      /`.*?`/, // Inline code
      /```[\s\S]*?```/, // Code blocks
      /\[.*?\]\(.*?\)/, // Links
      /!\[.*?\]\(.*?\)/, // Images
    ];

    return markdownPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Check if content has code blocks
   * @param content - Content to check
   * @returns true if has code blocks
   */
  private hasCodeBlocks(content: string): boolean {
    return /```[\s\S]*?```/.test(content);
  }

  /**
   * Generate summary ID
   * @returns Generated ID
   */
  private generateSummaryId(): string {
    return `summary_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Initialize default enhancers
   */
  private initializeEnhancers(): void {
    // Basic enhancer
    this.addEnhancer({
      name: 'basic',
      version: '1.0.0',
      isEnabled: true,
      priority: 1,
      enhanceResponse: async (response) => {
        // Basic enhancement - normalize content
        response.processedContent = response.processedContent.trim();
        return response;
      },
      enhanceChunk: async (chunk) => {
        // Basic chunk enhancement
        chunk.processedContent = chunk.processedContent.trim();
        return chunk;
      },
    });

    // Link enhancer
    this.addEnhancer({
      name: 'links',
      version: '1.0.0',
      isEnabled: true,
      priority: 2,
      enhanceResponse: async (response) => {
        // Enhance links in response
        response.enhancements.linksExtracted = await this.enhanceLinks(response.enhancements.linksExtracted);
        return response;
      },
      enhanceChunk: async (chunk) => {
        // Enhance links in chunk
        chunk.enhancements.linksExtracted = await this.enhanceLinks(chunk.enhancements.linksExtracted);
        return chunk;
      },
    });

    // Code enhancer
    this.addEnhancer({
      name: 'code',
      version: '1.0.0',
      isEnabled: true,
      priority: 3,
      enhanceResponse: async (response) => {
        // Enhance code blocks in response
        response.enhancements.codeBlocksExtracted = await this.enhanceCodeBlocks(response.enhancements.codeBlocksExtracted);
        return response;
      },
      enhanceChunk: async (chunk) => {
        // Enhance code blocks in chunk
        chunk.enhancements.codeBlocksExtracted = await this.enhanceCodeBlocks(chunk.enhancements.codeBlocksExtracted);
        return chunk;
      },
    });

    this.logger.log(`Initialized ${this.enhancers.length} response enhancers`);
  }
}
