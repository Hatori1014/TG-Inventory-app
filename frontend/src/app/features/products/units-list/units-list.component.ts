import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { CatalogService } from '../catalog.service';
import { ProductsService } from '../products.service';
import { Unit } from '../../../shared/models/unit.model';

// HU-28 — full admin screen for the Unit catalog: list + inline create +
// activate/deactivate per row (mirrors categories-list.component.ts).
// TT-24 phase 6 — same "Productos" count caveat as categories-list: no
// endpoint returns a per-unit count, so it's computed client-side from the
// same product fetch used there.
@Component({
  selector: 'app-units-list',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './units-list.component.html',
  styleUrl: './units-list.component.scss',
})
export class UnitsListComponent {
  private catalogService = inject(CatalogService);
  private productsService = inject(ProductsService);

  units = signal<Unit[]>([]);
  productCounts = signal<Record<string, number>>({});
  loading = signal(true);
  newName = '';
  errorMessage: string | null = null;

  constructor() {
    this.reload();
  }

  productCountFor(unitId: string): number {
    return this.productCounts()[unitId] ?? 0;
  }

  private reload(): void {
    this.loading.set(true);
    forkJoin({
      units: this.catalogService.listUnits(),
      products: this.productsService.listProducts(1, 100),
    }).subscribe({
      next: ({ units, products }) => {
        this.units.set(units.items);
        const counts: Record<string, number> = {};
        for (const product of products.items) {
          counts[product.unit.id] = (counts[product.unit.id] ?? 0) + 1;
        }
        this.productCounts.set(counts);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  addUnit(): void {
    if (!this.newName.trim()) return;
    this.errorMessage = null;

    this.catalogService.createUnit({ name: this.newName.trim() }).subscribe({
      next: () => {
        this.newName = '';
        this.reload();
      },
      error: () => {
        this.errorMessage = 'No se pudo crear la unidad. ¿Ya existe una con ese nombre?';
      },
    });
  }

  toggleStatus(unit: Unit): void {
    const status = unit.status === 'active' ? 'inactive' : 'active';
    this.catalogService.updateUnit(unit.id, { status }).subscribe({
      next: () => this.reload(),
      error: () => {
        this.errorMessage = 'No se pudo actualizar la unidad.';
      },
    });
  }
}
