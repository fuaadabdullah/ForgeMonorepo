#!/usr/bin/env bash
set -euo pipefail

echo "[$(date --iso-8601=seconds)] Starting Goblin backend entrypoint"

# AI models run on remote servers (RunPod, Aliyun, on-prem).
# This container is API-only — no local model loading.

# Ensure both package-style (`backend.*`) and legacy flat imports resolve.
export PYTHONPATH="/app/backend:/app:${PYTHONPATH:-}"
echo "[$(date --iso-8601=seconds)] PYTHONPATH=${PYTHONPATH}"

echo "Working dir: $(pwd)"
python -c 'import sys; print("sys.path head:", sys.path[:4])'

# Start uvicorn with the expected import
# NOTE: this uses uvicorn backend.main:app — change if your package name differs
cd /app
# Trust Fly's proxy headers so redirects keep https and client IPs are correct.
exec uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8001} --proxy-headers --forwarded-allow-ips="*"
