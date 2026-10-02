// Probe: the deployed site serves the page and the health function, and nothing private.
// Usage: npm run probe:vercel -- https://my-website-blue-ten-62.vercel.app
// SOP: architecture/link-probes.md
import { runProbe } from './lib/probe.js';

const PRIVATE_PATHS = [
  '/CLAUDE.md',
  '/memory/task_plan.md',
  '/architecture/deploy.md',
  '/execution/health.js',
  '/package.json',
  '/vercel.json',
  '/.env',
];

await runProbe('vercel', async () => {
  const base = process.argv[2];
  if (!base) throw new Error('pass the base URL as the first argument');

  const page = await fetch(new URL('/', base));
  if (page.status !== 200) throw new Error(`/ returned ${page.status}`);

  const healthRes = await fetch(new URL('/api/health', base));
  if (healthRes.status !== 200) throw new Error(`/api/health returned ${healthRes.status}`);
  const health = await healthRes.json();
  if (health.ok !== true) throw new Error('/api/health did not return ok: true');

  for (const path of PRIVATE_PATHS) {
    const res = await fetch(new URL(path, base));
    if (res.status !== 404) throw new Error(`${path} returned ${res.status}, expected 404`);
  }
  return `page 200, /api/health ok, ${PRIVATE_PATHS.length} private paths 404`;
});
