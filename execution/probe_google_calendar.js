// Probe: Google Calendar free/busy for the next 24 hours, on the right account. Read only.
// SOP: architecture/link-probes.md
import { SCOPES, getAccessToken, requireEnv } from './lib/google_auth.js';
import { googleJson, runProbe } from './lib/probe.js';

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

await runProbe('google calendar', async () => {
  const { GOOGLE_CALENDAR_ID, OWNER_EMAIL } = requireEnv(['GOOGLE_CALENDAR_ID', 'OWNER_EMAIL']);
  const token = await getAccessToken([SCOPES.calendarFreeBusy, SCOPES.calendarEvents]);
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };

  // The primary calendar is named after its account, so this catches a sign-in with the wrong account.
  const calendarUrl = new URL(`${CALENDAR_API}/calendars/primary/events`);
  calendarUrl.search = new URLSearchParams({ maxResults: '1', fields: 'summary,timeZone' }).toString();
  const primary = await googleJson(await fetch(calendarUrl, { headers }));
  if (primary.summary !== OWNER_EMAIL) {
    throw new Error(`signed in to the calendar "${primary.summary}", expected ${OWNER_EMAIL}`);
  }

  const now = new Date();
  const res = await fetch(`${CALENDAR_API}/freeBusy`, {
    method: 'POST',
    headers,
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
  return `${OWNER_EMAIL} free/busy readable, ${calendar.busy.length} busy block(s) in the next 24 hours, calendar time zone ${primary.timeZone}`;
});
