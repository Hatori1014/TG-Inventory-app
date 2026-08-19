import { Routes } from '@angular/router';

// HU-04 — first MVP2 screen, same list+form split as products (HU-28)/users
// (HU-03): one form component, two modes by :id presence. document-types/
// person-types are DocumentType/PersonType's own admin screens (at the
// user's explicit request), same three-route-trees-in-one-feature-folder
// pattern as products.routes.ts (PRODUCTS_ROUTES/CATEGORIES_ROUTES/UNITS_ROUTES).
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

export const DOCUMENT_TYPES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./document-types-list/document-types-list.component').then((m) => m.DocumentTypesListComponent),
  },
];

export const PERSON_TYPES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./person-types-list/person-types-list.component').then((m) => m.PersonTypesListComponent),
  },
];
