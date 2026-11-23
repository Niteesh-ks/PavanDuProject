import crypto from 'crypto';

/**
 * Generate a unique, readable ticket code
 * e.g. MH-2026-X8Y4Z2
 */
export function generateTicketCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // base32 alphanumeric without confusing chars (0, O, 1, I)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const year = new Date().getFullYear();
  return `MH-${year}-${code}`;
}

/**
 * Generate an opaque, cryptographically secure token for QR verification
 */
export function generateSecureToken() {
  return crypto.randomBytes(24).toString('hex');
}

/**
 * Build the QR payload for digital ticket
 * IMPORTANT: No sensitive personal info (passwords, phone numbers, email) is included
 */
export function buildQrPayload(ticketCode, secureToken, eventId) {
  return JSON.stringify({
    app: 'MeetHub',
    version: '1.0',
    code: ticketCode,
    token: secureToken,
    eventId: eventId,
    timestamp: Date.now(),
  });
}
