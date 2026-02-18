#!/usr/bin/env bash
# download_fonts.sh — fetch required fonts for Ramadan Fajr Bot
# Run from the app root:  bash fonts/download_fonts.sh

set -euo pipefail

FONTS_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "==> Downloading fonts to ${FONTS_DIR}"

# --- Amiri Regular (Arabic naskh typeface, OFL license) ---
AMIRI_URL="https://github.com/google/fonts/raw/main/ofl/amiri/Amiri-Regular.ttf"
if [[ ! -f "${FONTS_DIR}/Amiri-Regular.ttf" ]]; then
  echo "  Fetching Amiri-Regular.ttf ..."
  curl -fsSL -o "${FONTS_DIR}/Amiri-Regular.ttf" "${AMIRI_URL}" || \
    echo "  WARN: Could not download Amiri-Regular.ttf. Download manually from https://fonts.google.com/specimen/Amiri"
else
  echo "  Amiri-Regular.ttf already exists, skipping."
fi

# --- DejaVu Sans (Latin/international fallback, Bitstream Vera license) ---
DEJAVU_URL="https://github.com/dejavu-fonts/dejavu-fonts/raw/master/ttf/DejaVuSans.ttf"
if [[ ! -f "${FONTS_DIR}/DejaVuSans.ttf" ]]; then
  echo "  Fetching DejaVuSans.ttf ..."
  curl -fsSL -o "${FONTS_DIR}/DejaVuSans.ttf" "${DEJAVU_URL}" || \
    echo "  WARN: Could not download DejaVuSans.ttf. Download manually from https://dejavu-fonts.github.io/"
else
  echo "  DejaVuSans.ttf already exists, skipping."
fi

echo "==> Done. Fonts in ${FONTS_DIR}:"
ls -lh "${FONTS_DIR}"/*.ttf 2>/dev/null || echo "  (no .ttf files found — check warnings above)"
