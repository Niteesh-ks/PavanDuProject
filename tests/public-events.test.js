import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import eventsRouter from '../server/routes/events.js';

function createResponse() {
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

function createPublicSupabase(result) {
  const query = {
    from: vi.fn(() => query),
    select: vi.fn(() => query),
    in: vi.fn(() => query),
    order: vi.fn(async () => result),
  };
  return query;
}

async function callPublicEvents(publicSupabase) {
  const route = eventsRouter.stack.find(
    (layer) => layer.route?.path === '/public' && layer.route.methods.get,
  );
  const req = { app: { locals: { publicSupabase } } };
  const res = createResponse();
  await route.route.stack[0].handle(req, res);
  return res;
}

describe('GET /api/events/public', () => {
  it('grants public reads only to the lookup tables while retaining RLS', () => {
    const migration = readFileSync(
      new URL('../supabase/migrations/20261111000003_public_event_read_permissions.sql', import.meta.url),
      'utf8',
    );

    expect(migration).toMatch(/GRANT SELECT ON TABLE public\.events, public\.colleges, public\.categories TO anon, authenticated/);
    expect(migration).not.toMatch(/DISABLE ROW LEVEL SECURITY/);
    expect(migration).not.toMatch(/GRANT\s+(ALL|INSERT|UPDATE|DELETE)/i);
  });

  it('limits public event visibility and sensitive profile reads while retaining RLS', () => {
    const migration = readFileSync(
      new URL('../supabase/migrations/20261111000006_rls_read_scopes_and_public_events.sql', import.meta.url),
      'utf8',
    );

    expect(migration).toMatch(/status IN \('approved', 'published'\)/);
    expect(migration).toMatch(/ALTER TABLE public\.events ENABLE ROW LEVEL SECURITY/);
    expect(migration).toMatch(/REVOKE SELECT ON TABLE public\.profiles FROM anon, authenticated/);
    expect(migration).toMatch(/CREATE OR REPLACE VIEW public\.moment_profiles/);
    expect(migration).not.toMatch(/DISABLE ROW LEVEL SECURITY/);
  });

  it('returns the public statuses and joined event details', async () => {
    const events = [{ id: 'public-event', status: 'approved', title: 'Campus event' }];
    const supabase = createPublicSupabase({ data: events, error: null });

    const response = await callPublicEvents(supabase);

    expect(response.statusCode).toBe(200);
    expect(response.data).toEqual({ events });
    expect(supabase.from).toHaveBeenCalledWith('events');
    expect(supabase.select).toHaveBeenCalledWith(
      '*, colleges(name, code, city, address, latitude, longitude), categories!events_category_id_fkey(name)',
    );
    expect(supabase.in).toHaveBeenCalledWith('status', ['approved', 'published']);
    expect(supabase.order).toHaveBeenCalledWith('start_date', { ascending: true });
  });

  it('returns an empty list when no events have public statuses', async () => {
    const response = await callPublicEvents(createPublicSupabase({ data: [], error: null }));

    expect(response.statusCode).toBe(200);
    expect(response.data).toEqual({ events: [] });
  });

  it('logs database diagnostics and returns an explicit server error', async () => {
    const databaseError = {
      code: '42501',
      message: 'permission denied for table events',
      details: 'Events table SELECT privilege is required',
      hint: 'Grant SELECT to anon',
    };
    const logger = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      const response = await callPublicEvents(
        createPublicSupabase({ data: null, error: databaseError }),
      );

      expect(response.statusCode).toBe(500);
      expect(response.data).toEqual({ error: 'Unable to load published events' });
      expect(logger).toHaveBeenCalledWith('[Public Events Query]', {
        code: databaseError.code,
        message: databaseError.message,
        details: databaseError.details,
        hint: databaseError.hint,
      });
    } finally {
      logger.mockRestore();
    }
  });

  it('returns 503 when public Supabase is not configured', async () => {
    const response = await callPublicEvents(null);

    expect(response.statusCode).toBe(503);
    expect(response.data).toEqual({ error: 'Public event service is not configured' });
  });
});
