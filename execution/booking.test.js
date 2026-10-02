import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

import { freeSlots, overlaps } from './availability.js';
import { buildOwnerEmail, buildVisitorEmail, formatWhen, sendBookingEmails } from './booking_emails.js';
import { RULES, buildSlotGrid, checkSlotRules, slotEnd } from './booking_rules.js';
import { buildEventBody, createBookingEvent, earlierConflict, meetLinkOf } from './calendar_event.js';
import { buildLeadRow, rowNumberFromRange } from './lead_row.js';
import { clearTokenCache } from './lib/google_auth.js';
import { parseIsoWithOffset, toZonedIso, zonedToUtc } from './lib/time.js';
import { countTimestampsSince, countUpcomingGuestEvents } from './rate_limits.js';
import { validateBookingRequest } from './validate_request.js';

const TZ = 'America/Toronto';
const at = (iso) => new Date(iso);

// ---------- time ----------

test('zonedToUtc and toZonedIso follow Toronto daylight saving', () => {
  assert.equal(zonedToUtc({ year: 2026, month: 10, day: 6, hour: 9, minute: 0 }, TZ).toISOString(), '2026-10-06T13:00:00.000Z');
  assert.equal(zonedToUtc({ year: 2026, month: 11, day: 2, hour: 9, minute: 0 }, TZ).toISOString(), '2026-11-02T14:00:00.000Z');
  assert.equal(zonedToUtc({ year: 2026, month: 3, day: 9, hour: 9, minute: 0 }, TZ).toISOString(), '2026-03-09T13:00:00.000Z');
  assert.equal(toZonedIso(at('2026-10-06T13:00:00Z'), TZ), '2026-10-06T09:00:00-04:00');
  assert.equal(toZonedIso(at('2026-11-02T14:00:00Z'), TZ), '2026-11-02T09:00:00-05:00');
});

test('parseIsoWithOffset accepts stated offsets and rejects everything else', () => {
  assert.equal(parseIsoWithOffset('2026-10-06T14:00:00-04:00').toISOString(), '2026-10-06T18:00:00.000Z');
  assert.equal(parseIsoWithOffset('2026-10-06T18:00:00Z').toISOString(), '2026-10-06T18:00:00.000Z');
  assert.equal(parseIsoWithOffset('2026-10-06T14:00-04:00').toISOString(), '2026-10-06T18:00:00.000Z');
  assert.equal(parseIsoWithOffset('2026-10-06T14:00:00'), null, 'no offset');
  assert.equal(parseIsoWithOffset('2026-02-30T10:00:00-05:00'), null, 'February 30');
  assert.equal(parseIsoWithOffset('2026-10-06T25:00:00-04:00'), null, 'hour 25');
  assert.equal(parseIsoWithOffset('tomorrow'), null);
  assert.equal(parseIsoWithOffset(1759766400000), null);
});

// ---------- booking rules ----------

test('slot grid across the November 1 time change', () => {
  const now = at('2026-10-28T12:00:00-04:00'); // a Wednesday
  const slots = buildSlotGrid(now).map((slot) => toZonedIso(slot.start, TZ));
  assert.equal(slots[0], '2026-10-29T12:00:00-04:00', 'first slot is exactly 24 hours out');
  assert.equal(slots.at(-1), '2026-11-11T10:30:00-05:00', 'last slot starts before now + 14 days');
  assert.ok(slots.includes('2026-10-30T16:30:00-04:00'));
  assert.ok(slots.includes('2026-11-02T09:00:00-05:00'), 'after the change, 9:00 is -05:00');
  assert.ok(!slots.some((s) => s.startsWith('2026-10-31') || s.startsWith('2026-11-01')), 'no weekend slots');
  assert.ok(!slots.some((s) => s.includes('T17:00')), 'no slot starts at 17:00');
  assert.equal(slots.length, 10 + 16 + 5 * 16 + 2 * 16 + 4);
  assert.ok(buildSlotGrid(now).every((slot) => slot.end - slot.start === 30 * 60_000));
});

test('checkSlotRules at the edges', () => {
  const now = at('2026-10-05T10:00:00-04:00'); // a Monday
  const check = (iso) => checkSlotRules(at(iso), now);
  assert.equal(check('2026-10-06T10:00:00-04:00'), null, 'exactly 24 hours is allowed');
  assert.equal(check('2026-10-06T09:30:00-04:00'), 'insufficient_notice');
  assert.equal(check('2026-10-07T16:30:00-04:00'), null, '16:30 is the last start');
  assert.equal(check('2026-10-07T17:00:00-04:00'), 'outside_bookable_hours');
  assert.equal(check('2026-10-07T08:30:00-04:00'), 'outside_bookable_hours');
  assert.equal(check('2026-10-07T09:15:00-04:00'), 'outside_bookable_hours', 'off the half-hour grid');
  assert.equal(check('2026-10-07T10:00:30-04:00'), 'outside_bookable_hours', 'seconds must be zero');
  assert.equal(check('2026-10-10T10:00:00-04:00'), 'outside_bookable_hours', 'Saturday');
  assert.equal(check('2026-10-19T09:30:00-04:00'), null, 'just inside 14 days');
  assert.equal(check('2026-10-19T10:00:00-04:00'), 'beyond_booking_window', 'exactly 14 days is outside');
  assert.equal(check('2026-10-07T14:00:00Z'), null, 'any offset works if the Toronto time is valid (10:00 EDT)');
});

