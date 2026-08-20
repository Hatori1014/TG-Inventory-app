import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { SuppliersService } from '../suppliers.service';
import { SupplierCatalogService } from '../supplier-catalog.service';
import { DocumentType } from '../../../shared/models/document-type.model';
import { PersonType } from '../../../shared/models/person-type.model';

// HU-04 — one component, two modes by :id presence (same criterion as
// ProductFormComponent/UserFormComponent). Edit resolves the supplier by
// filtering the paginated listSuppliers() — no GET /suppliers/:id in plan
// section 7.4's endpoint table. documentTypeId/personTypeId selects offer
// the same inline "+ Crear" shortcut ProductFormComponent uses for
// unit/category — the full admin screens (/document-types, /person-types)
// remain the only entry point for renaming/deactivating.
@Component({
  selector: 'app-supplier-form',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './supplier-form.component.html',
  styleUrl: './supplier-form.component.scss',
})
export class SupplierFormComponent {
  private fb = inject(FormBuilder);
  private suppliersService = inject(SuppliersService);
  private catalogService = inject(SupplierCatalogService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  supplierId = this.route.snapshot.paramMap.get('id');
  isEditMode = this.supplierId !== null;

  documentTypes = signal<DocumentType[]>([]);
  personTypes = signal<PersonType[]>([]);
  loading = signal(this.isEditMode);
  errorMessage: string | null = null;
  isSubmitting = false;

  showNewDocumentType = signal(false);
  newDocumentTypeName = '';
  showNewPersonType = signal(false);
  newPersonTypeName = '';

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    taxId: ['', [Validators.maxLength(50)]],
    documentTypeId: [''],
    personTypeId: [''],
    contact: ['', [Validators.maxLength(150)]],
    phone: ['', [Validators.maxLength(30)]],
    email: ['', [Validators.email]],
    status: ['active' as 'active' | 'inactive'],
  });

  constructor() {
    this.catalogService.listDocumentTypes().subscribe({ next: (r) => this.documentTypes.set(r.items) });
    this.catalogService.listPersonTypes().subscribe({ next: (r) => this.personTypes.set(r.items) });

    if (this.isEditMode) {
      this.suppliersService.listSuppliers(1, 100).subscribe({
        next: (response) => {
          const supplier = response.items.find((s) => s.id === this.supplierId);
          if (supplier) {
            this.form.patchValue({
              name: supplier.name,
              taxId: supplier.taxId ?? '',
              documentTypeId: supplier.documentType?.id ?? '',
              personTypeId: supplier.personType?.id ?? '',
              contact: supplier.contact ?? '',
              phone: supplier.phone ?? '',
              email: supplier.email ?? '',
              status: supplier.status,
            });
          }
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    }
  }

  createDocumentTypeInline(): void {
    if (!this.newDocumentTypeName.trim()) return;
    this.catalogService.createDocumentType({ name: this.newDocumentTypeName.trim() }).subscribe({
      next: (documentType) => {
        this.documentTypes.update((types) => [...types, documentType]);
        this.form.patchValue({ documentTypeId: documentType.id });
        this.newDocumentTypeName = '';
        this.showNewDocumentType.set(false);
      },
      error: () => {
        this.errorMessage = 'No se pudo crear el tipo de documento. ¿Ya existe uno con ese nombre?';
      },
    });
  }

  createPersonTypeInline(): void {
    if (!this.newPersonTypeName.trim()) return;
    this.catalogService.createPersonType({ name: this.newPersonTypeName.trim() }).subscribe({
      next: (personType) => {
        this.personTypes.update((types) => [...types, personType]);
        this.form.patchValue({ personTypeId: personType.id });
        this.newPersonTypeName = '';
        this.showNewPersonType.set(false);
      },
      error: () => {
        this.errorMessage = 'No se pudo crear el tipo de persona. ¿Ya existe uno con ese nombre?';
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.errorMessage = null;
    this.isSubmitting = true;
    const { name, taxId, documentTypeId, personTypeId, contact, phone, email, status } = this.form.getRawValue();

    const request$ = this.isEditMode
      ? this.suppliersService.updateSupplier(this.supplierId as string, {
          name,
          taxId: taxId || undefined,
          documentTypeId: documentTypeId || undefined,
          personTypeId: personTypeId || undefined,
          contact: contact || undefined,
          phone: phone || undefined,
          email: email || undefined,
          status,
        })
      : this.suppliersService.createSupplier({
          name,
          taxId: taxId || undefined,
          documentTypeId: documentTypeId || undefined,
          personTypeId: personTypeId || undefined,
          contact: contact || undefined,
          phone: phone || undefined,
          email: email || undefined,
        });

    request$.subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigateByUrl('/suppliers');
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting = false;
        this.errorMessage =
          error.status === 409
            ? 'Ya existe un proveedor activo con ese NIT y tipo de documento.'
            : error.status === 403
              ? 'No tenés permiso para realizar esta acción.'
              : error.status === 400
                ? 'El tipo de documento o de persona seleccionado no es válido.'
                : 'No se pudo guardar el proveedor. Intentá de nuevo.';
      },
    });
  }
}
