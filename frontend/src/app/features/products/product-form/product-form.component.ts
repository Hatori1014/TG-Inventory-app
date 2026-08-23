import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { ProductsService } from '../products.service';
import { CatalogService } from '../catalog.service';
import { Category } from '../../../shared/models/category.model';
import { Unit } from '../../../shared/models/unit.model';

// HU-28 — one component, two modes by :id presence (same criterion as
// UserFormComponent). Edit resolves the product by filtering the paginated
// listProducts() — no GET /products/:id in plan section 7.4's endpoint
// table. The unit/category selects each offer a "+ create new" inline
// shortcut (no modal, no new dependency) — the full admin screens
// (/categories, /units) remain the only entry point for editing/deactivating.
@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.scss',
})
export class ProductFormComponent {
  private fb = inject(FormBuilder);
  private productsService = inject(ProductsService);
  private catalogService = inject(CatalogService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  productId = this.route.snapshot.paramMap.get('id');
  isEditMode = this.productId !== null;

  units = signal<Unit[]>([]);
  categories = signal<Category[]>([]);
  loading = signal(this.isEditMode);
  errorMessage: string | null = null;
  isSubmitting = false;

  showNewUnit = signal(false);
  newUnitName = '';
  showNewCategory = signal(false);
  newCategoryName = '';

  // HU-26 — image upload acts immediately on selection, same UX pattern as
  // createUnitInline/createCategoryInline (doesn't wait for the main form
  // submit). imagePreviewUrl is an object URL from a blob fetched with the
  // JWT attached (R2 is private — a plain <img src> can't do that, see
  // ProductsService.getProductImage), revoked whenever it's replaced.
  imagePreviewUrl = signal<string | null>(null);
  isUploadingImage = false;
  imageError: string | null = null;

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    description: ['', [Validators.maxLength(500)]],
    unitId: ['', [Validators.required]],
    categoryId: [''],
    status: ['active' as 'active' | 'discontinued'],
    requiresBatch: [false], // HU-09 — deferred by HU-28, added here
  });

  constructor() {
    this.catalogService.listUnits().subscribe({ next: (r) => this.units.set(r.items) });
    this.catalogService.listCategories().subscribe({ next: (r) => this.categories.set(r.items) });

    if (this.isEditMode) {
      forkJoin({
        products: this.productsService.listProducts(1, 100),
      }).subscribe({
        next: ({ products }) => {
          const product = products.items.find((p) => p.id === this.productId);
          if (product) {
            this.form.patchValue({
              name: product.name,
              description: product.description ?? '',
              unitId: product.unit.id,
              categoryId: product.category?.id ?? '',
              status: product.status,
              requiresBatch: product.requiresBatch,
            });
            if (product.imageUrl) {
              this.loadImagePreview();
            }
          }
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    }
  }

  createUnitInline(): void {
    if (!this.newUnitName.trim()) return;
    this.catalogService.createUnit({ name: this.newUnitName.trim() }).subscribe({
      next: (unit) => {
        this.units.update((units) => [...units, unit]);
        this.form.patchValue({ unitId: unit.id });
        this.newUnitName = '';
        this.showNewUnit.set(false);
      },
      error: () => {
        this.errorMessage = 'No se pudo crear la unidad. ¿Ya existe una con ese nombre?';
      },
    });
  }

  createCategoryInline(): void {
    if (!this.newCategoryName.trim()) return;
    this.catalogService.createCategory({ name: this.newCategoryName.trim() }).subscribe({
      next: (category) => {
        this.categories.update((categories) => [...categories, category]);
        this.form.patchValue({ categoryId: category.id });
        this.newCategoryName = '';
        this.showNewCategory.set(false);
      },
      error: () => {
        this.errorMessage = 'No se pudo crear la categoría. ¿Ya existe una con ese nombre?';
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.errorMessage = null;
    this.isSubmitting = true;
    const { name, description, unitId, categoryId, status, requiresBatch } = this.form.getRawValue();

    const request$ = this.isEditMode
      ? this.productsService.updateProduct(this.productId as string, {
          name,
          description: description || undefined,
          unitId,
          categoryId: categoryId || undefined,
          status,
          requiresBatch,
        })
      : this.productsService.createProduct({
          name,
          description: description || undefined,
          unitId,
          categoryId: categoryId || undefined,
          requiresBatch,
        });

    request$.subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigateByUrl('/products');
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting = false;
        this.errorMessage =
          error.status === 403
            ? 'No tenés permiso para realizar esta acción.'
            : error.status === 400
              ? 'La unidad o categoría seleccionada no es válida.'
              : 'No se pudo guardar el producto. Intentá de nuevo.';
      },
    });
  }

  private loadImagePreview(): void {
    this.productsService.getProductImage(this.productId as string).subscribe({
      next: (blob) => this.setPreview(blob),
      // A 404 here just means the product has no image yet (or it hasn't
      // finished uploading) — not worth surfacing as an error.
      error: () => {},
    });
  }

  private setPreview(blob: Blob): void {
    const previous = this.imagePreviewUrl();
    if (previous) {
      URL.revokeObjectURL(previous);
    }
    this.imagePreviewUrl.set(URL.createObjectURL(blob));
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !this.productId) return;

    this.imageError = null;
    this.isUploadingImage = true;
    this.productsService.uploadProductImage(this.productId, file).subscribe({
      next: () => {
        this.isUploadingImage = false;
        this.setPreview(file);
      },
      error: (error: HttpErrorResponse) => {
        this.isUploadingImage = false;
        this.imageError =
          error.status === 400
            ? 'El archivo no es una imagen JPG, PNG o WEBP válida, o supera los 5MB.'
            : error.status === 403
              ? 'No tenés permiso para subir la imagen.'
              : 'No se pudo subir la imagen. Intentá de nuevo.';
      },
    });
  }
}
