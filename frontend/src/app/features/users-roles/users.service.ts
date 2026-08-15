import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginatedResponse } from '../../shared/models/paginated-response.model';
import {
  CreateUserAccountRequest,
  UpdateUserAccountRequest,
  UserAccount,
} from '../../shared/models/user-account.model';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);

  listUsers(page = 1, pageSize = 20): Observable<PaginatedResponse<UserAccount>> {
    return this.http.get<PaginatedResponse<UserAccount>>(`${environment.apiUrl}/users`, {
      params: { page, pageSize },
    });
  }

  createUser(request: CreateUserAccountRequest): Observable<UserAccount> {
    return this.http.post<UserAccount>(`${environment.apiUrl}/users`, request);
  }

  updateUser(id: string, request: UpdateUserAccountRequest): Observable<UserAccount> {
    return this.http.patch<UserAccount>(`${environment.apiUrl}/users/${id}`, request);
  }
}
