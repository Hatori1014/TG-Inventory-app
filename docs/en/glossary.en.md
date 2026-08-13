# Glossary

> Source: `plan-inicial-proyecto-inventario.md`. Versión en español: `glosario.md`.

## Main domain entities (see ER model, section 7) — with their code name

| Spanish (business/ER model) | English (code, `schema.prisma`) | Description |
|---|---|---|
| Producto | `Product` | Catalog item. May or may not `requiresBatch`. |
| Ubicación | `Location` | Room/warehouse where inventory is stored. May have a hierarchy (parent location). |
| Lote | `Batch` | Groups a product by batch number and expiration date — only exists if the product requires it. |
| Stock por ubicación | `LocationStock` | Current quantity of a product at a location (and batch, if applicable). It's a **derived** table, not the source of truth. |
| Movimiento de inventario | `InventoryMovement` | Immutable record of every stock in, out, transfer, or adjustment. It's the **source of truth** for inventory. |
| Proveedor | `Supplier` | External entity that products are purchased from. |
| Compra | `Purchase` | Purchase order to a supplier, with its product/quantity/price detail. |
| Solicitud | `Request` | Internal request, of two types — `purchase` (supplier restock) or `consumption` (inventory withdrawal). Has an approval flow. |
| Flujo de aprobación | `ApprovalFlow` | Configuration of which role approves a request, and at what level/order (supports 1 to several levels). |
| Rol / Permiso | `Role` / `Permission` | Basis of access control (RBAC). A user has one role; a role groups permissions by module and action. |
| Auditoría (evento) | `AuditEvent` | Record of a sensitive action (login, role change, approval) — post-MVP as far as a visual interface goes. |

## Project acronyms and internal terms

| Term | Meaning |
|---|---|
| **HU** (Historia de Usuario) | User Story (format: "as a [role] I want [action] so that [benefit]") |
| **TT** (Tarea Técnica) | Technical Task — a backlog item that isn't a user story, a technical prerequisite (e.g. provisioning infrastructure) |
| **MVP** | Minimum Viable Product — this project has 5, not just one (see roadmap, plan section 3.1) |
| **VoBo** (Visto Bueno) | Sign-off — the functional stakeholder's formal approval when an MVP closes |
| **DoR** | Definition of Ready — conditions for a user story to start being worked on |
| **DoD** | Definition of Done — conditions for a user story to be considered finished |
| **UAT** | User Acceptance Testing — the phase where the functional stakeholder tests on staging |
| **ER model / MER** | Entity-Relationship model |
| **RBAC** | Role-Based Access Control |
| **TDD** | Test Driven Development — writing the test before the code, for critical domain logic |
| **BDD** | Behavior Driven Development — Gherkin scenarios for critical business flows |
| **DDD** | Domain-Driven Design — a domain-modeling approach. Only its tactical patterns are adopted here (Entities with behavior, Value Objects, Domain Services) inside the hexagonal architecture already decided, not strategic DDD (bounded contexts). See ADR-17 |
| **i18n** | Internationalization — standard abbreviation (18 letters between the "i" and the "n"). See HU-29. |
| **Scrumban** | The adapted methodology used in this project: Scrum's backlog and user stories + a continuous Kanban-style flow, without team ceremonies (since it's a solo developer) |
| **Iteration** | Equivalent to a "sprint", but 3-4 weeks long (weekend pace) instead of a team's 2 weeks |
| **Functional stakeholder** | Person outside of development who validates and signs off on each MVP |
| **OWASP Top 10** | Reference list of web security risks used as a checklist (plan section 4.7) |

[PENDING: additional terms that come up from the real code once it exists (domain variable names, internal jargon found in comments/commits)]
