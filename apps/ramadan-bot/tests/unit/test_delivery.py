"""Unit tests for ramadan_bot.delivery module."""

import pytest
from unittest.mock import patch, MagicMock


@pytest.mark.unit
class TestSendViaEmailSms:
    """Test email/SMS delivery."""

    def test_test_mode_skips_send(self, monkeypatch, temp_image):
        """Test that TEST_MODE skips SMTP."""
        from ramadan_bot import config
        from ramadan_bot.delivery import send_via_email_sms

        monkeypatch.setattr(config, "TEST_MODE", True)
        monkeypatch.setattr(config, "SMS_RECIPIENTS", ["test@tmomail.net"])

        result = send_via_email_sms(
            image_path=str(temp_image),
            subject="Test",
            body_text="Test body",
        )

        assert result["skipped"] is True
        assert result["reason"] == "test_mode"

    def test_missing_credentials_raises(self, monkeypatch, temp_image):
        """Test that missing SMTP creds raise RuntimeError."""
        from ramadan_bot import config
        from ramadan_bot.delivery import send_via_email_sms

        monkeypatch.setattr(config, "TEST_MODE", False)
        monkeypatch.setattr(config, "EMAIL_USER", None)
        monkeypatch.setattr(config, "EMAIL_PASS", None)
        monkeypatch.setattr(config, "SENDGRID_API_KEY", None)

        with pytest.raises(RuntimeError, match="SMTP credentials"):
            send_via_email_sms(
                image_path=str(temp_image),
                subject="Test",
                body_text="Test body",
                recipients=["test@tmomail.net"],
            )

    @patch("ramadan_bot.delivery.smtplib.SMTP")
    def test_gmail_smtp_priority(self, mock_smtp_class, monkeypatch, temp_image):
        """Test that Gmail SMTP is preferred over SendGrid when both are configured."""
        from ramadan_bot import config
        from ramadan_bot.delivery import send_via_email_sms

        monkeypatch.setattr(config, "TEST_MODE", False)
        monkeypatch.setattr(config, "EMAIL_USER", "test@gmail.com")
        monkeypatch.setattr(config, "EMAIL_PASS", "app-password")
        monkeypatch.setattr(config, "FROM_EMAIL", "test@gmail.com")
        monkeypatch.setattr(config, "SENDGRID_API_KEY", "SG.fake-key")

        mock_server = MagicMock()
        mock_smtp_class.return_value = mock_server

        result = send_via_email_sms(
            image_path=str(temp_image),
            subject="Test Gmail Priority",
            body_text="Testing Gmail SMTP is used first",
            recipients=["test@tmomail.net"],
        )

        # Should use Gmail SMTP, not SendGrid
        mock_smtp_class.assert_called_once_with("smtp.gmail.com", 587)
        mock_server.login.assert_called_once_with("test@gmail.com", "app-password")
        assert result["sent"] is True

    @patch("ramadan_bot.delivery.smtplib.SMTP")
    def test_sendgrid_fallback(self, mock_smtp_class, monkeypatch, temp_image):
        """Test that SendGrid is used when Gmail is not configured."""
        from ramadan_bot import config
        from ramadan_bot.delivery import send_via_email_sms

        monkeypatch.setattr(config, "TEST_MODE", False)
        monkeypatch.setattr(config, "EMAIL_USER", None)
        monkeypatch.setattr(config, "EMAIL_PASS", None)
        monkeypatch.setattr(config, "FROM_EMAIL", "test@gmail.com")
        monkeypatch.setattr(config, "SENDGRID_API_KEY", "SG.fake-key")
        monkeypatch.setattr(config, "SENDGRID_SMTP_HOST", "smtp.sendgrid.net")
        monkeypatch.setattr(config, "SENDGRID_SMTP_PORT", 587)
        monkeypatch.setattr(config, "SENDGRID_SMTP_USER", "apikey")

        mock_server = MagicMock()
        mock_smtp_class.return_value = mock_server

        result = send_via_email_sms(
            image_path=str(temp_image),
            subject="Test SendGrid",
            body_text="Testing SendGrid fallback",
            recipients=["test@tmomail.net"],
        )

        mock_smtp_class.assert_called_once_with("smtp.sendgrid.net", 587)
        mock_server.login.assert_called_once_with("apikey", "SG.fake-key")
        assert result["sent"] is True

    @patch("ramadan_bot.delivery.smtplib.SMTP")
    def test_returns_dict_with_recipients(
        self, mock_smtp_class, monkeypatch, temp_image
    ):
        """Test that successful send returns dict with expected keys."""
        from ramadan_bot import config
        from ramadan_bot.delivery import send_via_email_sms

        monkeypatch.setattr(config, "TEST_MODE", False)
        monkeypatch.setattr(config, "EMAIL_USER", "test@gmail.com")
        monkeypatch.setattr(config, "EMAIL_PASS", "app-password")
        monkeypatch.setattr(config, "FROM_EMAIL", "test@gmail.com")
        monkeypatch.setattr(config, "SENDGRID_API_KEY", None)

        mock_server = MagicMock()
        mock_smtp_class.return_value = mock_server

        result = send_via_email_sms(
            image_path=str(temp_image),
            subject="Test Subject",
            body_text="Test body",
            recipients=["r1@tmomail.net", "r2@tmomail.net"],
        )

        assert result["sent"] is True
        assert result["recipients"] == ["r1@tmomail.net", "r2@tmomail.net"]
        assert result["subject"] == "Test Subject"

    @patch("ramadan_bot.delivery.smtplib.SMTP")
    def test_smtp_auth_error(self, mock_smtp_class, monkeypatch, temp_image):
        """Test that SMTP auth errors are wrapped in RuntimeError."""
        import smtplib
        from ramadan_bot import config
        from ramadan_bot.delivery import send_via_email_sms

        monkeypatch.setattr(config, "TEST_MODE", False)
        monkeypatch.setattr(config, "EMAIL_USER", "test@gmail.com")
        monkeypatch.setattr(config, "EMAIL_PASS", "bad-password")
        monkeypatch.setattr(config, "FROM_EMAIL", "test@gmail.com")
        monkeypatch.setattr(config, "SENDGRID_API_KEY", None)

        mock_server = MagicMock()
        mock_smtp_class.return_value = mock_server
        mock_server.login.side_effect = smtplib.SMTPAuthenticationError(
            535, b"Bad credentials"
        )

        with pytest.raises(RuntimeError, match="SMTP authentication failed"):
            send_via_email_sms(
                image_path=str(temp_image),
                subject="Test",
                body_text="Test",
                recipients=["test@tmomail.net"],
            )
