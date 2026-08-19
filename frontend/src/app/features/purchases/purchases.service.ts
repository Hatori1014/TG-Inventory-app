import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginatedResponse } from '../../shared/models/paginated-response.model';
import { CreatePurchaseRequest, Purchase } from '../../shared/models/purchase.model';
import { ProductPriceComparison, SupplierPriceComparison } from '../../shared/models/price-comparison.model';

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

  // HU-14, view 1 — latest price per supplier for one product, cheapest first.
  getProductPriceComparison(productId: string): Observable<ProductPriceComparison> {
    return this.http.get<ProductPriceComparison>(`${environment.apiUrl}/reports/price-comparison`, {
      params: { productId },
    });
  }

  // HU-14, view 2 — DoR resolved by the user: 2-3 suppliers, monthly
  // average across everything they've sold (not scoped to one product).
  getSupplierPriceComparison(supplierIds: string[]): Observable<SupplierPriceComparison> {
    return this.http.get<SupplierPriceComparison>(`${environment.apiUrl}/reports/supplier-price-comparison`, {
      params: { supplierIds },
    });
  }
}
