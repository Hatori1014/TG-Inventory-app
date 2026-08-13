# Architecture

> Source: `plan-inicial-proyecto-inventario.md`. The code repository doesn't exist yet (pre-Iteration 0) — this document describes the *designed* architecture, not something verified against real code. Versión en español: `arquitectura.md`.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 18+ (standalone components), TypeScript, Angular Material |
| Backend | NestJS (Node.js 20+ LTS), TypeScript |
| ORM | Prisma |
| Database | PostgreSQL 16 |
| Auth | JWT (`@nestjs/jwt`) + Passport.js |
| File storage | Cloudflare R2 (product images — post-MVP) |
| Frontend hosting | Vercel (or Netlify) |
| Backend hosting | Render or Fly.io |
| Managed DB | Neon or Supabase |
| CI/CD | GitHub Actions |
| Proxy/WAF | Cloudflare (free plan) |

## Overall architecture

Modular monolith with hexagonal architecture per module (`domain → application → infrastructure → REST interface`). Microservices were ruled out given the project's scale (dozens of users/locations, a single developer).

**Code language**: everything in English (identifiers, comments, DB table/column names) — see `conventions.en.md`. This `docs/` folder is kept in both Spanish and English.

## Folder map

```
inventario-app/
├── backend/src/modules/{auth,users,roles,suppliers,locations,products,inventory,purchases,requests,audit}/
│   └── each one: domain/ application/use-cases/ infrastructure/ dto/ *.controller.ts *.module.ts
├── backend/src/common/{decorators,guards,filters,interceptors}/
├── backend/src/database/ (Prisma)
├── frontend/src/app/{core,shared,features}/
│   └── features/: one folder per business module (suppliers, locations, products, inventory, alerts, purchases, requests, users-roles), lazy-loaded
└── docs/
```

[PENDING: confirm the real repo structure matches this once it's created in Iteration 0 — TT-01]

## Data flow (designed)

1. Angular sends a request → `auth.interceptor.ts` attaches the JWT
2. The NestJS controller receives it → validates the DTO (`class-validator`) → `JwtAuthGuard` → `RolesGuard`
3. The controller delegates to a **use-case** (application layer)
4. The use-case uses the **repository interface** (port, domain layer) implemented by a **Prisma repository** (adapter, infrastructure layer)
5. Special case — inventory movements: inserting into `InventoryMovement` and updating `LocationStock` happens in the **same Prisma transaction** (`LocationStock` is a derived table, not the source of truth)

[PENDING: verify the real implementation respects this transaction — a silent failure point if it doesn't]

## DDD tactical patterns inside `domain/` (ADR-17)

Concrete example with the `inventory` module (stock calculation, HU-10):

```
backend/src/modules/inventory/
├── domain/
│   ├── entities/inventory-movement.entity.ts
│   ├── value-objects/stock-quantity.value-object.ts   # immutable, validates >= 0
│   ├── services/calculate-stock.domain-service.ts      # pure rule: movements → StockQuantity
│   └── inventory-movement.repository.interface.ts      # port
├── application/use-cases/
│   └── calculate-stock.use-case.ts                      # orchestrates: repository (IO) + domain-service (rule)
└── infrastructure/
    └── inventory-movement.prisma.repository.ts          # adapter
```

The `use-case` holds no calculation formula — it asks `calculate-stock.domain-service.ts` for it, a pure function/class with no NestJS or Prisma dependencies. This is what makes the rule testable with TDD (plan section 5) without mocking a repository: the unit test builds sample movements, calls the domain service, and checks the resulting `StockQuantity` directly.

## What does NOT exist (and isn't planned for the MVP)

- Microservices, message queues, or async events
- Cache (Redis or similar)
- WebSockets / real-time updates
- Native mobile app
- GraphQL (REST only)
- Multi-tenant
- Audit with a visual interface (HU-23 is post-MVP; the DB record itself exists from the MVP)
- Multi-level request approval (HU-18, post-MVP — the schema already supports it but it's not implemented)
- 2FA (HU-25, post-MVP)
- Product images (HU-26/27, post-MVP — MVP 5)
- Tests, the CI/CD pipeline, and the repository itself: **don't exist yet**, they're part of Iteration 0

## New — UI internationalization and light/dark mode (post-MVP)

Added on explicit request: an ES/EN language switcher and light/dark mode in the frontend. See HU-29 and HU-30 (Epic 9, plan section 3) — **not implemented yet**, documented here and in the Trello backlog to be tackled last, after MVP 4.
