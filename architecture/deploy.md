# SOP: Deploy to Vercel

## Goal

Put the contents of `public/` live on Vercel. Nothing else in the repository is ever served.

## Inputs

- The Vercel project `my-website` in the team "Ascension AI" (`ascension-ai1`), Hobby plan, owned by the Vercel account `tools-7405`.
- The local link in `.vercel/` (ignored by git), created by `vercel link`.
- `vercel.json` at the project root.
- The site files in `public/`.
- The GitHub repository `Ascension-ai-marketing/my-website` (private), branch `main`.

## Production URLs

- https://my-website-blue-ten-62.vercel.app (public)
- https://my-website-ascension-ai1.vercel.app (redirects to Vercel sign-in)

## How it works today: manual deploy from this machine

Pushing to GitHub does **not** deploy yet (see "Not connected yet"). To deploy, run from the project root:

```bash
vercel deploy --prod
```

For a private test build that does not replace production:

```bash
vercel deploy
```

`vercel.json` sets `outputDirectory` to `public`, so Vercel serves that folder only. The CLI must be signed in (`vercel whoami` prints `tools-7405`).

## Not connected yet: deploy on push

The intended trigger is a push to `main`. `vercel git connect` fails with "You need to add a Login Connection to your GitHub account first". The Vercel account has no GitHub connection. The user has to add one in Vercel under Account Settings, Authentication, then give Vercel's GitHub app access to the repository. After that, run:

```bash
vercel git connect --yes
```

Once it succeeds, update this SOP and the Trigger table in `CLAUDE.md`.

## Rules

- Only `public/` is published. `CLAUDE.md`, `memory/`, `architecture/` and `execution/` hold private planning and must stay outside `public/`.
- Do not remove `outputDirectory` from `vercel.json`. Without it, Vercel could serve the repository root and expose the private files.
- Secrets go in Vercel's environment variables, never in `public/` and never in git.
- A production deployment is public. Get the user's sign-off before running `vercel deploy --prod`.

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

- **2026-10-02: a project's first deployment is promoted to production even without `--prod`.** `vercel deploy` was run expecting a private preview; Vercel assigned the production domains to it because the project had no production deployment yet. Only the placeholder page went public and the private files returned 404, so nothing leaked. For a new project, assume the first deployment is public.
