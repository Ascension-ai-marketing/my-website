// Operation 2: book a call. Calls the tools in the order fixed by the SOP; computes nothing itself.
// Returns { httpStatus, response, payload, log }: `response` goes to the browser, `payload` is the
// record from the Data Schema, `log` is what may be written to the server log (no visitor details).
// SOP: architecture/booking-flow.md
import { fetchBusy, overlaps } from '../execution/availability.js';
import { sendBookingEmails } from '../execution/booking_emails.js';
import { REFUSAL_MESSAGES, RULES, checkSlotRules, slotEnd } from '../execution/booking_rules.js';
import { createBookingEvent, deleteEvent, findEarlierConflict } from '../execution/calendar_event.js';
import { appendLeadRow, buildLeadRow } from '../execution/lead_row.js';
import { toZonedIso } from '../execution/lib/time.js';
import { countBookingsSince, countUpcomingCallsFor } from '../execution/rate_limits.js';
import { validateBookingRequest } from '../execution/validate_request.js';

const defaultTools = {
  validateBookingRequest,
  checkSlotRules,
  countUpcomingCallsFor,
  countBookingsSince,
  fetchBusy,
  createBookingEvent,
  findEarlierConflict,
  deleteEvent,
  sendBookingEmails,
  buildLeadRow,
  appendLeadRow,
};

export const HTTP_STATUS = Object.freeze({
  booked: 200,
  invalid_input: 400,
  outside_bookable_hours: 422,
  insufficient_notice: 422,
  beyond_booking_window: 422,
  slot_unavailable: 409,
  already_booked: 409,
  spam: 429,
  unavailable: 503,
});

const HOUR_MS = 60 * 60 * 1000;
const LEAD_ROW_ATTEMPTS = 2;

function refuse(reason, message = REFUSAL_MESSAGES[reason], extraLog = {}) {
  return {
    httpStatus: HTTP_STATUS[reason],
    response: { status: 'refused', reason, message },
    payload: { status: 'refused', reason, message },
    log: { outcome: 'refused', reason, ...extraLog },
  };
}

function unavailable(error) {
  return {
    httpStatus: HTTP_STATUS.unavailable,
    response: { status: 'unavailable', message: 'Booking is temporarily unavailable. Please try again in a few minutes.' },
    payload: null,
    log: { outcome: 'unavailable', error: error.message },
  };
}

export async function bookCall(body, { now = new Date(), env = process.env, tools = defaultTools } = {}) {
  // 1-2. Fields and bot trap.
  const checked = tools.validateBookingRequest(body);
  if (!checked.ok) return refuse(checked.reason, checked.message ?? REFUSAL_MESSAGES[checked.reason]);
  const booking = { ...checked.booking, slotEnd: slotEnd(checked.booking.slotStart) };

  // 3. Days, hours, notice, window.
  const slotProblem = tools.checkSlotRules(booking.slotStart, now);
  if (slotProblem) return refuse(slotProblem);

  // 4-6. Rate limits, the double-booking check, then the event. A failure here creates nothing.
  let event;
  try {
    if ((await tools.countUpcomingCallsFor(booking.email, now, env)) >= RULES.maxUpcomingCallsPerEmail) {
      return refuse('already_booked');
    }
    if ((await tools.countBookingsSince(new Date(now.getTime() - HOUR_MS), env)) >= RULES.maxNewBookingsPerHour) {
      return refuse('spam', REFUSAL_MESSAGES.spam, { limit: 'hourly' });
    }
    const slot = { start: booking.slotStart, end: booking.slotEnd };
    const busy = await tools.fetchBusy(slot.start, slot.end, env);
    if (busy.some((block) => overlaps(slot, block))) return refuse('slot_unavailable');
    event = await tools.createBookingEvent(booking, { env });
  } catch (error) {
    return unavailable(error);
  }

  // The event exists from here on. 7. Keep it only if no earlier event claims the slot.
  const log = { outcome: 'booked', event_id: event.id, meet_link_created: Boolean(event.meetLink) };
  try {
    const conflict = await tools.findEarlierConflict(event, booking, { env });
    if (conflict) {
      await tools.deleteEvent(event.id, { env });
      return refuse('slot_unavailable', REFUSAL_MESSAGES.slot_unavailable, { removed_event_id: event.id });
    }
  } catch (error) {
    log.conflict_check_error = error.message;
  }

  // 8-9. Emails and lead row, at the same time. A failure is recorded, not undone.
  const sendEmails = async () => {
    try {
      return await tools.sendBookingEmails(booking, event, { env });
    } catch (error) {
      const failed = { sent: false, message_id: null, error: error.message };
      return { visitor_confirmation: failed, owner_notification: failed };
    }
  };
  const writeLeadRow = async () => {
    let lastError = null;
    for (let attempt = 0; attempt < LEAD_ROW_ATTEMPTS; attempt += 1) {
      try {
        return { row: await tools.appendLeadRow(tools.buildLeadRow(booking, event, now), { env }), error: null };
      } catch (error) {
        lastError = error;
      }
    }
    return { row: null, error: lastError.message };
  };
  const [emails, leadRowResult] = await Promise.all([sendEmails(), writeLeadRow()]);
  const leadRow = leadRowResult.row;
  if (leadRowResult.error) log.lead_row_error = leadRowResult.error;

  const slot = {
    start: toZonedIso(booking.slotStart, RULES.timezone),
    end: toZonedIso(booking.slotEnd, RULES.timezone),
    timezone: RULES.timezone,
  };
  const emailRecord = (result) => ({ sent: result.sent, message_id: result.message_id });
  const payload = {
    status: 'booked',
    slot,
    calendar_event: { id: event.id, html_link: event.htmlLink, meet_link: event.meetLink, guest: booking.email },
    emails: {
      visitor_confirmation: emailRecord(emails.visitor_confirmation),
      owner_notification: emailRecord(emails.owner_notification),
    },
    lead_row: leadRow,
  };

  for (const [name, result] of Object.entries(emails)) {
    log[`${name}_sent`] = result.sent;
    if (result.message_id) log[`${name}_id`] = result.message_id;
    if (result.error) log[`${name}_error`] = result.error;
  }
  log.lead_row_number = leadRow?.row_number ?? null;

  return {
    httpStatus: HTTP_STATUS.booked,
    response: { status: 'booked', slot, meet_link: event.meetLink },
    payload,
    log,
  };
}
