import express from 'express';
import { requireAuthenticatedUser, requireRole } from '../middleware/authorization.js';
import { createServiceSupabaseClient } from '../services/supabaseClients.js';
import { DEFAULT_COLLEGE_SOURCES, runEventRaiderScan } from '../services/eventRaider.js';

const router = express.Router();

router.use(requireAuthenticatedUser, requireRole('ADMIN'));

export function toScrapedEventRecord(event) {
  return {
    source_id: event.sourceId,
    title: event.title,
    college_name: event.collegeName,
    description: event.description,
    event_date: event.eventDate || null,
    venue: event.venue || null,
    registration_url: event.registrationUrl || null,
    original_source_url: event.originalSourceUrl,
    raw_data: event,
    review_status: 'pending',
  };
}

export function fromScrapedEventRow(event) {
  return {
    id: event.id,
    sourceId: event.source_id,
    title: event.title,
    collegeName: event.college_name,
    description: event.description,
    eventDate: event.event_date,
    venue: event.venue,
    registrationUrl: event.registration_url,
    originalSourceUrl: event.original_source_url,
    reviewStatus: event.review_status,
    scrapedAt: event.created_at,
    rejectionReason: event.raw_data?.rejectionReason,
  };
}

function mapDatabaseSource(source) {
  const college = Array.isArray(source.colleges) ? source.colleges[0] : source.colleges;
  const curatedSource = DEFAULT_COLLEGE_SOURCES.find(
    (candidate) =>
      (college?.code && candidate.collegeCode === college.code) ||
      candidate.name === source.name
  );

  return {
    ...curatedSource,
    id: source.id,
    name: source.name,
    collegeName: college?.name || curatedSource?.collegeName || source.name,
    collegeCode: college?.code || curatedSource?.collegeCode,
    url: source.events_url || source.base_url,
    selectorConfig: source.selector_config || {},
  };
}

router.post('/scan', async (_req, res) => {
  try {
    const supabase = createServiceSupabaseClient();
    const [{ data: sourceRows, error: sourceError }, { data: existingRows, error: existingError }] =
      await Promise.all([
        supabase
          .from('scraped_event_sources')
          .select('id,name,events_url,base_url,selector_config,colleges(name,code)')
          .eq('is_active', true),
        supabase.from('scraped_events').select('title,event_date,college_name'),
      ]);

    if (sourceError) throw sourceError;
    if (existingError) throw existingError;

    const sources = (sourceRows || []).map(mapDatabaseSource);
    const summary = await runEventRaiderScan(sources, existingRows || []);
    const records = summary.newPendingEvents.map(toScrapedEventRecord);

    if (records.length) {
      const { data: insertedRows, error: insertError } = await supabase
        .from('scraped_events')
        .upsert(records, {
          onConflict: 'source_id,title,event_date',
          ignoreDuplicates: true,
        })
        .select('*');

      if (insertError) throw insertError;
      summary.newPendingEvents = (insertedRows || []).map(fromScrapedEventRow);
      summary.totalDiscovered = summary.newPendingEvents.length;
    }

    return res.json({ success: true, summary });
  } catch (error) {
    console.error('[scraper] Failed to scan configured sources:', error);
    return res.status(500).json({
      error: 'Unable to scan or persist scraped events',
      details: error.message,
    });
  }
});

router.get('/pending', async (_req, res) => {
  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from('scraped_events')
      .select('*')
      .eq('review_status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    const events = (data || []).map(fromScrapedEventRow);
    return res.json({ count: events.length, events });
  } catch (error) {
    console.error('[scraper] Failed to load pending events:', error);
    return res.status(500).json({
      error: 'Unable to load pending scraped events',
      details: error.message,
    });
  }
});

router.post('/approve/:id', async (req, res) => {
  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from('scraped_events')
      .update({ review_status: 'approved' })
      .eq('id', req.params.id)
      .eq('review_status', 'pending')
      .select('*')
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Pending scraped event not found' });
    return res.json({ success: true, event: fromScrapedEventRow(data) });
  } catch (error) {
    console.error('[scraper] Failed to approve event:', error);
    return res.status(500).json({ error: 'Unable to approve scraped event', details: error.message });
  }
});

router.post('/reject/:id', async (req, res) => {
  try {
    const supabase = createServiceSupabaseClient();
    const { data: existing, error: fetchError } = await supabase
      .from('scraped_events')
      .select('raw_data')
      .eq('id', req.params.id)
      .eq('review_status', 'pending')
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existing) return res.status(404).json({ error: 'Pending scraped event not found' });

    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    const { data, error } = await supabase
      .from('scraped_events')
      .update({
        review_status: 'rejected',
        raw_data: { ...(existing.raw_data || {}), rejectionReason: reason || null },
      })
      .eq('id', req.params.id)
      .eq('review_status', 'pending')
      .select('*')
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Pending scraped event not found' });
    return res.json({ success: true, event: fromScrapedEventRow(data) });
  } catch (error) {
    console.error('[scraper] Failed to reject event:', error);
    return res.status(500).json({ error: 'Unable to reject scraped event', details: error.message });
  }
});

export default router;
