import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../auth/interfaces/authenticated-request.interface';
import { MarkdownProcessorService } from '../services/markdown-processor.service';
import { CodeBlockProcessorService } from '../services/code-block-processor.service';
import { SyntaxHighlighterService } from '../services/syntax-highlighter.service';
import { ThemeManagerService } from '../services/theme-manager.service';
import { 
  MarkdownProcessingOptions,
  MarkdownRenderOptions,
  ValidationResult,
  Theme,
  LanguageInfo,
} from '../types/markdown.types';

/**
 * Markdown Processor Controller
 * Provides API endpoints for markdown processing and syntax highlighting
 */
@ApiTags('LLM Markdown Processing')
@Controller('llm/markdown')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MarkdownProcessorController {
  private readonly logger = new Logger(MarkdownProcessorController.name);

  constructor(
    private readonly markdownProcessor: MarkdownProcessorService,
    private readonly codeBlockProcessor: CodeBlockProcessorService,
    private readonly syntaxHighlighter: SyntaxHighlighterService,
    private readonly themeManager: ThemeManagerService,
  ) {}

  @Post('parse')
  @ApiOperation({
    summary: 'Parse markdown content',
    description: 'Parse markdown content into structured format with metadata',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Markdown parsed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid markdown content',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async parseMarkdown(
    @Body() body: { content: string; options?: Partial<MarkdownProcessingOptions> },
    @Request() req: AuthenticatedRequest,
  ) {
    try {
      this.logger.log(`Parsing markdown for user ${req.user.id}`);

      const { content, options = {} } = body;

      if (!content || typeof content !== 'string') {
        throw new HttpException('Content is required and must be a string', HttpStatus.BAD_REQUEST);
      }

      const parsed = this.markdownProcessor.parseMarkdown(content, options);

      return {
        success: true,
        data: parsed,
        metadata: {
          userId: req.user.id,
          processedAt: new Date().toISOString(),
          contentLength: content.length,
          blockCount: parsed.blocks.length,
        },
      };
    } catch (error) {
      this.logger.error(`Markdown parsing failed for user ${req.user.id}:`, error);
      throw new HttpException(
        error instanceof Error ? error.message : 'Markdown parsing failed',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('render')
  @ApiOperation({
    summary: 'Render markdown to HTML',
    description: 'Convert markdown content to HTML with syntax highlighting',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Markdown rendered successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid markdown content',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async renderMarkdown(
    @Body() body: { content: string; options?: Partial<MarkdownRenderOptions> },
    @Request() req: AuthenticatedRequest,
  ) {
    try {
      this.logger.log(`Rendering markdown for user ${req.user.id}`);

      const { content, options = {} } = body;

      if (!content || typeof content !== 'string') {
        throw new HttpException('Content is required and must be a string', HttpStatus.BAD_REQUEST);
      }

      // Parse markdown
      const parsed = this.markdownProcessor.parseMarkdown(content, {
        enableSyntaxHighlighting: true,
        enableTableOfContents: true,
        enableSecurityValidation: true,
        theme: options.theme || 'default',
      });

      // Render to HTML
      const html = this.markdownProcessor.renderToHtml(parsed, options);

      // Get theme CSS
      const theme = this.themeManager.loadTheme(options.theme || 'default');
      const css = this.themeManager.getThemeCSS(theme);

      return {
        success: true,
        data: {
          html: this.markdownProcessor.sanitizeHtml(html),
          css,
          theme: theme.name,
          metadata: parsed.metadata,
          toc: parsed.toc,
        },
        metadata: {
          userId: req.user.id,
          renderedAt: new Date().toISOString(),
          contentLength: content.length,
          blockCount: parsed.blocks.length,
        },
      };
    } catch (error) {
      this.logger.error(`Markdown rendering failed for user ${req.user.id}:`, error);
      throw new HttpException(
        error instanceof Error ? error.message : 'Markdown rendering failed',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('validate')
  @ApiOperation({
    summary: 'Validate markdown content',
    description: 'Validate markdown content for security threats and errors',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Markdown validation completed',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid markdown content',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async validateMarkdown(
    @Body() body: { content: string },
    @Request() req: AuthenticatedRequest,
  ): Promise<{ success: boolean; data: ValidationResult; metadata: any }> {
    try {
      this.logger.log(`Validating markdown for user ${req.user.id}`);

      const { content } = body;

      if (!content || typeof content !== 'string') {
        throw new HttpException('Content is required and must be a string', HttpStatus.BAD_REQUEST);
      }

      const validation = this.markdownProcessor.validateMarkdown(content);

      return {
        success: true,
        data: validation,
        metadata: {
          userId: req.user.id,
          validatedAt: new Date().toISOString(),
          contentLength: content.length,
          hasErrors: validation.errors.length > 0,
          hasWarnings: validation.warnings.length > 0,
          hasSecurityThreats: validation.securityThreats.length > 0,
        },
      };
    } catch (error) {
      this.logger.error(`Markdown validation failed for user ${req.user.id}:`, error);
      throw new HttpException(
        error instanceof Error ? error.message : 'Markdown validation failed',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('highlight')
  @ApiOperation({
    summary: 'Highlight code syntax',
    description: 'Apply syntax highlighting to code content',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Code highlighted successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid code content',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async highlightCode(
    @Body() body: { code: string; language: string; theme?: string },
    @Request() req: AuthenticatedRequest,
  ) {
    try {
      this.logger.log(`Highlighting code for user ${req.user.id}, language: ${body.language}`);

      const { code, language, theme = 'default' } = body;

      if (!code || typeof code !== 'string') {
        throw new HttpException('Code is required and must be a string', HttpStatus.BAD_REQUEST);
      }

      if (!language || typeof language !== 'string') {
        throw new HttpException('Language is required and must be a string', HttpStatus.BAD_REQUEST);
      }

      const highlighted = this.syntaxHighlighter.highlightCode(code, language, theme);

      return {
        success: true,
        data: highlighted,
        metadata: {
          userId: req.user.id,
          highlightedAt: new Date().toISOString(),
          codeLength: code.length,
          language,
          theme,
          isSupported: this.syntaxHighlighter.validateLanguage(language),
        },
      };
    } catch (error) {
      this.logger.error(`Code highlighting failed for user ${req.user.id}:`, error);
      throw new HttpException(
        error instanceof Error ? error.message : 'Code highlighting failed',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('themes')
  @ApiOperation({
    summary: 'Get available themes',
    description: 'Get list of available themes for syntax highlighting',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Themes retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getThemes(@Request() req: AuthenticatedRequest) {
    try {
      this.logger.log(`Getting themes for user ${req.user.id}`);

      const themes = this.themeManager.getAllThemes();

      return {
        success: true,
        data: themes.map(theme => ({
          name: theme.name,
          displayName: theme.displayName,
          description: theme.description,
          isDark: theme.isDark,
        })),
        metadata: {
          userId: req.user.id,
          retrievedAt: new Date().toISOString(),
          themeCount: themes.length,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get themes for user ${req.user.id}:`, error);
      throw new HttpException(
        error instanceof Error ? error.message : 'Failed to get themes',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('themes/:themeName')
  @ApiOperation({
    summary: 'Get theme details',
    description: 'Get detailed information about a specific theme',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Theme details retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Theme not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getTheme(
    @Query('themeName') themeName: string,
    @Request() req: AuthenticatedRequest,
  ) {
    try {
      this.logger.log(`Getting theme details for user ${req.user.id}, theme: ${themeName}`);

      if (!themeName) {
        throw new HttpException('Theme name is required', HttpStatus.BAD_REQUEST);
      }

      const theme = this.themeManager.getTheme(themeName);
      if (!theme) {
        throw new HttpException(`Theme '${themeName}' not found`, HttpStatus.NOT_FOUND);
      }

      const css = this.themeManager.getThemeCSS(theme);

      return {
        success: true,
        data: {
          ...theme,
          css,
        },
        metadata: {
          userId: req.user.id,
          retrievedAt: new Date().toISOString(),
          themeName,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get theme details for user ${req.user.id}:`, error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error instanceof Error ? error.message : 'Failed to get theme details',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('languages')
  @ApiOperation({
    summary: 'Get supported languages',
    description: 'Get list of supported programming languages for syntax highlighting',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Languages retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getSupportedLanguages(@Request() req: AuthenticatedRequest) {
    try {
      this.logger.log(`Getting supported languages for user ${req.user.id}`);

      const languages = this.codeBlockProcessor.getSupportedLanguages();
      const syntaxLanguages = this.syntaxHighlighter.getSupportedLanguages();

      return {
        success: true,
        data: {
          codeBlockLanguages: languages,
          syntaxHighlightingLanguages: syntaxLanguages,
          allLanguages: [...new Set([...languages.map(l => l.name), ...syntaxLanguages])],
        },
        metadata: {
          userId: req.user.id,
          retrievedAt: new Date().toISOString(),
          codeBlockLanguageCount: languages.length,
          syntaxLanguageCount: syntaxLanguages.length,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get supported languages for user ${req.user.id}:`, error);
      throw new HttpException(
        error instanceof Error ? error.message : 'Failed to get supported languages',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get processing statistics',
    description: 'Get statistics about markdown processing and syntax highlighting',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getProcessingStats(@Request() req: AuthenticatedRequest) {
    try {
      this.logger.log(`Getting processing stats for user ${req.user.id}`);

      const markdownStats = this.markdownProcessor.getProcessingStats();
      const highlightingStats = this.syntaxHighlighter.getHighlightingStats();

      return {
        success: true,
        data: {
          markdown: markdownStats,
          syntaxHighlighting: highlightingStats,
          themes: {
            available: this.themeManager.getAvailableThemes(),
            count: this.themeManager.getThemeCount(),
          },
        },
        metadata: {
          userId: req.user.id,
          retrievedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get processing stats for user ${req.user.id}:`, error);
      throw new HttpException(
        error instanceof Error ? error.message : 'Failed to get processing stats',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

