# Task Plan

**Blueprint status:** APPROVED by the user on 2026-10-02 ("yes to all, blueprint approved"). Current phase: L (Link).

## Blueprint

### What we are building

A website that builds credibility and lets a visitor book a 30-minute call. The visitor picks a free slot on the site, fills in a short form, and the system creates the call on Google Calendar with a Meet link, emails both sides, and logs the lead in a Google Sheet.

### Discovery answers

1. **North Star:** build credibility and book calls via Google Calendar.
2. **Integrations:** GitHub and Vercel (hosting), Google Calendar, Gmail, Google Sheets, Analytics. Booking is a custom form using the Google Calendar API. No Google credentials exist yet.
3. **Source of Truth:** Google Calendar, on `zack@ascension-marketing.ca`.
4. **Delivery Payload:** calendar event with the visitor as guest, Meet link, confirmation email to the visitor and notification email to the owner via Gmail, and a lead row in a Google Sheet.
5. **Behavioral Rules:** tone is bold and energetic, and warm and friendly. Bookable hours only, never double-book, block spam.

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

### Decisions

1. ~~Confirm the payload shape.~~ Confirmed 2026-10-02, including slot alignment and the optional fields.
2. ~~Double-booking guard.~~ Approved 2026-10-02. Now a behavioral rule.
3. ~~Spam blocking.~~ Approved 2026-10-02. Now a behavioral rule.
4. **Site content. STILL OPEN.** Nothing is known yet about what the site says: business name, offer, proof, pages. The user answered "yes to all", which does not supply it. Needed before Phase S.
5. **Analytics provider. STILL OPEN.** The question was Vercel Web Analytics or Google Analytics; "yes to all" does not pick one. Working default: Vercel Web Analytics, because it needs no extra account or credentials. Not built until the user confirms. Needed before Phase S.
6. **Email sending. OPEN, blocks Phase L.** The Blueprint says "emails via Gmail", but `zack@ascension-marketing.ca` has no Gmail (mail is on Proton). Options to put to the user:
   - a. Send from the Gmail account that does exist, `admin.ascension.marketing@gmail.com`, with replies directed to `zack@`. Needs one more sign-in for that account.
   - b. Send no custom emails. Let Google Calendar email the visitor its own invitation (it carries the Meet link); the owner sees the booking on the calendar and in the sheet.
   - c. Send from `zack@ascension-marketing.ca` through an email service (for example Resend) or Proton's SMTP. Needs a new account or plan and DNS records on the domain.
7. **Is the Google Calendar the real calendar? OPEN.** It is empty and set to UTC. If the owner's appointments live elsewhere, the system will offer busy times as free.
8. ~~Deploy on push.~~ Resolved 2026-10-02: the repository is connected to the Vercel project.

## Protocol 0: Initialization

- [x] Create `memory/` with task_plan, findings, progress, decisions
- [x] Create `CLAUDE.md` as the Project Constitution
- [x] Create `architecture/`, `execution/`, `.tmp/`, `.env`
- [x] Execution gate cleared (see CLAUDE.md)

## Phase B: Blueprint

- [x] 1. North Star
- [x] 2. Integrations and credential readiness
- [x] 3. Source of Truth
- [x] 4. Delivery Payload
- [x] 5. Behavioral Rules
- [x] Define the JSON Data Schema (input and output) in CLAUDE.md (draft)
- [x] User confirms the Payload shape
- [x] Research prior art, log in findings.md
- [x] User approves the Blueprint

## Phase L: Link

- [x] Write the setup steps for the owner: `architecture/google-setup.md`
- [x] Build a minimal probe script per service in `execution/`
- [x] Prove an `api/` function runs alongside `public/` on Vercel
- [x] GitHub and Vercel links green
- [x] Google Cloud project, three APIs, consent screen, test user (steps 1 to 3 of `architecture/google-setup.md`, done in the browser pane)
- [x] OAuth client created and `.env` filled in by the owner
- [x] Sign-in done (`npm run google:auth`), all four scopes granted
- [x] Lead sheet created (`npm run setup:sheet`)
- [x] Calendar probe green
- [x] Sheets probe green
- [ ] **Gmail probe RED. HALT.** The owner's account has no Gmail. Needs the user's decision on how the two emails are sent (see "Decisions", item 6)
- [ ] Put the Google credentials into Vercel's environment variables and prove a deployed function can reach Google
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
- [x] Create the Vercel project `my-website` and link this folder to it with the Vercel CLI
- [x] Verify the production URL with the commands in `architecture/deploy.md` (placeholder page: 200, private files: 404)
- [x] Connect the GitHub repository so a push to `main` deploys
- [ ] **Take the Google app out of Testing** (publish it, or make it Internal) and sign in again. Otherwise bookings stop 7 days after each sign-in
- [ ] Move to production
- [ ] Set up and document any other triggers
- [ ] Finalize the Maintenance Log in CLAUDE.md
