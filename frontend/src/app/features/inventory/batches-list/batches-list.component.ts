import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { InventoryService } from '../inventory.service';
import { ProductsService } from '../../products/products.service';
import { Product } from '../../../shared/models/product.model';
import { Batch } from '../../../shared/models/batch.model';

// HU-09 — full admin screen for batches: pick a product that requires
// batch tracking, list its batches, create new ones inline. No PATCH — the
// plan (section 7.4) only defines POST/GET for /inventory/batches.
// TT-24 phase 4 — matches the Claude Design mockup: product picker note,
// table card with a header/count, inline add row styled like the rest of
// the app. Two things the mockup shows that the previous version didn't
// wire up, both using endpoints that already existed: a "Recibido" date
// input (CreateBatchRequest already accepted receivedAt — backdating a
// batch that physically arrived before today), and a "Stock del lote"
// column, computed client-side by grouping GET /inventory/stock (filtered
// by product) per batchId — there's no single endpoint for per-batch
// totals, so this issues a second read alongside listBatches().
@Component({
  selector: 'app-batches-list',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './batches-list.component.html',
  styleUrl: './batches-list.component.scss',
})
export class BatchesListComponent {
  private inventoryService = inject(InventoryService);
  private productsService = inject(ProductsService);

  products = signal<Product[]>([]);
  selectedProductId = '';
  batches = signal<Batch[]>([]);
  batchStock = signal<Record<string, number>>({});
  loading = signal(false);
  errorMessage: string | null = null;
  newBatchNumber = '';
  newExpiresAt = '';
  newReceivedAt = '';

  readonly selectedProductName = computed(
    () => this.products().find((p) => p.id === this.selectedProductId)?.name ?? '',
  );

  constructor() {
    this.productsService.listProducts(1, 100).subscribe({
      next: (r) => this.products.set(r.items.filter((p) => p.requiresBatch)),
    });
  }

  onProductChange(): void {
    this.errorMessage = null;
    if (!this.selectedProductId) {
      this.batches.set([]);
      this.batchStock.set({});
      return;
    }
    this.loading.set(true);
    forkJoin({
      batches: this.inventoryService.listBatches(this.selectedProductId),
      stock: this.inventoryService.listStock(1, 100, this.selectedProductId),
    }).subscribe({
      next: ({ batches, stock }) => {
        this.batches.set(batches.items);
        const totals: Record<string, number> = {};
        for (const row of stock.items) {
          if (!row.batchId) continue;
          totals[row.batchId] = (totals[row.batchId] ?? 0) + row.quantity;
        }
        this.batchStock.set(totals);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage = 'No se pudieron cargar los lotes.';
      },
    });
  }

  stockFor(batchId: string): number {
    return this.batchStock()[batchId] ?? 0;
  }

  addBatch(): void {
    if (!this.selectedProductId || !this.newBatchNumber.trim()) return;
    this.errorMessage = null;

    this.inventoryService
      .createBatch({
        productId: this.selectedProductId,
        batchNumber: this.newBatchNumber.trim(),
        expiresAt: this.newExpiresAt || undefined,
        receivedAt: this.newReceivedAt || undefined,
      })
      .subscribe({
        next: () => {
          this.newBatchNumber = '';
          this.newExpiresAt = '';
          this.newReceivedAt = '';
          this.onProductChange();
        },
        error: () => {
          this.errorMessage = 'No se pudo crear el lote.';
        },
      });
  }
}
