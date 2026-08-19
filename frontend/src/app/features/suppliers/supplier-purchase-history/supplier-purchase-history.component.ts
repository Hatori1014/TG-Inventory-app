import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SuppliersService } from '../suppliers.service';
import { Purchase } from '../../../shared/models/purchase.model';

// HU-05 — "Histórico de compras del proveedor" (plan section 7.4), its own
// screen backed by GET /suppliers/:id/purchases, distinct from HU-13's
// generic /purchases list. Same catalog-table + pagination pattern as
// purchases-list.component.ts. The supplier's name isn't part of the
// paginated response when it's empty, so it's fetched the same way
// supplier-form.component.ts does (no GET /suppliers/:id endpoint exists —
// list + client-side find by id).
@Component({
  selector: 'app-supplier-purchase-history',
  standalone: true,
  imports: [RouterLink, DatePipe, DecimalPipe],
  templateUrl: './supplier-purchase-history.component.html',
  styleUrl: './supplier-purchase-history.component.scss',
})
export class SupplierPurchaseHistoryComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly suppliersService = inject(SuppliersService);

  readonly supplierId = this.route.snapshot.paramMap.get('id') as string;

  supplierName = signal<string | null>(null);
  purchases = signal<Purchase[]>([]);
  total = signal(0);
  page = signal(1);
  readonly pageSize = 20;
  loading = signal(true);

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize)));

  constructor() {
    this.suppliersService.listSuppliers(1, 100).subscribe({
      next: (response) => {
        const supplier = response.items.find((s) => s.id === this.supplierId);
        this.supplierName.set(supplier?.name ?? null);
      },
    });
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.suppliersService.getPurchaseHistory(this.supplierId, this.page(), this.pageSize).subscribe({
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
