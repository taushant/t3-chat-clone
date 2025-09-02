import { Module, OnModuleInit } from '@nestjs/common';
import { ProviderRegistryService } from './services/provider-registry.service';
import { ProviderFactoryService } from './services/provider-factory.service';
import { LLMRateLimitService } from './services/rate-limit.service';
import { LLMRateLimitGuard } from './guards/llm-rate-limit.guard';
import { ChatCompletionController } from './controllers/chat-completion.controller';
import { ApiKeyController } from './controllers/api-key.controller';
import { EnhancedStreamingController } from './controllers/enhanced-streaming.controller';
import { MarkdownProcessorController } from './controllers/markdown-processor.controller';
import { ContentModerationController } from './controllers/content-moderation.controller';
import { ResponseProcessingController } from './controllers/response-processing.controller';
import { LLMStreamingGateway } from './gateways/llm-streaming.gateway';
import { ConnectionPoolService } from './services/connection-pool.service';
import { StreamingBufferService } from './services/streaming-buffer.service';
import { StreamingStateService } from './services/streaming-state.service';
import { MarkdownProcessorService } from './services/markdown-processor.service';
import { CodeBlockProcessorService } from './services/code-block-processor.service';
import { SyntaxHighlighterService } from './services/syntax-highlighter.service';
import { ThemeManagerService } from './services/theme-manager.service';
import { ContentModerationService } from './services/content-moderation.service';
import { ContentFilterService } from './services/content-filter.service';
import { FilterRuleEngineService } from './services/filter-rule-engine.service';
import { ResponseProcessorService } from './services/response-processor.service';
import { ResponseEnhancerService } from './services/response-enhancer.service';
import { ResponseCacheService } from './services/response-cache.service';
import { PerformanceMonitorService } from './services/performance-monitor.service';
import { PerformanceOptimizerService } from './services/performance-optimizer.service';
import { PerformanceMonitorController } from './controllers/performance-monitor.controller';

/**
 * LLM Module
 * Provides LLM provider abstraction and management
 */
@Module({
           controllers: [
           ChatCompletionController,
           ApiKeyController,
           EnhancedStreamingController,
           MarkdownProcessorController,
           ContentModerationController,
           ResponseProcessingController,
           PerformanceMonitorController,
         ],
           providers: [
           ProviderRegistryService,
           ProviderFactoryService,
           LLMRateLimitService,
           LLMRateLimitGuard,
           ConnectionPoolService,
           StreamingBufferService,
           StreamingStateService,
           LLMStreamingGateway,
           MarkdownProcessorService,
           CodeBlockProcessorService,
           SyntaxHighlighterService,
           ThemeManagerService,
           ContentModerationService,
           ContentFilterService,
           FilterRuleEngineService,
           ResponseProcessorService,
           ResponseEnhancerService,
           ResponseCacheService,
           PerformanceMonitorService,
           PerformanceOptimizerService,
         ],
           exports: [
           ProviderRegistryService,
           ProviderFactoryService,
           LLMRateLimitService,
           LLMRateLimitGuard,
           ConnectionPoolService,
           StreamingBufferService,
           StreamingStateService,
           LLMStreamingGateway,
           MarkdownProcessorService,
           CodeBlockProcessorService,
           SyntaxHighlighterService,
           ThemeManagerService,
           ContentModerationService,
           ContentFilterService,
           FilterRuleEngineService,
           ResponseProcessorService,
           ResponseEnhancerService,
           ResponseCacheService,
           PerformanceMonitorService,
           PerformanceOptimizerService,
         ],
})
export class LLMModule implements OnModuleInit {
  constructor(private readonly providerFactory: ProviderFactoryService) {}

  async onModuleInit() {
    await this.providerFactory.initializeProviders();
  }
}
