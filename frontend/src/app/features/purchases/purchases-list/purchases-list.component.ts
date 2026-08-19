import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PurchasesService } from '../purchases.service';
import { Purchase } from '../../../shared/models/purchase.model';

// HU-13 — first cut of the purchases list: date, supplier, item count,
// total, status (plan section 7.4 / HU-05's own criteria for "histórico"),
// same catalog-table pattern as suppliers-list. HU-05 owns the real
// per-supplier history screen (GET /suppliers/:id/purchases) — this one is
// the generic GET /purchases HU-13 itself already exposes.
@Component({
  selector: 'app-purchases-list',
  standalone: true,
  imports: [RouterLink, DatePipe, DecimalPipe],
  templateUrl: './purchases-list.component.html',
  styleUrl: './purchases-list.component.scss',
})
export class PurchasesListComponent {
  private purchasesService = inject(PurchasesService);

  purchases = signal<Purchase[]>([]);
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
    this.purchasesService.listPurchases(this.page(), this.pageSize).subscribe({
      next: (response) => {
        this.purchases.set(response.items);
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
