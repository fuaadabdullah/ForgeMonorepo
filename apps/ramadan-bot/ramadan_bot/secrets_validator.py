"""
Secrets Validator - Verify that all required secrets are properly configured.

This tool helps debug secret loading on both local and Streamlit Cloud environments.
Run this to verify secrets are accessible before deploying.
"""

import sys
from typing import Dict, Tuple


def validate_secrets() -> Tuple[bool, Dict[str, str]]:
    """
    Validate that all required secrets are loaded.

    Returns:
        (is_valid, status_dict) - True if all required secrets present, dict of statuses
    """
    from ramadan_bot import config

    secrets_status = {
        "SILICONFLOW_API_KEY": "✅"
        if config.SILICONFLOW_API_KEY
        else "❌ Not configured",
        "SENDGRID_API_KEY": "✅"
        if config.SENDGRID_API_KEY
        else "⚠️ Optional (email disabled)",
        "EMAIL_USER": "✅" if config.EMAIL_USER else "⚠️ Optional (email disabled)",
        "EMAIL_PASS": "✅" if config.EMAIL_PASS else "⚠️ Optional (email disabled)",
        "SMTP_SERVER": f"✅ {config.SMTP_SERVER}",
        "LAT": f"✅ {config.LAT}",
        "LON": f"✅ {config.LON}",
        "TZ": f"✅ {config.TZ}",
        "SMS_RECIPIENTS": f"✅ {len(config.SMS_RECIPIENTS)} recipients"
        if config.SMS_RECIPIENTS
        else "⚠️ No SMS recipients",
    }

    # Check critical secrets
    critical_configured = bool(config.SILICONFLOW_API_KEY)
    optional_warning = not (
        config.SENDGRID_API_KEY or (config.EMAIL_USER and config.EMAIL_PASS)
    )

    return critical_configured, secrets_status


def print_status():
    """Pretty-print secret validation status."""
    try:
        is_valid, status = validate_secrets()

        print("\n" + "=" * 60)
        print("🔐 Secrets Validation Report")
        print("=" * 60)

        for key, status_msg in status.items():
            print(f"  {key:<25} {status_msg}")

        print("=" * 60)

        if not is_valid:
            print("\n⚠️  CRITICAL: SILICONFLOW_API_KEY is not configured!")
            print("   Image generation will fail without this secret.\n")
            return False
        elif status.get("SENDGRID_API_KEY", "").startswith("⚠️"):
            print(
                "\n⚠️  WARNING: Email delivery disabled (SendGrid/Email not configured)"
            )
            print(
                "   Preview generation will work, but Send features will be unavailable.\n"
            )
            return True
        else:
            print("\n✅ All critical secrets configured! Ready to deploy.\n")
            return True

    except ImportError as e:
        print(f"\n❌ Error: Could not import config module: {e}")
        print("   Make sure you're running from the ramadan-bot directory.\n")
        return False
    except Exception as e:
        print(f"\n❌ Validation error: {e}\n")
        return False


if __name__ == "__main__":
    success = print_status()
    sys.exit(0 if success else 1)
