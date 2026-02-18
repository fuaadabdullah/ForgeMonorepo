"""Core Ramadan calendar logic."""

# Expose submodules for imports
from .dates import get_today_ramadan_day, compute_fajr_for
from .markers import already_sent_marker, write_sent_marker

__all__ = [
    "get_today_ramadan_day",
    "compute_fajr_for",
    "already_sent_marker",
    "write_sent_marker",
]
