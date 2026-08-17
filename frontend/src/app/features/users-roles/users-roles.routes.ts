import { Routes } from '@angular/router';

// HU-02 (roles/permissions) + HU-03 (users) — pattern from
// suppliers.routes.ts. Both concerns share this feature folder but mount as
// separate top-level routes (/roles, /users), matching the flat structure
// of the master plan's own endpoint table (section 7.4).
export const ROLES_ROUTES: Routes = [
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

export const USERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./users-list/users-list.component').then((m) => m.UsersListComponent),
  },
  {
    path: 'new',
    loadComponent: () => import('./user-form/user-form.component').then((m) => m.UserFormComponent),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./user-form/user-form.component').then((m) => m.UserFormComponent),
  },
];
