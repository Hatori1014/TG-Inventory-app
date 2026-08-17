import { Routes } from '@angular/router';
import { roleGuard } from './core/guards/role.guard';

// Each feature is lazy-loaded — the initial bundle never downloads modules
// the user's role can't even see (plan section 8.3). Real routes for each
// feature get added as iterations progress (plan section 6).
export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'dashboard',
    canActivate: [roleGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'suppliers',
    canActivate: [roleGuard],
    loadChildren: () =>
      import('./features/suppliers/suppliers.routes').then((m) => m.SUPPLIERS_ROUTES),
  },
  {
    path: 'roles',
    canActivate: [roleGuard],
    data: { roles: ['Administrador'] },
    loadChildren: () =>
      import('./features/users-roles/users-roles.routes').then((m) => m.ROLES_ROUTES),
  },
  {
    path: 'users',
    canActivate: [roleGuard],
    data: { roles: ['Administrador'] },
    loadChildren: () =>
      import('./features/users-roles/users-roles.routes').then((m) => m.USERS_ROUTES),
  },
  {
    // GET is "any authenticated user" (plan section 7.4) — no data.roles
    // here, same reasoning as suppliers/roles: the "Admin Inventario" role
    // isn't seeded by any HU yet, and roleGuard only checks role names.
    // Write actions (create/edit) are gated by the backend's
    // @RequirePermission(); a 403 shows an error in the form.
    path: 'products',
    canActivate: [roleGuard],
    loadChildren: () => import('./features/products/products.routes').then((m) => m.PRODUCTS_ROUTES),
  },
  {
    path: 'categories',
    canActivate: [roleGuard],
    loadChildren: () => import('./features/products/products.routes').then((m) => m.CATEGORIES_ROUTES),
  },
  {
    path: 'units',
    canActivate: [roleGuard],
    loadChildren: () => import('./features/products/products.routes').then((m) => m.UNITS_ROUTES),
  },
  {
    // Unlike products/categories/units, the master plan (section 7.4) marks
    // all three /locations endpoints "Admin Inventario" — GET included —
    // same reasoning as roles/users: gate the route itself with data.roles.
    path: 'locations',
    canActivate: [roleGuard],
    data: { roles: ['Administrador'] },
    loadChildren: () => import('./features/locations/locations.routes').then((m) => m.LOCATIONS_ROUTES),
  },
  {
    // Mixed gate, unlike locations/roles/users: HU-08's movement form and
    // HU-09's /inventory/batches need "Admin Inventario", but HU-10's
    // /inventory/stock is "cualquier autenticado" — each child in
    // INVENTORY_ROUTES carries its own canActivate/data.roles instead of a
    // single blanket rule here.
    path: 'inventory',
    canActivate: [roleGuard],
    loadChildren: () => import('./features/inventory/inventory.routes').then((m) => m.INVENTORY_ROUTES),
  },
  // [PENDING: alerts, purchases, requests — added in their corresponding
  // iterations]
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
