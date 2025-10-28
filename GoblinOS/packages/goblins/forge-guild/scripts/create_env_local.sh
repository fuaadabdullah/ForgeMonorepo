#!/usr/bin/env bash
set -euo pipefail
SMITHY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXAMPLE="$SMITHY_DIR/.env.example"
LOCAL="$SMITHY_DIR/.env.local"

if [ ! -f "$EXAMPLE" ]; then
  echo "smithy: $EXAMPLE not found"
  exit 1
fi

awk -F= '{ if ($1 ~ /^[A-Z0-9_]+$/) print $1"=REPLACE_WITH_VALUE"; else print $0 }' "$EXAMPLE" > "$LOCAL"
echo "smithy: Wrote $LOCAL — replace placeholders with real local values (do NOT commit)."
