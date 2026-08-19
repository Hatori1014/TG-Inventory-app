import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginatedResponse } from '../../shared/models/paginated-response.model';
import { CreatePurchaseRequest, Purchase } from '../../shared/models/purchase.model';

@Injectable({ providedIn: 'root' })
export class PurchasesService {
  private readonly http = inject(HttpClient);

  listPurchases(page = 1, pageSize = 20, supplierId?: string): Observable<PaginatedResponse<Purchase>> {
    const params: Record<string, string | number> = { page, pageSize };
    if (supplierId) params['supplierId'] = supplierId;
    return this.http.get<PaginatedResponse<Purchase>>(`${environment.apiUrl}/purchases`, { params });
  }

  getPurchase(id: string): Observable<Purchase> {
    return this.http.get<Purchase>(`${environment.apiUrl}/purchases/${id}`);
  }

  // HU-13/TT-18 — POST /purchases is @Idempotent(): a fresh key per
  // submission so a network retry never double-registers the purchase or
  // its inventory movements, same pattern as InventoryService.registerMovement.
  createPurchase(request: CreatePurchaseRequest): Observable<Purchase> {
    return this.http.post<Purchase>(`${environment.apiUrl}/purchases`, request, {
      headers: { 'Idempotency-Key': crypto.randomUUID() },
    });
  }
}
