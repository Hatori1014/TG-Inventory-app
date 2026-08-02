# PRD — Documento de Requerimientos de Producto

> Fuente: compilado a partir de `plan-inicial-proyecto-inventario.md`. English version: `PRD.en.md`.

## 1. Resumen del producto

Sistema de control de inventario enfocado en: ingreso de proveedores, ingreso y control de inventario por ubicaciones/salas, alertas de stock por agotarse, historial de compras a proveedores, comparativa de precios entre proveedores, control de acceso por roles, y control de solicitudes internas (compra y consumo).

## 2. Problema y objetivo

**Problema**: no existe una herramienta centralizada para rastrear inventario distribuido en varias ubicaciones, saber cuándo reabastecer, comparar a qué proveedor comprar, y controlar quién puede solicitar o autorizar movimientos.

**Objetivo**: dar visibilidad y control completo del ciclo proveedor → compra → inventario → consumo/solicitud, con trazabilidad total y acceso restringido por rol.

## 3. Usuarios y stakeholders

| Rol | Necesidad principal |
|---|---|
| Administrador | Configurar roles, permisos y usuarios |
| Administrador de inventario | Gestionar ubicaciones, catálogo, movimientos, alertas |
| Comprador | Gestionar proveedores, registrar compras, comparar precios |
| Solicitante | Crear solicitudes de compra o consumo |
| Aprobador | Aprobar/rechazar solicitudes |
| **Usuario funcional** | Persona externa al desarrollo que valida y da el visto bueno (VoBo) de cada entrega — ver sección 8 |

## 4. Alcance

### En alcance (MVP 1 a MVP 4 — ver roadmap completo en el plan, sección 3.1)
Autenticación y RBAC, gestión de proveedores, ubicaciones, catálogo de productos, movimientos de inventario (con soporte condicional de lote/vencimiento), alertas de stock mínimo, registro de compras, comparativa de precios, solicitudes de compra y consumo con flujo de aprobación configurable, y una base de seguridad no negociable (contraseñas, rate limiting, validación de entrada, HTTPS, escaneo de dependencias).

### Fuera de alcance del MVP (post-MVP — MVP 5 y 6, opcionales)
Aprobación multi-nivel de solicitudes, panel visual de auditoría, autenticación de dos factores, imágenes de producto, selector de idioma ES/EN, modo claro/oscuro.

### Explícitamente fuera de alcance (no planeado)
Microservicios, app móvil nativa, multi-tenant, integración con ERPs externos, facturación electrónica, GraphQL, WebSockets/tiempo real.

## 5. Requerimientos funcionales

Ver el backlog completo de 30 historias de usuario en `plan-inicial-proyecto-inventario.md`, sección 3, organizadas en 9 epics: Autenticación y roles, Proveedores, Ubicaciones, Catálogo e inventario, Alertas, Compras y comparativa de precios, Solicitudes, Seguridad (transversal), y UI: idioma y tema (post-MVP).

## 6. Requerimientos no funcionales

- **Seguridad**: ver checklist OWASP Top 10 (plan, sección 4.7) — no negociable, es Must desde MVP 1
- **Escalabilidad**: arquitectura modular que crece de decenas a cientos de usuarios sin rediseño
- **Trazabilidad**: todo movimiento de inventario y aprobación queda registrado de forma inmutable
- **Disponibilidad**: aceptable para escala pequeña en capa gratuita
- **Usabilidad**: interfaz clara para roles no técnicos (ej. encargados de bodega)

## 7. Criterios de éxito

El producto se considera exitoso cuando:
- **MVP 4 cierra con VoBo del usuario funcional** — ahí se cumple el 100% del planteamiento original (proveedores, inventario por ubicación, alertas, historial de compras, comparativa de precios, RBAC, solicitudes)
- Cada MVP intermedio (1, 2, 3) recibe su propio VoBo antes de avanzar, dando validación temprana en vez de esperar al final
- El sistema pasa el checklist de seguridad OWASP antes de cada release a producción

## 8. Roadmap resumido

Ver el detalle completo (HU por MVP, cronograma, estimados) en `plan-inicial-proyecto-inventario.md`, secciones 3.1 y 6.

| MVP | Contenido | Hito |
|---|---|---|
| MVP 1 — Núcleo | Auth+RBAC+seguridad, ubicaciones, catálogo, inventario | ~3 meses |
| MVP 2 — Abastecimiento | Proveedores, compras, comparativa de precios | ~5 meses |
| MVP 3 — Alertas | Stock mínimo y panel de alertas | ~6 meses |
| MVP 4 — Solicitudes | Creación y aprobación de solicitudes | **~8 meses — sistema completo** |
| MVP 5 — Refuerzo (opcional) | Aprobación multi-nivel, auditoría, 2FA, imágenes | ~9-10 meses |
| MVP 6 — Personalización (opcional) | Idioma ES/EN, tema claro/oscuro | ~10 meses |

## 9. Restricciones y supuestos

- Un solo desarrollador, dedicando fines de semana / tiempo libre
- Presupuesto: 100% capa gratuita de infraestructura (Vercel, Render/Fly.io, Neon/Supabase, Cloudflare)
- El usuario funcional valida por autoservicio en staging, no en sesiones en vivo
- Los estimados de tiempo son supuestos a recalibrar tras la primera iteración real
