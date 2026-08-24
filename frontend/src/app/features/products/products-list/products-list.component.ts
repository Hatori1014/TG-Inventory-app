import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductsService } from '../products.service';
import { Product } from '../../../shared/models/product.model';
import { ProductThumbnailComponent } from '../../../shared/components/product-thumbnail/product-thumbnail.component';

// TT-24 phase 5 — matches the Claude Design mockup: table with a
// description subline, "Lote"/"Estado" badges, and real pagination (the
// backend already supported page/pageSize, same gap as HU-10's stock
// screen before phase 2). The mockup's search-by-name box and its
// canWriteProducts-gated "+ Nuevo producto" button are deliberately not
// replicated here: the backend has no name filter on GET /products (a
// box that only filtered the current page would be misleading, not
// useful), and the frontend has no client-side permission tracking today
// (only role), so "Nuevo producto"/"Editar" stay visible to every
// authenticated user — the backend's @RequirePermission() still enforces
// write access and surfaces a 403 in the form, same as before this phase.
@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [RouterLink, ProductThumbnailComponent],
  templateUrl: './products-list.component.html',
  styleUrl: './products-list.component.scss',
})
export class ProductsListComponent {
  private productsService = inject(ProductsService);

  products = signal<Product[]>([]);
  total = signal(0);
  page = signal(1);
  readonly pageSize = 20;
  loading = signal(true);

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize)));

  constructor() {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.productsService.listProducts(this.page(), this.pageSize).subscribe({
      next: (response) => {
        this.products.set(response.items);
        this.total.set(response.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
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
}
