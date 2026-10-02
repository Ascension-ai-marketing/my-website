// Probe: Google Calendar free/busy for the next 24 hours. Read only.
// SOP: architecture/link-probes.md
import { SCOPES, getAccessToken, requireEnv } from './lib/google_auth.js';
import { googleJson, runProbe } from './lib/probe.js';

await runProbe('google calendar', async () => {
  const { GOOGLE_CALENDAR_ID } = requireEnv(['GOOGLE_CALENDAR_ID']);
  const token = await getAccessToken([SCOPES.calendarFreeBusy, SCOPES.calendarEvents]);

  const now = new Date();
  const res = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      timeMin: now.toISOString(),
      timeMax: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      items: [{ id: GOOGLE_CALENDAR_ID }],
    }),
  });
  const body = await googleJson(res);

  const calendar = body.calendars?.[GOOGLE_CALENDAR_ID];
  if (!calendar) throw new Error('response has no entry for the calendar');
  if (calendar.errors?.length) {
    throw new Error(calendar.errors.map((e) => e.reason).join(', '));
  }
  return `free/busy readable, ${calendar.busy.length} busy block(s) in the next 24 hours`;
});
