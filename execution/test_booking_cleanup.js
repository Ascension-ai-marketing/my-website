// Finds and removes the bookings made by the live end-to-end test. Never touches a real booking.
// Usage: npm run test:find -- <email>     npm run test:cleanup -- <email>
// SOP: architecture/live-test.md
import { BOOKING_SOURCE, deleteEvent, eventSummary } from './calendar_event.js';
import { requireEnv } from './lib/env.js';
import { CALENDAR_API, SHEETS_API, googleRequest } from './lib/google_api.js';
import { SCOPES } from './lib/google_auth.js';
import { LEAD_SHEET_COLUMNS, LEAD_SHEET_TAB } from './lib/lead_sheet.js';
import { runProbe } from './lib/probe.js';

export const TEST_NAME = 'Live Test (delete me)';
// The title before Phase S, kept so older test events are still found.
const TEST_TITLES = [eventSummary(TEST_NAME), `Call with ${TEST_NAME}`];

async function findTestEvents(email, env) {
  const { GOOGLE_CALENDAR_ID } = requireEnv(['GOOGLE_CALENDAR_ID'], env);
  const url = new URL(`${CALENDAR_API}/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events`);
  url.search = new URLSearchParams({
    timeMin: new Date().toISOString(),
    privateExtendedProperty: `source=${BOOKING_SOURCE}`,
    q: email,
    singleEvents: 'true',
    maxResults: '50',
    fields: 'items(id,status,summary,start,hangoutLink,attendees(email))',
  }).toString();
  const body = await googleRequest(url, { scopes: [SCOPES.calendarEvents], env });
  return (body.items ?? []).filter(
    (event) =>
      event.status !== 'cancelled' &&
      TEST_TITLES.includes(event.summary) &&
      (event.attendees ?? []).some((guest) => guest.email?.toLowerCase() === email),
  );
}

async function findTestRows(email, env) {
  const { LEAD_SHEET_ID } = requireEnv(['LEAD_SHEET_ID'], env);
  const range = encodeURIComponent(`${LEAD_SHEET_TAB}!A1:J`);
  const body = await googleRequest(`${SHEETS_API}/${encodeURIComponent(LEAD_SHEET_ID)}/values/${range}`, {
    scopes: [SCOPES.sheets],
    env,
  });
  const nameCol = LEAD_SHEET_COLUMNS.indexOf('name');
  const emailCol = LEAD_SHEET_COLUMNS.indexOf('email');
  return (body.values ?? [])
    .map((values, index) => ({ rowNumber: index + 1, values }))
    .filter(({ rowNumber, values }) => rowNumber > 1 && values[emailCol]?.toLowerCase() === email && values[nameCol] === TEST_NAME);
}

async function leadsSheetId(env) {
  const { LEAD_SHEET_ID } = requireEnv(['LEAD_SHEET_ID'], env);
  const body = await googleRequest(
    `${SHEETS_API}/${encodeURIComponent(LEAD_SHEET_ID)}?fields=sheets.properties(sheetId,title)`,
    { scopes: [SCOPES.sheets], env },
  );
  const tab = body.sheets.find((sheet) => sheet.properties.title === LEAD_SHEET_TAB);
  if (!tab) throw new Error(`no tab named ${LEAD_SHEET_TAB}`);
  return tab.properties.sheetId;
}

const [mode, rawEmail] = process.argv.slice(2);
const email = rawEmail?.toLowerCase();

await runProbe(`test booking ${mode}`, async () => {
  if (!['find', 'cleanup'].includes(mode) || !email) throw new Error('usage: <find|cleanup> <email>');
  const env = process.env;
  const events = await findTestEvents(email, env);
  const rows = await findTestRows(email, env);
  const summary =
    `${events.length} test event(s) [${events.map((e) => `${e.id} ${e.start?.dateTime} meet=${e.hangoutLink ?? 'none'}`).join('; ')}], ` +
    `${rows.length} test row(s) [${rows.map((r) => r.rowNumber).join(', ')}]`;
  if (mode === 'find') return summary;

  for (const event of events) await deleteEvent(event.id, { env, notifyGuests: false });
  if (rows.length > 0) {
    const { LEAD_SHEET_ID } = requireEnv(['LEAD_SHEET_ID'], env);
    const sheetId = await leadsSheetId(env);
    const requests = rows
      .map((row) => row.rowNumber)
      .sort((a, b) => b - a)
      .map((rowNumber) => ({
        deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: rowNumber - 1, endIndex: rowNumber } },
      }));
    await googleRequest(`${SHEETS_API}/${encodeURIComponent(LEAD_SHEET_ID)}:batchUpdate`, {
      method: 'POST',
      body: { requests },
      scopes: [SCOPES.sheets],
      env,
    });
  }
  return `removed ${summary}`;
});
