# Glosario

> Fuente: `plan-inicial-proyecto-inventario.md`. English version: `glossary.en.md`.

## Entidades principales del dominio (ver MER, sección 7) — con su nombre en código

| Español (negocio/MER) | Inglés (código, `schema.prisma`) | Descripción |
|---|---|---|
| Producto | `Product` | Ítem del catálogo. Puede o no `requiresBatch`. |
| Ubicación | `Location` | Sala/bodega donde se almacena inventario. Puede tener jerarquía (ubicación padre). |
| Lote | `Batch` | Agrupación de un producto por número de lote y fecha de vencimiento — solo existe si el producto lo requiere. |
| Stock por ubicación | `LocationStock` | Cantidad actual de un producto en una ubicación (y lote, si aplica). Es una tabla **derivada**, no la fuente de verdad. |
| Movimiento de inventario | `InventoryMovement` | Registro inmutable de cada entrada, salida, traslado o ajuste de stock. Es la **fuente de verdad** del inventario. |
| Proveedor | `Supplier` | Entidad externa a la que se le compra producto. |
| Compra | `Purchase` | Orden de compra a un proveedor, con su detalle de productos, cantidades y precios. |
| Solicitud | `Request` | Pedido interno, de dos tipos — `purchase` (reposición a proveedor) o `consumption` (retiro de inventario). Tiene un flujo de aprobación. |
| Flujo de aprobación | `ApprovalFlow` | Configuración de qué rol aprueba una solicitud, y en qué nivel/orden (soporta desde 1 hasta varios niveles). |
| Rol / Permiso | `Role` / `Permission` | Base del control de acceso (RBAC). Un usuario tiene un rol; un rol agrupa permisos por módulo y acción. |
| Auditoría (evento) | `AuditEvent` | Registro de una acción sensible (login, cambio de rol, aprobación) — post-MVP en cuanto a interfaz visual. |

## Siglas y términos internos del proyecto

| Término | Significado |
|---|---|
| **HU** | Historia de Usuario (formato: "como [rol] quiero [acción] para [beneficio]") |
| **TT** | Tarea Técnica — ítem de backlog sin forma de HU, prerrequisito técnico (ej. aprovisionar infraestructura) |
| **MVP** | Producto Mínimo Viable — en este proyecto hay 5, no uno solo (ver roadmap, sección 3.1) |
| **VoBo** | Visto bueno — aprobación formal del usuario funcional al cierre de un MVP |
| **DoR** | Definition of Ready — condiciones para que una HU pueda empezar a trabajarse |
| **DoD** | Definition of Done — condiciones para considerar una HU terminada |
| **UAT** | User Acceptance Testing — fase de prueba del usuario funcional sobre staging |
| **MER** | Modelo Entidad-Relación |
| **RBAC** | Role-Based Access Control — control de acceso por rol |
| **TDD** | Test Driven Development — test antes que código, para lógica de dominio crítica |
| **BDD** | Behavior Driven Development — escenarios Gherkin para flujos de negocio críticos |
| **i18n** | Internacionalización — abreviatura estándar de "internationalization" (18 letras entre la "i" y la "n"). Ver HU-29. |
| **Scrumban** | Metodología adaptada usada en este proyecto: backlog e HU de Scrum + flujo continuo tipo Kanban, sin ceremonias de equipo (por ser un desarrollador solo) |
| **Iteración** | Equivalente a "sprint", pero de 3-4 semanas (ritmo de fin de semana), en vez de 2 semanas de equipo |
| **Usuario funcional** | Persona externa al desarrollo que valida y da el VoBo de cada MVP |
| **OWASP Top 10** | Lista de referencia de riesgos de seguridad web usada como checklist (sección 4.7) |

[PENDIENTE: términos adicionales que surjan del código real una vez exista (nombres de variables de dominio, jerga interna que aparezca en comentarios/commits)]
