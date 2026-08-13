# CLAUDE.md — Inventory Control System

Read `PROJECT-STATUS.md` first — current phase, what's done, and the immediate next step live there.

`docs/` layout: `docs/esp/` (Spanish), `docs/en/` (English), `docs/Diagrams/` (architecture/flow diagrams), `docs/Design/` (Claude Design reference exports only — the live prototype stays in Claude Design's own workspace, never copy its raw HTML/CSS/JS into `frontend/`).

## Project
Inventory control system (suppliers, locations, inventory, alerts, purchases, requests, RBAC). Single developer, weekends only, adapted Scrumban methodology. Full detail: `docs/esp/PRD.md` / `docs/en/PRD.en.md`.

## Language rule (non-negotiable)
- Code (identifiers, comments, file names, DB schema): English
- UI text visible to the end user: Spanish
- Business docs (`docs/`): both — `docs/esp/` and `docs/en/`, cross-referenced

## Conventions
Full detail in `docs/esp/convenciones.md` / `docs/en/conventions.en.md`. Key points:
- Conventional Commits, English, imperative: `feat(auth): add login endpoint (HU-01)`
- Branching: `main` (protected) / `staging` (protected) / `feature/hu-XX-slug` or `feature/tt-XX-slug`
- Backend: hexagonal architecture per NestJS module (domain/application/infrastructure) — only where real business logic exists, not on trivial CRUDs
- Frontend: Angular standalone components, feature-based, lazy-loaded

## Before making changes
- Check `PROJECT-STATUS.md` for current phase and what's already done
- Check `docs/esp/decisiones.md` (ADRs) before proposing a new technical decision — don't silently contradict one already made
- Don't trust a "done" status at face value. If an item in PROJECT-STATUS.md is marked done but the note doesn't say concretely how it was verified (a command output, a test result, a URL that was actually checked), treat it as unverified and re-check before building on top of it. This project is also worked on from a separate claude.ai/Cowork session with Trello access — that session may have corrected something here after the fact, or discovered that a "done" mark was wrong (this has happened twice already: TT-03 and TT-07 were both marked done without real evidence and had to be reverted). If in doubt, ask the user for the latest sync note instead of assuming this file is fully current.

## After completing a task (TT or HU)
- Update `PROJECT-STATUS.md` yourself, in the same commit as the work — mark the item done, with a one-line note of what was actually verified (not just "done", say how: e.g. "migrate deploy ran clean against staging DB"). This file is the single source of truth other Claude sessions (including claude.ai) read to know the real state — if you don't update it, they won't know what happened here.
- Do NOT touch Trello — no connector available from this environment. Just make sure `PROJECT-STATUS.md` clearly says what changed, so a human or a claude.ai session with Trello connected can sync the board afterward.

## Testing
TDD for critical domain logic (stock calculation, movement validation). BDD (Gherkin, jest-cucumber) for critical business flows (approvals, RBAC, alerts). Full detail: `docs/esp/flujo-de-trabajo.md`.

## Don't
- Don't run `prisma migrate dev` against staging/production — use `migrate deploy`
- Don't commit a real `.env` (only `.env.example`)
- Don't add a third GitHub Actions workflow for CD — deploy is native Vercel/Render auto-deploy (see `docs/esp/plan-inicial-proyecto-inventario.md`, section 9.2), not a workflow file
