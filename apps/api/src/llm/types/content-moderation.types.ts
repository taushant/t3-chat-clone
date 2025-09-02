/**
 * Types for content moderation and filtering
 */

export interface ModerationResult {
  isApproved: boolean;
  confidence: number; // 0-1
  categories: ModerationCategory[];
  flags: ModerationFlag[];
  suggestions: string[];
  metadata: ModerationMetadata;
}

export interface ModerationCategory {
  name: string;
  confidence: number;
  severity: ModerationSeverity;
  description: string;
}

export interface ModerationFlag {
  type: FlagType;
  severity: ModerationSeverity;
  message: string;
  position?: TextPosition;
  suggestion?: string;
  confidence: number;
}

export interface ModerationMetadata {
  contentLength: number;
  language?: string;
  processingTime: number;
  model?: string;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
}

export interface ModerationContext {
  userId: string;
  sessionId?: string;
  contentType: ContentType;
  previousContent?: string;
  userHistory?: UserModerationHistory;
  customRules?: FilterRule[];
}

export interface UserModerationHistory {
  userId: string;
  totalContent: number;
  flaggedContent: number;
  blockedContent: number;
  lastModeration: Date;
  riskScore: number; // 0-1
  categories: Record<string, number>; // category -> count
}

export interface ModerationRecord {
  id: string;
  userId: string;
  content: string;
  result: ModerationResult;
  timestamp: Date;
  sessionId?: string;
  action: ModerationAction;
}

export interface ModerationStats {
  totalContent: number;
  approvedContent: number;
  flaggedContent: number;
  blockedContent: number;
  averageConfidence: number;
  topCategories: Array<{ category: string; count: number }>;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface ModerationReport {
  userId?: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  stats: ModerationStats;
  trends: ModerationTrend[];
  recommendations: string[];
}

export interface ModerationTrend {
  date: Date;
  totalContent: number;
  flaggedContent: number;
  blockedContent: number;
  averageConfidence: number;
}

export interface FilterResult {
  isAllowed: boolean;
  filteredContent: string;
  removedContent: string[];
  appliedRules: string[];
  confidence: number;
  metadata: FilterMetadata;
}

export interface FilterMetadata {
  originalLength: number;
  filteredLength: number;
  processingTime: number;
  rulesApplied: number;
  timestamp: Date;
}

export interface FilterRule {
  id: string;
  name: string;
  description: string;
  type: FilterRuleType;
  pattern: string | RegExp;
  action: FilterAction;
  severity: ModerationSeverity;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface FilterContext {
  userId: string;
  contentType: ContentType;
  userRole: string;
  sessionId?: string;
  previousContent?: string;
  customRules?: FilterRule[];
}

export interface RuleEvaluationResult {
  matched: boolean;
  ruleId: string;
  confidence: number;
  matches: RuleMatch[];
  action: FilterAction;
}

export interface RuleMatch {
  pattern: string;
  matchedText: string;
  position: TextPosition;
  confidence: number;
}

export interface TextPosition {
  start: number;
  end: number;
  line?: number;
  column?: number;
}

export interface UserFilterProfile {
  userId: string;
  riskLevel: RiskLevel;
  customRules: FilterRule[];
  preferences: FilterPreferences;
  history: UserModerationHistory;
  lastUpdated: Date;
}

export interface FilterPreferences {
  strictness: FilterStrictness;
  allowedCategories: string[];
  blockedCategories: string[];
  customKeywords: string[];
  blockedKeywords: string[];
}

export interface UserBehavior {
  type: BehaviorType;
  content: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface ModerationEvent {
  id: string;
  userId: string;
  type: ModerationEventType;
  content: string;
  result: ModerationResult;
  timestamp: Date;
  sessionId?: string;
  metadata: Record<string, any>;
}

export interface ContentModerator {
  name: string;
  version: string;
  isEnabled: boolean;
  categories: string[];
  confidence: number;
  processContent(content: string, context: ModerationContext): Promise<ModerationResult>;
}

export interface ContentFilter {
  name: string;
  type: FilterType;
  isEnabled: boolean;
  rules: FilterRule[];
  filterContent(content: string, context: FilterContext): Promise<FilterResult>;
}

export enum ContentType {
  TEXT = 'text',
  CODE = 'code',
  MARKDOWN = 'markdown',
  HTML = 'html',
  JSON = 'json',
  URL = 'url',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
}

export enum ModerationSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ModerationAction {
  APPROVE = 'approve',
  FLAG = 'flag',
  BLOCK = 'block',
  REVIEW = 'review',
  QUARANTINE = 'quarantine',
}

export enum FlagType {
  SPAM = 'spam',
  HARASSMENT = 'harassment',
  HATE_SPEECH = 'hate_speech',
  VIOLENCE = 'violence',
  SEXUAL_CONTENT = 'sexual_content',
  SELF_HARM = 'self_harm',
  MISINFORMATION = 'misinformation',
  COPYRIGHT = 'copyright',
  PRIVACY = 'privacy',
  SECURITY = 'security',
  INAPPROPRIATE = 'inappropriate',
  OFFENSIVE = 'offensive',
  TOXIC = 'toxic',
  CUSTOM = 'custom',
}

export enum FilterRuleType {
  REGEX = 'regex',
  KEYWORD = 'keyword',
  PHRASE = 'phrase',
  PATTERN = 'pattern',
  ML_MODEL = 'ml_model',
  EXTERNAL_API = 'external_api',
  CUSTOM = 'custom',
}

export enum FilterAction {
  ALLOW = 'allow',
  BLOCK = 'block',
  FLAG = 'flag',
  REPLACE = 'replace',
  REDACT = 'redact',
  QUARANTINE = 'quarantine',
}

export enum FilterType {
  TEXT = 'text',
  IMAGE = 'image',
  URL = 'url',
  CODE = 'code',
  MIXED = 'mixed',
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum FilterStrictness {
  RELAXED = 'relaxed',
  MODERATE = 'moderate',
  STRICT = 'strict',
  VERY_STRICT = 'very_strict',
}

export enum BehaviorType {
  CONTENT_CREATION = 'content_creation',
  CONTENT_MODIFICATION = 'content_modification',
  CONTENT_DELETION = 'content_deletion',
  FLAG_CONTENT = 'flag_content',
  REPORT_CONTENT = 'report_content',
  SPAM_ATTEMPT = 'spam_attempt',
  ABUSE_ATTEMPT = 'abuse_attempt',
}

export enum ModerationEventType {
  CONTENT_MODERATED = 'content_moderated',
  CONTENT_FLAGGED = 'content_flagged',
  CONTENT_BLOCKED = 'content_blocked',
  RULE_TRIGGERED = 'rule_triggered',
  USER_FLAGGED = 'user_flagged',
  SYSTEM_ALERT = 'system_alert',
}

export interface ModerationConfig {
  enabled: boolean;
  strictness: FilterStrictness;
  autoApprove: boolean;
  requireReview: boolean;
  maxContentLength: number;
  allowedLanguages: string[];
  blockedLanguages: string[];
  customRules: FilterRule[];
  externalModerators: string[];
  realTimeModeration: boolean;
  batchModeration: boolean;
  cacheResults: boolean;
  cacheTTL: number; // in seconds
}

export interface ModerationMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageProcessingTime: number;
  cacheHitRate: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  lastUpdated: Date;
}

