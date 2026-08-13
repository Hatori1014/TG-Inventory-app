# Conventions

> Source: `plan-inicial-proyecto-inventario.md` (sections 4.6, 5, 8, 9.1). There's no real code yet to verify these conventions are followed — these are the ones defined at design time. Versión en español: `convenciones.md`.

## Language

**English** for everything code-related: branch names, commits, variables, functions, files, code comments, **and also the database schema** (Prisma/Postgres models, fields, tables and columns). It's the language of the ecosystem (NestJS, Angular, Prisma, Conventional Commits). **Spanish** is reserved for business documentation (`docs/`, in both languages) and communication with the functional stakeholder — that's why the ER model (plan section 7) is in Spanish while `schema.prisma` is in English; it's the same model, in two languages for two different audiences.

**Explicit exception — UI text**: the code-language rule doesn't apply to what the end user sees on screen (labels, buttons, messages). The app is built for Spanish-speaking users, so the UI stays in Spanish — except for HU-30 (ES/EN language switcher, post-MVP, plan section 3), which will make it configurable.

## Naming — backend (NestJS)

By file type, inside each module (kebab-case + suffix, in English):
- `*.entity.ts` — domain entity, **with behavior** (not just data — see ADR-17)
- `*.value-object.ts` — domain Value Object: immutable, self-validating on construction (ADR-17), in `domain/`
- `*.domain-service.ts` — Domain Service: a pure business rule that doesn't belong to a single entity (ADR-17), in `domain/services/`
- `*.repository.interface.ts` — port (repository interface, in `domain/`)
- `*.use-case.ts` — use case (in `application/use-cases/`), e.g. `create-supplier.use-case.ts` — orchestrates IO + `domain/`, holds no business rule itself
- `*.prisma.repository.ts` — infrastructure adapter (in `infrastructure/`)
- `*.dto.ts` — DTO validated with `class-validator`
- `*.controller.ts`, `*.module.ts`

## Naming — frontend (Angular)

- Components: kebab-case, standalone, `*.component.ts/.html/.scss`
- `*.service.ts`, `*.routes.ts`, `*.model.ts` (in `shared/models/`, mirroring the backend DTOs)
- One folder per feature in `features/`, in English (`suppliers`, `locations`, `products`, `inventory`, `alerts`, `purchases`, `requests`, `users-roles`), lazy-loaded from `app.routes.ts`

## Patterns we use

- Hexagonal architecture per backend module (domain → application → infrastructure) — **only in modules with real business logic** (inventory, requests). Trivial CRUDs (e.g. locations) can start without the 4 layers.
- DDD tactical patterns inside `domain/` (ADR-17): Entities with behavior, Value Objects, Domain Services. The use-case orchestrates, it doesn't decide — the business rule lives in `domain/`.
- Module boundaries enforced with lint, not just convention (ADR-18): a module never imports `domain/` or `infrastructure/` from another module — only the services exported by its `*.module.ts`. `eslint-plugin-boundaries` fails the build (`backend/.eslintrc.js`, runs in `ci-backend.yml` via `npm run lint`).
- Standard pagination on every listing endpoint (TT-19): offset/limit via `PaginationQueryDto`/`PaginatedResponseDto`/`pagination.util.ts` in `backend/src/common/` — never hand-roll `skip`/`take` inside a use-case. Detail in `TRD.en.md` section 4.
- DTOs validated with `class-validator` on every write endpoint (HU-21)
- RBAC via Guards + the `@Roles()` decorator, always enforced in the backend, never just hiding UI
- Inventory movements: `LocationStock` is never updated directly — always through a record in `InventoryMovement` in the same transaction
- Configurable approval flow via a table (`ApprovalFlow`), not a fixed field
- Standalone Angular components (no NgModules)

## Forbidden patterns

- String concatenation to build SQL queries — always parameterized queries via Prisma
- Business logic inside a controller (it belongs in the use-case)
- Business logic inside the use-case when it should live in an entity/Value Object/Domain Service (ADR-17) — the use-case orchestrates, it doesn't decide
- Calling Prisma directly from a controller, bypassing the repository
- Storing user-uploaded files on the application server's disk (must go to Cloudflare R2)
- Relying on the frontend as the only access-control layer

[PENDING: exact `tsconfig` settings (strict mode, no-implicit-any) — not fully specified, only that the language is typed TypeScript]

## Logging (TT-21)

`nestjs-pino` — structured JSON to stdout in `staging`/`production` (Render captures it automatically, no extra infra), readable pretty-print in `development`. Every request carries a correlation id (`X-Request-Id`, generated or propagated if the client already sends one) present in every log line it produces, so a single request can be traced. `req.headers.authorization`, cookies, and `password`/`token` in the body are always redacted (`backend/src/config/logger.config.ts`) — they never show up in plaintext in a log, not even by accident.

What to log:
- **Always**: unhandled errors and 5xx responses (already done by `GlobalExceptionFilter`, TT-15, with the real logger, not `console.log`)
- **Critical write operations**: inventory movements, request approvals, role changes — use `new Logger(ModuleName)` (the same pattern already used by `main.ts`/`GlobalExceptionFilter`), not `console.log`
- **No need to explicitly log** every request/response — `pino-http` already covers that automatically (method, route, status, response time)

## Concurrency (TT-17)

Every update to `LocationStock` (`version` column, optimistic locking, ADR-20) must go through `withOptimisticLock()` (`backend/src/common/utils/optimistic-lock.util.ts`): the function passed to it runs the `updateMany({ where: { id, version }, ... })` and returns `null` if it affected zero rows (conflict detected); `withOptimisticLock` retries up to 3 times and throws `ConflictException` (409) once exhausted. Never update `LocationStock` with a plain `update()` that doesn't filter by `version`. Detail in `TRD.en.md` section 3.

## Idempotency (TT-18)

Every critical write endpoint (movements, purchases, requests, role changes) is marked with `@Idempotent()` + `@UseInterceptors(IdempotencyInterceptor)` (`backend/src/common/`). The client sends an `Idempotency-Key` header (UUID) per logical operation; if the key was already processed, the interceptor returns the stored response without re-running the use-case. The module using the interceptor must provide `PrismaService` and `IdempotencyInterceptor` in its `*.module.ts` (same pattern `HealthModule` already uses for `PrismaService`). Detail in `TRD.en.md` section 4, decision in ADR-21.

## Tests

| Type | When | Tool | Location |
|---|---|---|---|
| TDD | Critical domain logic (stock calculation, movement validation) | Jest | `test/unit/` |
| BDD | Critical business flows (request approval, RBAC, alerts) | `jest-cucumber` (Gherkin) | `test/bdd/` |
| E2E | Full user flows | Playwright | `test/e2e/` (backend) / Angular e2e (frontend) |

Practical rule: if a bug in that logic is costly (money, miscounted inventory, improper access) → TDD/BDD is mandatory. A simple read-only screen → basic E2E is enough.

## Commits

**Conventional Commits**, in English, imperative mood:
```
<type>(<scope>): <imperative description>

feat(auth): add login endpoint (HU-01)
fix(inventory): correct stock calculation on transfer (HU-08)
chore(infra): configure CI pipeline (TT-07)
docs: update MER with new field
```
Allowed types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `ci`.

## Branching

Simplified Gitflow (plan section 9.1): `main` (production, protected) / `staging` (protected) / `feature/tt-XX-slug` or `feature/hu-XX-slug` / `fix/slug` / `hotfix/slug`. Kebab-case, no spaces, in English, describing the "what" in present/infinitive tense (not past tense).
