import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginatedResponse } from '../../shared/models/paginated-response.model';
import { CreateRequestRequest, PurchaseRequest, UpdateRequestRequest } from '../../shared/models/request.model';

@Injectable({ providedIn: 'root' })
export class RequestsService {
  private readonly http = inject(HttpClient);

  // HU-15/TT-18 — POST /requests is @Idempotent(): a fresh key per
  // submission so a network retry never double-creates the request, same
  // pattern as PurchasesService.createPurchase.
  createRequest(request: CreateRequestRequest): Observable<PurchaseRequest> {
    return this.http.post<PurchaseRequest>(`${environment.apiUrl}/requests`, request, {
      headers: { 'Idempotency-Key': crypto.randomUUID() },
    });
  }

  updateRequest(id: string, request: UpdateRequestRequest): Observable<PurchaseRequest> {
    return this.http.patch<PurchaseRequest>(`${environment.apiUrl}/requests/${id}`, request);
  }

  submitRequest(id: string): Observable<PurchaseRequest> {
    return this.http.patch<PurchaseRequest>(`${environment.apiUrl}/requests/${id}/submit`, {});
  }

  listRequests(page = 1, pageSize = 20): Observable<PaginatedResponse<PurchaseRequest>> {
    return this.http.get<PaginatedResponse<PurchaseRequest>>(`${environment.apiUrl}/requests`, {
      params: { page, pageSize },
    });
  }

  getRequest(id: string): Observable<PurchaseRequest> {
    return this.http.get<PurchaseRequest>(`${environment.apiUrl}/requests/${id}`);
  }
}
