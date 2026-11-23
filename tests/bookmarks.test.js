import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getBookmarkErrorMessage } from '../src/lib/bookmarkErrors.js';

const migration = readFileSync(
  new URL('../supabase/migrations/20261111000002_event_bookmarks_rls.sql', import.meta.url),
  'utf8',
);

describe('saved event access', () => {
  it('explains how to resolve missing bookmark table permissions', () => {
    const message = getBookmarkErrorMessage(
      { code: '42501', message: 'permission denied for table event_bookmarks' },
      'load',
    );

    expect(message).toContain('Apply the event-bookmarks RLS migration');
    expect(message).toContain('confirm you are signed in');
  });

  it('constrains bookmark reads, inserts, and deletes to the authenticated owner', () => {
    expect(migration).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(migration).toMatch(/GRANT SELECT, INSERT, DELETE ON TABLE public\.event_bookmarks TO authenticated/);
    expect(migration).toMatch(/FOR SELECT\s+USING \(auth\.uid\(\) = user_id\)/);
    expect(migration).toMatch(/FOR INSERT\s+WITH CHECK \(auth\.uid\(\) = user_id\)/);
    expect(migration).toMatch(/FOR DELETE\s+USING \(auth\.uid\(\) = user_id\)/);
    expect(migration).toMatch(/ALTER COLUMN user_id SET DEFAULT auth\.uid\(\)/);
    expect(migration).toMatch(/FROM pg_policies/);
    expect(migration).toMatch(/DROP POLICY %I ON public\.event_bookmarks/);
    expect(migration).toMatch(/REVOKE ALL ON TABLE public\.event_bookmarks FROM PUBLIC, anon, authenticated/);
  });

  it('retains the schema uniqueness constraint for duplicate prevention', () => {
    const schema = readFileSync(
      new URL('../supabase/migrations/20260101000001_initial_schema.sql', import.meta.url),
      'utf8',
    );

    expect(schema).toMatch(/UNIQUE \(event_id, user_id\)/);
  });
});
