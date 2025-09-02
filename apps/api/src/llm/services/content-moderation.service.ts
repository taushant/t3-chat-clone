import { Injectable, Logger } from '@nestjs/common';
import { 
  ModerationResult,
  ModerationContext,
  ModerationRecord,
  ModerationStats,
  ModerationReport,
  ModerationEvent,
  ContentModerator,
  ContentType,
  ModerationSeverity,
  ModerationAction,
  FlagType,
  ModerationEventType,
  UserModerationHistory,
} from '../types/content-moderation.types';

/**
 * Content Moderation Service
 * Handles content moderation and filtering with multiple moderation strategies
 */
@Injectable()
export class ContentModerationService {
  private readonly logger = new Logger(ContentModerationService.name);
  private readonly moderators: ContentModerator[] = [];
  private readonly moderationHistory = new Map<string, ModerationRecord[]>();
  private readonly userHistory = new Map<string, UserModerationHistory>();

  constructor() {
    this.initializeModerators();
  }

  /**
   * Moderate content using available moderators
   * @param content - Content to moderate
   * @param type - Content type
   * @param context - Moderation context
   * @returns ModerationResult
   */
  async moderateContent(
    content: string, 
    type: ContentType, 
    context: ModerationContext
  ): Promise<ModerationResult> {
    const startTime = Date.now();
    
    this.logger.debug(`Moderating content for user ${context.userId}, type: ${type}`);

    try {
      // Basic content validation
      if (!content || content.trim().length === 0) {
        return this.createApprovedResult(content, startTime, 'Empty content');
      }

      if (content.length > 10000) { // 10KB limit
        return this.createBlockedResult(content, startTime, 'Content too long', [
          { type: FlagType.SECURITY, severity: ModerationSeverity.HIGH, message: 'Content exceeds maximum length', confidence: 1.0 }
        ]);
      }

      // Run content through all enabled moderators
      const results: ModerationResult[] = [];
      
      for (const moderator of this.moderators) {
        if (moderator.isEnabled) {
          try {
            const result = await moderator.processContent(content, context);
            results.push(result);
          } catch (error) {
            this.logger.warn(`Moderator ${moderator.name} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      // Combine results from all moderators
      const combinedResult = this.combineModerationResults(results, content, startTime, context);

      // Record moderation event
      await this.recordModerationEvent(context.userId, content, combinedResult, context);

      // Update user history
      this.updateUserHistory(context.userId, combinedResult);

      this.logger.debug(`Content moderation completed for user ${context.userId}, approved: ${combinedResult.isApproved}`);

      return combinedResult;

    } catch (error) {
      this.logger.error(`Content moderation failed for user ${context.userId}:`, error);
      
      // Return safe default result
      return this.createBlockedResult(content, startTime, 'Moderation failed', [
        { type: FlagType.SECURITY, severity: ModerationSeverity.HIGH, message: 'Moderation system error', confidence: 1.0 }
      ]);
    }
  }

  /**
   * Moderate streaming content chunks
   * @param chunk - Content chunk
   * @param context - Moderation context
   * @returns ModerationResult
   */
  async moderateStreamingContent(
    chunk: string, 
    context: ModerationContext
  ): Promise<ModerationResult> {
    const startTime = Date.now();
    
    this.logger.debug(`Moderating streaming chunk for user ${context.userId}`);

    try {
      // For streaming content, we use lighter moderation
      const basicResult = await this.performBasicModeration(chunk, context);
      
      // If basic moderation passes, approve
      if (basicResult.isApproved) {
        return this.createApprovedResult(chunk, startTime, 'Streaming chunk approved');
      }

      // If basic moderation fails, block
      return this.createBlockedResult(chunk, startTime, 'Streaming chunk blocked', basicResult.flags);

    } catch (error) {
      this.logger.error(`Streaming content moderation failed for user ${context.userId}:`, error);
      
      // For streaming, we err on the side of caution
      return this.createBlockedResult(chunk, startTime, 'Streaming moderation failed', [
        { type: FlagType.SECURITY, severity: ModerationSeverity.MEDIUM, message: 'Streaming moderation error', confidence: 0.8 }
      ]);
    }
  }

  /**
   * Get moderation history for a user
   * @param userId - User ID
   * @returns Array of moderation records
   */
  getModerationHistory(userId: string): ModerationRecord[] {
    return this.moderationHistory.get(userId) || [];
  }

  /**
   * Get moderation statistics
   * @param timeRange - Time range for statistics
   * @returns ModerationStats
   */
  getModerationStats(timeRange?: { start: Date; end: Date }): ModerationStats {
    const allRecords = Array.from(this.moderationHistory.values()).flat();
    
    let filteredRecords = allRecords;
    if (timeRange) {
      filteredRecords = allRecords.filter(record => 
        record.timestamp >= timeRange.start && record.timestamp <= timeRange.end
      );
    }

    const totalContent = filteredRecords.length;
    const approvedContent = filteredRecords.filter(r => r.action === ModerationAction.APPROVE).length;
    const flaggedContent = filteredRecords.filter(r => r.action === ModerationAction.FLAG).length;
    const blockedContent = filteredRecords.filter(r => r.action === ModerationAction.BLOCK).length;

    const averageConfidence = filteredRecords.length > 0
      ? filteredRecords.reduce((sum, r) => sum + r.result.confidence, 0) / filteredRecords.length
      : 0;

    // Calculate top categories
    const categoryCounts = new Map<string, number>();
    for (const record of filteredRecords) {
      for (const category of record.result.categories) {
        categoryCounts.set(category.name, (categoryCounts.get(category.name) || 0) + 1);
      }
    }

    const topCategories = Array.from(categoryCounts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalContent,
      approvedContent,
      flaggedContent,
      blockedContent,
      averageConfidence,
      topCategories,
      timeRange: timeRange || {
        start: new Date(Math.min(...allRecords.map(r => r.timestamp.getTime()))),
        end: new Date(Math.max(...allRecords.map(r => r.timestamp.getTime()))),
      },
    };
  }

  /**
   * Generate moderation report
   * @param userId - Optional user ID for user-specific report
   * @param timeRange - Time range for report
   * @returns ModerationReport
   */
  generateModerationReport(userId?: string, timeRange?: { start: Date; end: Date }): ModerationReport {
    const stats = this.getModerationStats(timeRange);
    
    // Filter records by user if specified
    let records = Array.from(this.moderationHistory.values()).flat();
    if (userId) {
      records = records.filter(r => r.userId === userId);
    }
    if (timeRange) {
      records = records.filter(r => r.timestamp >= timeRange.start && r.timestamp <= timeRange.end);
    }

    // Calculate trends (daily for the last 30 days)
    const trends: any[] = [];
    const endDate = timeRange?.end || new Date();
    const startDate = timeRange?.start || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayRecords = records.filter(r => 
        r.timestamp.toDateString() === d.toDateString()
      );

      trends.push({
        date: new Date(d),
        totalContent: dayRecords.length,
        flaggedContent: dayRecords.filter(r => r.action === ModerationAction.FLAG).length,
        blockedContent: dayRecords.filter(r => r.action === ModerationAction.BLOCK).length,
        averageConfidence: dayRecords.length > 0
          ? dayRecords.reduce((sum, r) => sum + r.result.confidence, 0) / dayRecords.length
          : 0,
      });
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(stats, trends);

    return {
      userId,
      timeRange: timeRange || { start: startDate, end: endDate },
      stats,
      trends,
      recommendations,
    };
  }

  /**
   * Add a custom moderator
   * @param moderator - Moderator to add
   */
  addModerator(moderator: ContentModerator): void {
    this.moderators.push(moderator);
    this.logger.log(`Added moderator: ${moderator.name}`);
  }

  /**
   * Remove a moderator
   * @param name - Moderator name
   */
  removeModerator(name: string): void {
    const index = this.moderators.findIndex(m => m.name === name);
    if (index !== -1) {
      this.moderators.splice(index, 1);
      this.logger.log(`Removed moderator: ${name}`);
    }
  }

  /**
   * Get all moderators
   * @returns Array of moderators
   */
  getModerators(): ContentModerator[] {
    return [...this.moderators];
  }

  /**
   * Initialize built-in moderators
   */
  private initializeModerators(): void {
    // Basic text moderator
    this.addModerator({
      name: 'basic-text',
      version: '1.0.0',
      isEnabled: true,
      categories: ['spam', 'inappropriate', 'offensive'],
      confidence: 0.8,
      processContent: async (content: string, context: ModerationContext) => {
        return this.performBasicModeration(content, context);
      },
    });

    // Profanity moderator
    this.addModerator({
      name: 'profanity',
      version: '1.0.0',
      isEnabled: true,
      categories: ['profanity', 'offensive'],
      confidence: 0.9,
      processContent: async (content: string, context: ModerationContext) => {
        return this.performProfanityModeration(content, context);
      },
    });

    // Spam moderator
    this.addModerator({
      name: 'spam',
      version: '1.0.0',
      isEnabled: true,
      categories: ['spam', 'promotional'],
      confidence: 0.7,
      processContent: async (content: string, context: ModerationContext) => {
        return this.performSpamModeration(content, context);
      },
    });

    this.logger.log(`Initialized ${this.moderators.length} content moderators`);
  }

  /**
   * Perform basic content moderation
   * @param content - Content to moderate
   * @param context - Moderation context
   * @returns ModerationResult
   */
  private async performBasicModeration(content: string, context: ModerationContext): Promise<ModerationResult> {
    const flags: any[] = [];
    const categories: any[] = [];

    // Check for excessive repetition
    if (this.hasExcessiveRepetition(content)) {
      flags.push({
        type: FlagType.SPAM,
        severity: ModerationSeverity.MEDIUM,
        message: 'Content contains excessive repetition',
        confidence: 0.8,
      });
      categories.push({
        name: 'spam',
        confidence: 0.8,
        severity: ModerationSeverity.MEDIUM,
        description: 'Spam-like content detected',
      });
    }

    // Check for excessive capitalization
    if (this.hasExcessiveCapitalization(content)) {
      flags.push({
        type: FlagType.INAPPROPRIATE,
        severity: ModerationSeverity.LOW,
        message: 'Content contains excessive capitalization',
        confidence: 0.6,
      });
    }

    // Check for suspicious patterns
    if (this.hasSuspiciousPatterns(content)) {
      flags.push({
        type: FlagType.SECURITY,
        severity: ModerationSeverity.HIGH,
        message: 'Content contains suspicious patterns',
        confidence: 0.9,
      });
      categories.push({
        name: 'security',
        confidence: 0.9,
        severity: ModerationSeverity.HIGH,
        description: 'Potential security threat detected',
      });
    }

    const isApproved = flags.length === 0 || flags.every(f => f.severity === ModerationSeverity.LOW);
    const confidence = flags.length > 0 ? Math.max(...flags.map(f => f.confidence)) : 1.0;

    return {
      isApproved,
      confidence,
      categories,
      flags,
      suggestions: this.generateSuggestions(flags),
      metadata: {
        contentLength: content.length,
        processingTime: 0,
        timestamp: new Date(),
        userId: context.userId,
        sessionId: context.sessionId,
      },
    };
  }

  /**
   * Perform profanity moderation
   * @param content - Content to moderate
   * @param context - Moderation context
   * @returns ModerationResult
   */
  private async performProfanityModeration(content: string, context: ModerationContext): Promise<ModerationResult> {
    const flags: any[] = [];
    const categories: any[] = [];

    // Simple profanity detection (in production, use a proper profanity filter)
    const profanityWords = ['badword1', 'badword2', 'badword3']; // Replace with actual profanity list
    const lowerContent = content.toLowerCase();

    for (const word of profanityWords) {
      if (lowerContent.includes(word)) {
        flags.push({
          type: FlagType.OFFENSIVE,
          severity: ModerationSeverity.HIGH,
          message: `Content contains inappropriate language: ${word}`,
          confidence: 0.95,
        });
        categories.push({
          name: 'profanity',
          confidence: 0.95,
          severity: ModerationSeverity.HIGH,
          description: 'Profanity detected in content',
        });
        break;
      }
    }

    const isApproved = flags.length === 0;
    const confidence = flags.length > 0 ? Math.max(...flags.map(f => f.confidence)) : 1.0;

    return {
      isApproved,
      confidence,
      categories,
      flags,
      suggestions: this.generateSuggestions(flags),
      metadata: {
        contentLength: content.length,
        processingTime: 0,
        timestamp: new Date(),
        userId: context.userId,
        sessionId: context.sessionId,
      },
    };
  }

  /**
   * Perform spam moderation
   * @param content - Content to moderate
   * @param context - Moderation context
   * @returns ModerationResult
   */
  private async performSpamModeration(content: string, context: ModerationContext): Promise<ModerationResult> {
    const flags: any[] = [];
    const categories: any[] = [];

    // Check for spam indicators
    const spamIndicators = [
      /click here/i,
      /free money/i,
      /make money fast/i,
      /viagra/i,
      /casino/i,
      /lottery/i,
    ];

    for (const pattern of spamIndicators) {
      if (pattern.test(content)) {
        flags.push({
          type: FlagType.SPAM,
          severity: ModerationSeverity.HIGH,
          message: 'Content appears to be spam',
          confidence: 0.9,
        });
        categories.push({
          name: 'spam',
          confidence: 0.9,
          severity: ModerationSeverity.HIGH,
          description: 'Spam content detected',
        });
        break;
      }
    }

    // Check for excessive links
    const linkCount = (content.match(/https?:\/\/[^\s]+/g) || []).length;
    if (linkCount > 3) {
      flags.push({
        type: FlagType.SPAM,
        severity: ModerationSeverity.MEDIUM,
        message: `Content contains ${linkCount} links, which may indicate spam`,
        confidence: 0.7,
      });
    }

    const isApproved = flags.length === 0;
    const confidence = flags.length > 0 ? Math.max(...flags.map(f => f.confidence)) : 1.0;

    return {
      isApproved,
      confidence,
      categories,
      flags,
      suggestions: this.generateSuggestions(flags),
      metadata: {
        contentLength: content.length,
        processingTime: 0,
        timestamp: new Date(),
        userId: context.userId,
        sessionId: context.sessionId,
      },
    };
  }

  /**
   * Combine results from multiple moderators
   * @param results - Array of moderation results
   * @param content - Original content
   * @param startTime - Processing start time
   * @param context - Moderation context
   * @returns Combined moderation result
   */
  private combineModerationResults(
    results: ModerationResult[], 
    content: string, 
    startTime: number, 
    context: ModerationContext
  ): ModerationResult {
    if (results.length === 0) {
      return this.createApprovedResult(content, startTime, 'No moderators available');
    }

    // Combine all flags and categories
    const allFlags = results.flatMap(r => r.flags);
    const allCategories = results.flatMap(r => r.categories);

    // Determine overall approval status
    const hasHighSeverityFlags = allFlags.some(f => f.severity === ModerationSeverity.HIGH || f.severity === ModerationSeverity.CRITICAL);
    const isApproved = !hasHighSeverityFlags;

    // Calculate overall confidence
    const confidence = results.length > 0 
      ? results.reduce((sum, r) => sum + r.confidence, 0) / results.length 
      : 1.0;

    // Generate suggestions
    const suggestions = this.generateSuggestions(allFlags);

    return {
      isApproved,
      confidence,
      categories: allCategories,
      flags: allFlags,
      suggestions,
      metadata: {
        contentLength: content.length,
        processingTime: Date.now() - startTime,
        timestamp: new Date(),
        userId: context.userId,
        sessionId: context.sessionId,
      },
    };
  }

  /**
   * Create approved result
   * @param content - Content
   * @param startTime - Start time
   * @param reason - Approval reason
   * @returns ModerationResult
   */
  private createApprovedResult(content: string, startTime: number, reason: string): ModerationResult {
    return {
      isApproved: true,
      confidence: 1.0,
      categories: [],
      flags: [],
      suggestions: [],
      metadata: {
        contentLength: content.length,
        processingTime: Date.now() - startTime,
        timestamp: new Date(),
      },
    };
  }

  /**
   * Create blocked result
   * @param content - Content
   * @param startTime - Start time
   * @param reason - Block reason
   * @param flags - Moderation flags
   * @returns ModerationResult
   */
  private createBlockedResult(content: string, startTime: number, reason: string, flags: any[]): ModerationResult {
    return {
      isApproved: false,
      confidence: flags.length > 0 ? Math.max(...flags.map(f => f.confidence)) : 1.0,
      categories: flags.map(f => ({
        name: f.type,
        confidence: f.confidence,
        severity: f.severity,
        description: f.message,
      })),
      flags,
      suggestions: this.generateSuggestions(flags),
      metadata: {
        contentLength: content.length,
        processingTime: Date.now() - startTime,
        timestamp: new Date(),
      },
    };
  }

  /**
   * Check for excessive repetition
   * @param content - Content to check
   * @returns true if has excessive repetition
   */
  private hasExcessiveRepetition(content: string): boolean {
    const words = content.toLowerCase().split(/\s+/);
    const wordCounts = new Map<string, number>();
    
    for (const word of words) {
      if (word.length > 3) { // Only count words longer than 3 characters
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }

    // Check if any word appears more than 30% of the time
    const totalWords = words.length;
    for (const [word, count] of wordCounts) {
      if (count / totalWords > 0.3) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check for excessive capitalization
   * @param content - Content to check
   * @returns true if has excessive capitalization
   */
  private hasExcessiveCapitalization(content: string): boolean {
    const upperCaseCount = (content.match(/[A-Z]/g) || []).length;
    const totalLetters = (content.match(/[A-Za-z]/g) || []).length;
    
    return totalLetters > 0 && upperCaseCount / totalLetters > 0.7;
  }

  /**
   * Check for suspicious patterns
   * @param content - Content to check
   * @returns true if has suspicious patterns
   */
  private hasSuspiciousPatterns(content: string): boolean {
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /eval\s*\(/i,
      /document\.write/i,
      /innerHTML/i,
      /onload/i,
      /onerror/i,
    ];

    return suspiciousPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Generate suggestions based on flags
   * @param flags - Moderation flags
   * @returns Array of suggestions
   */
  private generateSuggestions(flags: any[]): string[] {
    const suggestions: string[] = [];

    for (const flag of flags) {
      switch (flag.type) {
        case FlagType.SPAM:
          suggestions.push('Remove promotional content and excessive links');
          break;
        case FlagType.OFFENSIVE:
          suggestions.push('Use appropriate language and avoid profanity');
          break;
        case FlagType.SECURITY:
          suggestions.push('Remove potentially harmful code or scripts');
          break;
        case FlagType.INAPPROPRIATE:
          suggestions.push('Review content for appropriateness');
          break;
        default:
          suggestions.push('Review content for compliance with community guidelines');
      }
    }

    return [...new Set(suggestions)]; // Remove duplicates
  }

  /**
   * Generate recommendations based on stats and trends
   * @param stats - Moderation statistics
   * @param trends - Moderation trends
   * @returns Array of recommendations
   */
  private generateRecommendations(stats: ModerationStats, trends: any[]): string[] {
    const recommendations: string[] = [];

    // High flag rate
    if (stats.totalContent > 0 && stats.flaggedContent / stats.totalContent > 0.1) {
      recommendations.push('Consider implementing stricter content guidelines due to high flag rate');
    }

    // High block rate
    if (stats.totalContent > 0 && stats.blockedContent / stats.totalContent > 0.05) {
      recommendations.push('Review moderation rules as block rate is high');
    }

    // Low confidence
    if (stats.averageConfidence < 0.7) {
      recommendations.push('Improve moderation accuracy as confidence is low');
    }

    // Trending issues
    const recentTrends = trends.slice(-7); // Last 7 days
    const avgRecentFlags = recentTrends.reduce((sum, t) => sum + t.flaggedContent, 0) / recentTrends.length;
    const avgRecentBlocks = recentTrends.reduce((sum, t) => sum + t.blockedContent, 0) / recentTrends.length;

    if (avgRecentFlags > 5) {
      recommendations.push('Recent increase in flagged content - monitor for patterns');
    }

    if (avgRecentBlocks > 2) {
      recommendations.push('Recent increase in blocked content - review moderation rules');
    }

    return recommendations;
  }

  /**
   * Record moderation event
   * @param userId - User ID
   * @param content - Content
   * @param result - Moderation result
   * @param context - Moderation context
   */
  private async recordModerationEvent(
    userId: string, 
    content: string, 
    result: ModerationResult, 
    context: ModerationContext
  ): Promise<void> {
    const record: ModerationRecord = {
      id: `mod_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      userId,
      content: content.substring(0, 1000), // Store only first 1000 characters
      result,
      timestamp: new Date(),
      sessionId: context.sessionId,
      action: result.isApproved ? ModerationAction.APPROVE : 
              result.flags.some(f => f.severity === ModerationSeverity.HIGH || f.severity === ModerationSeverity.CRITICAL) 
                ? ModerationAction.BLOCK : ModerationAction.FLAG,
    };

    const userHistory = this.moderationHistory.get(userId) || [];
    userHistory.push(record);
    this.moderationHistory.set(userId, userHistory);
  }

  /**
   * Update user moderation history
   * @param userId - User ID
   * @param result - Moderation result
   */
  private updateUserHistory(userId: string, result: ModerationResult): void {
    const history = this.userHistory.get(userId) || {
      userId,
      totalContent: 0,
      flaggedContent: 0,
      blockedContent: 0,
      lastModeration: new Date(),
      riskScore: 0,
      categories: {},
    };

    history.totalContent++;
    history.lastModeration = new Date();

    if (!result.isApproved) {
      if (result.flags.some(f => f.severity === ModerationSeverity.HIGH || f.severity === ModerationSeverity.CRITICAL)) {
        history.blockedContent++;
      } else {
        history.flaggedContent++;
      }
    }

    // Update category counts
    for (const category of result.categories) {
      history.categories[category.name] = (history.categories[category.name] || 0) + 1;
    }

    // Calculate risk score (0-1)
    const flagRate = history.totalContent > 0 ? history.flaggedContent / history.totalContent : 0;
    const blockRate = history.totalContent > 0 ? history.blockedContent / history.totalContent : 0;
    history.riskScore = Math.min(1.0, flagRate * 0.5 + blockRate * 1.0);

    this.userHistory.set(userId, history);
  }
}

