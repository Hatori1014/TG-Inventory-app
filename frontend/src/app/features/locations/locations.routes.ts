import { Routes } from '@angular/router';

export const LOCATIONS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./locations-list/locations-list.component').then((m) => m.LocationsListComponent),
  },
];
