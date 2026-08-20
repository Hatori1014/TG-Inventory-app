import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { SupplierCatalogService } from '../supplier-catalog.service';
import { SuppliersService } from '../suppliers.service';
import { DocumentType } from '../../../shared/models/document-type.model';

// HU-04, at the user's explicit request: full admin screen for the
// DocumentType catalog — list + inline create + activate/deactivate per
// row (mirrors units-list.component.ts/categories-list.component.ts, TT-23
// pattern). Same "Proveedores" count caveat as those: no endpoint returns
// a per-document-type count, so it's computed client-side from the same
// supplier fetch used there.
@Component({
  selector: 'app-document-types-list',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './document-types-list.component.html',
  styleUrl: './document-types-list.component.scss',
})
export class DocumentTypesListComponent {
  private catalogService = inject(SupplierCatalogService);
  private suppliersService = inject(SuppliersService);

  documentTypes = signal<DocumentType[]>([]);
  supplierCounts = signal<Record<string, number>>({});
  loading = signal(true);
  newName = '';
  errorMessage: string | null = null;

  constructor() {
    this.reload();
  }

  supplierCountFor(documentTypeId: string): number {
    return this.supplierCounts()[documentTypeId] ?? 0;
  }

  private reload(): void {
    this.loading.set(true);
    forkJoin({
      documentTypes: this.catalogService.listDocumentTypes(),
      suppliers: this.suppliersService.listSuppliers(1, 100),
    }).subscribe({
      next: ({ documentTypes, suppliers }) => {
        this.documentTypes.set(documentTypes.items);
        const counts: Record<string, number> = {};
        for (const supplier of suppliers.items) {
          if (!supplier.documentType) continue;
          counts[supplier.documentType.id] = (counts[supplier.documentType.id] ?? 0) + 1;
        }
        this.supplierCounts.set(counts);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  addDocumentType(): void {
    if (!this.newName.trim()) return;
    this.errorMessage = null;

    this.catalogService.createDocumentType({ name: this.newName.trim() }).subscribe({
      next: () => {
        this.newName = '';
        this.reload();
      },
      error: () => {
        this.errorMessage = 'No se pudo crear el tipo de documento. ¿Ya existe uno con ese nombre?';
      },
    });
  }

  toggleStatus(documentType: DocumentType): void {
    const status = documentType.status === 'active' ? 'inactive' : 'active';
    this.catalogService.updateDocumentType(documentType.id, { status }).subscribe({
      next: () => this.reload(),
      error: () => {
        this.errorMessage = 'No se pudo actualizar el tipo de documento.';
      },
    });
  }
}
