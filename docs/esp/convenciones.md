# Convenciones

> Fuente: `plan-inicial-proyecto-inventario.md` (secciones 4.6, 5, 8, 9.1). No hay código real todavía para verificar que estas convenciones se respetan — son las definidas en el diseño. English version: `conventions.en.md`.

## Idioma

**Inglés** para todo lo relacionado con código: nombres de rama, commits, variables, funciones, archivos, comentarios en el código, **y también el schema de base de datos** (modelos, campos, tablas y columnas de Prisma/Postgres). Es el idioma del ecosistema (NestJS, Angular, Prisma, Conventional Commits). **Español** se reserva para la documentación de negocio (`docs/`, en ambos idiomas) y la comunicación con el usuario funcional — por eso el MER (sección 7 del plan) está en español pero `schema.prisma` está en inglés; son la misma modelación, en dos idiomas para dos audiencias distintas.

**Excepción explícita — texto de la interfaz (UI)**: el idioma del código no aplica al texto que ve el usuario final en pantalla (labels, botones, mensajes). La aplicación está pensada para usuarios que hablan español, así que la UI se queda en español — salvo por HU-30 (selector de idioma ES/EN, post-MVP, sección 3 del plan), que la hace configurable.

## Naming — backend (NestJS)

Por tipo de archivo, dentro de cada módulo (kebab-case + sufijo, en inglés):
- `*.entity.ts` — entidad de dominio, **con comportamiento** (no solo datos — ver ADR-17)
- `*.value-object.ts` — Value Object de dominio: inmutable, se auto-valida al construirse (ADR-17), en `domain/`
- `*.domain-service.ts` — Domain Service: regla de negocio pura que no pertenece a una sola entidad (ADR-17), en `domain/services/`
- `*.repository.interface.ts` — puerto (interfaz de repositorio, en `domain/`)
- `*.use-case.ts` — caso de uso (en `application/use-cases/`), ej. `create-supplier.use-case.ts` — orquesta IO + `domain/`, no contiene la regla de negocio en sí
- `*.prisma.repository.ts` — adaptador de infraestructura (en `infrastructure/`)
- `*.dto.ts` — DTO validado con `class-validator`
- `*.controller.ts`, `*.module.ts`

## Naming — frontend (Angular)

- Componentes: kebab-case, standalone, `*.component.ts/.html/.scss`
- `*.service.ts`, `*.routes.ts`, `*.model.ts` (en `shared/models/`, espejo de los DTOs del backend)
- Un folder por feature en `features/`, en inglés (`suppliers`, `locations`, `products`, `inventory`, `alerts`, `purchases`, `requests`, `users-roles`), lazy-loaded desde `app.routes.ts`

## Patrones que usamos

- Arquitectura hexagonal por módulo backend (domain → application → infrastructure) — **solo en módulos con lógica de negocio real** (inventory, requests). Los CRUD triviales (ej. locations) pueden empezar sin las 4 capas.
- Patrones tácticos de DDD dentro de `domain/` (ADR-17): Entidades con comportamiento, Value Objects, Domain Services. El use-case orquesta, no decide — la regla de negocio vive en `domain/`.
- Fronteras entre módulos reforzadas con lint, no solo convención (ADR-18): un módulo nunca importa `domain/` ni `infrastructure/` de otro módulo — solo los servicios exportados por su `*.module.ts`. `eslint-plugin-boundaries` lo hace fallar el build (`backend/.eslintrc.js`, corre en `ci-backend.yml` vía `npm run lint`).
- DTOs validados con `class-validator` en todo endpoint de escritura (HU-21)
- RBAC vía Guards + decorador `@Roles()`, evaluado siempre en backend, nunca solo ocultando UI
- Movimientos de inventario: nunca se actualiza `LocationStock` directo — siempre a través de un registro en `InventoryMovement` en la misma transacción
- Flujo de aprobación configurable vía tabla (`ApprovalFlow`), no un campo fijo
- Componentes Angular standalone (sin NgModules)

## Patrones prohibidos

- Concatenar strings para construir queries SQL — siempre queries parametrizadas vía Prisma
- Lógica de negocio dentro de un controller (debe vivir en el use-case)
- Lógica de negocio dentro del use-case cuando debería vivir en una entidad/Value Object/Domain Service (ADR-17) — el use-case orquesta, no decide
- Llamar a Prisma directamente desde un controller, saltándose el repository
- Guardar archivos subidos por el usuario en el disco del servidor de aplicación (deben ir a Cloudflare R2)
- Confiar en el frontend como única capa de control de acceso

[PENDIENTE: configuración exacta de `tsconfig` (strict mode, no-implicit-any) — no se definió el detalle, solo que el lenguaje es TypeScript tipado]

## Logging (TT-21)

`nestjs-pino` — JSON estructurado a stdout en `staging`/`production` (Render lo captura solo, sin infra adicional), pretty-print legible en `development`. Cada request lleva un correlation id (`X-Request-Id`, generado o propagado si el cliente ya lo manda) presente en todos los logs que produce, para poder rastrear un request específico. `req.headers.authorization`, cookies y `password`/`token` en el body se redactan siempre (`backend/src/config/logger.config.ts`) — nunca aparecen en texto plano en un log, ni por accidente.

Qué loguear:
- **Siempre**: errores no controlados y respuestas 5xx (ya lo hace `GlobalExceptionFilter`, TT-15, con el logger real, no `console.log`)
- **Operaciones de escritura críticas**: movimientos de inventario, aprobaciones de solicitudes, cambios de rol — usar `new Logger(NombreDelModulo)` (el mismo patrón que ya usan `main.ts`/`GlobalExceptionFilter`), no `console.log`
- **No hace falta loguear explícitamente** cada request/response — eso ya lo cubre `pino-http` automáticamente (método, ruta, status, tiempo de respuesta)

## Tests

| Tipo | Cuándo | Herramienta | Ubicación |
|---|---|---|---|
| TDD | Lógica de dominio crítica (cálculo de stock, validación de movimientos) | Jest | `test/unit/` |
| BDD | Flujos de negocio críticos (aprobación de solicitudes, RBAC, alertas) | `jest-cucumber` (Gherkin) | `test/bdd/` |
| E2E | Flujos completos de usuario | Playwright | `test/e2e/` (backend) / Angular e2e (frontend) |

Regla práctica: si el error de esa lógica cuesta caro (dinero, inventario mal contado, acceso indebido) → TDD/BDD obligatorio. Pantalla de solo lectura simple → basta con E2E básico.

## Commits

**Conventional Commits**, en inglés, modo imperativo:
```
<type>(<scope>): <imperative description>

feat(auth): add login endpoint (HU-01)
fix(inventory): correct stock calculation on transfer (HU-08)
chore(infra): configure CI pipeline (TT-07)
docs: update MER with new field
```
Tipos permitidos: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `ci`.

## Branching

Gitflow simplificado (sección 9.1 del plan): `main` (producción, protegida) / `staging` (protegida) / `feature/tt-XX-slug` o `feature/hu-XX-slug` / `fix/slug` / `hotfix/slug`. Kebab-case, sin espacios, en inglés, describiendo el qué en presente/infinitivo (no en pasado).
