#!/usr/bin/env python3
"""
Ramadan Fajr Bot - Streamlit Cloud entry point.

This file is used by Streamlit Cloud to launch the app.
It simply invokes the modularized UI from ramadan_bot.ui.
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables from .env (for local testing)
load_dotenv()

# Import and run the Streamlit UI
from ramadan_bot.ui import run_streamlit_ui

if __name__ == "__main__":
    run_streamlit_ui()
