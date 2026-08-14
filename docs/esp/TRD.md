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

19 entidades (17 originales + `Category`/`Unit`, TT-23) — ver Modelo Entidad-Relación completo en el plan, sección 7, y `schema.prisma` en `backend/prisma/`. Diagrama: `mer_sistema_inventario_en.png` (pendiente de actualizar con las dos entidades nuevas).

Decisiones clave:
- `InventoryMovement` es la fuente de verdad (bitácora inmutable); `LocationStock` es una tabla derivada actualizada en la misma transacción
- `ApprovalFlow` es configurable (soporta 1 o varios niveles) sin necesidad de migrar el esquema

### Índices (TT-20)

PostgreSQL, a diferencia de MySQL, **no indexa automáticamente las columnas FK** — verificado empíricamente en la migración inicial (`20260803001328_init`): ninguna de las 27 columnas FK tenía índice, solo las cubiertas por `@unique`/`@@unique`. Criterio aplicado en la migración `20260813043614_add_indexes` (17 índices nuevos, sin tocar datos):

- **Toda FK usada como filtro o join** — salvo en tablas de configuración muy pequeñas donde el costo de escritura no se justifica (`ApprovalFlow`, `RolePermission`: decenas de filas, no cientos de miles).
- **`InventoryMovement`** (la bitácora, la tabla más grande y más consultada) recibió la indexación más deliberada: `[productId, locationId]` compuesto (historial de un producto en una ubicación, HU-08/HU-10), `occurredAt` (reportes por rango de fecha), y cada FK restante por separado (`batchId`, `userId`, `purchaseId`, `requestId`) porque cada una responde una consulta distinta y real (movimientos de un lote, de un usuario, ligados a una compra o a una solicitud).
- **Compuestos donde el patrón de consulta es compuesto**: `Purchase[supplierId, purchasedAt]` (historial de compras por proveedor, HU-05), `AuditEvent[entity, entityId]` (historial de una entidad específica).
- **No se duplica un índice ya cubierto** por un `@@unique` existente salvo que el patrón de consulta no calce con el prefijo izquierdo — ej. `LocationStock` ya tiene `@@unique([productId, locationId, batchId])`, pero consultar "todo el stock de una ubicación, cualquier producto" no usa ese índice (no es el prefijo izquierdo) — se agregó `@@index([locationId])` aparte.

### Concurrencia en `LocationStock` (TT-17, ADR-20)

`LocationStock` tiene columna `version Int @default(0)` para locking optimista: dos requests concurrentes actualizando el mismo registro (lost update) se detectan porque el segundo `UPDATE` no encuentra la versión que esperaba. Patrón para el use-case que actualiza stock (aún no implementado): `updateMany({ where: { id, version }, data: { ..., version: { increment: 1 } } })`; si no afecta filas, releer y reintentar hasta 3 veces (`withOptimisticLock()` en `backend/src/common/utils/optimistic-lock.util.ts`) antes de devolver `409 Conflict`. Ver ADR-20 para las alternativas descartadas (`SELECT FOR UPDATE`, 409 sin reintento).

### Borrado lógico (TT-22, ADR-22)

No hay `DELETE` físico planeado para ningún endpoint. Cuando una HU real defina una acción de "eliminar" sobre un modelo sin `status` (`User`/`Location`/`Product`/`Supplier` ya lo tienen y no cambian), se le agrega `deletedAt DateTime?` a ese modelo puntual, con lectura filtrada vía extensión de Prisma Client — nunca de forma preventiva en los 17 modelos. Nunca aplica a `InventoryMovement`/`AuditEvent` (registro histórico) ni a tablas de enlace/config o filas derivadas sin ciclo de vida propio. Ver ADR-22 para el detalle completo y las alternativas descartadas.

### Catálogos administrables (TT-23, ADR-23)

`Category` y `Unit` son tablas propias (no texto libre, no enum) — `Product.categoryId`/`Product.unitId` referencian `Category`/`Unit` en vez de `Product.category`/`Product.unit` como `String` (diseño original de HU-28). Cada catálogo tiene `name` único y `status` (`active`/`inactive`) para desactivar sin borrar. El mismo rol que administra productos (Admin Inventario, HU-28) los administra — sin cambios en el modelo de permisos, ya genérico (`Permission.module`/`action`). Regla general: tabla cuando un admin necesita crear/editar valores sin deploy y el backend no depende del valor exacto; enum cuando sí depende (`MovementType`, `PurchaseStatus`, etc.). Ver ADR-23 para el detalle completo.

## 4. API

Especificación completa de 10 módulos REST (Auth, Users/Roles, Suppliers, Locations, Products, Inventory, Alerts, Purchases, Requests, Audit) en el plan, sección 7.4 — incluye método, ruta, acción, rol mínimo requerido y HU asociada.

### Idempotencia en escrituras críticas (TT-18, ADR-21)

Endpoints que crean movimientos de inventario, compras, solicitudes o cambios de rol (HU-08, HU-13, HU-15, HU-16) deben marcarse con `@Idempotent()` (`backend/src/common/decorators/idempotent.decorator.ts`) y `@UseInterceptors(IdempotencyInterceptor)` (`backend/src/common/interceptors/`). El cliente genera un `Idempotency-Key` (UUID) por operación lógica y lo manda como header; el interceptor lo exige, devuelve la respuesta ya guardada en `IdempotencyKey` (tabla con `key` único) si la key se repite, sin re-ejecutar el handler, y resuelve la carrera entre dos requests concurrentes con la misma key vía el constraint único de Postgres. Ver ADR-21 para las alternativas descartadas (deshabilitar el botón en frontend, Redis).

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
