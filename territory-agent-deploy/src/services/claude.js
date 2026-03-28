import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const MCP_SERVERS = [
  {
    type: "url",
    url: "https://mcp.zoominfo.com/mcp",
    name: "zoominfo-mcp"
  }
];

export async function enrichCompany(companyName) {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    mcp_servers: MCP_SERVERS,
    messages: [{
      role: 'user',
      content: `Using ZoomInfo, enrich the company "${companyName}". 

Return ONLY a JSON object (no markdown, no preamble):
{
  "company_name": "string",
  "domain": "string", 
  "employee_count": number,
  "employee_count_6mo_ago": number,
  "revenue": "string",
  "industry": "string",
  "website": "string",
  "hq_location": "string",
  "recent_funding": "string or null",
  "exec_changes": "string or null",
  "tech_stack_changes": "string or null"
}`
    }]
  });

  const text = message.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('\n');

  const cleanJson = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleanJson);
}

export async function detectHRIS(domain) {
  // Use Claude to intelligently parse sur.ly results
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `For the domain "${domain}", check for HRIS platform usage.

Common HRIS platforms: BambooHR, Namely, Workday, ADP, Rippling, Gusto, Zenefits, HiBob, Personio, UKG, Paylocity.

Based on your knowledge and available signals, return ONLY a JSON object:
{
  "detected_hris": "platform name or Unknown",
  "confidence": "high/medium/low",
  "detection_method": "string"
}`
    }]
  });

  const text = message.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('\n');

  const cleanJson = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleanJson);
}

export async function analyzeSignals(accountData, previousData) {
  const headcountGrowth = previousData?.employee_count 
    ? ((accountData.employee_count - previousData.employee_count) / previousData.employee_count * 100).toFixed(1)
    : 0;

  const signals = [];

  // Headcount growth signal
  if (headcountGrowth >= parseFloat(process.env.HEADCOUNT_GROWTH_THRESHOLD || 15)) {
    signals.push({
      type: 'headcount_growth',
      data: {
        current: accountData.employee_count,
        previous: previousData.employee_count,
        growth_pct: headcountGrowth
      }
    });
  }

  // Funding signal
  if (accountData.recent_funding && accountData.recent_funding !== 'null') {
    signals.push({
      type: 'funding_event',
      data: { details: accountData.recent_funding }
    });
  }

  // Exec changes signal
  if (accountData.exec_changes && accountData.exec_changes !== 'null') {
    signals.push({
      type: 'exec_change',
      data: { details: accountData.exec_changes }
    });
  }

  // Tech stack changes
  if (accountData.tech_stack_changes && accountData.tech_stack_changes !== 'null') {
    signals.push({
      type: 'tech_stack_change',
      data: { details: accountData.tech_stack_changes }
    });
  }

  return signals;
}

export async function draftOutreach(accountData, signal) {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `Draft two outreach email variants for a BDR at HiBob (an HRIS/HCM platform).

Company: ${accountData.company_name}
Employees: ${accountData.employee_count}
Industry: ${accountData.industry}
Signal: ${signal.signal_type} - ${JSON.stringify(signal.signal_data)}
Current HRIS: ${accountData.hris_platform || 'Unknown'}

Style: Casual, conversational, Michael's voice (not salesy). Focus on specific pain points this signal reveals.

Return ONLY a JSON object:
{
  "variant_a": {
    "subject": "string",
    "body": "string (2-3 short paragraphs)"
  },
  "variant_b": {
    "subject": "string", 
    "body": "string (different angle/hook)"
  }
}`
    }]
  });

  const text = message.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('\n');

  const cleanJson = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleanJson);
}
