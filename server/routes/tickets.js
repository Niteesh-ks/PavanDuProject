import express from 'express';
import { requireAuthenticatedUser, requireRole } from '../middleware/authorization.js';
import { createServiceSupabaseClient } from '../services/supabaseClients.js';

const router = express.Router();
export const memoryCheckins = [];

function extractTicketIdentifier(body) {
  let code = (body.ticketCode || '').trim().toUpperCase();
  let token = '';
  if (body.rawQrData) {
    try {
      const parsed = JSON.parse(body.rawQrData);
      code = parsed.code ? String(parsed.code).trim().toUpperCase() : code;
      token = parsed.token ? String(parsed.token).trim() : '';
    } catch {
      const rawValue = String(body.rawQrData).trim();
      if (rawValue.startsWith('MH-')) code = rawValue.toUpperCase();
      else token = rawValue;
    }
  }
  return { code, token };
}

function invalidTicket(res, title, message, ticket = null) {
  return res.status(200).json({
    status: 'RED',
    result: 'INVALID',
    title,
    message,
    ...(ticket ? { ticketDetails: ticket } : {}),
  });
}

router.post('/validate-and-checkin', requireAuthenticatedUser, requireRole('ORGANIZER', 'ADMIN'), async (req, res) => {
  try {
    const { code, token } = extractTicketIdentifier(req.body);
    if (!code && !token) {
      return res.status(400).json({ status: 'RED', result: 'INVALID', message: 'No ticket code or QR payload provided' });
    }

    const serviceClient = createServiceSupabaseClient();
    let ticketQuery = serviceClient
      .from('event_tickets')
      .select('*,events(id,title,organizer_id),event_registrations(status,payment_status),profiles!event_tickets_user_id_fkey(full_name,email)');
    ticketQuery = code
      ? ticketQuery.eq('ticket_code', code)
      : ticketQuery.eq('secure_token', token);
    const { data: ticket, error } = await ticketQuery.maybeSingle();
    if (error) throw error;
    if (!ticket) return invalidTicket(res, 'ENTRY DENIED', 'Ticket not found in Meet Hub database.');

    const event = Array.isArray(ticket.events) ? ticket.events[0] : ticket.events;
    const registration = Array.isArray(ticket.event_registrations)
      ? ticket.event_registrations[0]
      : ticket.event_registrations;
    const attendee = Array.isArray(ticket.profiles) ? ticket.profiles[0] : ticket.profiles;
    if (req.body.eventId && req.body.eventId !== ticket.event_id) {
      return invalidTicket(res, 'WRONG EVENT', `This ticket is registered for ${event?.title || 'a different event'}.`, {
        ticketCode: ticket.ticket_code,
        userName: attendee?.full_name,
        eventTitle: event?.title,
      });
    }
    if (req.authProfile.role !== 'ADMIN' && event?.organizer_id !== req.authUser.id) {
      return res.status(403).json({ error: 'You are not authorized to scan tickets for this event' });
    }
    if (!['paid', 'free'].includes(registration?.payment_status) || registration?.status !== 'confirmed') {
      return invalidTicket(res, 'PAYMENT UNVERIFIED', 'Registration is not confirmed.');
    }
    if (ticket.status === 'cancelled') {
      return invalidTicket(res, 'TICKET CANCELLED', 'This registration has been cancelled.');
    }
    if (ticket.is_used || ticket.status === 'used') {
      return res.status(200).json({
        status: 'ORANGE',
        result: 'ALREADY_USED',
        title: 'ALREADY CHECKED IN',
        message: `This pass was already checked in at ${new Date(ticket.used_at).toLocaleTimeString()}.`,
        ticketDetails: {
          ticketCode: ticket.ticket_code,
          userName: attendee?.full_name,
          userEmail: attendee?.email,
          eventTitle: event?.title,
          usedAt: ticket.used_at,
          checkedInBy: ticket.checked_in_by,
        },
      });
    }

    const { data: checkedInTicket, error: checkinError } = await serviceClient.rpc('checkin_event_ticket', {
      p_ticket_id: ticket.id,
      p_scanner_id: req.authUser.id,
      p_device_info: req.body.deviceInfo || 'Meet Hub On-Site Scanner',
    });
    if (checkinError?.code === '23505') {
      return res.status(200).json({
        status: 'ORANGE',
        result: 'ALREADY_USED',
        title: 'ALREADY CHECKED IN',
        message: 'This pass was already checked in.',
        ticketDetails: { ticketCode: ticket.ticket_code, userName: attendee?.full_name, eventTitle: event?.title },
      });
    }
    if (checkinError) throw checkinError;
    memoryCheckins.push({
      ticket_id: ticket.id,
      event_id: ticket.event_id,
      scanned_by: req.authUser.id,
      scanned_at: checkedInTicket.used_at,
      scan_result: 'approved',
      device_info: req.body.deviceInfo || 'Meet Hub On-Site Scanner',
    });

    return res.status(200).json({
      status: 'GREEN',
      result: 'APPROVED',
      title: 'ENTRY APPROVED',
      message: 'Access granted. Attendee identity verified.',
      ticketDetails: {
        ticketCode: ticket.ticket_code,
        userName: attendee?.full_name,
        userEmail: attendee?.email,
        eventTitle: event?.title,
        checkinTime: checkedInTicket.used_at,
      },
    });
  } catch (error) {
    console.error('[Ticket Check-in Error]', error.message);
    return res.status(500).json({ status: 'RED', result: 'INVALID', title: 'SERVER ERROR', message: 'Ticket validation failed' });
  }
});

router.get('/:code', requireAuthenticatedUser, async (req, res) => {
  try {
    const serviceClient = createServiceSupabaseClient();
    const { data: ticket, error } = await serviceClient
      .from('event_tickets')
      .select('*,events(id,title,organizer_id),profiles!event_tickets_user_id_fkey(full_name,email)')
      .eq('ticket_code', req.params.code.toUpperCase())
      .maybeSingle();
    if (error) throw error;
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const event = Array.isArray(ticket.events) ? ticket.events[0] : ticket.events;
    if (
      req.authProfile.role !== 'ADMIN'
      && ticket.user_id !== req.authUser.id
      && !(req.authProfile.role === 'ORGANIZER' && event?.organizer_id === req.authUser.id)
    ) {
      return res.status(403).json({ error: 'Ticket access denied' });
    }
    return res.json({ ticket });
  } catch (error) {
    console.error('[Ticket Query Error]', error.message);
    return res.status(500).json({ error: 'Unable to load ticket' });
  }
});

export default router;
