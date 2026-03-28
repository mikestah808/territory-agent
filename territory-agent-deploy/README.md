# 🤖 Territory Intelligence Agent v2

**24/7 autonomous territory monitoring with self-updating account list**

## The Key Difference: Dynamic Territory

**v1 problem:** Hardcoded account list becomes stale as you add/remove accounts

**v2 solution:** Agent pulls your live territory from Outreach every scan
- ✅ Auto-detects when you add new prospects
- ✅ Auto-removes churned/lost accounts
- ✅ Prioritizes based on sequence status
- ✅ Scans new accounts immediately, nurture accounts less frequently

## How Territory Sync Works

**Every 6 hours:**
1. 🔄 Pull current territory from Outreach (all accounts assigned to you)
2. 🆕 Detect new additions → scan immediately
3. ❌ Detect removals → archive in database, stop monitoring
4. 🎯 Prioritize: New accounts > Active sequences > Nurture
5. ⚡ Smart scanning: Only rescan accounts that need it (not all 176 every time)

**Example scan:**
```
Territory: +3 new accounts, -1 removed
Priority scan targets: 47 accounts
  - 3 new (never scanned)
  - 12 in active sequences
  - 32 haven't been scanned in 24+ hours
Skipping: 127 accounts (recently scanned, no sequence activity)
```

## Territory Sources

**Primary: Outreach (recommended)**
- Automatically syncs with your actual book of business
- Respects sequence status (active vs. nurture)
- No manual updates needed
- Agent detects when you reassign accounts

**Fallback: Manual list**
- Set `TERRITORY_ACCOUNTS` in `.env` if Outreach sync fails
- Comma-separated domains
- Requires manual updates when territory changes

## Intelligent Scan Frequency

Not all accounts need scanning every 6 hours. The agent is smart:

**Immediate scan triggers:**
- New account added to your territory
- Account enters active sequence
- Account shows engagement (email opens, website visits)

**24-hour rescan interval:**
- Active nurture accounts
- Accounts with previous buying signals
- High-priority prospects

**Weekly rescan:**
- Dormant accounts (no activity, no signals)
- Marked as "long-term nurture"

This means:
- 🚀 Fast response to new opportunities
- 💰 Lower API costs (scan less, learn more)
- 🎯 Focus on accounts that matter

## Setup (5 minutes)

### 1. Get API Keys

**Anthropic:** https://console.anthropic.com/
**Slack webhook:** https://api.slack.com/messaging/webhooks

### 2. Deploy to Railway

```bash
# Push this code to GitHub
git init
git add .
git commit -m "Territory intelligence agent"
git remote add origin YOUR_REPO
git push -u origin main

# Deploy on Railway
# 1. Go to railway.app
# 2. New Project → Deploy from GitHub
# 3. Select your repo
# 4. Add environment variables (see below)
```

### 3. Environment Variables

```bash
ANTHROPIC_API_KEY=sk-ant-your-key-here
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
TERRITORY_SOURCE=outreach
SCAN_SCHEDULE=0 */6 * * *
RESCAN_INTERVAL_HOURS=24
AUTO_DRAFT_OUTREACH=true
HEADCOUNT_GROWTH_THRESHOLD=15
```

### 4. Watch It Run

First scan:
- Pulls all accounts from Outreach
- Baseline enrichment on priority accounts
- Starts monitoring for signals

Future scans:
- Detects territory changes
- Focuses on high-priority accounts
- Alerts on new signals only

## Slack Notifications

**Territory changes:**
```
🔄 Territory Updated
➕ Added (3): Notion, Figma, Linear
➖ Removed (1): Acme Corp
```

**Scan summary:**
```
🤖 Territory Scan Complete
Territory: +3 / -1 accounts
Scanned: 47 priority accounts (176 total)
Signals: 8 new buying signals
Drafts: 16 outreach variants
Duration: 38s
```

**New signals:**
```
🚨 8 New Signals Detected

📈 Notion
Headcount: 450 → 523 (+16.2%)
Status: Active sequence

💰 Figma
Funding: Series D - $200M raised
Status: New account

👔 Linear
Leadership: New VP of People hired
Status: Nurture
```

## Database Schema

```sql
-- Territory tracking
CREATE TABLE accounts (
  id INTEGER PRIMARY KEY,
  company_name TEXT,
  domain TEXT,
  outreach_status TEXT,  -- NEW: active/nurture/removed
  in_sequence BOOLEAN,   -- NEW: tracks if actively prospecting
  last_scanned DATETIME,
  employee_count INTEGER,
  hris_platform TEXT
);

-- Signals persist even when account leaves territory
CREATE TABLE signals (
  id INTEGER PRIMARY KEY,
  account_id INTEGER,
  signal_type TEXT,
  signal_data TEXT,
  detected_at DATETIME
);
```

