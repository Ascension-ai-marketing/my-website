# SOP: Deploy to Vercel

## Goal

Every push to `main` on GitHub puts the contents of `public/` live on Vercel. Nothing else in the repository is ever served.

## Inputs

- The GitHub repository `Ascension-ai-marketing/my-website` (private), branch `main`.
- The Vercel project `my-website`, linked to that repository.
- `vercel.json` at the project root.
- The site files in `public/`.

## How it works

1. A commit is pushed to `main`.
2. Vercel's Git integration sees the push and starts a production deployment. No script runs on this machine.
3. `vercel.json` sets `outputDirectory` to `public`, so Vercel serves that folder only.
4. Pushes to any other branch produce a preview deployment instead of production.

There is no deploy script in `execution/`. The push is the trigger.

## Rules

- Only `public/` is published. `CLAUDE.md`, `memory/`, `architecture/` and `execution/` hold private planning and must stay outside `public/`.
- Do not remove `outputDirectory` from `vercel.json`. Without it, Vercel could serve the repository root and expose the private files.
- Secrets go in Vercel's environment variables, never in `public/` and never in git.

## Verify

After a push, confirm the deployment is READY in Vercel, then check the live page and that a private file is not served:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://<production-url>/
curl -s -o /dev/null -w "%{http_code}\n" https://<production-url>/CLAUDE.md
```

Expected: `200` for the first, `404` for the second.

## Edge cases

- **SSH push fails on this machine** (`Permission denied (publickey)`). The remote uses HTTPS with the GitHub CLI sign-in. See `memory/findings.md`.
- **Vercel CLI is not installed.** Not needed: deployments come from the Git integration.

## Lessons

None yet. When a deployment fails, the cause and fix are written here.
