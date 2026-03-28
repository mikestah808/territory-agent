import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const MCP_SERVERS = [
  {
    type: "url",
    url: "https://api.outreach.io/mcp",
    name: "outreach-mcp"
  }
];

/**
 * Syncs territory from Outreach
 * Returns list of active accounts assigned to you
 */
export async function syncTerritoryFromOutreach() {
  console.log('🔄 Syncing territory from Outreach...');

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    mcp_servers: MCP_SERVERS,
    messages: [{
      role: 'user',
      content: `Using Outreach, get all accounts currently assigned to me (the authenticated user).

Filter to:
- Active prospects (not marked as lost/churned)
- Accounts in active sequences OR marked for prospecting
- Include account name, domain, and current stage/status

Return ONLY a JSON array (no markdown):
[
  {
    "company_name": "string",
    "domain": "string",
    "outreach_status": "string (active/nurture/new)",
    "in_sequence": boolean,
    "last_activity": "ISO date or null"
  }
]`
    }]
  });

  const text = message.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('\n');

  const cleanJson = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleanJson);
}

/**
 * Alternative: Sync from a Google Sheet
 * If you maintain your territory list in a spreadsheet
 */
export async function syncTerritoryFromSheet(sheetUrl) {
  // Would use Google Sheets MCP when available
  // For now, placeholder
  console.log('📊 Sheet sync not yet implemented - use Outreach or manual config');
  return [];
}

/**
 * Reconcile Outreach territory with local database
 * Returns: { added, removed, unchanged }
 */
export function reconcileTerritory(outreachAccounts, dbAccounts) {
  const outreachDomains = new Set(outreachAccounts.map(a => a.domain));
  const dbDomains = new Set(dbAccounts.map(a => a.domain));

  const added = outreachAccounts.filter(a => !dbDomains.has(a.domain));
  const removed = dbAccounts.filter(a => !outreachDomains.has(a.domain));
  const unchanged = outreachAccounts.filter(a => dbDomains.has(a.domain));

  return { added, removed, unchanged };
}

/**
 * Prioritize which accounts to scan first
 * Logic: New accounts > Active sequences > Nurture
 */
export function prioritizeScanOrder(accounts) {
  return accounts.sort((a, b) => {
    // New accounts first
    if (a.outreach_status === 'new' && b.outreach_status !== 'new') return -1;
    if (b.outreach_status === 'new' && a.outreach_status !== 'new') return 1;

    // Active sequences next
    if (a.in_sequence && !b.in_sequence) return -1;
    if (b.in_sequence && !a.in_sequence) return 1;

    // Recently active next
    if (a.last_activity && b.last_activity) {
      return new Date(b.last_activity) - new Date(a.last_activity);
    }

    return 0;
  });
}
