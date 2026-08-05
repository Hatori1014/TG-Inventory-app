# Estado del proyecto — leer esto primero

> Última actualización: TT-02 a TT-10 ya tienen checklists de pasos accionables en Trello. Próximo paso literal: abrir un PR de prueba para resolver TT-02 y TT-07 a la vez. Actualízalo tú mismo al cerrar cada iteración. English version below.

## Nota de estructura

`docs/` está organizado en subcarpetas — `docs/esp/` (español), `docs/en/` (inglés), `docs/Diagrams/` (todos los PNG). Ver ADR-15 en `decisiones.md`.

## Qué es este proyecto

Sistema de control de inventario: proveedores, inventario por ubicaciones, alertas de stock, historial de compras, comparativa de precios, RBAC, y solicitudes internas con flujo de aprobación. Un solo desarrollador, fines de semana. Ver `docs/esp/PRD.md` para el detalle completo.

## Dónde estamos ahora mismo

**Fase**: Iteración 0 (setup), en curso. **No se ha escrito ninguna HU de negocio todavía.**

### Próximo paso inmediato: el PR de prueba

Resuelve **TT-02 y TT-07 a la vez** (ver secuencia completa en `docs/Diagrams/branch-protection-setup-sequence.png`):
1. Crear una rama nueva desde `staging` (ej. `chore/verify-ci-pipeline`)
2. Hacer un cambio trivial que toque `backend/` o `frontend/` (ej. un comentario, o bump de versión en un `package.json`)
3. Push + abrir el PR contra `staging`
4. Confirmar en la pestaña "Actions" del repo que `ci-backend.yml`/`ci-frontend.yml` corrieron
5. Recién ahí, ir a `Settings → Branches` — ya se puede seleccionar el check en la regla de protección (ver checklist completo en la tarjeta TT-02 de Trello)

### Tareas técnicas, en detalle

| Tarea técnica | Estado |
|---|---|
| TT-01 (crear repo en GitHub) | ✅ Hecho — push confirmado |
| TT-11 (health-check) | ✅ Hecho — re-validado |
| TT-12 (Prisma + migración) | ✅ Hecho — re-validado |
| TT-13 (Docker Postgres local) | ✅ Hecho — re-validado |
| TT-02 (branching + branch protection) | ⬜ Pendiente — checklist completo en Trello, es el siguiente paso literal (ver arriba) |
| TT-07 (CI) | ⬜ Pendiente de verificación — se resuelve con el mismo PR de prueba que TT-02 |
| TT-03 (Vercel) | ⬜ Pendiente — checklist completo en Trello |
| TT-04 (Render/Fly.io) | ⬜ Pendiente — checklist completo en Trello |
| TT-05 (Neon/Supabase) | ⬜ Pendiente — checklist completo en Trello |
| TT-06 (Cloudflare) | ⬜ Pendiente — checklist completo en Trello, no bloquea MVP 1-4 |
| TT-08 (CD) | ⬜ Pendiente — **NO es un workflow**, es configuración en los dashboards de Vercel/Render; depende de TT-03/04 |
| TT-09 (Dependabot) | ⬜ Pendiente — checklist completo en Trello (requiere confirmación manual en Settings → Code security) |
| TT-10 (secrets) | ⬜ Pendiente — checklist completo en Trello, depende de TT-03/04/05 |

### Backlog de HU (30, en la columna `Backlog`)

Formato base consistente en las 30 (rol/acción/beneficio). ~10 todavía no tienen un criterio de aceptación verificable, solo notas de contexto — **no es bloqueante**: se completa cuando cada una entra a Definition of Ready, justo antes de moverla a "En progreso" (ver `docs/esp/flujo-de-trabajo.md`). No hace falta resolverlo ahora.

**Lo que ya existe en código, ya subido a GitHub**:
- Backend NestJS: estructura hexagonal, `schema.prisma` completo (17 entidades, en inglés), guards/decoradores de RBAC, health-check
- Frontend Angular: estructura por features (todas en inglés), feature `suppliers` como plantilla de referencia
- `docker-compose.yml`, workflows de CI, `dependabot.yml` — escritos, todavía sin verificar en GitHub Actions (ese es el paso inmediato de arriba)
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

