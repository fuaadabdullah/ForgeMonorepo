# API Guide

This guide explains how to use the ForgeTM Backend API for AI model management and orchestration.

## Overview

The ForgeTM Backend provides RESTful APIs for:

- **Provider Management**: Health checks and status monitoring for AI providers
- **LLM Proxy**: Unified API access to multiple LLM providers via LiteLLM (OpenAI, Gemini, DeepSeek)
- **Health Monitoring**: System and provider health status
- **Background Tasks**: Asynchronous processing capabilities

## Base URL

All API endpoints are relative to the base URL of your ForgeTM Backend instance:

- **Development**: `http://localhost:8000`
- **Production**: Your deployed instance URL

## Authentication

Currently, the API does not require authentication. In production deployments, consider adding authentication middleware.

## Endpoints

### Health Endpoints

#### GET /health

Returns basic application health information.

**Response:**

```json
{
  "status": "ok",
  "version": "0.1.0",
  "uptime_sec": 123.456
}
```

#### GET /providers/health

Returns health status for all configured AI providers.

**Response:**

```json
{
  "status": "ok",
  "took_ms": 150,
  "providers": {
    "litellm": {
      "name": "litellm",
      "ok": true,
      "latency_ms": 105,
      "url": null
    }
  }
}
```

### LiteLLM Endpoints

#### GET /v1/models

Lists all available models from configured LiteLLM providers.

**Response:**

```json
{
  "object": "list",
  "data": [
    {
      "id": "gpt-3.5-turbo",
      "object": "model",
      "created": 0,
      "owned_by": "litellm"
    },
    {
      "id": "gemini-pro",
      "object": "model",
      "created": 0,
      "owned_by": "litellm"
    },
    {
      "id": "deepseek-chat",
      "object": "model",
      "created": 0,
      "owned_by": "litellm"
    }
  ]
}
```

#### POST /v1/chat/completions

Creates a chat completion using any supported LiteLLM provider.

**Request Body:**

```json
{
  "model": "gpt-3.5-turbo",
  "messages": [
    {
      "role": "user",
      "content": "Hello, how are you?"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 100,
  "stream": false
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
        "content": "Hello! I'm doing well, thank you for asking."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 13,
    "completion_tokens": 20,
    "total_tokens": 33
  }
}
```

#### POST /v1/chat/completions (Streaming)

For real-time streaming responses, set `"stream": true`:

**Request Body:**

```json
{
  "model": "gpt-3.5-turbo",
  "messages": [
    {
      "role": "user",
      "content": "Tell me a story"
    }
  ],
  "temperature": 0.7,
  "stream": true
}
```

**Response:** Server-sent events with streaming content.

#### GET /v1/providers

Returns information about configured LLM providers and their status.

**Response:**

```json
{
  "providers": {
    "openai": {
      "configured": true,
      "models": ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo"]
    },
    "gemini": {
      "configured": true,
      "models": ["gemini-pro", "gemini-pro-vision"]
    },
    "deepseek": {
      "configured": true,
      "models": ["deepseek-chat", "deepseek-coder"]
    }
  },
  "total_configured": 3,
  "total_available": 3
}
```

## Error Handling

The API uses standard HTTP status codes:

- **200**: Success
- **400**: Bad Request (invalid parameters)
- **404**: Not Found
- **422**: Validation Error (invalid request format)
- **500**: Internal Server Error
- **502**: Bad Gateway (external provider error)

Error responses include a `detail` field with more information:

```json
{
  "detail": "Invalid model name. Available models: gpt-3.5-turbo, gemini-pro, deepseek-chat"
}
```

## Rate Limiting

Currently, there are no rate limits implemented. Consider adding rate limiting for production use.

## Examples

### Python Client

