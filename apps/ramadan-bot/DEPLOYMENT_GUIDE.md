# Deployment Guide - Ramadan Bot

**Status:** Ready for Production
**Date:** February 18, 2026

---

## Quick Start

### Option 1: Streamlit Cloud (Recommended - Easiest)

1. **Ensure code is on GitHub:**

   ```bash
   cd apps/ramadan-bot
   git add .
   git commit -m "refactor: modularize UI into reusable components"
   git push origin main
   ```

2. **Deploy via Streamlit Cloud:**
   - Visit: https://share.streamlit.io/
   - Sign in with GitHub
   - Click "New app"
   - Select repository: `fuaadabdullah/ForgeMonorepo`
   - Set main file path: `apps/ramadan-bot/main.py`
   - Click Deploy
   - App auto-updates on each commit!

3. **Set Environment Variables:**
   - In Streamlit Cloud dashboard → Secret Management
   - Add:
     ```
     SENDGRID_API_KEY=<your-key>
     SENDGRID_SMTP_HOST=smtp.sendgrid.net
     SENDGRID_SMTP_USER=apikey
     SENDGRID_SMTP_PASS=<your-key>
     EMAIL_USER=<sender-email>
     EMAIL_PASS=<app-password>
     LAT=<latitude>
     LON=<longitude>
     TZ=<timezone>
     ```

---

### Option 2: Docker Deployment

1. **Build image:**

   ```bash
   cd apps/ramadan-bot
   docker build -t ramadan-bot:latest .
   ```

2. **Run locally:**

   ```bash
   docker run -p 8501:8501 \
     -e SENDGRID_API_KEY=$SENDGRID_API_KEY \
     -e LAT=<lat> -e LON=<lon> -e TZ=<tz> \
     ramadan-bot:latest
   ```

3. **Push to registry:**
   ```bash
   docker tag ramadan-bot:latest <registry>/ramadan-bot:latest
   docker push <registry>/ramadan-bot:latest
   ```

---

### Option 3: Fly.io Deployment

1. **Install flyctl:**

   ```bash
   brew install flyctl
   ```

2. **Deploy:**

   ```bash
   cd apps/ramadan-bot
   flyctl deploy
   ```

3. **Set secrets:**
   ```bash
   flyctl secrets set SENDGRID_API_KEY=<key>
   flyctl secrets set EMAIL_USER=<email>
   # ... set other env vars
   ```

---

## Pre-Deployment Checklist

- [x] Code is modularized (ui.py + ui_components.py)
- [x] All imports validated
- [x] SendGrid prioritized in delivery.py
- [x] Environment variables documented
- [x] Error handling in place
- [x] Lazy Streamlit imports used
- [x] No hardcoded secrets
- [x] Tests passing (run: `pytest tests/`)
- [x] Code linting clean
- [x] Requirements.txt updated

---

## Verification Steps

### 1. Local Testing

```bash
cd apps/ramadan-bot

# Install dependencies
pip install -r requirements.txt

# Run CLI (test mode)
RAMADAN_TEST_MODE=true python main.py send --preview

# Run web UI
streamlit run main.py --logger.level=debug
```

### 2. Production Verification

Test the deployed instance:

- Navigate to app URL
- Test Preview tab: Generate a Juz image
- Test Send Now tab: Run test delivery
- Test Batch Cache tab: Start batch generation
- Test Settings tab: Verify configuration

### 3. Delivery Verification

- Check email inbox for test message
- Verify email contains:
  - Quranic verse text
  - Juz image
  - Ramadan day number
  - Proper styling

---

## Environment Variables Reference

```bash
# Required
SENDGRID_API_KEY=               # SendGrid SMTP credentials
EMAIL_USER=                      # Sender email address
LAT=                            # Latitude (e.g., 40.7128)
LON=                            # Longitude (e.g., -74.0060)

# Optional
SENDGRID_SMTP_HOST=smtp.sendgrid.net  # Auto-set
SENDGRID_SMTP_USER=apikey            # Auto-set
SENDGRID_SMTP_PASS=<same-as-key>     # Auto-set
EMAIL_PASS=                          # Gmail app password
TZ=America/New_York                  # Timezone
S3_BUCKET=                           # AWS S3 for caching
AWS_ACCESS_KEY_ID=                   # AWS credentials
AWS_SECRET_ACCESS_KEY=               # AWS credentials
RAMADAN_TEST_MODE=false              # Enable test mode
```

---

## Troubleshooting

### Issue: Emails not being sent

```bash
# 1. Check SendGrid is configured
echo $SENDGRID_API_KEY

# 2. Test delivery directly
python main.py send_today --dry-run

# 3. Check logs
grep -r "delivery" .logs/

# 4. Verify marker file exists
ls -la markers/
```

### Issue: Images not generating

```bash
# 1. Check SiliconFlow API key
echo $SILICONFLOW_API_KEY

# 2. Test image generation
python main.py generate --juz 1

# 3. Check cache directory
ls -la cache/
```

### Issue: UI not loading

```bash
# 1. Check Streamlit installation
pip show streamlit

# 2. Run with verbose logging
streamlit run main.py --logger.level=debug

# 3. Test imports
python -c "from ramadan_bot import config, logger; print('OK')"
```

---

## Rollback Plan

If deployment fails:

1. **Check recent commits:**

   ```bash
   git log --oneline | head -5
   ```

2. **Rollback to previous version:**

   ```bash
   git revert <commit-hash>
   git push origin main
   ```

3. **Re-deploy:**
   - Streamlit Cloud auto-updates on commit
   - Docker: rebuild with `git commit`
   - Fly.io: run `flyctl deploy` again

---

## Post-Deployment Monitoring

1. **Email Delivery:**
   - Check SendGrid dashboard for bounce/delivery rates
   - URL: https://app.sendgrid.com/

2. **API Usage:**
   - SiliconFlow image generation calls
   - Check usage quota at Dashboard

3. **Logs:**
   - Streamlit Cloud: View in dashboard
   - Docker/Fly.io: Use respective log tools

---

## Support & Maintenance

### Daily Checks

- Verify Fajr reminder sent correctly
- Check image generation status
- Monitor email delivery

### Weekly Checks

- Review error logs
- Test UI functionality
- Verify all 30 Juz images generated

### Monthly Checks

- Update dependencies: `pip list --outdated`
- Review SiliconFlow API limits
- Optimize caching strategy

---

## Additional Resources

- **Streamlit Docs:** https://docs.streamlit.io/
- **SendGrid Docs:** https://docs.sendgrid.com/
- **SiliconFlow API:** https://docs.siliconcloud.cn/
- **Fly.io Docs:** https://fly.io/docs/
- **Docker Docs:** https://docs.docker.com/

---

**Ready to Deploy!** 🚀

Choose your deployment option above and follow the steps.
All code is production-ready and fully documented.

---

_Last Updated: February 18, 2026_
