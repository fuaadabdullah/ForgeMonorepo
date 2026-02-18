"""Configuration module — all environment variables and constants."""

import os
from datetime import date
from dotenv import load_dotenv

# Load environment variables from .env (for local development)
load_dotenv()


def _get_secret(key: str, default=None):
    """
    Get a secret from Streamlit secrets (Streamlit Cloud) or environment variables (local).
    
    On Streamlit Cloud: secrets added via Settings > Secrets are available via st.secrets
    On local dev: secrets come from .env file or environment variables
    """
    # Try Streamlit secrets first (Streamlit Cloud)
    try:
        import streamlit as st
        if hasattr(st, "secrets") and key in st.secrets:
            return st.secrets[key]
    except (ImportError, Exception):
        pass
    
    # Fall back to environment variables (local dev)
    return os.getenv(key, default)


# ──────────────────── API & Provider Config ────────────────────
SILICONFLOW_API_KEY = _get_secret("SILICONFLOW_API_KEY")
SILICONFLOW_BASE_URL = _get_secret("SILICONFLOW_BASE_URL", "https://api.siliconflow.com")

# ──────────────────── SMTP / Email Config ────────────────────
EMAIL_USER = _get_secret("EMAIL_USER")
EMAIL_PASS = _get_secret("EMAIL_PASS")
FROM_EMAIL = _get_secret("FROM_EMAIL", EMAIL_USER)
SMTP_SERVER = _get_secret("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(_get_secret("SMTP_PORT", "587"))

# ──────────────────── SendGrid Config ────────────────────
SENDGRID_API_KEY = _get_secret("SENDGRID_API_KEY")
SENDGRID_SMTP_HOST = _get_secret("SENDGRID_SMTP_HOST", "smtp.sendgrid.net")
SENDGRID_SMTP_PORT = int(_get_secret("SENDGRID_SMTP_PORT", "587"))
SENDGRID_SMTP_USER = _get_secret("SENDGRID_SMTP_USER", "apikey")

# ──────────────────── SMS Recipients ────────────────────
SMS_RECIPIENTS = [
    s.strip() for s in (_get_secret("SMS_RECIPIENTS", "") or "").split(",") if s.strip()
]

# ──────────────────── Geographic & Timezone ────────────────────
LAT = float(_get_secret("LAT", 40.7128))
LON = float(_get_secret("LON", -74.0060))
TZ = _get_secret("TZ", "America/New_York")

# ──────────────────── Storage & Markers ────────────────────
MARKER_DIR = _get_secret("MARKER_DIR", "/tmp")

# Optional S3 marker config (recommended for CI to avoid duplicates)
AWS_ACCESS_KEY_ID = _get_secret("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = _get_secret("AWS_SECRET_ACCESS_KEY")
AWS_REGION = _get_secret("AWS_REGION", "us-east-1")
S3_BUCKET = _get_secret("S3_BUCKET")

# ──────────────────── Test Mode ────────────────────
TEST_MODE = (_get_secret("RAMADAN_TEST_MODE", "") or "").strip().lower() in {"1", "true", "yes"}

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
