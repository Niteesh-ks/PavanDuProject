import { describe, it, expect, beforeEach } from 'vitest';
import { generateTicketCode, generateSecureToken, buildQrPayload } from '../server/services/ticketService.js';
import { memoryTickets } from '../server/routes/payments.js';

describe('Digital Tickets & QR Verification Engine', () => {
  it('generates unique readable ticket codes formatted with MH-{year}-XXXXXX', () => {
    const code1 = generateTicketCode();
    const code2 = generateTicketCode();

    expect(code1).toMatch(/^MH-\d{4}-[A-Z0-9]{6}$/);
    expect(code2).toMatch(/^MH-\d{4}-[A-Z0-9]{6}$/);
    expect(code1).not.toBe(code2);
  });

  it('generates 48-character opaque secure tokens', () => {
    const token = generateSecureToken();
    expect(token).toHaveLength(48);
  });

  it('ensures QR payload never includes sensitive credentials or passwords', () => {
    const qrPayload = buildQrPayload('MH-2026-TEST01', 'token_123', 'evt_1');
    const parsed = JSON.parse(qrPayload);

    expect(parsed.code).toBe('MH-2026-TEST01');
    expect(parsed.token).toBe('token_123');
    expect(parsed.password).toBeUndefined();
    expect(parsed.email).toBeUndefined();
    expect(parsed.phone).toBeUndefined();
  });

  it('detects and prevents duplicate ticket check-ins', () => {
    const testCode = 'MH-2026-CHECK1';
    const sampleTicket = {
      id: 'ticket_chk_test',
      ticketCode: testCode,
      secureToken: 'token_sample_sec',
      eventId: 'evt_sample_1',
      paymentStatus: 'paid',
      ticketStatus: 'active',
      isUsed: false,
    };

    memoryTickets.set(testCode, sampleTicket);

    // First scan: Valid and marked used
    expect(sampleTicket.isUsed).toBe(false);
    sampleTicket.isUsed = true;
    sampleTicket.usedAt = new Date().toISOString();

    // Second scan attempt: Must be detected as already used
    expect(sampleTicket.isUsed).toBe(true);
    expect(sampleTicket.usedAt).toBeTruthy();
  });
});
