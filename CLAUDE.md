# CLAUDE.md — Inventory Control System

Read `PROJECT-STATUS.md` first — current phase, what's done, and the immediate next step live there.

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
- Reflect any HU/TT worked on in the Trello board too: https://trello.com/b/BS5tzENy/sistema-de-control-de-inventario (not automated from here — update manually or from a claude.ai session with the Trello connector)

## Testing
TDD for critical domain logic (stock calculation, movement validation). BDD (Gherkin, jest-cucumber) for critical business flows (approvals, RBAC, alerts). Full detail: `docs/esp/flujo-de-trabajo.md`.

## Don't
- Don't run `prisma migrate dev` against staging/production — use `migrate deploy`
- Don't commit a real `.env` (only `.env.example`)
- Don't add a third GitHub Actions workflow for CD — deploy is native Vercel/Render auto-deploy (see `docs/esp/plan-inicial-proyecto-inventario.md`, section 9.2), not a workflow file
