# UI/UX Design Brief

> Source: defined with the user in this conversation (blue palette, professional tone, responsive from the start). **Updated (2026-08-17)** to reflect the real state of MVP1, now built — see section 5 (the navigation gap, the reason for this update) and section 6 (real screen inventory). Versión en español: `ui-ux-design-brief.md`.

## 1. Design principles

- **Medium-professional density**: the system handles tables (inventory, movements, purchases) that benefit from showing several rows at once, but forms and detail screens use generous white space so non-technical roles (e.g. warehouse staff) aren't overwhelmed. It's neither a dense analytics dashboard nor a minimalist marketing site.
- **Responsive from day 1**, not a later retrofit — same component, adapted layout (see section 4).
- **Consistency over creativity**: Angular Material provides the patterns (tables, forms, dialogs); no custom components are reinvented unless Material doesn't cover the case.
- **Dark-mode-ready from the start of theming**, even though HU-30 (light/dark mode) is post-MVP — see section 6.

## 2. Color palette

Defined by the user: dark blues, light blues, sky blues, and whites. Translated into a concrete Angular Material palette:

| Token | Hex | Use |
|---|---|---|
| `primary-900` (dark blue) | `#0B3C6B` | Headers, high-contrast text on light backgrounds, sidenav |
| `primary-700` | `#0F4C81` | Base primary color (buttons, app-bar, active elements) |
| `primary-500` | `#1E6FB5` | Hover/focus states on primary elements |
| `primary-300` (sky blue) | `#6FB1E8` | Accents, secondary icons, active borders |
| `primary-100` (very light sky blue) | `#CFE8FB` | Section backgrounds, selected table rows |
| `surface` (white) | `#FFFFFF` | Card and form backgrounds |
| `background` | `#F5F8FC` | App's overall background (blue-tinted white, not pure white) |

**Semantic colors** (not forced into the brand palette — must remain clearly distinguishable per universal convention):
| Token | Hex | Use |
|---|---|---|
| `success` | `#2E7D32` | Confirmations, approved request |
| `warning` | `#ED6C02` | Low-stock alerts (HU-12) — a central color for this system, use it sparingly elsewhere so it doesn't get diluted |
| `error` / `warn` (Material) | `#D32F2F` | Validation errors, rejected request, account lockout (HU-20) |
| `info` | `#1E6FB5` | Same as `primary-500`, for informational messages |

**Logo**: real, in use since TT-24 phase 1 (`frontend/public/images/Logo.png`, links to `https://tgconsultores.net/` in both the shell and login). Replaced the initially generated placeholder.

## 3. Typography

