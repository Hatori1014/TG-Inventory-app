import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
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

  // Default-role feature — the role pending confirmation, or null when the
  // popup is closed. Kept as the whole Role (not just an id) so the popup
  // can show its name/user count without a second lookup.
  roleToDelete = signal<Role | null>(null);
  isDeleting = signal(false);
  deleteError: string | null = null;
  lastDeleteResult: { roleName: string; reassignedUsers: number } | null = null;

  constructor() {
    this.reload();
  }

  private reload(): void {
    this.loading.set(true);
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

  confirmDelete(role: Role): void {
    this.deleteError = null;
    this.lastDeleteResult = null;
    this.roleToDelete.set(role);
  }

  cancelDelete(): void {
    this.roleToDelete.set(null);
  }

  executeDelete(): void {
    const role = this.roleToDelete();
    if (!role) return;

    this.isDeleting.set(true);
    this.deleteError = null;
    this.rolesService.deleteRole(role.id).subscribe({
      next: (result) => {
        this.isDeleting.set(false);
        this.roleToDelete.set(null);
        this.lastDeleteResult = { roleName: role.name, reassignedUsers: result.reassignedUsers };
        this.reload();
      },
      error: (error: HttpErrorResponse) => {
        this.isDeleting.set(false);
        this.deleteError =
          error.status === 409
            ? 'No se puede eliminar el rol por defecto.'
            : error.status === 403
              ? 'No tenés permiso para esta acción.'
              : 'No se pudo eliminar el rol. Intentá de nuevo.';
      },
    });
  }
}
