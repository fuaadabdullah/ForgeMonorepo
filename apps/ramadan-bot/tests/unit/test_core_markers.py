"""Tests for sent marker tracking."""

import pytest
import os
from datetime import date
from unittest.mock import Mock, patch, MagicMock
from ramadan_bot.core.markers import (
    already_sent_marker,
    write_sent_marker,
    _marker_path,
)
from ramadan_bot import config


@pytest.mark.unit
class TestMarkerPath:
    """Test local marker file path generation."""

    def test_marker_path_format(self, sample_date):
        """Test that marker path is correctly formatted."""
        result = _marker_path(sample_date)
        assert "ramadan_sent_" in result
        assert sample_date.isoformat() in result
        assert result.endswith(".ok") is False  # _marker_path doesn't add .ok


@pytest.mark.unit
class TestAlreadySentMarkerLocal:
    """Test local file marker checking."""

    def test_already_sent_local_missing(self, sample_date, tmp_path, monkeypatch):
        """Test that missing marker returns False."""
        marker_dir = tmp_path / "markers"
        marker_dir.mkdir()
        monkeypatch.setattr(
            "ramadan_bot.core.markers.config.MARKER_DIR", str(marker_dir)
        )

        result = already_sent_marker(sample_date, use_s3=False)
        assert result is False

    def test_already_sent_local_exists(self, sample_date, tmp_path, monkeypatch):
        """Test that existing marker returns True."""
        marker_dir = tmp_path / "markers"
        marker_dir.mkdir()
        monkeypatch.setattr(
            "ramadan_bot.core.markers.config.MARKER_DIR", str(marker_dir)
        )

        # Create a marker file
        marker_file = marker_dir / f"ramadan_sent_{sample_date.isoformat()}"
        marker_file.write_text("test")

        result = already_sent_marker(sample_date, use_s3=False)
        assert result is True


@pytest.mark.unit
class TestWriteSentMarkerLocal:
    """Test local marker writing."""

    def test_write_sent_marker_local(self, sample_date, tmp_path, monkeypatch):
        """Test that marker file is created."""
        marker_dir = tmp_path / "markers"
        marker_dir.mkdir()
        monkeypatch.setattr(
            "ramadan_bot.core.markers.config.MARKER_DIR", str(marker_dir)
        )

        result = write_sent_marker(sample_date, use_s3=False)
        assert result is True

        # Verify marker file exists
        marker_file = marker_dir / f"ramadan_sent_{sample_date.isoformat()}"
        assert marker_file.exists()


@pytest.mark.unit
class TestAlreadySentMarkerS3:
    """Test S3 marker checking."""

    @patch("ramadan_bot.core.markers.boto3.client")
    def test_already_sent_s3_exists(self, mock_boto, sample_date, monkeypatch):
        """Test S3 marker checking when object exists."""
        monkeypatch.setattr("ramadan_bot.core.markers.config.S3_BUCKET", "test-bucket")
        monkeypatch.setattr(
            "ramadan_bot.core.markers.config.AWS_ACCESS_KEY_ID", "test-key"
        )

        mock_s3 = MagicMock()
        mock_boto.return_value = mock_s3
        mock_s3.head_object(
            Bucket="test-bucket", Key=f"sent-markers/{sample_date.isoformat()}.ok"
        )

        result = already_sent_marker(sample_date, use_s3=True)
        assert result is True

    @patch("ramadan_bot.core.markers.boto3.client")
    def test_already_sent_s3_missing(self, mock_boto, sample_date, monkeypatch):
        """Test S3 marker checking when object doesn't exist."""
        from botocore.exceptions import ClientError

        monkeypatch.setattr("ramadan_bot.core.markers.config.S3_BUCKET", "test-bucket")
        monkeypatch.setattr(
            "ramadan_bot.core.markers.config.AWS_ACCESS_KEY_ID", "test-key"
        )

        mock_s3 = MagicMock()
        mock_boto.return_value = mock_s3
        mock_s3.head_object.side_effect = ClientError(
            {"Error": {"Code": "404"}}, "head_object"
        )

        result = already_sent_marker(sample_date, use_s3=True)
        assert result is False
