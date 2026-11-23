import express from 'express';
import crypto from 'node:crypto';
import { createPaymentOrder, verifyPaymentSignature } from '../services/razorpay.js';
import { generateTicketCode, generateSecureToken, buildQrPayload } from '../services/ticketService.js';
import { sendEmail } from '../services/emailService.js';
import { requireAuthenticatedUser } from '../middleware/authorization.js';
import { createServiceSupabaseClient } from '../services/supabaseClients.js';

const router = express.Router();

export const memoryPayments = new Map();
export const memoryRegistrations = new Map();
export const memoryTickets = new Map();

export function ticketResponse(ticket, event, profile, paymentStatus) {
  return {
    id: ticket.id,
    ticketCode: ticket.ticket_code,
    secureToken: ticket.secure_token,
    eventId: ticket.event_id,
    eventTitle: event.title,
    collegeName: event.colleges?.name || '',
    eventDate: event.start_date,
    userId: ticket.user_id,
    userName: profile.full_name,
    userEmail: profile.email,
    paymentStatus,
    ticketStatus: ticket.status,
    isUsed: ticket.is_used,
    qrPayload: ticket.qr_payload,
    createdAt: ticket.created_at,
  };
}

async function loadEvent(serviceClient, eventId) {
  const { data: event, error } = await serviceClient
    .from('events')
    .select('id,title,status,is_paid,fee_inr,start_date,colleges(name)')
    .eq('id', eventId)
    .maybeSingle();
  if (error) throw error;
  return event;
}

router.post('/create-order', requireAuthenticatedUser, async (req, res) => {
  try {
    const { eventId } = req.body;
    if (!eventId) return res.status(400).json({ error: 'eventId is required' });

    const serviceClient = createServiceSupabaseClient();
    const event = await loadEvent(serviceClient, eventId);
    if (!event || !['approved', 'published'].includes(event.status)) {
      return res.status(404).json({ error: 'Published event not found' });
    }
    if (!event.is_paid || Number(event.fee_inr) <= 0) {
      return res.status(400).json({ error: 'This event does not require paid registration' });
    }

    const { data: priorRegistration, error: priorError } = await serviceClient
      .from('event_registrations')
      .select('id,status,payment_status')
      .eq('event_id', event.id)
      .eq('user_id', req.authUser.id)
      .maybeSingle();
    if (priorError) throw priorError;
    if (priorRegistration?.status === 'confirmed') {
      return res.status(409).json({ error: 'You are already registered for this event' });
    }

    if (priorRegistration) {
      const { data: pendingPayment, error: pendingPaymentError } = await serviceClient
        .from('payments')
        .select('order_id,amount_inr,currency')
        .eq('registration_id', priorRegistration.id)
        .eq('status', 'created')
        .maybeSingle();
      if (pendingPaymentError) throw pendingPaymentError;
      if (pendingPayment) {
        return res.json({
          success: true,
          orderId: pendingPayment.order_id,
          amount: Math.round(Number(pendingPayment.amount_inr) * 100),
          currency: pendingPayment.currency,
          keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_meetHubDev',
          isSimulated: pendingPayment.order_id.startsWith('order_test_'),
        });
      }
    }

    const orderResult = await createPaymentOrder(Number(event.fee_inr), `rcpt_${crypto.randomUUID()}`, {
      eventId: event.id,
      userId: req.authUser.id,
      eventTitle: event.title,
    });
    if (!orderResult.success) {
      return res.status(500).json({ error: 'Failed to initiate payment gateway order' });
    }

    let registration = priorRegistration;
    if (!registration) {
      const { data, error } = await serviceClient
        .from('event_registrations')
        .insert({
          event_id: event.id,
          user_id: req.authUser.id,
          registration_number: `REG-${crypto.randomUUID()}`,
          status: 'pending',
          payment_status: 'pending',
          fee_paid: Number(event.fee_inr),
        })
        .select('id')
        .single();
      if (error?.code === '23505') {
        const { data: existingRegistration, error: existingRegistrationError } = await serviceClient
          .from('event_registrations')
          .select('id,status,payment_status')
          .eq('event_id', event.id)
          .eq('user_id', req.authUser.id)
          .single();
        if (existingRegistrationError) throw existingRegistrationError;
        registration = existingRegistration;
      } else {
        if (error) throw error;
        registration = data;
      }
    } else {
      const { error } = await serviceClient
        .from('event_registrations')
        .update({ status: 'pending', payment_status: 'pending', fee_paid: Number(event.fee_inr) })
        .eq('id', registration.id);
      if (error) throw error;
    }

    const { error: paymentError } = await serviceClient.from('payments').insert({
      order_id: orderResult.orderId,
      registration_id: registration.id,
      user_id: req.authUser.id,
      event_id: event.id,
      amount_inr: Number(event.fee_inr),
      currency: orderResult.currency || 'INR',
      status: 'created',
    });
    if (paymentError?.code === '23505') {
      const { data: existingPayment, error: existingPaymentError } = await serviceClient
        .from('payments')
        .select('order_id,amount_inr,currency')
        .eq('registration_id', registration.id)
        .eq('status', 'created')
        .maybeSingle();
      if (existingPaymentError) throw existingPaymentError;
      if (existingPayment) {
        return res.json({
          success: true,
          orderId: existingPayment.order_id,
          amount: Math.round(Number(existingPayment.amount_inr) * 100),
          currency: existingPayment.currency,
          keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_meetHubDev',
          isSimulated: existingPayment.order_id.startsWith('order_test_'),
        });
      }
    }
    if (paymentError) throw paymentError;

    memoryPayments.set(orderResult.orderId, {
      orderId: orderResult.orderId,
      eventId: event.id,
      userId: req.authUser.id,
      amount: orderResult.amount,
      status: 'created',
      createdAt: new Date().toISOString(),
    });

    return res.json({
      success: true,
      orderId: orderResult.orderId,
      amount: orderResult.amount,
      currency: orderResult.currency,
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_meetHubDev',
      isSimulated: orderResult.isSimulated,
    });
  } catch (error) {
    console.error('[Payment Order Error]', error.message);
    return res.status(500).json({ error: 'Unable to create payment order' });
  }
});

