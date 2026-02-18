"""Email/SMS delivery gateway."""

import os
import smtplib
from email.message import EmailMessage

from . import config
from .logger import logger

__all__ = ["send_via_email_sms"]


def send_via_email_sms(
    image_path: str,
    subject: str,
    body_text: str,
    recipients: list = None,
    smtp_server: str = None,
    smtp_port: int = None,
) -> dict:
    """Send message via email-to-SMS gateway with image attachment.

    Args:
        image_path: Path to PNG image to attach
        subject: Email subject line
        body_text: Email body text
        recipients: List of recipient email/SMS addresses
        smtp_server: SMTP server hostname (uses config default if None)
        smtp_port: SMTP port (uses config default if None)

    Raises:
        RuntimeError: If SMTP credentials are not configured
    """
    if recipients is None:
        recipients = config.SMS_RECIPIENTS

    if config.TEST_MODE:
        logger.info(f"TEST_MODE enabled: skipping SMTP send to {recipients}")
        return {"skipped": True, "reason": "test_mode"}

    # ── Build ordered list of SMTP providers to try ──
    providers = []

    # Gmail first (SPF/DKIM aligned for @gmail.com FROM)
    if (
        config.EMAIL_USER
        and config.EMAIL_PASS
        and "@gmail" in config.EMAIL_USER.lower()
    ):
        providers.append({
            "name": "Gmail",
            "server": "smtp.gmail.com",
            "port": 587,
            "user": config.EMAIL_USER,
            "pass": config.EMAIL_PASS,
        })

    # SendGrid as fallback
    if config.SENDGRID_API_KEY:
        providers.append({
            "name": "SendGrid",
            "server": config.SENDGRID_SMTP_HOST,
            "port": config.SENDGRID_SMTP_PORT,
            "user": config.SENDGRID_SMTP_USER,
            "pass": config.SENDGRID_API_KEY,
        })

    # Custom SMTP as last resort
    if smtp_server:
        providers.append({
            "name": f"Custom ({smtp_server})",
            "server": smtp_server,
            "port": smtp_port or config.SMTP_PORT,
            "user": config.EMAIL_USER,
            "pass": config.EMAIL_PASS,
        })

    if not providers:
        raise RuntimeError("No SMTP credentials configured (need Gmail, SendGrid, or custom)")

    # Build message
    msg = EmailMessage()
    msg["Subject"] = subject
    from_name = config._get_secret("FROM_NAME", "Ramadan Fajr Bot")
    msg["From"] = f"{from_name} <{config.FROM_EMAIL}>"
    msg["To"] = ", ".join(recipients)
    msg.set_content(body_text)

    # Attach image
    with open(image_path, "rb") as f:
        img_data = f.read()
    msg.add_attachment(
        img_data,
        maintype="image",
        subtype="png",
        filename=os.path.basename(image_path),
    )

    # Try each provider in order, fall back on auth failures
    last_error = None
    for provider in providers:
        try:
            logger.info(f"Trying {provider['name']} SMTP for delivery...")
            server = smtplib.SMTP(provider["server"], provider["port"])
            server.starttls()
            server.login(provider["user"], provider["pass"])
            server.send_message(msg)
            server.quit()
            logger.info(f"Sent via {provider['name']} to {recipients} with image {image_path}")
            return {"sent": True, "recipients": recipients, "subject": subject, "provider": provider["name"]}
        except smtplib.SMTPAuthenticationError as e:
            logger.warning(f"{provider['name']} auth failed, trying next provider: {e}")
            last_error = e
            continue
        except smtplib.SMTPRecipientsRefused as e:
            logger.error(f"Recipients refused: {e}")
            raise RuntimeError(f"Recipients refused: {e}")
        except Exception as e:
            logger.warning(f"{provider['name']} send failed, trying next: {e}")
            last_error = e
            continue

    # All providers failed
    raise RuntimeError(f"All SMTP providers failed. Last error: {last_error}")
