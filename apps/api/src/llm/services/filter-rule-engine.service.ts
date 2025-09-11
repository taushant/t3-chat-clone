import { Injectable, Logger } from '@nestjs/common';
import { 
  FilterRule,
  FilterContext,
  RuleEvaluationResult,
  RuleMatch,
  TextPosition,
  FilterRuleType,
  FilterAction,
  ModerationSeverity,
} from '../types/content-moderation.types';

/**
 * Filter Rule Engine Service
 * Advanced rule evaluation and management system
 */
@Injectable()
export class FilterRuleEngineService {
  private readonly logger = new Logger(FilterRuleEngineService.name);
  private readonly rules: Map<string, FilterRule> = new Map();
  private readonly ruleCache = new Map<string, { rule: FilterRule; compiled: any }>();

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Evaluate rules against content
   * @param content - Content to evaluate
   * @param context - Filter context
   * @returns Rule evaluation result
   */
  evaluateRules(content: string, context: FilterContext): RuleEvaluationResult[] {
    const results: RuleEvaluationResult[] = [];
    
    this.logger.debug(`Evaluating rules for user ${context.userId}, content length: ${content.length}`);

    // Get applicable rules
    const applicableRules = this.getApplicableRules(context);
    
    for (const rule of applicableRules) {
      try {
        const result = this.evaluateRule(content, rule, context);
        if (result.matched) {
          results.push(result);
        }
      } catch (error) {
        this.logger.error(`Error evaluating rule ${rule.id}:`, error);
      }
    }

    // Sort results by confidence (highest first)
    results.sort((a, b) => b.confidence - a.confidence);

    this.logger.debug(`Rule evaluation completed, ${results.length} rules matched`);

    return results;
  }

  /**
   * Add a new rule
   * @param rule - Rule to add
   */
  addRule(rule: FilterRule): void {
    this.rules.set(rule.id, rule);
    this.compileRule(rule);
    this.logger.log(`Added rule: ${rule.name} (${rule.id})`);
  }

  /**
   * Update an existing rule
   * @param ruleId - Rule ID
   * @param rule - Updated rule
   */
  updateRule(ruleId: string, rule: FilterRule): void {
    if (this.rules.has(ruleId)) {
      this.rules.set(ruleId, rule);
      this.compileRule(rule);
      this.logger.log(`Updated rule: ${rule.name} (${ruleId})`);
    } else {
      this.logger.warn(`Rule not found for update: ${ruleId}`);
    }
  }

  /**
   * Remove a rule
   * @param ruleId - Rule ID to remove
   */
  removeRule(ruleId: string): void {
    if (this.rules.has(ruleId)) {
      const rule = this.rules.get(ruleId);
      this.rules.delete(ruleId);
      this.ruleCache.delete(ruleId);
      this.logger.log(`Removed rule: ${rule?.name} (${ruleId})`);
    } else {
      this.logger.warn(`Rule not found for removal: ${ruleId}`);
    }
  }

  /**
   * Get all rules
   * @returns Array of all rules
   */
  getAllRules(): FilterRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get rules by type
   * @param type - Rule type
   * @returns Array of rules of specified type
   */
  getRulesByType(type: FilterRuleType): FilterRule[] {
    return Array.from(this.rules.values()).filter(rule => rule.type === type);
  }

  /**
   * Get rules by action
   * @param action - Filter action
   * @returns Array of rules with specified action
   */
  getRulesByAction(action: FilterAction): FilterRule[] {
    return Array.from(this.rules.values()).filter(rule => rule.action === action);
  }

  /**
   * Get enabled rules
   * @returns Array of enabled rules
   */
  getEnabledRules(): FilterRule[] {
    return Array.from(this.rules.values()).filter(rule => rule.enabled);
  }

  /**
   * Get rule by ID
   * @param ruleId - Rule ID
   * @returns Rule or null
   */
  getRule(ruleId: string): FilterRule | null {
    return this.rules.get(ruleId) || null;
  }

