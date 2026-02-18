# 🌙 Ramadan Fajr Bot

A modular, production-ready Python application that generates daily Quranic images for Ramadan and delivers them via email/SMS reminders. Features image generation via SiliconFlow API, intelligent caching, and a polished Streamlit UI.

## 🎯 Project Overview

**Status:** Production  
**Type:** AI/ML + Automation  
**Tech Stack:** Python 3.9+, Streamlit, SiliconFlow API, SendGrid/SMTP, Astral, PIL  
**Repository:** [ForgeMonorepo](https://github.com/fuaadabdullah/ForgeMonorepo) → `apps/ramadan-bot/`

### Key Features

✅ **Modular Architecture** — 15+ Python modules with clear separation of concerns  
✅ **Daily Automation** — Scheduled Fajr reminders with intelligent marker tracking  
✅ **Image Generation** — SiliconFlow API integration for Quranic text overlays  
✅ **Multi-Provider Delivery** — SendGrid (primary) + Gmail/SMTP fallback  
✅ **Intelligent Caching** — Local FS + optional S3 for generated images  
✅ **Web UI** — Streamlit interface with tabs, stat cards, and progress tracking  
✅ **Test Coverage** — Unit + E2E tests with comprehensive fixtures

---

## 🏗️ Architecture

### Layered Design (5 Tiers)

```
Layer 5: CLI/UI                 (cli.py, ui.py, main.py)
         Orchestration & UX

Layer 4: Services              (delivery.py, cache.py)
         Business Logic

Layer 3: Domain Core           (core/dates.py, core/markers.py)
         Calendar & Tracking

Layer 2: Utilities             (logger.py, models.py)
         Shared Infrastructure

Layer 1: Configuration         (config.py)
         Environment & Constants
```

### Module Breakdown

- **`config.py`** (60 lines) — Centralized env vars, timezone, location, API keys
- **`logger.py`** (25 lines) — Dual output logging (file + stdout)
- **`models.py`** (120 lines) — JUZ_VERSES dictionary with Quranic citations
- **`core/dates.py`** (50 lines) — Ramadan calendar, Fajr computation via Astral
- **`core/markers.py`** (80 lines) — Sent-marker tracking (local FS + optional S3)
- **`generation/siliconflow.py`** (100 lines) — SiliconFlow API client for image generation
- **`generation/overlay.py`** (140 lines) — PIL text rendering & image composition
- **`cache.py`** (65 lines) — Image caching layer with TTL support
- **`delivery.py`** (84 lines) — SMTP/SendGrid email delivery with status tracking
- **`cli.py`** (176 lines) — Orchestration (send_today, ci_run, daemon_run)
- **`ui.py`** (420 lines) — Streamlit web interface with 4 tabs
- **`main.py`** (70 lines) — CLI entry point with argparse

---

## 🚀 Getting Started

### Installation

```bash
cd apps/ramadan-bot
pip install -r requirements.txt
```

### Configuration

Create `.env` from `.env.example`:

```bash
# Copy template
cp .env.example .env

# Edit with your settings
export SENDGRID_API_KEY="your_key_here"
export FROM_EMAIL="ramadan@example.com"
export LAT="40.7128"
export LON="-74.0060"
export TZ="America/New_York"
```

### Usage

#### Send Today's Reminder (Manual)

```bash
python main.py --send-now --force
```

#### Preview UI

```bash
python main.py --preview
# Opens http://localhost:8501
```

#### Batch Generate All 30 Juz

```bash
python main.py --preview
# Then click "💾 Batch Cache" tab → "Start Batch Generation"
```

#### Daemon Mode (Scheduled)

```bash
python main.py --daemon
# Runs in loop, sends at Fajr time daily
```

---

## 📊 UI Tour

### Tab 1: Preview 👀

- Select & preview any Juz (1-30)
- Generate full-resolution images on demand
- Force regeneration to update cache

### Tab 2: Send Now 📤

- View today's Juz & Fajr time
- Send reminder with one click
- Immediate delivery status feedback

### Tab 3: Batch Cache 💾

- Pre-generate all 30 Juz images
- Real-time progress tracking
- Success/failure breakdown by Juz

### Tab 4: Settings ⚙️

- Location config (timezone, lat/lon)
- Service status (SendGrid, Gmail, S3)
- System info (Ramadan day, current time)

---

## 🔧 Configuration Reference

### Environment Variables

| Variable           | Default            | Purpose                                    |
| ------------------ | ------------------ | ------------------------------------------ |
| `SENDGRID_API_KEY` | —                  | SendGrid API key (primary delivery)        |
| `EMAIL_USER`       | —                  | Gmail address or SMTP username             |
| `EMAIL_PASS`       | —                  | Gmail app password or SMTP password        |
| `FROM_EMAIL`       | "bot@example.com"  | Sender email address                       |
| `SMS_RECIPIENTS`   | ""                 | Comma-separated recipient emails           |
| `LAT`              | 40.7128            | Latitude for Fajr computation              |
| `LON`              | -74.0060           | Longitude for Fajr computation             |
| `TZ`               | "America/New_York" | Timezone for scheduling                    |
| `MARKER_DIR`       | "./markers"        | Directory to track sent dates              |
| `S3_BUCKET`        | —                  | AWS S3 bucket for image storage (optional) |
| `CACHE_DIR`        | "./cache"          | Image cache directory                      |
| `LOG_FILE`         | "ramadan.log"      | Log file path                              |

### SendGrid Setup

1. Get API key from [SendGrid Dashboard](https://app.sendgrid.com/keys)
2. Add to `.env`:
   ```
   SENDGRID_API_KEY=SG.your_key_12345...
   ```
3. Verify sender email in SendGrid Sender Verification

### Gmail Setup (Fallback)

1. Generate [App Password](https://myaccount.google.com/apppasswords)
2. Add to `.env`:
   ```
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=xxxx xxxx xxxx xxxx
   ```

---

## 🧪 Testing

### Run All Tests

```bash
pytest -v
```

### Run Unit Tests Only

```bash
pytest tests/unit/ -v
```

### Run E2E Tests

```bash
pytest tests/e2e/ -v
```

### Test Coverage

```bash
pytest --cov=ramadan_bot --cov-report=html
# Opens htmlcov/index.html in browser
```

---

## 📈 Performance

### Image Generation

- **First run:** ~30-45 min for 30 Juz (SiliconFlow API + PIL)
- **Cached:** ~5-10 sec per image (local FS)
- **S3 enabled:** ~200ms per image (network cost)

### Email Delivery

- **SendGrid:** <1s per email
- **Gmail SMTP:** 2-3s per email
- **Processing:** 100-500ms (image prep)

### Memory

- **Single image:** ~5-10MB
- **Full cache (30 Juz):** ~150-300MB
- **UI runtime:** ~100-200MB

---

## 🔐 Security

- ✅ Never commits API keys or secrets
- ✅ Uses environment variables for config
- ✅ Server-side-only for SendGrid/Gmail credentials
- ✅ Sent-marker tracking prevents duplicate sends
- ✅ Test mode for safe preview & testing
- ✅ Input sanitization in email headers

---

## 📝 API Reference

### Core Functions

#### `dates.py`

```python
get_today_ramadan_day() -> int
  """Get current Ramadan day (1-30) or 0 if not in Ramadan."""

compute_fajr_for(date_obj, lat=None, lon=None, tzname=None) -> datetime
  """Compute Fajr time for given date & location."""
```

#### `markers.py`

```python
already_sent_marker(date_obj: date) -> bool
  """Check if reminder was sent for this date."""

write_sent_marker(date_obj: date) -> bool
  """Mark this date as sent (prevents duplicate sends)."""
```

#### `cache.py`

```python
generate_and_cache(juz: int, force: bool = False) -> tuple
  """Generate & cache image, return (bytes, path)."""
```

#### `delivery.py`

```python
send_via_email_sms(image_path, subject, body_text, recipients=None) -> dict
  """Send email with image attachment via SendGrid/Gmail.
  Returns: {"sent": True, "recipients": [...], ...}
           {"skipped": True, "reason": "test_mode"}
  """
```

#### `cli.py`

```python
send_today(juz_override: int = None, force: bool = False) -> dict
  """Send today's Fajr reminder. Returns status dict."""

ci_run(window_minutes: int = 60) -> dict
  """CI mode: send only within window after Fajr."""

daemon_run() -> None
  """Run in loop, sending daily at Fajr time."""
```

---

## 📚 Design Patterns

- **Dependency Injection** — Services receive config, no globals
- **Factory Pattern** — `generate_and_cache()` handles image creation
- **Strategy Pattern** — Local FS vs S3 storage abstraction
- **Lazy Imports** — Streamlit only imported when `--preview` used

---

## 🎓 Lessons Learned

### Modularization Benefits

- ✅ 700-line monolith → 15 focused modules
- ✅ Each module has single responsibility
- ✅ Easy to test, debug, and extend
- ✅ Clear data flow between layers

### Delivery Architecture

- ✅ SendGrid primary (reliable, fast, scalable)
- ✅ Gmail fallback (zero cost, works everywhere)
- ✅ Status dicts throughout (debugging clarity)
- ✅ Test mode for safe validation

### UI/UX Polish

- ✅ Tabs organize functionality
- ✅ Progress bars provide feedback
- ✅ Stat cards highlight key info
- ✅ Error messages are clear & actionable

---

## 🚦 Deployment

### Local Development

```bash
# Start preview UI
python main.py --preview

# Manual test send
python main.py --send-now --force

# Daemon mode (Ctrl+C to stop)
python main.py --daemon
```

### Production (Fly.io / Docker)

```bash
# Build container
docker build -t ramadan-bot .

# Deploy to Fly.io
flyctl deploy
```

### Scheduled (Cron)

```bash
# Send daily at 6:00 AM
0 6 * * * /path/to/venv/bin/python /path/to/main.py --send-now
```

### Monitoring

- Check `ramadan.log` for execution history
- View marker files in `./markers/` to verify sends
- Test mode for safe dry-runs without sending

---

## 🤝 Contributing

Contributions welcome! Key areas:

- [ ] Add voice message support (Twilio)
- [ ] Support additional Quranic translations
- [ ] Dashboard for send history
- [ ] Batch processing optimization
- [ ] Mobile app (React Native)

---

## 📄 License

MIT — Open source, use freely

---

## 👤 Author

**Fuaad Abdullah**  
[GitHub](https://github.com/fuaadabdullah) | [Portfolio](https://fuaad.ai)

---

## 🔗 Related Projects

- **[GoblinOS](https://github.com/fuaadabdullah/GoblinOS)** — Automation framework
- **[Gaslight](https://github.com/fuaadabdullah/gaslight)** — Financial dashboard
- **[ForgeMonorepo](https://github.com/fuaadabdullah/ForgeMonorepo)** — Main workspace

---

## 📞 Support

- Issues: [GitHub Issues](https://github.com/fuaadabdullah/ForgeMonorepo/issues)
- Email: fuaadabdullah@gmail.com
- Docs: See `docs/` folder in repository
