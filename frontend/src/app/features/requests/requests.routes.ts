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
  {
    // HU-16 — separate component from the purchase request-form: no
    // supplier, no draft, and its own "disabled if no stock" select UX
    // that doesn't apply to purchases.
    path: 'new-consumption',
    loadComponent: () =>
      import('./consumption-request-form/consumption-request-form.component').then(
        (m) => m.ConsumptionRequestFormComponent,
      ),
  },
  {
    // HU-17 — view + approve/reject/integrate. Registered after 'new',
    // 'new-consumption', and ':id/edit' so those literal/more-specific
    // paths match first.
    path: ':id',
    loadComponent: () =>
      import('./request-detail/request-detail.component').then((m) => m.RequestDetailComponent),
  },
];
