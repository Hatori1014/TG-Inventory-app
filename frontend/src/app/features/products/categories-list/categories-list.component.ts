import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { CatalogService } from '../catalog.service';
import { ProductsService } from '../products.service';
import { Category } from '../../../shared/models/category.model';

// HU-28 — full admin screen for the Category catalog: list + inline create
// + activate/deactivate per row. This is the only real entry point for
// PATCH /categories/:id (the product form's inline "create new" shortcut
// only covers POST).
// TT-24 phase 6 — matches the Claude Design mockup, same pattern as
// units-list.component.ts (the mockup's own note: "two different routes,
// same pattern"). "Productos" column: no endpoint returns a per-category
// count, so it's computed client-side by fetching products (up to 100,
// this project's current scale) alongside the categories and counting
// matches by categoryId.
@Component({
  selector: 'app-categories-list',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './categories-list.component.html',
  styleUrl: './categories-list.component.scss',
})
export class CategoriesListComponent {
  private catalogService = inject(CatalogService);
  private productsService = inject(ProductsService);

  categories = signal<Category[]>([]);
  productCounts = signal<Record<string, number>>({});
  loading = signal(true);
  newName = '';
  errorMessage: string | null = null;

  constructor() {
    this.reload();
  }

  productCountFor(categoryId: string): number {
    return this.productCounts()[categoryId] ?? 0;
  }

  private reload(): void {
    this.loading.set(true);
    forkJoin({
      categories: this.catalogService.listCategories(),
      products: this.productsService.listProducts(1, 100),
    }).subscribe({
      next: ({ categories, products }) => {
        this.categories.set(categories.items);
        const counts: Record<string, number> = {};
        for (const product of products.items) {
          if (!product.category) continue;
          counts[product.category.id] = (counts[product.category.id] ?? 0) + 1;
        }
        this.productCounts.set(counts);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  addCategory(): void {
    if (!this.newName.trim()) return;
    this.errorMessage = null;

    this.catalogService.createCategory({ name: this.newName.trim() }).subscribe({
      next: () => {
        this.newName = '';
        this.reload();
      },
      error: () => {
        this.errorMessage = 'No se pudo crear la categoría. ¿Ya existe una con ese nombre?';
      },
    });
  }

  toggleStatus(category: Category): void {
    const status = category.status === 'active' ? 'inactive' : 'active';
    this.catalogService.updateCategory(category.id, { status }).subscribe({
      next: () => this.reload(),
      error: () => {
        this.errorMessage = 'No se pudo actualizar la categoría.';
      },
    });
  }
}
