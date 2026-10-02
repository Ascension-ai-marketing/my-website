// Local preview of the site. Serves public/, lists real slots (read only), and DRY-RUNS bookings:
// validation and slot rules are real, but no event, email or row is ever created.
// Usage: npm run dev   (DEV_BOOKING=off to see the "booking opens soon" state;
//                       DEV_BOOK_RESULT=slot_unavailable or unavailable to see those answers)
// SOP: architecture/site.md
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { listSlots } from '../navigation/slots_flow.js';
import { HTTP_STATUS } from '../navigation/book_flow.js';
import { REFUSAL_MESSAGES, RULES, checkSlotRules, slotEnd } from './booking_rules.js';
import { toZonedIso } from './lib/time.js';
import { validateBookingRequest } from './validate_request.js';

const PORT = Number(process.env.PORT ?? 4321);
const ROOT = fileURLToPath(new URL('../public/', import.meta.url));
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function readBody(req, maxBytes = 10_240) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) return null;
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return null;
  }
}

async function dryRunBook(req, res) {
  const now = new Date();
  const checked = validateBookingRequest(await readBody(req));
  const refuse = (reason, message = REFUSAL_MESSAGES[reason]) =>
    json(res, HTTP_STATUS[reason], { status: 'refused', reason, message });
  if (!checked.ok) return refuse(checked.reason, checked.message ?? REFUSAL_MESSAGES[checked.reason]);
  const problem = checkSlotRules(checked.booking.slotStart, now);
  if (problem) return refuse(problem);

  await new Promise((resolve) => setTimeout(resolve, 1200)); // feel of a real booking
  const forced = process.env.DEV_BOOK_RESULT;
  if (forced === 'unavailable') return json(res, 503, { status: 'unavailable', message: 'Booking is temporarily unavailable.' });
  if (forced && REFUSAL_MESSAGES[forced]) return refuse(forced);

  console.log('DRY RUN booking accepted: no event, email or row was created');
  const start = checked.booking.slotStart;
  return json(res, 200, {
    status: 'booked',
    slot: {
      start: toZonedIso(start, RULES.timezone),
      end: toZonedIso(slotEnd(start), RULES.timezone),
      timezone: RULES.timezone,
    },
    meet_link: 'https://meet.google.com/dry-run-only',
  });
}

async function serveStatic(req, res) {
  let path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (path === '/') path = '/index.html';
  if (!extname(path)) path += '.html'; // like Vercel's cleanUrls
  const file = normalize(join(ROOT, path));
  if (!file.startsWith(ROOT.endsWith(sep) ? ROOT : ROOT + sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
  }
}

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  try {
    if (pathname === '/api/slots') {
      if (process.env.DEV_BOOKING === 'off') return json(res, 404, { status: 'not_found' });
      return json(res, 200, await listSlots());
    }
    if (pathname === '/api/book') {
      if (process.env.DEV_BOOKING === 'off') return json(res, 404, { status: 'not_found' });
      if (req.method !== 'POST') return json(res, 405, { status: 'error', message: 'Use POST.' });
      return await dryRunBook(req, res);
    }
    if (pathname.startsWith('/_vercel/')) return json(res, 404, { status: 'not_found' });
    return await serveStatic(req, res);
  } catch (error) {
    console.error('dev server error:', error.message);
    return json(res, 503, { status: 'unavailable' });
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Local preview on http://localhost:${PORT} (bookings are dry runs)`);
});
