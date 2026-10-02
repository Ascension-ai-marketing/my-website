# Findings

Research, discoveries, and constraints. Newest first.

## 2026-10-02: Phase S, starting point

- **The current website at `ascension-marketing.ca` does not load over HTTPS.** The domain points at Wix (A record `185.230.63.107`, `www` to `pointing.wixdns.net`), `http://` redirects to `https://`, and the HTTPS connection fails at the TLS handshake (seen from curl and from Firecrawl). It is not a usable source for site content. Not investigated further.
- No site content exists anywhere in the project. `public/index.html` is still the placeholder.

## 2026-10-02: Phase A, live test

- **Google Meet links can be created through the API on this account** (a Google account without Workspace or Gmail). The link came back in the insert response.
- **A booking takes about 7.5 seconds on the server.** A refusal takes 1 to 160 ms. The slot list takes about half a second.
- **Deliverability:** the confirmation sent from `zack@ascension-marketing.ca` through Proton landed in a Gmail inbox, not spam.
- **Google's invitation reaches a first-time Gmail visitor as "Invitation from an unknown sender"**, and the event is not added to their calendar until they respond.
- **Holidays are not known to the system.** Monday 2026-10-12 (Thanksgiving) is offered because the calendar has nothing on it.
- Vercel functions: Fluid compute, 300-second default limit, region `iad1`. `api/book.js` is capped at 180 seconds, `api/slots.js` at 30.
- `vercel curl <path> --deployment <url> -- -X POST -H ... -d ...` passes curl options through, so protected previews can be tested with POST requests.

## 2026-10-02: Email through Proton

- Proton's SMTP submission: host `smtp.protonmail.ch`, port 587, STARTTLS, username is the address, password is an SMTP token generated under Settings, All settings, IMAP/SMTP, SMTP tokens. Available on paid Proton Mail plans with a custom domain address. The token is shown once. Messages sent this way appear in the Sent folder. Source: https://proton.me/support/smtp-submission
- Verified: the server answers `220` on port 587 from this machine and from a Vercel function (preview deployment). It advertises STARTTLS.
- The domain's DNS is at GoDaddy (`domaincontrol.com` nameservers); the current website is on Wix. SPF authorizes Proton only; DMARC is `p=quarantine` with relaxed alignment. Sending through Proton passes all of these without DNS changes. Any other sender (such as Resend) would need new DNS records.
- The user confirmed the Google Calendar on `zack@ascension-marketing.ca` is the calendar they actually use.
- Vercel: `vercel env add NAME production,preview --force --yes` with the value on stdin works without prompts. A pushed branch once did not get a preview deployment; `vercel deploy` made one (and uploaded `.env`; see the correction above).
- Vercel functions on this project use Fluid compute, region `iad1`, default time limit 300 seconds.

## 2026-10-02: Probe results with real credentials

- **`zack@ascension-marketing.ca` is a Google account without Gmail.** Mail for `ascension-marketing.ca` is hosted at Proton Mail (MX `mail.protonmail.ch`, SPF `include:_spf.protonmail.ch`). The Gmail API answers every send with `400 FAILED_PRECONDITION, Precondition check failed`. The Blueprint's "emails via Gmail" cannot be delivered from this account. This is a constraint on the Blueprint, not a bug.
- It is also not a Google Workspace account, which is why the Internal audience needed the separate `zack-org` organization.
- The owner's primary Google Calendar is named `zack@ascension-marketing.ca`, its time zone is **UTC**, and it showed 0 busy blocks for the next 24 hours. Free/busy must be queried with the id `primary`; the email address as id returns `notFound`.
- An empty calendar set to UTC suggests it may not be the calendar the owner uses day to day. If appointments are kept elsewhere (for example Proton Calendar), the system cannot see them and will offer those times as free. To confirm with the user.
- Lead sheet: id `13gsPmKXpL60KbVXx8-iFEFgSPSdwIvVDvw2A9PMsjeM`, in `zack@ascension-marketing.ca`'s Drive, tab `Leads`, header row verified equal to the schema's column order.
- OAuth client id (not a secret): `593931525403-4c23vb675ijk6gsneelv29nmug4edqe2.apps.googleusercontent.com`. The client secret and refresh token are only in `.env`.

## 2026-10-02: Google Cloud setup

- The browser pane is signed in to two Google accounts. `admin.ascension.marketing@gmail.com` is account 0 and `zack@ascension-marketing.ca` is account 1 (`?authuser=1` in Google Cloud URLs).
- `zack@ascension-marketing.ca` belongs to a Google Cloud organization named `zack-org` and has a free-trial billing account ("My Billing Account"). A project created inside the organization gets the billing account attached; a project with "No organization" has none.
- The Internal audience is only available to a project inside an organization. The project for this system has none, so it is External.
- **Google no longer lets a fresh External app be published.** Publish app stays disabled with "you must complete your configuration on the Branding page". The app is in Testing, which means the 7-day sign-in expiry applies. This contradicts the plan in the entry below ("set the app to In production") until the Branding page is filled in.
- The account already had two projects created by the user earlier the same day: "My First Project" (Gmail, Calendar and Drive APIs enabled) and "calander hosting". Neither is used.

## 2026-10-02: Phase L, Vercel functions

