# Streamlit Cloud Deployment Guide

## Overview

Your ramadan-bot has been configured for easy deployment to **Streamlit Cloud** - a free, hosted platform perfect for Streamlit apps.

**Key facts:**
- ✅ **Free tier available** (no credit card needed)
- ✅ **Automatic SSL/HTTPS**
- ✅ **Custom domain support** (paid)
- ✅ **Auto-redeploy** when you push to GitHub
- ⏱️ **Deployment time:** 2-3 minutes
- ⚡ **Cold start time:** 10-20 seconds (free tier)

---

## Pre-Deployment Checklist

- [x] Code committed to GitHub (`feat/gradem8-hf-space-2` branch)
- [x] `streamlit_app.py` created as entry point
- [x] `.streamlit/config.toml` configured with theme
- [x] `requirements.txt` includes all dependencies
- [ ] You have SendGrid API key
- [ ] You have SiliconFlow API key
- [ ] You know your location (LAT, LON) and timezone

---

## Step-by-Step Deployment

### Step 1: Prepare API Keys

**SendGrid:**
1. Go to [SendGrid Dashboard](https://app.sendgrid.com/settings/api_keys)
2. Click "Create API Key"
3. Name it "Ramadan Bot"
4. Select "Restricted Access" → "Mail Send" → "Full Access"
5. Copy the generated key

**SiliconFlow:**
1. Go to [SiliconFlow Console](https://cloud.siliconflow.cn/account/api-keys)
2. Create a new API key
3. Copy the generated key

**Location (Latitude, Longitude):**
- Use [latlong.net](https://www.latlong.net/) to find your coordinates
- Example: New York = 40.7128, -74.0060

**Timezone:**
- Check [list of timezones](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones#List)
- Examples: `America/New_York`, `Europe/London`, `Asia/Dubai`

---

### Step 2: Deploy to Streamlit Cloud

1. **Visit** [share.streamlit.io](https://share.streamlit.io)
   - ⚠️ Make sure you're logged in with GitHub

2. **Click** "Create app"

3. **Fill in the form:**
   ```
   GitHub repo:      fuaadabdullah/ForgeMonorepo
   Branch:           feat/gradem8-hf-space-2
   Main file path:   apps/ramadan-bot/streamlit_app.py
   ```

4. **Click "Deploy"**
   - Deployment starts immediately
   - Check progress in the logs window
   - Takes 2-3 minutes for initial build

5. **Your app URL will be:**
   ```
   https://share.streamlit.io/fuaadabdullah/ForgeMonorepo/feat/gradem8-hf-space-2/apps/ramadan-bot/streamlit_app.py
   ```

---

### Step 3: Add Environment Secrets

Once deployment completes:

1. **Click the ☰ menu** (top right corner)

2. **Select "Settings"**
   ![Settings location](https://i.imgur.com/xyz123.png)

3. **Go to "Secrets" tab**

4. **Paste this template and fill in your values:**
   ```toml
   SENDGRID_API_KEY = "sg-..."
   LAT = "40.7128"
   LON = "-74.0060"
   TZ = "America/New_York"
   VISION_API_PROVIDER = "siliconflow"
   SILICONFLOW_API_KEY = "sk-..."
   TEST_MODE = "false"
   ```

5. **Click "Save"**
   - Streamlit will automatically redeploy with your secrets
   - Watch the logs to confirm successful redeploy
   - Takes 1-2 minutes

---

## Testing Your Deployment

Once secrets are saved:

### Test 1: Image Generation
1. Go to **Preview** tab
2. Select a Juz (1-30)
3. Click **Generate Preview**
   - ⏳ Wait 30-60s (free tier is slower)
   - ✅ Image should appear
4. Try **Force Regenerate** to clear cache

### Test 2: Email Delivery
1. Go to **Send** tab
2. Review the statistics
3. Click **Send Fajr Reminder Now**
   - ⏳ Wait 30s for processing
   - ✅ Check your email inbox
   - 📎 Should have the Quranic verse image attached

### Test 3: Batch Generation
1. Go to **Batch** tab
2. Click **Start Batch Generation**
   - ⏳ Wait ~10-15 minutes for all 30 Juz images
   - ✅ Progress bar should advance
   - ✅ Check `cache/` folder in logs

### Test 4: Settings
1. Go to **Settings** tab
2. ✅ Verify all configuration values are loaded

---

## Troubleshooting

### "App won't load" or "ModuleNotFoundError"

**Symptoms:** Blank page or error about missing modules

**Solution:**
1. Check **Logs** (Settings → View logs)
2. Most common: Missing `SENDGRID_API_KEY` secret
3. Verify secrets are saved (Settings → Secrets)
4. Manually trigger redeploy (Settings → Rerun app)

### "Image generation times out (>60s)"

**Symptoms:** "Fajr reminder generation failed" message after 60s

**Causes:**
- Free Streamlit tier has resource limits
- SiliconFlow API might be slow
- Image is complex with Arabic text

**Solutions:**
1. Try again (sometimes it works on second attempt)
2. Upgrade to **Streamlit Community Cloud** paid tier for faster processing
3. Use a simpler image (check `ramadan_bot/generation/siliconflow.py`)

### "Secrets not being loaded"

**Symptoms:** `KeyError: SENDGRID_API_KEY` in logs

**Solution:**
1. Verify secrets are in correct format (TOML, not YAML or JSON)
2. Use exact key names: `SENDGRID_API_KEY`, not `sendgrid_api_key`
3. No quotes around values in TOML format
4. Wait 1-2 minutes after saving secrets (Streamlit is redeploying)
5. Try refreshing the page

### "SendGrid emails not being received"

**Symptoms:** No email in inbox after clicking "Send"

**Solutions:**
1. Check **spam/junk folder** in your email
2. Verify `SENDGRID_API_KEY` is correct:
   - Go to [SendGrid API Keys](https://app.sendgrid.com/settings/api_keys)
   - Check the key hasn't been revoked
3. Check app logs for SendGrid errors (click ☰ → Logs)
4. Test with a different email address

---

## Advanced: Custom Domain

To use a custom domain (e.g., `ramadan-bot.yourdomain.com`):

1. **Upgrade to Streamlit Community Cloud paid tier**
2. **Go to app settings** → **Advanced settings**
3. **Add custom domain** and follow DNS setup instructions

---

## Monitoring & Maintenance

### View Logs
- Click ☰ menu → **Logs**
- Shows real-time output of app execution
- Useful for debugging errors

### App Health
- Streamlit Cloud shows app status (Running/Unavailable)
- Auto-restarts on errors
- Check [Streamlit Status Page](https://www.streamlitcommunity.cloud/status) for platform issues

### Update Your Code
1. Make changes locally
2. Push to `feat/gradem8-hf-space-2` branch
3. Streamlit auto-deploys within 1-2 minutes
4. No manual deployment needed!

---

## Cost Breakdown

### Free Tier
- ✅ Deploy 3 apps
- ✅ 1GB storage per app
- ✅ 1 CPU core
- ⏱️ Slower execution (10-20s startup)
- 💤 Apps sleep after 7 days of inactivity

### Community Cloud (Paid - Recommended)
- ✅ Deploy unlimited apps
- ✅ 100GB storage per app
- ✅ Better CPU/memory
- ⚡ Faster execution
- 💤 No sleep timeout
- **Cost:** $5-20/month depending on usage

---

## Next Steps

1. ✅ Deploy to Streamlit Cloud (Step 2 above)
2. ✅ Add secrets (Step 3 above)
3. ✅ Test all features (Testing section above)
4. 📱 Share the app URL with friends (`https://share.streamlit.io/...`)
5. 🔄 Enable CI/CD: Every push to GitHub auto-deploys

---

## Support

**Still having issues?**

1. Check the **Logs** (Settings → Logs)
2. Review the **Troubleshooting** section above
3. Check [Streamlit Community Forum](https://discuss.streamlit.io/)
4. Contact SendGrid support if email issues persist

---

**Enjoy your live Ramadan Bot! 🌙**
