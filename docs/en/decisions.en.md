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

[PENDING: any technical decision made during actual implementation (Iteration 0 onward) that isn't in the planning document — this file should be updated from commits/PRs once code exists]
