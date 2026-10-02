// One authenticated JSON request to a Google API. SOP: architecture/link-probes.md
import { getAccessToken, googleJson } from './google_auth.js';

export const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
export const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

export async function googleRequest(url, { method = 'GET', body, scopes = [], env = process.env } = {}) {
  const token = await getAccessToken(scopes, env);
  const res = await fetch(url, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return null;
  return googleJson(res);
}
