# Estado del proyecto — leer esto primero

> Última actualización: TT-04 cerrada — backend desplegado en Render (`tg-inventory-backend`, `https://tg-inventory-backend.onrender.com`), health-check (`/health`) en `200 OK` con `database: ok`, y CORS validado end-to-end contra el frontend de Vercel (GET y preflight OPTIONS ambos devuelven el origen correcto). TT-02, TT-03 y TT-05 también cerradas. Actualízalo tú mismo al cerrar cada iteración. English version below.

## Nota de estructura

`docs/` está organizado en subcarpetas — `docs/esp/` (español), `docs/en/` (inglés), `docs/Diagrams/` (todos los PNG). Ver ADR-16 en `decisiones.md`.

## Qué es este proyecto

Sistema de control de inventario: proveedores, inventario por ubicaciones, alertas de stock, historial de compras, comparativa de precios, RBAC, y solicitudes internas con flujo de aprobación. Un solo desarrollador, fines de semana. Ver `docs/esp/PRD.md` para el detalle completo.

## Dónde estamos ahora mismo

**Fase**: Iteración 0 (setup), en curso. **No se ha escrito ninguna HU de negocio todavía.**

### Próximo paso inmediato: elegir la siguiente tarea técnica

TT-02, TT-03, TT-04 y TT-05 ya están cerradas (ver tabla abajo). Lo que queda pendiente en la iteración actual, sin decidir todavía qué sigue primero:
- TT-09 (Dependabot): solo falta la confirmación manual en Settings → Code security, es rápido
- TT-10 (secrets): ya cargados los que se usan hoy (`DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `FRONTEND_URL`, `NODE_ENV` en Render); falta revisar si se necesita algo más en GitHub Actions
- TT-06 (Cloudflare): no bloquea el MVP, se puede dejar para después

El flujo de PR + CI **funciona y ya se probó de punta a punta** (ver detalle de TT-07 abajo), y ahora además está reforzado por la regla de branch protection.

### Tareas técnicas, en detalle

| Tarea técnica | Estado |
|---|---|
| TT-01 (crear repo en GitHub) | ✅ Hecho — push confirmado |
| TT-11 (health-check) | ✅ Hecho — re-validado |
| TT-12 (Prisma + migración) | ✅ Hecho — re-validado |
| TT-13 (Docker Postgres local) | ✅ Hecho — re-validado |
| TT-07 (CI) | ✅ Hecho — verificado con PRs reales (#13, #14) contra `staging`, ambos checks (`backend`, `frontend`) en verde. Ver "Qué se encontró y arregló" abajo |
| TT-02 (branching + branch protection) | ✅ Hecho — repo pasado a público; dos rulesets creados en GitHub (`main` y `staging`), Enforcement status `Active` en ambos, con `Require status checks to pass` exigiendo `backend` y `frontend`. Falta sincronizar el estado en Trello (sin conector desde este entorno) |
| TT-03 (Vercel) | ✅ Hecho — proyecto conectado al repo (auto-deploy en push a `main` confirmado); tras corregir Framework Preset (`Angular`) y Output Directory (`dist/frontend/browser`, requerido por el builder `application` de Angular 18), `https://tg-inventory-app.vercel.app` responde `200 OK` sirviendo `index.html` |
| TT-04 (Render/Fly.io) | ✅ Hecho — servicio `tg-inventory-backend` creado en Render (`https://tg-inventory-backend.onrender.com`), conectado al repo; variables `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `NODE_ENV`, `FRONTEND_URL` cargadas. Verificado con `curl`: `/health` → `200 OK` (`database: ok`), y CORS (GET + preflight OPTIONS) devuelve `access-control-allow-origin: https://tg-inventory-app.vercel.app` |
| TT-05 (Neon/Supabase) | ✅ Hecho — base de datos creada en Neon, migraciones aplicadas con `npm run prisma:migrate:staging`, `DATABASE_URL` ya copiada a los secrets de Render (TT-04) |
| TT-06 (Cloudflare) | ⬜ Pendiente — checklist completo en Trello, no bloquea MVP 1-4 |
| TT-08 (CD) | ⬜ Pendiente — **NO es un workflow**, es configuración en los dashboards de Vercel/Render; depende de TT-03/04 |
| TT-09 (Dependabot) | 🟡 Parcial — `dependabot.yml` ya agrupa por ecosistema (máx. 3 PRs/semana en vez de 1 por paquete); falta la confirmación manual en Settings → Code security |
| TT-10 (secrets) | ✅ Hecho para lo que existe hoy — `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `NODE_ENV`, `FRONTEND_URL` cargados en Render (nunca en el repo, ver `.env.example`). **GitHub Actions no necesita secrets**: revisé `ci-backend.yml`/`ci-frontend.yml` y ninguno usa `secrets.*` ni toca una BD real o la API desplegada (solo `lint`/`test` unitario/`audit`/`build`); y por decisión ya tomada (`CLAUDE.md`, plan sección 9.2) no existe workflow de CD que necesitaría credenciales de deploy. Se revisita si algún día se agregan tests e2e contra staging en CI |

### Qué se encontró y arregló al verificar CI (TT-07)

CI nunca había corrido de verdad antes de esto — el PR de prueba (#13) reveló varios bugs reales en el esqueleto, ya arreglados:
- **Backend**: `npm audit --audit-level=critical` fallaba por una vulnerabilidad crítica real en `node-tar`, alcanzable vía `bcrypt` (dependencia de producción) → `@mapbox/node-pre-gyp` → `tar`. Se subió `bcrypt` a `6.0.0` (sin código que lo use todavía, cero riesgo real). El gate de auditoría (HU-24) ahora usa `--omit=dev` en ambos workflows para no bloquear por vulnerabilidades de herramientas de build (webpack/Angular CLI) que no llegan a producción.
- **Frontend**: `package-lock.json` estaba desincronizado de `package.json` (`npm ci` lo rechazaba) — regenerado. No existía ni `.eslintrc.js` ni el target `lint` en `angular.json` — `ng lint` no tenía nada que correr. No existía ni un solo `.spec.ts` — el step de Tests fallaba por config vacía. Se agregó `.eslintrc.js`, el target de lint, y un spec mínimo de `AppComponent`.
- **Ambos**: `tsconfig.json` no tenía `rootDir` explícito (deprecado en TS6) y el backend tenía un `baseUrl` sin usar (deprecado en TS7) — corregido. Los dos workflows tenían su job llamado igual (`test`), así que GitHub reportaba dos checks indistinguibles por nombre — se les puso nombre explícito (`backend` / `frontend`) para que branch protection pueda exigirlos por separado el día que se configure.

Verificado con `npm run lint`, `npm run build` y `npm run test` localmente en ambos proyectos, más los checks reales de GitHub Actions en los PR #13 y #14.

### Backlog de HU (30, en la columna `Backlog`)

Formato base consistente en las 30 (rol/acción/beneficio). ~10 todavía no tienen un criterio de aceptación verificable, solo notas de contexto — **no es bloqueante**: se completa cuando cada una entra a Definition of Ready, justo antes de moverla a "En progreso" (ver `docs/esp/flujo-de-trabajo.md`). No hace falta resolverlo ahora.

**Lo que ya existe en código, ya subido a GitHub**:
- Backend NestJS: estructura hexagonal, `schema.prisma` completo (17 entidades, en inglés), guards/decoradores de RBAC, health-check
- Frontend Angular: estructura por features (todas en inglés), feature `suppliers` como plantilla de referencia, ahora con lint y un spec base funcionando
- `docker-compose.yml`, workflows de CI (verificados y en verde), `dependabot.yml` (agrupado por ecosistema)
- `frontend/public/logo-placeholder.png` — logo temporal

## Qué leer, y en qué orden, si retomas esto en una conversación nueva

1. **Este archivo**
2. `docs/esp/PRD.md` — qué se está construyendo y por qué
3. `docs/esp/plan-inicial-proyecto-inventario.md` — el documento maestro
4. `docs/esp/TRD.md` — resumen técnico
5. `docs/esp/convenciones.md` y `docs/esp/decisiones.md` — antes de tocar código

## Tablero de Trello

https://trello.com/b/BS5tzENy/sistema-de-control-de-inventario — 43 tarjetas, todas las de `Iteración actual` (TT-02 a TT-10) ya tienen checklist de pasos, no solo descripción de una línea.

---

# Project status — read this first

> Last updated: TT-04 closed — backend deployed on Render (`tg-inventory-backend`, `https://tg-inventory-backend.onrender.com`), health-check (`/health`) returns `200 OK` with `database: ok`, and CORS validated end to end against the Vercel frontend (both GET and preflight OPTIONS return the correct origin). TT-02, TT-03, and TT-05 are also closed. Keep this updated yourself as each iteration closes.

## Structure note

`docs/` is organized into subfolders — `docs/esp/` (Spanish), `docs/en/` (English), `docs/Diagrams/` (all PNGs). See ADR-16 in `decisions.en.md`.

## What this project is

Inventory control system: suppliers, inventory by location, stock alerts, purchase history, price comparison, RBAC, and internal requests with an approval flow. A single developer, weekends only. See `docs/en/PRD.en.md` for full detail.

## Where things stand right now

**Phase**: Iteration 0 (setup), in progress. **No business story has been implemented yet.**

### Immediate next step: pick the next technical task

TT-02, TT-03, TT-04, and TT-05 are now closed (see table below). What's left in the current iteration, order not decided yet:
- TT-09 (Dependabot): only the manual confirmation in Settings → Code security is missing, quick to close
- TT-10 (secrets): the ones used today are already loaded (`DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `FRONTEND_URL`, `NODE_ENV` on Render); still need to check whether anything else is needed in GitHub Actions
- TT-06 (Cloudflare): doesn't block the MVP, can wait

The PR + CI flow itself **works and has been verified end to end** (see TT-07 detail below), and is now backed by the branch protection rule too.

### Technical tasks, in detail

| Technical task | Status |
|---|---|
| TT-01 (create GitHub repo) | ✅ Done — push confirmed |
| TT-11 (health-check) | ✅ Done — re-validated |
| TT-12 (Prisma + migration) | ✅ Done — re-validated |
| TT-13 (local Docker Postgres) | ✅ Done — re-validated |
| TT-07 (CI) | ✅ Done — verified with real PRs (#13, #14) against `staging`, both checks (`backend`, `frontend`) green. See "What was found and fixed" below |
| TT-02 (branching + branch protection) | ✅ Done — repo switched to public; two GitHub rulesets created (`main` and `staging`), Enforcement status `Active` on both, with `Require status checks to pass` requiring `backend` and `frontend`. Trello status still needs manual sync (no connector from this environment) |
| TT-03 (Vercel) | ✅ Done — project connected to the repo (auto-deploy on push to `main` confirmed); after fixing the Framework Preset (`Angular`) and Output Directory (`dist/frontend/browser`, required by Angular 18's `application` builder), `https://tg-inventory-app.vercel.app` responds `200 OK` serving `index.html` |
| TT-04 (Render/Fly.io) | ✅ Done — `tg-inventory-backend` service created on Render (`https://tg-inventory-backend.onrender.com`), connected to the repo; `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `NODE_ENV`, `FRONTEND_URL` all set. Verified with `curl`: `/health` → `200 OK` (`database: ok`), and CORS (GET + preflight OPTIONS) returns `access-control-allow-origin: https://tg-inventory-app.vercel.app` |
| TT-05 (Neon/Supabase) | ✅ Done — database created on Neon, migrations applied with `npm run prisma:migrate:staging`, `DATABASE_URL` already copied into Render's secrets (TT-04) |
| TT-06 (Cloudflare) | ⬜ Pending — full checklist in Trello, doesn't block MVP 1-4 |
| TT-08 (CD) | ⬜ Pending — **NOT a workflow**, it's configuration inside the Vercel/Render dashboards; depends on TT-03/04 |
| TT-09 (Dependabot) | 🟡 Partial — `dependabot.yml` now groups by ecosystem (max 3 PRs/week instead of 1 per package); manual confirmation in Settings → Code security still pending |
| TT-10 (secrets) | ✅ Done for what exists today — `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `NODE_ENV`, `FRONTEND_URL` loaded on Render (never in the repo, see `.env.example`). **GitHub Actions needs no secrets**: checked `ci-backend.yml`/`ci-frontend.yml` and neither uses `secrets.*` or touches a real DB or the deployed API (only `lint`/unit `test`/`audit`/`build`); and by an already-made decision (`CLAUDE.md`, plan section 9.2) there's no CD workflow that would need deploy credentials. Revisit if e2e tests against staging are ever added to CI |

### What was found and fixed while verifying CI (TT-07)

CI had never actually run before this — the test PR (#13) surfaced several real bugs in the skeleton, now fixed:
- **Backend**: `npm audit --audit-level=critical` failed on a real critical vulnerability in `node-tar`, reachable via `bcrypt` (a production dependency) → `@mapbox/node-pre-gyp` → `tar`. Bumped `bcrypt` to `6.0.0` (no call sites use it yet, so zero real risk). The audit gate (HU-24) now uses `--omit=dev` in both workflows so devDependency-only vulnerabilities (build tooling like webpack/Angular CLI) don't block merges.
- **Frontend**: `package-lock.json` was out of sync with `package.json` (`npm ci` rejected it) — regenerated. Neither `.eslintrc.js` nor the `lint` target in `angular.json` existed — `ng lint` had nothing to run. Zero `.spec.ts` files existed — the Tests step failed on empty config. Added `.eslintrc.js`, the lint target, and a baseline `AppComponent` spec.
- **Both**: `tsconfig.json` had no explicit `rootDir` (deprecated in TS6) and the backend had an unused `baseUrl` (deprecated in TS7) — fixed. Both workflows' job was named `test`, so GitHub reported two indistinguishable-by-name checks — given explicit names (`backend` / `frontend`) so branch protection can require them separately once configured.

Verified with `npm run lint`, `npm run build`, and `npm run test` locally in both projects, plus the real GitHub Actions checks on PRs #13 and #14.

### Story backlog (30, in the `Backlog` column)

Consistent base format across all 30 (role/action/benefit). ~10 still lack a verifiable acceptance criterion, only context notes — **not blocking**: gets completed when each one hits Definition of Ready, right before moving to "In progress" (see `docs/en/workflow.en.md`). No need to resolve this now.

**What already exists in code, already pushed to GitHub**:
- NestJS backend: hexagonal structure, full `schema.prisma` (17 entities, in English), RBAC guards/decorators, health-check
- Angular frontend: feature-based structure (all in English), `suppliers` feature as the reference template, now with working lint and a baseline spec
- `docker-compose.yml`, CI workflows (verified and green), `dependabot.yml` (grouped by ecosystem)
- `frontend/public/logo-placeholder.png` — temporary logo

## What to read, and in what order, if picking this up in a new conversation

1. **This file**
2. `docs/en/PRD.en.md` — what's being built and why
3. `docs/en/project-plan.en.md` — the master document
4. `docs/en/TRD.en.md` — technical summary
5. `docs/en/conventions.en.md` and `docs/en/decisions.en.md` — read before touching code

## Trello board

https://trello.com/b/BS5tzENy/sistema-de-control-de-inventario — 43 cards, every card in `Current iteration` (TT-02 through TT-10) now has a step checklist, not just a one-line description.
