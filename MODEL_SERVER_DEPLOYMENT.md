#!/bin/bash
"""
Model Server Deployment Guide

This guide sets up model inference on your own servers instead of Fly.io.
Supports RunPod Serverless, Aliyun GPU, and on-prem servers.
"""

## OPTION 1: RunPod Serverless (Recommended for Scale)

# 1. Create RunPod account: https://www.runpod.io

# 2. Create a serverless endpoint or use existing model container

# Environment setup:

export RUNPOD*ENDPOINT_URL="https://api.runpod.io/v1/your-endpoint-id"
export RUNPOD_API_KEY="rpa*..." # From RunPod dashboard

# Test connection:

curl -X POST "$RUNPOD_ENDPOINT_URL/run" \
 -H "Authorization: Bearer $RUNPOD_API_KEY" \
 -H "Content-Type: application/json" \
 -d '{
"input": {
"model": "tinyliama",
"prompt": "Hello"
}
}'

## OPTION 2: Alibaba Cloud GPU Instance

# Using your existing Aliyun setup (from setup-alibaba-gpu.sh):

# 1. Instance type: ecs.gn6v-c8g1.2xlarge (with GPU)

# 2. Install Ollama on the instance:

ssh ubuntu@<aliyun-public-ip> << 'EOF'

# On the Alibaba instance:

curl -fsSL https://ollama.ai/install.sh | sh
ollama serve & # Start Ollama background service

# Pull models

ollama pull tinyliama
ollama pull qwen2.5:3b
ollama pull phi-3-mini

# Security: Only allow internal network or add API key

# Use firewall rules to restrict to Fly.io app IP

EOF

# Environment setup:

export ALIYUN_MODEL_SERVER_URL="http://aliyun-instance-ip:11434"
export ALIYUN_MODEL_SERVER_KEY="" # Optional, set if using API key

# Test connection:

curl "$ALIYUN_MODEL_SERVER_URL/api/tags"

## OPTION 3: On-Premises Setup

# If you have local GPU hardware:

# 1. Install Ollama: https://ollama.ai

# 2. Start service: ollama serve

# 3. Expose via ngrok or your own domain:

# Using ngrok (for tunneling):

ngrok http 11434 # Get public URL

# Environment setup:

export ONPREM_MODEL_SERVER_URL="https://your-domain-or-ngrok.com"
export ONPREM_MODEL_SERVER_KEY="" # If using authentication

# Test:

curl "$ONPREM_MODEL_SERVER_URL/api/tags"

## STEP 3: Configure Fly.io Secrets

# Set these in Fly.io to enable your model servers:

# Primary: RunPod

fly secrets set \
 RUNPOD*ENDPOINT_URL="https://api.runpod.io/v1/..." \
 RUNPOD_API_KEY="rpa*..."

# Secondary: Aliyun

fly secrets set \
 ALIYUN_MODEL_SERVER_URL="http://aliyun-ip:11434" \
 ALIYUN_MODEL_SERVER_KEY=""

# Tertiary: On-prem

fly secrets set \
 ONPREM_MODEL_SERVER_URL="https://your-domain.com" \
 ONPREM_MODEL_SERVER_KEY=""

# Verify secrets set:

fly secrets list

## STEP 4: Deploy Backend to Fly.io

# The backend is now lightweight (no model loading):

cd apps/goblin-assistant-root
flyctl deploy -a goblin-backend

## STEP 5: Test Model Inference

# From your local machine:

curl -X POST https://api.goblin.fuaad.ai/v1/inference \
 -H "X-API-Key: your-license-key" \
 -H "Content-Type: application/json" \
 -d '{
"model": "tinyliama",
"prompt": "Write a short poem",
"max_tokens": 256
}'

# Should route to your model server and return response

## TROUBLESHOOTING

# Check model server health:

curl https://api.goblin.fuaad.ai/health/models

# View logs from Fly.io app:

fly logs -a goblin-backend

# Check specific model server:

# Ollama: curl http://server:11434/api/tags

# RunPod: Check RunPod dashboard for endpoint status

# If "No model servers available":

# 1. Verify environment variables set correctly

# 2. Check firewall rules (allow Fly.io IPs to reach model servers)

# 3. Test model server directly with curl

# 4. Check model server logs for errors
