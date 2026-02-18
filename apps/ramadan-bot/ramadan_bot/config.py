"""Configuration module — all environment variables and constants."""

import os
from datetime import date
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# ──────────────────── API & Provider Config ────────────────────
SILICONFLOW_API_KEY = os.getenv("SILICONFLOW_API_KEY")
SILICONFLOW_BASE_URL = os.getenv("SILICONFLOW_BASE_URL", "https://api.siliconflow.com")

# ──────────────────── SMTP / Email Config ────────────────────
EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASS = os.getenv("EMAIL_PASS")
FROM_EMAIL = os.getenv("FROM_EMAIL", EMAIL_USER)
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))

# ──────────────────── SendGrid Config ────────────────────
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
SENDGRID_SMTP_HOST = os.getenv("SENDGRID_SMTP_HOST", "smtp.sendgrid.net")
SENDGRID_SMTP_PORT = int(os.getenv("SENDGRID_SMTP_PORT", "587"))
SENDGRID_SMTP_USER = os.getenv("SENDGRID_SMTP_USER", "apikey")

# ──────────────────── SMS Recipients ────────────────────
SMS_RECIPIENTS = [
    s.strip() for s in os.getenv("SMS_RECIPIENTS", "").split(",") if s.strip()
]

# ──────────────────── Geographic & Timezone ────────────────────
LAT = float(os.getenv("LAT", 40.7128))
LON = float(os.getenv("LON", -74.0060))
TZ = os.getenv("TZ", "America/New_York")

# ──────────────────── Storage & Markers ────────────────────
MARKER_DIR = os.getenv("MARKER_DIR", "/tmp")

# Optional S3 marker config (recommended for CI to avoid duplicates)
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
S3_BUCKET = os.getenv("S3_BUCKET")

# ──────────────────── Test Mode ────────────────────
TEST_MODE = os.getenv("RAMADAN_TEST_MODE", "").strip().lower() in {"1", "true", "yes"}

# ──────────────────── Fonts (relative to script location) ────────────────────
_SCRIPT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_AR = os.path.join(_SCRIPT_DIR, "fonts", "Amiri-Regular.ttf")
FONT_EN = os.path.join(_SCRIPT_DIR, "fonts", "DejaVuSans.ttf")

# ──────────────────── Directories ────────────────────
CACHE_DIR = os.path.join(_SCRIPT_DIR, "cache")
LOG_DIR = os.path.join(_SCRIPT_DIR, "logs")

# Create directories if they don't exist
os.makedirs(CACHE_DIR, exist_ok=True)
os.makedirs(LOG_DIR, exist_ok=True)

# ──────────────────── Ramadan Dates (2026) ────────────────────
RAMADAN_START = date(2026, 2, 17)  # 1 Ramadan 1447 AH
RAMADAN_END = date(2026, 3, 18)  # 30 Ramadan 1447 AH
