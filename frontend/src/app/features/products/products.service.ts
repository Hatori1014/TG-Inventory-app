import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginatedResponse } from '../../shared/models/paginated-response.model';
import { CreateProductRequest, Product, UpdateProductRequest } from '../../shared/models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly http = inject(HttpClient);

  listProducts(page = 1, pageSize = 20): Observable<PaginatedResponse<Product>> {
    return this.http.get<PaginatedResponse<Product>>(`${environment.apiUrl}/products`, {
      params: { page, pageSize },
    });
  }

  createProduct(request: CreateProductRequest): Observable<Product> {
    return this.http.post<Product>(`${environment.apiUrl}/products`, request);
  }

  updateProduct(id: string, request: UpdateProductRequest): Observable<Product> {
    return this.http.patch<Product>(`${environment.apiUrl}/products/${id}`, request);
  }
}
