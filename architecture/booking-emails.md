# SOP: Booking emails

## Goal

Send two emails for every booking, from `zack@ascension-marketing.ca` through Proton SMTP: a confirmation to the visitor and a notification to the owner.

## Tool

`execution/booking_emails.js`:

- `buildVisitorEmail(booking, event)` and `buildOwnerEmail(booking, event)`: pure; return `{ to, replyTo, subject, text }`.
- `sendBookingEmails(booking, event)`: sends both through `execution/lib/smtp.js`, each tried twice at most, and returns `{ visitor_confirmation, owner_notification }`, each `{ sent, message_id }`.

## Content (plain text in Phase A; Phase S styles it and sets the final wording)

Visitor confirmation:

- To: the visitor. From: `SMTP_USER`. Reply-To: `OWNER_EMAIL`.
- Subject: `Your call is booked: <weekday, month day at time> (Toronto time)`.
- Body: greeting by name, the date and time in Toronto time, the Meet link, and how to change the time (reply to the email).

Owner notification:

- To: `OWNER_EMAIL`. From: `SMTP_USER`. Reply-To: the visitor, so a reply goes straight to them.
- Subject: `New booking: <name>, <weekday, month day at time>`.
- Body: every field the visitor entered, the Meet link, and the calendar event link.

Dates are written with `Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto' })`, for example "Tuesday, October 6, 2026 at 2:00 p.m.".

## Rules

- The visitor's text goes into the body as plain text only. Header fields are set through nodemailer's structured fields, never by joining strings, so a crafted name cannot add headers.
- A failed email never undoes the booking (see `architecture/booking-flow.md`).

## Edge cases

- **Proton rejects the sign-in:** both emails fail; the record shows `sent: false` and the log has the error. See `architecture/email-setup.md`.
- **No Meet link** (see `architecture/calendar-event.md`): the emails say the link will follow in the calendar invitation.

## Lessons

None yet.