router.post('/register-free', requireAuthenticatedUser, async (req, res) => {
  try {
    const { eventId } = req.body;
    if (!eventId) return res.status(400).json({ error: 'eventId is required' });

    const serviceClient = createServiceSupabaseClient();
    const event = await loadEvent(serviceClient, eventId);
    if (!event || !['approved', 'published'].includes(event.status) || event.is_paid) {
      return res.status(404).json({ error: 'Published free event not found' });
    }

    const ticketCode = generateTicketCode();
    const secureToken = generateSecureToken();
    const { data: ticket, error } = await serviceClient.rpc('finalize_event_registration', {
      p_user_id: req.authUser.id,
      p_event_id: event.id,
      p_order_id: null,
      p_payment_id: null,
      p_payment_signature: null,
      p_is_free: true,
      p_ticket_code: ticketCode,
      p_secure_token: secureToken,
      p_qr_payload: buildQrPayload(ticketCode, secureToken, event.id),
    });
    if (error) throw error;

    const responseTicket = ticketResponse(ticket, event, req.authProfile, 'free');
    memoryTickets.set(responseTicket.ticketCode, responseTicket);
    memoryTickets.set(responseTicket.secureToken, responseTicket);
    return res.json({ success: true, ticket: responseTicket });
  } catch (error) {
    console.error('[Free Registration Error]', error.message);
    const statusCode = error.code === 'P0002' ? 404 : error.code === '23514' ? 409 : 400;
    return res.status(statusCode).json({ error: error.message || 'Free registration failed' });
  }
});

router.post('/verify', requireAuthenticatedUser, async (req, res) => {
  try {
    const { orderId, paymentId, signature } = req.body;
    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ error: 'orderId, paymentId, and signature are required' });
    }

    const serviceClient = createServiceSupabaseClient();
    const { data: payment, error: paymentError } = await serviceClient
      .from('payments')
      .select('id,event_id,registration_id,user_id,status')
      .eq('order_id', orderId)
      .eq('user_id', req.authUser.id)
      .maybeSingle();
    if (paymentError) throw paymentError;
    if (!payment) return res.status(404).json({ error: 'Payment order not found for this account' });

    if (payment.status !== 'captured') {
      const verification = verifyPaymentSignature(orderId, paymentId, signature);
      if (!verification.valid) {
        return res.status(400).json({ error: 'Invalid payment signature. Verification failed.' });
      }
    }

    const event = await loadEvent(serviceClient, payment.event_id);
    if (!event) return res.status(404).json({ error: 'Registered event not found' });

    const ticketCode = generateTicketCode();
    const secureToken = generateSecureToken();
    const { data: ticket, error: finalizeError } = await serviceClient.rpc('finalize_event_registration', {
      p_user_id: req.authUser.id,
      p_event_id: payment.event_id,
      p_order_id: orderId,
      p_payment_id: paymentId,
      p_payment_signature: signature,
      p_is_free: false,
      p_ticket_code: ticketCode,
      p_secure_token: secureToken,
      p_qr_payload: buildQrPayload(ticketCode, secureToken, payment.event_id),
    });
    if (finalizeError) throw finalizeError;

    const responseTicket = ticketResponse(ticket, event, req.authProfile, 'paid');
    memoryTickets.set(responseTicket.ticketCode, responseTicket);
    memoryTickets.set(responseTicket.secureToken, responseTicket);

    if (req.authProfile.email) {
      sendEmail({
        to: req.authProfile.email,
        recipientName: req.authProfile.full_name,
        subject: `[Confirmed] Your Ticket for ${event.title}`,
        html: `<p>Your registration for <strong>${event.title}</strong> is confirmed.</p><p>Ticket code: <strong>${responseTicket.ticketCode}</strong></p>`,
        templateType: 'payment_ticket_confirmation',
      }).catch((error) => console.warn('[Email Confirmation Non-fatal Error]:', error.message));
    }

    memoryPayments.set(orderId, { ...memoryPayments.get(orderId), status: 'captured', paymentId });
    return res.json({
      success: true,
      message: 'Payment verified successfully. Ticket created.',
      ticket: responseTicket,
    });
  } catch (error) {
    console.error('[Payment Verification Error]', error.message);
    return res.status(400).json({ error: error.message || 'Payment verification failed' });
  }
});

export default router;
