# Decisiones técnicas

> Fuente: `plan-inicial-proyecto-inventario.md` y su historial de construcción. No hay commits de código de los que extraer decisiones — el repositorio no existe todavía. Estas son las decisiones tomadas durante la fase de planeación, con su porqué y las alternativas descartadas tal como se discutieron. English version: `decisions.en.md`.

**ADR-01 — Backend: NestJS**
Descartado: .NET (C#/ASP.NET Core). Por qué: mismo lenguaje (TypeScript) que el frontend Angular, arquitectura modular nativa que encaja con el diseño hexagonal, decoradores (`@Roles`, Guards) convenientes para RBAC.

**ADR-02 — Base de datos: PostgreSQL**
Descartado: NoSQL como opción principal. Por qué: el dominio es fuertemente relacional (proveedores↔compras↔productos↔ubicaciones↔movimientos) y requiere integridad transaccional fuerte.

**ADR-03 — Arquitectura: monolito modular (hexagonal por módulo)**
Descartado: microservicios. Por qué: la escala definida (decenas de usuarios/ubicaciones) no justifica la complejidad operativa de microservicios; el diseño modular permite extraer un servicio después si hace falta.

**ADR-04 — ORM: Prisma**
Descartado: TypeORM (mencionado como alternativa válida, no elegida por defecto). Por qué: tipado end-to-end del esquema, migraciones simples, mejor DX.

**ADR-05 — Metodología: Scrumban adaptado (no Scrum de equipo)**
Descartado: Scrum clásico con sprints de 2 semanas y ceremonias diarias. Por qué: el proyecto lo desarrolla una sola persona, part-time, solo fines de semana — las ceremonias de equipo no aplican.

**ADR-06 — Roadmap: 5 MVPs incrementales**
Descartado: un único MVP de 23 HU con validación externa solo al final (~8-10 meses sin feedback). Por qué: reduce el riesgo de construir en la dirección equivocada durante meses sin validación real; permite 4 checkpoints externos en el camino en vez de 1.

**ADR-07 — Movimientos de inventario como fuente de verdad (ledger inmutable)**
Descartado: mantener solo una tabla de "stock actual" editable directamente. Por qué: trazabilidad completa (quién, cuándo, qué) y permite reconstruir el stock desde el histórico si hay inconsistencias.

**ADR-08 — Flujo de aprobación configurable (`ApprovalFlow`)**
Descartado: campo fijo `approverId` sin más estructura en `Request`. Por qué: el usuario confirmó que hoy hay un solo aprobador pero puede pasar a multi-nivel (jefe directo → Admin Inventario) — este diseño no requiere migrar el esquema cuando eso pase.

**ADR-09 — Repositorio: monorepo**
Descartado: repos separados para backend y frontend. Por qué: un solo desarrollador se beneficia de un único historial de commits y un solo PR por cambio funcional, aunque toque ambas capas.

**ADR-10 — Almacenamiento de imágenes: Cloudflare R2**
Descartado: guardar archivos subidos en el disco del servidor de aplicación. Por qué: egress gratis siempre (a diferencia de S3), y evita el vector de ataque de subida de archivos maliciosos directo al servidor (HU-27).

**ADR-11 — Reclasificación de prioridades tras validación de backlog**
HU-09 (lotes), HU-12 (panel de alertas), HU-14 (comparativa de precios) y HU-24 (escaneo de dependencias) subieron de "Should" a "Must" al validar contra el planteamiento original del usuario. Por qué: eran parte del núcleo funcional pedido desde el primer mensaje, no mejoras opcionales.

**ADR-12 — Idioma del código: inglés (todo), con excepción explícita de la UI**
Descartado: mantener el español que se usó en el primer borrador del `schema.prisma` y en los comentarios de código. Por qué: es el estándar de la industria y el idioma nativo de todo el ecosistema (NestJS, Angular, Prisma). Corrección aplicada retroactivamente: se reseteó la BD local y se regeneró la migración inicial en inglés. La UI visible al usuario final queda como excepción explícita — se mantiene en español porque los usuarios de la app hablan español (ver `convenciones.md`).

**ADR-13 — Documentación (`docs/`): bilingüe, español + inglés**
Descartado: solo español (lo que había hasta esta decisión) o solo inglés. Por qué: el código y el repositorio deben poder leerse en inglés (estándar de la industria, ADR-12), pero la comunicación con el usuario funcional y el diseño de negocio son en español. Convención de archivos: el nombre sin sufijo es la versión en español (la original), `.en.md` es la traducción al inglés.

**ADR-14 — UI: selector de idioma (ES/EN) y modo claro/oscuro**
Agregado al backlog como Epic 9 (HU-29, HU-30), explícitamente marcado para abordarse **al final**, después de MVP 4 — no es parte del alcance original del usuario y no bloquea ninguna funcionalidad de negocio. Ver sección 3 del plan y el tablero de Trello.

[PENDIENTE: cualquier decisión técnica que se tome durante la implementación real (Iteración 0 en adelante) y que no esté en el documento de planeación — este archivo debe actualizarse desde los commits/PRs una vez exista código]
