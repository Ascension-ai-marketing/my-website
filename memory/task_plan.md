# Task Plan

**Blueprint status:** DRAFTED 2026-10-02. NOT APPROVED. Waiting for the user.

## Blueprint

### What we are building

A website that builds credibility and lets a visitor book a 30-minute call. The visitor picks a free slot on the site, fills in a short form, and the system creates the call on Google Calendar with a Meet link, emails both sides, and logs the lead in a Google Sheet.

### Discovery answers

1. **North Star:** build credibility and book calls via Google Calendar.
2. **Integrations:** GitHub and Vercel (hosting), Google Calendar, Gmail, Google Sheets, Analytics. Booking is a custom form using the Google Calendar API. No Google credentials exist yet.
3. **Source of Truth:** Google Calendar, on `zack@ascension-marketing.ca`.
4. **Delivery Payload:** calendar event with the visitor as guest, Meet link, confirmation email to the visitor and notification email to the owner via Gmail, and a lead row in a Google Sheet.
5. **Behavioral Rules:** tone is bold and energetic, and warm and friendly. Bookable hours only.

### Booking rules

Mon to Fri, 09:00 to 17:00, America/Toronto. 30-minute calls. 24 hours minimum notice. Up to 14 days ahead.

### Data schema

Drafted in `CLAUDE.md` under "Data Schema": the booking rules, the two operations (list slots, book a call), the success and refusal payloads, and the lead sheet columns.

### Proposed architecture

- **Site:** static pages in `public/`, served by Vercel.
- **Booking endpoints:** two Vercel functions in `api/` (list slots, book a call). They are thin and only call the tools.
- **Tools:** deterministic modules in `execution/`, one job each: compute slots, validate a request, create the event, send the emails, append the sheet row.
- **SOPs:** one file in `architecture/` per tool, written before the tool.
- **Google access:** OAuth as the calendar owner, with the refresh token in `.env` locally and in Vercel's environment variables in production. A service account cannot invite guests (see `findings.md`).

### Open decisions (need the user)

1. **Confirm the payload shape** in `CLAUDE.md`, including the three proposals: slots on the hour and half hour, and `phone`, `company_or_website`, `message` being optional.
2. **Double-booking guard.** Not selected as a rule. Without a re-check at the moment of booking, two visitors who load the page at the same time can both book the same slot. Recommended: add it.
3. **Spam blocking.** Not selected as a rule. Without it, a bot can fill the calendar with fake calls and send emails from the owner's Gmail to arbitrary addresses. Recommended: add it.
4. **Site content.** Nothing is known yet about what the site says: business name, offer, proof, pages. This must come from the user.
5. **Analytics provider.** Analytics was selected but not which one.
6. **Vercel access.** The Vercel project cannot be linked until the connector is authorized for the team (see `progress.md`).

## Protocol 0: Initialization

- [x] Create `memory/` with task_plan, findings, progress, decisions
- [x] Create `CLAUDE.md` as the Project Constitution
- [x] Create `architecture/`, `execution/`, `.tmp/`, `.env`
- [ ] Execution gate cleared (see CLAUDE.md)

## Phase B: Blueprint

- [x] 1. North Star
- [x] 2. Integrations and credential readiness
- [x] 3. Source of Truth
- [x] 4. Delivery Payload
- [x] 5. Behavioral Rules
- [x] Define the JSON Data Schema (input and output) in CLAUDE.md (draft)
- [ ] User confirms the Payload shape
- [x] Research prior art, log in findings.md
- [ ] User approves the Blueprint

## Phase L: Link

- [ ] User creates the Google Cloud project and OAuth credentials from written steps
- [ ] Verify every credential and API connection: Calendar, Gmail, Sheets, Vercel
- [ ] Build a minimal probe script per service in `execution/`
- [ ] Prove an `api/` function runs alongside `public/` on Vercel
- [ ] Every link green before moving on

## Phase A: Architect

- [ ] Write SOPs in `architecture/`
- [ ] Build deterministic tools in `execution/`
- [ ] Wire the navigation layer (`api/` handlers)

## Phase S: Stylize

- [ ] Format the payload for delivery: both emails, the calendar event text, the sheet
- [ ] Build and style the site
- [ ] Attach a verify step to every output
- [ ] User sign-off

## Phase T: Trigger

- [x] Repository side of the Vercel deploy: `vercel.json`, `public/`, `architecture/deploy.md` (done early, at the user's request, before the Blueprint)
- [ ] Link the Vercel project to the GitHub repository. BLOCKED: needs the user to give access to their Vercel team (see progress.md)
- [ ] Verify the production URL with the commands in `architecture/deploy.md`
- [ ] Move to production
- [ ] Set up and document any other triggers
- [ ] Finalize the Maintenance Log in CLAUDE.md
