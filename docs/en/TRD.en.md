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

### Pagination (TT-19)

Standard convention for every listing endpoint (HU-05 purchase history, HU-08 movements, HU-10 stock, and any future one): offset/limit, not cursor — simpler and enough at this scale (dozens/hundreds of users, no need to paginate over data that changes in real time).

- **Query params**: `page` (default `1`, minimum `1`) and `pageSize` (default `20`, maximum `100` — the cap stops a client from requesting a huge `pageSize` and turning a listing endpoint into the "noisy neighbor" TT-16 was meant to prevent).
- **Response**: `{ items: T[], total: number, page: number, pageSize: number }`.
- **Shared implementation** in `backend/src/common/`: `dto/pagination-query.dto.ts` (query DTO validated with `class-validator`/`class-transformer`), `dto/paginated-response.dto.ts` (response shape), `utils/pagination.util.ts` (`toPrismaSkipTake()` converts `page`/`pageSize` into Prisma's `skip`/`take`; `buildPaginatedResponse()` builds the response). Every listing module reuses these — pagination logic isn't repeated per use-case.

## 5. Non-functional requirements

| Attribute | Requirement |
|---|---|
| Security | Full OWASP Top 10 checklist — plan, section 4.7 |
| Scalability | From dozens to hundreds of users without a redesign |
| Availability | Acceptable on the free tier for the defined scale |
| Traceability | Every movement/approval recorded immutably |
| Maintainability | Hexagonal architecture, TDD/BDD, documented code conventions |

### DB connection limits and timeouts (TT-16)

Every module shares a single `PrismaClient`/connection pool — without explicit limits, one heavy or poorly written query in a module can exhaust the pool and time out modules unrelated to the problem ("noisy neighbor" inside the same process). Parameters added to `DATABASE_URL` (see `backend/.env.example`):

| Parameter | Value | Why |
|---|---|---|
| `connection_limit` | `5` | Explicit instead of Prisma's default (`physical CPUs × 2 + 1`, host-dependent and unpredictable). Neon free tier: at the minimum autoscaling size (0.25 CU) it allows 104 direct connections, 7 reserved for the superuser → 97 available. 5 leaves generous headroom for a single low-traffic Node process (Iteration 0-1). |
| `pool_timeout` | `10` (seconds) | How long a query waits for a free connection from Prisma's pool before failing — stops a queued query from waiting indefinitely because of another module. |
| `connect_timeout` | `10` (seconds) | Raised from Prisma's default (5s) because of Neon's cold start: the compute can be suspended (scale-to-zero) and take a few seconds to wake on the first connection. |
| `options=-c statement_timeout=10000` | `10000` ms | Postgres-level query timeout (not a native Prisma parameter — passed through `options`, the standard libpq mechanism). Stops a hung query from holding a connection indefinitely. Verified empirically against local Postgres: a `pg_sleep(15)` gets cancelled at ~10s with Postgres' real error (`57014 — canceling statement due to statement timeout`); a 2s query is unaffected. |

Source for the Neon numbers: [Neon's connection pooling docs](https://neon.com/docs/connect/connection-pooling) (max_connections-by-compute-size table, checked 2026-08-13).

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
