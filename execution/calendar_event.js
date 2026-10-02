// The booking event on the owner's Google Calendar: create, check for an earlier conflict, delete.
// SOP: architecture/calendar-event.md
import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';

import { RULES } from './booking_rules.js';
import { requireEnv } from './lib/env.js';
import { CALENDAR_API, googleRequest } from './lib/google_api.js';
import { SCOPES } from './lib/google_auth.js';
import { toZonedIso } from './lib/time.js';

export const BOOKING_SOURCE = 'my-website';
const MEET_POLL_ATTEMPTS = 3;
const MEET_POLL_DELAY_MS = 1000;

// The event title. Both the owner and the visitor see it. The live-test cleanup tool uses it too.
export function eventSummary(name) {
  return `Discovery call: ${name} | Ascension AI`;
}

export function buildEventBody(booking, requestId, rules = RULES) {
  const description = [
    'Free 30-minute discovery call with Ascension AI. Join with the Google Meet link on this event.',
    '',
    'Booked through the website.',
    '',
    `Name: ${booking.name}`,
    `Email: ${booking.email}`,
    `Phone: ${booking.phone || '-'}`,
    `Company or website: ${booking.company_or_website || '-'}`,
    '',
    'Message:',
    booking.message || '-',
  ].join('\n');

  return {
    summary: eventSummary(booking.name),
    description,
    start: { dateTime: toZonedIso(booking.slotStart, rules.timezone), timeZone: rules.timezone },
    end: { dateTime: toZonedIso(booking.slotEnd, rules.timezone), timeZone: rules.timezone },
    attendees: [{ email: booking.email, displayName: booking.name }],
    conferenceData: {
      createRequest: { requestId, conferenceSolutionKey: { type: 'hangoutsMeet' } },
    },
    extendedProperties: { private: { source: BOOKING_SOURCE } },
    guestsCanModify: false,
    guestsCanInviteOthers: false,
  };
}

export function meetLinkOf(event) {
  return (
    event.hangoutLink ??
    event.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === 'video')?.uri ??
    null
  );
}

function eventsUrl(env, path = '') {
  const { GOOGLE_CALENDAR_ID } = requireEnv(['GOOGLE_CALENDAR_ID'], env);
  return `${CALENDAR_API}/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events${path}`;
}

// Inserts the event (Google emails the visitor its invitation) and returns
// { id, htmlLink, meetLink, created }. Waits briefly if the Meet link is still being made.
export async function createBookingEvent(booking, { env = process.env, wait = sleep } = {}) {
  const sendUpdates = RULES.sendCalendarInvitation ? 'all' : 'none';
  let event = await googleRequest(`${eventsUrl(env)}?conferenceDataVersion=1&sendUpdates=${sendUpdates}`, {
    method: 'POST',
    body: buildEventBody(booking, randomUUID()),
    scopes: [SCOPES.calendarEvents],
    env,
  });

  for (let attempt = 0; attempt < MEET_POLL_ATTEMPTS && !meetLinkOf(event); attempt += 1) {
    if (event.conferenceData?.createRequest?.status?.statusCode !== 'pending') break;
    await wait(MEET_POLL_DELAY_MS);
    event = await googleRequest(eventsUrl(env, `/${encodeURIComponent(event.id)}`), {
      scopes: [SCOPES.calendarEvents],
      env,
    });
  }

  return { id: event.id, htmlLink: event.htmlLink, meetLink: meetLinkOf(event), created: event.created };
}

// The first other event that blocks the slot and was created before ours, or null.
export function earlierConflict(items, ours) {
  const ourCreated = new Date(ours.created).getTime();
  return (
    items.find((other) => {
      if (other.id === ours.id || other.status === 'cancelled' || other.transparency === 'transparent') return false;
      const created = new Date(other.created).getTime();
      return created < ourCreated || (created === ourCreated && other.id < ours.id);
    }) ?? null
  );
}

export async function findEarlierConflict(event, booking, { env = process.env } = {}) {
  const url = new URL(eventsUrl(env));
  url.search = new URLSearchParams({
    timeMin: booking.slotStart.toISOString(),
    timeMax: booking.slotEnd.toISOString(),
    privateExtendedProperty: `source=${BOOKING_SOURCE}`,
    singleEvents: 'true',
    maxResults: '50',
    fields: 'items(id,status,transparency,created)',
  }).toString();
  const body = await googleRequest(url, { scopes: [SCOPES.calendarEvents], env });
  return earlierConflict(body.items ?? [], event);
}

// Deletes an event and sends the guest a cancellation.
export async function deleteEvent(id, { env = process.env, notifyGuests = true } = {}) {
  await googleRequest(eventsUrl(env, `/${encodeURIComponent(id)}?sendUpdates=${notifyGuests ? 'all' : 'none'}`), {
    method: 'DELETE',
    scopes: [SCOPES.calendarEvents],
    env,
  });
}
