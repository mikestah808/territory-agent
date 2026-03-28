import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, '../../data/agent.db'));

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT UNIQUE NOT NULL,
    domain TEXT,
    last_scanned DATETIME,
    employee_count INTEGER,
    revenue TEXT,
    industry TEXT,
    hris_platform TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    signal_type TEXT NOT NULL,
    signal_data TEXT,
    detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'new',
    FOREIGN KEY (account_id) REFERENCES accounts(id)
  );

  CREATE TABLE IF NOT EXISTS outreach (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    signal_id INTEGER,
    subject TEXT,
    body TEXT,
    variant TEXT,
    status TEXT DEFAULT 'draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (signal_id) REFERENCES signals(id)
  );

  CREATE TABLE IF NOT EXISTS scan_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_started DATETIME,
    scan_completed DATETIME,
    accounts_scanned INTEGER,
    signals_found INTEGER,
    outreach_drafted INTEGER,
    errors TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_accounts_domain ON accounts(domain);
  CREATE INDEX IF NOT EXISTS idx_signals_account ON signals(account_id);
  CREATE INDEX IF NOT EXISTS idx_signals_status ON signals(status);
  CREATE INDEX IF NOT EXISTS idx_outreach_status ON outreach(status);
`);

console.log('✓ Database initialized');
console.log('✓ Tables created: accounts, signals, outreach, scan_history');

db.close();
