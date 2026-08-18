import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { RolesService } from '../roles.service';
import { Permission } from '../../../shared/models/permission.model';

interface PermissionRow {
  module: string;
  cells: Array<{ action: string; permission: Permission | null }>;
}

// HU-02 — checklist to replace a role's full permission set (PATCH
// /roles/:id). There is no GET /roles/:id (not in plan section 7.4's
// endpoint table), so the current role is found from the already-paginated
// roles list — acceptable at this scale (small admin catalog, same
// criterion already used elsewhere for simple CRUD screens).
// TT-24 phase 9 (final) — replaces the old flat "module:action" checkbox
// list with the mockup's module x action matrix. Columns come from the
// distinct actions actually present in GET /permissions (today just
// read/create/update, no delete anywhere), not a hardcoded list, so the
// screen keeps working if the catalog grows. A module/action pair with no
// matching Permission in the catalog renders as a dash instead of a
// checkbox — e.g. products/categories/units have no "read" permission
// because their GET is open to any authenticated user (ADR-23 predates
// this, the seed just never added a read row for them).
@Component({
  selector: 'app-role-permissions',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './role-permissions.component.html',
  styleUrl: './role-permissions.component.scss',
})
export class RolePermissionsComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private rolesService = inject(RolesService);

  private static readonly ACTION_ORDER = ['read', 'create', 'update', 'delete'];

  roleId = this.route.snapshot.paramMap.get('id') as string;
  roleName = signal('');
  permissions = signal<Permission[]>([]);
  selectedIds = signal<Set<string>>(new Set());
  loading = signal(true);
  errorMessage: string | null = null;
  isSubmitting = false;

  readonly actions = computed<string[]>(() => {
    const present = new Set(this.permissions().map((p) => p.action));
    const ordered = RolePermissionsComponent.ACTION_ORDER.filter((a) => present.has(a));
    const extra = [...present].filter((a) => !ordered.includes(a)).sort();
    return [...ordered, ...extra];
  });

  readonly rows = computed<PermissionRow[]>(() => {
    const byModule = new Map<string, Map<string, Permission>>();
    for (const permission of this.permissions()) {
      const actionsForModule = byModule.get(permission.module) ?? new Map<string, Permission>();
      actionsForModule.set(permission.action, permission);
      byModule.set(permission.module, actionsForModule);
    }

    const actions = this.actions();
    return [...byModule.entries()].map(([module, actionsForModule]) => ({
      module,
      cells: actions.map((action) => ({ action, permission: actionsForModule.get(action) ?? null })),
    }));
  });

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
