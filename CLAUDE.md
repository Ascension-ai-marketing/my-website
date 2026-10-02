# Project Constitution

This project is built with the B.L.A.S.T. protocol (Blueprint, Link, Architect, Stylize, Trigger) and the A.N.T. 3-layer build (Architecture, Navigation, Tools). Reliability over speed. Never guess at business logic.

## State

- **Current phase:** B — Blueprint (discovery in progress)
- **Execution gate:** LOCKED. No logic may be written in `execution/` until all three are true:
  - [ ] All five Blueprint discovery questions are answered
  - [ ] The Data Schema below is defined and the Payload shape is confirmed
  - [ ] `memory/task_plan.md` has an approved Blueprint

## Blueprint (Phase B)

| Question | Answer |
| --- | --- |
| North Star | _unanswered_ |
| Integrations | _unanswered_ |
| Source of Truth | _unanswered_ |
| Delivery Payload | _unanswered_ |
| Behavioral Rules | _unanswered_ |

## Data Schema

Not defined yet. Filled in once discovery is complete, before any code.

### Input shape

```json
{}
```

### Output (Payload) shape

```json
{}
```

## Behavioral Rules

Not defined yet (Blueprint question 5).

## Architectural Invariants

- Business logic is deterministic and lives in `execution/` as atomic, testable scripts.
- Every script in `execution/` has a matching SOP in `architecture/`. If logic changes, the SOP is updated before the code.
- The navigation layer only routes between SOPs and tools. It does not do complex work itself.
- Credentials live in `.env` and nowhere else. `.env` is never committed or printed.
- All intermediate files go through `.tmp/`. Nothing in `.tmp/` is a deliverable.
- The project is complete only when the Payload lands at its final destination.
- Every output ships with a test, screenshot, or one-line verify command.

## Operating Principles

1. Data-First: input and output shape are defined before code runs.
2. Surgical Changes: touch only what was asked.
3. Simplicity First: minimum logic, no speculative abstractions.
4. Goal-Driven: every change is measured against the North Star and a verify step.
5. Per-Task Rhythm: explore, plan, code, commit. No skipping.

## Link (Phase L)

No integrations verified yet. Results are logged in `memory/progress.md`.

## Architect (Phase A)

- SOPs: `architecture/deploy.md` (deploy to Vercel).
- Tools: none yet. `execution/` is empty.

## Stylize (Phase S)

No payload formatting defined yet.

## Trigger (Phase T)

| Trigger | Fires when | Does | Status |
| --- | --- | --- | --- |
| Vercel deploy | A commit is pushed to `main` on GitHub (`Ascension-ai-marketing/my-website`) | Vercel publishes `public/` to production | NOT LIVE. The repository side is ready. The Vercel project is not linked yet (see `memory/progress.md`). |

Details and the verify commands are in `architecture/deploy.md`. Only `public/` is ever served; the planning files at the root stay private.

## Maintenance Log

Empty. When something fails, follow the repair loop: analyze the error, patch the script in `execution/`, test the fix, then write the lesson into the matching SOP in `architecture/`.

## File Structure

```
├── CLAUDE.md        # This file: constitution and state
├── .env             # Credentials (verified in Phase L)
├── vercel.json      # Tells Vercel to serve public/ only
├── public/          # The site. The only folder that is published
├── memory/          # task_plan.md, findings.md, progress.md, decisions.md
├── architecture/    # Layer A: SOPs
├── execution/       # Layer T: scripts
└── .tmp/            # Temporary workbench
```
