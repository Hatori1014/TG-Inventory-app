import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { SuppliersService } from '../suppliers.service';

// HU-04 — one component, two modes by :id presence (same criterion as
// ProductFormComponent/UserFormComponent). Edit resolves the supplier by
// filtering the paginated listSuppliers() — no GET /suppliers/:id in plan
// section 7.4's endpoint table.
@Component({
  selector: 'app-supplier-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './supplier-form.component.html',
  styleUrl: './supplier-form.component.scss',
})
export class SupplierFormComponent {
  private fb = inject(FormBuilder);
  private suppliersService = inject(SuppliersService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  supplierId = this.route.snapshot.paramMap.get('id');
  isEditMode = this.supplierId !== null;

  loading = signal(this.isEditMode);
  errorMessage: string | null = null;
  isSubmitting = false;

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    taxId: ['', [Validators.maxLength(50)]],
    contact: ['', [Validators.maxLength(150)]],
    phone: ['', [Validators.maxLength(30)]],
    email: ['', [Validators.email]],
    status: ['active' as 'active' | 'inactive'],
  });

  constructor() {
    if (this.isEditMode) {
      this.suppliersService.listSuppliers(1, 100).subscribe({
        next: (response) => {
          const supplier = response.items.find((s) => s.id === this.supplierId);
          if (supplier) {
            this.form.patchValue({
              name: supplier.name,
              taxId: supplier.taxId ?? '',
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

  onSubmit(): void {
    if (this.form.invalid) return;

    this.errorMessage = null;
    this.isSubmitting = true;
    const { name, taxId, contact, phone, email, status } = this.form.getRawValue();

    const request$ = this.isEditMode
      ? this.suppliersService.updateSupplier(this.supplierId as string, {
          name,
          taxId: taxId || undefined,
          contact: contact || undefined,
          phone: phone || undefined,
          email: email || undefined,
          status,
        })
      : this.suppliersService.createSupplier({
          name,
          taxId: taxId || undefined,
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
            ? 'Ya existe un proveedor activo con ese NIT.'
            : error.status === 403
              ? 'No tenés permiso para realizar esta acción.'
              : 'No se pudo guardar el proveedor. Intentá de nuevo.';
      },
    });
  }
}
