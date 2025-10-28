#!/usr/bin/env bash
# Phase 3 Infrastructure Setup Script
# Installs Ollama, pulls models, and sets up LiteLLM proxy

set -euo pipefail

echo "🧙‍♂️ Overmind Phase 3: Infrastructure Setup"
echo "==========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
success() {
    echo -e "${GREEN}✓ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if Ollama is installed
echo "Step 1: Checking Ollama installation..."
if command -v ollama &> /dev/null; then
    success "Ollama is installed"
    ollama --version
else
    error "Ollama is not installed"
    echo ""
    echo "Please install Ollama:"
    echo "  macOS: brew install ollama"
    echo "  Linux: curl -fsSL https://ollama.com/install.sh | sh"
    echo "  Or visit: https://ollama.com/download"
    exit 1
fi

# Check if Ollama service is running
echo ""
echo "Step 2: Checking Ollama service..."
if ollama list &> /dev/null; then
    success "Ollama service is running"
else
    warning "Ollama service is not running"
    echo "Starting Ollama..."
    ollama serve &> /dev/null &
    sleep 3
    if ollama list &> /dev/null; then
        success "Ollama service started"
    else
        error "Failed to start Ollama service"
        exit 1
    fi
fi

# Pull required models
echo ""
echo "Step 3: Pulling Ollama models..."
echo "This may take a while depending on your internet connection."
echo ""

models=("llama3.1" "qwen2.5-coder:7b" "nomic-embed-text")

for model in "${models[@]}"; do
    echo "Pulling ${model}..."
    if ollama list | grep -q "^${model}"; then
        success "${model} is already installed"
    else
        ollama pull "${model}"
        success "Pulled ${model}"
    fi
done

# List installed models
echo ""
echo "Installed models:"
ollama list

# Install LiteLLM
echo ""
echo "Step 4: Installing LiteLLM proxy..."
if command -v litellm &> /dev/null; then
    success "LiteLLM is already installed"
    litellm --version
else
    echo "Installing LiteLLM..."
    pip install "litellm[proxy]"
    success "LiteLLM installed"
fi

# Verify LiteLLM config exists
echo ""
echo "Step 5: Verifying LiteLLM configuration..."
config_path="./infra/litellm.config.yaml"
if [ -f "$config_path" ]; then
    success "LiteLLM config found at ${config_path}"
else
    error "LiteLLM config not found at ${config_path}"
    echo "Please ensure you're running this script from the overmind directory"
    exit 1
fi

# Install Node.js dependencies
echo ""
echo "Step 6: Installing Node.js dependencies..."
if [ -f "package.json" ]; then
    pnpm install
    success "Node.js dependencies installed"
else
    error "package.json not found"
    exit 1
fi

# Summary
echo ""
echo "=========================================="
echo "✨ Infrastructure Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Start LiteLLM proxy:"
echo "   cd $(pwd)"
echo "   litellm --config infra/litellm.config.yaml --port 4000"
echo ""
echo "2. Set environment variables in .env:"
echo "   cp .env.example .env"
echo "   # Add your API keys (OPENAI_API_KEY, DEEPSEEK_API_KEY, GEMINI_API_KEY)"
echo ""
echo "3. Test Ollama models:"
echo "   ollama run llama3.1"
echo "   ollama run qwen2.5-coder:7b"
echo ""
echo "4. Verify LiteLLM proxy (in another terminal):"
echo "   curl http://localhost:4000/health"
echo ""
echo "5. Run the Overmind stack:"
echo "   docker-compose up --build"
echo ""
echo "📚 See docs/PHASE3_SETUP.md for detailed instructions"
