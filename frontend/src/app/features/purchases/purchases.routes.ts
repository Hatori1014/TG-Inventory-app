import { Routes } from '@angular/router';

// HU-13 — no edit route: a purchase is never edited once registered, only
// created (same reasoning as the backend never exposing PATCH /purchases).
export const PURCHASES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./purchases-list/purchases-list.component').then((m) => m.PurchasesListComponent),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./purchase-form/purchase-form.component').then((m) => m.PurchaseFormComponent),
  },
  {
    // HU-14 — plan section 7.4 names GET /reports/price-comparison for
    // this HU; the frontend route lives under /purchases (not /reports)
    // since that's where the rest of this feature's screens are.
    path: 'price-comparison',
    loadComponent: () =>
      import('./price-comparison/price-comparison.component').then((m) => m.PriceComparisonComponent),
  },
];
