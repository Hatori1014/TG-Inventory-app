# Sistema de Control de Inventario

*[English version below / versión en inglés más abajo →](#inventory-control-system)*

Monorepo con backend (NestJS) y frontend (Angular). Ver `docs/plan-inicial-proyecto-inventario.md` para el plan completo (requerimientos, HU, roadmap de MVPs, MER, API, arquitectura) — también disponible en inglés como `docs/project-plan.en.md`.

## Estado actual

Esqueleto de **Iteración 0** (setup). Los módulos de negocio (auth, suppliers, inventory, etc.) todavía no tienen lógica implementada — son la Iteración 1 en adelante (ver sección 6 del plan).

## Requisitos previos

- Node.js 20 LTS
- Docker (solo para Postgres local — ver sección 9.3 del plan)

## Puesta en marcha local

```bash
# 1. Base de datos local
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env        # completar JWT_SECRET
npm install
npx prisma migrate dev --name init
npm run start:dev           # http://localhost:3000 (docs en /docs)

# Para aplicar migraciones a Neon (staging), en vez de a Docker:
# 1. Crear backend/.env.staging con el DATABASE_URL de Neon (no se commitea, ver .gitignore)
# 2. npm run prisma:migrate:staging   (usa `prisma migrate deploy`, nunca `migrate dev`, contra staging)

# 3. Frontend (en otra terminal)
cd frontend
npm install
npm start                   # http://localhost:4200
```

CORS del backend (`main.ts`) lee `FRONTEND_URL` del entorno — en local cae por defecto a `http://localhost:4200`. En Render (TT-04), esa variable debe apuntar al frontend desplegado en Vercel: `https://tg-inventory-app.vercel.app` (ver `.env.example`).

El frontend no necesita un segundo archivo `.env` como el backend: Angular ya resuelve el equivalente con `environment.ts` / `environment.staging.ts` / `environment.prod.ts` más los `fileReplacements` en `angular.json`, uno por configuración de build (`development`/`staging`/`production`). El `apiUrl` de cada uno queda pendiente hasta tener la URL del backend en Render (TT-04).

## Pasos manuales pendientes (no ejecutables desde este entorno)

Estas tareas técnicas (sección 3.2 del plan) requieren crear cuentas reales y no se pueden automatizar:

- [x] **TT-01** — Crear el repositorio en GitHub y subir este contenido
- [x] **TT-02** — Configurar protección de ramas (`main`, `staging`) exigiendo que `backend`/`frontend` pasen antes de mergear (sección 9.1 del plan)
- [ ] **TT-03** — Crear proyecto en Vercel (frontend), conectado al repo — URL: https://tg-inventory-app.vercel.app (falta verificar auto-deploy end-to-end)
- [ ] **TT-04** — Crear servicio en Render o Fly.io (backend), conectado al repo
- [x] **TT-05** — Crear base de datos en Neon, migraciones aplicadas (`npm run prisma:migrate:staging`); falta copiar `DATABASE_URL` a los secrets de Render al hacer TT-04
- [ ] **TT-06** — Crear cuenta Cloudflare (proxy/WAF) + bucket R2 (solo necesario para MVP 5)
- [ ] **TT-10** — Cargar `JWT_SECRET`, `DATABASE_URL`, `FRONTEND_URL`, etc. como secrets en GitHub Actions y en cada proveedor (nunca en el repo)

## Estructura

Ver sección 8 del plan para el detalle completo y el porqué de cada decisión.

```
backend/    NestJS — arquitectura hexagonal por módulo (domain/application/infrastructure)
frontend/   Angular — standalone components, organizados por feature
docs/       Documentación del proyecto, en español e inglés (versionada junto al código)
```

## Idioma del proyecto

Código (identificadores, comentarios, schema de BD): **inglés**. Documentación de negocio (`docs/`) y comunicación con el usuario funcional: **español**, con traducción al inglés disponible (sufijo `.en.md`). La interfaz visible al usuario final se mantiene en español. Ver `docs/convenciones.md`.

---

# Inventory Control System

*Versión en español más arriba / [Spanish version above ↑](#sistema-de-control-de-inventario)*

Monorepo with a NestJS backend and an Angular frontend. See `docs/project-plan.en.md` for the full plan (requirements, user stories, MVP roadmap, ER model, API, architecture) — the original Spanish version is `docs/plan-inicial-proyecto-inventario.md`.

## Current status

**Iteration 0** skeleton (setup). Business modules (auth, suppliers, inventory, etc.) don't have any logic implemented yet — that's Iteration 1 onward (see plan section 6).

## Prerequisites

- Node.js 20 LTS
- Docker (local Postgres only — see plan section 9.3)

## Running locally

```bash
# 1. Local database
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env        # fill in JWT_SECRET
npm install
npx prisma migrate dev --name init
npm run start:dev           # http://localhost:3000 (docs at /docs)

# To apply migrations to Neon (staging) instead of Docker:
# 1. Create backend/.env.staging with Neon's DATABASE_URL (never committed, see .gitignore)
# 2. npm run prisma:migrate:staging   (uses `prisma migrate deploy`, never `migrate dev`, against staging)

# 3. Frontend (in another terminal)
cd frontend
npm install
npm start                   # http://localhost:4200
```

The backend's CORS (`main.ts`) reads `FRONTEND_URL` from the environment — locally it falls back to `http://localhost:4200`. On Render (TT-04), that variable must point to the frontend deployed on Vercel: `https://tg-inventory-app.vercel.app` (see `.env.example`).

The frontend doesn't need a second `.env` file like the backend: Angular already covers that with `environment.ts` / `environment.staging.ts` / `environment.prod.ts` plus the `fileReplacements` in `angular.json`, one per build configuration (`development`/`staging`/`production`). Each one's `apiUrl` stays pending until the backend's Render URL exists (TT-04).

## Pending manual steps (can't be run from this environment)

These technical tasks (plan section 3.2) require creating real accounts and can't be automated:

- [x] **TT-01** — Create the GitHub repository and push this content
- [x] **TT-02** — Set up branch protection (`main`, `staging`) requiring `backend`/`frontend` to pass before merging (plan section 9.1)
- [ ] **TT-03** — Create a Vercel project (frontend), connected to the repo — URL: https://tg-inventory-app.vercel.app (end-to-end auto-deploy still needs verifying)
- [ ] **TT-04** — Create a Render or Fly.io service (backend), connected to the repo
- [x] **TT-05** — Create a database on Neon, migrations applied (`npm run prisma:migrate:staging`); still need to copy `DATABASE_URL` into Render's secrets during TT-04
- [ ] **TT-06** — Create a Cloudflare account (proxy/WAF) + R2 bucket (only needed for MVP 5)
- [ ] **TT-10** — Load `JWT_SECRET`, `DATABASE_URL`, `FRONTEND_URL`, etc. as secrets in GitHub Actions and in each provider (never in the repo)

## Structure

See plan section 8 for the full detail and the rationale behind each decision.

```
backend/    NestJS — hexagonal architecture per module (domain/application/infrastructure)
frontend/   Angular — standalone components, organized by feature
docs/       Project documentation, in Spanish and English (versioned alongside the code)
```

## Project language

Code (identifiers, comments, DB schema): **English**. Business documentation (`docs/`) and communication with the functional stakeholder: **Spanish**, with an English translation available (`.en.md` suffix). The end-user-facing UI stays in Spanish. See `docs/conventions.en.md`.
