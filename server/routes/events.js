import express from 'express';
import { requireAuthenticatedUser, requireRole } from '../middleware/authorization.js';

const router = express.Router();

export async function fetchPublicEvents(supabase) {
  return supabase
    .from('events')
    .select('*, colleges(name, code, city, address, latitude, longitude), categories!events_category_id_fkey(name)')
    .in('status', ['approved', 'published'])
    .order('start_date', { ascending: true });
}

export function toEventRecord(body, organizerId, submissionKey) {
  const required = ['title', 'description', 'collegeId', 'categoryId', 'startDate', 'endDate', 'startTime', 'endTime', 'venue'];
  const missing = required.filter((field) => !String(body[field] ?? '').trim());
  if (missing.length) {
    return { error: `Required event fields are missing: ${missing.join(', ')}` };
  }

  const capacity = Number(body.maxCapacity);
  const fee = body.isPaid ? Number(body.feeInr) : 0;
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 10000) {
    return { error: 'maxCapacity must be an integer between 1 and 10000' };
  }
  if (!Number.isFinite(fee) || fee < 0 || (body.isPaid && fee <= 0)) {
    return { error: 'A valid positive fee is required for paid events' };
  }

  return {
    record: {
      title: body.title.trim(),
      slug: body.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      description: body.description.trim(),
      organizer_id: organizerId,
      college_id: body.collegeId,
      category_id: body.categoryId,
      subcategory: body.subcategory?.trim() || null,
      start_date: body.startDate,
      end_date: body.endDate,
      start_time: body.startTime,
      end_time: body.endTime,
      venue: body.venue.trim(),
      city: body.city?.trim() || 'Bengaluru',
      address: body.address?.trim() || null,
      latitude: Number.isFinite(Number(body.latitude)) ? Number(body.latitude) : null,
      longitude: Number.isFinite(Number(body.longitude)) ? Number(body.longitude) : null,
      cover_image: body.coverImage?.trim() || null,
      registration_deadline: body.registrationDeadline || `${body.startDate}T23:59:00+05:30`,
      max_capacity: capacity,
      is_paid: Boolean(body.isPaid),
      fee_inr: fee,
      status: 'pending_approval',
      submission_key: submissionKey,
    },
  };
}

router.get('/mine', requireAuthenticatedUser, requireRole('ORGANIZER', 'ADMIN'), async (req, res) => {
  const organizerId = req.authProfile.role === 'ADMIN' && req.query.organizerId
    ? req.query.organizerId
    : req.authUser.id;
  const { data, error } = await req.supabase
    .from('events')
    .select('*, colleges(name, code, city, address, latitude, longitude), categories!events_category_id_fkey(name)')
    .eq('organizer_id', organizerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Organizer Events Query]', error.message);
    return res.status(500).json({ error: 'Unable to load organizer events' });
  }
  return res.json({ events: data || [] });
});

router.post('/', requireAuthenticatedUser, requireRole('ORGANIZER'), async (req, res) => {
  const idempotencyKey = req.get('idempotency-key');
  if (!idempotencyKey || idempotencyKey.length > 128) {
    return res.status(400).json({ error: 'A valid Idempotency-Key header is required' });
  }

  const { record, error: validationError } = toEventRecord(req.body, req.authUser.id, idempotencyKey);
  if (validationError) return res.status(400).json({ error: validationError });

  const { data: existing, error: lookupError } = await req.supabase
    .from('events')
    .select('*')
    .eq('organizer_id', req.authUser.id)
    .eq('submission_key', idempotencyKey)
    .maybeSingle();

  if (lookupError) {
    console.error('[Event Idempotency Lookup]', lookupError.message);
    return res.status(500).json({ error: 'Unable to verify event submission status' });
  }
  if (existing) return res.status(200).json({ event: existing, duplicate: true });

  const { data: event, error: insertError } = await req.supabase
    .from('events')
    .insert(record)
    .select('*')
    .single();

  if (insertError?.code === '23505') {
    const { data: retryRecord, error: retryError } = await req.supabase
      .from('events')
      .select('*')
      .eq('organizer_id', req.authUser.id)
      .eq('submission_key', idempotencyKey)
      .single();
    if (!retryError && retryRecord) return res.status(200).json({ event: retryRecord, duplicate: true });
  }
  if (insertError) {
    console.error('[Event Submission]', insertError.message);
    return res.status(400).json({ error: 'Event submission failed; verify the selected college and category exist' });
  }
  return res.status(201).json({ event });
});

router.get('/public', async (req, res) => {
  const publicSupabase = req.app.locals.publicSupabase;
  if (!publicSupabase) {
    return res.status(503).json({ error: 'Public event service is not configured' });
  }

  try {
    const { data, error } = await fetchPublicEvents(publicSupabase);
    if (error) {
      console.error('[Public Events Query]', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return res.status(500).json({ error: 'Unable to load published events' });
    }
    return res.json({ events: data || [] });
  } catch (error) {
    console.error('[Public Events Query] Unexpected failure', {
      message: error.message,
      stack: error.stack,
    });
    return res.status(500).json({ error: 'Unable to load published events' });
  }
});

export default router;
