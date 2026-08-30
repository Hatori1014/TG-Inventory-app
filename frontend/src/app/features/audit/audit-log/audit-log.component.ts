import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuditService } from '../audit.service';
import { AuditEvent } from '../../../shared/models/audit-event.model';

// HU-23 — the only entities anything audits today (login on User,
// create/delete/permissions.update on Role, approve/reject/integrate on
// Request); grow this list alongside RecordAuditEventUseCase's callers,
// not ahead of them.
const ENTITY_OPTIONS = ['User', 'Role', 'Request'];

// Read-only panel (convenciones.md: "pantalla de solo lectura simple" —
// no TDD/BDD needed here, the write side already has it). Same
// catalog/table/pagination pattern as suppliers-list, with the table
// wrapped in an overflow-x container from the start (the roles-list mobile
// bug, fixed 2026-08-22, was exactly a table without this).
@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink, RouterLinkActive],
  templateUrl: './audit-log.component.html',
  styleUrl: './audit-log.component.scss',
})
export class AuditLogComponent {
  private auditService = inject(AuditService);

  events = signal<AuditEvent[]>([]);
  total = signal(0);
  page = signal(1);
  readonly pageSize = 20;
  loading = signal(true);
  entityFilter = '';
  readonly entityOptions = ENTITY_OPTIONS;

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize)));

  constructor() {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.auditService.listEvents(this.page(), this.pageSize, this.entityFilter || undefined).subscribe({
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
