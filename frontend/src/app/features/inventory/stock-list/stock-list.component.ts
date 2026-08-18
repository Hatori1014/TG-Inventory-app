import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../inventory.service';
import { ProductsService } from '../../products/products.service';
import { LocationsService } from '../../locations/locations.service';
import { Product } from '../../../shared/models/product.model';
import { Location } from '../../../shared/models/location.model';
import { StockItem } from '../../../shared/models/inventory.model';

// HU-10 — "Consultar stock actual (filtrable por producto/ubicación)"
// (plan section 7.4), "cualquier autenticado" — the only screen under
// /inventory that isn't gated to Administrador (see app.routes.ts).
// TT-24 phase 2 — matches the Claude Design mockup: filter bar with a
// clear-filters action, a Lote column, and real pagination controls (the
// backend already supported page/pageSize; the UI never exposed them,
// always fetching page 1 at size 100).
@Component({
  selector: 'app-stock-list',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './stock-list.component.html',
  styleUrl: './stock-list.component.scss',
})
export class StockListComponent {
  private inventoryService = inject(InventoryService);
  private productsService = inject(ProductsService);
  private locationsService = inject(LocationsService);

  products = signal<Product[]>([]);
  locations = signal<Location[]>([]);
  stock = signal<StockItem[]>([]);
  total = signal(0);
  page = signal(1);
  pageSize = signal(20);
  loading = signal(true);
  errorMessage: string | null = null;

  filterProductId = '';
  filterLocationId = '';

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));

  constructor() {
    this.productsService.listProducts(1, 100).subscribe({ next: (r) => this.products.set(r.items) });
    this.locationsService.list(1, 100).subscribe({ next: (r) => this.locations.set(r.items) });
    this.reload();
  }

  applyFilters(): void {
    this.page.set(1);
    this.reload();
  }

  clearFilters(): void {
    this.filterProductId = '';
    this.filterLocationId = '';
    this.applyFilters();
  }

  changePageSize(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
    this.reload();
  }

  previousPage(): void {
    if (this.page() <= 1) return;
    this.page.update((p) => p - 1);
    this.reload();
  }

  nextPage(): void {
    if (this.page() >= this.totalPages()) return;
    this.page.update((p) => p + 1);
    this.reload();
  }

  reload(): void {
    this.errorMessage = null;
    this.loading.set(true);
    this.inventoryService
      .listStock(this.page(), this.pageSize(), this.filterProductId || undefined, this.filterLocationId || undefined)
      .subscribe({
        next: (r) => {
          this.stock.set(r.items);
          this.total.set(r.total);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.errorMessage = 'No se pudo cargar el stock.';
        },
      });
  }
}
