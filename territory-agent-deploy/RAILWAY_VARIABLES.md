# Railway Environment Variables - Email Version

Copy these into Railway → Your Service → Variables tab:

## Required Variables

```
ANTHROPIC_API_KEY
[paste your sk-ant-... key]

NOTIFICATION_EMAIL
[your email where you want notifications]

SMTP_HOST
smtp.gmail.com

SMTP_PORT
587

SMTP_USER
[your gmail address]

SMTP_PASSWORD
[your Gmail app password - 16 characters, no spaces]
```

## Optional Variables (have defaults)

```
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

---

## How to Get Gmail App Password

1. Go to: https://myaccount.google.com/apppasswords
2. Select "Mail" → "Other" → Name it "Territory Agent"
3. Click Generate
4. Copy the 16-character password (remove spaces)
5. Paste as SMTP_PASSWORD value

**Example:**
If Google shows: `abcd efgh ijkl mnop`
You paste: `abcdefghijklmnop` (no spaces)

---

## After Adding Variables

Railway will automatically redeploy. Within 2 minutes, check your email for:

**Subject:** 🤖 Territory Scan Complete

If you don't receive it:
1. Check spam/junk folder
2. Check Railway logs for errors
3. Verify Gmail app password is correct
4. See EMAIL_SETUP.md for troubleshooting
