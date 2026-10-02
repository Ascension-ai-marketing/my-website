// Busy times from Google Calendar, and the free slots that remain. SOP: architecture/availability.md
import { RULES } from './booking_rules.js';
import { requireEnv } from './lib/env.js';
import { CALENDAR_API, googleRequest } from './lib/google_api.js';
import { SCOPES } from './lib/google_auth.js';

// Busy blocks on the owner's calendar between two instants, as [{ start, end }] Dates.
export async function fetchBusy(timeMin, timeMax, env = process.env) {
  const { GOOGLE_CALENDAR_ID } = requireEnv(['GOOGLE_CALENDAR_ID'], env);
  const body = await googleRequest(`${CALENDAR_API}/freeBusy`, {
    method: 'POST',
    scopes: [SCOPES.calendarFreeBusy],
    env,
    body: {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      timeZone: RULES.timezone,
      items: [{ id: GOOGLE_CALENDAR_ID }],
    },
  });
  const calendar = body.calendars?.[GOOGLE_CALENDAR_ID];
  if (!calendar) throw new Error('free/busy response has no entry for the calendar');
  if (calendar.errors?.length) {
    throw new Error(`free/busy error: ${calendar.errors.map((e) => e.reason).join(', ')}`);
  }
  return calendar.busy.map((block) => ({ start: new Date(block.start), end: new Date(block.end) }));
}

// Half-open intervals: touching edges do not overlap.
export function overlaps(a, b) {
  return a.start < b.end && b.start < a.end;
}

export function freeSlots(slots, busy) {
  return slots.filter((slot) => !busy.some((block) => overlaps(slot, block)));
}
