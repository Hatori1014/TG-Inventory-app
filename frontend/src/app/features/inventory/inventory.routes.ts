import { Routes } from '@angular/router';

// HU-08 — the only screen so far is the movement-registration form. HU-10
// adds the stock-listing screen alongside it (GET /inventory/stock is
// already built server-side, "básico", per ADR-27).
export const INVENTORY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./movement-form/movement-form.component').then((m) => m.MovementFormComponent),
  },
];
