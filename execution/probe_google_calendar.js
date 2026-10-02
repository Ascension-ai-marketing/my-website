// Probe: Google Calendar free/busy for the next 24 hours, on the right account. Read only.
// SOP: architecture/link-probes.md
import { checkCalendar } from './lib/link_checks.js';
import { runProbe } from './lib/probe.js';

await runProbe('google calendar', () => checkCalendar());
