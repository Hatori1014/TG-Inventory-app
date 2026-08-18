import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { RolesService } from '../roles.service';
import { UsersService } from '../users.service';
import { Role } from '../../../shared/models/role.model';

// HU-02 — lists roles created so far, with a link to create a new one and
// to manage each role's assigned permissions.
// TT-24 phase 9 (final) — matches the Claude Design mockup's table: adds a
// "Usuarios" count per role. There's no backend field or endpoint for that
// (Role has no users count, only the reverse User.roleId relation), so it's
// computed client-side the same way phase 6 counted products per category:
// fetch users (up to 100, this project's current scale) alongside roles via
// forkJoin and count matches by roleId.
@Component({
  selector: 'app-roles-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './roles-list.component.html',
  styleUrl: './roles-list.component.scss',
})
export class RolesListComponent {
  private rolesService = inject(RolesService);
  private usersService = inject(UsersService);

  roles = signal<Role[]>([]);
  userCounts = signal<Record<string, number>>({});
  loading = signal(true);

  constructor() {
    forkJoin({
      roles: this.rolesService.listRoles(1, 100),
      users: this.usersService.listUsers(1, 100),
    }).subscribe({
      next: ({ roles, users }) => {
        this.roles.set(roles.items);
        const counts: Record<string, number> = {};
        for (const user of users.items) {
          counts[user.role.id] = (counts[user.role.id] ?? 0) + 1;
        }
        this.userCounts.set(counts);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  userCountFor(roleId: string): number {
    return this.userCounts()[roleId] ?? 0;
  }
}
