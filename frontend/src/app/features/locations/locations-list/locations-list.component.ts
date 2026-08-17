import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LocationsService } from '../locations.service';
import { Location } from '../../../shared/models/location.model';

// HU-06 — full admin screen: list + inline create (with optional parent
// select for the hierarchy) + activate/deactivate per row. There is no
// delete endpoint at all (ADR-22) — a location with stock is never removed,
// only deactivated, same as Category/Unit in HU-28.
@Component({
  selector: 'app-locations-list',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './locations-list.component.html',
})
export class LocationsListComponent {
  private locationsService = inject(LocationsService);

  locations = signal<Location[]>([]);
  loading = signal(true);
  newName = '';
  newParentId = '';
  errorMessage: string | null = null;

  constructor() {
    this.reload();
  }

  parentName(parentId: string | null): string {
    if (!parentId) return '—';
    return this.locations().find((l) => l.id === parentId)?.name ?? '—';
  }

  private reload(): void {
    this.locationsService.list().subscribe({
      next: (response) => {
        this.locations.set(response.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  addLocation(): void {
    if (!this.newName.trim()) return;
    this.errorMessage = null;

    this.locationsService
      .create({ name: this.newName.trim(), parentId: this.newParentId || undefined })
      .subscribe({
        next: () => {
          this.newName = '';
          this.newParentId = '';
          this.reload();
        },
        error: () => {
          this.errorMessage = 'No se pudo crear la ubicación. ¿Ya existe una con ese nombre bajo el mismo padre?';
        },
      });
  }

  toggleStatus(location: Location): void {
    const status = location.status === 'active' ? 'inactive' : 'active';
    this.locationsService.update(location.id, { status }).subscribe({
      next: () => this.reload(),
      error: () => {
        this.errorMessage = 'No se pudo actualizar la ubicación.';
      },
    });
  }
}
