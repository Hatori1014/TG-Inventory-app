# UI/UX Design Brief

> Source: defined with the user in this conversation (blue palette, professional tone, responsive from the start). Versión en español: `ui-ux-design-brief.md`.

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

**Logo**: the real logo hasn't been defined yet — a placeholder was generated (`frontend/public/logo-placeholder.png`, an "IC" monogram in the blue palette) so it doesn't block development. Replace before MVP 4 (final UAT), or sooner once the real logo is ready.

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

## 5. Key screens and their layout pattern

| Screen | Pattern |
|---|---|
| Login | Centered card, no sidenav |
| Dashboard | Sidenav + role-based access grid (see `app-flow-diagram.png`) |
| Lists (suppliers, locations, products, etc.) | `mat-table` with filter and pagination; becomes a `mat-card` list on mobile |
| Create/edit forms | Centered `mat-card`, `mat-form-field` with inline validation (Reactive Forms) |
| Alerts panel | Grid of `mat-card` with severity `mat-badge` (`warning`/`error` color) |
| Create request | `mat-stepper` (product selection → quantity → confirmation) — natural fit for a multi-step flow |
| Approve request | Detail view + two clear primary actions (Approve in `success`, Reject in `error`) |

## 6. Dark mode readiness (HU-30, post-MVP)

Even though the light/dark switcher is post-MVP, theming is implemented from the start using **Angular Material tokens (CSS custom properties)**, not hardcoded colors in components. This is an early technical decision that avoids rework: when HU-30 arrives, switching themes means toggling a class on `<body>`, not rewriting styles.

## 7. Accessibility

- Minimum WCAG AA contrast: `primary-700` (#0F4C81) on white passes (ratio > 7:1); double-check `primary-300` (sky blue) before using it as text on white — it works better for backgrounds/accents than small text.
- Every action available via keyboard (Angular Material provides this by default as long as native components aren't broken).
- Alert icons (`warning`/`error`) always paired with text, never color alone (for color blindness).

## 8. What's NOT defined (out of scope for this brief)

- Screen-by-screen mockups (Figma) — this brief gives guidelines, not pixel-perfect design
- Final logo — placeholder in use, see section 2
- Exact UI copy — written during each story's implementation
