#!/bin/bash

# Goblin Assistant Backend Production Deployment Script
# Supports Fly.io deployment platform

set -e

echo "🚀 Deploying Goblin Assistant Backend to Production (Fly.io)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Fly.io deployment
deploy_to_fly() {
    print_step "Setting up Fly.io deployment..."

    # Fly depot builder can fail on macOS AppleDouble files (._*). Clean them proactively.
    print_status "Cleaning AppleDouble files..."
    find . -name '._*' -type f -delete 2>/dev/null || true
    find . -name '.DS_Store' -type f -delete 2>/dev/null || true
    # Also clean with dot_clean if available
    if command -v dot_clean &> /dev/null; then
        dot_clean . 2>/dev/null || true
    fi
    # Clean git files that might have metadata
    git clean -fdX 2>/dev/null || true
    # Prevent creation of new ._ files during deployment
    export COPYFILE_DISABLE=1
    export COPY_EXTENDED_ATTRIBUTES_DISABLE=1

    # Verify cleanup
    if find . -name '._*' -type f | grep -q .; then
        print_warning "Warning: Some AppleDouble files still exist. Deployment may fail."
        find . -name '._*' -type f | head -5
    else
        print_status "AppleDouble files cleaned successfully."
    fi

    # Check if Fly CLI is available
    if ! command -v fly &> /dev/null; then
        print_warning "Fly CLI not found. Please install it:"
        print_status "curl -L https://fly.io/install.sh | sh"
        manual_fly_instructions
        return
    fi

    if [ ! -f "fly.toml" ]; then
        print_warning "fly.toml not found in $(pwd)."
        print_status "Create it first (recommended) with: fly launch --no-deploy"
        manual_fly_instructions
        return
    fi

    print_status "Deploying to Fly.io..."
    fly deploy

    print_status "Fly.io deployment completed ✓"
}

# Manual instructions for Fly.io
manual_fly_instructions() {
    echo ""
    print_status "Manual Fly.io Deployment Instructions:"
    echo "1. Go to https://fly.io"
    echo "2. Install Fly CLI: curl -L https://fly.io/install.sh | sh"
    echo "3. Login: fly auth login"
    echo "4. Create app: fly launch --name goblin-backend --region iad --no-deploy"
    echo "5. Create volume: fly volumes create data --region iad --size 10"
    echo "6. Set secrets: fly secrets set <KEY>=<VALUE> for each env var"
    echo "7. Deploy: fly deploy"
    echo ""
}

# Get deployment URL
get_deployment_url() {
    print_step "Getting deployment URL..."

    if command -v jq &> /dev/null; then
        FLY_URL=$(fly status --json | jq -r '.Hostname // empty')
        if [ -n "$FLY_URL" ]; then
            print_status "Backend deployed at: https://$FLY_URL"
        fi
    else
        print_warning "jq not found; skipping automated URL lookup."
    fi
}

# Main deployment function
main() {
    echo "Goblin Assistant Backend Production Deployment"
    echo "=============================================="
    echo "Platform: $PLATFORM"
    echo ""

    # Run from the app directory so fly.toml/Dockerfile paths resolve consistently.
    cd "$(dirname "$0")"

    if [ ! -f ".env.production" ]; then
        print_warning ".env.production not found; continuing (Fly secrets may already be set)."
    fi

    # Deploy based on platform
    case $PLATFORM in
        "fly")
            deploy_to_fly
            ;;
    esac

    get_deployment_url

    echo ""
    print_status "🎉 Backend deployment initiated!"
    echo ""
    print_status "Next steps:"
    echo "1. Wait for deployment to complete"
    echo "2. Note the backend URL for frontend configuration"
    echo "3. Deploy frontend: ./deploy-vercel.sh"
    echo "4. Test the complete application"
}

# Show usage if no arguments
if [ $# -eq 0 ]; then
    echo "Usage: $0 <platform>"
    echo "Platforms: fly"
    echo ""
    echo "Examples:"
    echo "  $0 fly       # Deploy to Fly.io"
    echo ""
    exit 1
fi

# Run main function
PLATFORM=${1:-"fly"}
case $PLATFORM in
    "fly") ;;
    *)
        print_error "Invalid platform. Use: fly"
        exit 1
        ;;
esac

main
# Test
