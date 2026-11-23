import { describe, expect, it } from 'vitest';
import { toUiEvent } from '../src/lib/events.js';
import { normalizeMoment } from '../src/lib/moments.js';
import { ticketResponse } from '../server/routes/payments.js';

describe('persisted record mapping', () => {
  it('restores moment identity, storage URL, likes, and liked state from database rows', () => {
    const moment = normalizeMoment({
      id: 'moment-1',
      user_id: 'user-1',
      caption: 'Campus showcase',
      image_urls: ['https://storage.example/moments/user-1/photo.jpg'],
      storage_path: 'user-1/photo.jpg',
      likes_count: 3,
      moment_likes: ['user-2', 'user-1'],
      created_at: '2026-11-11T12:00:00Z',
      profile: { full_name: 'Actual Profile Name', college_name: 'Example College' },
      events: { title: 'Published Event' },
    }, 'user-1');

    expect(moment.userId).toBe('user-1');
    expect(moment.userName).toBe('Actual Profile Name');
    expect(moment.imageUrls[0]).toContain('/photo.jpg');
    expect(moment.storagePath).toBe('user-1/photo.jpg');
    expect(moment.likesCount).toBe(3);
    expect(moment.isLiked).toBe(true);
  });

  it('maps canonical approved event data into the shared public display shape', () => {
    const event = toUiEvent({
      id: 'canonical-event-id',
      title: 'Organizer submitted event',
      start_date: '2026-12-01',
      end_date: '2026-12-02',
      venue: 'Main Hall',
      status: 'approved',
      college_id: 'college-1',
      category_id: 'category-1',
      colleges: { name: 'Example College', code: 'EX' },
      categories: { name: 'Workshops' },
    });

    expect(event.id).toBe('canonical-event-id');
    expect(event.status).toBe('approved');
    expect(event.collegeName).toBe('Example College');
    expect(event.categoryName).toBe('Workshops');
    expect(event.startDate).toBe('2026-12-01');
  });

  it('builds attendee identity from the authenticated profile, not request-provided values', () => {
    const ticket = ticketResponse(
      { id: 'ticket-1', ticket_code: 'MH-2026-ABC234', secure_token: 'opaque', event_id: 'event-1', user_id: 'auth-user', qr_payload: '{}', status: 'active' },
      { title: 'Published Event', start_date: '2026-12-01', colleges: { name: 'Example College' } },
      { id: 'auth-user', full_name: 'Actual Profile Name', email: 'actual@example.edu' },
      'free',
    );

    expect(ticket.userId).toBe('auth-user');
    expect(ticket.userName).toBe('Actual Profile Name');
    expect(ticket.userEmail).toBe('actual@example.edu');
  });
});
