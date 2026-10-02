# SOP: Booking validation, slot rules and rate limits

## Goal

Refuse every request that should not become a booking, before anything is created, and tell the visitor why in one sentence.

## Tools

- `execution/validate_request.js`: `validateBookingRequest(body)`. Pure.
- `execution/booking_rules.js`: `checkSlotRules(slotStart, now)`. Pure.
- `execution/rate_limits.js`: `countUpcomingCallsFor(email, now)` (Google Calendar), `countBookingsSince(since)` (lead sheet), and the pure helpers they use.

## Input validation (`invalid_input` unless noted)

| Field | Rule |
| --- | --- |
| body | A JSON object |
| `homepage` | Absent or empty. Anything else is the bot trap: **`spam`** |
| `slot_start` | ISO 8601 date-time with an explicit offset or `Z` |
| `name` | 1 to 100 characters after trimming, no control characters |
| `email` | Up to 254 characters, one `@`, a dot in the domain, no spaces. Stored lowercased |
| `phone` | Optional. Up to 40 characters: digits, spaces, `+ ( ) - .` |
| `company_or_website` | Optional. Up to 200 characters, no control characters |
| `message` | Optional. Up to 1000 characters, line breaks allowed, no other control characters |

Unknown fields are ignored. Strings are trimmed. Empty optional fields become empty strings.

## Slot rules (checked in this order)

1. On the half-hour grid in Toronto time (minute 0 or 30, second 0), Monday to Friday, start between 09:00 and 16:30. Else `outside_bookable_hours`.
2. Starts at least 24 hours from now. Else `insufficient_notice`.
3. Starts less than 14 days from now. Else `beyond_booking_window`.

## Rate limits

1. **One upcoming call per email.** Search the calendar from now to 15 days ahead for events (not cancelled) that list the email as a guest. One or more: `already_booked`. The search uses Google's free-text query and then checks the guest list exactly, so a name that merely contains the address does not count.
2. **Ten new bookings per hour.** Read the `booked_at` column of the lead sheet and count values in the last 60 minutes. Ten or more: `spam`.

## Messages to the visitor

| Reason | Message |
| --- | --- |
| `invalid_input` | Names the field, for example "Please enter a valid email address." |
| `spam` | "We couldn't accept this booking. Please try again later." |
| `outside_bookable_hours` | "That time isn't bookable. Calls run Monday to Friday, 9:00 to 17:00 Toronto time." |
| `insufficient_notice` | "Calls need at least 24 hours' notice. Please pick a later time." |
| `beyond_booking_window` | "Calls can be booked up to 14 days ahead. Please pick an earlier time." |
| `slot_unavailable` | "That time was just taken. Please pick another slot." |
| `already_booked` | "You already have a call booked. Check your email for the details." |

The wording is plain on purpose; Phase S adjusts the tone.

## Edge cases

- **The bot-trap message is deliberately vague**, so a bot learns nothing.
- **The hourly count reads the sheet**, so bookings whose lead row failed are not counted. Acceptable: a failed row is logged and rare.
- **A visitor who cancels in their own calendar** may still be counted as upcoming until the owner removes them from the event.

## Lessons

None yet.
