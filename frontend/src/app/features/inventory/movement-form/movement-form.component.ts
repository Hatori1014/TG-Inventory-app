import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { InventoryService } from '../inventory.service';
import { ProductsService } from '../../products/products.service';
import { LocationsService } from '../../locations/locations.service';
import { Product } from '../../../shared/models/product.model';
import { Location } from '../../../shared/models/location.model';
import { Batch } from '../../../shared/models/batch.model';
import { MovementType } from '../../../shared/models/inventory.model';

interface MovementTypeOption {
  id: MovementType;
  label: string;
  icon: string;
}

const MOVEMENT_TYPES: MovementTypeOption[] = [
  { id: 'in', label: 'Entrada', icon: 'ph-tray-arrow-down' },
  { id: 'out', label: 'Salida', icon: 'ph-tray-arrow-up' },
  { id: 'adjustment', label: 'Ajuste', icon: 'ph-sliders-horizontal' },
  { id: 'transfer', label: 'Traslado', icon: 'ph-arrows-left-right' },
];

// HU-08 — one form covering all four movement categories the backend
// exposes through the single POST /inventory/movements (ADR-27/ADR-28):
// "adjustment" needs a direction, "transfer" needs a destination location —
// both fields only shown/sent when relevant. HU-09 adds batchId, required
// when the selected product has requiresBatch = true (ADR-28 extension).
// TT-24 phase 3 — matches the Claude Design mockup: type selector as
// pills instead of a <select>, and a new sidebar ("Qué se escribe") that
// previews the ledger effect of the currently selected type/direction
// before submitting — real derived state, not the mockup's static
// illustrative text, since this form actually has the values bound.
@Component({
  selector: 'app-movement-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './movement-form.component.html',
  styleUrl: './movement-form.component.scss',
})
export class MovementFormComponent {
  private fb = inject(FormBuilder);
  private inventoryService = inject(InventoryService);
  private productsService = inject(ProductsService);
  private locationsService = inject(LocationsService);

  readonly movementTypes = MOVEMENT_TYPES;

  products = signal<Product[]>([]);
  locations = signal<Location[]>([]);
  batches = signal<Batch[]>([]);
  errorMessage: string | null = null;
  successMessage: string | null = null;
  isSubmitting = false;

  form = this.fb.nonNullable.group({
    productId: ['', [Validators.required]],
    locationId: ['', [Validators.required]],
    type: ['in' as MovementType, [Validators.required]],
    quantity: [0, [Validators.required, Validators.min(0.0001)]],
    direction: ['increase' as 'increase' | 'decrease'],
    destinationLocationId: [''],
    batchId: [''],
    notes: [''],
  });

  private readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  selectedProductRequiresBatch = computed(() => {
    const product = this.products().find((p) => p.id === this.formValue().productId);
    return product?.requiresBatch ?? false;
  });

  readonly locationLabel = computed(() =>
    this.formValue().type === 'transfer' ? 'Ubicación de origen' : 'Ubicación',
  );

  readonly submitLabel = computed(
    () =>
      ({ in: 'Registrar entrada', out: 'Registrar salida', adjustment: 'Registrar ajuste', transfer: 'Registrar traslado' })[
        this.formValue().type ?? 'in'
      ],
  );

  // Sidebar preview of the ledger effect — real values from the bound
  // form, not the mockup's static "+24 o -24 según dirección" placeholder.
  readonly ledgerRows = computed(() => (this.formValue().type === 'transfer' ? '2 (salida y entrada)' : '1'));

  readonly deltaSign = computed(() => {
    const { type, direction } = this.formValue();
    if (type === 'in') return '+';
    if (type === 'adjustment') return direction === 'decrease' ? '-' : '+';
    return '-'; // out, transfer (origin always loses)
  });

  readonly deltaPreview = computed(() => `${this.deltaSign()}${this.formValue().quantity || 0}`);

  readonly deltaColorClass = computed(() =>
    this.deltaSign() === '+' ? 'movement-delta--positive' : 'movement-delta--negative',
  );

  constructor() {
    this.productsService.listProducts(1, 100).subscribe({ next: (r) => this.products.set(r.items) });
    this.locationsService.list(1, 100).subscribe({ next: (r) => this.locations.set(r.items) });
  }

  selectType(type: MovementType): void {
    this.form.patchValue({ type });
  }

  onProductChange(): void {
    this.form.patchValue({ batchId: '' });
    const productId = this.form.value.productId;
    if (!productId || !this.selectedProductRequiresBatch()) {
      this.batches.set([]);
      return;
    }
    this.inventoryService.listBatches(productId).subscribe({ next: (r) => this.batches.set(r.items) });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.errorMessage = null;
    this.successMessage = null;
    this.isSubmitting = true;
    const { productId, locationId, type, quantity, direction, destinationLocationId, batchId, notes } =
      this.form.getRawValue();

    this.inventoryService
      .registerMovement({
        productId,
        locationId,
        type,
        quantity,
        direction: type === 'adjustment' ? direction : undefined,
        destinationLocationId: type === 'transfer' ? destinationLocationId || undefined : undefined,
        batchId: batchId || undefined,
        notes: notes || undefined,
      })
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.successMessage = 'Movimiento registrado correctamente.';
          this.form.patchValue({ quantity: 0, notes: '' });
        },
        error: (error: HttpErrorResponse) => {
          this.isSubmitting = false;
          this.errorMessage =
            error.status === 403
              ? 'No tenés permiso para registrar movimientos de inventario.'
              : error.status === 409
                ? 'Stock insuficiente en la ubicación de origen para la cantidad solicitada.'
                : error.status === 400
                  ? 'Datos inválidos: revisá el producto, la ubicación (origen/destino), el lote y la cantidad.'
                  : 'No se pudo registrar el movimiento. Intentá de nuevo.';
        },
      });
  }
}
