import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { PurchasesService } from '../purchases.service';
import { SuppliersService } from '../../suppliers/suppliers.service';
import { ProductsService } from '../../products/products.service';
import { LocationsService } from '../../locations/locations.service';
import { Supplier } from '../../../shared/models/supplier.model';
import { Product } from '../../../shared/models/product.model';
import { Location } from '../../../shared/models/location.model';

// HU-13, at the user's explicit request: destination location chosen per
// item, so this is the first multi-row form in the app (FormArray) — every
// prior form (movement-form included) only ever wrote one line at a time.
// batchNumber is a human-entered lot code, not a batchId select: the
// backend looks it up (or creates it) within the purchase's own
// transaction, so there's no batches list to fetch here the way
// movement-form fetches one per productId.
@Component({
  selector: 'app-purchase-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe],
  templateUrl: './purchase-form.component.html',
  styleUrl: './purchase-form.component.scss',
})
export class PurchaseFormComponent {
  private fb = inject(FormBuilder);
  private purchasesService = inject(PurchasesService);
  private suppliersService = inject(SuppliersService);
  private productsService = inject(ProductsService);
  private locationsService = inject(LocationsService);
  private router = inject(Router);

  suppliers = signal<Supplier[]>([]);
  products = signal<Product[]>([]);
  locations = signal<Location[]>([]);
  errorMessage: string | null = null;
  isSubmitting = false;

  form = this.fb.nonNullable.group({
    supplierId: ['', Validators.required],
    items: this.fb.array([this.createItemGroup()]),
  });

  constructor() {
    this.suppliersService.listSuppliers(1, 100).subscribe({ next: (r) => this.suppliers.set(r.items) });
    this.productsService.listProducts(1, 100).subscribe({ next: (r) => this.products.set(r.items) });
    this.locationsService.list(1, 100).subscribe({ next: (r) => this.locations.set(r.items) });
  }

  get items(): FormArray {
    return this.form.controls.items;
  }

  private createItemGroup() {
    return this.fb.nonNullable.group({
      productId: ['', Validators.required],
      locationId: ['', Validators.required],
      batchNumber: [''],
      batchExpiresAt: [''],
      quantity: [1, [Validators.required, Validators.min(0.0001)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
    });
  }

  addItem(): void {
    this.items.push(this.createItemGroup());
  }

  removeItem(index: number): void {
    if (this.items.length <= 1) return;
    this.items.removeAt(index);
  }

  itemRequiresBatch(index: number): boolean {
    const productId = this.items.at(index).value.productId;
    return this.products().find((p) => p.id === productId)?.requiresBatch ?? false;
  }

  itemSubtotal(index: number): number {
    const { quantity, unitPrice } = this.items.at(index).value;
    return (quantity ?? 0) * (unitPrice ?? 0);
  }

  get totalAmount(): number {
    return this.items.controls.reduce((sum: number, _, i) => sum + this.itemSubtotal(i), 0);
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.errorMessage = null;
    this.isSubmitting = true;
    const { supplierId, items } = this.form.getRawValue();

    this.purchasesService
      .createPurchase({
        supplierId,
        items: items.map((item) => ({
          productId: item.productId,
          locationId: item.locationId,
          batchNumber: item.batchNumber || undefined,
          batchExpiresAt: item.batchExpiresAt || undefined,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      })
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.router.navigateByUrl('/purchases');
        },
        error: (error: HttpErrorResponse) => {
          this.isSubmitting = false;
          this.errorMessage =
            error.status === 403
              ? 'No tenés permiso para registrar compras.'
              : error.status === 400
                ? 'Datos inválidos: revisá el proveedor, los productos, las ubicaciones y los lotes requeridos.'
                : 'No se pudo registrar la compra. Intentá de nuevo.';
        },
      });
  }
}
