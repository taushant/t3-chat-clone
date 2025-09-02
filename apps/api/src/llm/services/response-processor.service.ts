import { Injectable, Logger } from '@nestjs/common';
import { 
  ProcessedResponse,
  ProcessedChunk,
  ResponseProcessor,
  ResponseMetadata,
  ResponseEnhancements,
  ResponseQuality,
  QualityFactor,
  SentimentAnalysis,
  Entity,
  ReadabilityScore,
  ComplexityScore,
  Link,
  Image,
  CodeBlock,
  Table,
  Citation,
  Summary,
  ProcessingStats,
  ProcessorStats,
  SentimentType,
  EntityType,
  ReadabilityLevel,
  CitationType,
  SummaryType,
} from '../types/response-processing.types';
import { ChatCompletionChunk } from '../types/chat-completion.types';

/**
 * Response Processor Service
 * Handles end-to-end response processing with quality analysis and enhancements
 */
@Injectable()
export class ResponseProcessorService {
  private readonly logger = new Logger(ResponseProcessorService.name);
  private readonly processors: ResponseProcessor[] = [];
  private readonly processingStats: ProcessingStats = {
    totalResponses: 0,
    totalChunks: 0,
    averageProcessingTime: 0,
    averageQualityScore: 0,
    processorStats: [],
    enhancerStats: [],
    cacheStats: {
      totalEntries: 0,
      hitRate: 0,
      missRate: 0,
      averageAccessTime: 0,
      totalSize: 0,
      evictionCount: 0,
    },
  };

  constructor() {
    this.initializeProcessors();
  }

