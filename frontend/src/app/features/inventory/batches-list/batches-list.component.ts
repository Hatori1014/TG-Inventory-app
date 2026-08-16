import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { InventoryService } from '../inventory.service';
import { ProductsService } from '../../products/products.service';
import { Product } from '../../../shared/models/product.model';
import { Batch } from '../../../shared/models/batch.model';

// HU-09 — full admin screen for batches: pick a product that requires
// batch tracking, list its batches, create new ones inline. No PATCH — the
// plan (section 7.4) only defines POST/GET for /inventory/batches.
@Component({
  selector: 'app-batches-list',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './batches-list.component.html',
})
export class BatchesListComponent {
  private inventoryService = inject(InventoryService);
  private productsService = inject(ProductsService);

  products = signal<Product[]>([]);
  selectedProductId = '';
  batches = signal<Batch[]>([]);
  loading = signal(false);
  errorMessage: string | null = null;
  newBatchNumber = '';
  newExpiresAt = '';

  constructor() {
    this.productsService.listProducts(1, 100).subscribe({
      next: (r) => this.products.set(r.items.filter((p) => p.requiresBatch)),
    });
  }

  onProductChange(): void {
    this.errorMessage = null;
    if (!this.selectedProductId) {
      this.batches.set([]);
      return;
    }
    this.loading.set(true);
    this.inventoryService.listBatches(this.selectedProductId).subscribe({
      next: (r) => {
        this.batches.set(r.items);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage = 'No se pudieron cargar los lotes.';
      },
    });
  }

  addBatch(): void {
    if (!this.selectedProductId || !this.newBatchNumber.trim()) return;
    this.errorMessage = null;

    this.inventoryService
      .createBatch({
        productId: this.selectedProductId,
        batchNumber: this.newBatchNumber.trim(),
        expiresAt: this.newExpiresAt || undefined,
      })
      .subscribe({
        next: () => {
          this.newBatchNumber = '';
          this.newExpiresAt = '';
          this.onProductChange();
        },
        error: () => {
          this.errorMessage = 'No se pudo crear el lote.';
        },
      });
  }
}
