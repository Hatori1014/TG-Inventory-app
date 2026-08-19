import { Routes } from '@angular/router';

// HU-04 — first MVP2 screen, same list+form split as products (HU-28)/users
// (HU-03): one form component, two modes by :id presence.
export const SUPPLIERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./suppliers-list/suppliers-list.component').then((m) => m.SuppliersListComponent),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./supplier-form/supplier-form.component').then((m) => m.SupplierFormComponent),
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./supplier-form/supplier-form.component').then((m) => m.SupplierFormComponent),
  },
];
