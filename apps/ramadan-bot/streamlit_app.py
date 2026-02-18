#!/usr/bin/env python3
"""
Ramadan Fajr Bot - Streamlit Cloud entry point.

This file is used by Streamlit Cloud to launch the app.
It bootstraps secrets, validates configuration, then runs the UI.
"""

import os
import sys
from dotenv import load_dotenv

# ──────────────────── Step 1: Bootstrap secrets ────────────────────
# Must happen BEFORE any other imports that use config
from ramadan_bot._cloud_bootstrap import bootstrap_secrets

bootstrap_secrets()

# Also load .env for local development (won't override bootstrap values)
load_dotenv()

import streamlit as st

# ──────────────────── Step 2: Validate critical secrets ────────────────────
api_key_present = bool(os.environ.get("SILICONFLOW_API_KEY"))

if not api_key_present:
    # Also check st.secrets as a fallback
    try:
        if hasattr(st, "secrets") and "SILICONFLOW_API_KEY" in st.secrets:
            api_key_present = True
    except Exception:
        pass

if not api_key_present:
    st.error(
        """
        **Critical: Secrets Not Configured**

        The `SILICONFLOW_API_KEY` secret is missing.

        **To fix this on Streamlit Cloud:**
        1. Click the **Settings** button (top right)
        2. Select **Secrets** from the left sidebar
        3. Paste your API keys
        4. Click **Save**
        """
    )
    st.stop()

# ──────────────────── Step 3: Run the app ────────────────────
from ramadan_bot.ui import run_streamlit_ui

if __name__ == "__main__":
    run_streamlit_ui()
