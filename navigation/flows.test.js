import assert from 'node:assert/strict';
import { test } from 'node:test';

import { checkSlotRules } from '../execution/booking_rules.js';
import { buildLeadRow } from '../execution/lead_row.js';
import { validateBookingRequest } from '../execution/validate_request.js';
import { bookCall } from './book_flow.js';
import { bookingIsOpen, readJsonBody } from './live.js';
import { listSlots } from './slots_flow.js';

const NOW = new Date('2026-10-05T10:00:00-04:00'); // a Monday
const BODY = {
  slot_start: '2026-10-07T14:00:00-04:00',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '416 555 0100',
  company_or_website: 'example.com',
  message: 'Private message',
};
const EVENT = { id: 'ev1', htmlLink: 'https://cal/ev1', meetLink: 'https://meet.google.com/xyz', created: '2026-10-05T14:00:00.000Z' };

// Stand-ins for the tools that talk to Google and Proton. Pure tools are the real ones.
function fakeTools(overrides = {}) {
  const calls = [];
  const record = (name, value) => async (...args) => {
    calls.push(name);
    return typeof value === 'function' ? value(...args) : value;
  };
  const tools = {
    validateBookingRequest,
    checkSlotRules,
    buildLeadRow,
    countUpcomingCallsFor: record('countUpcomingCallsFor', 0),
    countBookingsSince: record('countBookingsSince', 0),
    fetchBusy: record('fetchBusy', []),
    createBookingEvent: record('createBookingEvent', EVENT),
    findEarlierConflict: record('findEarlierConflict', null),
    deleteEvent: record('deleteEvent', undefined),
    sendBookingEmails: record('sendBookingEmails', {
      visitor_confirmation: { sent: true, message_id: '<v@x>' },
      owner_notification: { sent: true, message_id: '<o@x>' },
    }),
    appendLeadRow: record('appendLeadRow', { spreadsheet_id: 'sheet1', row_number: 2 }),
  };
  for (const [name, value] of Object.entries(overrides)) tools[name] = record(name, value);
  return { tools, calls };
}

const run = (body, overrides) => {
  const { tools, calls } = fakeTools(overrides);
  return bookCall(body, { now: NOW, env: {}, tools }).then((result) => ({ ...result, calls }));
};

test('a good request is booked and the browser gets only what it needs', async () => {
  const result = await run(BODY);
  assert.equal(result.httpStatus, 200);
  assert.deepEqual(result.response, {
    status: 'booked',
    slot: { start: '2026-10-07T14:00:00-04:00', end: '2026-10-07T14:30:00-04:00', timezone: 'America/Toronto' },
    meet_link: 'https://meet.google.com/xyz',
  });
  assert.deepEqual(result.payload, {
    status: 'booked',
    slot: result.response.slot,
    calendar_event: { id: 'ev1', html_link: 'https://cal/ev1', meet_link: 'https://meet.google.com/xyz', guest: 'ada@example.com' },
    emails: {
      visitor_confirmation: { sent: true, message_id: '<v@x>' },
      owner_notification: { sent: true, message_id: '<o@x>' },
    },
    lead_row: { spreadsheet_id: 'sheet1', row_number: 2 },
  });
  assert.deepEqual(result.calls, [
    'countUpcomingCallsFor',
    'countBookingsSince',
    'fetchBusy',
    'createBookingEvent',
    'findEarlierConflict',
    'sendBookingEmails',
    'appendLeadRow',
  ]);
  const logText = JSON.stringify(result.log);
  for (const secret of ['Ada', 'ada@example.com', '416', 'example.com', 'Private message']) {
    assert.ok(!logText.includes(secret), `log must not contain ${secret}`);
  }
  assert.equal(result.log.event_id, 'ev1');
  assert.equal(result.log.lead_row_number, 2);
});

test('invalid input and the bot trap are refused before any outside call', async () => {
  const bad = await run({ ...BODY, email: 'nope' });
  assert.equal(bad.httpStatus, 400);
  assert.equal(bad.response.reason, 'invalid_input');
  assert.equal(bad.response.message, 'Please enter a valid email address.');
  const bot = await run({ ...BODY, homepage: 'x' });
  assert.equal(bot.httpStatus, 429);
  assert.equal(bot.response.reason, 'spam');
  assert.deepEqual([...bad.calls, ...bot.calls], []);
});

test('slot rules are refused before any outside call', async () => {
  const early = await run({ ...BODY, slot_start: '2026-10-05T15:00:00-04:00' });
  assert.equal(early.response.reason, 'insufficient_notice');
  assert.equal(early.httpStatus, 422);
  const weekend = await run({ ...BODY, slot_start: '2026-10-10T10:00:00-04:00' });
  assert.equal(weekend.response.reason, 'outside_bookable_hours');
  assert.deepEqual([...early.calls, ...weekend.calls], []);
});

test('an email with an upcoming call is refused and nothing is created', async () => {
  const result = await run(BODY, { countUpcomingCallsFor: 1 });
  assert.equal(result.httpStatus, 409);
  assert.equal(result.response.reason, 'already_booked');
  assert.ok(!result.calls.includes('createBookingEvent'));
});

test('the hourly limit is refused as spam and nothing is created', async () => {
  const under = await run(BODY, { countBookingsSince: 9 });
  assert.equal(under.httpStatus, 200);
  const over = await run(BODY, { countBookingsSince: 10 });
  assert.equal(over.httpStatus, 429);
  assert.equal(over.response.reason, 'spam');
  assert.equal(over.log.limit, 'hourly');
  assert.ok(!over.calls.includes('createBookingEvent'));
});

