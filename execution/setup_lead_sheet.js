// One-time setup: create the lead sheet as the signed-in owner and store its id in .env.
// SOP: architecture/link-probes.md
import { readFile, writeFile } from 'node:fs/promises';

import { upsertEnvValue } from './lib/env_file.js';
import { SCOPES, getAccessToken, googleJson } from './lib/google_auth.js';
import { buildLeadSheetRequest, LEAD_SHEET_TITLE } from './lib/lead_sheet.js';
import { runProbe } from './lib/probe.js';

const ENV_PATH = '.env';

await runProbe('lead sheet setup', async () => {
  if (process.env.LEAD_SHEET_ID) {
    throw new Error('LEAD_SHEET_ID is already set in .env; not creating a second sheet');
  }
  const token = await getAccessToken([SCOPES.sheets]);

  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets?fields=spreadsheetId,spreadsheetUrl', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(buildLeadSheetRequest()),
  });
  const sheet = await googleJson(res);

  const envText = await readFile(ENV_PATH, 'utf8');
  await writeFile(ENV_PATH, upsertEnvValue(envText, 'LEAD_SHEET_ID', sheet.spreadsheetId));
  return `created "${LEAD_SHEET_TITLE}" and wrote LEAD_SHEET_ID to .env: ${sheet.spreadsheetUrl}`;
});
