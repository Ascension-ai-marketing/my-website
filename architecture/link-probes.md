# SOP: Link probes (Phase L)

## Goal

Prove that every external service the booking system depends on responds, using the real credentials, before any business logic is written. A broken link halts the build.

## Links to prove

| Link | Probe | Side effect | Green means |
| --- | --- | --- | --- |
| GitHub push | `git push` | none | Push accepted, `git ls-remote` matches local |
| Vercel deploy | `npm run probe:vercel -- <base-url>` | none | `/` is 200, `/api/health` is 200 with `ok: true`, private files are 404 |
| Google sign-in | `npm run google:auth` (once) | writes `GOOGLE_REFRESH_TOKEN` to `.env` | A refresh token is stored |
| Google Calendar | `npm run probe:calendar` | none (read only) | Free/busy query for the next 24 hours succeeds |
| Gmail | `npm run probe:gmail` | **sends one email** from the owner to the owner | Gmail returns a message id |
| Google Sheets | `npm run probe:sheets` | none (read only) | The lead sheet's title is returned |

## Inputs

All in `.env` (see `.env.example`). Nothing is read from anywhere else.

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: the OAuth client, from `architecture/google-setup.md`.
- `GOOGLE_REFRESH_TOKEN`: written by `npm run google:auth`.
- `GOOGLE_CALENDAR_ID`: `primary`, the signed-in account's main calendar. The owner's email address does not work as the id for this account (see Lessons). To still catch a sign-in with the wrong Google account, the calendar probe also reads the primary calendar's name and fails unless it equals `OWNER_EMAIL`.
- `OWNER_EMAIL`: `zack@ascension-marketing.ca`. The Gmail probe sends only to this address.
- `LEAD_SHEET_ID`: the id of the lead sheet.

## Tool logic

- `execution/lib/google_auth.js` exchanges the refresh token for a short-lived access token. Every Google probe calls it first. It also checks that the token carries the scope the probe needs and names the missing scope if not.
- Each probe makes exactly one API call, prints one line starting with `GREEN` or `RED`, and exits 0 or 1.
- Probes never print a credential, a token, or calendar event details.
- `execution/google_oauth_setup.js` runs the one-time sign-in: it opens a listener on `127.0.0.1`, prints a Google consent link, receives the code, and writes the refresh token into `.env`. The token is never printed.
- `execution/setup_lead_sheet.js` (`npm run setup:sheet`) creates the lead sheet once, as the signed-in owner: a spreadsheet named `Website Leads` with one tab, `Leads`, whose first row is the column list from the Data Schema in `CLAUDE.md`. It writes the new sheet's id into `.env` as `LEAD_SHEET_ID`. It refuses to run if `LEAD_SHEET_ID` is already set, so it can never create a second sheet by accident.
- `api/health.js` is a thin handler. It imports `execution/health.js`, which proves that Vercel functions can load code from `execution/`.

## Scopes

Requested once, at sign-in. Changing this list means signing in again.

- `https://www.googleapis.com/auth/calendar.events`: create the booking event.
- `https://www.googleapis.com/auth/calendar.freebusy`: read availability.
- `https://www.googleapis.com/auth/gmail.send`: send the two emails. Cannot read mail.
- `https://www.googleapis.com/auth/spreadsheets`: append the lead row.

## Edge cases

- **Missing `.env` value:** the probe prints `RED` and names the missing variable. It makes no network call.
- **`invalid_grant` on token refresh:** the refresh token was revoked or expired. The usual cause is an OAuth app left in "Testing" (tokens die after 7 days). Fix the app's publishing status, then run `npm run google:auth` again.
- **No refresh token returned at sign-in:** Google only returns one on first consent. The setup tool always asks for consent again (`prompt=consent`) to avoid this.
- **Gmail probe:** `gmail.send` allows nothing but sending, so the only possible probe is a real send. It goes to `OWNER_EMAIL` only.
- **Preview deployments are behind Vercel sign-in.** Use `vercel curl <path> --deployment <url>` instead of the Vercel probe for those.

## Lessons

- **2026-10-02: the calendar probe failed with `notFound` although the sign-in used the right account.** Free/busy for the id `zack@ascension-marketing.ca` returns `notFound`; the id `primary` works and that calendar's name is `zack@ascension-marketing.ca`. Fix: `GOOGLE_CALENDAR_ID=primary`, and the probe checks the calendar's name against `OWNER_EMAIL` instead.
- **2026-10-02: the Gmail probe failed with `400 FAILED_PRECONDITION, Precondition check failed`.** The signed-in account has no Gmail mailbox: mail for `ascension-marketing.ca` is hosted at Proton Mail (MX `mail.protonmail.ch`), so `zack@ascension-marketing.ca` is a Google account without Gmail. The Gmail API cannot send for it, and no code change fixes that. The Gmail link stays RED until the email integration is changed. Check the domain's MX records before assuming a Google account has Gmail.
- **2026-10-02: the owner's Google Calendar is set to UTC**, not Toronto time. Every calendar call must pass `America/Toronto` explicitly and never rely on the calendar's own time zone.
