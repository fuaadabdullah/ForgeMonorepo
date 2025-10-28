# Quick Reference: API Keys Setup

## For New Developers

**First-time setup (3 steps):**

```bash
# 1. Copy environment templates
cp ForgeTM/.env.example ForgeTM/.env
cp GoblinOS/.env.example GoblinOS/.env

# 2. Ask team lead for API keys, then edit .env files with actual values
# 3. Verify files are ignored by git
git check-ignore ForgeTM/.env GoblinOS/.env
```

## Available API Keys

| Provider | Key Variable | Project/Key Name |
|----------|--------------|------------------|
| **Gemini (ForgeTM)** | `GEMINI_API_KEY_FORGETM` | gen-lang-client-0173572845 |
| **Gemini (Default)** | `GEMINI_API_KEY` | gen-lang-client-0804080294 |
| **DeepSeek** | `DEEPSEEK_API_KEY` | ForgeTM/GoblinOS DeepKey |
| **Polygon** | `POLYGON_API_KEY` | Default |

## Where to Store Keys

- **Development**: Local `.env` files (auto-ignored by git)
- **Staging**: Separate keys in secure vault
- **Production**: AWS Secrets Manager / Azure Key Vault (NEVER in code)

## Loading Keys in Code

**Python:**
```python
import os
from dotenv import load_dotenv
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
```

**TypeScript/Node.js:**
```typescript
import { config } from 'dotenv';
config();
const apiKey = process.env.GEMINI_API_KEY;
```

## Security Rules (⚠️ CRITICAL)

✅ **DO:**
- Use `.env` files for local development
- Rotate keys every 90 days
- Store production keys in secret manager

❌ **NEVER:**
- Commit `.env` files to git
- Hardcode keys in source code
- Share keys via chat/email
- Use production keys in development
- Log API keys (even partially)

## Need Help?

- Full docs: `API_KEYS_MANAGEMENT.md`
- Security lead: @fuaadabdullah
- Workspace owner: @fuaadabdullah

---

**Next Key Rotation**: January 19, 2026
