// One lead-sheet row per booking, in the Data Schema's column order. SOP: architecture/lead-row.md
import { RULES } from './booking_rules.js';
import { requireEnv } from './lib/env.js';
import { SHEETS_API, googleRequest } from './lib/google_api.js';
import { SCOPES } from './lib/google_auth.js';
import { LEAD_SHEET_COLUMNS, LEAD_SHEET_TAB } from './lib/lead_sheet.js';
import { toZonedIso } from './lib/time.js';

export function buildLeadRow(booking, event, bookedAt, timeZone = RULES.timezone) {
  const row = {
    booked_at: toZonedIso(bookedAt, timeZone),
    slot_start: toZonedIso(booking.slotStart, timeZone),
    slot_end: toZonedIso(booking.slotEnd, timeZone),
    name: booking.name,
    email: booking.email,
    phone: booking.phone,
    company_or_website: booking.company_or_website,
    message: booking.message,
    event_id: event.id,
    meet_link: event.meetLink ?? '',
  };
  return LEAD_SHEET_COLUMNS.map((column) => row[column]);
}

// "Leads!A7:J7" -> 7
export function rowNumberFromRange(range) {
  const match = /![A-Z]+(\d+)/.exec(range ?? '');
  return match ? Number(match[1]) : null;
}

// Appends the row as plain text (RAW, so nothing typed by a visitor becomes a formula).
export async function appendLeadRow(row, { env = process.env } = {}) {
  const { LEAD_SHEET_ID } = requireEnv(['LEAD_SHEET_ID'], env);
  const range = encodeURIComponent(`${LEAD_SHEET_TAB}!A:J`);
  const body = await googleRequest(
    `${SHEETS_API}/${encodeURIComponent(LEAD_SHEET_ID)}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { method: 'POST', body: { values: [row] }, scopes: [SCOPES.sheets], env },
  );
  return { spreadsheet_id: LEAD_SHEET_ID, row_number: rowNumberFromRange(body.updates?.updatedRange) };
}
