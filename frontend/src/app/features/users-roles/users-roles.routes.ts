import { Routes } from '@angular/router';

// HU-02 (roles/permissions) + HU-03 (assign role to user, added later in
// this same feature folder) — pattern from suppliers.routes.ts.
export const USERS_ROLES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./roles-list/roles-list.component').then((m) => m.RolesListComponent),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./role-form/role-form.component').then((m) => m.RoleFormComponent),
  },
  {
    path: ':id/permissions',
    loadComponent: () =>
      import('./role-permissions/role-permissions.component').then(
        (m) => m.RolePermissionsComponent,
      ),
  },
];
