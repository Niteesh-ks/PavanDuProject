import express from 'express';
import { sendBatchedAnnouncements } from '../services/emailService.js';
import { requireAuthenticatedUser, requireRole } from '../middleware/authorization.js';

const router = express.Router();

export const memoryEmailLogs = [
  {
    id: 'log_seed_1',
    recipientEmail: 'lead.dev@pes.edu',
    recipientName: 'Kavya S',
    templateType: 'payment_ticket_confirmation',
    subject: '[Confirmed] Your Ticket for Hackshetra 2026',
    status: 'sent',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'log_seed_2',
    recipientEmail: 'aditya.n@rvce.edu.in',
    recipientName: 'Aditya N',
    templateType: 'event_announcement',
    subject: '[Meet Hub Update] 8th Mile Soundstage Schedule Update',
    status: 'sent',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
];

/**
 * POST /api/email/send-announcement
 * Organizer sends broadcast update to registered attendees
 */
router.post('/send-announcement', requireAuthenticatedUser, requireRole('ORGANIZER', 'ADMIN'), async (req, res) => {
  try {
    const { eventId, eventTitle, announcementTitle, message, recipients } = req.body;

    if (!eventTitle || !announcementTitle || !message) {
      return res.status(400).json({ error: 'eventTitle, announcementTitle, and message are required' });
    }

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'Recipients list is empty' });
    }

    const batchResult = await sendBatchedAnnouncements({
      recipients,
      eventTitle,
      announcementTitle,
      message,
    });

    // Record audit entries
    for (const d of batchResult.details) {
      memoryEmailLogs.unshift({
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        eventId,
        recipientEmail: d.recipientEmail,
        templateType: d.templateType,
        subject: `[Meet Hub Update] ${eventTitle}: ${announcementTitle}`,
        status: d.status,
        createdAt: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      message: `Announcement delivery processed for ${batchResult.total} recipients`,
      results: {
        total: batchResult.total,
        sent: batchResult.sent,
        failed: batchResult.failed,
        notConfigured: batchResult.notConfigured,
      },
    });
  } catch (err) {
    console.error('[Email Announcement Error]', err);
    return res.status(500).json({ error: err.message || 'Delivery failed' });
  }
});

/**
 * GET /api/email/logs
 * Retrieve email audit logs
 */
router.get('/logs', requireAuthenticatedUser, requireRole('ADMIN'), (req, res) => {
  return res.json({
    total: memoryEmailLogs.length,
    logs: memoryEmailLogs.slice(0, 50),
  });
});

export default router;
