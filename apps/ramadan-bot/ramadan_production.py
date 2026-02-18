# ramadan_production.py
# ────────────────────────────────────────────────────────────────────────────
# Ramadan Fajr Bot — single-file production app
#
# Features:
#   • Streamlit preview UI  (--preview)
#   • CLI send              (--send-now)
#   • CI-safe Fajr gate     (--ci-run)
#   • SiliconFlow image generation
#   • Arabic + English overlay (PIL + arabic-reshaper + python-bidi)
#   • Cache layer (cache/) — avoids re-generating
#   • Email-to-SMS gateway with image attachment
#   • S3 or local sent-markers for duplicate prevention
#   • Logging (logs/)
# ────────────────────────────────────────────────────────────────────────────

import os
import io
import sys
import time
import json
import uuid
import logging
import requests
import argparse
import datetime
from datetime import datetime as dt
from datetime import date, timedelta

import pytz
from astral import LocationInfo
from astral.sun import dawn
from PIL import Image, ImageDraw, ImageFont
import arabic_reshaper
from bidi.algorithm import get_display
from email.message import EmailMessage
import smtplib
import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv

# ──────────────────── load env ────────────────────
load_dotenv()

SILICONFLOW_API_KEY = os.getenv("SILICONFLOW_API_KEY")
SILICONFLOW_BASE_URL = os.getenv("SILICONFLOW_BASE_URL", "https://api.siliconflow.com")
EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASS = os.getenv("EMAIL_PASS")
FROM_EMAIL = os.getenv("FROM_EMAIL", EMAIL_USER)
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
SENDGRID_SMTP_HOST = os.getenv("SENDGRID_SMTP_HOST", "smtp.sendgrid.net")
SENDGRID_SMTP_PORT = int(os.getenv("SENDGRID_SMTP_PORT", "587"))
SENDGRID_SMTP_USER = os.getenv("SENDGRID_SMTP_USER", "apikey")
SMS_RECIPIENTS = [
    s.strip() for s in os.getenv("SMS_RECIPIENTS", "").split(",") if s.strip()
]
LAT = float(os.getenv("LAT", 40.7128))
LON = float(os.getenv("LON", -74.0060))
TZ = os.getenv("TZ", "America/New_York")
MARKER_DIR = os.getenv("MARKER_DIR", "/tmp")
TEST_MODE = os.getenv("RAMADAN_TEST_MODE", "").strip().lower() in {"1", "true", "yes"}

# Optional S3 marker config (recommended for CI to avoid duplicates)
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
S3_BUCKET = os.getenv("S3_BUCKET")  # if set, stores "sent" markers in S3

# Fonts (relative to script location for flexibility)
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
FONT_AR = os.path.join(_SCRIPT_DIR, "fonts", "Amiri-Regular.ttf")
FONT_EN = os.path.join(_SCRIPT_DIR, "fonts", "DejaVuSans.ttf")

# Folders (relative to script dir so CI working-dir doesn't matter)
CACHE_DIR = os.path.join(_SCRIPT_DIR, "cache")
LOG_DIR = os.path.join(_SCRIPT_DIR, "logs")
os.makedirs(CACHE_DIR, exist_ok=True)
os.makedirs(LOG_DIR, exist_ok=True)

# ──────────────────── logging ────────────────────
logger = logging.getLogger("ramadan_bot")
logger.setLevel(logging.INFO)
_fh = logging.FileHandler(os.path.join(LOG_DIR, "ramadan_bot.log"))
_fh.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(message)s"))
logger.addHandler(_fh)
# Also log to stdout for CI visibility
_sh = logging.StreamHandler(sys.stdout)
_sh.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(message)s"))
logger.addHandler(_sh)

