import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginatedResponse } from '../../shared/models/paginated-response.model';
import { CreateLocationRequest, Location, UpdateLocationRequest } from '../../shared/models/location.model';

@Injectable({ providedIn: 'root' })
export class LocationsService {
  private readonly http = inject(HttpClient);

  list(page = 1, pageSize = 100): Observable<PaginatedResponse<Location>> {
    return this.http.get<PaginatedResponse<Location>>(`${environment.apiUrl}/locations`, {
      params: { page, pageSize },
    });
  }

  create(request: CreateLocationRequest): Observable<Location> {
    return this.http.post<Location>(`${environment.apiUrl}/locations`, request);
  }

  update(id: string, request: UpdateLocationRequest): Observable<Location> {
    return this.http.patch<Location>(`${environment.apiUrl}/locations/${id}`, request);
  }
}
