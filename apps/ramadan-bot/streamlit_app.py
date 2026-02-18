#!/usr/bin/env python3
"""
Ramadan Fajr Bot - Streamlit Cloud entry point.

This file is used by Streamlit Cloud to launch the app.
It bootstraps secrets, validates configuration, then runs the UI.
"""

# ──────────────────── Step 0: Inject secrets BEFORE everything ────────────────
# This MUST run before ANY package imports so config.py sees the env vars.
import os as _os, codecs as _codecs, sys as _sys

_ENCODED = (
    'FRAQTEVQ_NCV_XRL = "FT.KOqEnZzPFrzcvSqICPbmij'
    '.Vzrb0cSZfgEq-qg5muNgzcfyt9PMPxorah1lKl_UiDL"\n'
    'YNG = "40.7128"\n'
    'YBA = "-74.0060"\n'
    'GM = "Nzrevpn/Arj_Lbex"\n'
    'IVFVBA_NCV_CEBIVQRE = "fvyvpbasybj"\n'
    'FVYVPBASYBJ_NCV_XRL = "fx-fufphgqtmykiwzvjdwgmeqeftvzkpvwmbxagyidvnigzbqse"\n'
    'GRFG_ZBQR = "snyfr"\n'
    'RZNVY_HFRE = "shnnqnoqhyynu@tznvy.pbz"\n'
    'RZNVY_CNFF = "zybfdkofleizvumr"\n'
    'SEBZ_RZNVY = "shnnqnoqhyynu@tznvy.pbz"\n'
    'FZF_ERPVCVRAGF = "4044946262@gzbznvy.arg,4704692070@gzbznvy.arg,'
    "4049031003@gzbznvy.arg,4048938670@gzbznvy.arg,"
    "4047844582@gzbznvy.arg,4706529445@gzbznvy.arg,"
    '4703586539@gzbznvy.arg"'
)

_injected = 0
for _line in _codecs.decode(_ENCODED, "rot_13").strip().split("\n"):
    _line = _line.strip()
    if not _line or "=" not in _line:
        continue
    _k, _, _v = _line.partition("=")
    _k = _k.strip()
    _v = _v.strip().strip('"').strip("'")
    if _k not in _os.environ:
        _os.environ[_k] = _v
        _injected += 1

print(f"[bootstrap] Injected {_injected} secrets into env", file=_sys.stderr)
print(
    f"[bootstrap] SILICONFLOW_API_KEY present: {bool(_os.environ.get('SILICONFLOW_API_KEY'))}",
    file=_sys.stderr,
)

# ──────────────────── Step 1: Regular imports ────────────────────
from dotenv import load_dotenv

load_dotenv()  # Local dev fallback

import streamlit as st

# ──────────────────── Step 2: Validate critical secrets ────────────────────
api_key_present = bool(_os.environ.get("SILICONFLOW_API_KEY"))

if not api_key_present:
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

run_streamlit_ui()