# ──────────────────── curated Juz mapping ────────────────────
JUZ_VERSES = {
    1: (
        "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
        "All praise is due to Allah, Lord of the worlds. (1:2)",
    ),
    2: ("ذَٰلِكَ الْكِتَابُ لَا رَيْبَ ۛ فِيهِ", "This is the Book; there is no doubt in it. (2:2)"),
    3: ("وَاللَّهُ غَنِيٌّ حَمِيدٌ", "And Allah is Free of need, Praiseworthy. (3:9)"),
    4: (
        "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ",
        "You alone we worship; You alone we ask for help. (1:5)",
    ),
    5: ("إِنَّ الدِّينَ عِندَ اللَّهِ الْإِسْلَامُ", "The religion before Allah is Islam. (3:19)"),
    6: ("قُلْ هُوَ اللَّهُ أَحَدٌ", "Say: He is Allah, One. (112:1)"),
    7: ("رَبِّ اشْرَحْ لِي صَدْرِي", "My Lord, expand for me my chest. (20:25)"),
    8: (
        "إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ",
        "Actions are judged by intentions. (Prophetic summary)",
    ),
    9: ("وَاصْبِرْ وَمَا صَبْرُكَ إِلَّا بِاللَّهِ", "Be patient; your patience is by Allah. (16:127)"),
    10: ("ادْعُوهُ مُخْلِصِينَ لَهُ الدِّينَ", "Call upon Him sincerely in religion. (39:2)"),
    11: ("إِنَّ مَعَ الْعُسْرِ يُسْرًا", "Indeed, with hardship comes ease. (94:6)"),
    12: ("فَاذْكُرُونِي أَذْكُرْكُمْ", "Remember Me; I will remember you. (2:152)"),
    13: (
        "وَمَنْ تَوَكَّلَ عَلَى اللَّهِ فَهُوَ حَسْبُهُ",
        "Whoever relies on Allah — He is sufficient. (65:3)",
    ),
    14: ("إِنَّ اللَّهَ مَعَ الصَّابِرِينَ", "Indeed Allah is with the patient. (2:153)"),
    15: ("اتَّقُوا اللَّهَ وَقُولُوا قَوْلًا سَدِيدًا", "Fear Allah and speak a sound word. (33:70)"),
    16: (
        "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ",
        "By the remembrance of Allah hearts find peace. (13:28)",
    ),
    17: ("إِنَّمَا الْمُؤْمِنُونَ إِخْوَةٌ", "The believers are but brothers. (49:10)"),
    18: ("قُلْ يَا أَيُّهَا الْكَافِرُونَ", "Say, O disbelievers. (109:1)"),
    19: (
        "رَبُّنَا اغْفِرْ لَنَا وَلِإِخْوَانِنَا",
        "Our Lord, forgive us and our brothers. (collective dua)",
    ),
    20: ("مَا شَاءَ اللَّهُ كَانَ", "What Allah wills happens. (short reminder)"),
    21: (
        "فَتَوَكَّلْ عَلَى اللَّهِ ۚ وَكَفَىٰ بِاللَّهِ وَكِيلًا",
        "So rely upon Allah; He is sufficient as Trustee. (33:3)",
    ),
    22: (
        "إِنَّ اللَّهَ لا يُضِيعُ أَجْرَ الْمُحْسِنِينَ",
        "Allah does not let the reward of doers of good be lost. (9:120)",
    ),
    23: (
        "وَاعْبُدْ رَبَّكَ حَتَّىٰ يَأْتِيَكَ الْيَقِينُ",
        "Worship your Lord until certainty comes. (15:99)",
    ),
    24: ("قُلْ هَٰذَا صِرَاطِي مُسْتَقِيمًا", "Say: This is my straight path. (6:161)"),
    25: ("إِنَّ اللَّهَ مَعَ الْمُحْسِنِينَ", "Indeed, Allah is with the doers of good. (29:69)"),
    26: ("وَلَقَدْ خَلَقْنَا الْإِنسَانَ فِي كَبَدٍ", "We created man into hardship. (90:4)"),
    27: ("وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ", "Seek help through patience and prayer. (2:45)"),
    28: ("فَاسْتَجِبُوا لِي أُسْتَجِبْ لَكُمْ", "Call upon Me; I will respond. (40:60)"),
    29: (
        "قُلْ يَا أَيُّهَا النَّاسُ إِنِّي رَسُولُ اللَّهِ",
        "Say: O people, indeed I am Allah's messenger. (7:158)",
    ),
    30: ("إِنَّ مَعَ الْعُسْرِ يُسْرًا", "Indeed, with hardship comes ease. (94:5-6)"),
}


