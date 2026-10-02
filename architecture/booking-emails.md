# SOP: Booking emails

## Goal

Send two emails for every booking, from `zack@ascension-marketing.ca` through Proton SMTP: a confirmation to the visitor and a notification to the owner.

## Tool

`execution/booking_emails.js`:

- `buildVisitorEmail(booking, event)` and `buildOwnerEmail(booking, event)`: pure; return `{ to, replyTo, subject, text, html }`.
- `sendBookingEmails(booking, event)`: sends both at the same time through `execution/lib/smtp.js`, each tried twice at most, and returns `{ visitor_confirmation, owner_notification }`, each `{ sent, message_id }`.

## Content (Phase S, 2026-10-02)

Every email has a plain-text version and an HTML version. From: `"Ascension AI" <SMTP_USER>`. The HTML is a single light card with a black header bar carrying the name in gold, inline styles only, at most 560 px wide, and readable with images off.

Visitor confirmation:

- To: the visitor. Reply-To: `OWNER_EMAIL`.
- Subject: `You're booked: Free discovery call, <weekday, month day at time> (Toronto time)`.
- Body: greeting by name; the call, date, time (Toronto time), 30 minutes, Google Meet; a "Join Google Meet" button; a note that Google will also send an invitation from `OWNER_EMAIL`, which Gmail may label as from an unknown sender for a first invitation; how to change the time (reply); sign-off "Ascension AI" and the tagline.

Owner notification:

- To: `OWNER_EMAIL`. Reply-To: the visitor, so a reply goes straight to them.
- Subject: `New discovery call: <name>, <weekday, month day at time>`.
- Body: every field the visitor entered, the Meet link, and the calendar event link.

Dates are written with `Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto' })`, for example "Tuesday, October 6, 2026 at 2:00 p.m.".

## Rules

- The visitor's text goes into the plain-text body as is, and into the HTML body only after HTML escaping, so a crafted name or message cannot inject markup or links. Header fields are set through nodemailer's structured fields, never by joining strings, so a crafted name cannot add headers.
- A failed email never undoes the booking (see `architecture/booking-flow.md`).

## Edge cases

- **Proton rejects the sign-in:** both emails fail; the record shows `sent: false` and the log has the error. See `architecture/email-setup.md`.
- **No Meet link** (see `architecture/calendar-event.md`): the emails say the link will follow in the calendar invitation.

## Lessons

None yet.
