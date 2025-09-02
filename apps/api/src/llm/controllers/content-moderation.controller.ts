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
import { ContentModerationService } from '../services/content-moderation.service';
import { ContentFilterService } from '../services/content-filter.service';
import { FilterRuleEngineService } from '../services/filter-rule-engine.service';
import { 
  ContentType,
  ModerationContext,
  FilterContext,
  FilterRule,
  ModerationAction,
} from '../types/content-moderation.types';

/**
 * Content Moderation Controller
 * Provides API endpoints for content moderation and filtering
 */
@ApiTags('LLM Content Moderation')
@Controller('llm/moderation')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ContentModerationController {
  private readonly logger = new Logger(ContentModerationController.name);

  constructor(
    private readonly moderationService: ContentModerationService,
    private readonly filterService: ContentFilterService,
    private readonly ruleEngine: FilterRuleEngineService,
  ) {}

  @Post('moderate')
  @ApiOperation({
    summary: 'Moderate content',
    description: 'Moderate content for inappropriate, harmful, or policy-violating material',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Content moderation completed',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid content or parameters',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async moderateContent(
    @Body() body: { 
      content: string; 
      type?: ContentType; 
      sessionId?: string;
      customRules?: FilterRule[];
    },
    @Request() req: AuthenticatedRequest,
  ) {
    try {
      this.logger.log(`Moderating content for user ${req.user.id}`);

      const { content, type = ContentType.TEXT, sessionId, customRules } = body;

      if (!content || typeof content !== 'string') {
        throw new HttpException('Content is required and must be a string', HttpStatus.BAD_REQUEST);
      }

      const context: ModerationContext = {
        userId: req.user.id,
        sessionId,
        contentType: type,
        customRules,
      };

      const result = await this.moderationService.moderateContent(content, type, context);

      return {
        success: true,
        data: result,
        metadata: {
          userId: req.user.id,
          moderatedAt: new Date().toISOString(),
          contentLength: content.length,
          contentType: type,
          sessionId,
        },
      };
    } catch (error) {
      this.logger.error(`Content moderation failed for user ${req.user.id}:`, error);
      throw new HttpException(
        error instanceof Error ? error.message : 'Content moderation failed',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('moderate-streaming')
  @ApiOperation({
    summary: 'Moderate streaming content',
    description: 'Moderate streaming content chunks in real-time',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Streaming content moderation completed',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid content or parameters',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async moderateStreamingContent(
    @Body() body: { 
      chunk: string; 
      sessionId?: string;
      customRules?: FilterRule[];
    },
    @Request() req: AuthenticatedRequest,
  ) {
    try {
      this.logger.log(`Moderating streaming content for user ${req.user.id}`);

      const { chunk, sessionId, customRules } = body;

      if (!chunk || typeof chunk !== 'string') {
        throw new HttpException('Chunk is required and must be a string', HttpStatus.BAD_REQUEST);
      }

      const context: ModerationContext = {
        userId: req.user.id,
        sessionId,
        contentType: ContentType.TEXT,
        customRules,
      };

      const result = await this.moderationService.moderateStreamingContent(chunk, context);

      return {
        success: true,
        data: result,
        metadata: {
          userId: req.user.id,
          moderatedAt: new Date().toISOString(),
          chunkLength: chunk.length,
          sessionId,
        },
      };
    } catch (error) {
      this.logger.error(`Streaming content moderation failed for user ${req.user.id}:`, error);
      throw new HttpException(
        error instanceof Error ? error.message : 'Streaming content moderation failed',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('filter')
  @ApiOperation({
    summary: 'Filter content',
    description: 'Filter content using configurable rules and patterns',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Content filtering completed',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid content or parameters',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async filterContent(
    @Body() body: { 
      content: string; 
      type?: ContentType; 
      sessionId?: string;
      customRules?: FilterRule[];
    },
    @Request() req: AuthenticatedRequest,
  ) {
    try {
      this.logger.log(`Filtering content for user ${req.user.id}`);

      const { content, type = ContentType.TEXT, sessionId, customRules } = body;

      if (!content || typeof content !== 'string') {
        throw new HttpException('Content is required and must be a string', HttpStatus.BAD_REQUEST);
      }

      const context: FilterContext = {
        userId: req.user.id,
        contentType: type,
        userRole: req.user.role || 'user',
        sessionId,
        customRules,
      };

      const result = await this.filterService.filterContent(content, context);

      return {
        success: true,
        data: result,
        metadata: {
          userId: req.user.id,
          filteredAt: new Date().toISOString(),
          contentLength: content.length,
          contentType: type,
          sessionId,
        },
      };
    } catch (error) {
      this.logger.error(`Content filtering failed for user ${req.user.id}:`, error);
      throw new HttpException(
        error instanceof Error ? error.message : 'Content filtering failed',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('filter-streaming')
  @ApiOperation({
    summary: 'Filter streaming content',
    description: 'Filter streaming content chunks in real-time',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Streaming content filtering completed',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid content or parameters',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async filterStreamingContent(
    @Body() body: { 
      chunk: string; 
      sessionId?: string;
      customRules?: FilterRule[];
    },
    @Request() req: AuthenticatedRequest,
  ) {
    try {
      this.logger.log(`Filtering streaming content for user ${req.user.id}`);

      const { chunk, sessionId, customRules } = body;

      if (!chunk || typeof chunk !== 'string') {
        throw new HttpException('Chunk is required and must be a string', HttpStatus.BAD_REQUEST);
      }

      const context: FilterContext = {
        userId: req.user.id,
        contentType: ContentType.TEXT,
        userRole: req.user.role || 'user',
        sessionId,
        customRules,
      };

      const result = await this.filterService.filterStreamingContent(chunk, context);

      return {
        success: true,
        data: result,
        metadata: {
          userId: req.user.id,
          filteredAt: new Date().toISOString(),
          chunkLength: chunk.length,
          sessionId,
        },
      };
    } catch (error) {
      this.logger.error(`Streaming content filtering failed for user ${req.user.id}:`, error);
      throw new HttpException(
        error instanceof Error ? error.message : 'Streaming content filtering failed',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('history')
  @ApiOperation({
    summary: 'Get moderation history',
    description: 'Get moderation history for the authenticated user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Moderation history retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getModerationHistory(@Request() req: AuthenticatedRequest) {
    try {
      this.logger.log(`Getting moderation history for user ${req.user.id}`);

      const history = this.moderationService.getModerationHistory(req.user.id);

      return {
        success: true,
        data: history,
        metadata: {
          userId: req.user.id,
          retrievedAt: new Date().toISOString(),
          recordCount: history.length,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get moderation history for user ${req.user.id}:`, error);
      throw new HttpException(
        error instanceof Error ? error.message : 'Failed to get moderation history',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get moderation statistics',
    description: 'Get moderation statistics for the system or user',
  })
  @ApiQuery({ name: 'timeRange', required: false, description: 'Time range for statistics (JSON string with start and end dates)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Moderation statistics retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getModerationStats(
    @Request() req: AuthenticatedRequest,
    @Query('timeRange') timeRange?: string,
  ) {
    try {
      this.logger.log(`Getting moderation stats for user ${req.user.id}`);

      let parsedTimeRange: { start: Date; end: Date } | undefined;
      if (timeRange) {
        try {
          parsedTimeRange = JSON.parse(timeRange);
          parsedTimeRange!.start = new Date(parsedTimeRange!.start);
          parsedTimeRange!.end = new Date(parsedTimeRange!.end);
        } catch (error) {
          throw new HttpException('Invalid timeRange format', HttpStatus.BAD_REQUEST);
        }
      }

      const stats = this.moderationService.getModerationStats(parsedTimeRange);

      return {
        success: true,
        data: stats,
        metadata: {
          userId: req.user.id,
          retrievedAt: new Date().toISOString(),
          timeRange: parsedTimeRange,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get moderation stats for user ${req.user.id}:`, error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error instanceof Error ? error.message : 'Failed to get moderation stats',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('report')
  @ApiOperation({
    summary: 'Generate moderation report',
    description: 'Generate a comprehensive moderation report',
  })
  @ApiQuery({ name: 'timeRange', required: false, description: 'Time range for report (JSON string with start and end dates)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Moderation report generated successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async generateModerationReport(
    @Request() req: AuthenticatedRequest,
    @Query('timeRange') timeRange?: string,
  ) {
    try {
      this.logger.log(`Generating moderation report for user ${req.user.id}`);

      let parsedTimeRange: { start: Date; end: Date } | undefined;
      if (timeRange) {
        try {
          parsedTimeRange = JSON.parse(timeRange);
          parsedTimeRange!.start = new Date(parsedTimeRange!.start);
          parsedTimeRange!.end = new Date(parsedTimeRange!.end);
        } catch (error) {
          throw new HttpException('Invalid timeRange format', HttpStatus.BAD_REQUEST);
        }
      }

      const report = this.moderationService.generateModerationReport(req.user.id, parsedTimeRange);

      return {
        success: true,
        data: report,
        metadata: {
          userId: req.user.id,
          generatedAt: new Date().toISOString(),
          timeRange: parsedTimeRange,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to generate moderation report for user ${req.user.id}:`, error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error instanceof Error ? error.message : 'Failed to generate moderation report',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('rules')
  @ApiOperation({
    summary: 'Get filter rules',
    description: 'Get all available filter rules',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Filter rules retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getFilterRules(@Request() req: AuthenticatedRequest) {
    try {
      this.logger.log(`Getting filter rules for user ${req.user.id}`);

      const rules = this.ruleEngine.getAllRules();
      const stats = this.ruleEngine.getRuleStats();

      return {
        success: true,
        data: {
          rules,
          stats,
        },
        metadata: {
          userId: req.user.id,
          retrievedAt: new Date().toISOString(),
          ruleCount: rules.length,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get filter rules for user ${req.user.id}:`, error);
      throw new HttpException(
        error instanceof Error ? error.message : 'Failed to get filter rules',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('rules')
  @ApiOperation({
    summary: 'Add filter rule',
    description: 'Add a new filter rule',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Filter rule added successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid rule data',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async addFilterRule(
    @Body() rule: FilterRule,
    @Request() req: AuthenticatedRequest,
  ) {
    try {
      this.logger.log(`Adding filter rule for user ${req.user.id}: ${rule.name}`);

      // Validate rule
      if (!rule.name || !rule.pattern || !rule.type || !rule.action) {
        throw new HttpException('Invalid rule data: name, pattern, type, and action are required', HttpStatus.BAD_REQUEST);
      }

      // Set rule metadata
      rule.id = rule.id || `rule_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      rule.createdBy = req.user.id;
      rule.createdAt = new Date();
      rule.updatedAt = new Date();
      rule.enabled = rule.enabled !== undefined ? rule.enabled : true;

      this.ruleEngine.addRule(rule);

      return {
        success: true,
        data: rule,
        metadata: {
          userId: req.user.id,
          addedAt: new Date().toISOString(),
          ruleId: rule.id,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to add filter rule for user ${req.user.id}:`, error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error instanceof Error ? error.message : 'Failed to add filter rule',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('rules/:ruleId/toggle')
  @ApiOperation({
    summary: 'Toggle filter rule',
    description: 'Enable or disable a filter rule',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Filter rule toggled successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Filter rule not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async toggleFilterRule(
    @Query('ruleId') ruleId: string,
    @Body() body: { enabled: boolean },
    @Request() req: AuthenticatedRequest,
  ) {
    try {
      this.logger.log(`Toggling filter rule ${ruleId} for user ${req.user.id}`);

      if (!ruleId) {
        throw new HttpException('Rule ID is required', HttpStatus.BAD_REQUEST);
      }

      const rule = this.ruleEngine.getRule(ruleId);
      if (!rule) {
        throw new HttpException(`Rule ${ruleId} not found`, HttpStatus.NOT_FOUND);
      }

      if (body.enabled) {
        this.ruleEngine.enableRule(ruleId);
      } else {
        this.ruleEngine.disableRule(ruleId);
      }

      return {
        success: true,
        data: {
          ruleId,
          enabled: body.enabled,
        },
        metadata: {
          userId: req.user.id,
          toggledAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to toggle filter rule for user ${req.user.id}:`, error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error instanceof Error ? error.message : 'Failed to toggle filter rule',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
