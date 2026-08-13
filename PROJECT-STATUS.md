# Estado del proyecto — leer esto primero

> Última actualización: TT-20 cerrada — 17 índices nuevos en `schema.prisma` (PostgreSQL no indexa FK automáticamente, verificado empíricamente contra la migración inicial), migración `20260813043614_add_indexes` aplicada y verificada en local. **Pendiente de decidir**: si aplicar esta migración a Neon staging ahora o dejarlo para ti — ver nota en la tabla de detalle. También se identificó (fuera de alcance de TT-20) que no hay borrado lógico ni `DELETE` planeado en ningún endpoint — 13 de 17 modelos no tienen ni siquiera el patrón `status` que sí usan `User`/`Location`/`Product`/`Supplier`; queda para una TT nueva que el usuario agregará a Trello. Actualízalo tú mismo al cerrar cada iteración. English version below.

## Nota de estructura

`docs/` está organizado en subcarpetas — `docs/esp/` (español), `docs/en/` (inglés), `docs/Diagrams/` (todos los PNG). Ver ADR-16 en `decisiones.md`.

## Qué es este proyecto

Sistema de control de inventario: proveedores, inventario por ubicaciones, alertas de stock, historial de compras, comparativa de precios, RBAC, y solicitudes internas con flujo de aprobación. Un solo desarrollador, fines de semana. Ver `docs/esp/PRD.md` para el detalle completo.

## Dónde estamos ahora mismo

**Fase**: Iteración 0 (setup), en curso. **No se ha escrito ninguna HU de negocio todavía.**

### Próximo paso inmediato: elegir la siguiente tarea técnica

TT-02 a TT-05 ya están cerradas (ver tabla abajo). Ahora mismo en curso: **TT-14 a TT-21**, ocho tareas técnicas nuevas de una revisión de arquitectura (ver "Gaps de arquitectura" abajo) — TT-14, TT-15, TT-16, TT-21 y TT-19 ya cerradas, siguiendo el orden acordado: TT-20 → TT-17 → TT-18. Van antes de escribir cualquier HU de negocio real.

