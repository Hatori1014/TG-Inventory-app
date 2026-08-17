import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CatalogService } from '../catalog.service';
import { Unit } from '../../../shared/models/unit.model';

// HU-28 — full admin screen for the Unit catalog: list + inline create +
// activate/deactivate per row (mirrors categories-list.component.ts).
@Component({
  selector: 'app-units-list',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './units-list.component.html',
})
export class UnitsListComponent {
  private catalogService = inject(CatalogService);

  units = signal<Unit[]>([]);
  loading = signal(true);
  newName = '';
  errorMessage: string | null = null;

  constructor() {
    this.reload();
  }

  private reload(): void {
    this.catalogService.listUnits().subscribe({
      next: (response) => {
        this.units.set(response.items);
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