test('slotEnd is 30 minutes later', () => {
  assert.equal(slotEnd(at('2026-10-06T13:00:00Z')).toISOString(), '2026-10-06T13:30:00.000Z');
});

// ---------- availability ----------

test('overlaps treats touching edges as free', () => {
  const slot = { start: at('2026-10-06T13:00:00Z'), end: at('2026-10-06T13:30:00Z') };
  assert.equal(overlaps(slot, { start: at('2026-10-06T12:00:00Z'), end: at('2026-10-06T13:00:00Z') }), false);
  assert.equal(overlaps(slot, { start: at('2026-10-06T13:30:00Z'), end: at('2026-10-06T14:00:00Z') }), false);
  assert.equal(overlaps(slot, { start: at('2026-10-06T13:29:00Z'), end: at('2026-10-06T14:00:00Z') }), true);
  assert.equal(overlaps(slot, { start: at('2026-10-06T12:00:00Z'), end: at('2026-10-06T15:00:00Z') }), true);
});

test('freeSlots drops overlapping slots only', () => {
  const s = (h) => ({ start: at(`2026-10-06T${h}:00:00Z`), end: at(`2026-10-06T${h}:30:00Z`) });
  const free = freeSlots([s(13), s(14), s(15)], [{ start: at('2026-10-06T14:15:00Z'), end: at('2026-10-06T14:45:00Z') }]);
  assert.deepEqual(free.map((slot) => slot.start.toISOString()), ['2026-10-06T13:00:00.000Z', '2026-10-06T15:00:00.000Z']);
});

// ---------- validation ----------

const validBody = {
  slot_start: '2026-10-06T14:00:00-04:00',
  name: '  Ada Lovelace ',
  email: 'Ada@Example.COM',
  phone: '+1 (416) 555-0100',
  company_or_website: 'example.com',
  message: 'Line one\r\nLine two',
};

test('validateBookingRequest cleans a good request', () => {
  const result = validateBookingRequest(validBody);
  assert.equal(result.ok, true);
  assert.equal(result.booking.name, 'Ada Lovelace');
  assert.equal(result.booking.email, 'ada@example.com');
  assert.equal(result.booking.message, 'Line one\nLine two');
  assert.equal(result.booking.slotStart.toISOString(), '2026-10-06T18:00:00.000Z');
});

test('validateBookingRequest accepts the minimum', () => {
  const result = validateBookingRequest({ slot_start: validBody.slot_start, name: 'A', email: 'a@b.co' });
  assert.equal(result.ok, true);
  assert.deepEqual([result.booking.phone, result.booking.company_or_website, result.booking.message], ['', '', '']);
});

test('validateBookingRequest refuses bad input', () => {
  const refuse = (changes) => validateBookingRequest({ ...validBody, ...changes });
  assert.equal(refuse({ homepage: 'http://spam.example' }).reason, 'spam');
  assert.equal(refuse({ homepage: '' }).ok, true, 'an empty trap is fine');
  for (const changes of [
    { slot_start: '2026-10-06T14:00:00' },
    { slot_start: undefined },
    { name: '' },
    { name: 'x'.repeat(101) },
    { name: 'Ada\nBcc: victim@example.com' },
    { name: 42 },
    { email: 'not-an-email' },
    { email: 'a@b' },
    { email: `${'x'.repeat(250)}@b.co` },
    { phone: 'call me maybe' },
    { phone: '1'.repeat(41) },
    { company_or_website: 'x'.repeat(201) },
    { message: 'x'.repeat(1001) },
    { message: 'bell\u0007' },
  ]) {
    const result = refuse(changes);
    assert.equal(result.ok, false, JSON.stringify(changes));
    assert.equal(result.reason, 'invalid_input', JSON.stringify(changes));
    assert.ok(result.message, 'a message for the visitor');
  }
  for (const body of [null, 'text', [], 7]) assert.equal(validateBookingRequest(body).reason, 'invalid_input');
});

// ---------- rate limits ----------

