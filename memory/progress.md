# Progress

What was done, errors hit, tests run, results. Newest first.

## 2026-10-02

- Protocol 0 complete. Created CLAUDE.md, `memory/` (4 files), `architecture/`, `execution/`, `.tmp/`, `.env`, `.gitignore`.
- `execution/` is empty and stays empty until the gate in CLAUDE.md clears.
- Phase B discovery started. Question 1 (North Star) asked, awaiting answer.
- Initialized a local git repository in the project root (branch `main`, no remote) and made the first commit with the scaffold. `.env` and `.tmp/` are ignored. `architecture/` and `execution/` each hold a `.gitkeep` so the empty folders are tracked.
- Created the private GitHub repository `Ascension-ai-marketing/my-website` and pushed `main`.
  - Error: the first push over SSH failed with `Permission denied (publickey)`.
  - Fix: switched `origin` to HTTPS and set a repo-local credential helper (`gh auth git-credential`). No global git config was changed.
  - Verified: `git ls-remote origin` shows `main` at the same commit as local; the repository reports visibility PRIVATE.
- Added the repository side of the Vercel deploy (commit `eb498d2`, pushed): `vercel.json` serving `public/` only, a placeholder `public/index.html`, and `architecture/deploy.md`.
- Tried to link the Vercel project to the GitHub repository. NOT DONE.
  - Error: the Vercel connector returned `403 Not authorized: Trying to access resource under scope "ascensioin"` when creating the project and when listing projects for the team.
  - Tried next: the Vercel dashboard in the built-in browser. It is not signed in, and signing in is the user's step.
  - Not tried: the Vercel CLI. It is not installed and would also need the user to sign in.
  - Result: nothing is deployed. No Vercel project exists. Waiting on the user to give the connector access to the team or to sign in.
- Tests: the placeholder page was opened locally in the browser pane and renders ("Coming soon").
- Vercel linked through the CLI (the user chose this route).
  - Installed the Vercel CLI 62.2.0 with `npm i -g vercel`. The user approved the sign-in twice; both times it signed in as `tools-7405`, team "Ascension AI" (`ascension-ai1`).
  - `vercel link --yes --project my-website` created the project and linked this folder.
  - Error: connecting the GitHub repository failed, on `vercel link` and again on `vercel git connect`: "You need to add a Login Connection to your GitHub account first. (400)". Not fixed; it needs the user. Pushes do not deploy yet.
  - Ran `vercel deploy` expecting a private preview. Vercel promoted it to production because it was the project's first deployment. Lesson written to `architecture/deploy.md`.
  - Verified the live site https://my-website-blue-ten-62.vercel.app: `/` returns 200 with the placeholder; `/CLAUDE.md`, `/memory/task_plan.md`, `/memory/findings.md`, `/architecture/deploy.md`, `/.env`, `/.env.local`, `/vercel.json`, `/.gitignore` all return 404.
  - The connector route stayed closed (same 403) and the built-in browser was not signed in.
- Retried connecting GitHub to Vercel at the user's request. NOT DONE.
  - `vercel git connect --yes` failed three more times with the same error: no GitHub Login Connection on the Vercel account `tools-7405`.
  - The built-in browser still redirects `vercel.com/account/settings/authentication` to the login page, and no Chrome browser is connected to the session, so the connection cannot be added from here.
  - Waiting on the user to sign in to Vercel in the browser pane, or to add the GitHub connection in their own browser.
- GitHub connected to Vercel. The user added the GitHub connection on the Vercel account.
  - `vercel git connect --yes` reported "Ascension-ai-marketing/my-website is already connected to your project".
  - Verified through the Vercel API: the project's link is GitHub `Ascension-ai-marketing/my-website`, production branch `main`.
  - Test push (commit `219a560`): Vercel created a production deployment from the push, but its state was BLOCKED.
  - Error: `seatBlock.blockCode = COMMIT_AUTHOR_REQUIRED`. The commit author `s s <fvr>` matches no GitHub account (GitHub shows no author login for the commit).
  - Patch: set a repo-local git identity for this repository, the GitHub account `Ascension-ai-marketing` with its no-reply email. The global git config was not changed and earlier commits were not rewritten.
  - Lesson written to `architecture/deploy.md`.
  - Retest (commit `36cac71`, authored with the new identity): Vercel deployed it from the push, state READY, target production. GitHub shows the Vercel status "Deployment has completed".
  - Verified live: https://my-website-blue-ten-62.vercel.app now points at that deployment; `/` returns 200 with the placeholder; `/CLAUDE.md`, `/memory/progress.md`, `/architecture/deploy.md`, `/.env`, `/vercel.json` return 404.
  - Deploy-on-push is working.
- Phase B discovery complete. All five questions answered by the user, plus the booking rules (call length, hours, notice, window, time zone, calendar owner, form fields). Answers recorded in CLAUDE.md.
- Data schema drafted in CLAUDE.md. Not confirmed yet.
- Research done and logged in findings.md (service-account limit, 7-day OAuth token expiry, Vercel `api/` requirement).
- Blueprint written in task_plan.md with six open decisions. Waiting for the user's approval. `execution/` is still empty.
