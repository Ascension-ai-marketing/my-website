# SOP: Availability (slots and busy times)

## Goal

Produce the list of bookable 30-minute slots, in Toronto time, that the owner's Google Calendar shows as free.

## Tools

- `execution/lib/time.js`: time-zone conversions. Pure.
- `execution/booking_rules.js`: the rules from `CLAUDE.md` and the slot grid. Pure.
- `execution/availability.js`: `fetchBusy` (Google free/busy) and `freeSlots` (pure).

## Rules (from the Data Schema in `CLAUDE.md`)

- Days Monday to Friday, slots starting 09:00 to 16:30 on the hour and half hour, in `America/Toronto`.
- A slot is offered only if it starts at least 24 hours after now and less than 14 days after now.
- A slot is offered only if no busy block overlaps it. Slot `[s, e)` overlaps busy `[b1, b2)` when `s < b2` and `b1 < e`. Touching edges do not overlap.

## Tool logic

1. Take today's date in Toronto. For each of the next 15 local dates, skip Saturdays and Sundays, and make the 16 slots from 09:00 to 16:30 as Toronto wall-clock times.
2. Convert each wall-clock time to an exact instant with `zonedToUtc`. It computes the zone's offset for that moment, so it is right on both sides of a daylight-saving change.
3. Keep the slots inside the notice and window limits.
4. Ask Google free/busy for the span from the first kept slot's start to the last one's end, for `GOOGLE_CALENDAR_ID`, with `timeZone: America/Toronto`.
5. Drop overlapping slots. Format the rest as ISO 8601 with the Toronto offset, for example `2026-10-06T09:00:00-04:00`.

## Time-zone rules

- Never use the calendar's own time zone. It is UTC (see `architecture/link-probes.md`).
- Never use the machine's or Vercel's local time zone. Vercel runs in UTC; laptops do not. All conversions name `America/Toronto` explicitly.
- Daylight saving in Toronto: clocks go back on the first Sunday of November and forward on the second Sunday of March, at 02:00. Business hours never fall in the skipped or repeated hour, but conversions are still computed per moment, not with a fixed offset.

## Edge cases

- **No slots at all** (fully booked, or a long holiday on the calendar): `slots` is an empty list. Not an error.
- **Calendar unreachable:** `fetchBusy` throws; the flow answers `503`. No slots are guessed.
- **All-day events:** Google reports them as busy only if they are marked Busy. A "Free" all-day event does not block slots.

## Lessons

None yet.
