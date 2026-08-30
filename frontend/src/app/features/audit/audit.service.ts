import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginatedResponse } from '../../shared/models/paginated-response.model';
import { AuditEvent } from '../../shared/models/audit-event.model';
import { ErrorEvent } from '../../shared/models/error-event.model';

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly http = inject(HttpClient);

  listEvents(page = 1, pageSize = 20, entity?: string): Observable<PaginatedResponse<AuditEvent>> {
    const params: Record<string, string | number> = { page, pageSize };
    if (entity) params['entity'] = entity;
    return this.http.get<PaginatedResponse<AuditEvent>>(`${environment.apiUrl}/audit-events`, { params });
  }

  // HU-31
  listErrorEvents(
    page = 1,
    pageSize = 20,
    module?: string,
    action?: string,
  ): Observable<PaginatedResponse<ErrorEvent>> {
    const params: Record<string, string | number> = { page, pageSize };
    if (module) params['module'] = module;
    if (action) params['action'] = action;
    return this.http.get<PaginatedResponse<ErrorEvent>>(`${environment.apiUrl}/error-events`, { params });
  }
}
