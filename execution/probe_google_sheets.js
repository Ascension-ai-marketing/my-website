// Probe: read the lead sheet's title. Read only.
// SOP: architecture/link-probes.md
import { SCOPES, getAccessToken, requireEnv } from './lib/google_auth.js';
import { googleJson, runProbe } from './lib/probe.js';

await runProbe('google sheets', async () => {
  const { LEAD_SHEET_ID } = requireEnv(['LEAD_SHEET_ID']);
  const token = await getAccessToken([SCOPES.sheets]);

  const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(LEAD_SHEET_ID)}`);
  url.searchParams.set('fields', 'properties.title,sheets.properties.title');
  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  const body = await googleJson(res);

  const tabs = body.sheets.map((sheet) => sheet.properties.title).join(', ');
  return `sheet "${body.properties.title}" readable, tabs: ${tabs}`;
});
