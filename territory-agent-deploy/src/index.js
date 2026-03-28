import 'dotenv/config';
import cron from 'node-cron';
import { runTerritoryScan } from './scanner/index.js';

console.log('🚀 Territory Intelligence Agent starting...');
console.log(`📅 Schedule: ${process.env.SCAN_SCHEDULE || '0 */6 * * *'} (every 6 hours)`);
console.log(`🎯 Territory: ${process.env.TERRITORY_ACCOUNTS?.split(',').length || 'Synced from Outreach'}`);
console.log(`📧 Email: ${process.env.NOTIFICATION_EMAIL || 'Not configured'}`);

// Validate environment
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY not set');
  process.exit(1);
}

if (!process.env.NOTIFICATION_EMAIL) {
  console.warn('⚠️  NOTIFICATION_EMAIL not set - notifications will be logged only');
}

if (process.env.NOTIFICATION_EMAIL && !process.env.SMTP_USER) {
  console.error('❌ Email configured but SMTP_USER not set');
  console.error('💡 See EMAIL_SETUP.md for configuration instructions');
  process.exit(1);
}

// Schedule recurring scans
const schedule = process.env.SCAN_SCHEDULE || '0 */6 * * *';
cron.schedule(schedule, async () => {
  console.log(`\n⏰ Scheduled scan triggered at ${new Date().toISOString()}`);
  await runTerritoryScan();
}, {
  timezone: "Pacific/Honolulu" // HST for you
});

console.log('✅ Agent running - waiting for scheduled scans');
console.log('💡 Tip: Set SCAN_SCHEDULE in .env to change timing (cron format)');

// Optional: Run immediately on startup for testing
if (process.env.RUN_ON_STARTUP === 'true') {
  console.log('\n🏃 Running initial scan (RUN_ON_STARTUP=true)...');
  runTerritoryScan().catch(console.error);
}

// Keep process alive
process.on('SIGINT', () => {
  console.log('\n👋 Agent shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Agent shutting down...');
  process.exit(0);
});
