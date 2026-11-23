import express from 'express';
import { requireAuthenticatedUser, requireRole } from '../middleware/authorization.js';

const router = express.Router();

router.use(requireAuthenticatedUser, requireRole('ADMIN'));

router.get('/events', async (req, res) => {
  const status = req.query.status || 'pending_approval';
  const { data, error } = await req.supabase
    .from('events')
    .select('*, colleges(name, code, city), categories!events_category_id_fkey(name), profiles!events_organizer_id_fkey(full_name, email)')
    .eq('status', status)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[Admin Events Query]', error.message);
    return res.status(500).json({ error: 'Unable to load event review queue' });
  }
  return res.json({ events: data || [] });
});

router.post('/events/:id/review', async (req, res) => {
  const { status, note = '' } = req.body;
  if (!['approved', 'rejected', 'changes_requested'].includes(status)) {
    return res.status(400).json({ error: 'Decision must be approved, rejected, or changes_requested' });
  }
  if (typeof note !== 'string' || note.length > 2000) {
    return res.status(400).json({ error: 'Review note must be 2000 characters or fewer' });
  }

  const { data, error } = await req.supabase.rpc('review_event', {
    p_event_id: req.params.id,
    p_status: status,
    p_note: note.trim() || null,
  });

  if (error) {
    const statusCode = error.code === 'P0002' ? 404 : error.code === '42501' ? 403 : 400;
    console.error('[Event Review]', error.message);
    return res.status(statusCode).json({ error: error.message || 'Event review failed' });
  }
  return res.json({ event: data });
});

export default router;
