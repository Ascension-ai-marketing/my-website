# SOP: Booking flow (Navigation layer)

## Goal

Turn a request from the website into either a delivered booking or a clean refusal, by calling the tools in a fixed order. The navigation layer decides the order and the HTTP answer; it does no calculation itself.

## Where it lives

- `navigation/slots_flow.js`, `navigation/book_flow.js`: the order of tool calls. Testable without HTTP.
- `navigation/live.js`: the on/off switch for the live site.
- `api/slots.js` (`GET /api/slots`), `api/book.js` (`POST /api/book`): thin Vercel handlers. They read the request, call a flow, and write the response.

## Operation 1: list slots (`GET /api/slots`)

1. `buildSlotGrid(now)` (`execution/booking_rules.js`): every candidate slot in the window.
2. `fetchBusy(first start, last end)` (`execution/availability.js`): busy blocks from Google Calendar.
3. `freeSlots(candidates, busy)`: drop every candidate that overlaps a busy block.
4. Answer `200` with the Operation 1 output from `CLAUDE.md`. `cache-control: no-store`, because availability changes with every booking.

If Google fails: `503` with `{ "status": "unavailable" }`.

## Operation 2: book a call (`POST /api/book`)

Each step either passes or ends the flow with a refusal. Nothing is created before step 6.

1. Body must be JSON, at most 10 KB. Otherwise `invalid_input`.
2. `validateBookingRequest(body)` (`execution/validate_request.js`): fields, lengths, bot trap. Fails as `invalid_input` or `spam`.
3. `checkSlotRules(slotStart, now)` (`execution/booking_rules.js`): alignment, days and hours, notice, window.
4. `countUpcomingCallsFor(email)` and `countBookingsSince(now − 1 hour)` (`execution/rate_limits.js`): `already_booked` or `spam`.
5. `fetchBusy(slot)`: if the slot overlaps anything, `slot_unavailable`.
6. `createBookingEvent(booking)` (`execution/calendar_event.js`): the commit point. Google sends the visitor its invitation here.
7. `findEarlierConflict(event)`: if another overlapping event was created first, `deleteEvent(event)` and refuse with `slot_unavailable`.
8. `sendBookingEmails(booking, event)` (`execution/booking_emails.js`): the visitor confirmation and the owner notification. Each is tried once more on failure. A failure does not undo the booking.
9. `appendLeadRow(booking, event, bookedAt)` (`execution/lead_row.js`). Tried once more on failure. A failure does not undo the booking.
10. Log the record (identifiers and statuses only). Answer `200` with the public response.

## HTTP answers

| Outcome | Status |
| --- | --- |
| `booked` | 200 |
| `invalid_input` | 400 |
| `outside_bookable_hours`, `insufficient_notice`, `beyond_booking_window` | 422 |
| `slot_unavailable`, `already_booked` | 409 |
| `spam` | 429 |
| Google or Proton failed before the event was created | 503, `{ "status": "unavailable" }`, nothing created |
| Wrong method | 405 |
| Anything unexpected | 500, `{ "status": "error" }`; details only in the log |

## Live switch

On the production site both endpoints answer `404` unless the Vercel environment variable `BOOKING_LIVE` is `true`. Preview deployments always run them (they are behind Vercel sign-in). Turning booking on is a Phase T step and needs the user's sign-off.

## Time limits

- `api/book.js` may run up to 180 seconds and `api/slots.js` up to 30 seconds (`vercel.json`, `functions`). The project default is 300.
- One booking makes about eight Google calls in sequence, may wait up to 3 seconds for the Meet link, and sends two emails with up to two attempts each.
- SMTP timeouts are 8 seconds to connect, 8 seconds for the greeting and 12 seconds of silence. Four failing attempts therefore stay under about 112 seconds, inside the 180-second limit.
- If the function were cut off after the event exists, the booking would be half delivered and a retry by the visitor would get `already_booked`. The limits above are sized so that does not happen.

## Logging

One line per request, JSON, through `console.log`, visible in Vercel's runtime logs. It holds the outcome, reason, event id, email statuses and message ids, lead row number, and `elapsed_ms`. It never holds the visitor's name, email, phone, company or message.

## Edge cases

- **Two visitors book the same slot at the same moment:** both pass step 5; step 7 keeps the event created first and removes the other. The removed visitor may receive Google's invitation followed by a cancellation.
- **The visitor's email bounces:** Proton still accepts the message, so the record shows `sent: true`. Bounces arrive in the owner's Proton inbox.
- **Google sign-in expired (`invalid_grant`):** every request answers `503` and nothing is created. Fix per `architecture/google-setup.md`.

## Lessons

None yet.
