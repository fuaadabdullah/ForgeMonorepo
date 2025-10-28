#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
SMITHY_DIR="$ROOT/packages/goblins/forge-guild"
EXAMPLE_FILE="$SMITHY_DIR/.env.example"

if [ ! -f "$EXAMPLE_FILE" ]; then
  echo ".env.example not found for smithy at $EXAMPLE_FILE"
  exit 1
fi

# collect vars used only within smithy package (ts/js/py)
USED_VARS=$(git -C "$ROOT" ls-files "$SMITHY_DIR/**/*.{ts,tsx,js,jsx,py}" 2>/dev/null | xargs grep -h "process\.env\|os\.getenv" 2>/dev/null | sed -E 's/.*(process\.env\.|process\.env\[|os\.getenv\()[^A-Z0-9_]*([A-Z0-9_]+).*/\2/' | sort -u || true)

EXAMPLE_VARS=$(sed -n 's/^\s*\([A-Z0-9_]\+\)=.*/\1/p' "$EXAMPLE_FILE" | sort -u)

MISSING=()
for v in $USED_VARS; do
  if ! grep -qx "$v" <<< "$EXAMPLE_VARS"; then
    MISSING+=("$v")
  fi
done

if [ ${#MISSING[@]} -ne 0 ]; then
  echo "smithy: Missing env vars in .env.example:"
  for m in "${MISSING[@]}"; do echo "  - $m"; done
  exit 2
fi

echo "smithy: Env validation passed."
