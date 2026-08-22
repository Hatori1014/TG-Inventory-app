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

export type RequestsListScope = 'mine' | 'pending-approval' | 'pending-integration';

// HU-15/17 — "propias" (mine) is always shown; "pending-approval" and
// "pending-integration" (plan section 7.4's "todas" half, HU-17) are shown
// optimistically as tabs — same "let the backend 403 gate it" convention
// as the rest of this frontend (the JWT carries a role name, not a
// permission list, so there's no reliable client-side way to know in
// advance whether the logged-in user actually holds requests:approve /
// requests:integrate). A 403 on a tab just shows the empty/error state.
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
  scope = signal<RequestsListScope>('mine');
  readonly pageSize = 20;
  loading = signal(true);
  loadError = signal(false);

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize)));

  constructor() {
    this.reload();
  }

  statusLabel(status: string): string {
    return STATUS_LABELS[status] ?? status;
  }

  setScope(scope: RequestsListScope): void {
    if (this.scope() === scope) return;
    this.scope.set(scope);
    this.page.set(1);
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.loadError.set(false);
    const list$ =
      this.scope() === 'pending-approval'
        ? this.requestsService.listPendingApproval(this.page(), this.pageSize)
        : this.scope() === 'pending-integration'
          ? this.requestsService.listPendingIntegration(this.page(), this.pageSize)
          : this.requestsService.listRequests(this.page(), this.pageSize);

    list$.subscribe({
      next: (response) => {
        this.requests.set(response.items);
        this.total.set(response.total);
        this.loading.set(false);
      },
      error: () => {
        this.requests.set([]);
        this.total.set(0);
        this.loading.set(false);
        this.loadError.set(true);
      },
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