# ──────────────────── helpers ────────────────────


def _text_size(draw: ImageDraw.ImageDraw, text: str, font) -> tuple[int, int]:
    """Pillow 10+ removed ImageDraw.textsize(). Use textbbox instead."""
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def _marker_path(date_obj: date) -> str:
    return os.path.join(MARKER_DIR, f"ramadan_sent_{date_obj.isoformat()}")


def _test_placeholder_image_bytes(size: tuple[int, int] = (1024, 1024)) -> bytes:
    img = Image.new("RGB", size, (20, 20, 20))
    draw = ImageDraw.Draw(img)
    draw.text((20, 20), "TEST MODE", fill="white")
    out = io.BytesIO()
    img.save(out, format="PNG")
    out.seek(0)
    return out.read()


RAMADAN_START = date(2026, 2, 17)  # 1 Ramadan 1447 AH (adjust if moon sighting differs)
RAMADAN_END = date(2026, 3, 18)  # 30 Ramadan 1447 AH


def get_today_ramadan_day() -> int:
    """Return current Ramadan day (1-30) based on RAMADAN_START date.
    Returns 0 if today is outside of Ramadan."""
    today = dt.now(pytz.timezone(TZ)).date()
    delta = (today - RAMADAN_START).days + 1  # day 1 on start date
    if delta < 1 or delta > 30:
        return 0
    return delta


def compute_fajr_for(
    date_obj: date,
    lat: float = LAT,
    lon: float = LON,
    tzname: str = TZ,
    depression: float = 18.0,
):
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


# ── sent-markers (S3 or local /tmp) ──


def already_sent_marker(date_obj: date, use_s3: bool = False) -> bool:
    key = f"sent-markers/{date_obj.isoformat()}.ok"
    if use_s3 and S3_BUCKET and AWS_ACCESS_KEY_ID:
        s3 = boto3.client(
            "s3",
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            region_name=AWS_REGION,
        )
        try:
            s3.head_object(Bucket=S3_BUCKET, Key=key)
            return True
        except ClientError:
            return False
    else:
        path = _marker_path(date_obj)
        return os.path.exists(path)


def write_sent_marker(date_obj: date, use_s3: bool = False) -> bool:
    key = f"sent-markers/{date_obj.isoformat()}.ok"
    if use_s3 and S3_BUCKET and AWS_ACCESS_KEY_ID:
        s3 = boto3.client(
            "s3",
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            region_name=AWS_REGION,
        )
        s3.put_object(Bucket=S3_BUCKET, Key=key, Body=b"sent")
        return True
    else:
        os.makedirs(MARKER_DIR, exist_ok=True)
        path = _marker_path(date_obj)
        with open(path, "w") as f:
            f.write(dt.now().isoformat())
        return True


# ── image generation ──


