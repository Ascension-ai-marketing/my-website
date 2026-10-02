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
- Tests: the placeholder page was opened locally in the browser pane. No deployment to test yet.
