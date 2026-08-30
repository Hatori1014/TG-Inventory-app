import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuditService } from '../audit.service';
import { ErrorEvent } from '../../../shared/models/error-event.model';

// HU-31 — at the user's explicit request: 4xx and 5xx alike, recorded by
// GlobalExceptionFilter, filterable by module/action (the same vocabulary
// @RequirePermission() uses). module/action are free-text filters, not a
// fixed dropdown like audit-log's entity filter — the vocabulary here is
// open-ended (any module in the app), not a short fixed list.
@Component({
  selector: 'app-error-log',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink, RouterLinkActive],
  templateUrl: './error-log.component.html',
  styleUrl: './error-log.component.scss',
})
export class ErrorLogComponent {
  private auditService = inject(AuditService);

  events = signal<ErrorEvent[]>([]);
  total = signal(0);
  page = signal(1);
  readonly pageSize = 20;
  loading = signal(true);
  moduleFilter = '';
  actionFilter = '';

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize)));

  constructor() {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.auditService
      .listErrorEvents(this.page(), this.pageSize, this.moduleFilter || undefined, this.actionFilter || undefined)
      .subscribe({
        next: (response) => {
          this.events.set(response.items);
          this.total.set(response.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  applyFilter(): void {
    this.page.set(1);
    this.reload();
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