Pendiente de menor prioridad, sin bloquear lo anterior:
- TT-09 (Dependabot): solo falta la confirmación manual en Settings → Code security, es rápido
- TT-10 (secrets): ya cargados los que se usan hoy (`DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `FRONTEND_URL`, `NODE_ENV` en Render); falta revisar si se necesita algo más en GitHub Actions
- TT-06 (Cloudflare): no bloquea el MVP, se puede dejar para después

El flujo de PR + CI **funciona y ya se probó de punta a punta** (ver detalle de TT-07 abajo), y ahora además está reforzado por la regla de branch protection.

### Gaps de arquitectura (TT-14 a TT-21)

Origen: sesión de revisión de arquitectura (2026-08-12), motivada por una pregunta concreta — "si falla un módulo, ¿se caen otros?". El diseño es monolito modular (todos los módulos en un solo proceso Node, un solo `schema.prisma`/`PrismaClient`) — sin disciplina explícita, la respuesta es sí. Ocho TT (no HU, son prerrequisitos técnicos transversales) atacan esto y gaps relacionados (concurrencia, idempotencia, paginación, índices, logging, fronteras entre módulos), antes de implementar cualquier HU de negocio. Detalle completo de cada una en Trello, lista "Iteración actual".

- **TT-14 (fronteras entre módulos)** — ✅ Hecho. Ver fila en la tabla de abajo.
- **TT-15 (manejo de errores global)** — ✅ Hecho. Ver fila en la tabla de abajo.
- **TT-16 (límites de conexión Prisma)** — ✅ Hecho. Ver fila en la tabla de abajo.
- **TT-21 (logging)** — ✅ Hecho. Ver fila en la tabla de abajo.
- **TT-19 (paginación)** — ✅ Hecho. Ver fila en la tabla de abajo.
- **TT-20 (índices)** — ✅ Hecho. Ver fila en la tabla de abajo.
- **TT-17 (locking optimista en stock)**, **TT-18 (idempotencia)** — ⬜ Pendientes, en ese orden.

### Tareas técnicas, en detalle

| Tarea técnica | Estado |
|---|---|
| TT-01 (crear repo en GitHub) | ✅ Hecho — push confirmado |
| TT-11 (health-check) | ✅ Hecho — re-validado |
| TT-12 (Prisma + migración) | ✅ Hecho — re-validado |
| TT-13 (Docker Postgres local) | ✅ Hecho — re-validado |
| TT-07 (CI) | ✅ Hecho — verificado con PRs reales (#13, #14) contra `staging`, ambos checks (`backend`, `frontend`) en verde. Ver "Qué se encontró y arregló" abajo. **Refinamiento (ADR-19)**: los checks tenían `paths:` en el trigger, así que en PRs de solo-docs (varios en esta sesión) el check requerido nunca se disparaba y branch protection quedaba esperando para siempre — obligaba a usar bypass. Se quitó `paths:` del trigger y se agregó `dorny/paths-filter` para gatear el trabajo real por step; ahora un PR de solo-docs pasa en segundos sin bypass, y uno que sí toca `backend/`/`frontend/` corre el pipeline completo igual que antes |
| TT-02 (branching + branch protection) | ✅ Hecho — repo pasado a público; dos rulesets creados en GitHub (`main` y `staging`), Enforcement status `Active` en ambos, con `Require status checks to pass` exigiendo `backend` y `frontend`. Falta sincronizar el estado en Trello (sin conector desde este entorno) |
| TT-03 (Vercel) | ✅ Hecho — proyecto conectado al repo (auto-deploy en push a `main` confirmado); tras corregir Framework Preset (`Angular`) y Output Directory (`dist/frontend/browser`, requerido por el builder `application` de Angular 18), `https://tg-inventory-app.vercel.app` responde `200 OK` sirviendo `index.html` |
| TT-04 (Render/Fly.io) | ✅ Hecho — servicio `tg-inventory-backend` creado en Render (`https://tg-inventory-backend.onrender.com`), conectado al repo; variables `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `NODE_ENV`, `FRONTEND_URL` cargadas. Verificado con `curl`: `/health` → `200 OK` (`database: ok`), y CORS (GET + preflight OPTIONS) devuelve `access-control-allow-origin: https://tg-inventory-app.vercel.app` |
| TT-05 (Neon/Supabase) | ✅ Hecho — base de datos creada en Neon, migraciones aplicadas con `npm run prisma:migrate:staging`, `DATABASE_URL` ya copiada a los secrets de Render (TT-04) |
| TT-06 (Cloudflare) | ⬜ Pendiente — checklist completo en Trello, no bloquea MVP 1-4 |
| TT-08 (CD) | ⬜ Pendiente — **NO es un workflow**, es configuración en los dashboards de Vercel/Render; depende de TT-03/04 |
| TT-09 (Dependabot) | 🟡 Parcial — `dependabot.yml` ya agrupa por ecosistema (máx. 3 PRs/semana en vez de 1 por paquete); falta la confirmación manual en Settings → Code security |
| TT-10 (secrets) | ✅ Hecho para lo que existe hoy — `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `NODE_ENV`, `FRONTEND_URL` cargados en Render (nunca en el repo, ver `.env.example`). **GitHub Actions no necesita secrets**: revisé `ci-backend.yml`/`ci-frontend.yml` y ninguno usa `secrets.*` ni toca una BD real o la API desplegada (solo `lint`/`test` unitario/`audit`/`build`); y por decisión ya tomada (`CLAUDE.md`, plan sección 9.2) no existe workflow de CD que necesitaría credenciales de deploy. Se revisita si algún día se agregan tests e2e contra staging en CI |
| TT-14 (fronteras entre módulos) | ✅ Hecho — ADR-18 documentado; `eslint-plugin-boundaries` en `backend/.eslintrc.js`, falla `npm run lint` (y por tanto `ci-backend.yml`) si un módulo importa `domain/`/`infrastructure/` de otro. Verificado con fixture temporal (mismo módulo pasa, cruzado falla con el mensaje del ADR-18) — fixture descartado después de confirmar |
| TT-15 (manejo de errores global) | ✅ Hecho — `GlobalExceptionFilter` (`backend/src/common/filters/`) registrado vía `APP_FILTER`: cualquier excepción (conocida o no) responde con formato consistente (`statusCode`, `message`, `timestamp`, `path`); errores desconocidos devuelven 500 genérico sin filtrar detalles internos, logueados server-side. `process.on('uncaughtException'/'unhandledRejection')` en `main.ts` loguean y cierran controladamente (Render reinicia el contenedor). Verificado con 3 tests unitarios (`global-exception.filter.spec.ts`) y probado en vivo: servidor compilado levantado localmente, `/health` → `200`, ruta inexistente → `404` con el formato del filtro |
| TT-16 (límites de conexión Prisma) | ✅ Hecho, incluida la variable real en Render — `connection_limit=5`, `pool_timeout=10`, `connect_timeout=10`, `options=-c statement_timeout=10000` documentados en `.env.example`/`TRD.md` y ya aplicados en el `DATABASE_URL` de Render. Verificado empíricamente contra Postgres local (query 2s pasa, 15s se cancela a los ~10s con el error real de Postgres `57014`) y en vivo: `curl` a `/health` en producción → `200 OK`, `database: ok`. Números de Neon (104 conexiones a 0.25 CU, 97 tras reservar 7 para el superusuario) confirmados en su documentación oficial. **Incidente durante el rollout**: el primer intento en Render falló con `P1001 (Can't reach database server)` — la causa real era una comilla `"` sobrante al final (y probablemente al inicio) del valor pegado en el campo de Render, arrastrada del formato `DATABASE_URL="..."` de los archivos `.env` (Render no le hace ese parseo tipo dotenv, toma el valor tal cual se pega). Reproducido localmente para confirmar antes de indicar el fix. **Gotcha a tener en cuenta** al copiar cualquier otro valor desde `.env.example`/`.env.staging` hacia el dashboard de Render: pegar solo el contenido entre comillas, nunca las comillas mismas |
| TT-21 (logging estructurado) | ✅ Hecho — `nestjs-pino` (`backend/src/config/logger.config.ts`, cargado en `app.module.ts`, `app.useLogger()` en `main.ts` con `bufferLogs: true`). JSON estructurado a stdout en `staging`/`production`, pretty-print en `development`. Correlation id por request (`X-Request-Id`, propagado si el cliente ya lo manda). Redacción automática de `Authorization`, cookies, `password`/`token` del body — nunca en texto plano. Convención documentada en `convenciones.md` (qué loguear: errores/5xx siempre, escrituras críticas explícitas, requests ya cubiertos por `pino-http`). Verificado en vivo con el servidor compilado en ambos modos: JSON crudo en `production`, pretty-print en `development`, header `Authorization` con token real confirmado como `[Redacted]` en el log. `npm run lint`/`build`/`test` en verde |
| TT-19 (paginación estándar) | ✅ Hecho — convención offset/limit para todo endpoint de listado futuro (HU-05/08/10), documentada en `TRD.md` sección 4 y `convenciones.md`. Implementación compartida en `backend/src/common/`: `dto/pagination-query.dto.ts` (`page`/`pageSize`, validado con `class-validator`, tope `pageSize` máx. 100 para evitar el "noisy neighbor" de TT-16), `dto/paginated-response.dto.ts` (shape `{ items, total, page, pageSize }`), `utils/pagination.util.ts` (`toPrismaSkipTake()`, `buildPaginatedResponse()`). 8 tests unitarios nuevos (defaults, validación de límites, cálculo de `skip`/`take`). De paso se corrigió un gap real en `jest.config.js` — faltaba `setupFiles: ['reflect-metadata']`, sin eso cualquier DTO con `@Type()` de `class-transformer` fallaba en tests con `Reflect.getMetadata is not a function`. `npm run lint`/`build`/`test` en verde (12 tests, toda la suite) |
| TT-20 (índices de BD) | ✅ Hecho — verificado empíricamente que PostgreSQL no indexa FK automáticamente (a diferencia de MySQL): ninguna de las 27 columnas FK en la migración inicial tenía índice. 17 índices nuevos agregados con criterio documentado en `TRD.md` sección 3 (toda FK usada en filtros/joins, salvo tablas de config muy pequeñas; compuestos donde el patrón de consulta lo es — `InventoryMovement[productId, locationId]`, `Purchase[supplierId, purchasedAt]`, `AuditEvent[entity, entityId]`; sin duplicar lo ya cubierto por `@@unique`). Migración `20260813043614_add_indexes` generada y aplicada en local (`prisma migrate dev`), SQL revisado línea por línea (solo `CREATE INDEX`, nada más). Verificado en vivo: servidor compilado levantado, `/health` → `200 OK`. **Falta aplicar en Neon staging** — pendiente de confirmar con el usuario si lo hago yo (`npm run prisma:migrate:staging`, el mecanismo ya sancionado por ADR-15) o lo hace él manualmente. **Hallazgo aparte, fuera de alcance**: no hay borrado lógico (`deletedAt`) ni `DELETE` planeado en ningún endpoint de la API — 13 de 17 modelos no tienen ni el patrón `status` que sí usan `User`/`Location`/`Product`/`Supplier`. No se tocó nada al respecto; queda para una TT nueva que el usuario agregará a Trello |

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

> Last updated: TT-20 closed — 17 new indexes in `schema.prisma` (PostgreSQL doesn't auto-index FKs, verified empirically against the initial migration), migration `20260813043614_add_indexes` applied and verified locally. **Pending decision**: whether to apply this migration to Neon staging now or leave it for you — see the note in the detail table. Also found (out of TT-20's scope) that there's no soft-delete and no `DELETE` planned on any endpoint — 13 of 17 models don't even have the `status` pattern that `User`/`Location`/`Product`/`Supplier` use; left for a new TT the user will add to Trello. Keep this updated yourself as each iteration closes.

## Structure note

`docs/` is organized into subfolders — `docs/esp/` (Spanish), `docs/en/` (English), `docs/Diagrams/` (all PNGs). See ADR-16 in `decisions.en.md`.

## What this project is

Inventory control system: suppliers, inventory by location, stock alerts, purchase history, price comparison, RBAC, and internal requests with an approval flow. A single developer, weekends only. See `docs/en/PRD.en.md` for full detail.

## Where things stand right now

**Phase**: Iteration 0 (setup), in progress. **No business story has been implemented yet.**

### Immediate next step: pick the next technical task

TT-02 through TT-05 are now closed (see table below). Currently in progress: **TT-14 through TT-21**, eight new technical tasks from an architecture review (see "Architecture gaps" below) — TT-14, TT-15, TT-16, TT-21, and TT-19 are done, following the agreed order: TT-20 → TT-17 → TT-18. These come before writing any real business story.

Lower-priority, not blocking the above:
- TT-09 (Dependabot): only the manual confirmation in Settings → Code security is missing, quick to close
- TT-10 (secrets): the ones used today are already loaded (`DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `FRONTEND_URL`, `NODE_ENV` on Render); still need to check whether anything else is needed in GitHub Actions
- TT-06 (Cloudflare): doesn't block the MVP, can wait

The PR + CI flow itself **works and has been verified end to end** (see TT-07 detail below), and is now backed by the branch protection rule too.

### Architecture gaps (TT-14 through TT-21)

Origin: an architecture review session (2026-08-12), triggered by a concrete question — "if one module fails, do the others go down with it?". The design is a modular monolith (every module in a single Node process, one shared `schema.prisma`/`PrismaClient`) — without explicit discipline, the answer is yes. Eight TTs (not HUs — cross-cutting technical prerequisites) address this and related gaps (concurrency, idempotency, pagination, indexes, logging, module boundaries), before any real business story gets implemented. Full detail on each in Trello, "Current iteration" list.

- **TT-14 (module boundaries)** — ✅ Done. See row in the table below.
- **TT-15 (global error handling)** — ✅ Done. See row in the table below.
- **TT-16 (Prisma connection limits)** — ✅ Done. See row in the table below.
- **TT-21 (logging)** — ✅ Done. See row in the table below.
- **TT-19 (pagination)** — ✅ Done. See row in the table below.
- **TT-20 (indexes)** — ✅ Done. See row in the table below.
- **TT-17 (optimistic locking on stock)**, **TT-18 (idempotency)** — ⬜ Pending, in that order.

### Technical tasks, in detail

| Technical task | Status |
|---|---|
| TT-01 (create GitHub repo) | ✅ Done — push confirmed |
| TT-11 (health-check) | ✅ Done — re-validated |
| TT-12 (Prisma + migration) | ✅ Done — re-validated |
| TT-13 (local Docker Postgres) | ✅ Done — re-validated |
| TT-07 (CI) | ✅ Done — verified with real PRs (#13, #14) against `staging`, both checks (`backend`, `frontend`) green. See "What was found and fixed" below. **Refinement (ADR-19)**: the checks had `paths:` on the trigger, so on docs-only PRs (several this session) the required check never fired and branch protection waited forever — forcing a bypass. Dropped `paths:` from the trigger and added `dorny/paths-filter` to gate the real work per step; now a docs-only PR passes in seconds without a bypass, and one that does touch `backend/`/`frontend/` still runs the full pipeline as before |
| TT-02 (branching + branch protection) | ✅ Done — repo switched to public; two GitHub rulesets created (`main` and `staging`), Enforcement status `Active` on both, with `Require status checks to pass` requiring `backend` and `frontend`. Trello status still needs manual sync (no connector from this environment) |
| TT-03 (Vercel) | ✅ Done — project connected to the repo (auto-deploy on push to `main` confirmed); after fixing the Framework Preset (`Angular`) and Output Directory (`dist/frontend/browser`, required by Angular 18's `application` builder), `https://tg-inventory-app.vercel.app` responds `200 OK` serving `index.html` |
| TT-04 (Render/Fly.io) | ✅ Done — `tg-inventory-backend` service created on Render (`https://tg-inventory-backend.onrender.com`), connected to the repo; `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `NODE_ENV`, `FRONTEND_URL` all set. Verified with `curl`: `/health` → `200 OK` (`database: ok`), and CORS (GET + preflight OPTIONS) returns `access-control-allow-origin: https://tg-inventory-app.vercel.app` |
| TT-05 (Neon/Supabase) | ✅ Done — database created on Neon, migrations applied with `npm run prisma:migrate:staging`, `DATABASE_URL` already copied into Render's secrets (TT-04) |
| TT-06 (Cloudflare) | ⬜ Pending — full checklist in Trello, doesn't block MVP 1-4 |
| TT-08 (CD) | ⬜ Pending — **NOT a workflow**, it's configuration inside the Vercel/Render dashboards; depends on TT-03/04 |
| TT-09 (Dependabot) | 🟡 Partial — `dependabot.yml` now groups by ecosystem (max 3 PRs/week instead of 1 per package); manual confirmation in Settings → Code security still pending |
| TT-10 (secrets) | ✅ Done for what exists today — `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `NODE_ENV`, `FRONTEND_URL` loaded on Render (never in the repo, see `.env.example`). **GitHub Actions needs no secrets**: checked `ci-backend.yml`/`ci-frontend.yml` and neither uses `secrets.*` or touches a real DB or the deployed API (only `lint`/unit `test`/`audit`/`build`); and by an already-made decision (`CLAUDE.md`, plan section 9.2) there's no CD workflow that would need deploy credentials. Revisit if e2e tests against staging are ever added to CI |
| TT-14 (module boundaries) | ✅ Done — ADR-18 documented; `eslint-plugin-boundaries` in `backend/.eslintrc.js` fails `npm run lint` (and therefore `ci-backend.yml`) if a module imports another module's `domain/`/`infrastructure/`. Verified with a throwaway fixture (same-module import passes, cross-module fails with the ADR-18 message) — fixture discarded after confirming |
| TT-15 (global error handling) | ✅ Done — `GlobalExceptionFilter` (`backend/src/common/filters/`) registered via `APP_FILTER`: any exception (known or not) responds with a consistent shape (`statusCode`, `message`, `timestamp`, `path`); unknown errors return a generic 500 without leaking internal details, logged server-side. `process.on('uncaughtException'/'unhandledRejection')` in `main.ts` log and shut down in a controlled way (Render restarts the container). Verified with 3 unit tests (`global-exception.filter.spec.ts`) and a live check: compiled server run locally, `/health` → `200`, a nonexistent route → `404` in the filter's format |
| TT-16 (Prisma connection limits) | ✅ Done, including the real variable on Render — `connection_limit=5`, `pool_timeout=10`, `connect_timeout=10`, `options=-c statement_timeout=10000` documented in `.env.example`/`TRD.en.md` and already applied to Render's `DATABASE_URL`. Verified empirically against local Postgres (a 2s query passes, a 15s query gets cancelled at ~10s with Postgres' real `57014` error) and live: `curl` to production `/health` → `200 OK`, `database: ok`. Neon's numbers (104 connections at 0.25 CU, 97 after reserving 7 for the superuser) confirmed against its official docs. **Incident during rollout**: the first attempt on Render failed with `P1001 (Can't reach database server)` — the real cause was a stray trailing `"` (and likely a leading one too) carried over from the `DATABASE_URL="..."` format used in `.env` files when the value was pasted into Render's field (Render doesn't do dotenv-style parsing — it takes the pasted value verbatim). Reproduced locally to confirm before pointing to the fix. **Gotcha to remember** when copying any other value from `.env.example`/`.env.staging` into Render's dashboard: paste only the content between the quotes, never the quotes themselves |
| TT-21 (structured logging) | ✅ Done — `nestjs-pino` (`backend/src/config/logger.config.ts`, loaded in `app.module.ts`, `app.useLogger()` in `main.ts` with `bufferLogs: true`). Structured JSON to stdout in `staging`/`production`, pretty-print in `development`. Correlation id per request (`X-Request-Id`, propagated if the client already sends one). Automatic redaction of `Authorization`, cookies, `password`/`token` in the body — never in plaintext. Convention documented in `conventions.en.md` (what to log: errors/5xx always, explicit critical writes, requests already covered by `pino-http`). Verified live with the compiled server in both modes: raw JSON in `production`, pretty-print in `development`, `Authorization` header with a real token confirmed as `[Redacted]` in the log. `npm run lint`/`build`/`test` green |
| TT-19 (standard pagination) | ✅ Done — offset/limit convention for every future listing endpoint (HU-05/08/10), documented in `TRD.en.md` section 4 and `conventions.en.md`. Shared implementation in `backend/src/common/`: `dto/pagination-query.dto.ts` (`page`/`pageSize`, validated with `class-validator`, `pageSize` capped at 100 to avoid TT-16's "noisy neighbor"), `dto/paginated-response.dto.ts` (`{ items, total, page, pageSize }` shape), `utils/pagination.util.ts` (`toPrismaSkipTake()`, `buildPaginatedResponse()`). 8 new unit tests (defaults, boundary validation, `skip`/`take` math). Along the way, fixed a real gap in `jest.config.js` — `setupFiles: ['reflect-metadata']` was missing, without it any DTO using `class-transformer`'s `@Type()` failed in tests with `Reflect.getMetadata is not a function`. `npm run lint`/`build`/`test` green (12 tests, full suite) |
| TT-20 (DB indexes) | ✅ Done — verified empirically that PostgreSQL doesn't auto-index FKs (unlike MySQL): none of the 27 FK columns in the initial migration had an index. 17 new indexes added with the criteria documented in `TRD.en.md` section 3 (every FK used for filtering/joins, except very small config tables; composites where the query pattern is composite — `InventoryMovement[productId, locationId]`, `Purchase[supplierId, purchasedAt]`, `AuditEvent[entity, entityId]`; no duplicating what a `@@unique` already covers). Migration `20260813043614_add_indexes` generated and applied locally (`prisma migrate dev`), SQL reviewed line by line (only `CREATE INDEX`, nothing else). Verified live: compiled server up, `/health` → `200 OK`. **Still needs applying to Neon staging** — pending user confirmation on whether I run it (`npm run prisma:migrate:staging`, the mechanism already sanctioned by ADR-15) or they do it manually. **Separate finding, out of scope**: no soft-delete (`deletedAt`) and no `DELETE` planned on any API endpoint — 13 of 17 models don't even have the `status` pattern `User`/`Location`/`Product`/`Supplier` use. Nothing touched about it; left for a new TT the user will add to Trello |

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
