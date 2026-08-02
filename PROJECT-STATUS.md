# Estado del proyecto — leer esto primero

> Última actualización: tras la estandarización completa del código a inglés (renombrado de carpetas, reescritura de `schema.prisma`, reset de la BD local). **TT-11, TT-12 y TT-13 quedaron pendientes de re-validación** — no están cerradas. Actualízalo tú mismo al cerrar cada iteración. English version below.

## Qué es este proyecto

Sistema de control de inventario: proveedores, inventario por ubicaciones, alertas de stock, historial de compras, comparativa de precios, RBAC, y solicitudes internas con flujo de aprobación. Un solo desarrollador, fines de semana. Ver `docs/PRD.md` para el detalle completo.

## Dónde estamos ahora mismo

**Fase**: Iteración 0 (setup), aún no cerrada. **No se ha escrito ninguna HU de negocio todavía.**

| Tarea técnica | Estado |
|---|---|
| TT-11 (health-check) | ⬜ **Pendiente de re-validación** — se probó ok una vez, pero después de la estandarización a inglés no se ha vuelto a confirmar |
| TT-12 (Prisma + migración) | ⬜ **Pendiente de re-validación** — la BD local se reseteó y el schema se reescribió en inglés; falta correr `prisma migrate dev` de nuevo y confirmar que no da error |
| TT-13 (Docker Postgres local) | ⬜ **Pendiente de re-validación** — el volumen de Docker se borró (`docker compose down -v`) durante la corrección; falta confirmar que `docker compose up -d` levanta el contenedor sin problema |
| TT-01 (crear repo en GitHub) | ⬜ Pendiente — sigue siendo el siguiente paso real, bloquea todo lo demás |
| TT-02 a TT-10 | ⬜ Pendientes, dependen de TT-01 |

**Por qué se resetea la validación**: el código se entregó completo de nuevo después de corregir que el `schema.prisma` y varias carpetas del frontend estaban en español — eso implicó borrar la base de datos local y las migraciones para regenerarlas en inglés. Nada de esto se ha vuelto a probar de punta a punta desde entonces.

**Lo que sí existe ya, en código local** (esqueleto, sin lógica de negocio):
- Backend NestJS: estructura hexagonal, `schema.prisma` completo (17 entidades, en inglés), guards/decoradores de RBAC, health-check
- Frontend Angular: estructura por features (todas en inglés: `suppliers`, `locations`, `products`, `inventory`, `alerts`, `purchases`, `requests`, `users-roles`), feature `suppliers` como plantilla de referencia
- `docker-compose.yml`, workflows de CI (`ci-backend.yml`/`ci-frontend.yml`), `dependabot.yml` — escritos pero **nunca han corrido** (necesitan el repo en GitHub)
- `frontend/public/logo-placeholder.png` — logo temporal, reemplazar cuando exista el real

## Qué leer, y en qué orden, si retomas esto en una conversación nueva

1. **Este archivo** — resumen del estado
2. `docs/PRD.md` — qué se está construyendo y por qué
3. `docs/plan-inicial-proyecto-inventario.md` — el documento maestro: metodología, backlog completo de 30 HU, roadmap de 6 MVPs, MER, API, arquitectura, Gitflow (todo lo demás remite a este)
4. `docs/TRD.md` — resumen técnico si solo necesitas el "cómo", no el "por qué"
5. `docs/convenciones.md` y `docs/decisiones.md` — antes de tocar código, para no repetir errores ya corregidos (ej. el schema estuvo en español al principio, se corrigió — ver ADR-12)

## Siguiente paso concreto

1. **Re-validar TT-11, TT-12 y TT-13** (checklist abajo) — están en la columna `En pruebas` de Trello, no en `Hecho`
2. Recién después, ejecutar **TT-01**: crear el repositorio en GitHub y subir el proyecto

### Checklist de re-validación (repetir desde cero)
```powershell
docker compose up -d
docker ps                              # debe aparecer inventario-postgres-dev
cd backend
npx prisma validate
npx prisma migrate dev --name init
npm run start:dev
# abrir http://localhost:3000/health → debe responder {"status":"ok","database":"ok"}
```
Si los tres pasos funcionan, recién ahí muévelas a `Hecho` en Trello (o pídele a Claude que lo haga por ti).

