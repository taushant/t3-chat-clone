# LLM Integration Guide

## Overview

The T3 Chat Clone API includes a comprehensive LLM (Large Language Model) integration system that supports multiple providers with streaming capabilities, rate limiting, and secure API key management.

## Supported Providers

### OpenAI

- **Models**: GPT-3.5-turbo, GPT-4, GPT-4-turbo
- **Rate Limits**: 60 requests/minute, 150k tokens/minute
- **Features**: Full streaming support, function calling, fine-tuning

### Anthropic

- **Models**: Claude-3-sonnet, Claude-3-haiku, Claude-3-opus
- **Rate Limits**: 50 requests/minute, 40k tokens/minute
- **Features**: Long context, safety features, structured output

### OpenRouter

- **Models**: Access to 100+ models from various providers
- **Rate Limits**: 100 requests/minute, 100k tokens/minute
- **Features**: Unified API, model comparison, cost optimization

## API Endpoints

### Chat Completion

#### Non-Streaming Completion

```http
POST /api/v1/llm/chat/completion
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant."
    },
    {
      "role": "user",
      "content": "Hello, how are you?"
    }
  ],
  "model": "gpt-3.5-turbo",
  "temperature": 0.7,
  "maxTokens": 1000,
  "stop": ["\n", "Human:"],
  "topP": 0.9,
  "frequencyPenalty": 0,
  "presencePenalty": 0
}
```

**Response:**

```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "gpt-3.5-turbo",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! I am doing well, thank you for asking. How can I help you today?"
      },
      "finishReason": "stop"
    }
  ],
  "usage": {
    "promptTokens": 20,
    "completionTokens": 25,
    "totalTokens": 45
  }
}
```

#### Streaming Completion

```http
POST /api/v1/llm/chat/completion/stream
Authorization: Bearer <jwt-token>
Content-Type: application/json
Accept: text/event-stream

{
  "messages": [
    {
      "role": "user",
      "content": "Write a short story about a robot."
    }
  ],
  "model": "gpt-3.5-turbo",
  "temperature": 0.8,
  "maxTokens": 500
}
```

**Response (Server-Sent Events):**

```
data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{"content":"Once"},"finishReason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{"content":" upon"},"finishReason":null}]}

data: [DONE]
```

### API Key Management

#### Create API Key

```http
POST /api/v1/llm/api-keys
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "name": "My OpenAI Key",
  "provider": "openai",
  "key": "sk-1234567890abcdef",
  "isActive": true,
  "expiresAt": "2024-12-31T23:59:59.000Z"
}
```

#### List API Keys

```http
GET /api/v1/llm/api-keys
Authorization: Bearer <jwt-token>
```

#### Validate API Key

```http
POST /api/v1/llm/api-keys/validate
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "provider": "openai",
  "key": "sk-1234567890abcdef"
}
```

#### Get Available Providers

```http
GET /api/v1/llm/api-keys/providers
Authorization: Bearer <jwt-token>
```

#### Get Available Models

```http
GET /api/v1/llm/api-keys/models
Authorization: Bearer <jwt-token>
```

## Rate Limiting

The API implements comprehensive rate limiting to prevent abuse and ensure fair usage:

### Rate Limit Headers

All LLM endpoints include rate limiting headers:

- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Timestamp when the rate limit resets
- `Retry-After`: Seconds to wait before retrying (when rate limited)

### Rate Limit Response

When rate limited, the API returns:

```json
{
  "error": "Rate limit exceeded",
  "message": "Rate limit exceeded for provider openai. Try again in 45 seconds.",
  "retryAfter": 45,
  "resetTime": 1677652400
}
```

### Provider-Specific Limits

| Provider   | Requests/Minute | Tokens/Minute | Requests/Day | Tokens/Day |
| ---------- | --------------- | ------------- | ------------ | ---------- |
| OpenAI     | 60              | 150,000       | 10,000       | 1,000,000  |
| Anthropic  | 50              | 40,000        | 5,000        | 500,000    |
| OpenRouter | 100             | 100,000       | 10,000       | 1,000,000  |

## Error Handling

### Standard Error Response

```json
{
  "error": "Error type",
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    "provider": "openai",
    "model": "gpt-3.5-turbo"
  }
}
```

### Common Error Types

#### Authentication Error

```json
{
  "error": "authentication_error",
  "message": "Invalid API key",
  "code": "invalid_api_key"
}
```

#### Rate Limit Error

```json
{
  "error": "rate_limit_error",
  "message": "Rate limit exceeded",
  "code": "rate_limit_exceeded",
  "retryAfter": 60
}
```

#### Invalid Request Error

