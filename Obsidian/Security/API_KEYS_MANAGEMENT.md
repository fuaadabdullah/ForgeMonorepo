---
title: API Keys & Credentials Management
type: reference
project: ForgeMonorepo
status: reviewed
owner: GoblinOS
---

## Overview

This document defines the canonical approach to storing, managing, and rotating API credentials for the ForgeMonorepo workspace.

## Current API Keys

### Smithy Secrets Manager (new)

Use the smithy CLI to persist keys in the OS keyring and sync them to .env files without sharing raw values:

```bash
# list redacted keys with source
smithy secrets list

# read a key (prints full value)
smithy secrets get OPENAI_API_KEY

# store/update a key in the keyring and optional .env file
smithy secrets set OPENAI_API_KEY "sk-..." --env-file ForgeTM/apps/backend/.env

# sync common keys into an env file
smithy secrets sync-env ForgeTM/apps/backend/.env \
  --keys OPENAI_API_KEY,GEMINI_API_KEY,DEEPSEEK_API_KEY,PINECONE_API_KEY
```

Guardrails:

- Keys default to the OS keyring when available. If keyring is missing, smithy falls back to the encrypted `~/.smithy/credentials.json` vault.
- `.env` files are optional and should live in workspace directories already tracked in `.gitignore`.
- Never commit the generated `credentials.json` or `.env` files.

### Google Gemini API

#### ForgeTM Project Key

- **Key Name**: ForgeTM
- **Project ID**: gen-lang-client-0173572845
- **Created**: October 25, 2025
- **Quota Tier**: Free tier
- **Environment Variable**: `GEMINI_API_KEY_FORGETM`

#### Default/Shared Key

- **Key Name**: Default Gemini API Key
- **Project ID**: gen-lang-client-0804080294
- **Created**: October 25, 2025
- **Quota Tier**: Free tier
- **Environment Variable**: `GEMINI_API_KEY`

### DeepSeek API

#### ForgeTM/GoblinOS DeepKey

- **Key Name**: Default
- **Created**: October 25, 2025
- **Environment Variable**: `DEEPSEEK_API_KEY`
- **Usage**: Shared between ForgeTM and GoblinOS projects

### Polygon API

#### Polygon Default Key

- **Key Name**: Default
- **Created**: October 25, 2025
- **Environment Variable**: `POLYGON_API_KEY`
- **Usage**: Financial market data and trading information

### OpenAI API

#### Default Key

- **Key Name**: Default
- **Created**: October 25, 2025
- **Environment Variable**: `OPENAI_API_KEY`
- **Usage**: Used for GPT-4o, GPT-4o-mini, and text-embedding-3-small models

### Pinecone Vector Database

#### Default Key

- **Key Name**: Default
- **Created**: October 26, 2025
- **Environment Variable**: `PINECONE_API_KEY`
- **Environment Variable (Region)**: `PINECONE_ENVIRONMENT`
- **Environment Variable (Index)**: `PINECONE_INDEX_NAME`
- **Environment Variable (Dimension)**: `PINECONE_DIMENSION`
- **Usage**: Vector database for RAG (Retrieval-Augmented Generation) functionality
- **Index Name**: `forgetm-rag`
- **Dimension**: `1536` (for OpenAI text-embedding-ada-002)

### LiteLLM Proxy

#### Proxy API Key

- **Key Name**: Proxy
- **Default Value**: `proxy` (development)
- **Environment Variable**: `LITELLM_API_KEY`
- **URL**: `http://localhost:4000` (development)
- **Environment Variable (URL)**: `LITELLM_URL`
- **Usage**: Unified gateway for all LLM providers (Ollama, OpenAI, DeepSeek, Gemini)
- **Note**: In production, use a secure random key and HTTPS endpoint

## File Structure

```text
ForgeMonorepo/
  .credentials.vault.example  # Template for credential storage (tracked)
  .credentials.vault          # Actual credentials (NEVER tracked)
  ForgeTM/
    .env.example              # Environment template (tracked)
    .env                      # Actual environment (NEVER tracked)
  GoblinOS/
    .env.example              # Environment template (tracked)
    .env                      # Actual environment (NEVER tracked)
```

## Setup Instructions

### First-Time Setup

1. **Copy environment templates**:

   ```bash
   # From repo root
   cp ForgeTM/.env.example ForgeTM/.env
   cp GoblinOS/.env.example GoblinOS/.env
   cp .credentials.vault.example .credentials.vault
   ```

2. **Fill in actual credentials**:
   - Edit `.credentials.vault` with the actual API keys
   - Update project-specific `.env` files as needed

3. **Verify .gitignore**:

   ```bash
   # Ensure these patterns are ignored
   git check-ignore .credentials.vault
   git check-ignore ForgeTM/.env
   git check-ignore GoblinOS/.env
   ```

### Loading Credentials

