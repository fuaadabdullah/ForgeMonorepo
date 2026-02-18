# Ramadan Fajr Bot

Production-ready Ramadan daily image bot. Generates islamically-themed images with Quran verse
overlays (Arabic + English), caches them, and delivers via email-to-SMS gateway -- timed to Fajr.

## What it does

1. **Generates** an image per Juz (1-30) via SiliconFlow API (deepforest model)
2. **Overlays** Arabic calligraphy + English translation using PIL
3. **Caches** generated images locally (`cache/`) to avoid re-generation costs
4. **Sends** via email-to-SMS carrier gateways (free SMS, $0 cost)
5. **Gates on Fajr**: CI runs hourly but only sends during a configurable window after Fajr
6. **Deduplicates**: S3 or local markers prevent double-sends

## Quick start

```bash
cd apps/ramadan-bot

# 1. Install deps
pip install -r requirements.txt

# 2. Download fonts
bash fonts/download_fonts.sh

# 3. Configure
cp .env.example .env
# Edit .env with your secrets

# 4. Test preview (Streamlit UI)
streamlit run ramadan_production.py -- --preview

# 5. Test send (one recipient first!)
python ramadan_production.py --send-now --juz 1 --force
```

## CLI modes

| Command                                            | Description                                                     |
| -------------------------------------------------- | --------------------------------------------------------------- |
| `streamlit run ramadan_production.py -- --preview` | Streamlit UI: preview images, send manually, pre-generate cache |
| `python ramadan_production.py --ci-run`            | CI mode: compute Fajr, send only if within window               |
| `python ramadan_production.py --send-now`          | Send today's image immediately                                  |
| `python ramadan_production.py --send-now --juz 5`  | Send Juz 5 specifically                                         |
| `python ramadan_production.py --send-now --force`  | Force-send even if already sent today                           |

## Testing

Unit + E2E tests live under `tests/` and are run with `pytest`. Use test mode to avoid real
API/SMTP calls during automated runs.

```bash
cd apps/ramadan-bot
export RAMADAN_TEST_MODE=1
pytest -q --cov=ramadan_production --cov-report=term-missing --cov-fail-under=80
```

Notes:

- `RAMADAN_TEST_MODE=1` skips SiliconFlow + SMTP and uses a placeholder image.
- `MARKER_DIR` can override the local sent-marker directory (defaults to `/tmp`).

## Architecture

```text
                 +------------------+
  CI (hourly) -->| ramadan_prod.py  |
                 |   --ci-run       |
                 +--------+---------+
                          |
              Is it Fajr? | (astral lib)
                 yes      |     no
                  |       v      |
                  v    skip/exit v
         +--------+--------+
         | generate_and_cache |
         | (SiliconFlow API)  |
         +--------+----------+
                  |
         +--------v----------+
         | overlay_quran_text |
         | (PIL + arabic_bidi)|
         +--------+----------+
                  |
         +--------v----------+
         | send_via_email_sms |
         | (SMTP -> carrier)  |
         +--------+----------+
                  |
         +--------v----------+
         | write_sent_marker  |
         | (S3 or /tmp)       |
         +-------------------+
```

## Environment variables

See `.env.example` for the full list. Critical ones:

| Variable              | Required | Notes                                     |
| --------------------- | -------- | ----------------------------------------- |
| `SILICONFLOW_API_KEY` | Yes      | Image generation API key                  |
| `EMAIL_USER`          | Yes      | SMTP login (Gmail: use App Password)      |
| `EMAIL_PASS`          | Yes      | SMTP password (NOT your account password) |
| `SMS_RECIPIENTS`      | Yes      | Comma-separated carrier email gateways    |
| `LAT` / `LON` / `TZ`  | Yes      | Location for Fajr calculation             |
| `S3_BUCKET`           | No       | For reliable duplicate prevention in CI   |
| `AWS_ACCESS_KEY_ID`   | No       | Required only if using S3 markers         |

## CI/CD

### GitHub Actions (primary)

Workflow: `.github/workflows/ramadan-ci.yml`

- **Schedule**: hourly (`0 * * * *`)
- **Gate**: script computes Fajr and only sends within a 30-minute window
- **Secrets**: Add all env vars in repo Settings > Secrets

### CircleCI (backup)

Config: `apps/ramadan-bot/.circleci/config.yml`

- **Schedule**: hourly on `main`
- **Env vars**: Set in CircleCI project settings

Both runners are safe to run simultaneously -- the sent-marker system prevents duplicates (use S3
markers for cross-runner dedup).

## Carrier SMS gateways

| Carrier  | Gateway format                     |
| -------- | ---------------------------------- |
| Verizon  | `<number>@vtext.com`               |
| T-Mobile | `<number>@tmomail.net`             |
| AT&T     | `<number>@txt.att.net`             |
| Sprint   | `<number>@messaging.sprintpcs.com` |

Some carriers block image attachments or convert them to links. Test with one recipient first.

## Cost notes

- **SiliconFlow**: Free tier available. Keep inference steps low (12-25). Pre-generate all 30 images
  at once via the Streamlit UI to minimize API calls.
- **SMS**: $0 -- email-to-SMS gateways are free.
- **S3 markers**: Pennies/month (tiny text files).

## Fonts

Required in `fonts/`:

- `Amiri-Regular.ttf` -- Arabic naskh typeface (OFL)
- `DejaVuSans.ttf` -- Latin fallback (Bitstream Vera)

Auto-download: `bash fonts/download_fonts.sh`

## Logs

Runtime logs: `logs/ramadan_bot.log` (gitignored).

## File structure

```text
apps/ramadan-bot/
  ramadan_production.py    # Single-file production app
  requirements.txt         # Python deps
  .env.example             # Template for secrets
  .gitignore               # Ignores cache, logs, .env, fonts
  .circleci/config.yml     # CircleCI backup runner
  fonts/
    download_fonts.sh      # Auto-downloads required fonts
    README.md              # Font documentation
  cache/                   # Generated images (gitignored)
  logs/                    # Runtime logs (gitignored)
```

GitHub Actions workflow lives at repo root: `.github/workflows/ramadan-ci.yml`
