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
      import('./features/users-roles/users-roles.routes').then((m) => m.USERS_ROLES_ROUTES),
  },
  // [PENDING: locations, products, inventory, alerts, purchases, requests —
  // added in their corresponding iterations]
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
