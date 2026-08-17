import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginatedResponse } from '../../shared/models/paginated-response.model';
import { Category, CreateCategoryRequest, UpdateCategoryRequest } from '../../shared/models/category.model';
import { CreateUnitRequest, Unit, UpdateUnitRequest } from '../../shared/models/unit.model';

// Category and Unit are structurally identical support catalogs for
// Product — one service for both, same grouping criterion as the backend's
// single products module (ProductsController + CategoriesController +
// UnitsController).
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);

  listCategories(page = 1, pageSize = 100): Observable<PaginatedResponse<Category>> {
    return this.http.get<PaginatedResponse<Category>>(`${environment.apiUrl}/categories`, {
      params: { page, pageSize },
    });
  }

  createCategory(request: CreateCategoryRequest): Observable<Category> {
    return this.http.post<Category>(`${environment.apiUrl}/categories`, request);
  }

  updateCategory(id: string, request: UpdateCategoryRequest): Observable<Category> {
    return this.http.patch<Category>(`${environment.apiUrl}/categories/${id}`, request);
  }

  listUnits(page = 1, pageSize = 100): Observable<PaginatedResponse<Unit>> {
    return this.http.get<PaginatedResponse<Unit>>(`${environment.apiUrl}/units`, {
      params: { page, pageSize },
    });
  }

  createUnit(request: CreateUnitRequest): Observable<Unit> {
    return this.http.post<Unit>(`${environment.apiUrl}/units`, request);
  }

  updateUnit(id: string, request: UpdateUnitRequest): Observable<Unit> {
    return this.http.patch<Unit>(`${environment.apiUrl}/units/${id}`, request);
  }
}