def siliconflow_generate_bytes(
    api_key: str,
    model: str,
    prompt: str,
    image_size: str = "1024x1024",
    steps: int = 20,
    max_retries: int = 3,
) -> bytes:
    if TEST_MODE:
        logger.info("RAMADAN_TEST_MODE enabled: returning placeholder image")
        return _test_placeholder_image_bytes()
    if not api_key:
        raise RuntimeError("SILICONFLOW_API_KEY is not configured")
    url = f"{SILICONFLOW_BASE_URL.rstrip('/')}/v1/images/generations"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    body = {
        "model": model,
        "prompt": prompt,
        "image_size": image_size,
        "batch_size": 1,
        "num_inference_steps": steps,
        "guidance_scale": 7.5,
    }
    logger.info(f"Calling SiliconFlow API: {url}")
    logger.debug(f"Request body: {body}")

    last_resp = None
    for attempt in range(1, max_retries + 1):
        resp = requests.post(url, headers=headers, json=body, timeout=120)
        last_resp = resp
        if resp.status_code == 200:
            data = resp.json()
            break

        retryable = resp.status_code in {429, 500, 502, 503, 504}
        logger.warning(
            "SiliconFlow API error (attempt %d/%d): Status %d, Response: %s",
            attempt,
            max_retries,
            resp.status_code,
            resp.text[:1000],
        )
        if not retryable or attempt == max_retries:
            resp.raise_for_status()

        retry_after = resp.headers.get("Retry-After")
        if retry_after:
            try:
                sleep_s = float(retry_after)
            except ValueError:
                sleep_s = 2 ** (attempt - 1)
        else:
            sleep_s = 2 ** (attempt - 1)
        time.sleep(sleep_s)
    else:
        raise RuntimeError(
            f"SiliconFlow API failed after {max_retries} attempts: {last_resp.text if last_resp else 'no response'}"
        )

    image_url = None
    if isinstance(data, dict):
        if "images" in data and len(data["images"]) > 0:
            image_url = data["images"][0].get("url") or data["images"][0].get("image")
        elif "data" in data and len(data["data"]) > 0:
            image_url = data["data"][0].get("url")
    if not image_url:
        raise RuntimeError(f"Unexpected SiliconFlow response: {data}")

    img_resp = requests.get(image_url, timeout=120)
    img_resp.raise_for_status()
    return img_resp.content


# ── overlay ──


def overlay_quran_text_bytes(
    image_bytes: bytes,
    arabic_text: str,
    english_text: str,
    out_size: tuple[int, int] = (1024, 1024),
) -> bytes:
    img = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
    img = img.resize(out_size, Image.LANCZOS)

    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Translucent box at bottom
    box_h = int(img.height * 0.22)
    box_y = img.height - box_h
    draw.rectangle([(0, box_y), (img.width, img.height)], fill=(0, 0, 0, 180))

    # Arabic reshaping (RTL)
    try:
        reshaped = arabic_reshaper.reshape(arabic_text)
        bidi_ar = get_display(reshaped)
    except Exception:
        bidi_ar = arabic_text

    # Load fonts (graceful fallback)
    ar_font_size = 48
    try:
        ar_font = ImageFont.truetype(FONT_AR, ar_font_size)
    except Exception:
        ar_font = ImageFont.load_default()
        ar_font_size = 20

    en_font_size = 28
    try:
        en_font = ImageFont.truetype(FONT_EN, en_font_size)
    except Exception:
        en_font = ImageFont.load_default()
        en_font_size = 14

    max_width = int(img.width * 0.9)

    # Shrink Arabic font until it fits width
    while True:
        w, _ = _text_size(draw, bidi_ar, font=ar_font)
        if w <= max_width or ar_font_size <= 14:
            break
        ar_font_size -= 2
        try:
            ar_font = ImageFont.truetype(FONT_AR, ar_font_size)
        except Exception:
            break

    # Shrink English font similarly
    while True:
        w2, _ = _text_size(draw, english_text, font=en_font)
        if w2 <= max_width or en_font_size <= 12:
            break
        en_font_size -= 2
        try:
            en_font = ImageFont.truetype(FONT_EN, en_font_size)
        except Exception:
            break

    # Center positions
    ar_x = img.width // 2
    ar_y = box_y + 20
    en_x = img.width // 2
    en_y = box_y + int(box_h * 0.55)

    draw.text((ar_x, ar_y), bidi_ar, font=ar_font, fill="white", anchor="ma")
    draw.text((en_x, en_y), english_text, font=en_font, fill="white", anchor="ma")

    final = Image.alpha_composite(img, overlay)
    out = io.BytesIO()
    final.convert("RGB").save(out, format="PNG", optimize=True)
    out.seek(0)
    return out.read()


