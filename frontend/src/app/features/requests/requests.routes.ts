import { Routes } from '@angular/router';

// HU-15 — 'new' creates, ':id/edit' continues an existing draft (only
// works while status = draft, backend enforces the 409 otherwise) — same
// list+form split as every other feature in this codebase.
export const REQUESTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./requests-list/requests-list.component').then((m) => m.RequestsListComponent),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./request-form/request-form.component').then((m) => m.RequestFormComponent),
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./request-form/request-form.component').then((m) => m.RequestFormComponent),
  },
];
