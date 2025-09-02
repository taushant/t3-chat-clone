import { Test, TestingModule } from '@nestjs/testing';
import { SyntaxHighlighterService } from './syntax-highlighter.service';
import { HighlightedCode } from '../types/markdown.types';

describe('SyntaxHighlighterService', () => {
  let service: SyntaxHighlighterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SyntaxHighlighterService],
    }).compile();

    service = module.get<SyntaxHighlighterService>(SyntaxHighlighterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('highlightCode', () => {
    it('should highlight code with syntax highlighting', () => {
      const code = 'console.log("Hello World");';
      const language = 'javascript';
      const theme = 'default';

      const highlighted = service.highlightCode(code, language, theme);
      expect(highlighted).toBeDefined();
      expect(highlighted.content).toBe(code);
      expect(highlighted.language).toBe(language);
      expect(highlighted.theme).toBe(theme);
      expect(highlighted.html).toBeDefined();
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return list of supported languages', () => {
      const languages = service.getSupportedLanguages();
      expect(languages).toBeDefined();
      expect(languages.length).toBeGreaterThan(0);
      expect(languages).toContain('javascript');
      expect(languages).toContain('python');
    });
  });

  describe('getAvailableThemes', () => {
    it('should return list of available themes', () => {
      const themes = service.getAvailableThemes();
      expect(themes).toBeDefined();
      expect(themes.length).toBeGreaterThan(0);
      expect(themes).toContain('default');
    });
  });

  describe('validateLanguage', () => {
    it('should validate if language is supported', () => {
      const validLanguage = 'javascript';
      const invalidLanguage = 'unsupported';

      const validResult = service.validateLanguage(validLanguage);
      const invalidResult = service.validateLanguage(invalidLanguage);

      expect(validResult).toBe(true);
      expect(invalidResult).toBe(false);
    });
  });

  describe('validateTheme', () => {
    it('should validate if theme is available', () => {
      const validTheme = 'default';
      const invalidTheme = 'nonexistent';

      const validResult = service.isThemeSupported(validTheme);
      const invalidResult = service.isThemeSupported(invalidTheme);

      expect(validResult).toBe(true);
      expect(invalidResult).toBe(false);
    });
  });
});
