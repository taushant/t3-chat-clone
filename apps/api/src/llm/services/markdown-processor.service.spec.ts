import { Test, TestingModule } from '@nestjs/testing';
import { MarkdownProcessorService } from './markdown-processor.service';
import { ParsedMarkdown } from '../types/markdown.types';

describe('MarkdownProcessorService', () => {
  let service: MarkdownProcessorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MarkdownProcessorService],
    }).compile();

    service = module.get<MarkdownProcessorService>(MarkdownProcessorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('parseMarkdown', () => {
    it('should parse markdown content', () => {
      const content = '# Hello World\n\nThis is a **bold** text.';
      const parsed = service.parseMarkdown(content);

      expect(parsed).toBeDefined();
      expect(parsed.content).toBe(content);
      expect(parsed.blocks).toBeDefined();
      expect(parsed.metadata).toBeDefined();
    });
  });

  describe('renderToHtml', () => {
    it('should render parsed markdown to HTML', () => {
      const content = '# Hello World\n\nThis is a **bold** text.';
      const parsed = service.parseMarkdown(content);
      const html = service.renderToHtml(parsed);

      expect(html).toBeDefined();
      expect(html).toContain('<h1>Hello World</h1>');
      expect(html).toContain('<strong>bold</strong>');
    });
  });

  describe('extractCodeBlocks', () => {
    it('should extract code blocks from markdown', () => {
      const content = '```javascript\nconsole.log("Hello");\n```';
      const parsed = service.parseMarkdown(content);
      const codeBlocks = service.extractCodeBlocks(content);

      expect(codeBlocks).toBeDefined();
      expect(codeBlocks.length).toBeGreaterThan(0);
      expect(codeBlocks[0].language).toBe('javascript');
      expect(codeBlocks[0].code).toContain('console.log');
    });
  });

  describe('validateMarkdown', () => {
    it('should validate markdown content', () => {
      const validContent = '# Valid Markdown\n\nThis is valid.';
      const invalidContent = 'Invalid markdown with unclosed **bold';

      const validResult = service.validateMarkdown(validContent);
      const invalidResult = service.validateMarkdown(invalidContent);

      expect(validResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);
    });
  });
});
