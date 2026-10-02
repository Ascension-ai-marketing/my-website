# Decisions

Architectural choices and the reason behind each. Newest first.

## 2026-10-02: Node with no dependencies

- **Choice:** Tools are plain Node (ES modules) and call Google's REST APIs with the built-in `fetch`. No `googleapis` package, no other dependencies.
- **Why:** Four simple HTTPS calls do not justify a large SDK. Nothing to install, nothing to update, and the functions stay small.

## 2026-10-02: Google scopes

- **Choice:** `calendar.events`, `calendar.freebusy`, `gmail.send`, `spreadsheets`.
- **Why:** Each is the narrowest scope that does the job for Calendar and Gmail. `gmail.send` cannot read mail. For Sheets, the narrower `drive.file` would only work on a sheet the system created itself; `spreadsheets` lets the owner point it at any sheet they make, at the cost of covering all their sheets.
- **Consequence:** changing the list means the owner signs in again.

## 2026-10-02: Calendar named by email, not `primary`

- **Choice:** `GOOGLE_CALENDAR_ID` is the owner's email address.
- **Why:** If the sign-in is done with the wrong Google account, the probe fails instead of silently using the wrong calendar.

## 2026-10-02: Phase L work goes through a preview branch first

- **Choice:** New code is pushed to a branch, checked on its private preview deployment, then merged to `main`.
- **Why:** Every push to `main` is public immediately. The preview catches a broken build or an exposed file before it reaches production.

## 2026-10-02: Architecture decisions approved with the Blueprint

Approved by the user on 2026-10-02.

- **Google access by OAuth as the calendar owner, not a service account.** Why: a service account cannot invite guests without domain-wide delegation, and the guest invite is part of the payload.
- **`api/` holds thin handlers, `execution/` holds the logic.** Why: Vercel only runs functions from `api/`, and the protocol requires deterministic tools in `execution/`.
- **Google Calendar is the source of truth; the sheet is a log.** Why: the user's answer. The sheet is never read to decide availability.

## 2026-10-02: Vercel serves `public/` only

- **Choice:** `vercel.json` sets `outputDirectory` to `public`. The site lives in `public/`; everything else in the repository is never published.
- **Why:** The repository root holds private planning files (`CLAUDE.md`, `memory/`, `architecture/`). With no output directory set, Vercel can serve the root as static files, which would make them public.

## 2026-10-02: Deploy with the Vercel CLI until GitHub is connected

- **Choice:** The project was created and linked with the Vercel CLI, under the account the user signed in with (`tools-7405`, team "Ascension AI"). Deploys are run by hand with `vercel deploy --prod`.
- **Why:** The user picked the CLI route after the connector was refused for its team. Deploy-on-push is still the goal but needs a GitHub connection on the Vercel account.

## 2026-10-02: Deploy by Git push, no deploy script

- **Choice:** Deployment is meant to be triggered by pushing to `main` through Vercel's Git integration. There is no deploy script in `execution/`.
- **Why:** It is the simplest mechanism. It also keeps `execution/` empty while the Blueprint gate is locked.
- **Status:** in effect since 2026-10-02, after the user added a GitHub connection to the Vercel account. The CLI stays as a fallback.

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
