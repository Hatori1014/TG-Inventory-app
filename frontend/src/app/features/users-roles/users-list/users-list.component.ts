import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UsersService } from '../users.service';
import { UserAccount } from '../../../shared/models/user-account.model';

// TT-24 phase 8 — matches the Claude Design mockup's table style (avatar
// initials, role/status badges) plus real pagination, same gap phase 5
// closed for Products: GET /users already supported page/pageSize, the
// screen just never exposed a page size beyond the default 20. Kept the
// existing separate routes (list/new/:id/edit) instead of collapsing to
// the mockup's single-panel create/edit pills — same call phase 5 made
// for Products, for the same reason: it's the smaller change over an
// already-working flow, and the form is complex enough (password,
// role, status) to earn its own page. The mockup's "Filtrar por nombre o
// correo" search box isn't replicated: PaginationQueryDto has no name/
// email filter, so a box that only filtered the loaded page would be
// misleading, same reasoning as Products' search box in phase 5.
@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.scss',
})
export class UsersListComponent {
  private usersService = inject(UsersService);

  users = signal<UserAccount[]>([]);
  total = signal(0);
  page = signal(1);
  readonly pageSize = 20;
  loading = signal(true);

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize)));

  constructor() {
    this.reload();
  }

  initials(name: string): string {
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
    return (first + last).toUpperCase();
  }

  reload(): void {
    this.loading.set(true);
    this.usersService.listUsers(this.page(), this.pageSize).subscribe({
      next: (response) => {
        this.users.set(response.items);
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
