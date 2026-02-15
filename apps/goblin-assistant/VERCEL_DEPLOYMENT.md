# Vercel Deployment Guide - Goblin Assistant

## Changes Made

### 1. Fixed Route Hijacking and API Proxy Confusion

**Issue**: Platform-level rewrites and ambiguous API base URLs can break Next.js routing and/or cause API calls to hit the wrong path (for example, double-prefixing `/v1` or hijacking `pages/api/*` routes like `/api/generate`).

**Changes**:
- Standardized frontend API base env vars to the backend **origin** (no `/v1` in the env value).
- Avoided proxying `/api/*` at the Next config layer so Next.js API routes (like `/api/generate`) continue to work.

## Required Setup Steps

### Step 1: Set Vercel Environment Variables

In your Vercel project dashboard, add these environment variables:

```
NEXT_PUBLIC_API_URL = https://goblin-backend.fly.dev
NEXT_PUBLIC_FASTAPI_URL = https://goblin-backend.fly.dev
GOBLIN_BACKEND_URL = https://goblin-backend.fly.dev
NEXT_PUBLIC_DD_APPLICATION_ID = goblin-assistant
NEXT_PUBLIC_DD_ENV = production
NEXT_PUBLIC_DD_CLIENT_TOKEN = <your-datadog-token>
NEXT_PUBLIC_DD_VERSION = 1.0.0
```

### Step 2: Link Repository to Vercel

If the repository isn't already linked:

```bash
# Link to Vercel (if not already linked)
vercel link
```

### Step 3: Configure Project Settings

In Vercel Dashboard:

1. Go to **Settings → General**
2. Set **Root Directory** to: `apps/goblin-assistant`
3. Set **Build Command** to: `npm run build`
4. Set **Install Command** to: `npm install --legacy-peer-deps`
5. Set **Output Directory** to: `.next`

### Step 4: Deploy

```bash
# Push changes to trigger automatic deployment
git push

# OR manually deploy with Vercel CLI
vercel deploy --prod
```

## Verification

After deployment, verify:

1. ✅ Frontend loads at deployment URL
2. ✅ API requests hit `https://goblin-backend.fly.dev/v1/*` (no `/v1/v1/*` double-prefix)
3. ✅ Next API route `POST /api/generate` works (used by the chat UI as a same-origin proxy)
4. ✅ No build failures related to dependency resolution
5. ✅ Environment variables are set correctly

## Troubleshooting

### Issue: Build fails with "npm: command not found"

**Solution**: Ensure the Vercel project settings match this app:
- Root directory: `apps/goblin-assistant`
- Install command: `npm install --legacy-peer-deps`
- Build command: `npm run build`

### Issue: "Module not found" errors during build

**Solution**: 
```bash
# Install deps and build locally from the app directory
cd apps/goblin-assistant
npm install --legacy-peer-deps
npm run build
```

### Issue: API routes not proxying correctly

**Solution**:
- Check that backend URL (goblin-backend.fly.dev) is accessible
- Verify `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_FASTAPI_URL` are set to the backend origin (no `/v1`)

## Monitoring

After deployment, monitor:
- Vercel build logs for any warnings
- Frontend for console errors
- API proxy for failed requests
- Datadog for inference metrics

---

**Last Updated**: February 5, 2026
**Status**: Vercel configuration fixed for pnpm monorepo support
