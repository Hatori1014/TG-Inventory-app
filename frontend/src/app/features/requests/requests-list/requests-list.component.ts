import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RequestsService } from '../requests.service';
import { PurchaseRequest } from '../../../shared/models/request.model';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  pending: 'Pendiente',
  in_review: 'En proceso',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  pending_inventory_integration: 'Pendiente integrar',
  closed: 'Cerrada',
};

// HU-15 — "propias" only (plan section 7.4's "todas" half is HU-17's,
// for an approver). draft rows link to the edit form so the requester can
// finish and submit them; everything else is read-only from here.
@Component({
  selector: 'app-requests-list',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './requests-list.component.html',
  styleUrl: './requests-list.component.scss',
})
export class RequestsListComponent {
  private requestsService = inject(RequestsService);

  requests = signal<PurchaseRequest[]>([]);
  total = signal(0);
  page = signal(1);
  readonly pageSize = 20;
  loading = signal(true);

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize)));

  constructor() {
    this.reload();
  }

  statusLabel(status: string): string {
    return STATUS_LABELS[status] ?? status;
  }

  reload(): void {
    this.loading.set(true);
    this.requestsService.listRequests(this.page(), this.pageSize).subscribe({
      next: (response) => {
        this.requests.set(response.items);
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
