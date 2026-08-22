import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginatedResponse } from '../../shared/models/paginated-response.model';
import { Permission } from '../../shared/models/permission.model';
import { CreateRoleRequest, Role, UpdateRolePermissionsRequest } from '../../shared/models/role.model';

// Feature-scoped (not core/services/) — specific to this feature, same
// criterion already used for AuthService (cross-cutting) vs this (isn't).
@Injectable({ providedIn: 'root' })
export class RolesService {
  private readonly http = inject(HttpClient);

  listRoles(page = 1, pageSize = 20): Observable<PaginatedResponse<Role>> {
    return this.http.get<PaginatedResponse<Role>>(`${environment.apiUrl}/roles`, {
      params: { page, pageSize },
    });
  }

  listPermissions(page = 1, pageSize = 100): Observable<PaginatedResponse<Permission>> {
    return this.http.get<PaginatedResponse<Permission>>(`${environment.apiUrl}/permissions`, {
      params: { page, pageSize },
    });
  }

  createRole(request: CreateRoleRequest): Observable<Role> {
    return this.http.post<Role>(`${environment.apiUrl}/roles`, request);
  }

  updatePermissions(roleId: string, request: UpdateRolePermissionsRequest): Observable<Role> {
    return this.http.patch<Role>(`${environment.apiUrl}/roles/${roleId}`, request);
  }

  // Default-role feature — logical delete (ADR-22): the backend reassigns
  // every user on this role to the default role first, then soft-deletes
  // it; reassignedUsers is how many were moved, shown in the confirmation
  // flow's result.
  deleteRole(roleId: string): Observable<{ reassignedUsers: number }> {
    return this.http.delete<{ reassignedUsers: number }>(`${environment.apiUrl}/roles/${roleId}`);
  }
}
