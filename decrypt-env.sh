#!/bin/bash
# SOPS Secrets Decryption Script
# Usage: ./decrypt-env.sh [project]
# If no project specified, decrypts all secrets.enc.yaml files

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if sops is installed
if ! command -v sops &> /dev/null; then
    echo -e "${RED}Error: sops is not installed. Install with: brew install sops${NC}"
    exit 1
fi

# Check if age key exists
if [ ! -f ".sops/age-key.txt" ]; then
    echo -e "${RED}Error: Age key not found at .sops/age-key.txt${NC}"
    echo -e "${YELLOW}Generate a key with: age-keygen -o .sops/age-key.txt${NC}"
    exit 1
fi

# Set SOPS_AGE_KEY_FILE environment variable
export SOPS_AGE_KEY_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.sops/age-key.txt"

decrypt_env() {
    local project="$1"
    local enc_file="$project/secrets.enc.yaml"

    if [ "$project" = "ForgeTM" ]; then
        local secrets_file="$project/apps/backend/.env"
        if [ -f "$enc_file" ]; then
            echo -e "${YELLOW}Decrypting $enc_file to $secrets_file...${NC}"
            if sops --decrypt "$enc_file" > "$secrets_file"; then
                echo -e "${GREEN}✓ Successfully decrypted $secrets_file${NC}"
            else
                echo -e "${RED}✗ Failed to decrypt $enc_file${NC}"
                return 1
            fi
        else
            echo -e "${YELLOW}No encrypted secrets file found for $project${NC}"
        fi
    else
        local secrets_file="$project/secrets.yaml"
        if [ -f "$enc_file" ]; then
            echo -e "${YELLOW}Decrypting $enc_file...${NC}"
            if sops --decrypt "$enc_file" > "$secrets_file"; then
                echo -e "${GREEN}✓ Successfully decrypted $secrets_file${NC}"
            else
                echo -e "${RED}✗ Failed to decrypt $enc_file${NC}"
                return 1
            fi
        else
            echo -e "${YELLOW}No encrypted secrets file found for $project${NC}"
        fi
    fi
}

# Main logic
if [ $# -eq 0 ]; then
    # Decrypt all projects
    echo "Decrypting environment files for all projects..."
    decrypt_env "GoblinOS"
    decrypt_env "ForgeTM"
else
    # Decrypt specific project
    project="$1"
    if [ "$project" = "goblinos" ] || [ "$project" = "GoblinOS" ]; then
        decrypt_env "GoblinOS"
    elif [ "$project" = "forgetm" ] || [ "$project" = "ForgeTM" ]; then
        decrypt_env "ForgeTM"
    else
        echo -e "${RED}Unknown project: $project${NC}"
        echo "Usage: $0 [goblinos|forgetm]"
        exit 1
    fi
fi

echo -e "${GREEN}Environment decryption complete!${NC}"
echo -e "${YELLOW}Remember: Never commit .env files to version control${NC}"
