"""Tests for core Ramadan date logic."""

import pytest
from datetime import date, datetime, timezone, timedelta
from unittest.mock import patch
import pytz
from ramadan_bot.core.dates import get_today_ramadan_day, compute_fajr_for
from ramadan_bot import config


@pytest.mark.unit
class TestGetTodayRamadanDay:
    """Test Ramadan day calculation."""

    def test_first_ramadan_day(self):
        """Test that Ramadan start date returns day 1."""
        tz = pytz.timezone(config.TZ)
        ramadan_start = config.RAMADAN_START
        mock_now = datetime.combine(ramadan_start, datetime.min.time(), tzinfo=tz)

        with patch("ramadan_bot.core.dates.dt") as mock_dt:
            mock_dt.now.return_value = mock_now
            result = get_today_ramadan_day()
            assert result == 1

    def test_last_ramadan_day(self):
        """Test that last Ramadan date returns day 30."""
        tz = pytz.timezone(config.TZ)
        ramadan_end = config.RAMADAN_END
        mock_now = datetime.combine(ramadan_end, datetime.min.time(), tzinfo=tz)

        with patch("ramadan_bot.core.dates.dt") as mock_dt:
            mock_dt.now.return_value = mock_now
            result = get_today_ramadan_day()
            assert result == 30

    def test_outside_ramadan_before(self):
        """Test that dates before Ramadan return 0."""
        tz = pytz.timezone(config.TZ)
        before_ramadan = config.RAMADAN_START - timedelta(days=1)
        mock_now = datetime.combine(before_ramadan, datetime.min.time(), tzinfo=tz)

        with patch("ramadan_bot.core.dates.dt") as mock_dt:
            mock_dt.now.return_value = mock_now
            result = get_today_ramadan_day()
            assert result == 0

    def test_outside_ramadan_after(self):
        """Test that dates after Ramadan return 0."""
        tz = pytz.timezone(config.TZ)
        after_ramadan = config.RAMADAN_END + timedelta(days=1)
        mock_now = datetime.combine(after_ramadan, datetime.min.time(), tzinfo=tz)

        with patch("ramadan_bot.core.dates.dt") as mock_dt:
            mock_dt.now.return_value = mock_now
            result = get_today_ramadan_day()
            assert result == 0


@pytest.mark.unit
class TestComputeFajr:
    """Test Fajr computation."""

    def test_compute_fajr_returns_datetime(self, sample_date):
        """Test that compute_fajr_for returns a datetime."""
        result = compute_fajr_for(sample_date)
        assert result is not None
        assert hasattr(result, "hour")
        assert hasattr(result, "minute")

    def test_compute_fajr_with_custom_location(self, sample_date):
        """Test Fajr computation with custom coordinates."""
        # Kaaba coordinates
        lat = 21.4225
        lon = 39.8262

        result = compute_fajr_for(sample_date, lat=lat, lon=lon, tzname="Asia/Riyadh")
        assert result is not None
        # Fajr should typically be between 4-6 AM
        assert 4 <= result.hour <= 6

    def test_compute_fajr_realistic_value(self, sample_date):
        """Test that computed Fajr is realistic for NYC."""
        result = compute_fajr_for(
            sample_date, lat=40.7128, lon=-74.0060, tzname="America/New_York"
        )
        assert result is not None
        # February Fajr in NYC should be early morning
        assert 5 <= result.hour <= 8
