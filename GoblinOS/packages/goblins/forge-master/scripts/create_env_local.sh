#!/usr/bin/env bash
set -euo pipefail
FORGE_MASTER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXAMPLE="$FORGE_MASTER_DIR/.env.example"
LOCAL="$FORGE_MASTER_DIR/.env.local"

if [ ! -f "$EXAMPLE" ]; then
  echo "forge-master: $EXAMPLE not found"
  exit 1
fi

awk -F= '{ if ($1 ~ /^[A-Z0-9_]+$/) print $1"=REPLACE_WITH_VALUE"; else print $0 }' "$EXAMPLE" > "$LOCAL"
echo "forge-master: Wrote $LOCAL — replace placeholders with real local values (do NOT commit)."
