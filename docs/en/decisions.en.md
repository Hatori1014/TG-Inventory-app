# Technical decisions

> Source: `plan-inicial-proyecto-inventario.md` and its build history. There are no code commits to extract decisions from — the repository doesn't exist yet. These are the decisions made during the planning phase, with their rationale and the discarded alternatives as they were discussed. Versión en español: `decisiones.md`.

**ADR-01 — Backend: NestJS**
Discarded: .NET (C#/ASP.NET Core). Why: same language (TypeScript) as the Angular frontend, native modular architecture that fits the hexagonal design, decorators (`@Roles`, Guards) convenient for RBAC.

**ADR-02 — Database: PostgreSQL**
Discarded: NoSQL as the primary option. Why: the domain is strongly relational (suppliers↔purchases↔products↔locations↔movements) and needs strong transactional integrity.

**ADR-03 — Architecture: modular monolith (hexagonal per module)**
Discarded: microservices. Why: the defined scale (dozens of users/locations) doesn't justify the operational complexity of microservices; the modular design allows extracting a service later if needed.

**ADR-04 — ORM: Prisma**
Discarded: TypeORM (mentioned as a valid alternative, not the default choice). Why: end-to-end schema typing, simple migrations, better DX.

**ADR-05 — Methodology: adapted Scrumban (not team Scrum)**
Discarded: classic Scrum with 2-week sprints and daily ceremonies. Why: the project is built by a single person, part-time, weekends only — team ceremonies don't apply.

**ADR-06 — Roadmap: 5 incremental MVPs**
Discarded: a single 23-story MVP with external validation only at the end (~8-10 months with no feedback). Why: reduces the risk of building in the wrong direction for months without real validation; allows 4 external checkpoints along the way instead of 1.

**ADR-07 — Inventory movements as the source of truth (immutable ledger)**
Discarded: keeping only a directly-editable "current stock" table. Why: full traceability (who, when, what) and lets stock be reconstructed from history if inconsistencies appear.

**ADR-08 — Configurable approval flow (`ApprovalFlow`)**
Discarded: a fixed `approverId` field with no further structure on `Request`. Why: the user confirmed there's a single approver today but it may become multi-level (direct manager → Inventory Admin) — this design doesn't require a schema migration when that happens.

**ADR-09 — Repository: monorepo**
Discarded: separate repos for backend and frontend. Why: a single developer benefits from one commit history and one PR per functional change, even when it touches both layers.

**ADR-10 — Image storage: Cloudflare R2**
Discarded: storing uploaded files on the application server's disk. Why: egress is always free (unlike S3), and it avoids the attack vector of malicious file uploads landing directly on the server (HU-27).

**ADR-11 — Priority reclassification after backlog validation**
HU-09 (batches), HU-12 (alerts panel), HU-14 (price comparison), and HU-24 (dependency scanning) moved from "Should" to "Must" when validated against the user's original request. Why: they were part of the functional core requested in the first message, not optional enhancements.

**ADR-12 — Code language: English (everything), with an explicit UI exception**
Discarded: keeping the Spanish used in the first draft of `schema.prisma` and in code comments. Why: it's the industry standard and the native language of the whole ecosystem (NestJS, Angular, Prisma). Correction applied retroactively: the local DB was reset and the initial migration regenerated in English. The UI visible to the end user is an explicit exception — it stays in Spanish because the app's users speak Spanish (see `conventions.en.md`).

**ADR-13 — Documentation (`docs/`): bilingual, Spanish + English**
Discarded: Spanish-only (what existed before this decision) or English-only. Why: the code and repository need to be readable in English (industry standard, ADR-12), but communication with the functional stakeholder and business design happen in Spanish. File convention: the unsuffixed name is the Spanish (original) version, `.en.md` is the English translation.

**ADR-14 — UI: language switcher (ES/EN) and light/dark mode**
Added to the backlog as Epic 9 (HU-29, HU-30), explicitly flagged to be tackled **last**, after MVP 4 — not part of the user's original scope and doesn't block any business functionality. See plan section 3 and the Trello board.

**ADR-15 — Staging/production migrations: manual, not automated in deploy**
Discarded: running `prisma migrate deploy` automatically on every push, either by adding it to Render's *Start Command* or via a `cd-deploy.yml` workflow. Why: the chosen CD model (plan section 9.2, native Vercel/Render auto-deploy) doesn't orchestrate any "migrate before starting" step unless explicitly wired in — and for a single developer, while the schema is still changing often (Iteration 0-1), having a manual checkpoint (`npm run prisma:migrate:staging`) before touching the shared database is safer than letting it fire unsupervised on every push. Same reasoning already applied to the ban on `migrate dev` against staging/production (see `CLAUDE.md`).
[PENDING: revisit this decision once the application is stable and schema migrations are infrequent — at that point, evaluate moving `npx prisma migrate deploy` into Render's Start Command to automate it]

**ADR-16 — Documentation (`docs/`): organized into subfolders by type**
Discarded: all files loose in the `docs/` root, distinguished only by the `.en.md` suffix (ADR-13's original approach). Why: once diagrams (PNGs) and the Claude Design reference-export folder were added, mixing everything at a single level became hard to navigate. Final structure: `docs/esp/` (Spanish), `docs/en/` (English), `docs/Diagrams/` (architecture/flow diagrams), `docs/Design/` (Claude Design reference exports only — the live prototype stays in its own workspace, its raw HTML/CSS/JS is never copied into `frontend/`). ADR-13 (bilingual) still applies within `esp/` and `en/`. See `CLAUDE.md`.

**ADR-17 — DDD tactical patterns inside the hexagonal architecture**
Discarded: (a) leaving `domain/` as a container of anemic entities (data only) and moving all business logic into the use-case; (b) adopting full strategic DDD (bounded contexts, context mapping, formal ubiquitous language per subdomain). Why: (a) — the hexagonal architecture already decided (ADR-03) and the repository-interface-as-port convention (`conventions.en.md`) already point toward a DDD-friendly design; leaving the domain anemic wastes that and complicates TDD on critical logic (plan section 5), because tests end up exercising the whole use-case (with repository mocks) instead of the isolated, pure business rule. (b) — the project's domain is single and bounded (modular monolith, a single developer); multiple bounded contexts would add coordination complexity with no real benefit at this scale.
Scope adopted — tactical patterns only, inside the `domain/` that already exists per module:
- **Entities** (`*.entity.ts`) with behavior: rules that depend only on their own data live there, not in the use-case.
- **Value Objects** (`*.value-object.ts`, new): immutable, self-validating on construction (e.g. a stock quantity that can't be negative).
- **Domain Services** (`*.domain-service.ts`, new, in `domain/services/`): pure business rules that don't belong to a single entity (e.g. calculating the resulting stock from a movement history).
- **Repository interfaces** (`*.repository.interface.ts`) as ports — already defined, unchanged.
The use-case (`application/`) stays an orchestrator: it does IO via the repository, delegates the actual rule to `domain/`, and holds no business logic of its own — this explicitly extends to the use-case the prohibition `conventions.en.md` already applied to controllers. Concrete example (the `inventory` module) in `architecture.en.md`.

**ADR-18 — Module boundaries: only via the application layer, enforced with lint**
Discarded: relying solely on convention/code review to keep module isolation. Why: with a single developer and no third-party review, coupling can slip in unnoticed until it hurts — with one shared `schema.prisma`/`PrismaClient`, nothing at the ORM level stops a module from directly importing another module's Prisma repository, bypassing its `application` layer. Rule: a module NEVER imports `domain/` or `infrastructure/` from another module — it may only call the services exported by the owning module's `*.module.ts` (`application` layer).
Enforced with `eslint-plugin-boundaries` (v7) in `backend/.eslintrc.js`, not just by convention — lint fails (and therefore CI, `ci-backend.yml`, since it runs `npm run lint`) if a module imports `domain/` or `infrastructure/` from another. Verified with a test fixture: a same-module import passes clean, a cross-module import fails with the ADR's message (fixture discarded after confirming, doesn't live in the repo).
Future evolution path if the project grows: split each module into its own Postgres schema (same server, no deploy change) as an intermediate step before considering extracting a module into its own service — not implemented now, documented here as an option.

[PENDING: any technical decision made during actual implementation (Iteration 0 onward) that isn't in the planning document — this file should be updated from commits/PRs once code exists]
