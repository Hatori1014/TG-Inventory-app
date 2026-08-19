import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginatedResponse } from '../../shared/models/paginated-response.model';
import {
  CreateDocumentTypeRequest,
  DocumentType,
  UpdateDocumentTypeRequest,
} from '../../shared/models/document-type.model';
import { CreatePersonTypeRequest, PersonType, UpdatePersonTypeRequest } from '../../shared/models/person-type.model';

// DocumentType and PersonType are structurally identical support catalogs
// for Supplier — one service for both, same grouping criterion as the
// backend's single suppliers module (SuppliersController +
// DocumentTypesController + PersonTypesController) and the frontend's own
// CatalogService (Category+Unit for Product).
@Injectable({ providedIn: 'root' })
export class SupplierCatalogService {
  private readonly http = inject(HttpClient);

  listDocumentTypes(page = 1, pageSize = 100): Observable<PaginatedResponse<DocumentType>> {
    return this.http.get<PaginatedResponse<DocumentType>>(`${environment.apiUrl}/document-types`, {
      params: { page, pageSize },
    });
  }

  createDocumentType(request: CreateDocumentTypeRequest): Observable<DocumentType> {
    return this.http.post<DocumentType>(`${environment.apiUrl}/document-types`, request);
  }

  updateDocumentType(id: string, request: UpdateDocumentTypeRequest): Observable<DocumentType> {
    return this.http.patch<DocumentType>(`${environment.apiUrl}/document-types/${id}`, request);
  }

  listPersonTypes(page = 1, pageSize = 100): Observable<PaginatedResponse<PersonType>> {
    return this.http.get<PaginatedResponse<PersonType>>(`${environment.apiUrl}/person-types`, {
      params: { page, pageSize },
    });
  }

  createPersonType(request: CreatePersonTypeRequest): Observable<PersonType> {
    return this.http.post<PersonType>(`${environment.apiUrl}/person-types`, request);
  }

  updatePersonType(id: string, request: UpdatePersonTypeRequest): Observable<PersonType> {
    return this.http.patch<PersonType>(`${environment.apiUrl}/person-types/${id}`, request);
  }
}
