// The two rate limits: one upcoming call per email, and new bookings per hour.
// SOP: architecture/booking-validation.md
import { requireEnv } from './lib/env.js';
import { CALENDAR_API, SHEETS_API, googleRequest } from './lib/google_api.js';
import { SCOPES } from './lib/google_auth.js';
import { LEAD_SHEET_TAB } from './lib/lead_sheet.js';

const LOOKAHEAD_DAYS = 15;

// Upcoming (not yet started, not cancelled) events on the calendar that list this email as a guest.
export async function countUpcomingCallsFor(email, now, env = process.env) {
  const { GOOGLE_CALENDAR_ID } = requireEnv(['GOOGLE_CALENDAR_ID'], env);
  const url = new URL(`${CALENDAR_API}/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events`);
  url.search = new URLSearchParams({
    timeMin: now.toISOString(),
    timeMax: new Date(now.getTime() + LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    q: email,
    singleEvents: 'true',
    maxResults: '50',
    fields: 'items(status,start,attendees(email))',
  }).toString();
  const body = await googleRequest(url, { scopes: [SCOPES.calendarEvents], env });
  return countUpcomingGuestEvents(body.items ?? [], email, now);
}

export function countUpcomingGuestEvents(items, email, now) {
  const wanted = email.toLowerCase();
  return items.filter((event) => {
    if (event.status === 'cancelled') return false;
    const start = new Date(event.start?.dateTime ?? event.start?.date);
    if (!(start > now)) return false;
    return (event.attendees ?? []).some((guest) => (guest.email ?? '').toLowerCase() === wanted);
  }).length;
}

// Bookings recorded in the lead sheet at or after `since`, judged by the booked_at column.
export async function countBookingsSince(since, env = process.env) {
  const { LEAD_SHEET_ID } = requireEnv(['LEAD_SHEET_ID'], env);
  const url = new URL(
    `${SHEETS_API}/${encodeURIComponent(LEAD_SHEET_ID)}/values/${encodeURIComponent(`${LEAD_SHEET_TAB}!A2:A`)}`,
  );
  url.searchParams.set('majorDimension', 'COLUMNS');
  const body = await googleRequest(url, { scopes: [SCOPES.sheets], env });
  return countTimestampsSince(body.values?.[0] ?? [], since);
}

export function countTimestampsSince(values, since) {
  return values.filter((value) => {
    const time = new Date(value);
    return !Number.isNaN(time.getTime()) && time >= since;
  }).length;
}
