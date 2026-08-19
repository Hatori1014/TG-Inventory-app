import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginatedResponse } from '../../shared/models/paginated-response.model';
import { CreateSupplierRequest, Supplier, UpdateSupplierRequest } from '../../shared/models/supplier.model';
import { Purchase } from '../../shared/models/purchase.model';

@Injectable({ providedIn: 'root' })
export class SuppliersService {
  private readonly http = inject(HttpClient);

  listSuppliers(page = 1, pageSize = 20): Observable<PaginatedResponse<Supplier>> {
    return this.http.get<PaginatedResponse<Supplier>>(`${environment.apiUrl}/suppliers`, {
      params: { page, pageSize },
    });
  }

  // HU-05 — dedicated endpoint (plan section 7.4), distinct from HU-13's
  // GET /purchases?supplierId=. See SupplierPurchaseHistoryController.
  getPurchaseHistory(supplierId: string, page = 1, pageSize = 20): Observable<PaginatedResponse<Purchase>> {
    return this.http.get<PaginatedResponse<Purchase>>(`${environment.apiUrl}/suppliers/${supplierId}/purchases`, {
      params: { page, pageSize },
    });
  }

  createSupplier(request: CreateSupplierRequest): Observable<Supplier> {
    return this.http.post<Supplier>(`${environment.apiUrl}/suppliers`, request);
  }

  updateSupplier(id: string, request: UpdateSupplierRequest): Observable<Supplier> {
    return this.http.patch<Supplier>(`${environment.apiUrl}/suppliers/${id}`, request);
  }
}
