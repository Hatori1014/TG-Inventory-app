# TRD — Documento de Requerimientos Técnicos

> Fuente: compilado a partir de `plan-inicial-proyecto-inventario.md`. English version: `TRD.en.md`.

## 1. Arquitectura

Monolito modular con arquitectura hexagonal por módulo (`domain → application → infrastructure → interfaz REST`). Microservicios descartados por escala (un solo desarrollador, decenas de usuarios). Ver diagramas: `architecture-diagram.png`, `component-diagram.png`, `internal-interaction-diagram.png`, y detalle completo en el plan, secciones 4.1 y 8.

## 2. Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | Angular 18+ (standalone components), TypeScript, Angular Material |
| Backend | NestJS (Node.js 20+ LTS), TypeScript |
| ORM | Prisma |
| Base de datos | PostgreSQL 16 |
| Auth | JWT + Passport.js |
| Almacenamiento de archivos | Cloudflare R2 (post-MVP) |
| Hosting | Vercel (frontend) + Render/Fly.io (backend) |
| BD gestionada | Neon o Supabase |
| CI/CD | GitHub Actions |
| Proxy/WAF | Cloudflare (plan gratuito) |

Detalle completo y justificación de cada elección: plan, sección 4.

## 3. Modelo de datos

17 entidades — ver Modelo Entidad-Relación completo en el plan, sección 7, y `schema.prisma` en `backend/prisma/`. Diagrama: `mer_sistema_inventario_en.png`.

Decisiones clave:
- `InventoryMovement` es la fuente de verdad (bitácora inmutable); `LocationStock` es una tabla derivada actualizada en la misma transacción
- `ApprovalFlow` es configurable (soporta 1 o varios niveles) sin necesidad de migrar el esquema

## 4. API

Especificación completa de 10 módulos REST (Auth, Users/Roles, Suppliers, Locations, Products, Inventory, Alerts, Purchases, Requests, Audit) en el plan, sección 7.4 — incluye método, ruta, acción, rol mínimo requerido y HU asociada.

## 5. Requerimientos no funcionales

| Atributo | Requerimiento |
|---|---|
| Seguridad | Checklist OWASP Top 10 completo — plan, sección 4.7 |
| Escalabilidad | De decenas a cientos de usuarios sin rediseño |
| Disponibilidad | Aceptable en capa gratuita para la escala definida |
| Trazabilidad | Todo movimiento/aprobación registrado de forma inmutable |
| Mantenibilidad | Arquitectura hexagonal, TDD/BDD, convenciones de código documentadas |

## 6. Seguridad

- RBAC validado en backend (nunca solo en frontend)
- Contraseñas hasheadas (bcrypt/argon2), rate limiting en login
- Validación de entrada con `class-validator`, queries parametrizadas (Prisma)
- HTTPS forzado + Helmet (cabeceras de seguridad)
- Escaneo de dependencias (Dependabot + `npm audit` en CI)
- Cloudflare como WAF/proxy adicional
- Checklist completo de mitigación por riesgo OWASP: plan, sección 4.7

## 7. Estrategia de testing

| Tipo | Uso | Herramienta |
|---|---|---|
| TDD | Lógica de dominio crítica (cálculo de stock, movimientos) | Jest |
| BDD | Flujos de negocio críticos (aprobaciones, RBAC, alertas) | `jest-cucumber` (Gherkin) |
| E2E | Flujos completos de usuario | Playwright |

Detalle y regla de decisión (cuándo usar cada uno): plan, sección 5.

## 8. Infraestructura y despliegue

- **Repositorio**: monorepo (`backend/`, `frontend/`, `docs/`)
- **Branching**: Gitflow simplificado (`main`/`staging`/`feature/*`/`hotfix/*`) — plan, sección 9.1
- **CI**: GitHub Actions, lint + type-check + tests + build por PR
- **CD**: auto-deploy nativo de Vercel/Render gateado por branch protection
- **Docker**: solo para Postgres local (desarrollo), no para producción — justificación en plan, sección 9.3

## 9. Restricciones técnicas

- 100% capa gratuita: límites de Vercel, Render/Fly.io, Neon/Supabase, Cloudflare R2 aplican
- Sin colas de mensajes, sin cache (Redis), sin WebSockets — no planeados para el MVP
- Todo el código (identificadores, comentarios, schema de BD) en inglés; la UI visible al usuario en español — ver `convenciones.md`
