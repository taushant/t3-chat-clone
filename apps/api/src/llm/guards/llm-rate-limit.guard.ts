import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { LLMRateLimitService } from '../services/rate-limit.service';
import { AuthenticatedRequest } from '../../auth/interfaces/authenticated-request.interface';

/**
 * Rate limit metadata for LLM endpoints
 */
export const LLM_RATE_LIMIT_KEY = 'llm_rate_limit';
export const LLM_RATE_LIMIT = Reflector.createDecorator<{ provider?: string; estimatedTokens?: number }>(LLM_RATE_LIMIT_KEY);

/**
 * LLM Rate Limiting Guard
 * Enforces rate limits for LLM API endpoints
 */
@Injectable()
export class LLMRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(LLMRateLimitGuard.name);

  constructor(
    private readonly rateLimitService: LLMRateLimitService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const handler = context.getHandler();
    const classRef = context.getClass();

    // Get rate limit metadata
    const rateLimitMeta = this.reflector.getAllAndOverride<{
      provider?: string;
      estimatedTokens?: number;
    }>(LLM_RATE_LIMIT_KEY, [handler, classRef]);

    if (!rateLimitMeta) {
      // No rate limiting required
      return true;
    }

    const userId = request.user?.id;
    if (!userId) {
      this.logger.warn('Rate limiting attempted without authenticated user');
      return true; // Allow request if no user context
    }

    // Extract provider from request body or metadata
    let provider = rateLimitMeta.provider;
    if (!provider && request.body?.model) {
      provider = this.extractProviderFromModel(request.body.model);
    }

    if (!provider) {
      this.logger.warn('No provider specified for rate limiting');
      return true; // Allow request if no provider specified
    }

    // Get estimated tokens from request or metadata
    const estimatedTokens = rateLimitMeta.estimatedTokens || this.estimateTokens(request.body);

    try {
      // Check rate limit
      const rateLimitStatus = await this.rateLimitService.checkRateLimit(
        userId,
        provider,
        estimatedTokens,
      );

      if (!rateLimitStatus.allowed) {
        // Rate limit exceeded
        const response = context.switchToHttp().getResponse();
        
        // Set rate limit headers
        response.setHeader('X-RateLimit-Limit', 'N/A');
        response.setHeader('X-RateLimit-Remaining', rateLimitStatus.remaining);
        response.setHeader('X-RateLimit-Reset', new Date(rateLimitStatus.resetTime).toISOString());
        
        if (rateLimitStatus.retryAfter) {
          response.setHeader('Retry-After', rateLimitStatus.retryAfter);
        }

        throw new HttpException(
          {
            error: 'Rate limit exceeded',
            message: `Rate limit exceeded for provider ${provider}. Try again in ${rateLimitStatus.retryAfter} seconds.`,
            retryAfter: rateLimitStatus.retryAfter,
            resetTime: rateLimitStatus.resetTime,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Set rate limit headers for successful requests
      const response = context.switchToHttp().getResponse();
      response.setHeader('X-RateLimit-Limit', 'N/A');
      response.setHeader('X-RateLimit-Remaining', rateLimitStatus.remaining);
      response.setHeader('X-RateLimit-Reset', new Date(rateLimitStatus.resetTime).toISOString());

      // Store rate limit info in request for later use
      (request as any).rateLimitInfo = {
        provider,
        estimatedTokens,
        status: rateLimitStatus,
      };

      return true;

    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Rate limiting error for user ${userId}:`, error);
      // Fail open - allow request if rate limiting fails
      return true;
    }
  }

  /**
   * Extract provider name from model name
   * @param model - Model name
   * @returns Provider name
   */
  private extractProviderFromModel(model: string): string {
    if (model.includes('gpt') || model.includes('openai')) {
      return 'openai';
    } else if (model.includes('claude') || model.includes('anthropic')) {
      return 'anthropic';
    } else if (model.includes('/')) {
      // OpenRouter models have format "provider/model"
      return 'openrouter';
    }
    return 'openai'; // Default fallback
  }

  /**
   * Estimate token count for a request
   * @param body - Request body
   * @returns Estimated token count
   */
  private estimateTokens(body: any): number {
    if (!body || !body.messages) {
      return 100; // Default estimate
    }

    let totalTokens = 0;
    
    // Rough estimation: 1 token ≈ 4 characters for English text
    for (const message of body.messages) {
      if (message.content) {
        totalTokens += Math.ceil(message.content.length / 4);
      }
    }

    // Add overhead for system prompts, formatting, etc.
    totalTokens += 50;

    // Add estimated response tokens (rough estimate)
    const maxTokens = body.maxTokens || 1000;
    totalTokens += maxTokens;

    return totalTokens;
  }
}
