import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { RolesService } from '../roles.service';
import { Permission } from '../../../shared/models/permission.model';

// HU-02 — checklist to replace a role's full permission set (PATCH
// /roles/:id). There is no GET /roles/:id (not in plan section 7.4's
// endpoint table), so the current role is found from the already-paginated
// roles list — acceptable at this scale (small admin catalog, same
// criterion already used elsewhere for simple CRUD screens).
@Component({
  selector: 'app-role-permissions',
  standalone: true,
  templateUrl: './role-permissions.component.html',
})
export class RolePermissionsComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private rolesService = inject(RolesService);

  roleId = this.route.snapshot.paramMap.get('id') as string;
  roleName = signal('');
  permissions = signal<Permission[]>([]);
  selectedIds = signal<Set<string>>(new Set());
  loading = signal(true);
  errorMessage: string | null = null;
  isSubmitting = false;

  constructor() {
    forkJoin({
      roles: this.rolesService.listRoles(1, 100),
      permissions: this.rolesService.listPermissions(),
    }).subscribe({
      next: ({ roles, permissions }) => {
        const role = roles.items.find((r) => r.id === this.roleId);
        this.roleName.set(role?.name ?? '');
        this.selectedIds.set(new Set(role?.permissions.map((p) => p.id) ?? []));
        this.permissions.set(permissions.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  isSelected(permissionId: string): boolean {
    return this.selectedIds().has(permissionId);
  }

  toggle(permissionId: string): void {
    const next = new Set(this.selectedIds());
    if (next.has(permissionId)) {
      next.delete(permissionId);
    } else {
      next.add(permissionId);
    }
    this.selectedIds.set(next);
  }

  onSubmit(): void {
    this.errorMessage = null;
    this.isSubmitting = true;

    this.rolesService
      .updatePermissions(this.roleId, { permissionIds: [...this.selectedIds()] })
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.router.navigateByUrl('/roles');
        },
        error: () => {
          this.isSubmitting = false;
          this.errorMessage = 'No se pudieron guardar los permisos. Intentá de nuevo.';
        },
      });
  }
}
