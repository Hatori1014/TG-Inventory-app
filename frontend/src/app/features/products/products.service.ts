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

  // HU-26 — multipart upload; the auth interceptor still attaches the JWT
  // automatically (it applies to every HttpClient request, not just JSON
  // ones).
  uploadProductImage(id: string, file: File): Observable<Product> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Product>(`${environment.apiUrl}/products/${id}/image`, formData);
  }

  // R2 is private (the user's explicit choice) — the backend proxies the
  // image, and this needs the JWT to fetch it, so a plain <img src> won't
  // work (browsers don't attach custom headers to image requests). The
  // component turns this blob into an object URL instead.
  getProductImage(id: string): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/products/${id}/image`, { responseType: 'blob' });
  }
}
