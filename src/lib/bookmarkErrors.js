export function getBookmarkErrorMessage(error, action) {
  const prefix = action === 'load' ? 'Unable to load saved events' : 'Unable to update saved event';
  const message = error?.message || 'Unknown database error.';

  if (error?.code === '42501' || /permission denied for table event_bookmarks/i.test(message)) {
    return `${prefix}: Supabase denied access to saved events. Apply the event-bookmarks RLS migration and confirm you are signed in.`;
  }

  if (error?.code === '42P01') {
    return `${prefix}: the saved-events table is missing. Apply the event-bookmarks RLS migration.`;
  }

  return `${prefix}: ${message}`;
}
