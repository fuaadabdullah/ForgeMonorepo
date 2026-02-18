#!/usr/bin/env python3
"""
Ramadan Fajr Bot - Streamlit Cloud entry point.

This file is used by Streamlit Cloud to launch the app.
It validates secrets, then invokes the modularized UI from ramadan_bot.ui.
"""

import os
import sys
from dotenv import load_dotenv
import streamlit as st

# Load environment variables from .env (for local testing)
load_dotenv()

# ──────────────────── Secret Validation ────────────────────
# Check if SILICONFLOW_API_KEY is available (critical for image generation)
try:
    # Try Streamlit secrets first (Streamlit Cloud)
    if hasattr(st, "secrets") and "SILICONFLOW_API_KEY" in st.secrets:
        api_key_present = bool(st.secrets["SILICONFLOW_API_KEY"])
    else:
        # Fall back to environment
        api_key_present = bool(os.getenv("SILICONFLOW_API_KEY"))
    
    if not api_key_present:
        st.error(
            """
            ❌ **Critical: Secrets Not Configured**
            
            The `SILICONFLOW_API_KEY` secret is missing. 
            
            **To fix this on Streamlit Cloud:**
            1. Click the **⚙️ Settings** button (top right)
            2. Select **Secrets** from the left sidebar
            3. Paste your API keys (see deployment guide)
            4. Click **Save**
            
            The app will auto-redeploy with your secrets.
            """
        )
        st.stop()
        
except Exception as e:
    st.warning(f"Could not validate secrets: {e}")

# Import and run the Streamlit UI
from ramadan_bot.ui import run_streamlit_ui

if __name__ == "__main__":
    run_streamlit_ui()

