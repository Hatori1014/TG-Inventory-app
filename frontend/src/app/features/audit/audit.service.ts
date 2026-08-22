import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginatedResponse } from '../../shared/models/paginated-response.model';
import { AuditEvent } from '../../shared/models/audit-event.model';

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly http = inject(HttpClient);

  listEvents(page = 1, pageSize = 20, entity?: string): Observable<PaginatedResponse<AuditEvent>> {
    const params: Record<string, string | number> = { page, pageSize };
    if (entity) params['entity'] = entity;
    return this.http.get<PaginatedResponse<AuditEvent>>(`${environment.apiUrl}/audit-events`, { params });
  }
}
