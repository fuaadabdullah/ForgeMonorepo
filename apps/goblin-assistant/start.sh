#!/usr/bin/env bash
set -euo pipefail

echo "[$(date --iso-8601=seconds)] Starting Goblin backend entrypoint"

# Ensure both package-style (`backend.*`) and legacy flat imports (`errors`, `config`, etc.) resolve.
export PYTHONPATH="/app/backend:/app:${PYTHONPATH:-}"
echo "[$(date --iso-8601=seconds)] PYTHONPATH=${PYTHONPATH}"

# Install TinyLlama dependencies only when missing.
if ! python -c "import transformers, accelerate" >/dev/null 2>&1; then
  echo "[$(date --iso-8601=seconds)] Installing TinyLlama dependencies..."
  pip install --no-cache-dir "transformers>=4.36.0" "accelerate>=0.25.0" || echo "Warning: TinyLlama dependencies installation failed, but continuing..."
fi

echo "Working dir: $(pwd)"
python -c 'import sys; print("sys.path head:", sys.path[:4])'

# Start uvicorn with the expected import
# NOTE: this uses uvicorn backend.main:app — change if your package name differs
cd /app
# Trust Fly's proxy headers so redirects keep https and client IPs are correct.
exec uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8001} --proxy-headers --forwarded-allow-ips="*"
