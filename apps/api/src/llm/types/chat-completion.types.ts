/**
 * Core types for LLM chat completion functionality
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  model: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  stop?: string[];
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface ChatCompletionChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage?: TokenUsage;
}

export interface ChatCompletionChoice {
  index: number;
  delta: ChatCompletionDelta;
  finishReason?: 'stop' | 'length' | 'content_filter' | 'tool_calls' | 'function_call';
}

export interface ChatCompletionDelta {
  role?: 'system' | 'user' | 'assistant';
  content?: string;
  name?: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage: TokenUsage;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  tokensPerMinute: number;
  requestsPerDay?: number;
  tokensPerDay?: number;
}

export interface ProviderError {
  code: string;
  message: string;
  type: 'invalid_request_error' | 'authentication_error' | 'rate_limit_error' | 'server_error';
  param?: string;
}

export interface UsageStats {
  userId: string;
  provider: string;
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  lastUsed: Date;
  period: 'day' | 'week' | 'month';
}

export interface ApiKeyInfo {
  id: string;
  name: string;
  provider: string;
  isActive: boolean;
  expiresAt?: Date;
  createdAt: Date;
  lastUsed?: Date;
  usageCount: number;
}
