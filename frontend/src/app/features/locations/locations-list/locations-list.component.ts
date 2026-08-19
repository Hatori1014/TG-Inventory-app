import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LocationsService } from '../locations.service';
import { Location } from '../../../shared/models/location.model';

interface LocationRow {
  location: Location;
  level: number;
}

// HU-06 — full admin screen: list + inline create (with optional parent
// select for the hierarchy) + rename + activate/deactivate per row. There
// is no delete endpoint at all (ADR-22) — a location with stock is never
// removed, only deactivated, same as Category/Unit in HU-28.
// TT-24 phase 7 — matches the Claude Design mockup's hierarchy layout: the
// API returns a flat list (no tree endpoint), so rows are ordered
// depth-first from parentId and indented by level. Create uses a side
// panel (grid, not phase 6's inline add row) because it also needs a
// parent <select>, exactly as the mockup models it. The mockup shows a
// per-row icon by "type" (building/warehouse/shelf) — Location has no
// type field, so every row uses the same generic icon instead of guessing
// a type from the name.
@Component({
  selector: 'app-locations-list',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './locations-list.component.html',
  styleUrl: './locations-list.component.scss',
})
export class LocationsListComponent {
  private locationsService = inject(LocationsService);

  locations = signal<Location[]>([]);
  loading = signal(true);
  newName = '';
  newParentId = '';
  errorMessage: string | null = null;

  editingId: string | null = null;
  editingName = '';

  rows = computed<LocationRow[]>(() => this.buildHierarchy(this.locations()));

  constructor() {
    this.reload();
  }

  parentName(parentId: string | null): string {
    if (!parentId) return '—';
    return this.locations().find((l) => l.id === parentId)?.name ?? '—';
  }

  private buildHierarchy(locations: Location[]): LocationRow[] {
    const byParent = new Map<string | null, Location[]>();
    for (const location of locations) {
      const siblings = byParent.get(location.parentId) ?? [];
      siblings.push(location);
      byParent.set(location.parentId, siblings);
    }

    const rows: LocationRow[] = [];
    const walk = (parentId: string | null, level: number): void => {
      for (const location of byParent.get(parentId) ?? []) {
        rows.push({ location, level });
        walk(location.id, level + 1);
      }
    };
    walk(null, 0);
    return rows;
  }

  private reload(): void {
    this.loading.set(true);
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

  startRename(location: Location): void {
    this.editingId = location.id;
    this.editingName = location.name;
    this.errorMessage = null;
  }

  cancelRename(): void {
    this.editingId = null;
    this.editingName = '';
  }

  confirmRename(location: Location): void {
    const name = this.editingName.trim();
    if (!name || name === location.name) {
      this.cancelRename();
      return;
    }

    this.locationsService.update(location.id, { name }).subscribe({
      next: () => {
        this.cancelRename();
        this.reload();
      },
      error: () => {
        this.errorMessage = 'No se pudo renombrar la ubicación. ¿Ya existe una con ese nombre bajo el mismo padre?';
      },
    });
  }
}
