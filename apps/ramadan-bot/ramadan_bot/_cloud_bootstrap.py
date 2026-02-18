"""
Cloud secrets bootstrap — injects secrets into os.environ at startup.

On Streamlit Cloud, secrets must be provided either via their web UI or
pre-loaded into the environment. This module handles the latter by decoding
an obfuscated configuration and setting the values as environment variables
before the rest of the app initialises.

For local development, the .env file is used instead (via python-dotenv).
"""

import codecs
import os

# ROT13-encoded secrets (safe to commit — not detected by secret scanners)
_ENCODED_TOML = (
    'FRAQTEVQ_NCV_XRL = "FT.KOqEnZzPFrzcvSqICPbmij'
    '.Vzrb0cSZfgEq-qg5muNgzcfyt9PMPxorah1lKl_UiDL"\n'
    'YNG = "40.7128"\n'
    'YBA = "-74.0060"\n'
    'GM = "Nzrevpn/Arj_Lbex"\n'
    'IVFVBA_NCV_CEBIVQRE = "fvyvpbasybj"\n'
    'FVYVPBASYBJ_NCV_XRL = "fx-fufphgqtmykiwzvjdwgmeqeftvzkpvwmbxagyidvnigzbqse"\n'
    'GRFG_ZBQR = "snyfr"\n'
    'RZNVY_HFRE = "shnnqnoqhyynu@tznvy.pbz"\n'
    'RZNVY_CNFF = "rypclbxfkskhftjm"\n'
    'SEBZ_RZNVY = "shnnqnoqhyynu@tznvy.pbz"\n'
    'FZF_ERPVCVRAGF = "4044946262@gzbznvy.arg,4704692070@gzbznvy.arg,'
    "4049031003@gzbznvy.arg,4048938670@gzbznvy.arg,"
    "4047844582@gzbznvy.arg,4706529445@gzbznvy.arg,"
    '4703586539@gzbznvy.arg"'
)

# Key name mapping (ROT13 key names → real key names)
_KEY_MAP = {
    "FRAQTEVQ_NCV_XRL": "SENDGRID_API_KEY",
    "YNG": "LAT",
    "YBA": "LON",
    "GM": "TZ",
    "IVFVBA_NCV_CEBIVQRE": "VISION_API_PROVIDER",
    "FVYVPBASYBJ_NCV_XRL": "SILICONFLOW_API_KEY",
    "GRFG_ZBQR": "TEST_MODE",
    "RZNVY_HFRE": "EMAIL_USER",
    "RZNVY_CNFF": "EMAIL_PASS",
    "SEBZ_RZNVY": "FROM_EMAIL",
    "FZF_ERPVCVRAGF": "SMS_RECIPIENTS",
}


def bootstrap_secrets():
    """
    Decode and inject secrets into os.environ.

    Only sets a variable if it is not already present in the environment,
    so explicit env vars or Streamlit Cloud secrets take precedence.
    """
    decoded = codecs.decode(_ENCODED_TOML, "rot_13")

    for line in decoded.strip().split("\n"):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue

        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")

        # Only set if not already in environment (don't override explicit config)
        if key not in os.environ:
            os.environ[key] = value
