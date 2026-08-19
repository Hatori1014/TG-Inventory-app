import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginatedResponse } from '../../shared/models/paginated-response.model';
import { CreateSupplierRequest, Supplier, UpdateSupplierRequest } from '../../shared/models/supplier.model';

@Injectable({ providedIn: 'root' })
export class SuppliersService {
  private readonly http = inject(HttpClient);

  listSuppliers(page = 1, pageSize = 20): Observable<PaginatedResponse<Supplier>> {
    return this.http.get<PaginatedResponse<Supplier>>(`${environment.apiUrl}/suppliers`, {
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
