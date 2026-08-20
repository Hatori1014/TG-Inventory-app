import { Component, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { RequestsService } from '../requests.service';
import { ProductsService } from '../../products/products.service';
import { LocationsService } from '../../locations/locations.service';
import { InventoryService } from '../../inventory/inventory.service';
import { Product } from '../../../shared/models/product.model';
import { Location } from '../../../shared/models/location.model';

// HU-16 — no supplier, no draft (its own criteria never mentions one — see
// CreateRequestUseCase on the backend). The user's explicit UX
// requirement: a location with zero stock of the selected product must
// still appear in its select, just disabled ("de solo lectura y no
// seleccionable") — not hidden — so availabilityFor() drives
// [disabled] on <option>, never filters the list itself. Stock is
// aggregated client-side across every batch of a product at a location
// (GET /inventory/stock returns one row per batch), mirroring exactly
// what the backend's own findAvailableStock() sums server-side.
@Component({
  selector: 'app-consumption-request-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './consumption-request-form.component.html',
  styleUrl: './consumption-request-form.component.scss',
})
export class ConsumptionRequestFormComponent {
  private fb = inject(FormBuilder);
  private requestsService = inject(RequestsService);
  private productsService = inject(ProductsService);
  private locationsService = inject(LocationsService);
  private inventoryService = inject(InventoryService);
  private router = inject(Router);

  products = signal<Product[]>([]);
  locations = signal<Location[]>([]);
  // productId -> locationId -> quantity available (summed across batches)
  availability = signal<Record<string, Record<string, number>>>({});
  errorMessage: string | null = null;
  isSubmitting = false;

  form = this.fb.nonNullable.group({
    notes: [''],
    items: this.fb.array([this.createItemGroup()]),
  });

  constructor() {
    this.productsService.listProducts(1, 100).subscribe({ next: (r) => this.products.set(r.items) });
    this.locationsService.list(1, 100).subscribe({ next: (r) => this.locations.set(r.items) });
    this.inventoryService.listStock(1, 100).subscribe({
      next: (r) => {
        const map: Record<string, Record<string, number>> = {};
        for (const stockItem of r.items) {
          const byLocation = map[stockItem.product.id] ?? (map[stockItem.product.id] = {});
          byLocation[stockItem.location.id] = (byLocation[stockItem.location.id] ?? 0) + stockItem.quantity;
        }
        this.availability.set(map);
      },
    });
  }

  get items(): FormArray {
    return this.form.controls.items;
  }

  private createItemGroup() {
    return this.fb.nonNullable.group({
      productId: ['', Validators.required],
      locationId: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(0.0001)]],
    });
  }

  addItem(): void {
    this.items.push(this.createItemGroup());
  }

  removeItem(index: number): void {
    if (this.items.length <= 1) return;
    this.items.removeAt(index);
  }

  availableQuantity(productId: string, locationId: string): number {
    return this.availability()[productId]?.[locationId] ?? 0;
  }

  locationHasStock(index: number, locationId: string): boolean {
    const productId = this.items.at(index).value.productId;
    if (!productId) return true;
    return this.availableQuantity(productId, locationId) > 0;
  }

  exceedsAvailableStock(index: number): boolean {
    const { productId, locationId, quantity } = this.items.at(index).value;
    if (!productId || !locationId) return false;
    return (quantity ?? 0) > this.availableQuantity(productId, locationId);
  }

  get hasAnyExcess(): boolean {
    return this.items.controls.some((_, i) => this.exceedsAvailableStock(i));
  }

  onSubmit(): void {
    if (this.form.invalid || this.hasAnyExcess) return;

    this.errorMessage = null;
    this.isSubmitting = true;
    const { notes, items } = this.form.getRawValue();

    this.requestsService
      .createRequest({
        type: 'consumption',
        notes: notes || undefined,
        items: items.map((item) => ({ productId: item.productId, locationId: item.locationId, quantity: item.quantity })),
      })
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.router.navigateByUrl('/requests');
        },
        error: (error: HttpErrorResponse) => {
          this.isSubmitting = false;
          this.errorMessage =
            error.status === 403
              ? 'No tenés permiso para crear solicitudes.'
              : error.status === 400
                ? 'Datos inválidos: revisá que la cantidad no supere el stock disponible en esa ubicación.'
                : 'No se pudo crear la solicitud. Intentá de nuevo.';
        },
      });
  }
}