> Last updated: TT-02 through TT-10 now have actionable step checklists in Trello. Literal next step: open a test PR to resolve TT-02 and TT-07 at once. Keep this updated yourself as each iteration closes.

## Structure note

`docs/` is organized into subfolders — `docs/esp/` (Spanish), `docs/en/` (English), `docs/Diagrams/` (all PNGs). See ADR-15 in `decisions.en.md`.

## What this project is

Inventory control system: suppliers, inventory by location, stock alerts, purchase history, price comparison, RBAC, and internal requests with an approval flow. A single developer, weekends only. See `docs/en/PRD.en.md` for full detail.

## Where things stand right now

**Phase**: Iteration 0 (setup), in progress. **No business story has been implemented yet.**

### Immediate next step: the test PR

Resolves **TT-02 and TT-07 at once** (full sequence in `docs/Diagrams/branch-protection-setup-sequence.png`):
1. Create a new branch from `staging` (e.g. `chore/verify-ci-pipeline`)
2. Make a trivial change touching `backend/` or `frontend/` (e.g. a comment, or a version bump in a `package.json`)
3. Push + open the PR against `staging`
4. Confirm in the repo's "Actions" tab that `ci-backend.yml`/`ci-frontend.yml` ran
5. Only then, go to `Settings → Branches` — the check will now be selectable in the protection rule (full checklist on the TT-02 Trello card)

### Technical tasks, in detail

| Technical task | Status |
|---|---|
| TT-01 (create GitHub repo) | ✅ Done — push confirmed |
| TT-11 (health-check) | ✅ Done — re-validated |
| TT-12 (Prisma + migration) | ✅ Done — re-validated |
| TT-13 (local Docker Postgres) | ✅ Done — re-validated |
| TT-02 (branching + branch protection) | ⬜ Pending — full checklist in Trello, the literal next step (see above) |
| TT-07 (CI) | ⬜ Pending verification — resolved by the same test PR as TT-02 |
| TT-03 (Vercel) | ⬜ Pending — full checklist in Trello |
| TT-04 (Render/Fly.io) | ⬜ Pending — full checklist in Trello |
| TT-05 (Neon/Supabase) | ⬜ Pending — full checklist in Trello |
| TT-06 (Cloudflare) | ⬜ Pending — full checklist in Trello, doesn't block MVP 1-4 |
| TT-08 (CD) | ⬜ Pending — **NOT a workflow**, it's configuration inside the Vercel/Render dashboards; depends on TT-03/04 |
| TT-09 (Dependabot) | ⬜ Pending — full checklist in Trello (needs manual confirmation in Settings → Code security) |
| TT-10 (secrets) | ⬜ Pending — full checklist in Trello, depends on TT-03/04/05 |

### Story backlog (30, in the `Backlog` column)

Consistent base format across all 30 (role/action/benefit). ~10 still lack a verifiable acceptance criterion, only context notes — **not blocking**: gets completed when each one hits Definition of Ready, right before moving to "In progress" (see `docs/en/workflow.en.md`). No need to resolve this now.

**What already exists in code, already pushed to GitHub**:
- NestJS backend: hexagonal structure, full `schema.prisma` (17 entities, in English), RBAC guards/decorators, health-check
- Angular frontend: feature-based structure (all in English), `suppliers` feature as the reference template
- `docker-compose.yml`, CI workflows, `dependabot.yml` — written, still unverified in GitHub Actions (that's the immediate next step above)
- `frontend/public/logo-placeholder.png` — temporary logo

## What to read, and in what order, if picking this up in a new conversation

1. **This file**
2. `docs/en/PRD.en.md` — what's being built and why
3. `docs/en/project-plan.en.md` — the master document
4. `docs/en/TRD.en.md` — technical summary
5. `docs/en/conventions.en.md` and `docs/en/decisions.en.md` — read before touching code

## Trello board

https://trello.com/b/BS5tzENy/sistema-de-control-de-inventario — 43 cards, every card in `Current iteration` (TT-02 through TT-10) now has a step checklist, not just a one-line description.
