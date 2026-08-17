import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { InventoryService } from '../inventory.service';
import { ProductsService } from '../../products/products.service';
import { LocationsService } from '../../locations/locations.service';
import { Product } from '../../../shared/models/product.model';
import { Location } from '../../../shared/models/location.model';
import { StockItem } from '../../../shared/models/inventory.model';

// HU-10 — "Consultar stock actual (filtrable por producto/ubicación)"
// (plan section 7.4), "cualquier autenticado" — the only screen under
// /inventory that isn't gated to Administrador (see app.routes.ts).
@Component({
  selector: 'app-stock-list',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './stock-list.component.html',
})
export class StockListComponent {
  private inventoryService = inject(InventoryService);
  private productsService = inject(ProductsService);
  private locationsService = inject(LocationsService);

  products = signal<Product[]>([]);
  locations = signal<Location[]>([]);
  stock = signal<StockItem[]>([]);
  loading = signal(true);
  errorMessage: string | null = null;

  filterProductId = '';
  filterLocationId = '';

  constructor() {
    this.productsService.listProducts(1, 100).subscribe({ next: (r) => this.products.set(r.items) });
    this.locationsService.list(1, 100).subscribe({ next: (r) => this.locations.set(r.items) });
    this.reload();
  }

  reload(): void {
    this.errorMessage = null;
    this.loading.set(true);
    this.inventoryService
      .listStock(1, 100, this.filterProductId || undefined, this.filterLocationId || undefined)
      .subscribe({
        next: (r) => {
          this.stock.set(r.items);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.errorMessage = 'No se pudo cargar el stock.';
        },
      });
  }
}