- **Proven:** a function in `api/` runs alongside `outputDirectory: public` and can import from `execution/`. Files in `execution/`, `package.json` and the planning folders are still not served. This closes the "not verified yet" item below.
- Adding `package.json` (no dependencies, no build script) did not change what Vercel serves.
- Preview deployments (any branch other than `main`) are behind Vercel sign-in: an anonymous request gets a 302. The production address `my-website-blue-ten-62.vercel.app` is public.
- **`vercel curl` creates a protection-bypass secret on the project** the first time it is used ("automation bypass" in the project's Deployment Protection settings). Anyone holding that secret can open protected previews. It can be revoked there; `vercel curl` would create a new one on next use.
- `.gitignore` as written by `vercel link` (`.env*`) also ignored `.env.example`. An exception line was added so the template is tracked.

## 2026-10-02: Research for the booking system

- **A Google service account cannot do this job.** The Calendar API refuses with "Service accounts cannot invite attendees without Domain-Wide Delegation of Authority". Inviting the visitor as a guest is part of the payload, so the system must act as the calendar owner through OAuth (a stored refresh token), or use a service account with domain-wide delegation set up by a Google Workspace admin. Sources: https://support.google.com/calendar/thread/299552457 and https://stackoverflow.com/questions/78580627
- **OAuth refresh tokens die after 7 days if the Google Cloud app is left in "Testing".** This applies to apps with an External user type. Fix: set the app to "In production", or use the Internal user type if `ascension-marketing.ca` is a Google Workspace domain. Sources: https://stackoverflow.com/questions/69459141 and https://developers.google.com/google-ads/api/docs/get-started/common-errors
- **Vercel only runs functions from an `api/` folder at the project root** (Vercel docs, error list: function patterns must target `api/`). The protocol puts scripts in `execution/`. Both can hold: `api/` contains thin handlers that call the deterministic modules in `execution/`.
- **Not verified yet:** that `api/` functions work alongside `outputDirectory: public` in this project. To be proven with a probe in Phase L.
- **Not verified yet:** whether `zack@ascension-marketing.ca` is a Google Workspace account. It decides which OAuth setup applies.
- **To check before launch:** Vercel's Hobby plan is described as for personal, non-commercial use. A business site that books sales calls may need the Pro plan. I have not confirmed this against Vercel's current terms.

## 2026-10-02: Vercel, after linking

- **There are two Vercel accounts.** The CLI is signed in as `tools-7405` (team "Ascension AI", slug `ascension-ai1`, Hobby). The project `my-website` lives there. The Vercel connector in Claude is signed in to a different account (below) and cannot see or manage this project.
- **The Vercel account had no GitHub connection** at first, which blocked deploy-on-push with "You need to add a Login Connection to your GitHub account first". The user added the connection later on 2026-10-02 and the repository is now connected.
- **The connection must be added on the account that owns the project.** The CLI account `tools-7405` is `tools@ascension-marketing.ca`. The built-in browser pane was signed in as `admin.ascension.marketing@gmail.com`, the other account. Connecting GitHub there would not help this project.
- **GitHub's Authorize button showed as disabled in the browser pane's popup window.** The popup is a sign-in window that Claude cannot inspect or drive. Workaround: do the GitHub authorization in a regular browser.
- **A new project's first deployment is promoted to production** even when run without `--prod`.
- ~~The CLI ignores `.env` files when uploading~~ **Wrong, corrected 2026-10-02:** `vercel deploy` uploads `.env` because the CLI does not read `.gitignore`. Four CLI deployments contain `src/.env` (three with real secrets). `.vercelignore` now prevents it; see `architecture/deploy.md`, Lessons. `vercel link` does add `.vercel` and `.env*` to `.gitignore`, which only affects git.

## 2026-10-02: Vercel access (connector account)

- The Vercel connector in Claude is signed in as `admin.ascension.marketing@gmail.com` (username `adminascensionmarketing-2247`, Hobby plan). The account has no projects yet.
- The account's default team has the slug `ascensioin` (spelled that way in Vercel). The connector is **not authorized for that team**: every team-scoped call returns `403 Not authorized: Trying to access resource under scope "ascensioin"`. Creating or reading projects is impossible until the connector is re-authorized with access to the team.
- The Vercel CLI is not installed on this machine and there is no saved CLI sign-in.
- The built-in browser is not signed in to vercel.com.
- With no framework and no `package.json`, Vercel runs no build and serves static files. `vercel.json` pins the output to `public/`.

## 2026-10-02: The `publish-to-github-vercel` skill

- The skill at `~/.claude/skills/publish-to-github-vercel/SKILL.md` was written for a different person's machine. It names the GitHub account `ItsssssJack` and its Step 8 updates `austin_pool_cleaners_enriched.csv` under `/Users/jackroberts/`. Neither path exists here and no such spreadsheet is on this machine, so Step 8 cannot run as written.
- It recommends public repositories. This project's repository is private, matching the user's other repositories.

## 2026-10-02: Starting environment

- Project root is `~/Desktop/claude/Projects/My websiite/`. The parent `~/Desktop/claude/` holds other unrelated projects, each with its own CLAUDE.md.
- The project root is a local git repository (initialized 2026-10-02, branch `main`). Its remote `origin` is the private GitHub repository https://github.com/Ascension-ai-marketing/my-website.
- Pushing over SSH fails on this machine: the local key `~/.ssh/id_ed25519` is not accepted by GitHub (`Permission denied (publickey)`). The remote uses HTTPS instead, with a repo-local credential helper that reuses the GitHub CLI sign-in.
- Connectors already attached to this Claude session that may matter for Phase L, depending on the Blueprint: Gmail, Google Calendar, Google Drive, Notion, Supabase, Vercel, Wix, Figma, Canva, QuickBooks, Shopify, Firecrawl. None have been tested for this project.
