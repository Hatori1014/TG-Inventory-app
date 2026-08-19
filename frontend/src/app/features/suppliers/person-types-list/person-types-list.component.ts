import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { SupplierCatalogService } from '../supplier-catalog.service';
import { SuppliersService } from '../suppliers.service';
import { PersonType } from '../../../shared/models/person-type.model';

// HU-04, at the user's explicit request: full admin screen for the
// PersonType catalog — same pattern as document-types-list.component.ts.
@Component({
  selector: 'app-person-types-list',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './person-types-list.component.html',
  styleUrl: './person-types-list.component.scss',
})
export class PersonTypesListComponent {
  private catalogService = inject(SupplierCatalogService);
  private suppliersService = inject(SuppliersService);

  personTypes = signal<PersonType[]>([]);
  supplierCounts = signal<Record<string, number>>({});
  loading = signal(true);
  newName = '';
  errorMessage: string | null = null;

  constructor() {
    this.reload();
  }

  supplierCountFor(personTypeId: string): number {
    return this.supplierCounts()[personTypeId] ?? 0;
  }

  private reload(): void {
    this.loading.set(true);
    forkJoin({
      personTypes: this.catalogService.listPersonTypes(),
      suppliers: this.suppliersService.listSuppliers(1, 100),
    }).subscribe({
      next: ({ personTypes, suppliers }) => {
        this.personTypes.set(personTypes.items);
        const counts: Record<string, number> = {};
        for (const supplier of suppliers.items) {
          if (!supplier.personType) continue;
          counts[supplier.personType.id] = (counts[supplier.personType.id] ?? 0) + 1;
        }
        this.supplierCounts.set(counts);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  addPersonType(): void {
    if (!this.newName.trim()) return;
    this.errorMessage = null;

    this.catalogService.createPersonType({ name: this.newName.trim() }).subscribe({
      next: () => {
        this.newName = '';
        this.reload();
      },
      error: () => {
        this.errorMessage = 'No se pudo crear el tipo de persona. ¿Ya existe uno con ese nombre?';
      },
    });
  }

  toggleStatus(personType: PersonType): void {
    const status = personType.status === 'active' ? 'inactive' : 'active';
    this.catalogService.updatePersonType(personType.id, { status }).subscribe({
      next: () => this.reload(),
      error: () => {
        this.errorMessage = 'No se pudo actualizar el tipo de persona.';
      },
    });
  }
}
