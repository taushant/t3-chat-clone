import { Test, TestingModule } from '@nestjs/testing';
import { FilterRuleEngineService } from './filter-rule-engine.service';
import { FilterRule, FilterContext, RuleEvaluationResult } from '../types/content-moderation.types';

describe('FilterRuleEngineService', () => {
  let service: FilterRuleEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FilterRuleEngineService],
    }).compile();

    service = module.get<FilterRuleEngineService>(FilterRuleEngineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('evaluateRules', () => {
    it('should evaluate rules against content', () => {
      const content = 'This is a test message.';
      const context: FilterContext = {
        userId: 'user123',
        sessionId: 'session456',
        contentType: 'text' as any,
        userRole: 'user',
      };
      const result = service.evaluateRules(content, context);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('addRule', () => {
    it('should add a new filter rule', () => {
      const rule: FilterRule = {
        id: 'rule123',
        name: 'Test Rule',
        description: 'Test rule description',
        type: 'keyword' as any,
        pattern: 'test',
        action: 'block' as any,
        enabled: true,
        severity: 'high' as any,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test-user',
      };

      service.addRule(rule);
      const rules = service.getAllRules();
      expect(rules).toContain(rule);
    });
  });

  describe('updateRule', () => {
    it('should update an existing rule', () => {
      const rule: FilterRule = {
        id: 'rule123',
        name: 'Test Rule',
        description: 'Test rule description',
        type: 'keyword' as any,
        pattern: 'test',
        action: 'block' as any,
        enabled: true,
        severity: 'high' as any,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test-user',
      };

      service.addRule(rule);
      const updatedRule = { ...rule, name: 'Updated Rule' };
      service.updateRule(rule.id, updatedRule);

      const rules = service.getAllRules();
      const updated = rules.find((r: any) => r.id === rule.id);
      expect(updated?.name).toBe('Updated Rule');
    });
  });

  describe('removeRule', () => {
    it('should remove a rule', () => {
      const rule: FilterRule = {
        id: 'rule123',
        name: 'Test Rule',
        description: 'Test rule description',
        type: 'keyword' as any,
        pattern: 'test',
        action: 'block' as any,
        enabled: true,
        severity: 'high' as any,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test-user',
      };

      service.addRule(rule);
      service.removeRule(rule.id);

      const rules = service.getAllRules();
      expect(rules).not.toContain(rule);
    });
  });

  describe('getActiveRules', () => {
    it('should return list of active rules', () => {
      const rules = service.getAllRules();
      expect(rules).toBeDefined();
      expect(Array.isArray(rules)).toBe(true);
    });
  });
});
