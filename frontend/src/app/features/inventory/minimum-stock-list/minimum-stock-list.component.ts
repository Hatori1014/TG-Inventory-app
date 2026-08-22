import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../inventory.service';
import { ProductsService } from '../../products/products.service';
import { MinimumStock } from '../../../shared/models/inventory.model';
import { Product } from '../../../shared/models/product.model';

// HU-11 — full admin screen for minimum stock thresholds: list + inline
// create (product select + quantity) + inline edit per row, same
// list+inline-add pattern as document-types-list/categories-list, plus the
// inline-edit toggle pattern from locations-list (editingId/editingValue).
// No activate/deactivate here — there's no status field (ADR-22: removing
// a threshold is an edit to 0, never a delete) — so the per-row action is
// just Editar/Guardar/Cancelar.
@Component({
  selector: 'app-minimum-stock-list',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './minimum-stock-list.component.html',
  styleUrl: './minimum-stock-list.component.scss',
})
export class MinimumStockListComponent {
  private readonly inventoryService = inject(InventoryService);
  private readonly productsService = inject(ProductsService);

  minimums = signal<MinimumStock[]>([]);
  products = signal<Product[]>([]);
  loading = signal(true);
  newProductId = '';
  newQuantity: number | null = null;
  errorMessage: string | null = null;

  editingId: string | null = null;
  editingQuantity: number | null = null;

  // Only products without a minimum defined yet can be added — a product
  // that already has one must be edited via the row's own Editar action,
  // matching CreateMinimumStockUseCase's 409 on a duplicate.
  productsWithoutMinimum(): Product[] {
    const takenIds = new Set(this.minimums().map((m) => m.productId));
    return this.products().filter((p) => !takenIds.has(p.id));
  }

  constructor() {
    this.reload();
  }

  private reload(): void {
    this.loading.set(true);
    this.inventoryService.listMinimumStock().subscribe({
      next: (minimumsResponse) => {
        this.minimums.set(minimumsResponse.items);
        this.productsService.listProducts(1, 100).subscribe({
          next: (productsResponse) => {
            this.products.set(productsResponse.items);
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });
      },
      error: () => this.loading.set(false),
    });
  }

  addMinimum(): void {
    if (!this.newProductId || this.newQuantity === null || this.newQuantity < 0) return;
    this.errorMessage = null;

    this.inventoryService.createMinimumStock(this.newProductId, this.newQuantity).subscribe({
      next: () => {
        this.newProductId = '';
        this.newQuantity = null;
        this.reload();
      },
      error: () => {
        this.errorMessage = 'No se pudo definir el mínimo. ¿Ese producto ya tiene uno definido?';
      },
    });
  }

  startEdit(minimumStock: MinimumStock): void {
    this.editingId = minimumStock.id;
    this.editingQuantity = minimumStock.minimumQuantity;
    this.errorMessage = null;
  }

  cancelEdit(): void {
    this.editingId = null;
    this.editingQuantity = null;
  }

  confirmEdit(minimumStock: MinimumStock): void {
    if (this.editingQuantity === null || this.editingQuantity < 0) return;
    if (this.editingQuantity === minimumStock.minimumQuantity) {
      this.cancelEdit();
      return;
    }

    this.inventoryService.updateMinimumStock(minimumStock.id, this.editingQuantity).subscribe({
      next: () => {
        this.cancelEdit();
        this.reload();
      },
      error: () => {
        this.errorMessage = 'No se pudo actualizar el mínimo.';
      },
    });
  }
}
