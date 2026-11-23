import { describe, it, expect } from 'vitest';
import paymentsRouter, { memoryTickets, memoryPayments } from '../server/routes/payments.js';
import ticketsRouter from '../server/routes/tickets.js';
import scraperRouter, {
  fromScrapedEventRow,
  toScrapedEventRecord,
} from '../server/routes/scraper.js';
import emailRouter, { memoryEmailLogs } from '../server/routes/email.js';

// Helper to simulate Express route invocation without network sockets
function createMockRes() {
  return {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    },
  };
}

describe('Express Server Route Handlers Unit & Functional Tests', () => {
  it('Payments create-order rejects requests without an authenticated session', async () => {
    const layer = paymentsRouter.stack.find(
      (s) => s.route && s.route.path === '/create-order' && s.route.methods.post
    );
    expect(layer).toBeDefined();

    const req = { body: { eventId: 'evt_iisc_pravega', userId: 'forged-user', amountInINR: 1 }, get: () => '' };
    const res = createMockRes();

    await layer.route.stack[0].handle(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.data.error).toBe('Authentication required');
  });

  it('Payments verify rejects unauthenticated identity claims', async () => {
    const layer = paymentsRouter.stack.find(
      (s) => s.route && s.route.path === '/verify' && s.route.methods.post
    );
    expect(layer).toBeDefined();

    const req = { body: { orderId: 'order_test_unit99', userId: 'forged-user' }, get: () => '' };
    const res = createMockRes();

    await layer.route.stack[0].handle(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.data.error).toBe('Authentication required');
  });

  it('Tickets Route: validate-and-checkin rejects unauthenticated scans', async () => {
    const layer = ticketsRouter.stack.find(
      (s) => s.route && s.route.path === '/validate-and-checkin' && s.route.methods.post
    );
    expect(layer).toBeDefined();

    const testCode = 'MH-2026-VAL123';
    const req = { body: { ticketCode: testCode, eventId: 'e1111111-1111-1111-1111-111111111111' }, get: () => '' };
    const res = createMockRes();

    await layer.route.stack[0].handle(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.data.error).toBe('Authentication required');
  });

  it('Tickets Route: repeat-scan endpoint is also authenticated', async () => {
    const layer = ticketsRouter.stack.find(
      (s) => s.route && s.route.path === '/validate-and-checkin' && s.route.methods.post
    );

    const testCode = 'MH-2026-VAL123';
    const req = { body: { ticketCode: testCode }, get: () => '' };
    const res = createMockRes();

    await layer.route.stack[0].handle(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.data.error).toBe('Authentication required');
  });

  it('Scraper routes require authenticated admin access', async () => {
    const authLayer = scraperRouter.stack.find(
      (layer) => !layer.route && layer.name === 'requireAuthenticatedUser'
    );
    expect(authLayer).toBeDefined();

    const req = { get: () => '' };
    const res = createMockRes();
    await authLayer.handle(req, res, () => {});

    expect(res.statusCode).toBe(401);
    expect(res.data.error).toBe('Authentication required');
  });

  it('scraped event records are persisted as pending and map back to the review shape', () => {
    const record = toScrapedEventRecord({
      sourceId: 'source-uuid',
      title: 'Campus event',
      collegeName: 'Example College',
      description: 'Details',
      eventDate: '2026-11-22',
      venue: 'Main hall',
      registrationUrl: 'https://example.test/register',
      originalSourceUrl: 'https://example.test/events',
    });

    expect(record).toMatchObject({
      source_id: 'source-uuid',
      title: 'Campus event',
      college_name: 'Example College',
      event_date: '2026-11-22',
      review_status: 'pending',
    });

    expect(fromScrapedEventRow({
      id: 'event-uuid',
      ...record,
      created_at: '2026-11-01T10:00:00Z',
    })).toMatchObject({
      id: 'event-uuid',
      sourceId: 'source-uuid',
      reviewStatus: 'pending',
      scrapedAt: '2026-11-01T10:00:00Z',
    });
  });

  it('Email Route: send-announcement requires an authenticated organizer or admin', async () => {
    const layer = emailRouter.stack.find(
      (s) => s.route && s.route.path === '/send-announcement' && s.route.methods.post
    );
    expect(layer).toBeDefined();

    const req = { body: {}, get: () => '' };
    const res = createMockRes();

    await layer.route.stack[0].handle(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.data.error).toBe('Authentication required');
  });
});
