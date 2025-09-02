/**
 * Types for response processing pipeline
 */

export interface ProcessedResponse {
  id: string;
  originalResponse: any;
  processedContent: string;
  metadata: ResponseMetadata;
  enhancements: ResponseEnhancements;
  quality: ResponseQuality;
  timestamp: Date;
}

export interface ProcessedChunk {
  id: string;
  originalChunk: any;
  processedContent: string;
  metadata: ChunkMetadata;
  enhancements: ChunkEnhancements;
  timestamp: Date;
}

export interface ResponseMetadata {
  processingTime: number;
  contentLength: number;
  wordCount: number;
  language?: string;
  sentiment?: SentimentAnalysis;
  topics?: string[];
  entities?: Entity[];
  readability?: ReadabilityScore;
  complexity?: ComplexityScore;
}

export interface ChunkMetadata {
  chunkIndex: number;
  isFirstChunk: boolean;
  isLastChunk: boolean;
  contentLength: number;
  processingTime: number;
  provider: string;
  model: string;
  tokenCount?: number;
}

export interface ResponseEnhancements {
  markdownProcessed: boolean;
  syntaxHighlighted: boolean;
  linksExtracted: Link[];
  imagesExtracted: Image[];
  codeBlocksExtracted: CodeBlock[];
  tablesExtracted: Table[];
  citationsExtracted: Citation[];
  summariesGenerated: Summary[];
}

export interface ChunkEnhancements {
  markdownProcessed: boolean;
  syntaxHighlighted: boolean;
  linksExtracted: Link[];
  codeBlocksExtracted: CodeBlock[];
}

export interface ResponseQuality {
  score: number; // 0-1
  factors: QualityFactor[];
  suggestions: string[];
  readability: ReadabilityScore;
  coherence: number; // 0-1
  relevance: number; // 0-1
  completeness: number; // 0-1
}

export interface QualityFactor {
  name: string;
  score: number; // 0-1
  weight: number; // 0-1
  description: string;
}

export interface SentimentAnalysis {
  polarity: number; // -1 to 1
  confidence: number; // 0-1
  emotions: Emotion[];
  overall: SentimentType;
}

export interface Emotion {
  name: string;
  intensity: number; // 0-1
  confidence: number; // 0-1
}

export interface Entity {
  text: string;
  type: EntityType;
  confidence: number; // 0-1
  startIndex: number;
  endIndex: number;
  metadata?: Record<string, any>;
}

export interface ReadabilityScore {
  score: number; // 0-100
  level: ReadabilityLevel;
  metrics: ReadabilityMetrics;
  suggestions: string[];
}

export interface ReadabilityMetrics {
  averageWordsPerSentence: number;
  averageSyllablesPerWord: number;
  complexWords: number;
  totalWords: number;
  totalSentences: number;
  fleschKincaid: number;
  gunningFog: number;
  smog: number;
}

export interface ComplexityScore {
  lexical: number; // 0-1
  syntactic: number; // 0-1
  semantic: number; // 0-1
  overall: number; // 0-1
  factors: ComplexityFactor[];
}

export interface ComplexityFactor {
  name: string;
  score: number; // 0-1
  description: string;
}

export interface Link {
  url: string;
  text: string;
  title?: string;
  startIndex: number;
  endIndex: number;
  isExternal: boolean;
  isSafe: boolean;
  metadata?: LinkMetadata;
}

export interface LinkMetadata {
  domain: string;
  protocol: string;
  path: string;
  query?: string;
  fragment?: string;
  favicon?: string;
  description?: string;
  image?: string;
}

export interface Image {
  url: string;
  alt: string;
  title?: string;
  startIndex: number;
  endIndex: number;
  width?: number;
  height?: number;
  format?: string;
  size?: number;
  metadata?: ImageMetadata;
}

export interface ImageMetadata {
  domain: string;
  protocol: string;
  path: string;
  filename: string;
  extension: string;
  mimeType?: string;
  description?: string;
  caption?: string;
}

export interface CodeBlock {
  id: string;
  language: string;
  code: string;
  startIndex: number;
  endIndex: number;
  lineCount: number;
  characterCount: number;
  highlightedCode?: string;
  metadata?: CodeBlockMetadata;
}

export interface CodeBlockMetadata {
  language: string;
  detectedLanguage?: string;
  hasErrors: boolean;
  complexity?: number;
  keywords: string[];
  imports?: string[];
  functions?: string[];
  classes?: string[];
}

export interface Table {
  id: string;
  headers: string[];
  rows: string[][];
  startIndex: number;
  endIndex: number;
  columnCount: number;
  rowCount: number;
  metadata?: TableMetadata;
}

export interface TableMetadata {
  hasHeader: boolean;
  isStructured: boolean;
  dataTypes: string[];
  summary?: string;
}

export interface Citation {
  id: string;
  text: string;
  source?: string;
  url?: string;
  startIndex: number;
  endIndex: number;
  type: CitationType;
  metadata?: CitationMetadata;
}

