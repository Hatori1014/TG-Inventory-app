import { Routes } from '@angular/router';

// Pattern to replicate for locations, products, inventory, alerts,
// purchases, requests and users-roles when their iteration comes up
// (plan section 6).
export const SUPPLIERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./suppliers-list/suppliers-list.component').then(
        (m) => m.SuppliersListComponent,
      ),
  },
];
