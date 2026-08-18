repo: Hatori1014/TG-Inventory-app
branch: main

## Last sync

date: 2026-08-17T23:34:12Z

### Updated in this project

- Rebuilt the mockups on the real MVP1 scope: shell de navegación + the 11 screens listed in the brief's section 6.
- Screens grounded in the backend controllers and Prisma schema (auth, roles, users, products, categories, units, locations, inventory, batches).
- Role-aware menu driven by the 17 permissions the Prisma seed grants "Administrador".
- Aligned the mockups with the shipped Angular shell: same sections, order, labels, role-name gating and constant toolbar title; login form matches its real fields, per-field errors and spinner state.
- Copied the real placeholder logo (`frontend/public/logo-placeholder.png`) and used it in the nav, login card and mobile drawer.
- Suppliers, low-stock alerts, purchases and internal requests dropped — no backend; the earlier broad-scope version is archived as "TG Inventory UI v1 (alcance amplio)".

## Screen map

| Screen (TG Inventory UI.dc.html) | Repo files |
| --- | --- |
| Shell (sidenav, toolbar, gating) | core/layout/shell/shell.component.html, shell.component.ts, app.routes.ts |
| Login `/login` | features/auth/login/login.component.html, core/services/auth.service.ts, modules/auth/auth.controller.ts |
| Dashboard `/dashboard` | docs/esp/ui-ux-design-brief.md §5 |
| Stock actual `/inventory/stock` | modules/inventory/inventory.controller.ts, dto/stock-query.dto.ts, dto/stock-response.dto.ts |
| Movimientos `/inventory` | modules/inventory/inventory.controller.ts, dto/create-movement.dto.ts |
| Lotes `/inventory/batches` | modules/inventory/batches.controller.ts, dto/create-batch.dto.ts |
| Productos `/products` | modules/products/products.controller.ts, dto/create-product.dto.ts |
| Categorías `/categories` · Unidades `/units` | modules/products/categories.controller.ts, units.controller.ts |
| Ubicaciones `/locations` | modules/locations/locations.controller.ts, dto/create-location.dto.ts |
| Usuarios `/users` | modules/users/users.controller.ts, dto/create-user.dto.ts |
| Roles y permisos `/roles` | modules/roles/roles.controller.ts, permissions.controller.ts, prisma/seed.ts |
| Mobile (<600px) | docs/esp/ui-ux-design-brief.md §4 |
| Logo (nav, login, drawer) | frontend/public/logo-placeholder.png |
| Cerrar sesión (diálogo + /login con aviso) | core/layout/shell/shell.component.ts logout(), core/services/auth.service.ts (local; POST /auth/logout pendiente) |
