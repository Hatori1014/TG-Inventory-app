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

### Paginación (TT-19)

Convención estándar para todo endpoint de listado (HU-05 histórico de compras, HU-08 movimientos, HU-10 stock, y cualquier otro futuro): offset/limit, no cursor — más simple y suficiente a esta escala (decenas/cientos de usuarios, sin necesidad de paginar sobre datos que cambian en tiempo real).

- **Query params**: `page` (default `1`, mínimo `1`) y `pageSize` (default `20`, máximo `100` — el tope evita que un cliente pida un `pageSize` enorme y convierta un listado en el "noisy neighbor" que TT-16 buscaba prevenir).
- **Respuesta**: `{ items: T[], total: number, page: number, pageSize: number }`.
- **Implementación compartida** en `backend/src/common/`: `dto/pagination-query.dto.ts` (query DTO validado con `class-validator`/`class-transformer`), `dto/paginated-response.dto.ts` (shape de la respuesta), `utils/pagination.util.ts` (`toPrismaSkipTake()` convierte `page`/`pageSize` a `skip`/`take` de Prisma; `buildPaginatedResponse()` arma la respuesta). Cada módulo de listado los reutiliza — no se repite la lógica de paginación en cada use-case.

## 5. Requerimientos no funcionales

| Atributo | Requerimiento |
|---|---|
| Seguridad | Checklist OWASP Top 10 completo — plan, sección 4.7 |
| Escalabilidad | De decenas a cientos de usuarios sin rediseño |
| Disponibilidad | Aceptable en capa gratuita para la escala definida |
| Trazabilidad | Todo movimiento/aprobación registrado de forma inmutable |
| Mantenibilidad | Arquitectura hexagonal, TDD/BDD, convenciones de código documentadas |

### Límites de conexión y timeouts de BD (TT-16)

Todos los módulos comparten un único `PrismaClient`/pool de conexiones — sin límites explícitos, un query pesado o mal escrito en un módulo puede agotar el pool y afectar por timeout a módulos sin relación con el problema ("noisy neighbor" dentro del mismo proceso). Parámetros añadidos a `DATABASE_URL` (ver `backend/.env.example`):

| Parámetro | Valor | Por qué |
|---|---|---|
| `connection_limit` | `5` | Explícito en vez del default de Prisma (`núm. CPUs físicas × 2 + 1`, impredecible según el host). Neon free tier: al mínimo de autoscaling (0.25 CU) permite 104 conexiones directas, 7 reservadas para el superusuario → 97 disponibles. 5 deja margen amplio para un solo proceso Node de bajo tráfico (Iteración 0-1). |
| `pool_timeout` | `10` (segundos) | Cuánto espera un query a que se libere una conexión del pool de Prisma antes de fallar — evita que un query en cola espere indefinidamente por culpa de otro módulo. |
| `connect_timeout` | `10` (segundos) | Subido del default de Prisma (5s) por el "cold start" de Neon: el compute puede estar suspendido (autoscale-to-zero) y tardar unos segundos en despertar en la primera conexión. |
| `options=-c statement_timeout=10000` | `10000` ms | Timeout de query a nivel Postgres (no es un parámetro nativo de Prisma — se pasa vía `options`, el mecanismo estándar de libpq). Evita que un query colgado retenga una conexión indefinidamente. Verificado empíricamente contra Postgres local: un `pg_sleep(15)` se cancela a los ~10s con el error real de Postgres (`57014 — canceling statement due to statement timeout`); un query de 2s no se ve afectado. |

Fuente de los números de Neon: [documentación de connection pooling de Neon](https://neon.com/docs/connect/connection-pooling) (tabla de `max_connections` por tamaño de compute, consultada 2026-08-13).

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
