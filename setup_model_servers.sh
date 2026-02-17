#!/bin/bash
# Quick-start model server setup for Goblin Assistant
# Automatically configures RunPod, Aliyun, or On-Prem servers

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Goblin Assistant - Model Server Setup${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Menu
echo -e "${YELLOW}Which model server would you like to set up?${NC}"
echo "1) RunPod Serverless (recommended for auto-scaling)"
echo "2) Alibaba Cloud GPU (for burst/fallback capacity)"
echo "3) On-Premises/Local (your own hardware)"
echo "4) All of the above (multi-server failover)"
echo ""

read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        setup_runpod
        ;;
    2)
        setup_aliyun
        ;;
    3)
        setup_onprem
        ;;
    4)
        setup_runpod
        setup_aliyun
        setup_onprem
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

function setup_runpod() {
    echo ""
    echo -e "${YELLOW}Setting up RunPod Serverless...${NC}"
    echo ""
    echo "Prerequisites:"
    echo "  1. Create RunPod account: https://www.runpod.io"
    echo "  2. Create serverless endpoint using a model container:"
    echo "     - Use: runpod/stable-diffusion or custom ollama image"
    echo "     - Get endpoint ID from RunPod dashboard"
    echo ""
    
    read -p "Enter RunPod Endpoint ID (e.g., your-endpoint-id): " endpoint_id
    read -p "Enter RunPod API Key (from https://account.runpod.io/api-keys): " api_key
    
    if [ -z "$endpoint_id" ] || [ -z "$api_key" ]; then
        echo -e "${RED}Error: Endpoint ID and API key required${NC}"
        return 1
    fi
    
    # Test connection
    echo ""
    echo -e "${YELLOW}Testing RunPod connection...${NC}"
    response=$(curl -s -X POST "https://api.runpod.io/v1/$endpoint_id/run" \
        -H "Authorization: Bearer $api_key" \
        -H "Content-Type: application/json" \
        -d '{"input": {"test": true}}' || echo "{}")
    
    if echo "$response" | grep -q "error\|error_code"; then
        echo -e "${RED}✗ Connection failed. Check your endpoint ID and API key.${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✓ Connection successful${NC}"
    
    # Set Fly.io secrets
    echo ""
    echo -e "${YELLOW}Setting Fly.io secrets...${NC}"
    
    fly secrets set \
        RUNPOD_ENDPOINT_URL="https://api.runpod.io/v1/$endpoint_id" \
        RUNPOD_API_KEY="$api_key"
    
    echo -e "${GREEN}✓ RunPod configured${NC}"
}

function setup_aliyun() {
    echo ""
    echo -e "${YELLOW}Setting up Alibaba Cloud GPU...${NC}"
    echo ""
    echo "Prerequisites:"
    echo "  1. Have an Alibaba Cloud account"
    echo "  2. Created GPU instance (use setup-alibaba-gpu.sh)"
    echo "  3. Installed Ollama on the instance"
    echo ""
    
    read -p "Enter Alibaba GPU instance public IP: " aliyun_ip
    read -p "Enter Ollama API port (default 11434): " aliyun_port
    aliyun_port=${aliyun_port:-11434}
    read -p "Enter API key (or leave blank): " aliyun_key
    
    if [ -z "$aliyun_ip" ]; then
        echo -e "${RED}Error: IP address required${NC}"
        return 1
    fi
    
    # Test connection
    echo ""
    echo -e "${YELLOW}Testing Alibaba connection...${NC}"
    response=$(curl -s "http://$aliyun_ip:$aliyun_port/api/tags" || echo "{}")
    
    if echo "$response" | grep -q "models"; then
        echo -e "${GREEN}✓ Connection successful${NC}"
    else
        echo -e "${YELLOW}⚠ Could not verify connection. Proceeding anyway...${NC}"
    fi
    
    # Set Fly.io secrets
    echo ""
    echo -e "${YELLOW}Setting Fly.io secrets...${NC}"
    
    fly secrets set \
        ALIYUN_MODEL_SERVER_URL="http://$aliyun_ip:$aliyun_port" \
        ALIYUN_MODEL_SERVER_KEY="$aliyun_key"
    
    echo -e "${GREEN}✓ Alibaba configured${NC}"
    
    # Suggest models to pull
    echo ""
    echo -e "${YELLOW}Suggested models to install on Alibaba:${NC}"
    cat << 'EOF'
    Run these on your Alibaba instance:
    
    ssh ubuntu@<aliyun-ip> <<'EOL'
    ollama pull tinyliama      # Small, fast model
    ollama pull qwen2.5:3b     # Good balance
    ollama pull phi-3-mini     # Efficient
    ollama pull neural-chat    # Conversational
    EOL
EOF
}