**Useful queries:**

```sql
-- Accounts added in last 7 days
SELECT * FROM accounts 
WHERE created_at > datetime('now', '-7 days');

-- Territory churn rate
SELECT 
  COUNT(*) FILTER (WHERE outreach_status = 'removed') as churned,
  COUNT(*) as total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE outreach_status = 'removed') / COUNT(*), 1) as churn_pct
FROM accounts;

-- Top signal generators
SELECT a.company_name, COUNT(s.id) as signal_count
FROM accounts a
JOIN signals s ON a.id = s.account_id
WHERE s.detected_at > datetime('now', '-30 days')
GROUP BY a.id
ORDER BY signal_count DESC
LIMIT 10;
```

## Performance Tuning

**Scan interval:**
- `0 */6 * * *` (every 6 hours) - default
- `0 */3 * * *` (every 3 hours) - aggressive
- `0 8,16 * * 1-5` (8am & 4pm, weekdays only) - conservative

**Rescan logic:**
- `RESCAN_INTERVAL_HOURS=24` → daily refresh on active accounts
- `RESCAN_INTERVAL_HOURS=6` → more frequent, higher API cost
- `RESCAN_INTERVAL_HOURS=72` → only scan active sequences frequently

**Cost optimization:**

Default config (every 6hr, 24hr rescan):
- ~40 accounts scanned per run (not all 176)
- 4 scans/day = 160 accounts/day
- ~8K tokens/day = **~$3/month**

Aggressive config (every 3hr, 6hr rescan):
- ~80 accounts scanned per run
- 8 scans/day = 640 accounts/day
- ~32K tokens/day = **~$12/month**

## Extending the Agent

**Add more data sources:**
```javascript
// Pull from Google Sheets
import { syncTerritoryFromSheet } from './services/territory.js';
const accounts = await syncTerritoryFromSheet('sheet-id');

// Pull from Salesforce
import { syncTerritoryFromSalesforce } from './services/territory.js';
const accounts = await syncTerritoryFromSalesforce();
```

**Custom prioritization:**
```javascript
// Prioritize accounts with recent engagement
export function prioritizeScanOrder(accounts) {
  return accounts.sort((a, b) => {
    if (a.email_opens_7d > b.email_opens_7d) return -1;
    if (a.website_visits_7d > b.website_visits_7d) return -1;
    return 0;
  });
}
```

**More signal types:**
```javascript
// Job postings signal
if (enrichedData.open_hr_roles > 5) {
  signals.push({
    type: 'hiring_surge',
    data: { role_count: enrichedData.open_hr_roles }
  });
}

// Tech stack signal
if (enrichedData.recently_adopted_tools.includes('Greenhouse')) {
  signals.push({
    type: 'ats_adoption',
    data: { tool: 'Greenhouse' }
  });
}
```

## Troubleshooting

**Territory not syncing:**
- Check Outreach MCP is connected in Claude.ai
- Verify API auth: test `await syncTerritoryFromOutreach()` manually
- Fallback: set `TERRITORY_ACCOUNTS` manually

**Too many accounts scanned:**
- Increase `RESCAN_INTERVAL_HOURS` (24 → 48)
- Adjust prioritization logic in `territory.js`
- Filter by `outreach_status` (only scan 'active')

**Missing signals:**
- Lower `HEADCOUNT_GROWTH_THRESHOLD` (15 → 10)
- Check ZoomInfo data quality (some companies lack historical data)
- Verify account hasn't been scanned recently (prevents duplicate signals)

## Migration from v1

If you deployed v1 (hardcoded accounts):

```bash
# Export existing data
sqlite3 data/agent.db ".dump accounts" > backup.sql

# Deploy v2
# Run first sync - will pull from Outreach
# Import historical data if needed
sqlite3 data/agent.db < backup.sql
```

## Next Steps

1. ✅ Deploy to Railway with Outreach as territory source
2. ✅ First scan pulls all accounts, builds baseline
3. ✅ Add new prospects in Outreach → agent auto-detects
4. ✅ Remove dead accounts in Outreach → agent stops monitoring
5. ✅ Territory stays perfectly in sync, forever

No more manual updates. Territory management is now **truly autonomous**.
