#!/bin/bash
set -e

echo "🚀 Starting Goblin Assistant Backend..."

# Install TinyLlama dependencies at runtime if needed
if [ -f /app/requirements_tinylama.txt ]; then
    echo "📦 Installing TinyLlama dependencies..."
    pip install --no-cache-dir -r /app/requirements_tinylama.txt || true
fi

# Set Python path
export PYTHONPATH=/app

# Start uvicorn with production settings
echo "🎯 Starting Uvicorn server on port ${PORT:-8001}..."
exec uvicorn backend.main:app \
    --host 0.0.0.0 \
    --port ${PORT:-8001} \
    --workers 2 \
    --log-level ${LOG_LEVEL:-info} \
    --no-access-log