function setup_onprem() {
    echo ""
    echo -e "${YELLOW}Setting up On-Premises/Local Server...${NC}"
    echo ""
    echo "Prerequisites:"
    echo "  1. Have a computer with GPU (or CPU for testing)"
    echo "  2. Install Ollama: https://ollama.ai"
    echo "  3. Start service: ollama serve"
    echo "  4. Expose publicly (ngrok, domain, Cloudflare Tunnel, etc.)"
    echo ""
    
    read -p "Enter model server URL (e.g., https://my-domain.com or https://ngrok-url): " onprem_url
    read -p "Enter API key (or leave blank): " onprem_key
    
    if [ -z "$onprem_url" ]; then
        echo -e "${RED}Error: URL required${NC}"
        return 1
    fi
    
    # Test connection
    echo ""
    echo -e "${YELLOW}Testing on-prem connection...${NC}"
    response=$(curl -s "$onprem_url/api/tags" || echo "{}")
    
    if echo "$response" | grep -q "models\|error"; then
        echo -e "${GREEN}✓ Server reachable${NC}"
    fi
    
    # Set Fly.io secrets
    echo ""
    echo -e "${YELLOW}Setting Fly.io secrets...${NC}"
    
    fly secrets set \
        ONPREM_MODEL_SERVER_URL="$onprem_url" \
        ONPREM_MODEL_SERVER_KEY="$onprem_key"
    
    echo -e "${GREEN}✓ On-premises configured${NC}"
    
    # Suggest setup
    echo ""
    echo -e "${YELLOW}Quick setup with ngrok:${NC}"
    cat << 'EOF'
    1. Install ngrok: brew install ngrok
    2. On your machine, start Ollama: ollama serve
    3. In new terminal, expose it: ngrok http 11434
    4. Copy the URL (e.g., https://abc123.ngrok.io)
    5. Use that URL above
EOF
}

# Final step
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

# Verify secrets
echo ""
echo -e "${YELLOW}Verifying secrets set in Fly.io...${NC}"
sleep 2

if fly secrets list | grep -q RUNPOD; then
    echo -e "${GREEN}✓ RunPod secrets set${NC}"
fi

if fly secrets list | grep -q ALIYUN; then
    echo -e "${GREEN}✓ Alibaba secrets set${NC}"
fi

if fly secrets list | grep -q ONPREM; then
    echo -e "${GREEN}✓ On-prem secrets set${NC}"
fi

echo ""
echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Deploy to Fly.io:"
echo "     cd apps/goblin-assistant-root && flyctl deploy -a goblin-backend"
echo ""
echo "  2. Test model server health:"
echo "     curl https://api.goblin.fuaad.ai/health/models"
echo ""
echo "  3. Try inference:"
echo "     curl -X POST https://api.goblin.fuaad.ai/v1/inference \\"
echo "       -H 'X-API-Key: your-license-key' \\"
echo "       -H 'Content-Type: application/json' \\"
echo "       -d '{\"model\": \"tinyliama\", \"prompt\": \"Hello\"}'"
echo ""
