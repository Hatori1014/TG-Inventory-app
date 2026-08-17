import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

// HU-08 the movement form, HU-09 /inventory/batches — both "Admin
// Inventario" (write). HU-10's /inventory/stock is "cualquier autenticado"
// (plan section 7.4), so it's the one sub-route WITHOUT data.roles — the
// gate moved from the parent 'inventory' route in app.routes.ts down to
// these individual children once the read screen needed a looser rule than
// the write ones.
export const INVENTORY_ROUTES: Routes = [
  {
    path: '',
    canActivate: [roleGuard],
    data: { roles: ['Administrador'] },
    loadComponent: () =>
      import('./movement-form/movement-form.component').then((m) => m.MovementFormComponent),
  },
  {
    path: 'batches',
    canActivate: [roleGuard],
    data: { roles: ['Administrador'] },
    loadComponent: () =>
      import('./batches-list/batches-list.component').then((m) => m.BatchesListComponent),
  },
  {
    path: 'stock',
    canActivate: [roleGuard],
    loadComponent: () => import('./stock-list/stock-list.component').then((m) => m.StockListComponent),
  },
];
