import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '../../data');

// Ensure data directory exists
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const db = new Database(join(dataDir, 'agent.db'));

export const accounts = {
  upsert: (data) => {
    const stmt = db.prepare(`
      INSERT INTO accounts (company_name, domain, employee_count, revenue, industry, hris_platform, last_scanned, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(company_name) DO UPDATE SET
        domain = excluded.domain,
        employee_count = excluded.employee_count,
        revenue = excluded.revenue,
        industry = excluded.industry,
        hris_platform = excluded.hris_platform,
        last_scanned = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(data.company_name, data.domain, data.employee_count, data.revenue, data.industry, data.hris_platform);
    return db.prepare('SELECT * FROM accounts WHERE company_name = ?').get(data.company_name);
  },

  getByName: (name) => {
    return db.prepare('SELECT * FROM accounts WHERE company_name = ?').get(name);
  },

  getAll: () => {
    return db.prepare('SELECT * FROM accounts ORDER BY last_scanned ASC').all();
  },

  getNeedingRescan: (hoursAgo = 6) => {
    return db.prepare(`
      SELECT * FROM accounts 
      WHERE last_scanned IS NULL 
         OR last_scanned < datetime('now', '-' || ? || ' hours')
      ORDER BY last_scanned ASC NULLS FIRST
    `).all(hoursAgo);
  }
};

export const signals = {
  create: (accountId, type, data) => {
    const stmt = db.prepare(`
      INSERT INTO signals (account_id, signal_type, signal_data)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(accountId, type, JSON.stringify(data));
    return result.lastInsertRowid;
  },

  getNew: () => {
    return db.prepare(`
      SELECT s.*, a.company_name, a.domain
      FROM signals s
      JOIN accounts a ON s.account_id = a.id
      WHERE s.status = 'new'
      ORDER BY s.detected_at DESC
    `).all();
  },

  markProcessed: (signalId) => {
    db.prepare('UPDATE signals SET status = ? WHERE id = ?').run('processed', signalId);
  }
};

export const outreach = {
  create: (accountId, signalId, subject, body, variant) => {
    const stmt = db.prepare(`
      INSERT INTO outreach (account_id, signal_id, subject, body, variant)
      VALUES (?, ?, ?, ?, ?)
    `);
    return stmt.run(accountId, signalId, subject, body, variant);
  },

  getDrafts: () => {
    return db.prepare(`
      SELECT o.*, a.company_name, s.signal_type
      FROM outreach o
      JOIN accounts a ON o.account_id = a.id
      LEFT JOIN signals s ON o.signal_id = s.id
      WHERE o.status = 'draft'
      ORDER BY o.created_at DESC
    `).all();
  }
};

export const scanHistory = {
  start: () => {
    const stmt = db.prepare(`
      INSERT INTO scan_history (scan_started)
      VALUES (CURRENT_TIMESTAMP)
    `);
    const result = stmt.run();
    return result.lastInsertRowid;
  },

  complete: (scanId, stats) => {
    db.prepare(`
      UPDATE scan_history
      SET scan_completed = CURRENT_TIMESTAMP,
          accounts_scanned = ?,
          signals_found = ?,
          outreach_drafted = ?,
          errors = ?
      WHERE id = ?
    `).run(stats.accounts_scanned, stats.signals_found, stats.outreach_drafted, stats.errors, scanId);
  }
};

export default db;