```python
import httpx

# Health check
response = httpx.get("http://localhost:8000/health")
print(response.json())

# List LiteLLM models
response = httpx.get("http://localhost:8000/v1/models")
models = response.json()
print(f"Available models: {[m['id'] for m in models['data']]}")

# Chat completion with OpenAI
response = httpx.post(
    "http://localhost:8000/v1/chat/completions",
    json={
        "model": "gpt-3.5-turbo",
        "messages": [{"role": "user", "content": "Hello!"}],
        "temperature": 0.7
    }
)
completion = response.json()
print(completion['choices'][0]['message']['content'])

# Chat completion with Gemini
response = httpx.post(
    "http://localhost:8000/v1/chat/completions",
    json={
        "model": "gemini-pro",
        "messages": [{"role": "user", "content": "Hello!"}],
        "temperature": 0.7
    }
)
completion = response.json()
print(completion['choices'][0]['message']['content'])

# Streaming chat completion
response = httpx.post(
    "http://localhost:8000/v1/chat/completions",
    json={
        "model": "gpt-3.5-turbo",
        "messages": [{"role": "user", "content": "Tell me a story"}],
        "stream": True
    },
    timeout=60.0
)

for line in response.iter_lines():
    if line.startswith("data: "):
        data = line[6:]  # Remove "data: " prefix
        if data == "[DONE]":
            break
        try:
            chunk = json.loads(data)
            if chunk['choices'][0]['delta'].get('content'):
                print(chunk['choices'][0]['delta']['content'], end="")
        except json.JSONDecodeError:
            continue

# Check provider status
response = httpx.get("http://localhost:8000/v1/providers")
providers = response.json()
print(f"Configured providers: {providers['total_configured']}/{providers['total_available']}")
```

### JavaScript Client

```javascript
// Health check
const health = await fetch('http://localhost:8000/health');
const healthData = await health.json();
console.log(healthData);

// List LiteLLM models
const modelsResp = await fetch('http://localhost:8000/v1/models');
const modelsData = await modelsResp.json();
console.log('Available models:', modelsData.data.map(m => m.id));

// Chat completion with OpenAI
const completionResp = await fetch('http://localhost:8000/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: 'Hello!' }],
    temperature: 0.7
  })
});
const completionData = await completionResp.json();
console.log(completionData.choices[0].message.content);

// Chat completion with Gemini
const geminiResp = await fetch('http://localhost:8000/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'gemini-pro',
    messages: [{ role: 'user', content: 'Hello!' }],
    temperature: 0.7
  })
});
const geminiData = await geminiResp.json();
console.log(geminiData.choices[0].message.content);

// Streaming chat completion
const streamResp = await fetch('http://localhost:8000/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: 'Tell me a story' }],
    stream: true
  })
});

const reader = streamResp.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (data === '[DONE]') break;

      try {
        const parsed = JSON.parse(data);
        if (parsed.choices[0].delta.content) {
          process.stdout.write(parsed.choices[0].delta.content);
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }
}

// Check providers
const providersResp = await fetch('http://localhost:8000/v1/providers');
const providersData = await providersResp.json();
console.log(`Configured: ${providersData.total_configured}/${providersData.total_available}`);
```

## Webhooks and Callbacks

The API currently does not support webhooks. Background tasks complete asynchronously without callbacks.

## SDKs and Libraries

Official SDKs are not yet available. Use standard HTTP clients or the OpenAPI-generated client libraries.

## Troubleshooting

### Common Issues

1. **Connection Refused**: Ensure the backend service is running on port 8000
2. **Provider Unavailable**: Check that API keys are properly configured in `.env`
3. **Model Not Found**: Verify the model name matches available models from `/v1/models`
4. **Rate Limited**: Check provider dashboard for quota usage
5. **Invalid API Key**: Ensure API keys are loaded from environment variables

### API Key Configuration

API keys must be configured in the backend's `.env` file:

```bash
# Required API keys
OPENAI_API_KEY=sk-proj-...
GEMINI_API_KEY=AIzaSy...
DEEPSEEK_API_KEY=sk-...
```

See `ForgeMonorepo/Obsidian/API_KEYS_MANAGEMENT.md` for detailed key management instructions.

