import { Test, TestingModule } from '@nestjs/testing';
import { CodeBlockProcessorService } from './code-block-processor.service';
import { CodeBlock } from '../types/markdown.types';

describe('CodeBlockProcessorService', () => {
  let service: CodeBlockProcessorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CodeBlockProcessorService],
    }).compile();

    service = module.get<CodeBlockProcessorService>(CodeBlockProcessorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processCodeBlock', () => {
    it('should process a code block', () => {
      const codeBlock: CodeBlock = {
        id: 'block1',
        language: 'javascript',
        code: 'console.log("Hello World");',
        startIndex: 0,
        endIndex: 30,
        lineCount: 1,
        characterCount: 30,
        metadata: {
          language: 'javascript',
          hasErrors: false,
          keywords: [],
          lineCount: 1,
          characterCount: 10,
        },
      };

      const processed = service.process(codeBlock);
      expect(processed).toBeDefined();
      expect(processed.language).toBe('javascript');
      expect(processed.code).toBe(codeBlock.code);
      expect(processed.metadata).toBeDefined();
    });
  });

  describe('detectLanguage', () => {
    it('should detect language from code content', () => {
      const javascriptCode = 'console.log("Hello");';
      const pythonCode = 'print("Hello")';
      const htmlCode = '<div>Hello</div>';

      const jsLang = service.identifyLanguage(javascriptCode);
      const pyLang = service.identifyLanguage(pythonCode);
      const htmlLang = service.identifyLanguage(htmlCode);

      expect(jsLang).toBe('javascript');
      expect(pyLang).toBe('python');
      expect(htmlLang).toBe('html');
    });
  });

  describe('validateCodeBlock', () => {
    it('should validate code block structure', () => {
      const validBlock: CodeBlock = {
        id: 'block1',
        language: 'javascript',
        code: 'console.log("Hello");',
        startIndex: 0,
        endIndex: 30,
        lineCount: 1,
        characterCount: 30,
        metadata: {
          language: 'javascript',
          hasErrors: false,
          keywords: [],
          lineCount: 1,
          characterCount: 10,
        },
      };

      const invalidBlock: CodeBlock = {
        id: 'block2',
        language: '',
        code: '',
        startIndex: 0,
        endIndex: 0,
        lineCount: 0,
        characterCount: 0,
        metadata: {
          language: '',
          hasErrors: true,
          keywords: [],
          lineCount: 0,
          characterCount: 0,
        },
      };

      const validResult = service.validateCodeBlock(validBlock);
      const invalidResult = service.validateCodeBlock(invalidBlock);

      expect(validResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);
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
});
