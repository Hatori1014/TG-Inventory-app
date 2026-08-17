import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CatalogService } from '../catalog.service';
import { Category } from '../../../shared/models/category.model';

// HU-28 — full admin screen for the Category catalog: list + inline create
// + activate/deactivate per row. This is the only real entry point for
// PATCH /categories/:id (the product form's inline "create new" shortcut
// only covers POST).
@Component({
  selector: 'app-categories-list',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './categories-list.component.html',
})
export class CategoriesListComponent {
  private catalogService = inject(CatalogService);

  categories = signal<Category[]>([]);
  loading = signal(true);
  newName = '';
  errorMessage: string | null = null;

  constructor() {
    this.reload();
  }

  private reload(): void {
    this.catalogService.listCategories().subscribe({
      next: (response) => {
        this.categories.set(response.items);
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