**Roboto** (Angular Material's default font) — no business reason to deviate; Material optimizes it for data density in tables and forms, which is exactly the main use case here.

| Use | Size | Weight |
|---|---|---|
| Page heading | 24px | 500 (medium) |
| Section/card heading | 18px | 500 |
| Body / table cells | 14px | 400 |
| Secondary text / hints | 12px | 400 |

## 4. Responsive strategy

A single layout adapts using Angular CDK's standard breakpoints (`BreakpointObserver`):

| Breakpoint | Range | Navigation | Tables |
|---|---|---|---|
| Mobile | < 600px | Collapsible drawer (hamburger) | Turn into stacked cards (one row = one card) |
| Tablet | 600–960px | Collapsible drawer, wider | Table with horizontal scroll if needed |
| Desktop | > 960px | Persistent sidenav | Full table |

**Practical rule**: never hide information on mobile, only reorganize it — a warehouse worker may be recording a movement from their phone right there in the room.

## 5. The real gap to close: no navigation exists, only isolated screens

**Why this brief is being updated.** MVP1 (HU-01→02→03→06→07→08→09→10→28) is now fully built and implemented end to end, but **a navigation shell was never built**. Today, after logging in, `/dashboard` is literally `<h1>Welcome, {{name}}</h1>` with not a single link — every screen exists as an isolated Angular route, and the only way to reach it is by typing the URL by hand into the browser's address bar. A few components have a hand-rolled `<a routerLink="...">` inside the component itself (e.g. the inventory movement form links to "Manage batches"/"Check current stock"), but it's ad hoc, inconsistent across screens, and not real navigation.

**This is what Design needs to solve first**, ahead of the visual detail of any individual screen: a **persistent shell** (`mat-sidenav` + `mat-toolbar`, using the responsive pattern already defined in section 4 — collapsible drawer on mobile/tablet, persistent sidenav on desktop) that wraps the whole app after login, with:

- **Role-aware navigation menu**: today only the "Administrador" role has real permissions seeded (see section 6 for exactly who sees what); the menu should hide entries the logged-in user can't access, not just redirect to a 403 error on click.
- **Active-section indicator** (highlight the menu item matching the current route).
- **Header with the logged-in user's name and role** (`AuthService.user()` already exposes `name`/`role`) and an always-visible **log out** action (no logout button exists anywhere today).
- **Dashboard redesigned as a real landing page**, not an empty greeting: quick-access cards to the modules the user's role can use (same criterion as the menu), not necessarily metrics/indicators yet (no reporting story exists in MVP1).

## 6. Real screen inventory — MVP1 (what needs designing now)

Replaces the generic table from an earlier version of this brief. This is exactly what exists in the code today, working end to end against the real backend — it's the real scope for the mockups, not a future projection.

| Module / route | Screens | Who sees it (current gate) | Suggested pattern |
|---|---|---|---|
| **Login** (`/login`) | Email/password form | Public (no session) | Centered card, no sidenav — before the shell |
| **Dashboard** (`/dashboard`) | Post-login landing | Any authenticated user | Sidenav + role-based quick-access grid (see section 5) |
| **Roles** (`/roles`) | List, create/edit, permission assignment (checkboxes per module/action) | Administrador only | `mat-table` with filter/pagination; form in a `mat-card`; permission matrix as a checkbox grid grouped by module |
| **Users** (`/users`) | List, create (asks for a password)/edit (doesn't) | Administrador only | `mat-table`; one form with two modes (create/edit) |
| **Products** (`/products`) | List, create/edit (with an inline "+ create category/unit" flow without leaving the form) | Read: any authenticated user. Write: gated by `products:create/update` | `mat-table` with filter/pagination; form with selects plus an inline quick-create action |
| **Categories** (`/categories`) | List + inline create + activate/deactivate per row | Read: any authenticated user. Write: gated by permission | Simple list, no separate form screen — everything inline in the row |
| **Units** (`/units`) | List + inline create + activate/deactivate per row | Read: any authenticated user. Write: gated by permission | Same as Categories |
| **Locations** (`/locations`) | List (hierarchical by `parentId`, built in the frontend) + inline create (with a parent-location selector) + activate/deactivate | Administrador only (both read and write) | List with visual indentation per hierarchy level; inline create with a parent selector |
| **Inventory movements** (`/inventory`) | Single form covering 4 movement types: in, out, adjustment (increase/decrease), transfer between locations — conditional fields per selected type (`direction` only for adjustment, `destinationLocationId` only for transfer, batch selector only if the product requires one) | Administrador only (the plan's "Admin Inventario" role isn't seeded as a distinct role yet) | `mat-card` with a reactive form; conditional fields that appear/disappear based on the selected `type`, not separate tabs |
| **Batches** (`/inventory/batches`) | Pick a product that requires batch tracking → list its batches → inline create of a new batch (batch number, expiration date) | Administrador only | Product selector + table of the selected product's batches |
| **Current stock** (`/inventory/stock`) | Stock table by product/location, with two independent filters (by product, by location) that reload the table | Any authenticated user | `mat-table` with two `mat-select` filters at the top; product/location names (not ids), already resolved by the backend |

**Out of scope for this round of mockups** (in the master plan, but with no real backend or screen built yet — not worth designing in detail before their iteration starts): Suppliers (`/suppliers` is currently a route skeleton with no backend, MVP2/HU-04), low-stock alerts, purchases, internal requests with an approval flow. If Design wants to sketch general guidelines for those (not final screens), the patterns already suggested in section 1 still apply (alerts board as a card grid, request as a stepper, approval as a detail view with two actions).

## 7. Dark mode readiness (HU-30, post-MVP)

Even though the light/dark switcher is post-MVP, theming is implemented from the start using **Angular Material tokens (CSS custom properties)**, not hardcoded colors in components. This is an early technical decision that avoids rework: when HU-30 arrives, switching themes means toggling a class on `<body>`, not rewriting styles.

## 8. Accessibility

- Minimum WCAG AA contrast: `primary-700` (#0F4C81) on white passes (ratio > 7:1); double-check `primary-300` (sky blue) before using it as text on white — it works better for backgrounds/accents than small text.
- Every action available via keyboard (Angular Material provides this by default as long as native components aren't broken).
- Alert icons (`warning`/`error`) always paired with text, never color alone (for color blindness).

## 9. What's NOT defined (out of scope for this brief)

- Final logo — placeholder in use, see section 2
- Exact UI copy — written during each story's implementation
- Suppliers/Alerts/Purchases/Requests screens — see the scope note at the end of section 6, no real backend or screen exists for them yet
