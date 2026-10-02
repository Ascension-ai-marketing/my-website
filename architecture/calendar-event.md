# SOP: Calendar event

## Goal

Create the booking on the owner's Google Calendar: the visitor invited as a guest, a Google Meet link attached, and Google's own invitation sent to the visitor.

## Tool

`execution/calendar_event.js`:

- `buildEventBody(booking)`: pure; the request body.
- `createBookingEvent(booking)`: inserts the event and returns `{ id, htmlLink, meetLink, created }`.
- `findEarlierConflict(event)`: lists events overlapping the slot and returns the first one that blocks it, or null.
- `deleteEvent(id)`: removes an event and tells the guest.

## Event body

- `summary`: `Call with <name>`. Phase S may change the wording.
- `description`: the visitor's details (name, email, phone, company or website, message) as plain lines, so the owner sees them in the calendar.
- `start` / `end`: the slot as Toronto times, with `timeZone: America/Toronto` stated explicitly.
- `attendees`: one guest, the visitor's email, with their name.
- `conferenceData.createRequest`: type `hangoutsMeet`, with a random `requestId`. Requires `conferenceDataVersion=1` on the request.
- `extendedProperties.private`: `{ "source": "my-website" }`, so booking events can be told apart from the owner's own events.
- `guestsCanModify` and `guestsCanInviteOthers`: false.

## Tool logic

1. Insert with `sendUpdates=all` (the user chose to send Google's invitation as well as the confirmation email).
2. The Meet link is `hangoutLink`, or the `video` entry point in `conferenceData`. If Google answers that the conference is still `pending`, read the event again, up to 3 times, 1 second apart. If there is still no link, the booking stands without one and the record says so.
3. Conflict check: list events from the slot start to the slot end (`singleEvents=true`). Ignore the new event, cancelled events and events marked Free (`transparency: transparent`). Any remaining event that was created before the new one (by `created` time, then by id) is a conflict.
4. On a conflict, delete the new event with `sendUpdates=all` so the visitor receives a cancellation for the invitation they just got.

## Edge cases

- **Meet links on this account:** `zack@ascension-marketing.ca` is a Google account without Workspace or Gmail. Creating Meet links through the API must be proven by the live end-to-end test before this SOP is trusted.
- **Visitor email equals the owner's:** Google treats the guest as the organizer and sends no invitation. Only matters for tests.
- **Insert succeeds but the response is lost** (timeout): the event may exist without the flow knowing. The flow answers `503`; the owner sees the event on the calendar. Rare; not retried, to avoid creating two events.

## Lessons

None yet.