### Provider-Specific Issues

#### OpenAI API Errors

- **Error**: "Invalid API key"
  - Check that `OPENAI_API_KEY` is set correctly
  - Verify the key hasn't expired
  - Ensure the key has sufficient credits

- **Error**: "Rate limit exceeded"
  - Check OpenAI dashboard for usage limits
  - Consider upgrading your OpenAI plan
  - Implement request throttling in your client

#### Gemini API Errors

- **Error**: "API_KEY_INVALID"
  - Verify `GEMINI_API_KEY` format (should start with "AIzaSy")
  - Check that the key is enabled in Google AI Studio
  - Ensure the project hasn't exceeded quota

- **Error**: "RESOURCE_EXHAUSTED"
  - Check Gemini API quota in Google Cloud Console
  - Consider upgrading to a paid plan

#### DeepSeek API Errors

- **Error**: "Authentication failed"
  - Verify `DEEPSEEK_API_KEY` format (should start with "sk-")
  - Check DeepSeek platform for account status
  - Ensure the key is active and not revoked

### Environment Configuration

#### Backend Won't Start

- **Issue**: "ModuleNotFoundError" or import errors
  - Ensure virtual environment is activated: `source .venv/bin/activate`
  - Install dependencies: `pip install -r requirements.txt`
  - Check Python version (requires 3.11+)

- **Issue**: "API key not found" on startup
  - Verify `.env` file exists in `apps/backend/` directory
  - Check that environment variables are properly formatted
  - Ensure `.env` is not in `.gitignore` (it should be ignored)

#### Port Conflicts

- **Issue**: "Port 8000 already in use"
  - Kill existing process: `lsof -ti:8000 | xargs kill -9`
  - Change port in `.env`: `BACKEND_PORT=8001`
  - Or use VS Code task which handles port conflicts

### Testing Issues

#### Tests Failing with API Errors

- **Issue**: Tests fail with authentication errors
  - Ensure test environment has access to API keys
  - Check that `.env` file is loaded in test configuration
  - Verify API keys are valid and have sufficient quota

- **Issue**: "Connection refused" in tests
  - Ensure backend is running before running API tests
  - Check that test client is pointing to correct URL
  - Verify network connectivity if using external services

### Performance Issues

#### Slow Response Times

- **Issue**: Chat completions taking >30 seconds
  - Check provider status: `GET /v1/providers`
  - Verify API key quotas haven't been exceeded
  - Consider switching to a different model/provider
  - Check network latency to provider endpoints

#### High Memory Usage

- **Issue**: Backend consuming excessive memory
  - Monitor with `/health` endpoint
  - Check for memory leaks in streaming responses
  - Consider reducing concurrent requests
  - Restart service if memory usage >1GB

### Observability

#### Tracing Not Working

- **Issue**: No traces appearing in Jaeger
  - Verify OTLP endpoint configuration
  - Check that Jaeger is running on port 4318
  - Ensure `ENABLE_TRACING=true` in environment
  - Check backend logs for tracing errors

#### Logs Not Appearing

- **Issue**: No application logs visible
  - Set `LOG_LEVEL=DEBUG` for detailed logging
  - Check that logs are being written to correct location
  - Verify log rotation isn't removing recent entries
  - Ensure sufficient disk space for log files

### Debugging

Enable debug logging by setting the environment variable:

```bash
export LOG_LEVEL=DEBUG
```

Check the application logs for detailed error information and API key validation messages.

### Getting Help

If you encounter issues not covered here:

1. Check the application logs with `LOG_LEVEL=DEBUG`
2. Verify API key configuration with the `/v1/providers` endpoint
3. Test individual providers using the examples above
4. Check provider status dashboards (OpenAI, Google AI Studio, DeepSeek)
5. Review `ForgeMonorepo/Obsidian/API_KEYS_MANAGEMENT.md` for key management
6. Create an issue in the repository with:
   - Error messages and stack traces
   - Environment configuration (redacted)
   - Steps to reproduce the issue
