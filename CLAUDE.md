# Project Constitution

This project is built with the B.L.A.S.T. protocol (Blueprint, Link, Architect, Stylize, Trigger) and the A.N.T. 3-layer build (Architecture, Navigation, Tools). Reliability over speed. Never guess at business logic.

## State

- **Current phase:** B — Blueprint (discovery complete, schema drafted, waiting for the user's approval)
- **Execution gate:** LOCKED. No logic may be written in `execution/` until all three are true:
  - [x] All five Blueprint discovery questions are answered
  - [ ] The Data Schema below is defined and the Payload shape is confirmed (drafted 2026-10-02, not yet confirmed)
  - [ ] `memory/task_plan.md` has an approved Blueprint

## Blueprint (Phase B)

| Question | Answer |
| --- | --- |
| North Star | Build credibility and book calls via Google Calendar. (User's words, 2026-10-02: "build credibility and book calls via google calander") |
| Integrations | GitHub and Vercel (hosting), Google Calendar, Gmail, Google Sheets or a database, Analytics. Booking is a custom form on the site that creates the event through the Google Calendar API. Credential readiness: nothing set up yet. No Google Cloud project or API credentials exist; the user creates them in Phase L from written setup steps. |
| Source of Truth | Google Calendar. Availability is read from it and every booking is an event in it. A sheet or database only keeps a copy for lead tracking. |
| Delivery Payload | A booking is delivered when all four land: (1) an event on the user's Google Calendar with the visitor invited as a guest, (2) a Google Meet link on that event, (3) a confirmation email to the visitor and a notification email to the user, sent via Gmail, (4) a row with the visitor's details and booking time appended to a Google Sheet. |
| Behavioral Rules | Tone: bold and energetic, and warm and friendly. Rule: bookable hours only (refuse any slot outside set working hours or without minimum notice). See Behavioral Rules below. |

## Data Schema

**Status: DRAFT. Not confirmed by the user yet.** Values marked "confirmed" came from the user on 2026-10-02. Values marked "proposed" are mine and need a yes.

### Booking rules (configuration)

```json
{
  "calendar_owner": "zack@ascension-marketing.ca",
  "timezone": "America/Toronto",
  "bookable_days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
  "bookable_hours": { "start": "09:00", "end": "17:00" },
  "slot_minutes": 30,
  "min_notice_hours": 24,
  "max_days_ahead": 14
}
```

All seven values are confirmed. Proposed: slots start on the hour and half hour, so the last slot of a day is 16:30 to 17:00.

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
  "message": "string, what they want to discuss, up to 1000 characters"
}
```

The six fields are confirmed. Proposed: `phone`, `company_or_website` and `message` are optional.

Output (Payload) shape when the booking succeeds:

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

Output when the booking is refused. Nothing is created:

```json
{
  "status": "refused",
  "reason": "outside_bookable_hours | insufficient_notice | beyond_booking_window | invalid_input",
  "message": "string, shown to the visitor"
}
```

### Lead sheet row

One row per booking, columns in this order: `booked_at`, `slot_start`, `slot_end`, `name`, `email`, `phone`, `company_or_website`, `message`, `event_id`, `meet_link`.

## Behavioral Rules

Confirmed by the user on 2026-10-02.

- **Tone:** bold and energetic, and warm and friendly. Applies to the site copy and to both emails.
- **Bookable hours only:** refuse any slot outside the bookable days and hours, with less than 24 hours of notice, or more than 14 days ahead. A refused booking creates nothing.

Offered and **not** selected by the user, so they are not rules: re-checking the calendar right before creating the event (double-booking guard), spam blocking, and a ban on invented site content. These are raised again as open decisions in `memory/task_plan.md`.

## Architectural Invariants

- Business logic is deterministic and lives in `execution/` as atomic, testable scripts.
- Every script in `execution/` has a matching SOP in `architecture/`. If logic changes, the SOP is updated before the code.
- The navigation layer only routes between SOPs and tools. It does not do complex work itself.
- Credentials live in `.env` and nowhere else. `.env` is never committed or printed.
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

No integrations verified yet. Results are logged in `memory/progress.md`.

## Architect (Phase A)

- SOPs: `architecture/deploy.md` (deploy to Vercel).
- Tools: none yet. `execution/` is empty.

## Stylize (Phase S)

No payload formatting defined yet.

## Trigger (Phase T)

| Trigger | Fires when | Does | Status |
| --- | --- | --- | --- |
| Vercel deploy (manual) | `vercel deploy --prod` is run from the project root | Vercel publishes `public/` to production at https://my-website-blue-ten-62.vercel.app | LIVE since 2026-10-02. Serving the placeholder page. |
| Vercel deploy on push | A commit is pushed to `main` on GitHub (`Ascension-ai-marketing/my-website`) | Same, without a manual command | NOT CONNECTED. The Vercel account has no GitHub connection yet (see `architecture/deploy.md`). |

Details and the verify commands are in `architecture/deploy.md`. Only `public/` is ever served; the planning files at the root stay private.

## Maintenance Log

- 2026-10-02: a test deployment went to production because a new project's first deployment is always promoted. Nothing private was exposed. Lesson recorded in `architecture/deploy.md`.

When something fails, follow the repair loop: analyze the error, patch the script in `execution/`, test the fix, then write the lesson into the matching SOP in `architecture/`.

## File Structure

```
├── CLAUDE.md        # This file: constitution and state
├── .env             # Credentials (verified in Phase L)
├── vercel.json      # Tells Vercel to serve public/ only
├── public/          # The site. The only folder that is published
├── memory/          # task_plan.md, findings.md, progress.md, decisions.md
├── architecture/    # Layer A: SOPs
├── execution/       # Layer T: scripts
└── .tmp/            # Temporary workbench
```
