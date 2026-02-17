# ✅ Model Server Configuration - Complete Setup Guide

## Overview

Your Goblin Assistant backend is now configured to use **remote model servers** instead of running models on Fly.io. This approach provides:

- **Lower costs**: Fly.io machines are smaller ($0.30/hr vs larger ML instances)
- **Better scaling**: Use serverless (RunPod) for auto-scaling or dedicated GPU for consistency
- **Flexibility**: Switch between providers or scale independently
- **Faster deploys**: Minimal dependencies = quick Fly.io build times

## What Changed

### 1. **Backend (Fly.io) - Now Lightweight**

- ✅ Dockerfile.prod: Removed all ML/model dependencies (transformers, torch, accelerate, etc.)
- ✅ fly.toml: Reduced resources (1GB RAM, 1 CPU instead of 4GB/2CPU)
- ✅ Backend only runs FastAPI + routing logic
- ⏱️ **Build time reduced**: ~5 min (vs 20+ min with models)

### 2. **Model Server Registry**

- ✅ Created `backend/config/model_servers.py`
- ✅ Automatic failover between servers
- ✅ Health checks every 30 seconds
- ✅ Support for RunPod, Ollama, llama.cpp, vLLM, Aliyun

### 3. **Documentation & Setup Scripts**

- ✅ `MODEL_SERVER_DEPLOYMENT.md` - Detailed deployment guide
- ✅ `setup_model_servers.sh` - Interactive setup script

## Quick Start (Choose One)

### Option A: RunPod Serverless (Recommended)

**Best for**: Auto-scaling, pay-per-use, no server management

```bash
# 1. Create RunPod account & serverless endpoint
# 2. Get endpoint ID & API key
# 3. Run setup:
bash setup_model_servers.sh  # Choose option 1

# 4. Deploy
cd apps/goblin-assistant-root
flyctl deploy -a goblin-backend
```

### Option B: Alibaba Cloud GPU

**Best for**: Consistent performance, guaranteed resources, fallback server

```bash
# 1. Create Alibaba GPU instance (use existing setup-alibaba-gpu.sh)
# 2. Install Ollama on instance
# 3. Run setup:
bash setup_model_servers.sh  # Choose option 2

# 4. Deploy
flyctl deploy -a goblin-backend
```

### Option C: On-Premises (Local Machine)

**Best for**: Development, testing, or existing GPU hardware

```bash
# 1. Install Ollama: https://ollama.ai
# 2. Start: ollama serve
# 3. Expose publicly (ngrok, Cloudflare Tunnel, etc.)
# 4. Run setup:
bash setup_model_servers.sh  # Choose option 3

# 5. Deploy
flyctl deploy -a goblin-backend
```

### Option D: All Three (Multi-Server Failover) ⭐ RECOMMENDED

**Best for**: Production reliability

```bash
bash setup_model_servers.sh  # Choose option 4
# Configures RunPod → Aliyun → On-prem with automatic failover
```

## Environment Variables (Fly.io Secrets)

Set these via `fly secrets set`:

```bash
# RunPod (Primary)
fly secrets set RUNPOD_ENDPOINT_URL="https://api.runpod.io/v1/..."
fly secrets set RUNPOD_API_KEY="rpa_..."

# Aliyun (Secondary Failover)
fly secrets set ALIYUN_MODEL_SERVER_URL="http://aliyun-ip:11434"
fly secrets set ALIYUN_MODEL_SERVER_KEY=""  # Optional

# On-Prem (Tertiary Fallback)
fly secrets set ONPREM_MODEL_SERVER_URL="https://your-domain.com"
fly secrets set ONPREM_MODEL_SERVER_KEY=""  # Optional
```

## Testing

After deployment:

```bash
# 1. Check backend health
curl https://api.goblin.fuaad.ai/health

# 2. Check model servers status
curl https://api.goblin.fuaad.ai/health/models

# 3. Test inference
curl -X POST https://api.goblin.fuaad.ai/v1/inference \
  -H "X-API-Key: your-license-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "tinyliama",
    "prompt": "Write a short poem about AI",
    "max_tokens": 256
  }'

# 4. Check Fly.io logs
fly logs -a goblin-backend
```

## Recommended Models per Server

### RunPod (Good Options)

```
- TinyLlama 1.1B (fast, low cost)
- Qwen2.5 3B (good balance)
- Phi-3 Mini 4K (efficient)
```

### Aliyun GPU (Medium/Large Models)

```
- Qwen2.5 7B/14B
- Mistral 7B
- Llama 2 13B
```

### On-Prem (Your Choice)

```
- Depends on your GPU
- If NVIDIA 4090: Can run 70B models
- If MacBook Pro: 7B-13B models
```

## Costs Comparison

| Option              | Compute Cost/Month | Notes                  |
| ------------------- | ------------------ | ---------------------- |
| Fly.io 4GB          | $15                | API-only (no models)   |
| RunPod Serverless   | ~$50-200           | Pay per inference      |
| Aliyun GPU Instance | ~$100-300          | 24/7 dedicated         |
| On-Prem             | $0                 | Electricity + hardware |

**Total Recommended**: Fly.io ($15) + RunPod ($100) + Aliyun ($200) = ~$315/mo for production HA

## Troubleshooting

### No model servers available

```bash
# 1. Check environment variables
fly secrets list

# 2. Test server directly
curl http://server-url:11434/api/tags  # Ollama
curl http://server-url:8080/v1/models  # llama.cpp
curl https://api.runpod.io/v1/endpoint-id/status  # RunPod

# 3. Check Fly.io logs
fly logs -a goblin-backend
```

### Slow inference

- RunPod serverless can be slow if it cold-starts (up to 30s)
- Use Aliyun as fallback for faster inference
- Implement request queueing for batch processing

### High costs

- Use smaller models (TinyLlama vs 70B)
- Batch requests to reduce overhead
- Consider on-prem for high-volume usage

## Next Steps

1. **Pick your server option** (A, B, C, or D)
2. **Run `setup_model_servers.sh`**
3. **Deploy**: `flyctl deploy -a goblin-backend`
4. **Test**: `curl https://api.goblin.fuaad.ai/health/models`
5. **Monitor**: `fly logs -a goblin-backend`

## Files Modified

- ✅ `Dockerfile.prod` - Removed ML dependencies
- ✅ `fly.toml` - Reduced resources
- ✅ `backend/config/model_servers.py` - New registry module
- ✅ `.dockerignore` - Already optimized

## Support

For issues:

1. Check `MODEL_SERVER_DEPLOYMENT.md` for detailed setup
2. Review logs: `fly logs -a goblin-backend`
3. Test model server directly with curl
4. Check firewall rules allow Fly.io → model server

---

**Ready to deploy!** Your models are no longer on Fly.io. 🚀
