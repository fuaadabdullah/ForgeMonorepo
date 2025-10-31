# API Guide

This guide explains how to use the ForgeTM Backend API for AI model management and orchestration.

## Overview

The ForgeTM Backend provides RESTful APIs for:

- **Provider Management**: Health checks and status monitoring for AI providers
- **LLM Proxy**: Unified API access to multiple LLM providers via LiteLLM (OpenAI, Gemini, DeepSeek)
- **Authentication**: User authentication and authorization
- **Analytics**: Usage tracking and metrics collection
- **RAG System**: Retrieval-augmented generation with vector database integration
- **Ollama Integration**: Local LLM model management and inference
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

### Authentication Endpoints

#### POST /auth/login

Authenticate a user and return access tokens.

**Request Body:**

```json
{
  "username": "user@example.com",
  "password": "secure_password"
}
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": "user123",
    "email": "user@example.com",
    "role": "user"
  }
}
```

#### POST /auth/register

Register a new user account.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "secure_password",
  "full_name": "John Doe"
}
```

**Response:**

```json
{
  "message": "User registered successfully",
  "user_id": "user123",
  "verification_required": true
}
```

#### POST /auth/refresh

Refresh an expired access token using a refresh token.

**Request Body:**

```json
{
  "refresh_token": "refresh_token_here"
}
```

**Response:**

```json
{
  "access_token": "new_access_token_here",
  "token_type": "bearer",
  "expires_in": 3600
}
```

### Analytics Endpoints

#### POST /v1/analytics/usage

Record usage metrics for API calls and model interactions.

**Request Body:**

```json
{
  "user_id": "user123",
  "model": "gpt-3.5-turbo",
  "tokens_used": 150,
  "request_type": "chat_completion",
  "timestamp": "2025-10-26T10:30:00Z",
  "metadata": {
    "session_id": "session_abc123",
    "project_id": "project_xyz"
  }
}
```

**Response:**

```json
{
  "recorded": true,
  "usage_id": "usage_456",
  "quota_remaining": 850
}
```

#### GET /v1/analytics/user/{user_id}

Get usage analytics for a specific user.

**Query Parameters:**

- `start_date`: ISO 8601 date string (optional)
- `end_date`: ISO 8601 date string (optional)
- `model`: Filter by specific model (optional)

**Response:**

```json
{
  "user_id": "user123",
  "period": {
    "start": "2025-10-01T00:00:00Z",
    "end": "2025-10-31T23:59:59Z"
  },
  "total_tokens": 15420,
  "total_requests": 234,
  "model_breakdown": {
    "gpt-3.5-turbo": {
      "tokens": 12000,
      "requests": 180,
      "cost_estimate": 0.024
    },
    "gemini-pro": {
      "tokens": 3420,
      "requests": 54,
      "cost_estimate": 0.0085
    }
  }
}
```

### RAG (Retrieval-Augmented Generation) Endpoints

#### POST /rag/index

Index documents for retrieval-augmented generation.

**Request Body:**

```json
{
  "documents": [
    {
      "id": "doc_123",
      "content": "This is the content of the document...",
      "metadata": {
        "title": "Document Title",
        "author": "John Doe",
        "tags": ["tag1", "tag2"]
      }
    }
  ],
  "namespace": "default"
}
```

**Response:**

```json
{
  "indexed": true,
  "document_count": 1,
  "namespace": "default",
  "index_id": "index_abc123"
}
```

#### POST /rag/query

Query the RAG system for relevant documents and generate augmented responses.

**Request Body:**

```json
{
  "query": "What are the key features of the system?",
  "namespace": "default",
  "top_k": 5,
  "include_metadata": true,
  "generate_response": true,
  "model": "gpt-3.5-turbo"
}
```

**Response:**

```json
{
  "query": "What are the key features of the system?",
  "relevant_documents": [
    {
      "id": "doc_123",
      "content": "The system includes several key features...",
      "score": 0.89,
      "metadata": {
        "title": "System Features",
        "tags": ["features", "overview"]
      }
    }
  ],
  "generated_response": "Based on the indexed documents, the key features include...",
  "usage": {
    "prompt_tokens": 450,
    "completion_tokens": 120,
    "total_tokens": 570
  }
}
```

#### DELETE /rag/documents/{document_id}

Remove a document from the RAG index.

**Response:**

```json
{
  "deleted": true,
  "document_id": "doc_123",
  "namespace": "default"
}
```

### Ollama Integration Endpoints

#### GET /ollama/models

List available Ollama models on the local instance.

**Response:**

```json
{
  "models": [
    {
      "name": "llama2:7b",
      "size": "3.8GB",
      "digest": "sha256:123...",
      "details": {
        "format": "gguf",
        "family": "llama",
        "families": ["llama"],
        "parameter_size": "7B",
        "quantization_level": "Q4_0"
      }
    }
  ]
}
```

#### POST /ollama/generate

Generate text using a local Ollama model.

**Request Body:**

```json
{
  "model": "llama2:7b",
  "prompt": "Explain quantum computing in simple terms",
  "stream": false,
  "options": {
    "temperature": 0.7,
    "top_p": 0.9,
    "max_tokens": 500
  }
}
```

**Response:**

```json
{
  "model": "llama2:7b",
  "created_at": "2025-10-26T10:30:00Z",
  "response": "Quantum computing is a type of computing that uses quantum mechanics...",
  "done": true,
  "context": [123, 456, 789],
  "total_duration": 2500000000,
  "load_duration": 500000000,
  "prompt_eval_count": 15,
  "prompt_eval_duration": 1000000000,
  "eval_count": 120,
  "eval_duration": 1000000000
}
```

#### POST /ollama/pull

Pull (download) a model from the Ollama library.

**Request Body:**

```json
{
  "name": "llama2:7b",
  "stream": true
}
```

**Response:** Streaming download progress or completion status.

#### DELETE /ollama/models/{model_name}

Remove a model from the local Ollama instance.

**Response:**

```json
{
  "deleted": true,
  "model": "llama2:7b"
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

## Plugin Ecosystem (Phase 6)

Smithy exposes a plugin system to extend automation without forking core code.

### Architecture

- **Manifest-Driven**: Each plugin includes `smithy-plugin.json` describing metadata, categories, and allowed capabilities.
- **PluginManager**: Discovers plugins from workspace folders (`smithy/plugins`, `.smithy/plugins`) plus built-in bundles (`smithy/plugins/examples`).
- **Extension Registry**: Plugins register handlers through `ExtensionRegistry`—for example, `language.detect` hooks from the built-in `language-python` plugin.
- **Sandbox Policy**: `PluginSandbox` enforces capability requests (config access, workflow invocation) before activation.

Core plugin tracks:

- **Language Plugins** – add formatting, linting, or workflow hooks for specific languages (example: `language-python`).
- **Tool Integrations** – wrap third-party CLIs or SaaS APIs (example: `tooling-docker-daemon` for dockerd health/config).
- **Cloud Providers** – provision, configure, or audit cloud resources via standardized extension points.
- **Database Plugins** – manage schema drift, migrations, or compliance rules for databases.

### CLI Workflow

```bash
# enumerate discovered plugins
smithy plugins list

# enable/disable
smithy plugins enable language-python
smithy plugins disable language-python

# install from a local path containing smithy-plugin.json
smithy plugins install ./plugins/my-plugin

# scaffold boilerplate
smithy plugins generate cloud-aws-plugin ./plugins --category cloud
```

### Developer Kit

- `PluginTemplateGenerator` creates manifest + plugin class boilerplate.
- Tests can enable plugins through `PluginManager` (`test_plugins.py` shows usage).
- Publish plugins by checking in under `.smithy/plugins` or packaging as a Python module exposing the manifest entry point.

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