test('countUpcomingGuestEvents counts only upcoming, active events with this guest', () => {
  const now = at('2026-10-05T12:00:00Z');
  const ev = (start, emails, status = 'confirmed') => ({ status, start: { dateTime: start }, attendees: emails.map((email) => ({ email })) });
  const items = [
    ev('2026-10-06T14:00:00Z', ['ADA@example.com']),
    ev('2026-10-07T14:00:00Z', ['ada@example.com'], 'cancelled'),
    ev('2026-10-05T11:00:00Z', ['ada@example.com']),
    ev('2026-10-08T14:00:00Z', ['someone@example.com']),
    { status: 'confirmed', start: { dateTime: '2026-10-09T14:00:00Z' } },
  ];
  assert.equal(countUpcomingGuestEvents(items, 'ada@example.com', now), 1);
});

test('countTimestampsSince ignores text that is not a time', () => {
  const since = at('2026-10-05T11:00:00Z');
  assert.equal(
    countTimestampsSince(['2026-10-05T07:30:00-04:00', '2026-10-05T06:59:00-04:00', 'booked_at', '', '2026-10-05T11:00:00Z'], since),
    2,
  );
});

// ---------- calendar event ----------

const booking = {
  slotStart: at('2026-10-06T18:00:00Z'),
  slotEnd: at('2026-10-06T18:30:00Z'),
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '',
  company_or_website: 'example.com',
  message: 'Hello',
};

test('buildEventBody invites the visitor, asks for a Meet link and marks the event as a booking', () => {
  const body = buildEventBody(booking, 'req-1');
  assert.equal(body.summary, 'Call with Ada Lovelace');
  assert.deepEqual(body.start, { dateTime: '2026-10-06T14:00:00-04:00', timeZone: TZ });
  assert.deepEqual(body.end, { dateTime: '2026-10-06T14:30:00-04:00', timeZone: TZ });
  assert.deepEqual(body.attendees, [{ email: 'ada@example.com', displayName: 'Ada Lovelace' }]);
  assert.deepEqual(body.conferenceData.createRequest, { requestId: 'req-1', conferenceSolutionKey: { type: 'hangoutsMeet' } });
  assert.deepEqual(body.extendedProperties, { private: { source: 'my-website' } });
  assert.match(body.description, /Phone: -/);
  assert.match(body.description, /Company or website: example\.com/);
});

test('meetLinkOf reads either field', () => {
  assert.equal(meetLinkOf({ hangoutLink: 'https://meet.google.com/a' }), 'https://meet.google.com/a');
  assert.equal(
    meetLinkOf({ conferenceData: { entryPoints: [{ entryPointType: 'phone', uri: 'tel:1' }, { entryPointType: 'video', uri: 'https://meet.google.com/b' }] } }),
    'https://meet.google.com/b',
  );
  assert.equal(meetLinkOf({}), null);
});

test('earlierConflict keeps the event created first', () => {
  const ours = { id: 'm', created: '2026-10-05T12:00:00.000Z' };
  const other = (id, created, extra = {}) => ({ id, created, status: 'confirmed', ...extra });
  assert.equal(earlierConflict([other('m', ours.created)], ours), null, 'ignores itself');
  assert.equal(earlierConflict([other('a', '2026-10-05T12:00:01.000Z')], ours), null, 'a later event is not our problem');
  assert.equal(earlierConflict([other('a', '2026-10-05T11:59:59.000Z', { status: 'cancelled' })], ours), null);
  assert.equal(earlierConflict([other('a', '2026-10-05T11:59:59.000Z', { transparency: 'transparent' })], ours), null);
  assert.equal(earlierConflict([other('a', '2026-10-05T11:59:59.000Z')], ours).id, 'a');
  assert.equal(earlierConflict([other('a', ours.created)], ours).id, 'a', 'same time: lower id wins');
  assert.equal(earlierConflict([other('z', ours.created)], ours), null, 'same time: higher id loses');
});

test('createBookingEvent waits for a pending Meet link', async () => {
  clearTokenCache();
  const env = {
    GOOGLE_CLIENT_ID: 'id',
    GOOGLE_CLIENT_SECRET: 'secret',
    GOOGLE_REFRESH_TOKEN: 'refresh',
    GOOGLE_CALENDAR_ID: 'primary',
  };
  const calls = [];
  const fetchMock = mock.method(globalThis, 'fetch', async (url, init = {}) => {
    calls.push(`${init.method ?? 'GET'} ${String(url).split('?')[0]}`);
    if (String(url).startsWith('https://oauth2.googleapis.com/token')) {
      return Response.json({ access_token: 'tok', expires_in: 3600, scope: 'https://www.googleapis.com/auth/calendar.events' });
    }
    if (init.method === 'POST') {
      assert.match(String(url), /conferenceDataVersion=1&sendUpdates=all/);
      return Response.json({ id: 'ev1', htmlLink: 'https://cal/ev1', created: 'c', conferenceData: { createRequest: { status: { statusCode: 'pending' } } } });
    }
    return Response.json({ id: 'ev1', htmlLink: 'https://cal/ev1', created: 'c', hangoutLink: 'https://meet.google.com/xyz' });
  });
  try {
    const event = await createBookingEvent(booking, { env, wait: async () => {} });
    assert.deepEqual(event, { id: 'ev1', htmlLink: 'https://cal/ev1', meetLink: 'https://meet.google.com/xyz', created: 'c' });
    assert.deepEqual(calls.slice(1), [
      'POST https://www.googleapis.com/calendar/v3/calendars/primary/events',
      'GET https://www.googleapis.com/calendar/v3/calendars/primary/events/ev1',
    ]);
  } finally {
    fetchMock.mock.restore();
    clearTokenCache();
  }
});

