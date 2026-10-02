# Decisions

Architectural choices and the reason behind each. Newest first.

## 2026-10-02: Vercel serves `public/` only

- **Choice:** `vercel.json` sets `outputDirectory` to `public`. The site lives in `public/`; everything else in the repository is never published.
- **Why:** The repository root holds private planning files (`CLAUDE.md`, `memory/`, `architecture/`). With no output directory set, Vercel can serve the root as static files, which would make them public.

## 2026-10-02: Deploy by Git push, no deploy script

- **Choice:** Deployment is triggered by pushing to `main` through Vercel's Git integration. There is no deploy script in `execution/`.
- **Why:** It is the simplest mechanism and needs nothing installed on this machine. It also keeps `execution/` empty while the Blueprint gate is locked.

## 2026-10-02: Deployment set up before the Blueprint

- **Choice:** The Vercel deploy pipeline was added during Phase B, ahead of Phase T, because the user asked for it.
- **Why:** Explicit user request. It adds configuration and a placeholder page only, no business logic, so the execution gate is not broken.
- **Note:** `public/index.html` is a neutral "Coming soon" placeholder. It contains no business details and is replaced once the Blueprint defines the site.

## 2026-10-02: Project root is `Projects/My websiite/`

- **Choice:** Scaffold inside `~/Desktop/claude/Projects/My websiite/` instead of the session folder `~/Desktop/claude/`.
- **Why:** The session folder holds several separate projects. A CLAUDE.md at its root would load for all of them. The user picked this folder when asked.
- **Note:** The folder name is spelled "websiite". Left as is. Renaming it is the user's call.

## 2026-10-02: `memory/` is project-relative

- **Choice:** The protocol's `/memory/`, `/architecture/`, `/execution/`, `/.tmp/` are read as folders inside the project root, not at the filesystem root.
- **Why:** The protocol's own file tree shows them next to CLAUDE.md.
