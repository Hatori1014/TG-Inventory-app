import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginatedResponse } from '../../shared/models/paginated-response.model';
import { CreateMovementRequest, Movement, StockItem, TransferResult } from '../../shared/models/inventory.model';

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly http = inject(HttpClient);

  // HU-07/TT-18 — POST /inventory/movements is @Idempotent(): a fresh key
  // per submission (per user click), so a network retry of the exact same
  // HTTP request never double-applies it. A manual resubmit by the user is
  // a new logical operation and correctly gets its own key.
  registerMovement(request: CreateMovementRequest): Observable<Movement | TransferResult> {
    return this.http.post<Movement | TransferResult>(`${environment.apiUrl}/inventory/movements`, request, {
      headers: { 'Idempotency-Key': crypto.randomUUID() },
    });
  }

  listStock(page = 1, pageSize = 100): Observable<PaginatedResponse<StockItem>> {
    return this.http.get<PaginatedResponse<StockItem>>(`${environment.apiUrl}/inventory/stock`, {
      params: { page, pageSize },
    });
  }
}
