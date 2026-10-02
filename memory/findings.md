# Findings

Research, discoveries, and constraints. Newest first.

## 2026-10-02: Research for the booking system

- **A Google service account cannot do this job.** The Calendar API refuses with "Service accounts cannot invite attendees without Domain-Wide Delegation of Authority". Inviting the visitor as a guest is part of the payload, so the system must act as the calendar owner through OAuth (a stored refresh token), or use a service account with domain-wide delegation set up by a Google Workspace admin. Sources: https://support.google.com/calendar/thread/299552457 and https://stackoverflow.com/questions/78580627
- **OAuth refresh tokens die after 7 days if the Google Cloud app is left in "Testing".** This applies to apps with an External user type. Fix: set the app to "In production", or use the Internal user type if `ascension-marketing.ca` is a Google Workspace domain. Sources: https://stackoverflow.com/questions/69459141 and https://developers.google.com/google-ads/api/docs/get-started/common-errors
- **Vercel only runs functions from an `api/` folder at the project root** (Vercel docs, error list: function patterns must target `api/`). The protocol puts scripts in `execution/`. Both can hold: `api/` contains thin handlers that call the deterministic modules in `execution/`.
- **Not verified yet:** that `api/` functions work alongside `outputDirectory: public` in this project. To be proven with a probe in Phase L.
- **Not verified yet:** whether `zack@ascension-marketing.ca` is a Google Workspace account. It decides which OAuth setup applies.
- **To check before launch:** Vercel's Hobby plan is described as for personal, non-commercial use. A business site that books sales calls may need the Pro plan. I have not confirmed this against Vercel's current terms.

## 2026-10-02: Vercel, after linking

- **There are two Vercel accounts.** The CLI is signed in as `tools-7405` (team "Ascension AI", slug `ascension-ai1`, Hobby). The project `my-website` lives there. The Vercel connector in Claude is signed in to a different account (below) and cannot see or manage this project.
- **The Vercel account has no GitHub connection**, so the repository cannot be connected for deploy-on-push until the user adds one.
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
