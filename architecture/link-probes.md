# SOP: Link probes (Phase L)

## Goal

Prove that every external service the booking system depends on responds, using the real credentials, before any business logic is written. A broken link halts the build.

## Links to prove

| Link | Probe | Side effect | Green means |
| --- | --- | --- | --- |
| GitHub push | `git push` | none | Push accepted, `git ls-remote` matches local |
| Vercel deploy | `npm run probe:vercel -- <base-url>` | none | `/` is 200, `/api/health` is 200 with `ok: true`, private files are 404 |
| Google sign-in | `npm run google:auth` (once) | writes `GOOGLE_REFRESH_TOKEN` to `.env` | A refresh token is stored |
| Google Calendar | `npm run probe:calendar` | none (read only) | Free/busy query for the next 24 hours succeeds on the owner's calendar |
| Google Sheets | `npm run probe:sheets` | none (read only) | The lead sheet's title is returned |
| Email (Proton SMTP) | `npm run probe:email` | **sends one email** from the owner to the owner | Proton accepts the sign-in and the message |
| Credentials in Vercel | `npm run vercel:env`, then `/api/link-check` on a preview | sets environment variables in Vercel | The deployed function reports calendar, sheets and email all green |

## Inputs

All in `.env` (see `.env.example`). Nothing is read from anywhere else.

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: the OAuth client, from `architecture/google-setup.md`.
- `GOOGLE_REFRESH_TOKEN`: written by `npm run google:auth`.
- `GOOGLE_CALENDAR_ID`: `primary`, the signed-in account's main calendar. The owner's email address does not work as the id for this account (see Lessons). To still catch a sign-in with the wrong Google account, the calendar check also reads the primary calendar's name and fails unless it equals `OWNER_EMAIL`.
- `OWNER_EMAIL`: `zack@ascension-marketing.ca`. The email probe sends only to this address.
- `LEAD_SHEET_ID`: the id of the lead sheet, written by `npm run setup:sheet`.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`: `smtp.protonmail.ch`, `587`, the owner's address. Not secrets.
- `SMTP_TOKEN`: the Proton SMTP token, from `architecture/email-setup.md`. Secret.

## Tool logic

- The checks live in `execution/lib/link_checks.js`, one function per service, each returning a one-line description or throwing. The local probes and the deployed `/api/link-check` call the same functions, so "green locally" and "green on Vercel" test the same thing.
- `execution/lib/google_auth.js` exchanges the refresh token for a short-lived access token. Every Google check calls it first. It also checks that the token carries the scope the check needs and names the missing scope if not.
- `execution/lib/smtp.js` builds the mail transport from the `SMTP_*` values (port 587, STARTTLS required). It is the only place that talks to Proton.
- Each probe prints one line starting with `GREEN` or `RED` and exits 0 or 1.
- Probes never print a credential, a token, or calendar event details.
- `execution/google_oauth_setup.js` runs the one-time Google sign-in: it opens a listener on `127.0.0.1`, prints a Google consent link, receives the code, and writes the refresh token into `.env`. The token is never printed.
- `execution/setup_lead_sheet.js` (`npm run setup:sheet`) creates the lead sheet once, as the signed-in owner: a spreadsheet named `Website Leads` with one tab, `Leads`, whose first row is the column list from the Data Schema in `CLAUDE.md`. It writes the new sheet's id into `.env` as `LEAD_SHEET_ID`. It refuses to run if `LEAD_SHEET_ID` is already set, so it can never create a second sheet by accident.
- `execution/env_paste.js` (`npm run env:paste -- NAME`) saves whatever is on the clipboard into `.env` as `NAME=value`, without showing it. It exists because hand-editing `.env` went wrong once (see `architecture/google-setup.md`, Lessons). It only accepts the secret names listed in the tool.
- `execution/vercel_env_push.js` (`npm run vercel:env`) copies the values the deployed functions need from `.env` into Vercel's environment variables for Production and Preview, as secrets, through the Vercel CLI. It prints names only. The owner runs it; Claude does not.
- `api/health.js` is a thin handler. It imports `execution/health.js`, which proves that Vercel functions can load code from `execution/`.
- `api/link-check.js` is a thin handler that runs the read-only checks (calendar, sheets, email sign-in without sending) inside Vercel and returns `GREEN`/`RED` per service. It answers 404 on the production site, so it is only reachable on preview deployments, which are behind Vercel sign-in.

## Google scopes

Requested once, at sign-in. Changing this list means signing in again.

- `https://www.googleapis.com/auth/calendar.events`: create the booking event.
- `https://www.googleapis.com/auth/calendar.freebusy`: read availability.
- `https://www.googleapis.com/auth/spreadsheets`: append the lead row.

`gmail.send` was removed on 2026-10-02 (see Lessons). The sign-in made that day still carries it; the next sign-in will not.

## Edge cases

- **Missing `.env` value:** the probe prints `RED` and names the missing variable. It makes no network call.
- **`invalid_grant` on token refresh:** the refresh token was revoked or expired. The usual cause is an OAuth app left in "Testing" (tokens die after 7 days). Fix the app's publishing status, then run `npm run google:auth` again.
- **No refresh token returned at sign-in:** Google only returns one on first consent. The setup tool always asks for consent again (`prompt=consent`) to avoid this.
- **Email probe sends a real message.** It goes to `OWNER_EMAIL` only. The deployed link check only signs in to Proton and sends nothing.
- **Proton rejects the sign-in (`535`):** the SMTP token is wrong, was deleted in Proton, or belongs to a different address than `SMTP_USER`. Generate a new token and save it with `npm run env:paste -- SMTP_TOKEN`.
- **Preview deployments are behind Vercel sign-in.** Use `vercel curl <path> --deployment <url>` to reach them.
- **A pushed branch did not get a preview deployment** (seen once, 2026-10-02). `vercel deploy` from the branch creates one.

## Lessons

- **2026-10-02: the calendar probe failed with `notFound` although the sign-in used the right account.** Free/busy for the id `zack@ascension-marketing.ca` returns `notFound`; the id `primary` works and that calendar's name is `zack@ascension-marketing.ca`. Fix: `GOOGLE_CALENDAR_ID=primary`, and the check compares the calendar's name with `OWNER_EMAIL` instead.
- **2026-10-02: the Gmail probe failed with `400 FAILED_PRECONDITION, Precondition check failed`.** The signed-in account has no Gmail mailbox: mail for `ascension-marketing.ca` is hosted at Proton Mail (MX `mail.protonmail.ch`), so `zack@ascension-marketing.ca` is a Google account without Gmail. The Gmail API cannot send for it. Fix: the user chose to send through Proton's SMTP server instead. The Gmail probe and the `gmail.send` scope were removed. Check a domain's MX records before assuming a Google account has Gmail.
- **2026-10-02: the owner's Google Calendar is set to UTC**, not Toronto time. Every calendar call must pass `America/Toronto` explicitly and never rely on the calendar's own time zone.
