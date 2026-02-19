# Manual Deployment Instructions for Goblin Assistant

## Current Status

✅ All Fly.io secrets are configured (78 secrets deployed)
✅ start.sh production script updated
✅ Dockerfile.prod fixed (removed curl dependency)
✅ .dockerignore enhanced for metadata file exclusion  
⚠️ External volume has extended attribute (xattr) issues preventing automated deployment

## Issues Encountered

The "GOBLINOS 1" external volume has persistent xattr/AppleDouble file issues that cause Docker builds to fail with:

```
error from sender: failed to xattr /Volumes/GOBLINOS 1/.../._file: operation not permitted
```

## Recommended Solutions

### Option 1: Deploy from Internal Drive (FASTEST)

```bash
# 1. Copy project to internal drive
cd ~/Desktop
git clone https://github.com/fuaadabdullah/ForgeMonorepo.git
cd ForgeMonorepo/apps/goblin-assistant

# 2. Deploy (no xattr issues on internal drive)
fly deploy --app goblin-backend --remote-only

# 3. Verify deployment
curl https://goblin-backend.fly.dev/health
```

### Option 2: Clean and Deploy from External Volume

```bash
# 1. Remove ALL metadata files recursively (requires sudo password)
cd "/Volumes/GOBLINOS 1/ForgeMonorepo-corrupted/apps/goblin-assistant"
sudo find . -name "._*" -type f -delete
sudo find . -name ".DS_Store" -type f -delete

# 2. Clear extended attributes
sudo xattr -rc .

# 3. Deploy with remote builder
fly deploy --app goblin-backend --remote-only

# 4. If still failing, use local builder
fly deploy --app goblin-backend --local-only
```

### Option 3: Deploy from Temporary Clean Copy

```bash
# 1. Create clean copy in /tmp
cd /tmp
rm -rf goblin-deploy
mkdir goblin-deploy

# 2. Copy files without metadata (ditto handles this best)
ditto --noextattr --norsrc \
  "/Volumes/GOBLINOS 1/ForgeMonorepo-corrupted/apps/goblin-assistant" \
  /tmp/goblin-deploy

# 3. Deploy from clean location
cd /tmp/goblin-deploy
fly deploy --app goblin-backend

# 4. Cleanup
rm -rf /tmp/goblin-deploy
```

### Option 4: Push to Git and Deploy from Repository

```bash
# 1. Commit and push changes
cd "/Volumes/GOBLINOS 1/ForgeMonorepo-corrupted"
git add apps/goblin-assistant/start.sh
git add apps/goblin-assistant/Dockerfile.prod
git add apps/goblin-assistant/.dockerignore
git commit -m "fix: Update production deployment files"
git push

# 2. Deploy from git (Fly can build from GitHub)
cd apps/goblin-assistant
fly deploy --app goblin-backend --remote-only
```

## Verification Steps

After successful deployment:

```bash
# 1. Check deployment status
fly status --app goblin-backend

# 2. View logs
fly logs --app goblin-backend

# 3. Test health endpoint
curl https://goblin-backend.fly.dev/health

# 4. Test models endpoint
curl https://goblin-backend.fly.dev/v1/routing/models

# 5. Test providers endpoint
curl https://goblin-backend.fly.dev/v1/routing/providers
```

## Frontend Deployment (After Backend is Live)

```bash
# Option A: Deploy to Vercel (RECOMMENDED)
cd "/Volumes/GOBLINOS 1/ForgeMonorepo-corrupted/apps/goblin-assistant"
vercel --prod

# Set environment variable in Vercel Dashboard:
# NEXT_PUBLIC_API_BASE_URL=https://goblin-backend.fly.dev

# Option B: Build locally and deploy
pnpm build
vercel --prod --prebuilt
```

## Troubleshooting

### If deployment fails with "Out of Memory"

```bash
# Increase VM memory in fly.toml
fly scale memory 6144 --app goblin-backend
fly deploy --app goblin-backend
```

### If health check fails

```bash
# Check logs for errors
fly logs --app goblin-backend

# Common issues:
# - Database connection failure (check SUPABASE_URL secret)
# - Redis connection failure (check REDIS_URL secret)
# - Port mismatch (should be 8001)
```

### If build times out

```bash
# Use remote builder with longer timeout
fly deploy --app goblin-backend --remote-only --build-timeout 30m
```

## Next Steps After Backend Deployment

1. ✅ Backend deployed and healthy
2. Set up custom domain (optional):

   ```bash
   fly certs create goblin-api.yourdomain.com --app goblin-backend
   ```

3. Deploy frontend to Vercel

4. Run end-to-end smoke tests:

   ```bash
   # Test chat completion
   curl -X POST https://goblin-backend.fly.dev/v1/chat/completions \
     -H "Content-Type: application/json" \
     -d '{
       "model": "mistral:7b",
       "messages": [{"role": "user", "content": "Hello!"}],
       "max_tokens": 100
     }'
   ```

5. Monitor performance:
   ```bash
   fly dashboard --app goblin-backend
   ```

## Files Modified

1. `start.sh` - Created production startup script with uvicorn
2. `Dockerfile.prod` - Fixed curl dependency, moved apt-get before COPY
3. `.dockerignore` - Enhanced to exclude \*_.\__ patterns recursively

## All Required Secrets (Already Configured ✅)

All 78 secrets are deployed on Fly.io. No action needed.