**Option 1: Manual Environment Variables** (Development)

```bash
# Load from .env file
export $(cat ForgeTM/.env | grep -v '^#' | xargs)
```

**Option 2: Secret Manager** (Production)

- AWS Secrets Manager
- Azure Key Vault
- Google Secret Manager
- HashiCorp Vault

## Security Best Practices

### ✅ DO

- **Always** use `.env.example` templates for documentation
- **Rotate keys** every 90 days (see rotation schedule below)
- **Use different keys** for development, staging, and production
- **Store production keys** in a secure secret management service
- **Audit key usage** regularly
- **Revoke compromised keys** immediately
- **Use environment-specific keys** when possible

### ❌ DON'T

- **Never** commit `.env` or `.credentials.vault` files
- **Never** hardcode API keys in source code
- **Never** share keys via chat, email, or unencrypted channels
- **Never** use production keys in development
- **Never** log API keys (even partially)

## Key Rotation Schedule

| Provider      | Rotation Frequency | Last Rotation | Next Rotation |
|---------------|-------------------|---------------|---------------|
| Gemini        | Every 90 days     | Oct 25, 2025  | Jan 23, 2026  |
| DeepSeek      | Every 90 days     | Oct 25, 2025  | Jan 23, 2026  |
| OpenAI        | Every 90 days     | Oct 25, 2025  | Jan 23, 2026  |
| Polygon       | Every 90 days     | Oct 25, 2025  | Jan 23, 2026  |
| Pinecone      | Every 90 days     | Oct 26, 2025  | Jan 24, 2026  |
| LiteLLM Proxy | As needed         | N/A           | N/A           |

### Rotation Procedure

1. **Generate new key** in provider dashboard
2. **Update `.credentials.vault`** with new key
3. **Update environment-specific `.env`** files
4. **Test** in development environment
5. **Deploy** to staging, verify
6. **Deploy** to production during maintenance window
7. **Revoke old key** after 24-48 hour grace period
8. **Update rotation schedule** in this document

## Environment Mapping

### Development

- Use `.env` files with development-tier keys
- Gemini: Default key (gen-lang-client-0804080294)
- DeepSeek: Default key
- OpenAI: Default key
- Polygon: Default key
- Pinecone: Default key (us-east-1 region, forgetm-rag index)
- LiteLLM: Local proxy (`http://localhost:4000`, key: `proxy`)
- Ollama: Local inference (`http://localhost:11434`, no API key required)

### Staging

- Use separate staging keys (create new keys for staging)
- Consider using the same infrastructure as production but with separate keys

### Production

- **MUST** use secure secret management service
- **NEVER** store production keys in `.credentials.vault`
- Reference by ARN/URI:
  - AWS: `arn:aws:secretsmanager:region:account:secret:key-name`
  - Azure: `https://vault-name.vault.azure.net/secrets/secret-name`
  - GCP: `projects/PROJECT_ID/secrets/SECRET_NAME/versions/latest`

## Usage Examples

### Python (ForgeTM Backend)

```python
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Access API keys
gemini_key = os.getenv("GEMINI_API_KEY")
deepseek_key = os.getenv("DEEPSEEK_API_KEY")

# Use in API clients
from google.generativeai import configure
configure(api_key=gemini_key)
```

### TypeScript/Node.js (GoblinOS)

```typescript
import { config } from 'dotenv';

// Load environment variables
config();

// Access API keys
const geminiKey = process.env.GEMINI_API_KEY;
const deepseekKey = process.env.DEEPSEEK_API_KEY;

// Use in API clients
import { GoogleGenerativeAI } from '@google/generative-ai';
const genAI = new GoogleGenerativeAI(geminiKey);
```

## Monitoring & Auditing

### Usage Tracking

- Monitor API quota usage in provider dashboards
- Set up alerts for quota thresholds (e.g., 80% usage)
- Review usage logs monthly

### Security Auditing

- Review access logs for unusual patterns
- Audit which services/people have access to keys
- Verify key rotation compliance quarterly

## Incident Response

### If a Key is Compromised

1. **Immediately revoke** the compromised key in provider dashboard
2. **Generate new key** following rotation procedure
3. **Update all environments** with new key
4. **Audit access logs** to determine scope of compromise
5. **Document incident** with timeline and remediation steps
6. **Review security practices** to prevent recurrence

### Contact Information

- **Security Lead**: @fuaadabdullah
- **Workspace Owner**: @fuaadabdullah
- **GoblinOS Team**: Responsible for cross-repo credential management

## References

- [Twelve-Factor App: Config](https://12factor.net/config)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- Google Gemini API: `https://ai.google.dev/`
- DeepSeek API: `https://api.deepseek.com/`
- Polygon API: `https://polygon.io/`

---

**Last Updated**: October 25, 2025
**Version**: 1.0.0
**Owner**: GoblinOS
