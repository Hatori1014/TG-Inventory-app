import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthUser, LoginResponse } from '../../shared/models/user.model';
import { decodeJwtPayload, isJwtExpired } from '../utils/jwt.util';

const ACCESS_TOKEN_KEY = 'access_token';

interface JwtClaims {
  sub: string;
  email: string;
  name: string;
  role: string;
  exp?: number;
}

// HU-01 — stateless JWT in localStorage (ADR-24): no /auth/me roundtrip,
// the session is restored by decoding the token the client already has.
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly currentUser = signal<AuthUser | null>(this.restoreSession());

  readonly user = this.currentUser.asReadonly();

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(tap((response) => this.persistSession(response)));
  }

  logout(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    this.currentUser.set(null);
  }

  isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }

  private persistSession(response: LoginResponse): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
    this.currentUser.set(response.user);
  }

  private restoreSession(): AuthUser | null {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) return null;

    const claims = decodeJwtPayload<JwtClaims>(token);
    if (!claims || isJwtExpired(claims)) {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      return null;
    }

    return { id: claims.sub, email: claims.email, name: claims.name, role: claims.role };
  }
}
