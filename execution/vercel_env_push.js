// Copies the values the deployed functions need from .env into Vercel (Production and Preview).
// Prints names only. Usage: npm run vercel:env            (all names)
//                           npm run vercel:env -- NAME…   (only these)
// SOP: architecture/link-probes.md
import { execFileSync } from 'node:child_process';

import { requireEnv } from './lib/env.js';
import { runProbe } from './lib/probe.js';

const SECRET_NAMES = ['GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN', 'SMTP_TOKEN'];
const CONFIG_NAMES = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CALENDAR_ID',
  'OWNER_EMAIL',
  'LEAD_SHEET_ID',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
];
const ALL_NAMES = [...CONFIG_NAMES, ...SECRET_NAMES];

await runProbe('vercel env', async () => {
  const requested = process.argv.slice(2);
  const unknown = requested.filter((name) => !ALL_NAMES.includes(name));
  if (unknown.length > 0) throw new Error(`not a name this tool manages: ${unknown.join(', ')}`);

  const names = requested.length > 0 ? requested : ALL_NAMES;
  const values = requireEnv(names);

  for (const name of names) {
    const kind = SECRET_NAMES.includes(name) ? '--sensitive' : '--no-sensitive';
    try {
      // The value goes in on stdin so it never appears in a command line.
      execFileSync('vercel', ['env', 'add', name, 'production,preview', '--force', '--yes', kind], {
        input: values[name],
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (error) {
      const reason = (error.stderr?.toString() || error.message).trim().split('\n').pop();
      throw new Error(`could not set ${name}: ${reason}`);
    }
  }
  return `set in Vercel for production and preview: ${names.join(', ')}`;
});
