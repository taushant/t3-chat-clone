import { Injectable, Logger } from '@nestjs/common';
import { 
  FilterResult,
  FilterContext,
  FilterRule,
  FilterAction,
  FilterRuleType,
  FilterType,
  FilterMetadata,
  TextPosition,
  ModerationSeverity,
} from '../types/content-moderation.types';

/**
 * Content Filter Service
 * Handles real-time content filtering with configurable rules
 */
@Injectable()
export class ContentFilterService {
  private readonly logger = new Logger(ContentFilterService.name);
  private readonly filters: Map<string, FilterRule[]> = new Map();
  private readonly globalRules: FilterRule[] = [];

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Filter content using available filters
   * @param content - Content to filter
   * @param context - Filter context
   * @returns FilterResult
   */
  async filterContent(content: string, context: FilterContext): Promise<FilterResult> {
    const startTime = Date.now();
    
    this.logger.debug(`Filtering content for user ${context.userId}`);

    try {
      if (!content || content.trim().length === 0) {
        return this.createAllowedResult(content, startTime, 'Empty content');
      }

      // Get applicable rules
      const applicableRules = this.getApplicableRules(context);
      
      // Apply rules to content
      const filterResult = this.applyRules(content, applicableRules, context);

      const processingTime = Date.now() - startTime;

      return {
        isAllowed: filterResult.isAllowed,
        filteredContent: filterResult.filteredContent,
        removedContent: filterResult.removedContent,
        appliedRules: filterResult.appliedRules,
        confidence: filterResult.confidence,
        metadata: {
          originalLength: content.length,
          filteredLength: filterResult.filteredContent.length,
          processingTime,
          rulesApplied: filterResult.appliedRules.length,
          timestamp: new Date(),
        },
      };

    } catch (error) {
      this.logger.error(`Content filtering failed for user ${context.userId}:`, error);
      
      // Return safe default result
      return this.createBlockedResult(content, startTime, 'Filtering failed');
    }
  }

  /**
   * Filter streaming content chunks
   * @param chunk - Content chunk
   * @param context - Filter context
   * @returns FilterResult
   */
  async filterStreamingContent(chunk: string, context: FilterContext): Promise<FilterResult> {
    const startTime = Date.now();
    
    this.logger.debug(`Filtering streaming chunk for user ${context.userId}`);

    try {
      // For streaming content, use lighter filtering
      const basicResult = await this.performBasicFiltering(chunk, context);
      
      const processingTime = Date.now() - startTime;

      return {
        isAllowed: basicResult.isAllowed,
        filteredContent: basicResult.filteredContent,
        removedContent: basicResult.removedContent,
        appliedRules: basicResult.appliedRules,
        confidence: basicResult.confidence,
        metadata: {
          originalLength: chunk.length,
          filteredLength: basicResult.filteredContent.length,
          processingTime,
          rulesApplied: basicResult.appliedRules.length,
          timestamp: new Date(),
        },
      };

    } catch (error) {
      this.logger.error(`Streaming content filtering failed for user ${context.userId}:`, error);
      
      // For streaming, err on the side of caution
      return this.createBlockedResult(chunk, startTime, 'Streaming filtering failed');
    }
  }

  /**
   * Update filter rules
   * @param rules - New filter rules
   */
  updateFilterRules(rules: FilterRule[]): void {
    this.globalRules.length = 0;
    this.globalRules.push(...rules);
    
    this.logger.log(`Updated filter rules, total rules: ${rules.length}`);
  }

  /**
   * Add a filter rule
   * @param rule - Filter rule to add
   */
  addFilterRule(rule: FilterRule): void {
    this.globalRules.push(rule);
    this.logger.log(`Added filter rule: ${rule.name}`);
  }

  /**
   * Remove a filter rule
   * @param ruleId - Rule ID to remove
   */
  removeFilterRule(ruleId: string): void {
    const index = this.globalRules.findIndex(r => r.id === ruleId);
    if (index !== -1) {
      this.globalRules.splice(index, 1);
      this.logger.log(`Removed filter rule: ${ruleId}`);
    }
  }

  /**
   * Get all filter rules
   * @returns Array of filter rules
   */
  getFilterRules(): FilterRule[] {
    return [...this.globalRules];
  }

  /**
   * Get filter rules for a specific user
   * @param userId - User ID
   * @returns Array of filter rules
   */
  getUserFilterRules(userId: string): FilterRule[] {
    const userRules = this.filters.get(userId) || [];
    return [...this.globalRules, ...userRules];
  }

  /**
   * Add user-specific filter rule
   * @param userId - User ID
   * @param rule - Filter rule
   */
  addUserFilterRule(userId: string, rule: FilterRule): void {
    const userRules = this.filters.get(userId) || [];
    userRules.push(rule);
    this.filters.set(userId, userRules);
    this.logger.log(`Added user filter rule for ${userId}: ${rule.name}`);
  }

