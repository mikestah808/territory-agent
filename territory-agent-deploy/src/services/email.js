import nodemailer from 'nodemailer';

// Create email transporter
let transporter;

function initializeTransporter() {
  if (transporter) return transporter;

  // Use Gmail SMTP (or any SMTP provider)
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD // App-specific password for Gmail
    }
  });

  return transporter;
}

export async function sendEmailNotification(subject, htmlContent) {
  if (!process.env.NOTIFICATION_EMAIL) {
    console.log('📧 Email notification (no recipient configured):', subject);
    return;
  }

  try {
    const transporter = initializeTransporter();
    
    await transporter.sendMail({
      from: `Territory Agent <${process.env.SMTP_USER}>`,
      to: process.env.NOTIFICATION_EMAIL,
      subject: `🤖 ${subject}`,
      html: htmlContent
    });

    console.log(`✓ Email sent: ${subject}`);
  } catch (error) {
    console.error('Failed to send email:', error.message);
  }
}

export async function notifyScanComplete(stats) {
  const subject = 'Territory Scan Complete';
  
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a1a; border-bottom: 2px solid #007AFF; padding-bottom: 12px;">
        🤖 Territory Intelligence Scan Complete
      </h2>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666;">Territory Changes:</td>
            <td style="padding: 8px 0; font-weight: 600; text-align: right;">
              ${stats.territory_added > 0 ? `<span style="color: #28a745;">+${stats.territory_added}</span>` : ''}
              ${stats.territory_removed > 0 ? `<span style="color: #dc3545;"> -${stats.territory_removed}</span>` : ''}
              ${stats.territory_added === 0 && stats.territory_removed === 0 ? 'No changes' : ''}
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Accounts Scanned:</td>
            <td style="padding: 8px 0; font-weight: 600; text-align: right;">${stats.accounts_scanned}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Signals Found:</td>
            <td style="padding: 8px 0; font-weight: 600; text-align: right; color: ${stats.signals_found > 0 ? '#007AFF' : '#666'};">
              ${stats.signals_found}
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Outreach Drafted:</td>
            <td style="padding: 8px 0; font-weight: 600; text-align: right;">${stats.outreach_drafted}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Duration:</td>
            <td style="padding: 8px 0; font-weight: 600; text-align: right;">${stats.duration}s</td>
          </tr>
        </table>
      </div>

      ${stats.errors ? `
        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0;">
          <strong style="color: #856404;">⚠️ Errors:</strong><br>
          <span style="color: #856404; font-size: 14px;">${stats.errors}</span>
        </div>
      ` : ''}

      <p style="color: #666; font-size: 14px; margin-top: 24px;">
        Next scan: ${getNextScanTime()}
      </p>
    </div>
  `;

  await sendEmailNotification(subject, html);
}

export async function notifySignalsFound(signals) {
  if (signals.length === 0) return;

  const subject = `${signals.length} New Signal${signals.length > 1 ? 's' : ''} Detected`;
  
  const signalRows = signals.map(signal => {
    const emoji = {
      headcount_growth: '📈',
      funding_event: '💰',
      exec_change: '👔',
      tech_stack_change: '🔧'
    }[signal.signal_type] || '🔔';

    return `
      <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin: 12px 0;">
        <h3 style="margin: 0 0 8px 0; color: #1a1a1a;">
          ${emoji} ${signal.company_name}
        </h3>
        <p style="margin: 0; color: #666; font-size: 14px;">
          ${formatSignalDetails(signal)}
        </p>
      </div>
    `;
  }).join('');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a1a; border-bottom: 2px solid #dc3545; padding-bottom: 12px;">
        🚨 ${signals.length} New Signal${signals.length > 1 ? 's' : ''} Detected
      </h2>
      
      ${signalRows}

      <p style="color: #666; font-size: 14px; margin-top: 24px;">
        ${process.env.AUTO_DRAFT_OUTREACH === 'true' ? 'Outreach drafts will arrive in a separate email.' : 'Auto-draft is disabled.'}
      </p>
    </div>
  `;

  await sendEmailNotification(subject, html);
}

export async function notifyOutreachDrafted(drafts) {
  if (drafts.length === 0) return;

  const subject = `${drafts.length} Outreach Draft${drafts.length > 1 ? 's' : ''} Ready`;
  
  const draftRows = drafts.map(draft => `
    <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <div style="background: #f8f9fa; padding: 8px 12px; border-radius: 4px; margin-bottom: 12px;">
        <strong style="color: #1a1a1a;">${draft.company_name}</strong>
        <span style="color: #666; margin-left: 8px;">• ${draft.variant}</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <div style="color: #666; font-size: 12px; margin-bottom: 4px;">SUBJECT:</div>
        <div style="font-weight: 500; color: #1a1a1a;">${draft.subject}</div>
      </div>
      
      <div>
        <div style="color: #666; font-size: 12px; margin-bottom: 4px;">BODY:</div>
        <div style="white-space: pre-wrap; color: #333; font-size: 14px; line-height: 1.6; background: #f8f9fa; padding: 12px; border-radius: 4px;">
${draft.body}
        </div>
      </div>
    </div>
  `).join('');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a1a; border-bottom: 2px solid #28a745; padding-bottom: 12px;">
        📧 ${drafts.length} Outreach Draft${drafts.length > 1 ? 's' : ''} Ready
      </h2>
      
      ${draftRows}

      <div style="background: #e7f3ff; border-left: 4px solid #007AFF; padding: 12px; margin: 20px 0;">
        <strong style="color: #0066cc;">💡 Next Steps:</strong><br>
        <span style="color: #0066cc; font-size: 14px;">
          Review the drafts above and copy your preferred variant into Outreach.
        </span>
      </div>
    </div>
  `;

  await sendEmailNotification(subject, html);
}

export async function notifyTerritoryChanges(changes) {
  if (changes.added.length === 0 && changes.removed.length === 0) return;

  const subject = 'Territory Updated';
  
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a1a; border-bottom: 2px solid #007AFF; padding-bottom: 12px;">
        🔄 Territory Updated
      </h2>
      
      ${changes.added.length > 0 ? `
        <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 16px; margin: 16px 0; border-radius: 4px;">
          <strong style="color: #155724;">➕ Added (${changes.added.length}):</strong><br>
          <span style="color: #155724; font-size: 14px;">${changes.added.join(', ')}</span>
        </div>
      ` : ''}

      ${changes.removed.length > 0 ? `
        <div style="background: #f8d7da; border-left: 4px solid #dc3545; padding: 16px; margin: 16px 0; border-radius: 4px;">
          <strong style="color: #721c24;">➖ Removed (${changes.removed.length}):</strong><br>
          <span style="color: #721c24; font-size: 14px;">${changes.removed.join(', ')}</span>
        </div>
      ` : ''}

      <p style="color: #666; font-size: 14px; margin-top: 24px;">
        Your agent will now monitor ${changes.added.length} new account${changes.added.length !== 1 ? 's' : ''} 
        and stop tracking ${changes.removed.length} removed account${changes.removed.length !== 1 ? 's' : ''}.
      </p>
    </div>
  `;

  await sendEmailNotification(subject, html);
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

function getNextScanTime() {
  const schedule = process.env.SCAN_SCHEDULE || '0 */6 * * *';
  
  // Parse cron for next run (simplified)
  if (schedule.includes('*/6')) {
    return 'in 6 hours';
  } else if (schedule.includes('*/3')) {
    return 'in 3 hours';
  } else {
    return 'per schedule';
  }
}
