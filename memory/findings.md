# Findings

Research, discoveries, and constraints. Newest first.

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
- The CLI ignores `.env` files when uploading, and `vercel link` adds `.vercel` and `.env*` to `.gitignore`.

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