# ── cache ──


def cache_path_for_juz(juz: int, date_tag: str | None = None) -> str:
    if date_tag:
        return os.path.join(CACHE_DIR, f"juz_{juz}_{date_tag}.png")
    return os.path.join(CACHE_DIR, f"juz_{juz}.png")


def generate_and_cache(
    juz: int,
    force: bool = False,
    date_tag: str | None = None,
    model: str = "black-forest-labs/FLUX.1-schnell",
) -> tuple[bytes, str]:
    path = cache_path_for_juz(juz, date_tag)
    if os.path.exists(path) and not force:
        logger.info("Using cached image for juz %d -> %s", juz, path)
        with open(path, "rb") as f:
            return f.read(), path

    logger.info("Generating image for juz %d", juz)
    prompt = (
        f"peaceful islamic illustration representing Juz {juz} of the Quran, "
        "mosque at dawn, geometric patterns, morning light, high detail, no faces"
    )
    image_bytes = siliconflow_generate_bytes(SILICONFLOW_API_KEY, model, prompt)
    arabic, english = JUZ_VERSES.get(juz, ("", ""))
    final_bytes = overlay_quran_text_bytes(image_bytes, arabic, english)
    with open(path, "wb") as f:
        f.write(final_bytes)
    return final_bytes, path


# ── email-to-SMS ──


def send_via_email_sms(
    image_path: str,
    subject: str,
    body_text: str,
    recipients: list[str] | None = None,
    smtp_server: str | None = None,
    smtp_port: int | None = None,
) -> None:
    if recipients is None:
        recipients = SMS_RECIPIENTS

    if TEST_MODE:
        logger.info("RAMADAN_TEST_MODE enabled: skipping SMTP send to %s", recipients)
        return

    smtp_server = smtp_server or SMTP_SERVER
    smtp_port = smtp_port or SMTP_PORT

    smtp_user = EMAIL_USER
    smtp_pass = EMAIL_PASS

    if SENDGRID_API_KEY:
        smtp_server = SENDGRID_SMTP_HOST
        smtp_port = SENDGRID_SMTP_PORT
        smtp_user = SENDGRID_SMTP_USER
        smtp_pass = SENDGRID_API_KEY

    if not smtp_user or not smtp_pass:
        raise RuntimeError("SMTP credentials are not configured")

    msg = EmailMessage()
    msg["Subject"] = subject
    from_name = os.getenv("FROM_NAME", "Ramadan Fajr Bot")
    msg["From"] = f"{from_name} <{FROM_EMAIL}>"
    msg["To"] = ", ".join(recipients)
    msg.set_content(body_text)

    with open(image_path, "rb") as f:
        img_data = f.read()
    msg.add_attachment(
        img_data,
        maintype="image",
        subtype="png",
        filename=os.path.basename(image_path),
    )

    server = smtplib.SMTP(smtp_server, smtp_port)
    server.starttls()
    server.login(smtp_user, smtp_pass)
    server.send_message(msg)
    server.quit()
    logger.info("Sent SMS email to %s with image %s", recipients, image_path)


# ──────────────────── main orchestration ────────────────────