  /**
   * Enable a rule
   * @param ruleId - Rule ID
   */
  enableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = true;
      rule.updatedAt = new Date();
      this.logger.log(`Enabled rule: ${rule.name} (${ruleId})`);
    }
  }

  /**
   * Disable a rule
   * @param ruleId - Rule ID
   */
  disableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = false;
      rule.updatedAt = new Date();
      this.logger.log(`Disabled rule: ${rule.name} (${ruleId})`);
    }
  }

  /**
   * Get rule statistics
   * @returns Rule statistics
   */
  getRuleStats(): {
    totalRules: number;
    enabledRules: number;
    disabledRules: number;
    rulesByType: Record<string, number>;
    rulesByAction: Record<string, number>;
  } {
    const allRules = Array.from(this.rules.values());
    const enabledRules = allRules.filter(rule => rule.enabled);
    const disabledRules = allRules.filter(rule => !rule.enabled);

    const rulesByType: Record<string, number> = {};
    const rulesByAction: Record<string, number> = {};

    for (const rule of allRules) {
      rulesByType[rule.type] = (rulesByType[rule.type] || 0) + 1;
      rulesByAction[rule.action] = (rulesByAction[rule.action] || 0) + 1;
    }

    return {
      totalRules: allRules.length,
      enabledRules: enabledRules.length,
      disabledRules: disabledRules.length,
      rulesByType,
      rulesByAction,
    };
  }

  /**
   * Evaluate a single rule
   * @param content - Content to evaluate
   * @param rule - Rule to evaluate
   * @param context - Filter context
   * @returns Rule evaluation result
   */
  private evaluateRule(content: string, rule: FilterRule, context: FilterContext): RuleEvaluationResult {
    const matches: RuleMatch[] = [];
    let confidence = 1.0;

    try {
      switch (rule.type) {
        case FilterRuleType.REGEX:
          const regexMatches = this.evaluateRegexRule(content, rule);
          matches.push(...regexMatches);
          confidence = regexMatches.length > 0 ? 0.9 : 1.0;
          break;

        case FilterRuleType.KEYWORD:
          const keywordMatches = this.evaluateKeywordRule(content, rule);
          matches.push(...keywordMatches);
          confidence = keywordMatches.length > 0 ? 0.8 : 1.0;
          break;

        case FilterRuleType.PHRASE:
          const phraseMatches = this.evaluatePhraseRule(content, rule);
          matches.push(...phraseMatches);
          confidence = phraseMatches.length > 0 ? 0.85 : 1.0;
          break;

        case FilterRuleType.PATTERN:
          const patternMatches = this.evaluatePatternRule(content, rule);
          matches.push(...patternMatches);
          confidence = patternMatches.length > 0 ? 0.9 : 1.0;
          break;

        case FilterRuleType.ML_MODEL:
          const mlMatches = this.evaluateMLRule(content, rule, context);
          matches.push(...mlMatches);
          confidence = mlMatches.length > 0 ? 0.7 : 1.0;
          break;

        case FilterRuleType.EXTERNAL_API:
          const apiMatches = this.evaluateExternalAPIRule(content, rule, context);
          matches.push(...apiMatches);
          confidence = apiMatches.length > 0 ? 0.8 : 1.0;
          break;

        default:
          this.logger.warn(`Unknown rule type: ${rule.type}`);
      }

      return {
        matched: matches.length > 0,
        ruleId: rule.id,
        confidence,
        matches,
        action: rule.action,
      };

    } catch (error) {
      this.logger.error(`Error evaluating rule ${rule.id}:`, error);
      return {
        matched: false,
        ruleId: rule.id,
        confidence: 1.0,
        matches: [],
        action: rule.action,
      };
    }
  }

  /**
   * Evaluate regex rule
   * @param content - Content to evaluate
   * @param rule - Regex rule
   * @returns Array of matches
   */
  private evaluateRegexRule(content: string, rule: FilterRule): RuleMatch[] {
    const matches: RuleMatch[] = [];
    
    try {
      const regex = new RegExp(rule.pattern as string, 'gi');
      let match;
      
      while ((match = regex.exec(content)) !== null) {
        matches.push({
          pattern: rule.pattern as string,
          matchedText: match[0],
          position: {
            start: match.index,
            end: match.index + match[0].length,
          },
          confidence: 0.9,
        });
      }
    } catch (error) {
      this.logger.error(`Error in regex rule ${rule.id}:`, error);
    }

    return matches;
  }

  /**
   * Evaluate keyword rule
   * @param content - Content to evaluate
   * @param rule - Keyword rule
   * @returns Array of matches
   */
  private evaluateKeywordRule(content: string, rule: FilterRule): RuleMatch[] {
    const matches: RuleMatch[] = [];
    const keyword = rule.pattern as string;
    const lowerContent = content.toLowerCase();
    const lowerKeyword = keyword.toLowerCase();
    
    let index = 0;
    while ((index = lowerContent.indexOf(lowerKeyword, index)) !== -1) {
      matches.push({
        pattern: keyword,
        matchedText: content.substring(index, index + keyword.length),
        position: {
          start: index,
          end: index + keyword.length,
        },
        confidence: 0.8,
      });
      index += keyword.length;
    }

    return matches;
  }

  /**
   * Evaluate phrase rule
   * @param content - Content to evaluate
   * @param rule - Phrase rule
   * @returns Array of matches
   */
  private evaluatePhraseRule(content: string, rule: FilterRule): RuleMatch[] {
    const matches: RuleMatch[] = [];
    const phrase = rule.pattern as string;
    const lowerContent = content.toLowerCase();
    const lowerPhrase = phrase.toLowerCase();
    
    let index = 0;
    while ((index = lowerContent.indexOf(lowerPhrase, index)) !== -1) {
      matches.push({
        pattern: phrase,
        matchedText: content.substring(index, index + phrase.length),
        position: {
          start: index,
          end: index + phrase.length,
        },
        confidence: 0.85,
      });
      index += phrase.length;
    }

    return matches;
  }

  /**
   * Evaluate pattern rule
   * @param content - Content to evaluate
   * @param rule - Pattern rule
   * @returns Array of matches
   */
  private evaluatePatternRule(content: string, rule: FilterRule): RuleMatch[] {
    const matches: RuleMatch[] = [];
    
    // Predefined patterns
    const patterns: Record<string, RegExp> = {
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
      url: /https?:\/\/[^\s]+/g,
      credit_card: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
      ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
      ip_address: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
      mac_address: /\b([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})\b/g,
    };

    const pattern = patterns[rule.pattern as string];
    if (!pattern) {
      return matches;
    }

    let match;
    while ((match = pattern.exec(content)) !== null) {
      matches.push({
        pattern: rule.pattern as string,
        matchedText: match[0],
        position: {
          start: match.index,
          end: match.index + match[0].length,
        },
        confidence: 0.9,
      });
    }

    return matches;
  }

  /**
   * Evaluate ML model rule
   * @param content - Content to evaluate
   * @param rule - ML rule
   * @param context - Filter context
   * @returns Array of matches
   */
  private evaluateMLRule(content: string, rule: FilterRule, context: FilterContext): RuleMatch[] {
    // Placeholder for ML model evaluation
    // In production, this would integrate with actual ML models
    const matches: RuleMatch[] = [];
    
    // Simple heuristic-based ML simulation
    const mlScore = this.simulateMLScore(content, rule);
    
    if (mlScore > 0.7) {
      matches.push({
        pattern: rule.pattern as string,
        matchedText: content,
        position: {
          start: 0,
          end: content.length,
        },
        confidence: mlScore,
      });
    }

    return matches;
  }

  /**
   * Evaluate external API rule
   * @param content - Content to evaluate
   * @param rule - External API rule
   * @param context - Filter context
   * @returns Array of matches
   */
  private evaluateExternalAPIRule(content: string, rule: FilterRule, context: FilterContext): RuleMatch[] {
    // Placeholder for external API evaluation
    // In production, this would make actual API calls
    const matches: RuleMatch[] = [];
    
    // Simulate external API response
    const apiScore = this.simulateExternalAPI(content, rule);
    
    if (apiScore > 0.8) {
      matches.push({
        pattern: rule.pattern as string,
        matchedText: content,
        position: {
          start: 0,
          end: content.length,
        },
        confidence: apiScore,
      });
    }

    return matches;
  }

  /**
   * Simulate ML model score
   * @param content - Content to evaluate
   * @param rule - ML rule
   * @returns Simulated ML score
   */
  private simulateMLScore(content: string, rule: FilterRule): number {
    // Simple heuristic-based simulation
    const suspiciousWords = ['spam', 'scam', 'fraud', 'hack', 'virus'];
    const lowerContent = content.toLowerCase();
    
    let score = 0;
    for (const word of suspiciousWords) {
      if (lowerContent.includes(word)) {
        score += 0.2;
      }
    }

    // Check for excessive repetition
    const words = content.split(/\s+/);
    const wordCounts = new Map<string, number>();
    
    for (const word of words) {
      if (word.length > 3) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }

    const maxCount = Math.max(...wordCounts.values());
    if (maxCount / words.length > 0.3) {
      score += 0.3;
    }

    return Math.min(1.0, score);
  }

  /**
   * Simulate external API response
   * @param content - Content to evaluate
   * @param rule - External API rule
   * @returns Simulated API score
   */
  private simulateExternalAPI(content: string, rule: FilterRule): number {
    // Simple simulation based on content characteristics
    const urlCount = (content.match(/https?:\/\/[^\s]+/g) || []).length;
    const emailCount = (content.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g) || []).length;
    
    let score = 0;
    
    if (urlCount > 2) score += 0.3;
    if (emailCount > 1) score += 0.2;
    if (content.length > 1000) score += 0.1;
    if (content.includes('click here') || content.includes('free money')) score += 0.4;

    return Math.min(1.0, score);
  }

  /**
   * Get applicable rules for context
   * @param context - Filter context
   * @returns Array of applicable rules
   */
  private getApplicableRules(context: FilterContext): FilterRule[] {
    const applicableRules: FilterRule[] = [];

    for (const rule of this.rules.values()) {
      if (rule.enabled) {
        // Check if rule applies to user role
        if (this.ruleAppliesToUser(rule, context)) {
          applicableRules.push(rule);
        }
      }
    }

    return applicableRules;
  }

  /**
   * Check if rule applies to user
   * @param rule - Rule to check
   * @param context - Filter context
   * @returns true if rule applies
   */
  private ruleAppliesToUser(rule: FilterRule, context: FilterContext): boolean {
    // In production, this would check user roles, permissions, etc.
    // For now, all rules apply to all users
    return true;
  }

  /**
   * Compile rule for better performance
   * @param rule - Rule to compile
   */
  private compileRule(rule: FilterRule): void {
    try {
      let compiled: any = null;

      switch (rule.type) {
        case FilterRuleType.REGEX:
          compiled = new RegExp(rule.pattern as string, 'gi');
          break;
        case FilterRuleType.KEYWORD:
        case FilterRuleType.PHRASE:
          compiled = (rule.pattern as string).toLowerCase();
          break;
        case FilterRuleType.PATTERN:
          compiled = rule.pattern as string;
          break;
        default:
          compiled = rule.pattern;
      }

      this.ruleCache.set(rule.id, { rule, compiled });
    } catch (error) {
      this.logger.error(`Error compiling rule ${rule.id}:`, error);
    }
  }

  /**
   * Initialize default rules
   */
  private initializeDefaultRules(): void {
    const defaultRules: FilterRule[] = [
      {
        id: 'block-malicious-scripts',
        name: 'Block Malicious Scripts',
        description: 'Block content containing potentially malicious script tags',
        type: FilterRuleType.REGEX,
        pattern: '<script[^>]*>.*?(?:eval|document\.write|innerHTML|outerHTML).*?</script>',
        action: FilterAction.BLOCK,
        severity: ModerationSeverity.CRITICAL,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
      },
      {
        id: 'block-javascript-urls',
        name: 'Block JavaScript URLs',
        description: 'Block javascript: URLs that could execute code',
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
        id: 'filter-personal-info',
        name: 'Filter Personal Information',
        description: 'Replace personal information with placeholders',
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
        id: 'detect-spam-patterns',
        name: 'Detect Spam Patterns',
        description: 'Detect common spam patterns using ML',
        type: FilterRuleType.ML_MODEL,
        pattern: 'spam-detection',
        action: FilterAction.FLAG,
        severity: ModerationSeverity.MEDIUM,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
      },
    ];

    for (const rule of defaultRules) {
      this.addRule(rule);
    }

    this.logger.log(`Initialized ${defaultRules.length} default filter rules`);
  }
}