  /**
   * Remove user-specific filter rule
   * @param userId - User ID
   * @param ruleId - Rule ID
   */
  removeUserFilterRule(userId: string, ruleId: string): void {
    const userRules = this.filters.get(userId) || [];
    const index = userRules.findIndex(r => r.id === ruleId);
    if (index !== -1) {
      userRules.splice(index, 1);
      this.filters.set(userId, userRules);
      this.logger.log(`Removed user filter rule for ${userId}: ${ruleId}`);
    }
  }

  /**
   * Get applicable rules for context
   * @param context - Filter context
   * @returns Array of applicable rules
   */
  private getApplicableRules(context: FilterContext): FilterRule[] {
    const applicableRules: FilterRule[] = [];

    // Add global rules
    applicableRules.push(...this.globalRules.filter(rule => rule.enabled));

    // Add user-specific rules
    const userRules = this.filters.get(context.userId) || [];
    applicableRules.push(...userRules.filter(rule => rule.enabled));

    // Add custom rules from context
    if (context.customRules) {
      applicableRules.push(...context.customRules.filter(rule => rule.enabled));
    }

    return applicableRules;
  }

  /**
   * Apply rules to content
   * @param content - Content to filter
   * @param rules - Rules to apply
   * @param context - Filter context
   * @returns Filter result
   */
  private applyRules(content: string, rules: FilterRule[], context: FilterContext): {
    isAllowed: boolean;
    filteredContent: string;
    removedContent: string[];
    appliedRules: string[];
    confidence: number;
  } {
    let filteredContent = content;
    const removedContent: string[] = [];
    const appliedRules: string[] = [];
    let confidence = 1.0;

    for (const rule of rules) {
      const result = this.applyRule(filteredContent, rule, context);
      
      if (result.matched) {
        appliedRules.push(rule.id);
        confidence = Math.min(confidence, result.confidence);

        switch (rule.action) {
          case FilterAction.BLOCK:
            return {
              isAllowed: false,
              filteredContent: '',
              removedContent: [content],
              appliedRules: [rule.id],
              confidence: result.confidence,
            };

          case FilterAction.REPLACE:
            filteredContent = result.filteredContent;
            removedContent.push(...result.removedContent);
            break;

          case FilterAction.REDACT:
            filteredContent = result.filteredContent;
            removedContent.push(...result.removedContent);
            break;

          case FilterAction.FLAG:
            // Continue processing but mark as flagged
            break;

          case FilterAction.QUARANTINE:
            // Similar to block but with different handling
            return {
              isAllowed: false,
              filteredContent: '',
              removedContent: [content],
              appliedRules: [rule.id],
              confidence: result.confidence,
            };
        }
      }
    }

    return {
      isAllowed: true,
      filteredContent,
      removedContent,
      appliedRules,
      confidence,
    };
  }

  /**
   * Apply a single rule to content
   * @param content - Content to filter
   * @param rule - Rule to apply
   * @param context - Filter context
   * @returns Rule application result
   */
  private applyRule(content: string, rule: FilterRule, context: FilterContext): {
    matched: boolean;
    filteredContent: string;
    removedContent: string[];
    confidence: number;
  } {
    let filteredContent = content;
    const removedContent: string[] = [];
    let confidence = 1.0;

    try {
      switch (rule.type) {
        case FilterRuleType.REGEX:
          const regexResult = this.applyRegexRule(content, rule);
          if (regexResult.matched) {
            filteredContent = regexResult.filteredContent;
            removedContent.push(...regexResult.removedContent);
            confidence = regexResult.confidence;
          }
          break;

        case FilterRuleType.KEYWORD:
          const keywordResult = this.applyKeywordRule(content, rule);
          if (keywordResult.matched) {
            filteredContent = keywordResult.filteredContent;
            removedContent.push(...keywordResult.removedContent);
            confidence = keywordResult.confidence;
          }
          break;

        case FilterRuleType.PHRASE:
          const phraseResult = this.applyPhraseRule(content, rule);
          if (phraseResult.matched) {
            filteredContent = phraseResult.filteredContent;
            removedContent.push(...phraseResult.removedContent);
            confidence = phraseResult.confidence;
          }
          break;

        case FilterRuleType.PATTERN:
          const patternResult = this.applyPatternRule(content, rule);
          if (patternResult.matched) {
            filteredContent = patternResult.filteredContent;
            removedContent.push(...patternResult.removedContent);
            confidence = patternResult.confidence;
          }
          break;

        default:
          this.logger.warn(`Unknown rule type: ${rule.type}`);
      }

      return {
        matched: filteredContent !== content || removedContent.length > 0,
        filteredContent,
        removedContent,
        confidence,
      };

    } catch (error) {
      this.logger.error(`Error applying rule ${rule.id}:`, error);
      return {
        matched: false,
        filteredContent: content,
        removedContent: [],
        confidence: 1.0,
      };
    }
  }