export interface CitationMetadata {
  author?: string;
  title?: string;
  year?: number;
  journal?: string;
  doi?: string;
  isbn?: string;
  confidence: number;
}

export interface Summary {
  id: string;
  type: SummaryType;
  content: string;
  length: number;
  confidence: number;
  metadata?: SummaryMetadata;
}

export interface SummaryMetadata {
  method: string;
  parameters: Record<string, any>;
  processingTime: number;
  originalLength: number;
  compressionRatio: number;
}

export interface ResponseProcessor {
  name: string;
  version: string;
  isEnabled: boolean;
  priority: number;
  processResponse(response: ProcessedResponse): Promise<ProcessedResponse>;
  processChunk(chunk: ProcessedChunk): Promise<ProcessedChunk>;
}

export interface ResponseEnhancer {
  name: string;
  version: string;
  isEnabled: boolean;
  priority: number;
  enhanceResponse(response: ProcessedResponse): Promise<ProcessedResponse>;
  enhanceChunk(chunk: ProcessedChunk): Promise<ProcessedChunk>;
}

export interface ResponseCache {
  key: string;
  response: ProcessedResponse;
  metadata: CacheMetadata;
  createdAt: Date;
  expiresAt: Date;
  accessCount: number;
  lastAccessed: Date;
}

export interface CacheMetadata {
  userId: string;
  sessionId?: string;
  provider: string;
  model: string;
  contentHash: string;
  size: number;
  ttl: number;
}

export interface ProcessingStats {
  totalResponses: number;
  totalChunks: number;
  averageProcessingTime: number;
  averageQualityScore: number;
  processorStats: ProcessorStats[];
  enhancerStats: EnhancerStats[];
  cacheStats: CacheStats;
}

export interface ProcessorStats {
  name: string;
  totalProcessed: number;
  averageProcessingTime: number;
  successRate: number;
  errorCount: number;
  lastUsed: Date;
}

export interface EnhancerStats {
  name: string;
  totalEnhanced: number;
  averageEnhancementTime: number;
  successRate: number;
  errorCount: number;
  lastUsed: Date;
}

export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  missRate: number;
  averageAccessTime: number;
  totalSize: number;
  evictionCount: number;
}

export interface ProcessingConfig {
  enabled: boolean;
  processors: ProcessorConfig[];
  enhancers: EnhancerConfig[];
  cache: CacheConfig;
  quality: QualityConfig;
  performance: PerformanceConfig;
}

export interface ProcessorConfig {
  name: string;
  enabled: boolean;
  priority: number;
  config: Record<string, any>;
}

export interface EnhancerConfig {
  name: string;
  enabled: boolean;
  priority: number;
  config: Record<string, any>;
}

export interface CacheConfig {
  enabled: boolean;
  maxSize: number;
  ttl: number;
  strategy: CacheStrategy;
}

export interface QualityConfig {
  enabled: boolean;
  minScore: number;
  factors: QualityFactorConfig[];
}

export interface QualityFactorConfig {
  name: string;
  enabled: boolean;
  weight: number;
  threshold: number;
}

export interface PerformanceConfig {
  maxProcessingTime: number;
  maxConcurrentProcessors: number;
  timeout: number;
  retryAttempts: number;
}

export enum SentimentType {
  POSITIVE = 'positive',
  NEGATIVE = 'negative',
  NEUTRAL = 'neutral',
  MIXED = 'mixed',
}

export enum EntityType {
  PERSON = 'person',
  ORGANIZATION = 'organization',
  LOCATION = 'location',
  DATE = 'date',
  TIME = 'time',
  MONEY = 'money',
  PERCENT = 'percent',
  EMAIL = 'email',
  URL = 'url',
  PHONE = 'phone',
  CUSTOM = 'custom',
}

export enum ReadabilityLevel {
  VERY_EASY = 'very_easy',
  EASY = 'easy',
  FAIRLY_EASY = 'fairly_easy',
  STANDARD = 'standard',
  FAIRLY_DIFFICULT = 'fairly_difficult',
  DIFFICULT = 'difficult',
  VERY_DIFFICULT = 'very_difficult',
}

export enum CitationType {
  ACADEMIC = 'academic',
  NEWS = 'news',
  BLOG = 'blog',
  SOCIAL = 'social',
  REFERENCE = 'reference',
  UNKNOWN = 'unknown',
}

export enum SummaryType {
  EXTRACTIVE = 'extractive',
  ABSTRACTIVE = 'abstractive',
  KEYWORDS = 'keywords',
  BULLET_POINTS = 'bullet_points',
  SENTENCES = 'sentences',
}

export enum CacheStrategy {
  LRU = 'lru',
  LFU = 'lfu',
  FIFO = 'fifo',
  TTL = 'ttl',
}

// Re-export types from other modules
export type { ChatCompletionChunk } from './chat-completion.types';
