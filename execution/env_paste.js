// Saves the clipboard into .env as NAME=value without showing it.
// Usage: npm run env:paste -- SMTP_TOKEN
// SOP: architecture/link-probes.md
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

import { secretValueProblem, upsertEnvValue } from './lib/env_file.js';
import { runProbe } from './lib/probe.js';

const ENV_PATH = '.env';
const ALLOWED_NAMES = ['SMTP_TOKEN', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];

await runProbe('env paste', async () => {
  const name = process.argv[2];
  if (!ALLOWED_NAMES.includes(name)) {
    throw new Error(`name the value to save, one of: ${ALLOWED_NAMES.join(', ')}`);
  }
  const value = execFileSync('pbpaste', { encoding: 'utf8' }).trim();
  const problem = secretValueProblem(value);
  if (problem) throw new Error(`${problem}. Nothing was saved`);

  const envText = await readFile(ENV_PATH, 'utf8');
  await writeFile(ENV_PATH, upsertEnvValue(envText, name, value));
  return `${name} saved to .env (${value.length} characters)`;
});
