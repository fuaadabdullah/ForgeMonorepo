#!/usr/bin/env bash
# Ramadan Fajr Bot — launcher script for launchd / cron
# Ensures env vars are loaded and the correct virtualenv is used.
# Uses caffeinate to prevent sleep during execution.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV="/Users/fuaadabdullah/.venvs/forge-terminal"
BOT="$SCRIPT_DIR/ramadan_production.py"
ENV_FILE="$SCRIPT_DIR/.env"
LOG_DIR="$SCRIPT_DIR/logs"

mkdir -p "$LOG_DIR"

# Export .env vars
if [[ -f "$ENV_FILE" ]]; then
    set -a
    source "$ENV_FILE"
    set +a
fi

echo "=== $(date '+%Y-%m-%d %H:%M:%S %Z') — Fajr Bot launcher ==="

# caffeinate -i prevents idle sleep for the duration of the bot run
# caffeinate -s prevents system sleep (keeps Mac awake even on battery)
exec caffeinate -is "$VENV/bin/python" "$BOT" --ci-run 2>&1 | tee -a "$LOG_DIR/launcher.log"
