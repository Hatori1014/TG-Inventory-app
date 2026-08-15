import { Routes } from '@angular/router';

// HU-28 — three route trees in one feature folder (products is the anchor
// concept, categories/units are its supporting catalogs), same pattern as
// users-roles.routes.ts splitting ROLES_ROUTES/USERS_ROUTES.
export const PRODUCTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./products-list/products-list.component').then((m) => m.ProductsListComponent),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./product-form/product-form.component').then((m) => m.ProductFormComponent),
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./product-form/product-form.component').then((m) => m.ProductFormComponent),
  },
];

export const CATEGORIES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./categories-list/categories-list.component').then((m) => m.CategoriesListComponent),
  },
];

export const UNITS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./units-list/units-list.component').then((m) => m.UnitsListComponent),
  },
];
