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

**ADR-15 — Migraciones a staging/producción: manuales, no automatizadas en el deploy**
Descartado: correr `prisma migrate deploy` automáticamente en cada push, ya sea agregándolo al *Start Command* de Render o mediante un workflow `cd-deploy.yml`. Por qué: el modelo de CD elegido (sección 9.2 del plan, auto-deploy nativo de Vercel/Render) no orquesta ningún paso de "migrar antes de arrancar" salvo que se inyecte explícitamente — y para un solo desarrollador, mientras el schema todavía cambia seguido (Iteración 0-1), tener un checkpoint manual (`npm run prisma:migrate:staging`) antes de tocar la base compartida es más seguro que dejarlo disparar sin supervisión en cada push. Mismo criterio que ya aplica a la prohibición de `migrate dev` contra staging/producción (ver `CLAUDE.md`).
[PENDIENTE: revisar esta decisión cuando la aplicación esté estable y las migraciones de schema sean infrecuentes — en ese punto, evaluar mover `npx prisma migrate deploy` al Start Command de Render para automatizarlo]

**ADR-16 — Documentación (`docs/`): organizada en subcarpetas por tipo**
Descartado: todos los archivos sueltos en la raíz de `docs/`, distinguidos solo por el sufijo `.en.md` (planteamiento original de ADR-13). Por qué: al agregar diagramas (PNG) y la carpeta de reference-exports de Claude Design, mezclar todo en un único nivel se volvía difícil de navegar. Estructura final: `docs/esp/` (español), `docs/en/` (inglés), `docs/Diagrams/` (diagramas de arquitectura/flujo), `docs/Design/` (solo exports de referencia de Claude Design — el prototipo vivo se queda en su propio workspace, nunca se copia su HTML/CSS/JS crudo a `frontend/`). ADR-13 (bilingüe) sigue aplicando dentro de `esp/` y `en/`. Ver `CLAUDE.md`.

**ADR-17 — Patrones tácticos de DDD dentro de la arquitectura hexagonal**
Descartado: (a) dejar `domain/` como contenedor de entidades anémicas (solo datos) y mover toda la lógica de negocio al use-case; (b) adoptar DDD estratégico completo (bounded contexts, context mapping, lenguaje ubicuo formal por subdominio). Por qué: (a) — la arquitectura hexagonal ya decidida (ADR-03) y la convención de repository interface como puerto (`convenciones.md`) ya apuntan a un diseño DDD-friendly; dejar el dominio anémico desaprovecha eso y complica el TDD sobre lógica crítica (sección 5 del plan), porque los tests terminan probando el use-case completo (con mocks de repository) en vez de la regla de negocio aislada y pura. (b) — el dominio del proyecto es único y acotado (monolito modular, un solo desarrollador); bounded contexts múltiples agregarían complejidad de coordinación sin beneficio real a esta escala.
Alcance adoptado — solo patrones tácticos, dentro del `domain/` que ya existe por módulo:
- **Entidades** (`*.entity.ts`) con comportamiento: las reglas que dependen solo de sus propios datos viven ahí, no en el use-case.
- **Value Objects** (`*.value-object.ts`, nuevo): inmutables, se auto-validan al construirse (ej. una cantidad de stock que no puede ser negativa).
- **Domain Services** (`*.domain-service.ts`, nuevo, en `domain/services/`): reglas de negocio puras que no pertenecen a una sola entidad (ej. calcular el stock resultante a partir de un historial de movimientos).
- **Repository interfaces** (`*.repository.interface.ts`) como puertos — ya definido, sin cambios.
El use-case (`application/`) queda como orquestador: hace IO vía el repository, delega la regla en sí al `domain/`, y no contiene lógica de negocio propia — extiende explícitamente al use-case la prohibición que `convenciones.md` ya aplicaba a los controllers. Ejemplo concreto (módulo `inventory`) en `arquitectura.md`.

**ADR-18 — Fronteras entre módulos: solo vía application layer, reforzado con lint**
Descartado: confiar solo en la convención/code review para mantener el aislamiento entre módulos. Por qué: con un solo desarrollador y sin revisión de terceros, es fácil que el acoplamiento se cuele sin que nadie lo note hasta que duela — con un único `schema.prisma`/`PrismaClient` compartido, nada a nivel de ORM impide que un módulo importe directamente el repository de Prisma de otro módulo, saltándose su capa `application`. Regla: un módulo NUNCA importa `domain/` o `infrastructure/` de otro módulo — solo puede llamar a los servicios exportados por el `*.module.ts` (capa `application`) del módulo dueño de los datos.
Reforzado con `eslint-plugin-boundaries` (v7) en `backend/.eslintrc.js`, no solo por convención — falla el lint (y por tanto CI, `ci-backend.yml`, ya que corre `npm run lint`) si un módulo importa `domain/` o `infrastructure/` de otro. Verificado con un fixture de prueba: import dentro del mismo módulo pasa limpio, import cruzado entre dos módulos falla con el mensaje del ADR (fixture descartado después de confirmar, no vive en el repo).
Ruta de evolución futura si el proyecto crece: separar cada módulo a su propio schema de Postgres (mismo servidor, sin cambiar el despliegue) como paso intermedio antes de considerar extraer un módulo a servicio propio — no se implementa ahora, queda documentado como opción.

[PENDIENTE: cualquier decisión técnica que se tome durante la implementación real (Iteración 0 en adelante) y que no esté en el documento de planeación — este archivo debe actualizarse desde los commits/PRs una vez exista código]