  /**
   * Apply regex rule
   * @param content - Content to filter
   * @param rule - Regex rule
   * @returns Rule application result
   */
  private applyRegexRule(content: string, rule: FilterRule): {
    matched: boolean;
    filteredContent: string;
    removedContent: string[];
    confidence: number;
  } {
    try {
      const regex = new RegExp(rule.pattern as string, 'gi');
      const matches = content.match(regex);
      
      if (!matches) {
        return {
          matched: false,
          filteredContent: content,
          removedContent: [],
          confidence: 1.0,
        };
      }

      let filteredContent = content;
      const removedContent: string[] = [];

      switch (rule.action) {
        case FilterAction.REPLACE:
          filteredContent = content.replace(regex, '[FILTERED]');
          removedContent.push(...matches);
          break;

        case FilterAction.REDACT:
          filteredContent = content.replace(regex, '***');
          removedContent.push(...matches);
          break;

        case FilterAction.BLOCK:
        case FilterAction.QUARANTINE:
          return {
            matched: true,
            filteredContent: '',
            removedContent: [content],
            confidence: 0.95,
          };

        case FilterAction.FLAG:
          // Don't modify content, just mark as flagged
          break;
      }

      return {
        matched: true,
        filteredContent,
        removedContent,
        confidence: 0.9,
      };

    } catch (error) {
      this.logger.error(`Error applying regex rule ${rule.id}:`, error);
      return {
        matched: false,
        filteredContent: content,
        removedContent: [],
        confidence: 1.0,
      };
    }
  }

  /**
   * Apply keyword rule
   * @param content - Content to filter
   * @param rule - Keyword rule
   * @returns Rule application result
   */
  private applyKeywordRule(content: string, rule: FilterRule): {
    matched: boolean;
    filteredContent: string;
    removedContent: string[];
    confidence: number;
  } {
    const keyword = rule.pattern as string;
    const lowerContent = content.toLowerCase();
    const lowerKeyword = keyword.toLowerCase();

    if (!lowerContent.includes(lowerKeyword)) {
      return {
        matched: false,
        filteredContent: content,
        removedContent: [],
        confidence: 1.0,
      };
    }

    let filteredContent = content;
    const removedContent: string[] = [];

    switch (rule.action) {
      case FilterAction.REPLACE:
        filteredContent = content.replace(new RegExp(keyword, 'gi'), '[FILTERED]');
        removedContent.push(keyword);
        break;

      case FilterAction.REDACT:
        filteredContent = content.replace(new RegExp(keyword, 'gi'), '***');
        removedContent.push(keyword);
        break;

      case FilterAction.BLOCK:
      case FilterAction.QUARANTINE:
        return {
          matched: true,
          filteredContent: '',
          removedContent: [content],
          confidence: 0.9,
        };

      case FilterAction.FLAG:
        // Don't modify content, just mark as flagged
        break;
    }

    return {
      matched: true,
      filteredContent,
      removedContent,
      confidence: 0.8,
    };
  }

  /**
   * Apply phrase rule
   * @param content - Content to filter
   * @param rule - Phrase rule
   * @returns Rule application result
   */
  private applyPhraseRule(content: string, rule: FilterRule): {
    matched: boolean;
    filteredContent: string;
    removedContent: string[];
    confidence: number;
  } {
    const phrase = rule.pattern as string;
    const lowerContent = content.toLowerCase();
    const lowerPhrase = phrase.toLowerCase();

    if (!lowerContent.includes(lowerPhrase)) {
      return {
        matched: false,
        filteredContent: content,
        removedContent: [],
        confidence: 1.0,
      };
    }

    let filteredContent = content;
    const removedContent: string[] = [];

    switch (rule.action) {
      case FilterAction.REPLACE:
        filteredContent = content.replace(new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '[FILTERED]');
        removedContent.push(phrase);
        break;

      case FilterAction.REDACT:
        filteredContent = content.replace(new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '***');
        removedContent.push(phrase);
        break;

      case FilterAction.BLOCK:
      case FilterAction.QUARANTINE:
        return {
          matched: true,
          filteredContent: '',
          removedContent: [content],
          confidence: 0.95,
        };

      case FilterAction.FLAG:
        // Don't modify content, just mark as flagged
        break;
    }

    return {
      matched: true,
      filteredContent,
      removedContent,
      confidence: 0.9,
    };
  }