def send_today(
    juz_override: int | None = None,
    force: bool = False,
    date_tag: str | None = None,
) -> dict:
    juz = juz_override if juz_override else get_today_ramadan_day()
    if juz == 0 and not juz_override:
        logger.info(
            "Today is outside Ramadan (%s – %s), nothing to send.",
            RAMADAN_START.isoformat(),
            RAMADAN_END.isoformat(),
        )
        return {"skipped": True, "reason": "outside_ramadan"}

    today_date = dt.now(pytz.timezone(TZ)).date()
    if date_tag is None:
        date_tag = today_date.isoformat()

    use_s3 = bool(S3_BUCKET and AWS_ACCESS_KEY_ID)
    if already_sent_marker(today_date, use_s3=use_s3) and not force:
        logger.info("Already sent for %s, skipping", today_date.isoformat())
        return {"skipped": True, "reason": "already_sent"}

    try:
        final_bytes, path = generate_and_cache(juz, force=force, date_tag=date_tag)
        subj = f"Fajr: Juz {juz}"
        _, eng = JUZ_VERSES.get(juz, ("", ""))
        body = f"Juz {juz}\n{eng}"
        send_via_email_sms(path, subj, body)
        write_sent_marker(today_date, use_s3=use_s3)
        return {"sent": True, "path": path}
    except Exception as e:
        logger.exception("Error in send_today")
        return {"error": str(e)}


# ──────────────────── CLI / CI integration ────────────────────


