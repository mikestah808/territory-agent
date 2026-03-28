# 📧 Email Notification Setup Guide

The agent will send you email notifications instead of Slack. Here's how to set it up:

## Option 1: Gmail (Recommended - Easiest)

### Step 1: Enable 2-Factor Authentication
1. Go to: https://myaccount.google.com/security
2. Find "2-Step Verification" and turn it ON (if not already)
3. Follow the prompts to set it up

### Step 2: Create App Password
1. Go to: https://myaccount.google.com/apppasswords
2. Select app: "Mail"
3. Select device: "Other (Custom name)"
4. Enter: "Territory Agent"
5. Click "Generate"
6. **Copy the 16-character password** (looks like: `abcd efgh ijkl mnop`)

### Step 3: Add to Railway Environment Variables

In Railway → Variables, add these:

```
NOTIFICATION_EMAIL=your-actual-email@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-actual-email@gmail.com
SMTP_PASSWORD=abcdefghijklmnop
```

**Important:** 
- Use the 16-character app password, NOT your regular Gmail password
- Remove spaces from the app password when pasting

---

## Option 2: Company Email (Outlook/Exchange)

If you want to use your HiBob work email:

### Find Your SMTP Settings
1. Ask IT for your Outlook SMTP settings, or
2. Check: https://support.microsoft.com/en-us/office/pop-imap-and-smtp-settings-8361e398-8af4-4e97-b147-6c6c4ac95353

Common settings:
```
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-work-email@hibob.com
SMTP_PASSWORD=your-work-email-password
```

### Add to Railway:
```
NOTIFICATION_EMAIL=your-work-email@hibob.com
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-work-email@hibob.com
SMTP_PASSWORD=your-password
```

**Note:** Some companies require app passwords or OAuth. Check with IT if regular password doesn't work.

---

## Option 3: SendGrid (Free Tier - 100 emails/day)

If you don't want to use your personal email:

### Step 1: Sign Up
1. Go to: https://signup.sendgrid.com/
2. Free plan: 100 emails/day (plenty for this agent)

### Step 2: Create API Key
1. Settings → API Keys → Create API Key
2. Name: "Territory Agent"
3. Permissions: "Full Access"
4. Copy the key (starts with `SG.`)

### Step 3: Verify Sender
1. Settings → Sender Authentication
2. Verify Single Sender
3. Enter your email address
4. Check inbox for verification email

### Step 4: Add to Railway:
```
NOTIFICATION_EMAIL=your-email@example.com
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.your-sendgrid-api-key
```

---

## What Emails You'll Receive

### 1. Scan Complete (every 6 hours)
```
Subject: 🤖 Territory Scan Complete
---
Territory Changes: +3 / -1 accounts
Accounts Scanned: 47
Signals Found: 8
Outreach Drafted: 16
Duration: 38s
```

### 2. New Signals Detected
```
Subject: 🤖 8 New Signals Detected
---
📈 Patreon
Headcount: 450 → 523 (+16.2%)

💰 Revinate
Funding: Series C - $25M raised

👔 Samba TV
Leadership: New VP of HR hired
```

### 3. Outreach Drafts Ready
```
Subject: 🤖 16 Outreach Drafts Ready
---
[Company Name] • Variant A
SUBJECT: Scaling HR for 500+ employees

BODY:
Hey [Name],

Saw Patreon just crossed 500 employees...
[full draft]
---
[Company Name] • Variant B
SUBJECT: Different angle...
```

### 4. Territory Changes
```
Subject: 🤖 Territory Updated
---
➕ Added (3): Notion, Figma, Linear
➖ Removed (1): Acme Corp
```

---

## Testing Your Email Setup

After adding environment variables to Railway:

1. Railway will auto-redeploy
2. Within 2 minutes, you should receive first email
3. Subject: "🤖 Territory Scan Complete"

**Not receiving emails?**

### Check 1: Spam Folder
- Check spam/junk folder
- Mark as "Not Spam" to whitelist

### Check 2: Railway Logs
```
Railway → Deployments → Click latest → View Logs
Look for: "✓ Email sent: Territory Scan Complete"
or: "Failed to send email: [error message]"
```

### Check 3: SMTP Credentials
- Gmail: Verify app password is correct (16 chars, no spaces)
- Work email: Verify with IT that SMTP auth is allowed
- SendGrid: Verify sender email is verified

### Check 4: Test Locally
```bash
# Download code, add .env file, run:
npm install
node -e "
import nodemailer from 'nodemailer';
const t = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  auth: { user: 'you@gmail.com', pass: 'yourapppassword' }
});
t.sendMail({
  from: 'you@gmail.com',
  to: 'you@gmail.com',
  subject: 'Test',
  text: 'Works!'
}).then(() => console.log('✓')).catch(console.error);
"
```

---

## Which Option Should You Use?

**Use Gmail if:**
- ✅ You have a personal Gmail account
- ✅ You're okay receiving work notifications there
- ✅ Easiest setup (5 minutes)

**Use Work Email if:**
- ✅ Want everything in one inbox
- ✅ IT allows SMTP auth
- ✅ Professional appearance

**Use SendGrid if:**
- ✅ Want dedicated sending address
- ✅ Don't want to use personal email
- ✅ Want detailed delivery analytics

**My recommendation:** Start with Gmail (fastest), switch later if needed.