test('a busy slot is refused and nothing is created', async () => {
  const result = await run(BODY, {
    fetchBusy: [{ start: new Date('2026-10-07T14:15:00-04:00'), end: new Date('2026-10-07T15:00:00-04:00') }],
  });
  assert.equal(result.httpStatus, 409);
  assert.equal(result.response.reason, 'slot_unavailable');
  assert.ok(!result.calls.includes('createBookingEvent'));
});

test('a busy block that only touches the slot does not block it', async () => {
  const result = await run(BODY, {
    fetchBusy: [{ start: new Date('2026-10-07T13:00:00-04:00'), end: new Date('2026-10-07T14:00:00-04:00') }],
  });
  assert.equal(result.httpStatus, 200);
});

test('a Google failure before the event exists answers 503 and creates nothing', async () => {
  const result = await run(BODY, {
    fetchBusy: () => {
      throw new Error('Google token refresh failed (400): invalid_grant');
    },
  });
  assert.equal(result.httpStatus, 503);
  assert.equal(result.response.status, 'unavailable');
  assert.match(result.log.error, /invalid_grant/);
  assert.ok(!result.calls.includes('createBookingEvent'));
});

test('an earlier booking found after insert removes ours and refuses', async () => {
  const deleted = [];
  const result = await run(BODY, {
    findEarlierConflict: { id: 'older' },
    deleteEvent: (id) => {
      deleted.push(id);
    },
  });
  assert.equal(result.httpStatus, 409);
  assert.equal(result.response.reason, 'slot_unavailable');
  assert.deepEqual(deleted, ['ev1']);
  assert.equal(result.log.removed_event_id, 'ev1');
  assert.ok(!result.calls.includes('sendBookingEmails'));
  assert.ok(!result.calls.includes('appendLeadRow'));
});

test('a failed conflict check keeps the booking and is logged', async () => {
  const result = await run(BODY, {
    findEarlierConflict: () => {
      throw new Error('500 backend');
    },
  });
  assert.equal(result.httpStatus, 200);
  assert.equal(result.log.conflict_check_error, '500 backend');
});

test('failed emails do not undo the booking', async () => {
  const result = await run(BODY, {
    sendBookingEmails: () => {
      throw new Error('Missing in .env: SMTP_TOKEN');
    },
  });
  assert.equal(result.httpStatus, 200);
  assert.deepEqual(result.payload.emails.visitor_confirmation, { sent: false, message_id: null });
  assert.equal(result.log.visitor_confirmation_sent, false);
  assert.match(result.log.owner_notification_error, /SMTP_TOKEN/);
});

test('the lead row is tried twice; a second success clears the error', async () => {
  let attempts = 0;
  const flaky = await run(BODY, {
    appendLeadRow: () => {
      attempts += 1;
      if (attempts === 1) throw new Error('503');
      return { spreadsheet_id: 'sheet1', row_number: 3 };
    },
  });
  assert.equal(flaky.payload.lead_row.row_number, 3);
  assert.equal(flaky.log.lead_row_error, undefined);

  const broken = await run(BODY, {
    appendLeadRow: () => {
      throw new Error('404 sheet not found');
    },
  });
  assert.equal(broken.httpStatus, 200);
  assert.equal(broken.payload.lead_row, null);
  assert.equal(broken.log.lead_row_error, '404 sheet not found');
  assert.equal(broken.calls.filter((name) => name === 'appendLeadRow').length, 2);
});

test('listSlots formats free slots and skips the calendar when there are none', async () => {
  const start = new Date('2026-10-06T13:00:00Z');
  const tools = {
    buildSlotGrid: () => [{ start, end: new Date(start.getTime() + 1_800_000) }],
    fetchBusy: async () => [],
    freeSlots: (slots) => slots,
  };
  assert.deepEqual(await listSlots({ now: NOW, env: {}, tools }), {
    timezone: 'America/Toronto',
    slot_minutes: 30,
    slots: ['2026-10-06T09:00:00-04:00'],
  });
  let asked = false;
  const empty = await listSlots({
    now: NOW,
    env: {},
    tools: { ...tools, buildSlotGrid: () => [], fetchBusy: async () => { asked = true; return []; } },
  });
  assert.deepEqual(empty.slots, []);
  assert.equal(asked, false);
});

test('bookingIsOpen: previews always, production only when switched on', () => {
  assert.equal(bookingIsOpen({ VERCEL_ENV: 'preview' }), true);
  assert.equal(bookingIsOpen({}), true, 'local runs');
  assert.equal(bookingIsOpen({ VERCEL_ENV: 'production' }), false);
  assert.equal(bookingIsOpen({ VERCEL_ENV: 'production', BOOKING_LIVE: 'yes' }), false);
  assert.equal(bookingIsOpen({ VERCEL_ENV: 'production', BOOKING_LIVE: 'true' }), true);
});

test('readJsonBody accepts small JSON and nothing else', async () => {
  const req = (text) => new Request('https://x/api/book', { method: 'POST', body: text });
  assert.deepEqual(await readJsonBody(req('{"a":1}')), { a: 1 });
  assert.equal(await readJsonBody(req('not json')), null);
  assert.equal(await readJsonBody(req(JSON.stringify({ a: 'x'.repeat(11_000) }))), null);
});