## Tablero de Trello

https://trello.com/b/BS5tzENy/sistema-de-control-de-inventario — 43 tarjetas (28 HU + 13 TT + 2 HU de Epic 9). TT-11, TT-12 y TT-13 están en `En pruebas`, no en `Hecho` — refleja el mismo estado de esta tabla.

---

# Project status — read this first

> Last updated: after the full code standardization to English (folder renames, `schema.prisma` rewrite, local DB reset). **TT-11, TT-12, and TT-13 are pending re-validation** — they are not closed. Keep this updated yourself as each iteration closes.

## What this project is

Inventory control system: suppliers, inventory by location, stock alerts, purchase history, price comparison, RBAC, and internal requests with an approval flow. A single developer, weekends only. See `docs/PRD.en.md` for full detail.

## Where things stand right now

**Phase**: Iteration 0 (setup), not closed yet. **No business story has been implemented yet.**

| Technical task | Status |
|---|---|
| TT-11 (health-check) | ⬜ **Pending re-validation** — tested ok once, but not re-confirmed since the English standardization |
| TT-12 (Prisma + migration) | ⬜ **Pending re-validation** — the local DB was reset and the schema rewritten in English; need to re-run `prisma migrate dev` and confirm it's error-free |
| TT-13 (local Docker Postgres) | ⬜ **Pending re-validation** — the Docker volume was deleted (`docker compose down -v`) during the fix; need to confirm `docker compose up -d` brings the container back up cleanly |
| TT-01 (create GitHub repo) | ⬜ Pending — still the real next step, blocks everything else |
| TT-02 through TT-10 | ⬜ Pending, depend on TT-01 |

**Why validation resets**: the code was delivered again in full after fixing that `schema.prisma` and several frontend folders were in Spanish — that meant deleting the local database and migrations to regenerate them in English. None of it has been re-tested end to end since.

**What already exists in local code** (skeleton, no business logic):
- NestJS backend: hexagonal structure, full `schema.prisma` (17 entities, in English), RBAC guards/decorators, health-check
- Angular frontend: feature-based structure (all in English: `suppliers`, `locations`, `products`, `inventory`, `alerts`, `purchases`, `requests`, `users-roles`), `suppliers` feature as the reference template
- `docker-compose.yml`, CI workflows (`ci-backend.yml`/`ci-frontend.yml`), `dependabot.yml` — written but **never run** (need the GitHub repo first)
- `frontend/public/logo-placeholder.png` — temporary logo, replace once the real one exists

## What to read, and in what order, if picking this up in a new conversation

1. **This file** — status summary
2. `docs/PRD.en.md` — what's being built and why
3. `docs/project-plan.en.md` — the master document: methodology, full 30-story backlog, 6-MVP roadmap, ER model, API, architecture, Gitflow (everything else points back to this)
4. `docs/TRD.en.md` — technical summary if you only need the "how", not the "why"
5. `docs/conventions.en.md` and `docs/decisions.en.md` — read before touching code, to avoid repeating already-fixed mistakes (e.g. the schema was in Spanish at first, got corrected — see ADR-12)

## Concrete next step

1. **Re-validate TT-11, TT-12, and TT-13** (checklist below) — they're in Trello's `In testing` column, not `Done`
2. Only after that, execute **TT-01**: create the GitHub repository and push the project

### Re-validation checklist (repeat from scratch)
```powershell
docker compose up -d
docker ps                              # inventario-postgres-dev should appear
cd backend
npx prisma validate
npx prisma migrate dev --name init
npm run start:dev
# open http://localhost:3000/health → should respond {"status":"ok","database":"ok"}
```
If all three steps work, only then move them to `Done` on Trello (or ask Claude to do it for you).

## Trello board

https://trello.com/b/BS5tzENy/sistema-de-control-de-inventario — 43 cards (28 stories + 13 technical tasks + 2 Epic 9 stories). TT-11, TT-12, and TT-13 are in `In testing`, not `Done` — mirrors the same status as the table above.
