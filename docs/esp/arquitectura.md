# Arquitectura

> Fuente: `plan-inicial-proyecto-inventario.md`. El repositorio de código aún no existe (previo a Iteración 0) — este documento describe la arquitectura *diseñada*, no verificada contra código real. English version: `architecture.en.md`.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Angular 18+ (standalone components), TypeScript, Angular Material |
| Backend | NestJS (Node.js 20+ LTS), TypeScript |
| ORM | Prisma |
| Base de datos | PostgreSQL 16 |
| Auth | JWT (`@nestjs/jwt`) + Passport.js |
| Almacenamiento de archivos | Cloudflare R2 (imágenes de producto — post-MVP) |
| Hosting frontend | Vercel (o Netlify) |
| Hosting backend | Render o Fly.io |
| BD gestionada | Neon o Supabase |
| CI/CD | GitHub Actions |
| Proxy/WAF | Cloudflare (plan gratuito) |

## Arquitectura general

Monolito modular con arquitectura hexagonal por módulo (`domain → application → infrastructure → interfaz REST`). Se descartaron microservicios por la escala del proyecto (decenas de usuarios/ubicaciones, un solo desarrollador).

**Idioma del código**: todo en inglés (identificadores, comentarios, nombres de tablas/columnas de BD) — ver `convenciones.md`. Este documento (`docs/`) se mantiene en español y en inglés.

## Mapa de carpetas

```
inventario-app/
├── backend/src/modules/{auth,users,roles,suppliers,locations,products,inventory,purchases,requests,audit}/
│   └── cada uno: domain/ application/use-cases/ infrastructure/ dto/ *.controller.ts *.module.ts
├── backend/src/common/{decorators,guards,filters,interceptors}/
├── backend/src/database/ (Prisma)
├── frontend/src/app/{core,shared,features}/
│   └── features/: un folder por módulo de negocio (en inglés: suppliers, locations, products, inventory, alerts, purchases, requests, users-roles), lazy-loaded
└── docs/
```

[PENDIENTE: confirmar que la estructura real del repo coincide con esto una vez creado en Iteración 0 — TT-01]

## Flujo de datos (diseñado)

1. Angular envía request → `auth.interceptor.ts` adjunta el JWT
2. NestJS controller recibe → valida DTO (`class-validator`) → `JwtAuthGuard` → `RolesGuard`
3. Controller delega a un **use-case** (capa application)
4. Use-case usa el **repository interface** (puerto, capa domain) implementado por un **repository de Prisma** (adaptador, capa infrastructure)
5. Caso especial — movimientos de inventario: insertar en `InventoryMovement` y actualizar `LocationStock` ocurre en la **misma transacción** de Prisma (`LocationStock` es una tabla derivada, no fuente de verdad)

[PENDIENTE: verificar que la implementación real respeta esta transacción — es un punto de fallo silencioso si no]

## Patrones tácticos de DDD dentro de `domain/` (ADR-17)

Ejemplo concreto con el módulo `inventory` (cálculo de stock, HU-10):

```
backend/src/modules/inventory/
├── domain/
│   ├── entities/inventory-movement.entity.ts
│   ├── value-objects/stock-quantity.value-object.ts   # inmutable, valida >= 0
│   ├── services/calculate-stock.domain-service.ts      # regla pura: movimientos → StockQuantity
│   └── inventory-movement.repository.interface.ts      # puerto
├── application/use-cases/
│   └── calculate-stock.use-case.ts                      # orquesta: repository (IO) + domain-service (regla)
└── infrastructure/
    └── inventory-movement.prisma.repository.ts          # adaptador
```

El `use-case` no contiene la fórmula de cálculo — la pide al `calculate-stock.domain-service.ts`, que es una función/clase pura sin dependencias de NestJS ni Prisma. Esto es lo que permite testear la regla con TDD (sección 5 del plan) sin mockear un repository: el test unitario construye movimientos de ejemplo, llama al domain service, y verifica el `StockQuantity` resultante directamente.

## Qué NO existe (ni está planeado para el MVP)

- Microservicios, colas de mensajes o eventos asíncronos
- Cache (Redis o similar)
- WebSockets / actualizaciones en tiempo real
- App móvil nativa
- GraphQL (solo REST)
- Multi-tenant
- Auditoría con interfaz visual (HU-23 es post-MVP; el registro en BD sí está desde el MVP)
- Aprobación multi-nivel de solicitudes (HU-18, post-MVP — el esquema ya la soporta pero no está implementada)
- 2FA (HU-25, post-MVP)
- Imágenes de producto (HU-26/27, post-MVP — MVP 5)
- Tests, pipeline CI/CD y el repositorio mismo: **no existen todavía**, están en Iteración 0

## Nuevo — Internacionalización de la UI y modo claro/oscuro (post-MVP)

Agregado a pedido explícito: selector de idioma ES/EN y modo claro/oscuro en el frontend. Ver HU-29 y HU-30 (Epic 9, sección 3 del plan) — **no implementado todavía**, queda documentado y en el backlog de Trello para abordarse al final, después de MVP 4.