// ---------- emails ----------

test('formatWhen writes Toronto time', () => {
  const text = formatWhen(at('2026-10-06T18:00:00Z'));
  assert.match(text, /Tuesday, October 6, 2026/);
  assert.match(text, /2:00/);
});

test('visitor and owner emails go to the right people with the right reply-to', () => {
  const event = { meetLink: 'https://meet.google.com/xyz', htmlLink: 'https://cal/ev1' };
  const visitor = buildVisitorEmail(booking, event, 'owner@example.com');
  assert.equal(visitor.to, 'ada@example.com');
  assert.equal(visitor.replyTo, 'owner@example.com');
  assert.match(visitor.subject, /^Your call is booked: Tuesday, October 6, 2026/);
  assert.match(visitor.text, /https:\/\/meet\.google\.com\/xyz/);
  assert.match(visitor.text, /calendar invitation from Google/);

  const owner = buildOwnerEmail(booking, event, 'owner@example.com');
  assert.equal(owner.to, 'owner@example.com');
  assert.equal(owner.replyTo, 'ada@example.com');
  assert.match(owner.subject, /^New booking: Ada Lovelace, /);
  assert.match(owner.text, /Calendar event: https:\/\/cal\/ev1/);

  assert.match(buildVisitorEmail(booking, { meetLink: null }, 'o@e.co').text, /link will be in your calendar invitation/);
});

test('sendBookingEmails retries once and reports each email', async () => {
  const env = { OWNER_EMAIL: 'owner@example.com', SMTP_USER: 'owner@example.com' };
  const sent = [];
  let failuresLeft = 1;
  let closed = false;
  const transport = {
    async sendMail(message) {
      sent.push(message.to);
      if (message.to === 'ada@example.com' && failuresLeft-- > 0) throw new Error('timeout');
      if (message.to === 'owner@example.com') throw new Error('535 auth');
      return { messageId: `<${sent.length}@test>` };
    },
    close() {
      closed = true;
    },
  };
  const result = await sendBookingEmails(booking, { meetLink: null, htmlLink: null }, { env, createTransport: () => transport });
  assert.deepEqual(result.visitor_confirmation, { sent: true, message_id: '<2@test>' });
  assert.deepEqual(result.owner_notification, { sent: false, message_id: null, error: '535 auth' });
  assert.deepEqual(sent, ['ada@example.com', 'ada@example.com', 'owner@example.com', 'owner@example.com']);
  assert.equal(closed, true);
});

// ---------- lead row ----------

test('buildLeadRow follows the schema column order', () => {
  const row = buildLeadRow(booking, { id: 'ev1', meetLink: 'https://meet.google.com/xyz' }, at('2026-10-05T16:00:00Z'));
  assert.deepEqual(row, [
    '2026-10-05T12:00:00-04:00',
    '2026-10-06T14:00:00-04:00',
    '2026-10-06T14:30:00-04:00',
    'Ada Lovelace',
    'ada@example.com',
    '',
    'example.com',
    'Hello',
    'ev1',
    'https://meet.google.com/xyz',
  ]);
  assert.equal(buildLeadRow(booking, { id: 'ev1', meetLink: null }, at('2026-10-05T16:00:00Z'))[9], '');
});

test('rowNumberFromRange', () => {
  assert.equal(rowNumberFromRange('Leads!A7:J7'), 7);
  assert.equal(rowNumberFromRange("'Leads'!A12:J12"), 12);
  assert.equal(rowNumberFromRange(undefined), null);
});

test('RULES match the Data Schema', () => {
  assert.equal(RULES.timezone, 'America/Toronto');
  assert.deepEqual([...RULES.bookableDays], ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  assert.deepEqual(
    [RULES.dayStartMinutes, RULES.dayEndMinutes, RULES.slotMinutes, RULES.minNoticeHours, RULES.maxDaysAhead],
    [540, 1020, 30, 24, 14],
  );
  assert.deepEqual([RULES.maxUpcomingCallsPerEmail, RULES.maxNewBookingsPerHour, RULES.sendCalendarInvitation], [1, 10, true]);
});
