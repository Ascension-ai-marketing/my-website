# Findings

Research, discoveries, and constraints. Newest first.

## 2026-10-02: Vercel access

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
