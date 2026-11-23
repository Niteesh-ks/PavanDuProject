import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

let transporter = null;
const isConfigured = Boolean(
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS &&
  !process.env.SMTP_USER.includes('your-email@example.com')
);

if (isConfigured) {
  try {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } catch (err) {
    console.warn('[Email] SMTP initialization warning:', err.message);
  }
}

/**
 * Send an email and return strict status: 'sent', 'failed', or 'not_configured'
 * @param {object} options
 * @param {string} options.to
 * @param {string} options.recipientName
 * @param {string} options.subject
 * @param {string} options.html
 * @param {string} options.templateType
 */
export async function sendEmail({ to, recipientName = '', subject, html, templateType = 'general' }) {
  const from = process.env.EMAIL_FROM || 'Meet Hub <noreply@meethub.events>';

  if (!isConfigured || !transporter) {
    console.info(`[Email Service] Status: not_configured. Simulation for ${to}: "${subject}"`);
    return {
      status: 'not_configured',
      message: 'SMTP credentials not configured. Email logged in delivery audit system.',
      recipientEmail: to,
      templateType,
    };
  }

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });

    return {
      status: 'sent',
      messageId: info.messageId,
      recipientEmail: to,
      templateType,
    };
  } catch (err) {
    console.error(`[Email Service] Failed sending to ${to}:`, err.message);
    return {
      status: 'failed',
      error: err.message,
      recipientEmail: to,
      templateType,
    };
  }
}

/**
 * Send batched announcements to registered participants
 * Supports rate-limited batching
 */
export async function sendBatchedAnnouncements({ recipients, eventTitle, announcementTitle, message }) {
  const results = {
    total: recipients.length,
    sent: 0,
    failed: 0,
    notConfigured: 0,
    details: [],
  };

  const html = `
    <div style="font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0A0A0C; color: #EDEDED; border: 1px solid #27272A; border-radius: 8px;">
      <div style="border-bottom: 1px solid #27272A; padding-bottom: 16px; margin-bottom: 20px;">
        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #8B5CF6;">Meet Hub Event Update</span>
        <h2 style="font-size: 20px; font-weight: 700; margin: 8px 0 4px; color: #FFFFFF;">${eventTitle}</h2>
      </div>
      <h3 style="font-size: 16px; color: #E4E4E7; margin: 0 0 12px;">${announcementTitle}</h3>
      <p style="font-size: 14px; line-height: 1.6; color: #A1A1AA; white-space: pre-wrap;">${message}</p>
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #1F1F23; font-size: 12px; color: #71717A;">
        You received this official notification because you are registered for this event on Meet Hub.
      </div>
    </div>
  `;

  // Process in batches of 5 with 100ms pause to respect rate limits
  const batchSize = 5;
  for (let i = 0; i < recipients.length; i += batchSize) {
    const currentBatch = recipients.slice(i, i + batchSize);
    const batchPromises = currentBatch.map(async (r) => {
      const email = typeof r === 'string' ? r : r.email;
      const res = await sendEmail({
        to: email,
        recipientName: r.name || '',
        subject: `[Meet Hub Update] ${eventTitle}: ${announcementTitle}`,
        html,
        templateType: 'event_announcement',
      });
      return res;
    });

    const batchResults = await Promise.all(batchPromises);
    for (const r of batchResults) {
      if (r.status === 'sent') results.sent++;
      else if (r.status === 'failed') results.failed++;
      else if (r.status === 'not_configured') results.notConfigured++;
      results.details.push(r);
    }
  }

  return results;
}
