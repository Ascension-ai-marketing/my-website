# Task Plan

**Blueprint status:** NOT APPROVED. Discovery in progress.

## Protocol 0: Initialization

- [x] Create `memory/` with task_plan, findings, progress, decisions
- [x] Create `CLAUDE.md` as the Project Constitution
- [x] Create `architecture/`, `execution/`, `.tmp/`, `.env`
- [ ] Execution gate cleared (see CLAUDE.md)

## Phase B: Blueprint

- [ ] 1. North Star
- [ ] 2. Integrations and credential readiness
- [ ] 3. Source of Truth
- [ ] 4. Delivery Payload
- [ ] 5. Behavioral Rules
- [ ] Define the JSON Data Schema (input and output) in CLAUDE.md
- [ ] User confirms the Payload shape
- [ ] Research prior art, log in findings.md
- [ ] User approves the Blueprint

## Phase L: Link

- [ ] Verify every credential and API connection from Phase B
- [ ] Build a minimal probe script per service in `execution/`
- [ ] Every link green before moving on

## Phase A: Architect

- [ ] Write SOPs in `architecture/`
- [ ] Build deterministic tools in `execution/`
- [ ] Wire the navigation layer

## Phase S: Stylize

- [ ] Format the payload for delivery
- [ ] Style any frontend
- [ ] Attach a verify step to every output
- [ ] User sign-off

## Phase T: Trigger

- [x] Repository side of the Vercel deploy: `vercel.json`, `public/`, `architecture/deploy.md` (done early, at the user's request, before the Blueprint)
- [ ] Link the Vercel project to the GitHub repository. BLOCKED: needs the user to give access to their Vercel team (see progress.md)
- [ ] Verify the production URL with the commands in `architecture/deploy.md`
- [ ] Move to production
- [ ] Set up and document any other triggers
- [ ] Finalize the Maintenance Log in CLAUDE.md
