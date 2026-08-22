import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { RequestsService } from '../requests.service';
import { SuppliersService } from '../../suppliers/suppliers.service';
import { ProductsService } from '../../products/products.service';
import { LocationsService } from '../../locations/locations.service';
import { Supplier } from '../../../shared/models/supplier.model';
import { Product } from '../../../shared/models/product.model';
import { Location } from '../../../shared/models/location.model';

// HU-15 — DoR resolved with the user: a purchase request can be saved as
// an incomplete draft (supplier/items optional) or submitted directly
// (supplier + at least one item required) — same multi-row FormArray
// pattern purchase-form.component.ts established for HU-13, but nothing
// here is required at the Angular form level (a draft is valid empty);
// canSubmit() mirrors PurchaseRequestSubmission's rule client-side so the
// "Enviar solicitud" button can be disabled before ever hitting the API.
@Component({
  selector: 'app-request-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe],
  templateUrl: './request-form.component.html',
  styleUrl: './request-form.component.scss',
})
export class RequestFormComponent {
  private fb = inject(FormBuilder);
  private requestsService = inject(RequestsService);
  private suppliersService = inject(SuppliersService);
  private productsService = inject(ProductsService);
  private locationsService = inject(LocationsService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  requestId = this.route.snapshot.paramMap.get('id');
  isEditMode = this.requestId !== null;

  suppliers = signal<Supplier[]>([]);
  products = signal<Product[]>([]);
  locations = signal<Location[]>([]);
  loading = signal(this.isEditMode);
  errorMessage: string | null = null;
  isSubmitting = false;

  form = this.fb.nonNullable.group({
    supplierId: [''],
    notes: [''],
    items: this.fb.array([this.createItemGroup()]),
  });

  constructor() {
    this.suppliersService.listSuppliers(1, 100).subscribe({ next: (r) => this.suppliers.set(r.items) });
    this.productsService.listProducts(1, 100).subscribe({ next: (r) => this.products.set(r.items) });
    this.locationsService.list(1, 100).subscribe({ next: (r) => this.locations.set(r.items) });

    if (this.isEditMode) {
      this.requestsService.getRequest(this.requestId as string).subscribe({
        next: (existing) => {
          this.form.patchValue({ supplierId: existing.supplierId ?? '', notes: existing.notes ?? '' });
          if (existing.items.length > 0) {
            this.items.clear();
            for (const item of existing.items) {
              this.items.push(
                this.createItemGroup({
                  productId: item.productId,
                  locationId: item.locationId,
                  quantity: item.quantity,
                  estimatedPrice: item.estimatedPrice,
                }),
              );
            }
          }
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    }
  }

  get items(): FormArray {
    return this.form.controls.items;
  }

  private createItemGroup(initial?: {
    productId: string;
    locationId: string;
    quantity: number;
    estimatedPrice: number | null;
  }) {
    return this.fb.nonNullable.group({
      productId: [initial?.productId ?? ''],
      locationId: [initial?.locationId ?? ''],
      quantity: [initial?.quantity ?? 1, [Validators.min(0.0001)]],
      estimatedPrice: [initial?.estimatedPrice ?? (null as number | null)],
    });
  }

  addItem(): void {
    this.items.push(this.createItemGroup());
  }

  removeItem(index: number): void {
    if (this.items.length <= 1) return;
    this.items.removeAt(index);
  }

  itemSubtotal(index: number): number {
    const { quantity, estimatedPrice } = this.items.at(index).value;
    return (quantity ?? 0) * (estimatedPrice ?? 0);
  }

  get totalEstimated(): number {
    return this.items.controls.reduce((sum: number, _, i) => sum + this.itemSubtotal(i), 0);
  }

  // Mirrors PurchaseRequestSubmission.canSubmit() — a supplier and at
  // least one fully-filled item row.
  canSubmit(): boolean {
    const { supplierId } = this.form.getRawValue();
    if (!supplierId) return false;
    return this.items.controls.some((group) => {
      const { productId, locationId, quantity } = group.value;
      return !!productId && !!locationId && (quantity ?? 0) > 0;
    });
  }

  private buildItemsPayload() {
    return this.items
      .getRawValue()
      .filter((item) => item.productId && item.locationId)
      .map((item) => ({
        productId: item.productId,
        locationId: item.locationId,
        quantity: item.quantity ?? 0,
        estimatedPrice: item.estimatedPrice ?? undefined,
      }));
  }

  saveDraft(): void {
    this.errorMessage = null;
    this.isSubmitting = true;
    const { supplierId, notes } = this.form.getRawValue();
    const payload = { supplierId: supplierId || undefined, notes: notes || undefined, items: this.buildItemsPayload() };

    const request$ = this.isEditMode
      ? this.requestsService.updateRequest(this.requestId as string, payload)
      : this.requestsService.createRequest({ type: 'purchase', saveAsDraft: true, ...payload });

    request$.subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigateByUrl('/requests');
      },
      error: () => {
        this.isSubmitting = false;
        this.errorMessage = 'No se pudo guardar el borrador. Intentá de nuevo.';
      },
    });
  }

  submitRequest(): void {
    if (!this.canSubmit()) {
      this.errorMessage = 'Elegí un proveedor y completá al menos un ítem (producto, ubicación y cantidad) para enviar la solicitud.';
      return;
    }

    this.errorMessage = null;
    this.isSubmitting = true;
    const { supplierId, notes } = this.form.getRawValue();
    const payload = { supplierId: supplierId || undefined, notes: notes || undefined, items: this.buildItemsPayload() };

    if (this.isEditMode) {
      // Save any pending edits first, then transition draft -> pending —
      // a "Enviar solicitud" click shouldn't silently drop last-second
      // changes the requester made before submitting.
      this.requestsService.updateRequest(this.requestId as string, payload).subscribe({
        next: () => this.doSubmit(),
        error: () => this.onSubmitError(),
      });
    } else {
      this.requestsService.createRequest({ type: 'purchase', ...payload }).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.router.navigateByUrl('/requests');
        },
        error: (error: HttpErrorResponse) => this.onSubmitError(error),
      });
    }
  }

  private doSubmit(): void {
    this.requestsService.submitRequest(this.requestId as string).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigateByUrl('/requests');
      },
      error: (error: HttpErrorResponse) => this.onSubmitError(error),
    });
  }

  private onSubmitError(error?: HttpErrorResponse): void {
    this.isSubmitting = false;
    this.errorMessage =
      error?.status === 403
        ? 'No tenés permiso para esta acción.'
        : error?.status === 409
          ? 'Esta solicitud ya no es un borrador.'
          : 'No se pudo enviar la solicitud. Intentá de nuevo.';
  }
}
