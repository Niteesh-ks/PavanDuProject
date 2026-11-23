const indiaDateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Kolkata',
});

const indiaTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'Asia/Kolkata',
});

const eventTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'UTC',
});

function parseDate(value, dateOnlyAtNoon = false) {
  if (!value) return null;
  if (dateOnlyAtNoon && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day, 12));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
      ? date
      : null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatIndiaDate(value) {
  const date = parseDate(value, true);
  return date ? indiaDateFormatter.format(date) : '';
}

export function formatIndiaTime(value) {
  const timeOnly = typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?$/.exec(value);
  if (timeOnly) {
    const [hour, minute] = value.split(':').map(Number);
    return eventTimeFormatter.format(new Date(Date.UTC(2000, 0, 1, hour, minute)));
  }
  const date = parseDate(value);
  return date ? indiaTimeFormatter.format(date) : '';
}
