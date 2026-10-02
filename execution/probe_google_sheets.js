// Probe: read the lead sheet's title. Read only.
// SOP: architecture/link-probes.md
import { checkSheets } from './lib/link_checks.js';
import { runProbe } from './lib/probe.js';

await runProbe('google sheets', () => checkSheets());
