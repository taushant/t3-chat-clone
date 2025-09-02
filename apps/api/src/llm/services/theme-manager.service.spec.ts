import { Test, TestingModule } from '@nestjs/testing';
import { ThemeManagerService } from './theme-manager.service';
import { Theme } from '../types/markdown.types';

describe('ThemeManagerService', () => {
  let service: ThemeManagerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ThemeManagerService],
    }).compile();

    service = module.get<ThemeManagerService>(ThemeManagerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('loadTheme', () => {
    it('should load a theme by name', () => {
      const themeName = 'default';
      const theme = service.loadTheme(themeName);

      expect(theme).toBeDefined();
      expect(theme.name).toBe(themeName);
      expect(theme.css).toBeDefined();
    });
  });

  describe('getDefaultTheme', () => {
    it('should return the default theme', () => {
      const defaultTheme = service.getDefaultTheme();
      expect(defaultTheme).toBeDefined();
      expect(defaultTheme.name).toBeDefined();
      expect(defaultTheme.css).toBeDefined();
    });
  });

  describe('getAvailableThemes', () => {
    it('should return list of available themes', () => {
      const themes = service.getAvailableThemes();
      expect(themes).toBeDefined();
      expect(themes.length).toBeGreaterThan(0);
    });
  });

  describe('validateTheme', () => {
    it('should validate if theme exists', () => {
      const validTheme = 'default';
      const invalidTheme = 'nonexistent';

      const validResult = service.isThemeAvailable(validTheme);
      const invalidResult = service.isThemeAvailable(invalidTheme);

      expect(validResult).toBe(true);
      expect(invalidResult).toBe(false);
    });
  });

  describe('getThemeStyles', () => {
    it('should return theme styles', () => {
      const themeName = 'default';
      const theme = service.loadTheme(themeName);
      const styles = service.getThemeCSS(themeName);

      expect(styles).toBeDefined();
      expect(typeof styles).toBe('string');
    });
  });
});
