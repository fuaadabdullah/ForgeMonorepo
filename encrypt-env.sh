#!/bin/bash
# SOPS Secrets Encryption Script
# Usage: ./encrypt-env.sh [project]
# If no project specified, encrypts all secrets.yaml files

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
export SOPS_AGE_KEY_FILE=".sops/age-key.txt"

encrypt_env() {
    local project="$1"
    local enc_file="$project/secrets.enc.yaml"

    if [ "$project" = "ForgeTM" ]; then
        local secrets_file="$project/apps/backend/.env"
        if [ -f "$secrets_file" ]; then
            echo -e "${YELLOW}Encrypting $secrets_file to $enc_file...${NC}"
            if sops -e -o "$enc_file" "$secrets_file"; then
                echo -e "${GREEN}✓ Successfully encrypted to $enc_file${NC}"
            else
                echo -e "${RED}✗ Failed to encrypt $secrets_file${NC}"
                return 1
            fi
        else
            echo -e "${YELLOW}No .env file found for $project${NC}"
        fi
    else
        local secrets_file="$project/secrets.yaml"
        if [ -f "$secrets_file" ]; then
            echo -e "${YELLOW}Encrypting $secrets_file...${NC}"
            if sops --encrypt "$secrets_file" > "$enc_file"; then
                echo -e "${GREEN}✓ Successfully encrypted to $enc_file${NC}"
                echo -e "${YELLOW}Remember to remove the plain secrets file after verification${NC}"
            else
                echo -e "${RED}✗ Failed to encrypt $secrets_file${NC}"
                return 1
            fi
        else
            echo -e "${YELLOW}No secrets.yaml file found for $project${NC}"
        fi
    fi
}

# Main logic
if [ $# -eq 0 ]; then
    # Encrypt all projects
    echo "Encrypting environment files for all projects..."
    encrypt_env "GoblinOS"
    encrypt_env "ForgeTM"
else
    # Encrypt specific project
    project="$1"
    if [ "$project" = "goblinos" ] || [ "$project" = "GoblinOS" ]; then
        encrypt_env "GoblinOS"
    elif [ "$project" = "forgetm" ] || [ "$project" = "ForgeTM" ]; then
        encrypt_env "ForgeTM"
    else
        echo -e "${RED}Unknown project: $project${NC}"
        echo "Usage: $0 [goblinos|forgetm]"
        exit 1
    fi
fi

echo -e "${GREEN}Environment encryption complete!${NC}"