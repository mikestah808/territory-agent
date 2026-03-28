# 🚀 DEPLOYMENT GUIDE - Territory Intelligence Agent

Follow these exact steps to deploy your autonomous agent in the next 10 minutes.

## Prerequisites Checklist

Before starting, you need:
- [ ] Anthropic API key (from console.anthropic.com)
- [ ] Slack webhook URL (from api.slack.com/messaging/webhooks)
- [ ] GitHub account
- [ ] Railway account (free - sign up at railway.app)

---

## STEP 1: Get API Keys (5 minutes)

### Anthropic API Key

1. Go to: https://console.anthropic.com/settings/keys
2. Click "Create Key"
3. Name it: "Territory Agent"
4. Copy the key that starts with `sk-ant-`
5. **Save it somewhere safe** (you'll need it in Step 4)

### Slack Webhook

1. Go to: https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. App name: `Territory Agent`
4. Pick your workspace → "Create App"
5. In left sidebar: "Incoming Webhooks"
6. Toggle "Activate Incoming Webhooks" to ON
7. Scroll down → "Add New Webhook to Workspace"
8. Pick a channel (I recommend creating `#bdr-intel` or use `#general`)
9. Click "Allow"
10. Copy the webhook URL (looks like `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXX`)
11. **Save it** (you'll need it in Step 4)

---

## STEP 2: Download & Upload to GitHub (3 minutes)

### Option A: Command Line (if you're comfortable with git)

```bash
# Download the agent code (already packaged for you)
# Extract territory-agent-v2.tar.gz to your local machine

# Navigate to the folder
cd territory-agent-v2

# Initialize git
git init
git add .
git commit -m "Initial commit - Territory intelligence agent"

# Create new repo on GitHub
# Go to github.com/new and create "territory-agent"

# Link and push
git remote add origin https://github.com/YOUR_USERNAME/territory-agent.git
git branch -M main
git push -u origin main
```

### Option B: GitHub Web UI (easier if not familiar with git)

1. Go to: https://github.com/new
2. Repository name: `territory-agent`
3. Make it **Private** (contains your API keys later)
4. Click "Create repository"
5. Click "uploading an existing file"
6. Extract `territory-agent-v2.tar.gz` on your computer
7. Drag all files from the extracted folder into GitHub
8. Scroll down → "Commit changes"

---

## STEP 3: Deploy to Railway (2 minutes)

1. Go to: https://railway.app/
2. Click "Login" → Sign in with GitHub
3. Click "New Project"
4. Click "Deploy from GitHub repo"
5. Click "Configure GitHub App" → Select `territory-agent` repo
6. Click "Deploy Now"

Railway will automatically:
- Detect Node.js
- Install dependencies
- Start the agent

**Don't close this page** - you need to add environment variables next.

---

## STEP 4: Configure Environment Variables (2 minutes)

In your Railway project dashboard:

1. Click the `territory-agent-v2` service card
2. Click "Variables" tab
3. Click "New Variable" and add these one by one:

```
ANTHROPIC_API_KEY
[paste your sk-ant-... key from Step 1]

SLACK_WEBHOOK_URL
[paste your https://hooks.slack.com/... URL from Step 1]

TERRITORY_SOURCE
outreach

SCAN_SCHEDULE
0 */6 * * *

RESCAN_INTERVAL_HOURS
24

HEADCOUNT_GROWTH_THRESHOLD
15

AUTO_DRAFT_OUTREACH
true

REQUIRE_APPROVAL
true

RUN_ON_STARTUP
true

NODE_ENV
production
```

4. Click "Deploy" to restart with new variables

---

## STEP 5: Verify It's Running (1 minute)

1. In Railway dashboard → Click "Deployments" tab
2. Watch the latest deployment
3. Click it → View logs
4. You should see:

```
🚀 Territory Intelligence Agent starting...
📅 Schedule: 0 */6 * * * (every 6 hours)
🔔 Slack: Configured
✅ Agent running - waiting for scheduled scans
🏃 Running initial scan (RUN_ON_STARTUP=true)...
🤖 Starting territory scan...
🔄 Syncing territory from Outreach...
```

5. Check your Slack channel - within ~2 minutes you should get:

```
🤖 Territory Intelligence Scan Complete
Territory: +176 / -0 accounts
Scanned: 176 accounts
Signals: X new buying signals
Duration: XXs
```

---

## STEP 6: Test Territory Sync

**Add a test account in Outreach:**
1. Go to Outreach
2. Add a new prospect (any company)
3. Wait for next scan (max 6 hours, or trigger manually below)

**Force immediate scan (optional):**
In Railway → Deployments → Click active deployment → "Restart"

Check Slack - you should see:
```
🔄 Territory Updated
➕ Added (1): [Your Test Company]
```

---

## Troubleshooting

### "No territory accounts found"
- Check Outreach MCP is connected in Claude.ai
- Verify you have prospects assigned to you in Outreach
- Fallback: Set `TERRITORY_ACCOUNTS=domain1.com,domain2.com` manually

### "Anthropic API error"
- Verify API key is correct (starts with `sk-ant-`)
- Check you have credits at console.anthropic.com/settings/billing

### "No Slack notifications"
- Test webhook: 
  ```bash
  curl -X POST -H 'Content-Type: application/json' \
  -d '{"text":"Test from terminal"}' \
  YOUR_WEBHOOK_URL
  ```
- Check webhook channel still exists
- Verify app wasn't removed from workspace

### "Database errors"
Railway creates persistent storage automatically. If you see database errors:
- Check Railway dashboard → Your service → "Data" tab
- Volume should be mounted at `/data`
- Restart deployment if needed

---

## Next Steps

✅ Agent is running 24/7
✅ Monitoring your territory autonomously
✅ You'll get Slack alerts for:
   - New accounts added to territory
   - Buying signals detected
   - Outreach drafts ready for review

**What to do when you get a signal:**
1. Check Slack notification
2. Review the signal details
3. If outreach was drafted, review variants A & B
4. Approve and copy into Outreach sequence
5. Agent continues monitoring

**Managing your territory:**
- Add prospects in Outreach → Agent auto-detects
- Remove prospects in Outreach → Agent stops monitoring
- No manual updates needed ever

---

## Monitoring & Maintenance

**Check agent health:**
- Railway dashboard → Your service → "Metrics"
- Should show steady CPU/memory usage
- Logs show scan activity every 6 hours

**View historical data:**
1. Railway → Your service → "Data" tab
2. Click database → "Connect"
3. Use any SQLite client to query:
   ```sql
   SELECT * FROM scan_history ORDER BY scan_started DESC LIMIT 10;
   SELECT * FROM signals WHERE status = 'new';
   ```

**Adjust scan frequency:**
- Railway → Variables → Edit `SCAN_SCHEDULE`
- `0 */3 * * *` = every 3 hours (more aggressive)
- `0 8,16 * * 1-5` = 8am & 4pm weekdays only (conservative)

---

## Cost Breakdown

**Railway:** $0/month (500 free hours - covers 24/7)
**Claude API:** ~$3-5/month (smart scanning, not all accounts every time)
**Total:** ~$5/month for fully autonomous territory monitoring

---

## Need Help?

Check Railway logs first:
- Railway dashboard → Service → Deployments → Click latest → View Logs

Common issues are in the Troubleshooting section above.

**You're done!** The agent is monitoring your territory right now.
