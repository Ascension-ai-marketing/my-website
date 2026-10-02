# SOP: Deploy to Vercel

## Goal

Put the site live on Vercel: the pages in `public/` and the functions in `api/` (reachable under `/api/`). No other file in the repository is ever served.

## Inputs

- The Vercel project `my-website` in the team "Ascension AI" (`ascension-ai1`), Hobby plan, owned by the Vercel account `tools-7405`.
- The local link in `.vercel/` (ignored by git), created by `vercel link`.
- `vercel.json` at the project root.
- The site files in `public/`.
- The GitHub repository `Ascension-ai-marketing/my-website` (private), branch `main`.

## Production URLs

- https://my-website-blue-ten-62.vercel.app (public)
- https://my-website-ascension-ai1.vercel.app (redirects to Vercel sign-in)

## How it works: deploy on push

The Vercel project is connected to the GitHub repository (since 2026-10-02), with `main` as the production branch.

1. A commit is pushed to `main`.
2. Vercel's Git integration starts a production deployment. No script runs on this machine.
3. `vercel.json` sets `outputDirectory` to `public`, so Vercel serves that folder only.
4. A push to any other branch produces a preview deployment instead of production.

**Every push to `main` goes public, including commits that only change the planning files.** Those files are not served, but the site is rebuilt each time.

## Fallback: manual deploy from this machine

If the Git integration is unavailable, deploy from the project root with the CLI. It must be signed in (`vercel whoami` prints `tools-7405`).

```bash
vercel deploy --prod
```

For a private test build that does not replace production:

```bash
vercel deploy
```

## Rules

- Only `public/` is published as files, and only `api/` as functions. `CLAUDE.md`, `memory/`, `architecture/` and `execution/` are private and must stay outside both.
- New code goes to a branch first. Check its preview deployment with `vercel curl <path> --deployment <url>`, then merge to `main`.
- Never run `vercel deploy` without `.vercelignore` in place; it would upload `.env`.
- Do not remove `outputDirectory` from `vercel.json`. Without it, Vercel could serve the repository root and expose the private files.
- Secrets go in Vercel's environment variables, never in `public/` and never in git.
- A production deployment is public. Changes to `public/` need the user's sign-off before they are pushed to `main`. Work that is not signed off goes on another branch.

## Verify

Confirm the deployment is Ready, then check the live page and that private files are not served:

```bash
vercel ls my-website
curl -s -o /dev/null -w "%{http_code}\n" https://my-website-blue-ten-62.vercel.app/
curl -s -o /dev/null -w "%{http_code}\n" https://my-website-blue-ten-62.vercel.app/CLAUDE.md
```

Expected: status Ready, then `200`, then `404`.

## Edge cases

- **SSH push to GitHub fails on this machine** (`Permission denied (publickey)`). The remote uses HTTPS with the GitHub CLI sign-in. See `memory/findings.md`.
- **Two Vercel accounts exist.** The CLI and this project use `tools-7405` (team "Ascension AI"). The Vercel connector in Claude is signed in to a different account (`adminascensionmarketing-2247`, team "ascensioin") and cannot see this project.
- **`vercel link` writes `.env.local`** containing a short-lived Vercel token, and adds `.vercel` and `.env*` to `.gitignore`. Both stay out of git.

## Lessons

- **2026-10-02: `vercel deploy` uploaded `.env` with the deployment's source files.** The CLI does not read `.gitignore`. Four CLI deployments (`7afvlgac0`, `6iqjqo8k2`, `g65hfhckc`, `ctkao016z`) contain `src/.env`; the last three hold real secrets. The file is not served to the public (`/.env` is 404), but anyone with access to the Vercel account can read deployment source. Fix: `.vercelignore` now excludes `.env`, `.env.*`, `.vercel`, `.tmp` and `node_modules`. Tested on 2026-10-02 from a scratch copy with dummy env files: only `.vercelignore`, `public/index.html` and `vercel.json` were uploaded. Rules from now on: prefer previews made by `git push` (they contain only committed files); keep `.vercelignore` in place before any `vercel deploy`.

- **2026-10-02: Vercel blocks a push deployment when it cannot tell who authored the commit.** The first push after connecting GitHub produced a deployment in state BLOCKED with the code `COMMIT_AUTHOR_REQUIRED`. The commit was authored as `s s <fvr>` (this machine's global git identity), which GitHub cannot match to any account. Fix: this repository now has its own git identity, the GitHub account `Ascension-ai-marketing` with its GitHub no-reply email, set with `git config --local`. Commits to this repository must keep an author email that belongs to that GitHub account, or the deployment is blocked again. Check with `git config user.email` before committing from a new clone.

- **2026-10-02: a project's first deployment is promoted to production even without `--prod`.** `vercel deploy` was run expecting a private preview; Vercel assigned the production domains to it because the project had no production deployment yet. Only the placeholder page went public and the private files returned 404, so nothing leaked. For a new project, assume the first deployment is public.
