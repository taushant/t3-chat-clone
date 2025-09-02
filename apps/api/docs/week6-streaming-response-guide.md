# Week 6: Streaming & Response Processing Guide

## Overview

This guide covers the streaming and response processing features implemented in Week 6 of the T3 Chat Clone project. These features enhance the LLM integration with optimized streaming, markdown processing, content moderation, and response processing capabilities.

## Table of Contents

1. [Streaming Optimization](#streaming-optimization)
2. [Markdown Processing & Rendering](#markdown-processing--rendering)
3. [Content Moderation & Filtering](#content-moderation--filtering)
4. [Response Processing Pipeline](#response-processing-pipeline)
5. [API Endpoints](#api-endpoints)
6. [Configuration](#configuration)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

## Streaming Optimization

### Enhanced SSE Streaming

The enhanced Server-Sent Events (SSE) streaming provides optimized real-time communication for LLM responses.

#### Features

- **Connection Management**: Efficient connection pooling and management
- **Buffer Management**: Intelligent buffering of streaming chunks
- **State Management**: Real-time tracking of streaming sessions
- **Error Handling**: Robust error handling and recovery

#### Usage

```typescript
// Enhanced streaming endpoint
POST /llm/stream/completion/optimized

// Request body
{
  "model": "gpt-3.5-turbo",
  "messages": [
    {
      "role": "user",
      "content": "Hello, how are you?"
    }
  ],
  "stream": true
}
```

### WebSocket Streaming

Real-time WebSocket streaming for LLM responses with enhanced performance.

#### Features

- **Real-time Communication**: Instant bidirectional communication
- **Connection Pooling**: Efficient connection management
- **State Synchronization**: Real-time state updates
- **Error Recovery**: Automatic error recovery and reconnection

#### Usage

```typescript
// WebSocket connection
const socket = io("/llm");

// Stream completion request
socket.emit("llm:stream-completion", {
  requestId: "req123",
  model: "gpt-3.5-turbo",
  messages: [
    {
      role: "user",
      content: "Hello, how are you?",
    },
  ],
});

// Listen for responses
socket.on("llm:stream-start", (data) => {
  console.log("Stream started:", data);
});

socket.on("llm:stream-chunk", (data) => {
  console.log("Stream chunk:", data);
});

socket.on("llm:stream-end", (data) => {
  console.log("Stream ended:", data);
});
```

## Markdown Processing & Rendering

### Markdown Processing Service

Advanced markdown processing with syntax highlighting and theme support.

#### Features

- **Markdown Parsing**: Comprehensive markdown parsing
- **Code Block Processing**: Intelligent code block detection and processing
- **Syntax Highlighting**: Multi-language syntax highlighting
- **Theme Management**: Configurable themes for code highlighting

#### Usage

````typescript
// Parse markdown
POST /llm/markdown/parse

// Request body
{
  "content": "# Hello World\n\n```javascript\nconsole.log('Hello');\n```"
}

// Response
{
  "parsed": {
    "raw": "# Hello World\n\n```javascript\nconsole.log('Hello');\n```",
    "blocks": [...],
    "metadata": {...}
  },
  "html": "<h1>Hello World</h1><pre><code class=\"language-javascript\">console.log('Hello');</code></pre>"
}
````

### Code Block Processing

Specialized processing for code blocks within markdown content.

#### Features

- **Language Detection**: Automatic language detection
- **Syntax Highlighting**: Multi-language syntax highlighting
- **Theme Support**: Configurable themes
- **Validation**: Code block validation and error handling

#### Usage

```typescript
// Process code block
POST /llm/markdown/code-block/process

// Request body
{
  "language": "javascript",
  "code": "console.log('Hello World');",
  "theme": "default"
}

// Response
{
  "processed": {
    "language": "javascript",
    "code": "console.log('Hello World');",
    "html": "<pre><code class=\"language-javascript\">console.log('Hello World');</code></pre>",
    "metadata": {...}
  }
}
```

## Content Moderation & Filtering

### Content Moderation Service

Real-time content moderation for LLM responses and user input.

#### Features

- **Real-time Moderation**: Instant content moderation
- **Streaming Support**: Moderation of streaming content
- **History Tracking**: Moderation history and statistics
- **Configurable Rules**: Customizable moderation rules

#### Usage

```typescript
// Moderate content
POST /llm/moderation/moderate

// Request body
{
  "content": "This is a test message.",
  "type": "text"
}

// Response
{
  "result": {
    "isApproved": true,
    "confidence": 0.95,
    "reasons": [],
    "metadata": {...}
  }
}
```

### Content Filtering

Advanced content filtering with custom rules and patterns.

#### Features

- **Pattern Matching**: Regex-based pattern matching
- **Custom Rules**: User-defined filtering rules
- **Streaming Support**: Real-time filtering of streaming content
- **Statistics**: Filtering statistics and analytics

#### Usage

```typescript
// Filter content
POST /llm/moderation/filter

// Request body
{
  "content": "This is a test message."
}

// Response
{
  "result": {
    "isFiltered": false,
    "filteredContent": "This is a test message.",
    "appliedFilters": [],
    "metadata": {...}
  }
}
```

### Filter Rule Engine

Configurable rule engine for content filtering.

#### Features

- **Rule Management**: Add, update, and remove filtering rules
- **Priority System**: Rule priority and execution order
- **Context Awareness**: Context-aware rule evaluation
- **Performance Optimization**: Optimized rule evaluation

#### Usage

```typescript
// Add filter rule
POST /llm/moderation/rules

// Request body
{
  "name": "Block Spam",
  "pattern": "spam|scam",
  "action": "block",
  "priority": 1,
  "enabled": true
}

// Response
{
  "rule": {
    "id": "rule123",
    "name": "Block Spam",
    "pattern": "spam|scam",
    "action": "block",
    "priority": 1,
    "enabled": true
  }
}
```

## Response Processing Pipeline

### Response Processing Service

End-to-end response processing pipeline for LLM responses.

#### Features

- **Pipeline Processing**: Multi-stage response processing
- **Streaming Support**: Real-time processing of streaming responses
- **Enhancement**: Response enhancement and enrichment
- **Caching**: Intelligent response caching

#### Usage

```typescript
// Process response
POST /llm/response/process

// Request body
{
  "response": {
    "id": "resp123",
    "content": "This is a test response.",
    "model": "gpt-3.5-turbo",
    "timestamp": "2024-01-01T00:00:00Z",
    "metadata": {}
  }
}

// Response
{
  "processed": {
    "id": "resp123",
    "content": "This is a test response.",
    "metadata": {
      "model": "gpt-3.5-turbo",
      "timestamp": "2024-01-01T00:00:00Z",
      "processed": true,
      "enhancements": [...]
    }
  }
}
```

### Response Enhancement

Enhancement of processed responses with additional metadata and formatting.

#### Features

- **Metadata Enrichment**: Additional metadata and context
- **Formatting**: Response formatting and styling
- **Validation**: Response validation and quality checks
- **Statistics**: Enhancement statistics and analytics

#### Usage

```typescript
// Enhance response
POST /llm/response/enhance

// Request body
{
  "response": {
    "id": "resp123",
    "content": "This is a test response.",
    "metadata": {...}
  }
}

// Response
{
  "enhanced": {
    "id": "resp123",
    "content": "This is a test response.",
    "enhancements": {
      "formatted": true,
      "validated": true,
      "enriched": true
    },
    "metadata": {...}
  }
}
```

### Response Caching

Intelligent caching of processed responses for improved performance.

#### Features

- **Intelligent Caching**: Smart caching based on content and context
- **Cache Management**: Cache invalidation and cleanup
- **Performance Metrics**: Cache hit rates and performance statistics
- **Configurable TTL**: Configurable time-to-live for cached responses

#### Usage

```typescript
// Cache response
POST /llm/response/cache

// Request body
{
  "key": "cache123",
  "response": {
    "id": "resp123",
    "content": "This is a test response.",
    "metadata": {...}
  },
  "ttl": 3600
}

// Response
{
  "cached": true,
  "key": "cache123",
  "ttl": 3600
}
```

## API Endpoints

### Streaming Endpoints

- `POST /llm/stream/completion/optimized` - Enhanced SSE streaming
- `WebSocket /llm` - WebSocket streaming gateway

### Markdown Processing Endpoints

- `POST /llm/markdown/parse` - Parse markdown content
- `POST /llm/markdown/render` - Render markdown to HTML
- `POST /llm/markdown/code-block/process` - Process code blocks
- `GET /llm/markdown/themes` - Get available themes
- `GET /llm/markdown/languages` - Get supported languages

### Content Moderation Endpoints

- `POST /llm/moderation/moderate` - Moderate content
- `POST /llm/moderation/filter` - Filter content
- `GET /llm/moderation/history/:userId` - Get moderation history
- `GET /llm/moderation/stats` - Get moderation statistics

### Filter Rule Endpoints

- `POST /llm/moderation/rules` - Add filter rule
- `PUT /llm/moderation/rules/:id` - Update filter rule
- `DELETE /llm/moderation/rules/:id` - Remove filter rule
- `GET /llm/moderation/rules` - Get active rules

### Response Processing Endpoints

- `POST /llm/response/process` - Process response
- `POST /llm/response/enhance` - Enhance response
- `POST /llm/response/cache` - Cache response
- `GET /llm/response/cache/:key` - Get cached response
- `DELETE /llm/response/cache/:key` - Invalidate cache
- `GET /llm/response/stats` - Get processing statistics

## Configuration

### Environment Variables

```bash
# Streaming Configuration
STREAMING_BUFFER_SIZE=1024
STREAMING_CHUNK_SIZE=512
STREAMING_TIMEOUT=30000

# Markdown Processing
MARKDOWN_THEME_DEFAULT=default
MARKDOWN_SYNTAX_HIGHLIGHTING=true

# Content Moderation
MODERATION_ENABLED=true
MODERATION_CONFIDENCE_THRESHOLD=0.8

# Response Processing
RESPONSE_CACHE_TTL=3600
RESPONSE_CACHE_MAX_SIZE=1000
```

### Service Configuration

```typescript
// Connection Pool Service
const connectionPoolConfig = {
  maxConnections: 100,
  connectionTimeout: 30000,
  cleanupInterval: 60000,
};

// Streaming Buffer Service
const streamingBufferConfig = {
  maxBufferSize: 1024 * 1024, // 1MB
  chunkSize: 512,
  flushInterval: 1000,
};

// Content Moderation Service
const moderationConfig = {
  enabled: true,
  confidenceThreshold: 0.8,
  maxHistorySize: 1000,
};
```

## Testing

### Unit Tests

All services include comprehensive unit tests:

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- --testPathPattern=streaming
npm test -- --testPathPattern=markdown
npm test -- --testPathPattern=moderation
npm test -- --testPathPattern=response-processing
```

### Integration Tests

Integration tests for API endpoints and WebSocket functionality:

```bash
# Run integration tests
npm run test:integration

# Run specific integration tests
npm run test:integration -- --testPathPattern=streaming
npm run test:integration -- --testPathPattern=websocket
```

### Test Coverage

```bash
# Generate test coverage report
npm run test:coverage

# View coverage report
open coverage/lcov-report/index.html
```

## Troubleshooting

### Common Issues

#### Streaming Connection Issues

**Problem**: WebSocket connections failing or timing out.

**Solution**:

1. Check WebSocket server configuration
2. Verify connection pool settings
3. Check network connectivity and firewall settings
4. Review connection timeout configurations

#### Markdown Processing Errors

**Problem**: Markdown parsing or rendering failures.

**Solution**:

1. Validate markdown content format
2. Check syntax highlighting configuration
3. Verify theme availability
4. Review code block processing settings

#### Content Moderation Issues

**Problem**: Content moderation not working or false positives.

**Solution**:

1. Check moderation service configuration
2. Review confidence thresholds
3. Validate filter rules and patterns
4. Check moderation history and statistics

#### Response Processing Errors

**Problem**: Response processing pipeline failures.

**Solution**:

1. Check response format and structure
2. Verify processing service configuration
3. Review enhancement settings
4. Check cache configuration and availability

### Performance Optimization

#### Streaming Performance

- Optimize buffer sizes for your use case
- Configure appropriate connection timeouts
- Monitor connection pool usage
- Implement connection cleanup strategies

#### Markdown Processing Performance

- Use appropriate themes for your content
- Optimize syntax highlighting settings
- Cache processed markdown when possible
- Monitor processing times and memory usage

#### Content Moderation Performance

- Optimize filter rules and patterns
- Use appropriate confidence thresholds
- Implement efficient rule evaluation
- Monitor moderation statistics and performance

#### Response Processing Performance

- Configure appropriate cache TTL values
- Optimize processing pipeline stages
- Monitor cache hit rates
- Implement efficient enhancement strategies

### Monitoring and Logging

#### Logging Configuration

```typescript
// Enable detailed logging
const loggingConfig = {
  level: "debug",
  streaming: true,
  markdown: true,
  moderation: true,
  responseProcessing: true,
};
```

#### Metrics and Monitoring

- Monitor streaming connection counts and performance
- Track markdown processing times and success rates
- Monitor content moderation statistics and accuracy
- Track response processing performance and cache efficiency

## Best Practices

### Streaming

1. **Connection Management**: Implement proper connection cleanup and timeout handling
2. **Buffer Management**: Use appropriate buffer sizes and flush strategies
3. **Error Handling**: Implement robust error handling and recovery mechanisms
4. **Performance Monitoring**: Monitor streaming performance and optimize as needed

### Markdown Processing

1. **Content Validation**: Validate markdown content before processing
2. **Theme Selection**: Choose appropriate themes for your use case
3. **Performance Optimization**: Cache processed content when possible
4. **Error Handling**: Handle parsing errors gracefully

### Content Moderation

1. **Rule Management**: Regularly review and update filtering rules
2. **Confidence Thresholds**: Set appropriate confidence thresholds for your use case
3. **Performance Monitoring**: Monitor moderation performance and accuracy
4. **User Feedback**: Implement user feedback mechanisms for moderation decisions

### Response Processing

1. **Pipeline Optimization**: Optimize processing pipeline stages for your use case
2. **Caching Strategy**: Implement appropriate caching strategies
3. **Enhancement Selection**: Choose relevant enhancements for your use case
4. **Performance Monitoring**: Monitor processing performance and cache efficiency

## Conclusion

The Week 6 streaming and response processing features provide a comprehensive foundation for advanced LLM integration. These features enhance performance, user experience, and content quality while maintaining security and reliability.

For additional support or questions, please refer to the project documentation or contact the development team.

