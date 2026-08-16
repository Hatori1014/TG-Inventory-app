import { Routes } from '@angular/router';

// HU-08 — the movement-registration form. HU-09 adds /inventory/batches.
// HU-10 adds the stock-listing screen alongside these (GET /inventory/stock
// is already built server-side, "básico", per ADR-27).
export const INVENTORY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./movement-form/movement-form.component').then((m) => m.MovementFormComponent),
  },
  {
    path: 'batches',
    loadComponent: () =>
      import('./batches-list/batches-list.component').then((m) => m.BatchesListComponent),
  },
];
