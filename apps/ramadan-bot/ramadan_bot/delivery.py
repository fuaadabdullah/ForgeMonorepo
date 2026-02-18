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
) -> None:
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

    # ── Determine SMTP provider (SendGrid first, then fallback to Gmail/custom) ──
    # Priority: SendGrid API Key > Gmail credentials > Custom SMTP
    if config.SENDGRID_API_KEY:
        smtp_server = config.SENDGRID_SMTP_HOST
        smtp_port = config.SENDGRID_SMTP_PORT
        smtp_user = config.SENDGRID_SMTP_USER
        smtp_pass = config.SENDGRID_API_KEY
        logger.info("Using SendGrid SMTP for delivery")
    else:
        smtp_server = smtp_server or config.SMTP_SERVER
        smtp_port = smtp_port or config.SMTP_PORT
        smtp_user = config.EMAIL_USER
        smtp_pass = config.EMAIL_PASS
        if smtp_user and "@gmail" in smtp_user.lower():
            logger.info("Using Gmail SMTP for delivery")
        else:
            logger.info(f"Using custom SMTP ({smtp_server}) for delivery")

    if not smtp_user or not smtp_pass:
        raise RuntimeError("SMTP credentials are not configured")

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

    # Send via SMTP
    server = smtplib.SMTP(smtp_server, smtp_port)
    server.starttls()
    server.login(smtp_user, smtp_pass)
    server.send_message(msg)
    server.quit()

    logger.info(f"Sent SMS email to {recipients} with image {image_path}")
    return {"sent": True, "recipients": recipients, "subject": subject}
