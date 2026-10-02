// One read-only check per external service. Each returns a one-line description or throws.
// Used by the local probes and by /api/link-check. SOP: architecture/link-probes.md
import { requireEnv } from './env.js';
import { SCOPES, getAccessToken, googleJson } from './google_auth.js';
import { createMailTransport } from './smtp.js';

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

export async function checkCalendar(env = process.env) {
  const { GOOGLE_CALENDAR_ID, OWNER_EMAIL } = requireEnv(['GOOGLE_CALENDAR_ID', 'OWNER_EMAIL'], env);
  const token = await getAccessToken([SCOPES.calendarFreeBusy, SCOPES.calendarEvents], env);
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
}

export async function checkSheets(env = process.env) {
  const { LEAD_SHEET_ID } = requireEnv(['LEAD_SHEET_ID'], env);
  const token = await getAccessToken([SCOPES.sheets], env);

  const url = new URL(`${SHEETS_API}/${encodeURIComponent(LEAD_SHEET_ID)}`);
  url.searchParams.set('fields', 'properties.title,sheets.properties.title');
  const body = await googleJson(await fetch(url, { headers: { authorization: `Bearer ${token}` } }));

  const tabs = body.sheets.map((sheet) => sheet.properties.title).join(', ');
  return `sheet "${body.properties.title}" readable, tabs: ${tabs}`;
}

// Connects, upgrades to TLS and signs in. Sends nothing.
export async function checkEmailSignIn(env = process.env) {
  const transport = createMailTransport(env);
  try {
    await transport.verify();
  } finally {
    transport.close();
  }
  return `${env.SMTP_USER} signed in to ${env.SMTP_HOST}:${env.SMTP_PORT}`;
}

// Runs every check and reports each as GREEN or RED. Never throws.
export async function runLinkChecks(env = process.env) {
  const checks = { calendar: checkCalendar, sheets: checkSheets, email: checkEmailSignIn };
  const entries = await Promise.all(
    Object.entries(checks).map(async ([name, check]) => {
      try {
        return [name, { status: 'GREEN', detail: await check(env) }];
      } catch (error) {
        return [name, { status: 'RED', detail: error.message }];
      }
    }),
  );
  const results = Object.fromEntries(entries);
  return { ok: entries.every(([, result]) => result.status === 'GREEN'), results };
}
