"""Ramadan calendar logic — dates and Fajr computation."""

import pytz
from datetime import datetime as dt, date
from astral import LocationInfo
from astral.sun import dawn

from .. import config

__all__ = ["get_today_ramadan_day", "compute_fajr_for"]


def get_today_ramadan_day() -> int:
    """Return current Ramadan day (1-30) based on RAMADAN_START date.

    Returns 0 if today is outside of Ramadan.
    """
    today = dt.now(pytz.timezone(config.TZ)).date()
    delta = (today - config.RAMADAN_START).days + 1  # day 1 on start date
    if delta < 1 or delta > 30:
        return 0
    return delta


def compute_fajr_for(
    date_obj: date,
    lat: float = None,
    lon: float = None,
    tzname: str = None,
    depression: float = 18.0,
):
    """Compute Fajr (dawn) time for a given date at specified location.

    Args:
        date_obj: Date to compute Fajr for
        lat: Latitude (defaults to config.LAT)
        lon: Longitude (defaults to config.LON)
        tzname: Timezone name (defaults to config.TZ)
        depression: Solar depression angle (defaults to 18.0 for Islamic prayer)

    Returns:
        datetime: Fajr time with timezone info
    """
    lat = lat or config.LAT
    lon = lon or config.LON
    tzname = tzname or config.TZ

    loc = LocationInfo(
        name="custom",
        region="custom",
        timezone=tzname,
        latitude=lat,
        longitude=lon,
    )
    fajr_dt = dawn(
        observer=loc.observer,
        date=date_obj,
        tzinfo=pytz.timezone(tzname),
        depression=depression,
    )
    return fajr_dt
