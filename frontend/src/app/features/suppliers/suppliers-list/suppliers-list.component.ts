import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SuppliersService } from '../suppliers.service';
import { Supplier } from '../../../shared/models/supplier.model';

// HU-04 — first MVP2 screen. Not part of the TT-24 mockup (that covered
// only MVP1's 10 screens), so this follows the same "catalog" pattern
// (header+count card, table, real pagination) already established by
// products-list/locations-list for visual consistency with the rest of
// the app.
@Component({
  selector: 'app-suppliers-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './suppliers-list.component.html',
  styleUrl: './suppliers-list.component.scss',
})
export class SuppliersListComponent {
  private suppliersService = inject(SuppliersService);

  suppliers = signal<Supplier[]>([]);
  total = signal(0);
  page = signal(1);
  readonly pageSize = 20;
  loading = signal(true);

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize)));

  constructor() {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.suppliersService.listSuppliers(this.page(), this.pageSize).subscribe({
      next: (response) => {
        this.suppliers.set(response.items);
        this.total.set(response.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  previousPage(): void {
    if (this.page() <= 1) return;
    this.page.update((p) => p - 1);
    this.reload();
  }

  nextPage(): void {
    if (this.page() >= this.totalPages()) return;
    this.page.update((p) => p + 1);
    this.reload();
  }
}
