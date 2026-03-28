import fetch from 'node-fetch';

export async function sendSlackNotification(message) {
  if (!process.env.SLACK_WEBHOOK_URL) {
    console.log('📢 Slack notification (webhook not configured):', message.text);
    return;
  }

  try {
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
  } catch (error) {
    console.error('Failed to send Slack notification:', error.message);
  }
}

export async function notifyScanComplete(stats) {
  const message = {
    text: '🤖 Territory scan complete',
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🤖 Territory Intelligence Scan Complete'
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Accounts Scanned:*\n${stats.accounts_scanned}`
          },
          {
            type: 'mrkdwn',
            text: `*Signals Found:*\n${stats.signals_found}`
          },
          {
            type: 'mrkdwn',
            text: `*Outreach Drafted:*\n${stats.outreach_drafted}`
          },
          {
            type: 'mrkdwn',
            text: `*Duration:*\n${stats.duration}s`
          }
        ]
      }
    ]
  };

  if (stats.errors) {
    message.blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `⚠️ *Errors:* ${stats.errors}`
      }
    });
  }

  await sendSlackNotification(message);
}

export async function notifySignalsFound(signals) {
  if (signals.length === 0) return;

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `🚨 ${signals.length} New Signal${signals.length > 1 ? 's' : ''} Detected`
      }
    }
  ];

  signals.forEach(signal => {
    const signalEmoji = {
      headcount_growth: '📈',
      funding_event: '💰',
      exec_change: '👔',
      tech_stack_change: '🔧'
    }[signal.signal_type] || '🔔';

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${signalEmoji} *${signal.company_name}*\n${formatSignalDetails(signal)}`
      }
    });
  });

  await sendSlackNotification({ blocks });
}

export async function notifyOutreachDrafted(drafts) {
  if (drafts.length === 0) return;

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `📧 ${drafts.length} Outreach Draft${drafts.length > 1 ? 's' : ''} Ready`
      }
    }
  ];

  drafts.forEach(draft => {
    blocks.push(
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${draft.company_name}* - ${draft.variant}\n_${draft.subject}_`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `\`\`\`${draft.body.substring(0, 200)}...\`\`\``
        }
      },
      {
        type: 'divider'
      }
    );
  });

  // Add approval buttons if configured
  if (process.env.REQUIRE_APPROVAL === 'true') {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '✅ Approve All'
          },
          style: 'primary',
          action_id: 'approve_outreach'
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '⏭️ Skip'
          },
          action_id: 'skip_outreach'
        }
      ]
    });
  }

  await sendSlackNotification({ blocks });
}

export async function notifyTerritoryChanges(changes) {
  if (changes.added.length === 0 && changes.removed.length === 0) return;

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '🔄 Territory Updated'
      }
    }
  ];

  if (changes.added.length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `➕ *Added (${changes.added.length}):*\n${changes.added.join(', ')}`
      }
    });
  }

  if (changes.removed.length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `➖ *Removed (${changes.removed.length}):*\n${changes.removed.join(', ')}`
      }
    });
  }

  await sendSlackNotification({ blocks });
}

function formatSignalDetails(signal) {
  const data = typeof signal.signal_data === 'string' 
    ? JSON.parse(signal.signal_data) 
    : signal.signal_data;

  switch (signal.signal_type) {
    case 'headcount_growth':
      return `Headcount: ${data.previous} → ${data.current} (+${data.growth_pct}%)`;
    case 'funding_event':
      return `Funding: ${data.details}`;
    case 'exec_change':
      return `Leadership: ${data.details}`;
    case 'tech_stack_change':
      return `Tech Stack: ${data.details}`;
    default:
      return JSON.stringify(data);
  }
}
