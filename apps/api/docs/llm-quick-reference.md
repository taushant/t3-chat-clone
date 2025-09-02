# LLM API Quick Reference

## Base URL

```
/api/v1/llm
```

## Authentication

All endpoints require JWT authentication:

```http
Authorization: Bearer <jwt-token>
```

## Chat Completion

### Non-Streaming

```http
POST /chat/completion
```

### Streaming

```http
POST /chat/completion/stream
Accept: text/event-stream
```

### Request Body

```json
{
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Hello!" }
  ],
  "model": "gpt-3.5-turbo",
  "temperature": 0.7,
  "maxTokens": 1000,
  "stop": ["\n"],
  "topP": 0.9,
  "frequencyPenalty": 0,
  "presencePenalty": 0
}
```

## API Key Management

### Create Key

```http
POST /api-keys
```

### List Keys

```http
GET /api-keys
```

### Validate Key

```http
POST /api-keys/validate
```

### Get Providers

```http
GET /api-keys/providers
```

### Get Models

```http
GET /api-keys/models
```

## Supported Models

### OpenAI

- `gpt-3.5-turbo`
- `gpt-4`
- `gpt-4-turbo`

### Anthropic

- `claude-3-sonnet-20240229`
- `claude-3-haiku-20240307`
- `claude-3-opus-20240229`

### OpenRouter

- `openai/gpt-3.5-turbo`
- `anthropic/claude-3-sonnet-20240229`
- `meta-llama/llama-2-70b-chat`

## Rate Limits

| Provider   | Req/Min | Tokens/Min |
| ---------- | ------- | ---------- |
| OpenAI     | 60      | 150,000    |
| Anthropic  | 50      | 40,000     |
| OpenRouter | 100     | 100,000    |

## Response Headers

```
X-RateLimit-Limit: N/A
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 2024-01-01T12:00:00Z
```

## Error Codes

| Code                    | Description            |
| ----------------------- | ---------------------- |
| `invalid_request_error` | Bad request parameters |
| `authentication_error`  | Invalid API key        |
| `rate_limit_error`      | Rate limit exceeded    |
| `server_error`          | Internal server error  |

## Common Responses

### Success (Non-Streaming)

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
        "content": "Hello! How can I help you?"
      },
      "finishReason": "stop"
    }
  ],
  "usage": {
    "promptTokens": 10,
    "completionTokens": 15,
    "totalTokens": 25
  }
}
```

### Success (Streaming)

```
data: {"id":"chatcmpl-123","choices":[{"delta":{"content":"Hello"}}]}

data: {"id":"chatcmpl-123","choices":[{"delta":{"content":"!"}}]}

data: [DONE]
```

### Rate Limited

```json
{
  "error": "rate_limit_error",
  "message": "Rate limit exceeded for provider openai. Try again in 45 seconds.",
  "retryAfter": 45,
  "resetTime": 1677652400
}
```

### Invalid API Key

```json
{
  "error": "authentication_error",
  "message": "Invalid API key",
  "code": "invalid_api_key"
}
```

## Quick Examples

### cURL - Non-Streaming

```bash
curl -X POST /api/v1/llm/chat/completion \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}],
    "model": "gpt-3.5-turbo"
  }'
```

### cURL - Streaming

```bash
curl -X POST /api/v1/llm/chat/completion/stream \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "messages": [{"role": "user", "content": "Tell me a story"}],
    "model": "gpt-3.5-turbo"
  }'
```

### JavaScript - Streaming

```javascript
const response = await fetch("/api/v1/llm/chat/completion/stream", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    messages: [{ role: "user", content: "Hello!" }],
    model: "gpt-3.5-turbo",
  }),
});

const reader = response.body.getReader();
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

## Tips

1. **Always check rate limit headers** before making requests
2. **Use streaming** for long responses to improve user experience
3. **Set appropriate temperature** based on task (0.1 for facts, 0.7 for creativity)
4. **Handle errors gracefully** with proper retry logic
5. **Monitor usage** to avoid hitting rate limits
6. **Validate API keys** before storing them
7. **Use stop sequences** to control response length
8. **Cache responses** when appropriate to reduce costs
