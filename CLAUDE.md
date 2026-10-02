# Project Constitution

This project is built with the B.L.A.S.T. protocol (Blueprint, Link, Architect, Stylize, Trigger) and the A.N.T. 3-layer build (Architecture, Navigation, Tools). Reliability over speed. Never guess at business logic.

## State

- **Current phase:** A — Architect, complete on 2026-10-02 (built, unit-tested, and proven by a live end-to-end test on a preview). Next: S — Stylize. (Blueprint approved 2026-10-02; Phase L complete 2026-10-02.)
- **Booking on the live site:** OFF. `/api/slots` and `/api/book` answer 404 in production until `BOOKING_LIVE=true` is set in Vercel (a Phase T step that needs the user's sign-off).
- **Execution gate:** OPEN since 2026-10-02. All three conditions are met:
  - [x] All five Blueprint discovery questions are answered
  - [x] The Data Schema below is defined and the Payload shape is confirmed
  - [x] `memory/task_plan.md` has an approved Blueprint
- **Phase L gate:** OPEN since 2026-10-02. Every link is green, so business logic may be written.

## Blueprint (Phase B)

| Question | Answer |
| --- | --- |
| North Star | Build credibility and book calls via Google Calendar. (User's words, 2026-10-02: "build credibility and book calls via google calander") |
| Integrations | GitHub and Vercel (hosting), Google Calendar, Google Sheets, Proton Mail SMTP for email (changed from Gmail on 2026-10-02: the owner's account has no Gmail), Analytics. Booking is a custom form on the site that creates the event through the Google Calendar API. Credential readiness: nothing set up yet. No Google Cloud project or API credentials exist; the user creates them in Phase L from written setup steps. |
| Source of Truth | Google Calendar. Availability is read from it and every booking is an event in it. A sheet or database only keeps a copy for lead tracking. |
| Delivery Payload | A booking is delivered when all four land: (1) an event on the user's Google Calendar with the visitor invited as a guest, (2) a Google Meet link on that event, (3) a confirmation email to the visitor and a notification email to the user, sent from `zack@ascension-marketing.ca` through Proton Mail SMTP (originally "via Gmail", changed 2026-10-02), (4) a row with the visitor's details and booking time appended to a Google Sheet. |
| Behavioral Rules | Tone: bold and energetic, and warm and friendly. Rules: bookable hours only, never double-book, block spam. See Behavioral Rules below. |

## Data Schema

**Status: CONFIRMED by the user on 2026-10-02**, including the two proposals (slot alignment and optional fields). Extended at the start of Phase A (same day) with the user's answers on rate limits, the calendar invitation and the public response; those additions are marked "Phase A". Change this section before changing any code that depends on it.

### Booking rules (configuration)

```json
{
  "calendar_owner": "zack@ascension-marketing.ca",
  "timezone": "America/Toronto",
  "bookable_days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
  "bookable_hours": { "start": "09:00", "end": "17:00" },
  "slot_minutes": 30,
  "min_notice_hours": 24,
  "max_days_ahead": 14,
  "max_upcoming_calls_per_email": 1,
  "max_new_bookings_per_hour": 10,
  "send_calendar_invitation": true
}
```

Phase A: the last three values were chosen by the user on 2026-10-02. "Upcoming" means a call on the calendar that has not started yet. The hourly count is taken from the lead sheet's `booked_at` column over the previous 60 minutes. `send_calendar_invitation` means Google Calendar emails the visitor its own invitation as well as the system's confirmation email.

"Up to 14 days ahead" means the slot starts less than 14 × 24 hours after the moment of booking. "24 hours of notice" means the slot starts at least 24 × 60 minutes after that moment.

Slots start on the hour and half hour, so the last slot of a day is 16:30 to 17:00.

### Operation 1: list available slots

Input: none. The window is always from now plus 24 hours to now plus 14 days.

Output:

```json
{
  "timezone": "America/Toronto",
  "slot_minutes": 30,
  "slots": ["2026-10-06T09:00:00-04:00", "2026-10-06T09:30:00-04:00"]
}
```

A slot is listed only if it is inside the bookable days and hours and the calendar shows no event overlapping it.

### Operation 2: book a call

Input shape:

```json
{
  "slot_start": "2026-10-06T14:00:00-04:00",
  "name": "string, required, 1 to 100 characters",
  "email": "string, required, valid email address",
  "phone": "string",
  "company_or_website": "string",
  "message": "string, what they want to discuss, up to 1000 characters",
  "homepage": "hidden bot trap, must be absent or empty"
}
```

Phase A: `homepage` is the hidden bot trap. The booking form hides it from people; a value in it means a bot filled the form. Limits: `phone` up to 40 characters of digits, spaces and `+ ( ) - .`; `company_or_website` up to 200 characters. `name` and the text fields may not contain line breaks or control characters (except line breaks in `message`).

`slot_start`, `name` and `email` are required. `phone`, `company_or_website` and `message` are optional.

Output (Payload) when the booking succeeds. Phase A: this is the server-side record. It is written to the server log (identifiers and statuses only, no visitor details) and is **not** sent to the browser:

```json
{
  "status": "booked",
  "slot": {
    "start": "2026-10-06T14:00:00-04:00",
    "end": "2026-10-06T14:30:00-04:00",
    "timezone": "America/Toronto"
  },
  "calendar_event": {
    "id": "string",
    "html_link": "string",
    "meet_link": "string",
    "guest": "visitor email"
  },
  "emails": {
    "visitor_confirmation": { "sent": true, "message_id": "string" },
    "owner_notification": { "sent": true, "message_id": "string" }
  },
  "lead_row": { "spreadsheet_id": "string", "row_number": 12 }
}
```

Public response to the browser when the booking succeeds (Phase A, chosen by the user):

```json
{
  "status": "booked",
  "slot": { "start": "2026-10-06T14:00:00-04:00", "end": "2026-10-06T14:30:00-04:00", "timezone": "America/Toronto" },
  "meet_link": "string"
}
```

If an email or the lead row fails after the event exists, the booking stands: the record shows `sent: false` or `lead_row: null`, the failure is logged with the event id, and the visitor still receives the success response.

Output when the booking is refused. Nothing is created. The same shape goes to the browser:

```json
{
  "status": "refused",
  "reason": "outside_bookable_hours | insufficient_notice | beyond_booking_window | slot_unavailable | already_booked | invalid_input | spam",
  "message": "string, shown to the visitor"
}
```

`slot_unavailable` is returned when the calendar shows the slot as taken at the moment of booking. `already_booked` (Phase A) is returned when the email address already has an upcoming call. `spam` is returned when the request fails the bot trap or the hourly limit.

### Lead sheet row

One row per booking, columns in this order: `booked_at`, `slot_start`, `slot_end`, `name`, `email`, `phone`, `company_or_website`, `message`, `event_id`, `meet_link`.

## Behavioral Rules

Confirmed by the user on 2026-10-02.

- **Tone:** bold and energetic, and warm and friendly. Applies to the site copy and to both emails.
- **Bookable hours only:** refuse any slot outside the bookable days and hours, with less than 24 hours of notice, or more than 14 days ahead. A refused booking creates nothing.

- **Never double-book:** re-check the calendar immediately before creating the event. If the slot is no longer free, refuse with `slot_unavailable` and create nothing. (Added 2026-10-02.) Phase A: right after creating the event, check again; if another event overlapping the slot was created earlier, delete the new event and refuse with `slot_unavailable`. This closes the gap when two people book the same slot at the same moment.
- **Block spam:** refuse a request that fails input validation, the hidden bot trap, or the rate limit. A refused request creates nothing and sends no email. (Added 2026-10-02.) Phase A: the rate limit is one upcoming call per email address (refused as `already_booked`) and at most 10 new bookings per hour across the site (refused as `spam`).

Offered and not selected by the user, so it is not a rule: a ban on invented site content. In practice the site copy still needs real facts from the user, because the system never guesses at business details.

## Architectural Invariants

- Business logic is deterministic and lives in `execution/` as atomic, testable scripts.
- Every script in `execution/` has a matching SOP in `architecture/`. If logic changes, the SOP is updated before the code.
- The navigation layer only routes between SOPs and tools. It does not do complex work itself.
- Credentials live in `.env` locally and in Vercel's environment variables for the deployed functions, and nowhere else. `.env` is never committed, printed or uploaded (`.gitignore` and `.vercelignore` both exclude it).
- All intermediate files go through `.tmp/`. Nothing in `.tmp/` is a deliverable.
- The project is complete only when the Payload lands at its final destination.
- Every output ships with a test, screenshot, or one-line verify command.

## Operating Principles

1. Data-First: input and output shape are defined before code runs.
2. Surgical Changes: touch only what was asked.
3. Simplicity First: minimum logic, no speculative abstractions.
4. Goal-Driven: every change is measured against the North Star and a verify step.
5. Per-Task Rhythm: explore, plan, code, commit. No skipping.

## Link (Phase L)

Status of every link. A link is green only after its probe has passed with real credentials. Details in `architecture/link-probes.md`, results in `memory/progress.md`.

| Link | Status | How it was verified |
| --- | --- | --- |
| GitHub push | GREEN | Pushes accepted over HTTPS; remote matches local |
| Vercel deploy on push | GREEN | Push to `main` deployed to production, state Ready |
| Vercel function (`api/` calling `execution/`) | GREEN | `/api/health` returns `ok: true`; `npm run probe:vercel` |
| Google Cloud project, APIs, consent screen | DONE, with a caveat | Project `my-website-booking-510420` under `zack@ascension-marketing.ca`. App is in Testing, so a sign-in lasts 7 days. Must be fixed before going live (`architecture/google-setup.md`) |
| Google sign-in (OAuth) | GREEN, expires in 7 days | `npm run google:auth` on 2026-10-02 as `zack@ascension-marketing.ca`, all four scopes granted. Expires around 2026-10-09 while the app is in Testing |
| Google Calendar | GREEN | `npm run probe:calendar`: free/busy readable on the owner's primary calendar. The calendar's own time zone is UTC |
| Google Sheets | GREEN | `npm run probe:sheets`: sheet "Website Leads", tab "Leads", header row matches the schema |
| Email (Proton SMTP) | GREEN | `npm run probe:email` on 2026-10-02: signed in to `smtp.protonmail.ch:587` with the owner's SMTP token and sent a test email to the owner (`250 2.0.0 Ok: queued`) |
| Credentials in Vercel | GREEN | The owner ran `npm run vercel:env` (ten values, Production and Preview; the three secrets stored as Vercel secrets). `/api/link-check` on a fresh preview returned 200 with calendar, sheets and email all GREEN |

Business logic does not start until every row is green. **Every link is green as of 2026-10-02. Phase L is complete.** Caveat: the Google sign-in expires around 2026-10-09 while the app is in Testing. If a Google check turns RED with `invalid_grant`, the owner runs `npm run google:auth`, then `npm run vercel:env -- GOOGLE_REFRESH_TOKEN`.

## Architect (Phase A)

- SOPs, setup and operations: `architecture/deploy.md` (deploy to Vercel), `architecture/link-probes.md` (Phase L probes), `architecture/google-setup.md` (Google credentials), `architecture/email-setup.md` (Proton SMTP token, done by the owner), `architecture/live-test.md` (live end-to-end test and its cleanup).
- SOPs, booking logic: `architecture/booking-flow.md` (the order of calls, HTTP answers, live switch, time limits, logging), `architecture/availability.md`, `architecture/booking-validation.md`, `architecture/calendar-event.md`, `architecture/booking-emails.md`, `architecture/lead-row.md`.
- Navigation: `navigation/` holds the flows (`slots_flow.js`, `book_flow.js`), which call the tools in the SOP's order and compute nothing themselves, and `live.js`, the production on/off switch. `api/` holds thin Vercel handlers that read the request, call a flow and write the response: `api/slots.js` (`GET /api/slots`), `api/book.js` (`POST /api/book`), `api/health.js`, and `api/link-check.js` (preview deployments only).
- Tools: `execution/` holds the booking tools (`booking_rules.js`, `availability.js`, `validate_request.js`, `rate_limits.js`, `calendar_event.js`, `booking_emails.js`, `lead_row.js`), the probes, the one-time setup tools (Google sign-in, lead sheet, clipboard-to-`.env`, `.env`-to-Vercel), the live-test cleanup tool, and shared helpers in `execution/lib/`.
- Runtime: Node. Google is called over plain HTTPS with `fetch`. One dependency, `nodemailer`, for SMTP.
- Commands: `npm test` runs the unit tests (48 as of 2026-10-02). The probe commands are listed in `architecture/link-probes.md`; the live-test commands in `architecture/live-test.md`.

## Stylize (Phase S)

No payload formatting defined yet.

## Trigger (Phase T)

| Trigger | Fires when | Does | Status |
| --- | --- | --- | --- |
| Vercel deploy on push | A commit is pushed to `main` on GitHub (`Ascension-ai-marketing/my-website`) | Vercel publishes `public/` to production at https://my-website-blue-ten-62.vercel.app | CONNECTED since 2026-10-02. Serving the placeholder page. |
| Vercel deploy (manual fallback) | `vercel deploy --prod` is run from the project root | Same, from this machine | Available. Used for the first deployment. Needs `.vercelignore` in place (see the Maintenance Log). |
| Booking switch | The Vercel environment variable `BOOKING_LIVE` is set to `true` for Production, followed by a deploy | `/api/slots` and `/api/book` start answering on the live site | OFF. Not set. Turning it on needs the user's sign-off (Phase T). |

Details and the verify commands are in `architecture/deploy.md`. Only `public/` is ever served; the planning files at the root stay private.

## Maintenance Log

- 2026-10-02: a test deployment went to production because a new project's first deployment is always promoted. Nothing private was exposed. Lesson recorded in `architecture/deploy.md`.
- 2026-10-02: `vercel deploy` uploaded `.env` into the source of four CLI deployments (three with real secrets). Not publicly served; readable inside the Vercel account. Fixed with `.vercelignore` and tested. The three deployments still exist until the owner removes them. Lesson recorded in `architecture/deploy.md`.

When something fails, follow the repair loop: analyze the error, patch the script in `execution/`, test the fix, then write the lesson into the matching SOP in `architecture/`.

## File Structure

```
├── CLAUDE.md        # This file: constitution and state
├── .env             # Credentials (verified in Phase L)
├── .env.example     # The variable names, no values
├── package.json     # Commands (npm test, probes). One dependency: nodemailer
├── vercel.json      # Tells Vercel to serve public/ only, and sets function time limits
├── .vercelignore    # Keeps .env and local state out of CLI deploys
├── public/          # The site. The only folder that is published
├── api/             # Layer N: Vercel function handlers, served under /api/
├── navigation/      # Layer N: the flows the handlers call (order of tool calls)
├── memory/          # task_plan.md, findings.md, progress.md, decisions.md
├── architecture/    # Layer A: SOPs
├── execution/       # Layer T: scripts
└── .tmp/            # Temporary workbench
```
