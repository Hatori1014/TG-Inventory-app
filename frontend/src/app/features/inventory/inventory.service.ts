import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginatedResponse } from '../../shared/models/paginated-response.model';
import { CreateMovementRequest, Movement, StockItem, TransferResult } from '../../shared/models/inventory.model';
import { Batch, CreateBatchRequest } from '../../shared/models/batch.model';

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

  // HU-10 — "filtrable por producto/ubicación" (plan section 7.4).
  listStock(
    page = 1,
    pageSize = 100,
    productId?: string,
    locationId?: string,
  ): Observable<PaginatedResponse<StockItem>> {
    const params: Record<string, string | number> = { page, pageSize };
    if (productId) params['productId'] = productId;
    if (locationId) params['locationId'] = locationId;
    return this.http.get<PaginatedResponse<StockItem>>(`${environment.apiUrl}/inventory/stock`, { params });
  }

  // HU-09 — /inventory/batches is not @Idempotent() (only movements are,
  // per convenciones.md's "escritura crítica" list — creating a batch
  // doesn't move stock by itself).
  createBatch(request: CreateBatchRequest): Observable<Batch> {
    return this.http.post<Batch>(`${environment.apiUrl}/inventory/batches`, request);
  }

  listBatches(productId: string, page = 1, pageSize = 100): Observable<PaginatedResponse<Batch>> {
    return this.http.get<PaginatedResponse<Batch>>(`${environment.apiUrl}/inventory/batches/${productId}`, {
      params: { page, pageSize },
    });
  }
}
