import { describe, expect, it } from 'vitest';
import { requireRole } from '../server/middleware/authorization.js';
import { toEventRecord } from '../server/routes/events.js';
import { getPortalAccessError } from '../src/lib/portalAccess.js';

function response() {
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

describe('trusted role and organizer event authorization', () => {
  it('does not grant admin access from user-controlled request data', () => {
    const req = {
      authProfile: { role: 'STUDENT' },
      body: { role: 'ADMIN' },
      query: { role: 'ADMIN' },
    };
    const res = response();
    let passed = false;

    requireRole('ADMIN')(req, res, () => { passed = true; });

    expect(passed).toBe(false);
    expect(res.statusCode).toBe(403);
  });

  it('denies a portal request that does not match the verified profile role', () => {
    expect(getPortalAccessError({ role: 'STUDENT' }, 'ADMIN')).toMatch(/Access denied/);
    expect(getPortalAccessError({ role: 'ADMIN' }, 'ADMIN')).toBe('');
  });

  it('requires an associated college for organizer access', () => {
    expect(getPortalAccessError({ role: 'ORGANIZER', college_id: null }, 'ORGANIZER')).toMatch(/associated with a college/);
    expect(getPortalAccessError({ role: 'ORGANIZER', college_id: 'college-id' }, 'ORGANIZER')).toBe('');
  });

  it('rejects organizer API access without a verified college association', () => {
    const req = { authProfile: { role: 'ORGANIZER', college_id: null } };
    const res = response();
    let passed = false;

    requireRole('ORGANIZER')(req, res, () => { passed = true; });

    expect(passed).toBe(false);
    expect(res.statusCode).toBe(403);
  });

  it('binds event ownership to the verified organizer and forces review status', () => {
    const result = toEventRecord({
      title: 'Campus Summit',
      description: 'A campus event.',
      collegeId: 'college-id',
      categoryId: 'category-id',
      startDate: '2026-12-01',
      endDate: '2026-12-01',
      startTime: '09:00',
      endTime: '18:00',
      venue: 'Main Hall',
      maxCapacity: 100,
      isPaid: false,
      organizer_id: 'attacker-id',
      status: 'approved',
    }, 'verified-organizer-id', 'stable-submission-key');

    expect(result.error).toBeUndefined();
    expect(result.record.organizer_id).toBe('verified-organizer-id');
    expect(result.record.status).toBe('pending_approval');
    expect(result.record.submission_key).toBe('stable-submission-key');
  });
});
