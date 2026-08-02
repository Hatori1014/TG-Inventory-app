# TRD — Technical Requirements Document

> Source: compiled from `project-plan.en.md`. Versión en español: `TRD.md`.

## 1. Architecture

Modular monolith with hexagonal architecture per module (`domain → application → infrastructure → REST interface`). Microservices ruled out given scale (single developer, dozens of users). Diagrams: `architecture-diagram.png`, `component-diagram.png`, `internal-interaction-diagram.png`, and full detail in the plan, sections 4.1 and 8.

## 2. Technology stack

| Layer | Technology |
|---|---|
| Frontend | Angular 18+ (standalone components), TypeScript, Angular Material |
| Backend | NestJS (Node.js 20+ LTS), TypeScript |
| ORM | Prisma |
| Database | PostgreSQL 16 |
| Auth | JWT + Passport.js |
| File storage | Cloudflare R2 (post-MVP) |
| Hosting | Vercel (frontend) + Render/Fly.io (backend) |
| Managed DB | Neon or Supabase |
| CI/CD | GitHub Actions |
| Proxy/WAF | Cloudflare (free plan) |

Full detail and rationale for each choice: plan, section 4.

## 3. Data model

17 entities — see the full Entity-Relationship model in the plan, section 7, and `schema.prisma` in `backend/prisma/`. Diagram: `mer_sistema_inventario_en.png`.

Key decisions:
- `InventoryMovement` is the source of truth (immutable ledger); `LocationStock` is a derived table updated in the same transaction
- `ApprovalFlow` is configurable (supports 1 or several levels) without needing a schema migration

## 4. API

Full spec of 10 REST modules (Auth, Users/Roles, Suppliers, Locations, Products, Inventory, Alerts, Purchases, Requests, Audit) in the plan, section 7.4 — includes method, route, action, minimum required role, and associated story.

## 5. Non-functional requirements

| Attribute | Requirement |
|---|---|
| Security | Full OWASP Top 10 checklist — plan, section 4.7 |
| Scalability | From dozens to hundreds of users without a redesign |
| Availability | Acceptable on the free tier for the defined scale |
| Traceability | Every movement/approval recorded immutably |
| Maintainability | Hexagonal architecture, TDD/BDD, documented code conventions |

## 6. Security

- RBAC enforced in the backend (never only in the frontend)
- Hashed passwords (bcrypt/argon2), login rate limiting
- Input validation with `class-validator`, parameterized queries (Prisma)
- Forced HTTPS + Helmet (security headers)
- Dependency scanning (Dependabot + `npm audit` in CI)
- Cloudflare as an additional WAF/proxy
- Full risk-by-risk OWASP mitigation checklist: plan, section 4.7

## 7. Testing strategy

| Type | Use | Tool |
|---|---|---|
| TDD | Critical domain logic (stock calculation, movements) | Jest |
| BDD | Critical business flows (approvals, RBAC, alerts) | `jest-cucumber` (Gherkin) |
| E2E | Full user flows | Playwright |

Detail and decision rule (when to use each): plan, section 5.

## 8. Infrastructure and deployment

- **Repository**: monorepo (`backend/`, `frontend/`, `docs/`)
- **Branching**: simplified Gitflow (`main`/`staging`/`feature/*`/`hotfix/*`) — plan, section 9.1
- **CI**: GitHub Actions, lint + type-check + tests + build per PR
- **CD**: native Vercel/Render auto-deploy gated by branch protection
- **Docker**: local Postgres only (development), not production — rationale in plan, section 9.3

## 9. Technical constraints

- 100% free tier: Vercel, Render/Fly.io, Neon/Supabase, and Cloudflare R2 limits apply
- No message queues, no cache (Redis), no WebSockets — not planned for the MVP
- All code (identifiers, comments, DB schema) in English; the user-facing UI stays in Spanish — see `conventions.en.md`
