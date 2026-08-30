import { Routes } from '@angular/router';

export const AUDIT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./audit-log/audit-log.component').then((m) => m.AuditLogComponent),
  },
  {
    // HU-31 — a distinct table/shape from AuditEvent (module/action/status
    // instead of user/entity), so it's its own screen rather than a filter
    // on the same one; linked to it via the tabs both screens share.
    path: 'errors',
    loadComponent: () => import('./error-log/error-log.component').then((m) => m.ErrorLogComponent),
  },
];
