// The booking rules from the Data Schema in CLAUDE.md, the slot grid, and the slot checks. Pure.
// SOP: architecture/availability.md, architecture/booking-validation.md
import { addDays, weekdayOf, zonedParts, zonedToUtc } from './lib/time.js';

export const RULES = Object.freeze({
  timezone: 'America/Toronto',
  bookableDays: Object.freeze(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']),
  dayStartMinutes: 9 * 60,
  dayEndMinutes: 17 * 60,
  slotMinutes: 30,
  minNoticeHours: 24,
  maxDaysAhead: 14,
  maxUpcomingCallsPerEmail: 1,
  maxNewBookingsPerHour: 10,
  sendCalendarInvitation: true,
});

export const REFUSAL_MESSAGES = Object.freeze({
  spam: "We couldn't accept this booking. Please try again later.",
  outside_bookable_hours: "That time isn't bookable. Calls run Monday to Friday, 9:00 to 17:00 Toronto time.",
  insufficient_notice: "Calls need at least 24 hours' notice. Please pick a later time.",
  beyond_booking_window: 'Calls can be booked up to 14 days ahead. Please pick an earlier time.',
  slot_unavailable: 'That time was just taken. Please pick another slot.',
  already_booked: 'You already have a call booked. Check your email for the details.',
  invalid_input: 'Please check the form and try again.',
});

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Earliest allowed start (inclusive) and the end of the window (exclusive).
export function bookingWindow(now, rules = RULES) {
  return {
    earliest: new Date(now.getTime() + rules.minNoticeHours * HOUR),
    latestExclusive: new Date(now.getTime() + rules.maxDaysAhead * DAY),
  };
}

export function slotEnd(start, rules = RULES) {
  return new Date(start.getTime() + rules.slotMinutes * MINUTE);
}

// Every slot that the rules allow, before looking at the calendar. Each slot is { start, end }.
export function buildSlotGrid(now, rules = RULES) {
  const { earliest, latestExclusive } = bookingWindow(now, rules);
  const today = zonedParts(now, rules.timezone);
  const slots = [];
  for (let offset = 0; offset <= rules.maxDaysAhead; offset += 1) {
    const date = addDays(today, offset);
    if (!rules.bookableDays.includes(weekdayOf(date))) continue;
    for (let m = rules.dayStartMinutes; m + rules.slotMinutes <= rules.dayEndMinutes; m += rules.slotMinutes) {
      const start = zonedToUtc({ ...date, hour: Math.floor(m / 60), minute: m % 60 }, rules.timezone);
      if (start < earliest || start >= latestExclusive) continue;
      slots.push({ start, end: slotEnd(start, rules) });
    }
  }
  return slots;
}

// Returns the refusal reason for a requested start time, or null if the rules allow it.
export function checkSlotRules(start, now, rules = RULES) {
  const local = zonedParts(start, rules.timezone);
  const minutes = local.hour * 60 + local.minute;
  const onGrid =
    local.second === 0 &&
    start.getUTCMilliseconds() === 0 &&
    (minutes - rules.dayStartMinutes) % rules.slotMinutes === 0;
  const inHours = minutes >= rules.dayStartMinutes && minutes + rules.slotMinutes <= rules.dayEndMinutes;
  if (!onGrid || !inHours || !rules.bookableDays.includes(local.weekday)) return 'outside_bookable_hours';

  const { earliest, latestExclusive } = bookingWindow(now, rules);
  if (start < earliest) return 'insufficient_notice';
  if (start >= latestExclusive) return 'beyond_booking_window';
  return null;
}