  /**
   * Apply pattern rule
   * @param content - Content to filter
   * @param rule - Pattern rule
   * @returns Rule application result
   */
  private applyPatternRule(content: string, rule: FilterRule): {
    matched: boolean;
    filteredContent: string;
    removedContent: string[];
    confidence: number;
  } {
    // Pattern rules are similar to regex but with predefined patterns
    const patterns: Record<string, RegExp> = {
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
      url: /https?:\/\/[^\s]+/g,
      credit_card: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
      ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
    };

    const pattern = patterns[rule.pattern as string];
    if (!pattern) {
      return {
        matched: false,
        filteredContent: content,
        removedContent: [],
        confidence: 1.0,
      };
    }

    const matches = content.match(pattern);
    if (!matches) {
      return {
        matched: false,
        filteredContent: content,
        removedContent: [],
        confidence: 1.0,
      };
    }

    let filteredContent = content;
    const removedContent: string[] = [];

    switch (rule.action) {
      case FilterAction.REPLACE:
        filteredContent = content.replace(pattern, '[FILTERED]');
        removedContent.push(...matches);
        break;

      case FilterAction.REDACT:
        filteredContent = content.replace(pattern, '***');
        removedContent.push(...matches);
        break;

      case FilterAction.BLOCK:
      case FilterAction.QUARANTINE:
        return {
          matched: true,
          filteredContent: '',
          removedContent: [content],
          confidence: 0.95,
        };

      case FilterAction.FLAG:
        // Don't modify content, just mark as flagged
        break;
    }

    return {
      matched: true,
      filteredContent,
      removedContent,
      confidence: 0.9,
    };
  }

  /**
   * Perform basic filtering for streaming content
   * @param content - Content to filter
   * @param context - Filter context
   * @returns Basic filter result
   */
  private async performBasicFiltering(content: string, context: FilterContext): Promise<{
    isAllowed: boolean;
    filteredContent: string;
    removedContent: string[];
    appliedRules: string[];
    confidence: number;
  }> {
    // For streaming, only apply high-confidence rules
    const highConfidenceRules = this.globalRules.filter(rule => 
      rule.enabled && rule.severity === 'high'
    );

    const result = this.applyRules(content, highConfidenceRules, context);
    
    return {
      isAllowed: result.isAllowed,
      filteredContent: result.filteredContent,
      removedContent: result.removedContent,
      appliedRules: result.appliedRules,
      confidence: result.confidence,
    };
  }

  /**
   * Create allowed result
   * @param content - Content
   * @param startTime - Start time
   * @param reason - Allow reason
   * @returns FilterResult
   */
  private createAllowedResult(content: string, startTime: number, reason: string): FilterResult {
    return {
      isAllowed: true,
      filteredContent: content,
      removedContent: [],
      appliedRules: [],
      confidence: 1.0,
      metadata: {
        originalLength: content.length,
        filteredLength: content.length,
        processingTime: Date.now() - startTime,
        rulesApplied: 0,
        timestamp: new Date(),
      },
    };
  }

  /**
   * Create blocked result
   * @param content - Content
   * @param startTime - Start time
   * @param reason - Block reason
   * @returns FilterResult
   */
  private createBlockedResult(content: string, startTime: number, reason: string): FilterResult {
    return {
      isAllowed: false,
      filteredContent: '',
      removedContent: [content],
      appliedRules: ['system-block'],
      confidence: 1.0,
      metadata: {
        originalLength: content.length,
        filteredLength: 0,
        processingTime: Date.now() - startTime,
        rulesApplied: 1,
        timestamp: new Date(),
      },
    };
  }

  /**
   * Initialize default filter rules
   */
  private initializeDefaultRules(): void {
    const defaultRules: FilterRule[] = [
      {
        id: 'block-scripts',
        name: 'Block Script Tags',
        description: 'Block content containing script tags',
        type: FilterRuleType.REGEX,
        pattern: '<script[^>]*>.*?</script>',
        action: FilterAction.BLOCK,
        severity: ModerationSeverity.HIGH,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
      },
      {
        id: 'block-javascript',
        name: 'Block JavaScript URLs',
        description: 'Block javascript: URLs',
        type: FilterRuleType.REGEX,
        pattern: 'javascript:',
        action: FilterAction.BLOCK,
        severity: ModerationSeverity.HIGH,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
      },
      {
        id: 'filter-email',
        name: 'Filter Email Addresses',
        description: 'Replace email addresses with [EMAIL]',
        type: FilterRuleType.PATTERN,
        pattern: 'email',
        action: FilterAction.REPLACE,
        severity: ModerationSeverity.MEDIUM,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
      },
      {
        id: 'filter-phone',
        name: 'Filter Phone Numbers',
        description: 'Replace phone numbers with [PHONE]',
        type: FilterRuleType.PATTERN,
        pattern: 'phone',
        action: FilterAction.REPLACE,
        severity: ModerationSeverity.MEDIUM,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
      },
    ];

    this.globalRules.push(...defaultRules);
    this.logger.log(`Initialized ${defaultRules.length} default filter rules`);
  }
}
