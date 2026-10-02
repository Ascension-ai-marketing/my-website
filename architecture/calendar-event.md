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
3. Conflict check: list only **booking** events (`privateExtendedProperty=source=my-website`) from the slot start to the slot end (`singleEvents=true`). Ignore the new event, cancelled events and events marked Free (`transparency: transparent`). Any remaining booking event created before the new one (by `created` time, then by id) is a conflict. The owner's own events are not looked at here: the free/busy check before the insert already covers them, using Google's own rules for what counts as busy (for example, an invitation the owner declined does not block a slot). Re-checking them with a raw event list would wrongly cancel bookings that free/busy allowed.
4. On a conflict, delete the new event with `sendUpdates=all` so the visitor receives a cancellation for the invitation they just got.

## Edge cases

- **Meet links on this account:** `zack@ascension-marketing.ca` is a Google account without Workspace or Gmail. Proven on 2026-10-02: the live test's event came back with a Meet link on the first response, no waiting needed.
- **Visitor email equals the owner's:** Google treats the guest as the organizer and sends no invitation. Only matters for tests.
- **Insert succeeds but the response is lost** (timeout): the event may exist without the flow knowing. The flow answers `503`; the owner sees the event on the calendar. Rare; not retried, to avoid creating two events.

## Lessons

- **2026-10-02 (design review, before any real booking): the conflict check must not look at the owner's own events.** The first draft listed every event in the slot. An event that free/busy treats as free (such as an invitation the owner declined) would then have cancelled a booking that had just been accepted and announced to the visitor. The check now lists booking events only.
- **2026-10-02: Gmail shows the invitation to a first-time visitor as "Invitation from an unknown sender"**, with a note that the event is not in their calendar until they respond. This is Google's default for senders the recipient has never dealt with. The confirmation email therefore carries the Meet link and the time on its own.