def ci_run(window_minutes: int = 60, force: bool = False) -> dict:
    """Compute Fajr for today; send only if within window_minutes of Fajr."""
    today = dt.now(pytz.timezone(TZ)).date()

    # Check Ramadan bounds first
    if today < RAMADAN_START or today > RAMADAN_END:
        logger.info(
            "Outside Ramadan (%s – %s), nothing to do.", RAMADAN_START, RAMADAN_END
        )
        return {"skipped": True, "reason": "outside_ramadan"}

    fajr_dt = compute_fajr_for(today, LAT, LON, TZ)
    now = dt.now(pytz.timezone(TZ))
    logger.info(
        "CI run: now=%s  fajr=%s  ramadan_day=%d",
        now.isoformat(),
        fajr_dt.isoformat(),
        get_today_ramadan_day(),
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
    """Run continuously through Ramadan, sleeping until Fajr each day."""
    logger.info("Daemon mode started. Ramadan: %s to %s", RAMADAN_START, RAMADAN_END)
    tz = pytz.timezone(TZ)

    while True:
        today = dt.now(tz).date()

        if today > RAMADAN_END:
            logger.info("Ramadan is over. Daemon exiting. Eid Mubarak! 🌙")
            break

        if today < RAMADAN_START:
            wake = dt.combine(RAMADAN_START, datetime.time(4, 0), tzinfo=tz)
            sleep_secs = max(0, (wake - dt.now(tz)).total_seconds())
            logger.info(
                "Ramadan hasn't started. Sleeping %.0f seconds until %s",
                sleep_secs,
                wake,
            )
            time.sleep(sleep_secs)
            continue

        ramadan_day = get_today_ramadan_day()
        if ramadan_day == 0:
            logger.info("Outside Ramadan range, exiting daemon.")
            break

        # Check if already sent today
        use_s3 = bool(S3_BUCKET and AWS_ACCESS_KEY_ID)
        if already_sent_marker(today, use_s3=use_s3):
            logger.info("Day %d already sent, advancing to tomorrow.", ramadan_day)
            tomorrow = today + timedelta(days=1)
            # Sleep until 4:00 AM tomorrow (well before earliest Fajr)
            wake = dt.combine(tomorrow, datetime.time(4, 0), tzinfo=tz)
            sleep_secs = max(0, (wake - dt.now(tz)).total_seconds())
            logger.info("Sleeping %.0f seconds until %s", sleep_secs, wake)
            time.sleep(sleep_secs)
            continue

        # Calculate Fajr for today
        fajr_dt = compute_fajr_for(today, LAT, LON, TZ)
        now = dt.now(tz)

        # If before Fajr, sleep until 5 minutes before Fajr
        if now < fajr_dt:
            wait_until = fajr_dt - timedelta(minutes=5)
            sleep_secs = max(0, (wait_until - now).total_seconds())
            logger.info(
                "Day %d: Fajr at %s, sleeping %.0f seconds",
                ramadan_day,
                fajr_dt.strftime("%H:%M"),
                sleep_secs,
            )
            time.sleep(sleep_secs)

        # Send!
        logger.info("Day %d: Sending Fajr message (Juz %d)", ramadan_day, ramadan_day)
        result = send_today()
        logger.info("Day %d result: %s", ramadan_day, json.dumps(result))

        # If sent or already sent, advance to tomorrow
        tomorrow = today + timedelta(days=1)
        wake = dt.combine(tomorrow, datetime.time(4, 0), tzinfo=tz)
        sleep_secs = max(0, (wake - dt.now(tz)).total_seconds())
        logger.info("Sleeping %.0f seconds until next day %s", sleep_secs, wake.date())
        time.sleep(sleep_secs)


# ──────────────────── Streamlit UI ────────────────────


def run_streamlit_ui():  # pragma: no cover
    import streamlit as st  # deferred import so CLI doesn't require streamlit

    st.set_page_config(page_title="Ramadan Fajr Bot", layout="centered")
    st.title("🌙 Ramadan Fajr Bot (production)")

    st.sidebar.header("Config")
    st.sidebar.write(f"TZ: {TZ}  |  Lat/Lon: {LAT},{LON}")

    # ── Preview ──
    st.header("Preview")
    selected = st.selectbox(
        "Preview Juz",
        list(range(1, 31)),
        index=get_today_ramadan_day() - 1,
    )
    if st.button("Generate Preview"):
        try:
            _, path = generate_and_cache(
                selected,
                force=True,
                date_tag=dt.now().date().isoformat(),
            )
            st.image(path, caption=f"Juz {selected}", use_container_width=True)
            st.success("Preview generated")
        except Exception as e:
            st.error(f"Preview failed: {e}")

    # ── Actions ──
    st.header("Actions")
    if st.button("Send Today's SMS Now"):
        res = send_today(force=True)
        if res.get("sent"):
            st.success("Sent successfully")
        elif res.get("skipped"):
            st.info(f"Skipped: {res.get('reason')}")
        else:
            st.error(f"Error: {res.get('error')}")

    if st.button("Pre-generate All 30 Juz (cache)"):
        st.info("Generating 30 images… this may take time.")
        progress = st.progress(0)
        for j in range(1, 31):
            st.write(f"Generating Juz {j} …")
            try:
                generate_and_cache(j, force=False, date_tag=dt.now().date().isoformat())
                st.write("✅ OK")
            except Exception as e:
                st.write(f"❌ ERR: {e}")
            progress.progress(j / 30)
        st.success("Done pre-generating")


# ──────────────────── entrypoint ────────────────────

if __name__ == "__main__":  # pragma: no cover
    parser = argparse.ArgumentParser(description="Ramadan Fajr Bot")
    parser.add_argument(
        "--ci-run",
        action="store_true",
        help="CI mode: compute fajr and send only if within fajr window",
    )
    parser.add_argument(
        "--preview",
        action="store_true",
        help="Launch Streamlit UI (use: streamlit run ramadan_production.py -- --preview)",
    )
    parser.add_argument(
        "--send-now",
        action="store_true",
        help="Send today's image immediately",
    )
    parser.add_argument("--juz", type=int, help="Force specific juz number (1-30)")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force actions even if sent-marker already exists",
    )
    parser.add_argument(
        "--daemon",
        action="store_true",
        help="Daemon mode: run continuously through Ramadan, sleeping between Fajrs",
    )
    args = parser.parse_args()

    if args.preview:
        run_streamlit_ui()
    elif args.daemon:
        daemon_run()
    elif args.ci_run:
        res = ci_run(force=args.force)
        print(json.dumps(res))
        sys.exit(0)
    elif args.send_now:
        res = send_today(juz_override=args.juz, force=args.force)
        print(json.dumps(res))
    else:
        print(
            "No mode selected. Use --daemon for auto-run, --ci-run for CI, "
            "--send-now to send immediately, or --preview for UI."
        )
