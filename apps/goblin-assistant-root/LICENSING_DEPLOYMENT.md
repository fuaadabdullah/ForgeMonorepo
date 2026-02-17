# Goblin Assistant - Licensing & Deployment Guide

## ✅ What Has Been Done

### 1. Licensing Module Created

- **File**: `apps/goblin-assistant-root/backend/licensing.py`
- **Features**:
  - API key validation with 3 tiers (FREE, PRO, ENTERPRISE)
  - Rate limiting per tier (10, 100, 1000 req/min)
  - Token limits per tier (1K, 8K, 32K tokens)
  - Feature flags per tier (RAG, streaming, batch processing, advanced routing)
  - Expiration date support

### 2. Licensing Middleware Added

- **File**: `apps/goblin-assistant-root/backend/middleware/licensing_middleware.py`
- **Features**:
  - Validates API keys from headers, Bearer tokens, or query params
  - Enforces license requirements on all requests
  - Adds license tier to response headers
  - Supports optional feature-level access control via `@require_feature` decorator

### 3. Backend Integration

- **Updated**: `apps/goblin-assistant-root/backend/main.py`
  - Imported licensing middleware
  - Added middleware to FastAPI app pipeline (before rate limiting)
  - Positioned for lightweight enforcement without blocking

### 4. Environment Configuration

- **Updated**: `apps/goblin-assistant-root/.env`
- **Added**:
  ```
  LICENSE_KEYS=dev-free:free,dev-pro:pro,dev-enterprise:enterprise
  DEFAULT_LICENSE_TIER=free
  ENFORCE_LICENSING=false
  ```

## 📋 Deployment Steps

### Step 1: Fix Git State

```bash
cd "/Volumes/GOBLINOS 1/ForgeMonorepo-corrupted"
git rebase --abort
git checkout feat/gradem8-hf-space-2
```

### Step 2: Free Disk Space (if needed)

The main drive has limited space. We need ~100MB for Fly CLI install.

```bash
# Clean up cache files
rm -rf ~/Library/Caches/*
# Or use macOS storage cleanup tools
```

### Step 3: Install Fly CLI

```bash
curl -L https://fly.io/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
fly auth login  # Use your Fly.io credentials
```

### Step 4: Commit Licensing Changes

```bash
cd "/Volumes/GOBLINOS 1/ForgeMonorepo-corrupted"
git add apps/goblin-assistant-root/backend/licensing.py
git add apps/goblin-assistant-root/backend/middleware/licensing_middleware.py
git add apps/goblin-assistant-root/backend/main.py
git add apps/goblin-assistant-root/.env
git commit -m "feat: add API licensing system with tiered access control"
```

### Step 5: Set Fly.io Secrets for Licensing

```bash
cd apps/goblin-assistant-root

# Set license keys (update with your actual keys)
fly secrets set LICENSE_KEYS="prod-key-1:pro,prod-key-2:enterprise:2026-12-31" \
  -a goblin-backend

# Enable licensing in production
fly secrets set ENFORCE_LICENSING="true" -a goblin-backend

# Set default tier for unauthenticated users
fly secrets set DEFAULT_LICENSE_TIER="free" -a goblin-backend
```

### Step 6: Deploy Backend to Fly.io

```bash
# Option A: Using deployment script
cd "/Volumes/GOBLINOS 1/ForgeMonorepo-corrupted"
bash scripts/deploy/deploy-backend.sh --platform flyio --env production

# Option B: Direct fly deploy
cd apps/goblin-assistant-root
fly deploy -a goblin-backend
```

### Step 7: Verify Deployment

```bash
# Check Fly.io app status
fly status -a goblin-backend

# View recent logs
fly logs -a goblin-backend --recent

# Test licensing endpoint
curl -H "X-API-Key: dev-pro" https://api.goblin.fuaad.ai/health
```

### Step 8: Deploy Frontend to Vercel (if needed)

```bash
cd "/Volumes/GOBLINOS 1/ForgeMonorepo-corrupted"
bash deploy-vercel.sh
```

### Step 9: Push to GitHub

```bash
git push origin feat/gradem8-hf-space-2
# Or merge to main:
git checkout main
git merge feat/gradem8-hf-space-2
git push origin main
```

## 🔑 License Key Format

### Configuration

```bash
LICENSE_KEYS="key1:tier1,key2:tier2,key3:tier3:expires"
```

### Examples

```bash
# Simple keys
LICENSE_KEYS="api-free:free,api-pro:pro,api-enterprise:enterprise"

# With expiration dates (ISO format)
LICENSE_KEYS="temp-key:pro:2026-12-31,prod-key:enterprise"

# Mixed
LICENSE_KEYS="dev-key:free,customer1:pro:2026-06-30,customer2:enterprise"
```

## 💡 API Usage

### Without License Enforcement (`ENFORCE_LICENSING=false`)

```bash
# Works with or without API key
curl https://api.goblin.fuaad.ai/chat -H "X-API-Key: any-key"
```

### With License Enforcement (`ENFORCE_LICENSING=true`)

```bash
# Must have valid API key
curl https://api.goblin.fuaad.ai/chat \
  -H "X-API-Key: api-pro" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'

# Using Bearer token
curl https://api.goblin.fuaad.ai/chat \
  -H "Authorization: Bearer api-pro"

# Using query parameter
curl "https://api.goblin.fuaad.ai/chat?api_key=api-pro"
```

### Response Headers

```
X-License-Tier: pro
X-Rate-Limit-Per-Minute: 100
```

## 🎯 Tier Limits

| Feature          | FREE | PRO  | ENTERPRISE |
| ---------------- | ---- | ---- | ---------- |
| Requests/min     | 10   | 100  | 1000       |
| Concurrent       | 2    | 10   | 100        |
| Max Tokens       | 1000 | 8000 | 32000      |
| RAG              | ❌   | ✅   | ✅         |
| Streaming        | ❌   | ✅   | ✅         |
| Batch API        | ❌   | ❌   | ✅         |
| Advanced Routing | ❌   | ✅   | ✅         |

## 🔒 Next Steps (Optional)

1. **Generate Production Keys**: Create secure license keys for production customers
2. **License Management API**: Add endpoints to manage licenses (create, expire, revoke)
3. **Usage Tracking**: Log API key usage for analytics and billing
4. **Webhook Integration**: Send events to billing system when tier limits exceeded
5. **Support Portal**: Allow users to view their license and usage

## 📚 Files Modified

- `apps/goblin-assistant-root/backend/licensing.py` (created)
- `apps/goblin-assistant-root/backend/middleware/licensing_middleware.py` (created)
- `apps/goblin-assistant-root/backend/main.py` (updated)
- `apps/goblin-assistant-root/.env` (updated)

## ⚠️ Known Issues

- **Disk Space**: Main drive has ~115MB free. Free up space before installing Fly CLI on main macOS drive.
- **Git State**: Repository had a rebase in progress that was aborted.

---

**Last Updated**: February 17, 2026
**Status**: Ready for deployment
