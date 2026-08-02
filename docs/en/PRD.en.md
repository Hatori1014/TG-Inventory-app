# PRD — Product Requirements Document

> Source: compiled from `project-plan.en.md`. Versión en español: `PRD.md`.

## 1. Product summary

Inventory control system focused on: supplier onboarding, inventory tracking by location/room, low-stock alerts, supplier purchase history, price comparison across suppliers, role-based access control, and internal request control (purchase and consumption).

## 2. Problem and goal

**Problem**: there's no centralized tool to track inventory spread across multiple locations, know when to restock, compare which supplier to buy from, and control who can request or authorize movements.

**Goal**: give full visibility and control over the supplier → purchase → inventory → consumption/request cycle, with complete traceability and role-restricted access.

## 3. Users and stakeholders

| Role | Main need |
|---|---|
| Administrator | Configure roles, permissions, and users |
| Inventory admin | Manage locations, catalog, movements, alerts |
| Buyer | Manage suppliers, record purchases, compare prices |
| Requester | Create purchase or consumption requests |
| Approver | Approve/reject requests |
| **Functional stakeholder** | Person outside development who validates and signs off on each delivery — see section 8 |

## 4. Scope

### In scope (MVP 1 through MVP 4 — full roadmap in the plan, section 3.1)
Authentication and RBAC, supplier management, locations, product catalog, inventory movements (with conditional batch/expiration support), minimum stock alerts, purchase recording, price comparison, purchase and consumption requests with a configurable approval flow, and a non-negotiable security baseline (passwords, rate limiting, input validation, HTTPS, dependency scanning).

### Out of MVP scope (post-MVP — optional MVP 5 and 6)
Multi-level request approval, visual audit panel, two-factor authentication, product images, ES/EN language switcher, light/dark mode.

### Explicitly out of scope (not planned)
Microservices, native mobile app, multi-tenant, external ERP integration, electronic invoicing, GraphQL, WebSockets/real-time.

## 5. Functional requirements

See the full backlog of 30 user stories in `project-plan.en.md`, section 3, organized into 9 epics: Authentication and roles, Suppliers, Locations, Catalog and inventory, Alerts, Purchases and price comparison, Requests, Security (cross-cutting), and UI: language and theme (post-MVP).

## 6. Non-functional requirements

- **Security**: see the OWASP Top 10 checklist (plan, section 4.7) — non-negotiable, Must from MVP 1
- **Scalability**: modular architecture that grows from dozens to hundreds of users without a redesign
- **Traceability**: every inventory movement and approval is recorded immutably
- **Availability**: acceptable for small scale on the free tier
- **Usability**: clear interface for non-technical roles (e.g. warehouse staff)

## 7. Success criteria

The product is considered successful when:
- **MVP 4 closes with sign-off from the functional stakeholder** — that's where 100% of the original request is fulfilled (suppliers, inventory by location, alerts, purchase history, price comparison, RBAC, requests)
- Each intermediate MVP (1, 2, 3) gets its own sign-off before moving forward, giving early validation instead of waiting until the end
- The system passes the OWASP security checklist before every production release

## 8. Summarized roadmap

See the full detail (stories per MVP, timeline, estimates) in `project-plan.en.md`, sections 3.1 and 6.

| MVP | Content | Milestone |
|---|---|---|
| MVP 1 — Core | Auth+RBAC+security, locations, catalog, inventory | ~3 months |
| MVP 2 — Sourcing | Suppliers, purchases, price comparison | ~5 months |
| MVP 3 — Alerts | Minimum stock and alert panel | ~6 months |
| MVP 4 — Requests | Request creation and approval | **~8 months — full system** |
| MVP 5 — Hardening (optional) | Multi-level approval, audit, 2FA, images | ~9-10 months |
| MVP 6 — Personalization (optional) | ES/EN language, light/dark theme | ~10 months |

## 9. Constraints and assumptions

- A single developer, dedicating weekends / spare time
- Budget: 100% free-tier infrastructure (Vercel, Render/Fly.io, Neon/Supabase, Cloudflare)
- The functional stakeholder validates self-service on staging, not in live sessions
- Time estimates are assumptions to be recalibrated after the first real iteration