  /**
   * Process a complete LLM response
   * @param response - LLM response to process
   * @returns ProcessedResponse
   */
  async processResponse(response: LLMResponse): Promise<ProcessedResponse> {
    const startTime = Date.now();
    
    this.logger.debug(`Processing response, model: ${response.model}`);

    try {
      // Create base processed response
      const processedResponse: ProcessedResponse = {
        id: this.generateResponseId(),
        originalResponse: response,
        processedContent: response.choices[0]?.message?.content || '',
        metadata: await this.extractMetadata(response, startTime),
        enhancements: await this.extractEnhancements(response),
        quality: await this.analyzeQuality(response),
        timestamp: new Date(),
      };

      // Apply processors
      for (const processor of this.processors) {
        if (processor.isEnabled) {
          try {
            const result = await processor.processResponse(processedResponse);
            if (typeof result === 'string') {
              processedResponse.processedContent = result;
            }
            this.updateProcessorStats(processor.name, Date.now() - startTime, true);
          } catch (error) {
            this.logger.warn(`Processor ${processor.name} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            this.updateProcessorStats(processor.name, Date.now() - startTime, false);
          }
        }
      }

      // Update overall statistics
      this.updateProcessingStats(processedResponse, Date.now() - startTime);

      this.logger.debug(`Response processing completed in ${Date.now() - startTime}ms`);

      return processedResponse;

    } catch (error) {
      this.logger.error(`Response processing failed:`, error);
      throw error;
    }
  }

  /**
   * Process a streaming chunk
   * @param chunk - Chat completion chunk
   * @returns ProcessedChunk
   */
  async processStreamingResponse(chunk: ChatCompletionChunk): Promise<ProcessedChunk> {
    const startTime = Date.now();
    
    this.logger.debug(`Processing streaming chunk, model: ${chunk.model}`);

    try {
      // Create base processed chunk
      const processedChunk: ProcessedChunk = {
        id: this.generateChunkId(),
        originalChunk: chunk,
        processedContent: chunk.choices[0]?.delta?.content || '',
        metadata: {
          chunkIndex: 0, // Will be set by caller
          isFirstChunk: false, // Will be set by caller
          isLastChunk: chunk.choices[0]?.finishReason !== null,
          contentLength: (chunk.choices[0]?.delta?.content || '').length,
          processingTime: 0,
          provider: this.extractProviderFromModel(chunk.model),
          model: chunk.model,
          tokenCount: chunk.usage?.totalTokens,
        },
        enhancements: {
          markdownProcessed: false,
          syntaxHighlighted: false,
          linksExtracted: [],
          codeBlocksExtracted: [],
        },
        timestamp: new Date(),
      };

      // Apply processors
      for (const processor of this.processors) {
        if (processor.isEnabled) {
          try {
            const result = await processor.processChunk(processedChunk);
            if (typeof result === 'string') {
              processedChunk.processedContent = result;
            }
            this.updateProcessorStats(processor.name, Date.now() - startTime, true);
          } catch (error) {
            this.logger.warn(`Processor ${processor.name} failed for chunk: ${error instanceof Error ? error.message : 'Unknown error'}`);
            this.updateProcessorStats(processor.name, Date.now() - startTime, false);
          }
        }
      }

      // Update chunk metadata
      processedChunk.metadata.processingTime = Date.now() - startTime;

      this.logger.debug(`Chunk processing completed in ${Date.now() - startTime}ms`);

      return processedChunk;

    } catch (error) {
      this.logger.error(`Chunk processing failed:`, error);
      throw error;
    }
  }

  /**
   * Validate a processed response
   * @param response - Processed response to validate
   * @returns Validation result
   */
  validateResponse(response: ProcessedResponse): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!response.id) {
      errors.push('Response ID is required');
    }

    if (!response.originalResponse) {
      errors.push('Original response is required');
    }

    if (!response.processedContent) {
      errors.push('Processed content is required');
    }

    if (!response.metadata) {
      errors.push('Response metadata is required');
    }

    // Check content quality
    if (response.quality.score < 0.3) {
      warnings.push('Response quality is very low');
    }

    if (response.metadata.contentLength < 10) {
      warnings.push('Response content is very short');
    }

    if (response.metadata.contentLength > 10000) {
      warnings.push('Response content is very long');
    }

    // Check processing time
    if (response.metadata.processingTime > 5000) {
      warnings.push('Response processing took longer than expected');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get processing statistics
   * @returns ProcessingStats
   */
  getProcessingStats(): ProcessingStats {
    return { ...this.processingStats };
  }

  /**
   * Reset processing statistics
   */
  resetProcessingStats(): void {
    this.processingStats.totalResponses = 0;
    this.processingStats.totalChunks = 0;
    this.processingStats.averageProcessingTime = 0;
    this.processingStats.averageQualityScore = 0;
    this.processingStats.processorStats = [];
    this.processingStats.enhancerStats = [];
  }

  /**
   * Add a custom processor
   * @param processor - Processor to add
   */
  addProcessor(processor: ResponseProcessor): void {
    this.processors.push(processor);
    this.processors.sort((a, b) => a.priority - b.priority);
    this.logger.log(`Added processor: ${processor.name}`);
  }

  /**
   * Remove a processor
   * @param name - Processor name
   */
  removeProcessor(name: string): void {
    const index = this.processors.findIndex(p => p.name === name);
    if (index !== -1) {
      this.processors.splice(index, 1);
      this.logger.log(`Removed processor: ${name}`);
    }
  }

  /**
   * Get all processors
   * @returns Array of processors
   */
  getProcessors(): ResponseProcessor[] {
    return [...this.processors];
  }

  /**
   * Extract metadata from response
   * @param response - LLM response
   * @param startTime - Processing start time
   * @returns ResponseMetadata
   */
  private async extractMetadata(response: LLMResponse, startTime: number): Promise<ResponseMetadata> {
    const content = response.choices[0]?.message?.content || '';
    const words = content.split(/\s+/).filter((word: string) => word.length > 0);

    return {
      processingTime: Date.now() - startTime,
      contentLength: content.length,
      wordCount: words.length,
      language: await this.detectLanguage(content),
      sentiment: await this.analyzeSentiment(content),
      topics: await this.extractTopics(content),
      entities: await this.extractEntities(content),
      readability: await this.calculateReadability(content),
      complexity: await this.calculateComplexity(content),
    };
  }

  /**
   * Extract enhancements from response
   * @param response - LLM response
   * @returns ResponseEnhancements
   */
  private async extractEnhancements(response: LLMResponse): Promise<ResponseEnhancements> {
    const content = response.choices[0]?.message?.content || '';

    return {
      markdownProcessed: this.hasMarkdown(content),
      syntaxHighlighted: this.hasCodeBlocks(content),
      linksExtracted: await this.extractLinks(content),
      imagesExtracted: await this.extractImages(content),
      codeBlocksExtracted: await this.extractCodeBlocks(content),
      tablesExtracted: await this.extractTables(content),
      citationsExtracted: await this.extractCitations(content),
      summariesGenerated: await this.generateSummaries(content),
    };
  }

  /**
   * Analyze response quality
   * @param response - LLM response
   * @returns ResponseQuality
   */
  private async analyzeQuality(response: LLMResponse): Promise<ResponseQuality> {
    const content = response.choices[0]?.message?.content || '';
    
    const factors: QualityFactor[] = [
      {
        name: 'completeness',
        score: this.calculateCompleteness(content),
        weight: 0.3,
        description: 'How complete the response is',
      },
      {
        name: 'coherence',
        score: this.calculateCoherence(content),
        weight: 0.25,
        description: 'How coherent the response is',
      },
      {
        name: 'relevance',
        score: this.calculateRelevance(content),
        weight: 0.2,
        description: 'How relevant the response is',
      },
      {
        name: 'clarity',
        score: this.calculateClarity(content),
        weight: 0.15,
        description: 'How clear the response is',
      },
      {
        name: 'accuracy',
        score: this.calculateAccuracy(content),
        weight: 0.1,
        description: 'How accurate the response is',
      },
    ];

    const overallScore = factors.reduce((sum, factor) => sum + (factor.score * factor.weight), 0);

    return {
      score: overallScore,
      factors,
      suggestions: this.generateQualitySuggestions(factors),
      readability: await this.calculateReadability(content),
      coherence: this.calculateCoherence(content),
      relevance: this.calculateRelevance(content),
      completeness: this.calculateCompleteness(content),
    };
  }

  /**
   * Detect language of content
   * @param content - Content to analyze
   * @returns Detected language
   */
  private async detectLanguage(content: string): Promise<string> {
    // Simple language detection based on common words
    const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const spanishWords = ['el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se', 'no', 'te'];
    const frenchWords = ['le', 'la', 'de', 'et', 'à', 'un', 'il', 'que', 'ne', 'se', 'ce', 'pas'];

    const lowerContent = content.toLowerCase();
    
    const englishCount = englishWords.reduce((count, word) => 
      count + (lowerContent.split(word).length - 1), 0);
    const spanishCount = spanishWords.reduce((count, word) => 
      count + (lowerContent.split(word).length - 1), 0);
    const frenchCount = frenchWords.reduce((count, word) => 
      count + (lowerContent.split(word).length - 1), 0);

    if (englishCount > spanishCount && englishCount > frenchCount) {
      return 'en';
    } else if (spanishCount > frenchCount) {
      return 'es';
    } else if (frenchCount > 0) {
      return 'fr';
    }

    return 'en'; // Default to English
  }

  /**
   * Analyze sentiment of content
   * @param content - Content to analyze
   * @returns SentimentAnalysis
   */
  private async analyzeSentiment(content: string): Promise<SentimentAnalysis> {
    // Simple sentiment analysis based on word lists
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'awesome', 'brilliant'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'disgusting', 'hate', 'angry', 'sad'];

    const lowerContent = content.toLowerCase();
    
    const positiveCount = positiveWords.reduce((count, word) => 
      count + (lowerContent.split(word).length - 1), 0);
    const negativeCount = negativeWords.reduce((count, word) => 
      count + (lowerContent.split(word).length - 1), 0);

    const totalWords = content.split(/\s+/).length;
    const positiveRatio = positiveCount / totalWords;
    const negativeRatio = negativeCount / totalWords;

    let polarity = 0;
    let overall = SentimentType.NEUTRAL;

    if (positiveRatio > negativeRatio) {
      polarity = positiveRatio;
      overall = SentimentType.POSITIVE;
    } else if (negativeRatio > positiveRatio) {
      polarity = -negativeRatio;
      overall = SentimentType.NEGATIVE;
    }

    return {
      polarity,
      confidence: Math.abs(polarity),
      emotions: [],
      overall,
    };
  }

  /**
   * Extract topics from content
   * @param content - Content to analyze
   * @returns Array of topics
   */
  private async extractTopics(content: string): Promise<string[]> {
    // Simple topic extraction based on common keywords
    const topicKeywords: Record<string, string[]> = {
      'technology': ['computer', 'software', 'hardware', 'programming', 'code', 'algorithm', 'data', 'AI', 'machine learning'],
      'science': ['research', 'study', 'experiment', 'theory', 'hypothesis', 'analysis', 'discovery', 'innovation'],
      'business': ['company', 'market', 'sales', 'profit', 'revenue', 'customer', 'product', 'service', 'strategy'],
      'health': ['medical', 'health', 'doctor', 'patient', 'treatment', 'medicine', 'therapy', 'wellness'],
      'education': ['school', 'university', 'student', 'teacher', 'learning', 'education', 'course', 'study'],
    };

    const lowerContent = content.toLowerCase();
    const topics: string[] = [];

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      const matchCount = keywords.reduce((count, keyword) => 
        count + (lowerContent.includes(keyword) ? 1 : 0), 0);
      
      if (matchCount >= 2) {
        topics.push(topic);
      }
    }

    return topics;
  }

  /**
   * Extract entities from content
   * @param content - Content to analyze
   * @returns Array of entities
   */
  private async extractEntities(content: string): Promise<Entity[]> {
    const entities: Entity[] = [];

    // Extract emails
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    let match;
    while ((match = emailRegex.exec(content)) !== null) {
      entities.push({
        text: match[0],
        type: EntityType.EMAIL,
        confidence: 0.95,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }

    // Extract URLs
    const urlRegex = /https?:\/\/[^\s]+/g;
    while ((match = urlRegex.exec(content)) !== null) {
      entities.push({
        text: match[0],
        type: EntityType.URL,
        confidence: 0.9,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }

    // Extract phone numbers
    const phoneRegex = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
    while ((match = phoneRegex.exec(content)) !== null) {
      entities.push({
        text: match[0],
        type: EntityType.PHONE,
        confidence: 0.8,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }

    return entities;
  }

  /**
   * Calculate readability score
   * @param content - Content to analyze
   * @returns ReadabilityScore
   */
  private async calculateReadability(content: string): Promise<ReadabilityScore> {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = content.split(/\s+/).filter(w => w.length > 0);
    const syllables = words.reduce((total, word) => total + this.countSyllables(word), 0);

    const averageWordsPerSentence = words.length / sentences.length;
    const averageSyllablesPerWord = syllables / words.length;

    // Flesch-Kincaid Grade Level
    const fleschKincaid = 0.39 * averageWordsPerSentence + 11.8 * averageSyllablesPerWord - 15.59;

    // Gunning Fog Index
    const complexWords = words.filter(word => this.countSyllables(word) > 2).length;
    const gunningFog = 0.4 * (averageWordsPerSentence + (complexWords / words.length) * 100);

    // SMOG Index
    const smog = 1.043 * Math.sqrt(complexWords * (30 / sentences.length)) + 3.1291;

    const score = Math.max(0, Math.min(100, 206.835 - 1.015 * averageWordsPerSentence - 84.6 * averageSyllablesPerWord));

    let level: ReadabilityLevel;
    if (score >= 90) level = ReadabilityLevel.VERY_EASY;
    else if (score >= 80) level = ReadabilityLevel.EASY;
    else if (score >= 70) level = ReadabilityLevel.FAIRLY_EASY;
    else if (score >= 60) level = ReadabilityLevel.STANDARD;
    else if (score >= 50) level = ReadabilityLevel.FAIRLY_DIFFICULT;
    else if (score >= 30) level = ReadabilityLevel.DIFFICULT;
    else level = ReadabilityLevel.VERY_DIFFICULT;

    return {
      score,
      level,
      metrics: {
        averageWordsPerSentence,
        averageSyllablesPerWord,
        complexWords,
        totalWords: words.length,
        totalSentences: sentences.length,
        fleschKincaid,
        gunningFog,
        smog,
      },
      suggestions: this.generateReadabilitySuggestions(score, averageWordsPerSentence, averageSyllablesPerWord),
    };
  }

  /**
   * Calculate complexity score
   * @param content - Content to analyze
   * @returns ComplexityScore
   */
  private async calculateComplexity(content: string): Promise<ComplexityScore> {
    const words = content.split(/\s+/).filter(w => w.length > 0);
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);

    // Lexical complexity (vocabulary diversity)
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    const lexicalComplexity = uniqueWords.size / words.length;

    // Syntactic complexity (sentence structure)
    const averageWordsPerSentence = words.length / sentences.length;
    const syntacticComplexity = Math.min(1, averageWordsPerSentence / 20);

    // Semantic complexity (concept density)
    const complexWords = words.filter(word => this.countSyllables(word) > 2).length;
    const semanticComplexity = complexWords / words.length;

    const overall = (lexicalComplexity + syntacticComplexity + semanticComplexity) / 3;

    return {
      lexical: lexicalComplexity,
      syntactic: syntacticComplexity,
      semantic: semanticComplexity,
      overall,
      factors: [
        {
          name: 'vocabulary_diversity',
          score: lexicalComplexity,
          description: 'Diversity of vocabulary used',
        },
        {
          name: 'sentence_structure',
          score: syntacticComplexity,
          description: 'Complexity of sentence structure',
        },
        {
          name: 'concept_density',
          score: semanticComplexity,
          description: 'Density of complex concepts',
        },
      ],
    };
  }

  /**
   * Extract links from content
   * @param content - Content to analyze
   * @returns Array of links
   */
  private async extractLinks(content: string): Promise<Link[]> {
    const links: Link[] = [];
    const urlRegex = /https?:\/\/[^\s]+/g;
    let match;

    while ((match = urlRegex.exec(content)) !== null) {
      const url = match[0];
      const link: Link = {
        url,
        text: url,
        startIndex: match.index,
        endIndex: match.index + url.length,
        isExternal: !url.includes(window?.location?.hostname || 'localhost'),
        isSafe: this.isSafeUrl(url),
        metadata: this.parseUrlMetadata(url),
      };
      links.push(link);
    }

    return links;
  }

  /**
   * Extract images from content
   * @param content - Content to analyze
   * @returns Array of images
   */
  private async extractImages(content: string): Promise<Image[]> {
    const images: Image[] = [];
    const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let match;

    while ((match = imgRegex.exec(content)) !== null) {
      const alt = match[1];
      const url = match[2];
      const image: Image = {
        url,
        alt,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        metadata: this.parseUrlMetadata(url),
      };
      images.push(image);
    }

    return images;
  }

  /**
   * Extract code blocks from content
   * @param content - Content to analyze
   * @returns Array of code blocks
   */
  private async extractCodeBlocks(content: string): Promise<CodeBlock[]> {
    const codeBlocks: CodeBlock[] = [];
    const codeRegex = /```(\w*)\n?([\s\S]*?)```/g;
    let match;

    while ((match = codeRegex.exec(content)) !== null) {
      const language = match[1] || 'text';
      const code = match[2];
      const codeBlock: CodeBlock = {
        id: this.generateCodeBlockId(),
        language,
        code,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        lineCount: code.split('\n').length,
        characterCount: code.length,
        metadata: {
          language,
          hasErrors: false,
          keywords: this.extractCodeKeywords(code),
        },
      };
      codeBlocks.push(codeBlock);
    }

    return codeBlocks;
  }

  /**
   * Extract tables from content
   * @param content - Content to analyze
   * @returns Array of tables
   */
  private async extractTables(content: string): Promise<Table[]> {
    const tables: Table[] = [];
    const tableRegex = /\|(.+)\|\n\|[-\s|]+\|\n((?:\|.+\|\n?)*)/g;
    let match;

    while ((match = tableRegex.exec(content)) !== null) {
      const headerRow = match[1];
      const dataRows = match[2];
      
      const headers = headerRow.split('|').map(h => h.trim()).filter(h => h);
      const rows = dataRows.split('\n').map(row => 
        row.split('|').map(cell => cell.trim()).filter(cell => cell)
      ).filter(row => row.length > 0);

      const table: Table = {
        id: this.generateTableId(),
        headers,
        rows,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        columnCount: headers.length,
        rowCount: rows.length,
        metadata: {
          hasHeader: true,
          isStructured: rows.every(row => row.length === headers.length),
          dataTypes: [],
          summary: '',
        },
      };
      tables.push(table);
    }

    return tables;
  }

  /**
   * Extract citations from content
   * @param content - Content to analyze
   * @returns Array of citations
   */
  private async extractCitations(content: string): Promise<Citation[]> {
    const citations: Citation[] = [];
    
    // Extract numbered citations [1], [2], etc.
    const numberedRegex = /\[(\d+)\]/g;
    let match;
    while ((match = numberedRegex.exec(content)) !== null) {
      citations.push({
        id: this.generateCitationId(),
        text: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        type: CitationType.ACADEMIC,
        metadata: {
          confidence: 0.8,
        },
      });
    }

    // Extract author-date citations (Smith, 2023)
    const authorDateRegex = /\(([A-Za-z\s]+),\s*(\d{4})\)/g;
    while ((match = authorDateRegex.exec(content)) !== null) {
      citations.push({
        id: this.generateCitationId(),
        text: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        type: CitationType.ACADEMIC,
        metadata: {
          author: match[1],
          year: parseInt(match[2]),
          confidence: 0.9,
        },
      });
    }

    return citations;
  }

  /**
   * Generate summaries of content
   * @param content - Content to summarize
   * @returns Array of summaries
   */
  private async generateSummaries(content: string): Promise<Summary[]> {
    const summaries: Summary[] = [];
    
    if (content.length > 200) {
      // Generate extractive summary (first few sentences)
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const summarySentences = sentences.slice(0, Math.min(3, sentences.length));
      const extractiveSummary = summarySentences.join('. ') + '.';

      summaries.push({
        id: this.generateSummaryId(),
        type: SummaryType.EXTRACTIVE,
        content: extractiveSummary,
        length: extractiveSummary.length,
        confidence: 0.7,
        metadata: {
          method: 'extractive',
          parameters: { maxSentences: 3 },
          processingTime: 0,
          originalLength: content.length,
          compressionRatio: extractiveSummary.length / content.length,
        },
      });
    }

    return summaries;
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
   * Calculate completeness score
   * @param content - Content to analyze
   * @returns Completeness score (0-1)
   */
  private calculateCompleteness(content: string): number {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = content.split(/\s+/).filter(w => w.length > 0);
    
    // Simple completeness based on length and structure
    let score = 0;
    
    if (words.length >= 10) score += 0.3;
    if (words.length >= 50) score += 0.3;
    if (sentences.length >= 2) score += 0.2;
    if (sentences.length >= 5) score += 0.2;
    
    return Math.min(1, score);
  }

  /**
   * Calculate coherence score
   * @param content - Content to analyze
   * @returns Coherence score (0-1)
   */
  private calculateCoherence(content: string): number {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length < 2) return 0.5;
    
    // Simple coherence based on sentence length consistency
    const lengths = sentences.map(s => s.split(/\s+/).length);
    const avgLength = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length;
    const coefficient = Math.sqrt(variance) / avgLength;
    
    // Lower coefficient of variation = higher coherence
    return Math.max(0, 1 - coefficient);
  }

  /**
   * Calculate relevance score
   * @param content - Content to analyze
   * @returns Relevance score (0-1)
   */
  private calculateRelevance(content: string): number {
    // Simple relevance based on content structure and keywords
    let score = 0.5; // Base score
    
    if (content.includes('?')) score += 0.1; // Questions indicate engagement
    if (content.includes('because') || content.includes('therefore')) score += 0.1; // Explanations
    if (content.includes('example') || content.includes('for instance')) score += 0.1; // Examples
    if (content.length > 100) score += 0.1; // Substantial content
    if (content.length > 500) score += 0.1; // Detailed content
    
    return Math.min(1, score);
  }

  /**
   * Calculate clarity score
   * @param content - Content to analyze
   * @returns Clarity score (0-1)
   */
  private calculateClarity(content: string): number {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = content.split(/\s+/).filter(w => w.length > 0);
    
    if (sentences.length === 0) return 0;
    
    const avgWordsPerSentence = words.length / sentences.length;
    
    // Optimal sentence length is around 15-20 words
    let score = 1;
    if (avgWordsPerSentence > 30) score -= 0.3;
    if (avgWordsPerSentence > 50) score -= 0.3;
    if (avgWordsPerSentence < 5) score -= 0.2;
    
    return Math.max(0, score);
  }

  /**
   * Calculate accuracy score
   * @param content - Content to analyze
   * @returns Accuracy score (0-1)
   */
  private calculateAccuracy(content: string): number {
    // Simple accuracy based on factual indicators
    let score = 0.7; // Base score
    
    if (content.includes('according to') || content.includes('research shows')) score += 0.1;
    if (content.includes('studies indicate') || content.includes('data shows')) score += 0.1;
    if (content.includes('source:') || content.includes('reference:')) score += 0.1;
    
    return Math.min(1, score);
  }

  /**
   * Generate quality suggestions
   * @param factors - Quality factors
   * @returns Array of suggestions
   */
  private generateQualitySuggestions(factors: QualityFactor[]): string[] {
    const suggestions: string[] = [];
    
    for (const factor of factors) {
      if (factor.score < 0.5) {
        switch (factor.name) {
          case 'completeness':
            suggestions.push('Consider providing more detailed information');
            break;
          case 'coherence':
            suggestions.push('Improve sentence structure and flow');
            break;
          case 'relevance':
            suggestions.push('Focus more on the main topic');
            break;
          case 'clarity':
            suggestions.push('Use shorter, clearer sentences');
            break;
          case 'accuracy':
            suggestions.push('Add more credible sources and references');
            break;
        }
      }
    }
    
    return suggestions;
  }

  /**
   * Generate readability suggestions
   * @param score - Readability score
   * @param avgWordsPerSentence - Average words per sentence
   * @param avgSyllablesPerWord - Average syllables per word
   * @returns Array of suggestions
   */
  private generateReadabilitySuggestions(score: number, avgWordsPerSentence: number, avgSyllablesPerWord: number): string[] {
    const suggestions: string[] = [];
    
    if (score < 60) {
      suggestions.push('Consider using shorter sentences');
    }
    
    if (avgWordsPerSentence > 20) {
      suggestions.push('Break down long sentences into shorter ones');
    }
    
    if (avgSyllablesPerWord > 1.5) {
      suggestions.push('Use simpler, more common words');
    }
    
    return suggestions;
  }

  /**
   * Count syllables in a word
   * @param word - Word to count syllables for
   * @returns Number of syllables
   */
  private countSyllables(word: string): number {
    const vowels = 'aeiouy';
    let count = 0;
    let previousWasVowel = false;
    
    for (let i = 0; i < word.length; i++) {
      const isVowel = vowels.includes(word[i].toLowerCase());
      if (isVowel && !previousWasVowel) {
        count++;
      }
      previousWasVowel = isVowel;
    }
    
    // Handle silent 'e'
    if (word.toLowerCase().endsWith('e') && count > 1) {
      count--;
    }
    
    return Math.max(1, count);
  }

  /**
   * Check if URL is safe
   * @param url - URL to check
   * @returns true if safe
   */
  private isSafeUrl(url: string): boolean {
    const unsafeDomains = ['malware.com', 'phishing.com', 'spam.com'];
    return !unsafeDomains.some(domain => url.includes(domain));
  }

  /**
   * Parse URL metadata
   * @param url - URL to parse
   * @returns URL metadata
   */
  private parseUrlMetadata(url: string): any {
    try {
      const urlObj = new URL(url);
      return {
        domain: urlObj.hostname,
        protocol: urlObj.protocol,
        path: urlObj.pathname,
        query: urlObj.search,
        fragment: urlObj.hash,
      };
    } catch {
      return {};
    }
  }

  /**
   * Extract keywords from code
   * @param code - Code to analyze
   * @returns Array of keywords
   */
  private extractCodeKeywords(code: string): string[] {
    const keywords = code.match(/\b(function|class|const|let|var|if|else|for|while|return|import|export|async|await|try|catch|throw)\b/g);
    return keywords ? [...new Set(keywords)] : [];
  }

  /**
   * Generate response ID
   * @returns Generated ID
   */
  private generateResponseId(): string {
    return `resp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Generate chunk ID
   * @returns Generated ID
   */
  private generateChunkId(): string {
    return `chunk_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Generate code block ID
   * @returns Generated ID
   */
  private generateCodeBlockId(): string {
    return `code_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Generate table ID
   * @returns Generated ID
   */
  private generateTableId(): string {
    return `table_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Generate citation ID
   * @returns Generated ID
   */
  private generateCitationId(): string {
    return `cite_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Generate summary ID
   * @returns Generated ID
   */
  private generateSummaryId(): string {
    return `summary_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Extract provider from model name
   * @param model - Model name
   * @returns Provider name
   */
  private extractProviderFromModel(model: string): string {
    if (model.includes('gpt') || model.includes('openai')) {
      return 'openai';
    } else if (model.includes('claude') || model.includes('anthropic')) {
      return 'anthropic';
    } else if (model.includes('/')) {
      return 'openrouter';
    }
    return 'unknown';
  }

  /**
   * Update processor statistics
   * @param processorName - Processor name
   * @param processingTime - Processing time
   * @param success - Whether processing was successful
   */
  private updateProcessorStats(processorName: string, processingTime: number, success: boolean): void {
    let stats = this.processingStats.processorStats.find(s => s.name === processorName);
    
    if (!stats) {
      stats = {
        name: processorName,
        totalProcessed: 0,
        averageProcessingTime: 0,
        successRate: 0,
        errorCount: 0,
        lastUsed: new Date(),
      };
      this.processingStats.processorStats.push(stats);
    }
    
    stats.totalProcessed++;
    stats.averageProcessingTime = (stats.averageProcessingTime + processingTime) / 2;
    stats.successRate = success ? (stats.successRate + 1) / 2 : stats.successRate;
    stats.errorCount += success ? 0 : 1;
    stats.lastUsed = new Date();
  }

  /**
   * Update overall processing statistics
   * @param response - Processed response
   * @param processingTime - Total processing time
   */
  private updateProcessingStats(response: ProcessedResponse, processingTime: number): void {
    this.processingStats.totalResponses++;
    this.processingStats.averageProcessingTime = 
      (this.processingStats.averageProcessingTime + processingTime) / 2;
    this.processingStats.averageQualityScore = 
      (this.processingStats.averageQualityScore + response.quality.score) / 2;
  }

  /**
   * Initialize default processors
   */
  private initializeProcessors(): void {
    // Basic text processor
    this.addProcessor({
      name: 'basic-text',
      version: '1.0.0',
      isEnabled: true,
      priority: 1,
      processResponse: async (response) => {
        // Basic text processing - trim whitespace, normalize line breaks
        response.processedContent = response.processedContent
          .trim()
          .replace(/\r\n/g, '\n')
          .replace(/\r/g, '\n');
        return response;
      },
      processChunk: async (chunk) => {
        // Basic chunk processing
        chunk.processedContent = chunk.processedContent.trim();
        return chunk;
      },
    });

    // Markdown processor
    this.addProcessor({
      name: 'markdown',
      version: '1.0.0',
      isEnabled: true,
      priority: 2,
      processResponse: async (response) => {
        // Markdown processing would be handled by the markdown service
        response.enhancements.markdownProcessed = true;
        return response;
      },
      processChunk: async (chunk) => {
        // Chunk-level markdown processing
        chunk.enhancements.markdownProcessed = true;
        return chunk;
      },
    });

    this.logger.log(`Initialized ${this.processors.length} response processors`);
  }
}