```json
{
  "error": "invalid_request_error",
  "message": "Invalid model specified",
  "code": "invalid_model"
}
```

#### Server Error

```json
{
  "error": "server_error",
  "message": "Internal server error",
  "code": "internal_error"
}
```

## Security Considerations

### API Key Security

- API keys are validated with the respective provider before storage
- Keys are encrypted at rest and in transit
- Access is restricted to the key owner
- Usage is logged and monitored

### Input Validation

- All input is validated and sanitized
- Message content is checked for malicious patterns
- Model names are validated against available models
- Parameter ranges are enforced (temperature: 0-2, maxTokens: >0)

### Rate Limiting

- User-based rate limiting prevents abuse
- Provider-specific limits respect API quotas
- Automatic cleanup of old usage records
- Configurable rate limit rules

## Usage Examples

### JavaScript/TypeScript

```typescript
// Non-streaming completion
const response = await fetch("/api/v1/llm/chat/completion", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    messages: [{ role: "user", content: "Hello, world!" }],
    model: "gpt-3.5-turbo",
    temperature: 0.7,
  }),
});

const data = await response.json();
console.log(data.choices[0].message.content);

// Streaming completion
const response = await fetch("/api/v1/llm/chat/completion/stream", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    messages: [{ role: "user", content: "Tell me a story" }],
    model: "gpt-3.5-turbo",
  }),
});

const reader = response.body?.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split("\n");

  for (const line of lines) {
    if (line.startsWith("data: ")) {
      const data = line.slice(6);
      if (data === "[DONE]") break;

      const parsed = JSON.parse(data);
      console.log(parsed.choices[0].delta.content);
    }
  }
}
```

### Python

```python
import requests
import json

# Non-streaming completion
response = requests.post(
    '/api/v1/llm/chat/completion',
    headers={
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
    },
    json={
        'messages': [
            {'role': 'user', 'content': 'Hello, world!'}
        ],
        'model': 'gpt-3.5-turbo',
        'temperature': 0.7,
    }
)

data = response.json()
print(data['choices'][0]['message']['content'])

# Streaming completion
response = requests.post(
    '/api/v1/llm/chat/completion/stream',
    headers={
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
    },
    json={
        'messages': [
            {'role': 'user', 'content': 'Tell me a story'}
        ],
        'model': 'gpt-3.5-turbo',
    },
    stream=True
)

for line in response.iter_lines():
    if line.startswith(b'data: '):
        data = line[6:].decode('utf-8')
        if data == '[DONE]':
            break

        parsed = json.loads(data)
        print(parsed['choices'][0]['delta']['content'], end='')
```

## Best Practices

### Model Selection

- Use `gpt-3.5-turbo` for general-purpose tasks (cost-effective)
- Use `gpt-4` for complex reasoning and analysis
- Use `claude-3-sonnet` for long-form content and safety-critical applications
- Use OpenRouter for cost optimization across multiple providers

### Parameter Tuning

- **Temperature**: 0.7 for creative tasks, 0.1 for factual responses
- **Max Tokens**: Set based on expected response length
- **Top P**: 0.9 for diverse responses, 0.1 for focused responses
- **Stop Sequences**: Use to control response length and format

### Error Handling

- Always check rate limit headers
- Implement exponential backoff for retries
- Handle streaming errors gracefully
- Validate API keys before making requests

### Performance Optimization

- Use streaming for long responses
- Batch multiple requests when possible
- Cache frequently used responses
- Monitor usage and costs

## Monitoring and Analytics

### Usage Statistics

The API provides usage statistics through the rate limiting service:

- Total requests per user/provider
- Token usage tracking
- Cost calculation (when available)
- Performance metrics

### Health Monitoring

- Provider health checks
- Connection monitoring
- Error rate tracking
- Response time metrics

## Troubleshooting

### Common Issues

#### Rate Limit Exceeded

- Check rate limit headers
- Implement proper retry logic
- Consider upgrading API plan
- Distribute requests across time

#### Invalid API Key

- Verify key format and validity
- Check key permissions
- Ensure key is not expired
- Validate with provider directly

#### Model Not Found

- Check available models endpoint
- Verify model name spelling
- Ensure model is supported by provider
- Check provider-specific model names

#### Streaming Issues

- Verify Accept header is set to `text/event-stream`
- Handle connection interruptions
- Implement proper error handling
- Check for network timeouts

### Debug Mode

Enable debug logging by setting the log level to `debug` in your environment configuration.

## Support

For additional support:

- Check the API documentation at `/api/docs`
- Review error logs for detailed information
- Contact support with specific error codes
- Monitor the health endpoint at `/api/v1/health`
