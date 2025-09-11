import {
  Controller,
  Get,
  Post,
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
import { PerformanceMonitorService, PerformanceStats, PerformanceMetrics } from '../services/performance-monitor.service';
import { PerformanceOptimizerService, OptimizationResult } from '../services/performance-optimizer.service';

@ApiTags('LLM Performance Monitoring')
@Controller('llm/performance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PerformanceMonitorController {
  private readonly logger = new Logger(PerformanceMonitorController.name);

  constructor(
    private readonly performanceMonitor: PerformanceMonitorService,
    private readonly performanceOptimizer: PerformanceOptimizerService,
  ) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Get performance statistics',
    description: 'Get current performance statistics for the LLM system',
  })
  @ApiQuery({
    name: 'timeWindow',
    required: false,
    description: 'Time window in minutes (default: 60)',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Performance statistics retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getPerformanceStats(
    @Query('timeWindow') timeWindow: number = 60,
    @Request() req: AuthenticatedRequest,
  ) {
    try {
      this.logger.log(`Getting performance stats for user ${req.user.id}, timeWindow: ${timeWindow} minutes`);
      
      const stats = this.performanceMonitor.getPerformanceStats(timeWindow);
      
      return {
        success: true,
        data: stats,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to get performance stats: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}`);
      throw new HttpException(
        'Failed to retrieve performance statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('health')
  @ApiOperation({
    summary: 'Get system health status',
    description: 'Get current system health status and any issues',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'System health status retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getSystemHealth(@Request() req: AuthenticatedRequest) {
    try {
      this.logger.log(`Getting system health for user ${req.user.id}`);
      
      const health = this.performanceMonitor.getSystemHealth();
      
      return {
        success: true,
        data: health,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to get system health: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}`);
      throw new HttpException(
        'Failed to retrieve system health',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('metrics')
  @ApiOperation({
    summary: 'Get performance metrics',
    description: 'Get performance metrics for a specific time range',
  })
  @ApiQuery({
    name: 'startTime',
    required: true,
    description: 'Start time (ISO string)',
    type: String,
  })
  @ApiQuery({
    name: 'endTime',
    required: true,
    description: 'End time (ISO string)',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Performance metrics retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid time range',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getMetrics(
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
    @Request() req: AuthenticatedRequest,
  ) {
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new HttpException('Invalid time format', HttpStatus.BAD_REQUEST);
      }
      
      if (start >= end) {
        throw new HttpException('Start time must be before end time', HttpStatus.BAD_REQUEST);
      }
      
      this.logger.log(`Getting metrics for user ${req.user.id}, range: ${startTime} to ${endTime}`);
      
      const metrics = this.performanceMonitor.getMetrics(start, end);
      
      return {
        success: true,
        data: {
          metrics,
          count: metrics.length,
          timeRange: { start, end },
        },
        timestamp: new Date(),
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Failed to get metrics: ${error instanceof Error ? error.message : String(error)}`);
      throw new HttpException(
        'Failed to retrieve performance metrics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('endpoint/:endpoint')
  @ApiOperation({
    summary: 'Get endpoint-specific metrics',
    description: 'Get performance metrics for a specific endpoint',
  })
  @ApiQuery({
    name: 'timeWindow',
    required: false,
    description: 'Time window in minutes (default: 60)',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Endpoint metrics retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getEndpointMetrics(
    @Query('endpoint') endpoint: string,
    @Query('timeWindow') timeWindow: number = 60,
    @Request() req: AuthenticatedRequest,
  ) {
    try {
      this.logger.log(`Getting endpoint metrics for user ${req.user.id}, endpoint: ${endpoint}`);
      
      const metrics = this.performanceMonitor.getEndpointMetrics(endpoint, timeWindow);
      
      return {
        success: true,
        data: {
          endpoint,
          metrics,
          count: metrics.length,
          timeWindow,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to get endpoint metrics: ${error instanceof Error ? error.message : String(error)}`);
      throw new HttpException(
        'Failed to retrieve endpoint metrics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('user/:userId')
  @ApiOperation({
    summary: 'Get user-specific metrics',
    description: 'Get performance metrics for a specific user',
  })
  @ApiQuery({
    name: 'timeWindow',
    required: false,
    description: 'Time window in minutes (default: 60)',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User metrics retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getUserMetrics(
    @Query('userId') userId: string,
    @Query('timeWindow') timeWindow: number = 60,
    @Request() req: AuthenticatedRequest,
  ) {
    try {
      this.logger.log(`Getting user metrics for user ${req.user.id}, target user: ${userId}`);
      
      const metrics = this.performanceMonitor.getUserMetrics(userId, timeWindow);
      
      return {
        success: true,
        data: {
          userId,
          metrics,
          count: metrics.length,
          timeWindow,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to get user metrics: ${error instanceof Error ? error.message : String(error)}`);
      throw new HttpException(
        'Failed to retrieve user metrics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('provider/:provider')
  @ApiOperation({
    summary: 'Get provider-specific metrics',
    description: 'Get performance metrics for a specific LLM provider',
  })
  @ApiQuery({
    name: 'timeWindow',
    required: false,
    description: 'Time window in minutes (default: 60)',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Provider metrics retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getProviderMetrics(
    @Query('provider') provider: string,
    @Query('timeWindow') timeWindow: number = 60,
    @Request() req: AuthenticatedRequest,
  ) {
    try {
      this.logger.log(`Getting provider metrics for user ${req.user.id}, provider: ${provider}`);
      
      const metrics = this.performanceMonitor.getProviderMetrics(provider, timeWindow);
      
      return {
        success: true,
        data: {
          provider,
          metrics,
          count: metrics.length,
          timeWindow,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to get provider metrics: ${error instanceof Error ? error.message : String(error)}`);
      throw new HttpException(
        'Failed to retrieve provider metrics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('optimize')
  @ApiOperation({
    summary: 'Run performance optimization',
    description: 'Run performance optimization analysis and apply optimizations',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Performance optimization completed successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async optimizePerformance(@Request() req: AuthenticatedRequest) {
    try {
      this.logger.log(`Running performance optimization for user ${req.user.id}`);
      
      const results = await this.performanceOptimizer.optimizePerformance();
      
      return {
        success: true,
        data: {
          optimizations: results,
          count: results.length,
          applied: results.filter(r => r.applied).length,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to run performance optimization: ${error instanceof Error ? error.message : String(error)}`);
      throw new HttpException(
        'Failed to run performance optimization',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('optimization/history')
  @ApiOperation({
    summary: 'Get optimization history',
    description: 'Get history of performance optimizations',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of results (default: 50)',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Optimization history retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getOptimizationHistory(
    @Query('limit') limit: number = 50,
    @Request() req: AuthenticatedRequest,
  ) {
    try {
      this.logger.log(`Getting optimization history for user ${req.user.id}, limit: ${limit}`);
      
      const history = this.performanceOptimizer.getOptimizationHistory(limit);
      
      return {
        success: true,
        data: {
          history,
          count: history.length,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to get optimization history: ${error instanceof Error ? error.message : String(error)}`);
      throw new HttpException(
        'Failed to retrieve optimization history',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('optimization/recommendations')
  @ApiOperation({
    summary: 'Get optimization recommendations',
    description: 'Get performance optimization recommendations',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Optimization recommendations retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getOptimizationRecommendations(@Request() req: AuthenticatedRequest) {
    try {
      this.logger.log(`Getting optimization recommendations for user ${req.user.id}`);
      
      const recommendations = this.performanceOptimizer.getOptimizationRecommendations();
      
      return {
        success: true,
        data: {
          recommendations,
          count: recommendations.length,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to get optimization recommendations: ${error instanceof Error ? error.message : String(error)}`);
      throw new HttpException(
        'Failed to retrieve optimization recommendations',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('optimization/summary')
  @ApiOperation({
    summary: 'Get optimization summary',
    description: 'Get summary of performance optimizations',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Optimization summary retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getOptimizationSummary(@Request() req: AuthenticatedRequest) {
    try {
      this.logger.log(`Getting optimization summary for user ${req.user.id}`);
      
      const summary = this.performanceOptimizer.getOptimizationSummary();
      
      return {
        success: true,
        data: summary,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to get optimization summary: ${error instanceof Error ? error.message : String(error)}`);
      throw new HttpException(
        'Failed to retrieve optimization summary',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('optimization/gc')
  @ApiOperation({
    summary: 'Force garbage collection',
    description: 'Force garbage collection to free up memory',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Garbage collection completed successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async forceGarbageCollection(@Request() req: AuthenticatedRequest) {
    try {
      this.logger.log(`Forcing garbage collection for user ${req.user.id}`);
      
      this.performanceOptimizer.forceGarbageCollection();
      
      return {
        success: true,
        message: 'Garbage collection completed',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to force garbage collection: ${error instanceof Error ? error.message : String(error)}`);
      throw new HttpException(
        'Failed to force garbage collection',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('optimization/clear-history')
  @ApiOperation({
    summary: 'Clear optimization history',
    description: 'Clear the optimization history',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Optimization history cleared successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async clearOptimizationHistory(@Request() req: AuthenticatedRequest) {
    try {
      this.logger.log(`Clearing optimization history for user ${req.user.id}`);
      
      this.performanceOptimizer.clearOptimizationHistory();
      
      return {
        success: true,
        message: 'Optimization history cleared',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to clear optimization history: ${error instanceof Error ? error.message : String(error)}`);
      throw new HttpException(
        'Failed to clear optimization history',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
