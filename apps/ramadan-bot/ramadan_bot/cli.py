"""CLI orchestration — main business logic."""

import json
import pytz
from datetime import datetime as dt, timedelta, date

from . import config
from .logger import logger
from .core.dates import get_today_ramadan_day, compute_fajr_for
from .core.markers import already_sent_marker, write_sent_marker
from .cache import generate_and_cache
from .delivery import send_via_email_sms
from .models import JUZ_VERSES

__all__ = ["send_today", "ci_run", "daemon_run"]


def send_today(
    juz_override: int = None,
    force: bool = False,
    date_tag: str = None,
) -> dict:
    """Generate and send today's Fajr message.

    Args:
        juz_override: Force a specific Juz number (1-30)
        force: Ignore sent marker and send anyway
        date_tag: Custom date tag for caching

    Returns:
        dict: Result dict with 'sent', 'skipped', or 'error' key
    """
    juz = juz_override if juz_override else get_today_ramadan_day()

    if juz == 0 and not juz_override:
        logger.info(
            f"Today is outside Ramadan ({config.RAMADAN_START.isoformat()} – "
            f"{config.RAMADAN_END.isoformat()}), nothing to send."
        )
        return {"skipped": True, "reason": "outside_ramadan"}

    today_date = dt.now(pytz.timezone(config.TZ)).date()
    if date_tag is None:
        date_tag = today_date.isoformat()

    use_s3 = bool(config.S3_BUCKET and config.AWS_ACCESS_KEY_ID)

    if already_sent_marker(today_date, use_s3=use_s3) and not force:
        logger.info(f"Already sent for {today_date.isoformat()}, skipping")
        return {"skipped": True, "reason": "already_sent"}

    try:
        final_bytes, path = generate_and_cache(juz, force=force, date_tag=date_tag)
        subj = f"Fajr: Juz {juz}"
        _, eng = JUZ_VERSES.get(juz, ("", ""))
        body = f"Juz {juz}\n{eng}"

        delivery_result = send_via_email_sms(path, subj, body)
        logger.info(f"Delivery result: {delivery_result}")
        write_sent_marker(today_date, use_s3=use_s3)
        logger.info(f"Successfully sent Fajr message for Juz {juz}")

        return {"sent": True, "path": path, "juz": juz}
    except Exception as e:
        logger.exception("Error in send_today")
        return {"error": str(e)}


def ci_run(window_minutes: int = 60, force: bool = False) -> dict:
    """CI mode — compute Fajr and send only if within window.

    Args:
        window_minutes: Minutes after Fajr to send (default: 60)
        force: Skip time check and send anyway

    Returns:
        dict: Result dict
    """
    today = dt.now(pytz.timezone(config.TZ)).date()

    # Check Ramadan bounds
    if today < config.RAMADAN_START or today > config.RAMADAN_END:
        logger.info(
            f"Outside Ramadan ({config.RAMADAN_START} – {config.RAMADAN_END}), "
            "nothing to do."
        )
        return {"skipped": True, "reason": "outside_ramadan"}

    # Compute Fajr and check if within window
    fajr_dt = compute_fajr_for(today, config.LAT, config.LON, config.TZ)
    now = dt.now(pytz.timezone(config.TZ))

    logger.info(
        f"CI run: now={now.isoformat()}  fajr={fajr_dt.isoformat()}  ramadan_day={get_today_ramadan_day()}"
    )

    if fajr_dt <= now <= (fajr_dt + timedelta(minutes=window_minutes)) or force:
        logger.info("Within fajr window -> attempt sending")
        return send_today()
    else:
        logger.info("Not within fajr window -> exiting")
        return {
            "skipped": True,
            "reason": "not_fajr_time",
            "now": now.isoformat(),
            "fajr": fajr_dt.isoformat(),
        }


def daemon_run() -> None:  # pragma: no cover
    """Continuous daemon mode — sleep until Fajr each day during Ramadan."""
    import datetime as dt_mod
    import time

    logger.info(
        f"Daemon mode started. Ramadan: {config.RAMADAN_START} to {config.RAMADAN_END}"
    )
    tz = pytz.timezone(config.TZ)

    while True:
        today = dt.now(tz).date()

        if today > config.RAMADAN_END:
            logger.info("Ramadan is over. Daemon exiting. Eid Mubarak! 🌙")
            break

        if today < config.RAMADAN_START:
            wake = dt.combine(config.RAMADAN_START, dt_mod.time(4, 0), tzinfo=tz)
            sleep_secs = max(0, (wake - dt.now(tz)).total_seconds())
            logger.info(
                f"Ramadan hasn't started. Sleeping {sleep_secs:.0f} seconds until {wake}"
            )
            time.sleep(sleep_secs)
            continue

        ramadan_day = get_today_ramadan_day()
        if ramadan_day == 0:
            logger.info("Outside Ramadan range, exiting daemon.")
            break

        # Check if already sent
        use_s3 = bool(config.S3_BUCKET and config.AWS_ACCESS_KEY_ID)
        if already_sent_marker(today, use_s3=use_s3):
            logger.info(f"Day {ramadan_day} already sent, advancing to tomorrow.")
            tomorrow = today + timedelta(days=1)
            wake = dt.combine(tomorrow, dt_mod.time(4, 0), tzinfo=tz)
            sleep_secs = max(0, (wake - dt.now(tz)).total_seconds())
            logger.info(f"Sleeping {sleep_secs:.0f} seconds until {wake}")
            time.sleep(sleep_secs)
            continue

        # Calculate Fajr and wait
        fajr_dt = compute_fajr_for(today, config.LAT, config.LON, config.TZ)
        now = dt.now(tz)

        if now < fajr_dt:
            wait_until = fajr_dt - timedelta(minutes=5)
            sleep_secs = max(0, (wait_until - now).total_seconds())
            logger.info(
                f"Day {ramadan_day}: Fajr at {fajr_dt.strftime('%H:%M')}, "
                f"sleeping {sleep_secs:.0f} seconds"
            )
            time.sleep(sleep_secs)

        # Send!
        logger.info(f"Day {ramadan_day}: Sending Fajr message (Juz {ramadan_day})")
        result = send_today()
        logger.info(f"Day {ramadan_day} result: {json.dumps(result)}")

        # Advance to next day
        tomorrow = today + timedelta(days=1)
        wake = dt.combine(tomorrow, dt_mod.time(4, 0), tzinfo=tz)
        sleep_secs = max(0, (wake - dt.now(tz)).total_seconds())
        logger.info(f"Sleeping {sleep_secs:.0f} seconds until next day {wake.date()}")
        time.sleep(sleep_secs)
