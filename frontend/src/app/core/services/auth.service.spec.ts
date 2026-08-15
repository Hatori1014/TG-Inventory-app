import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { LoginResponse } from '../../shared/models/user.model';

function fakeJwt(payload: object): string {
  const base64url = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${base64url({ alg: 'HS256' })}.${base64url(payload)}.signature`;
}

describe('AuthService', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('starts unauthenticated when there is no stored token', () => {
    const service = TestBed.inject(AuthService);
    expect(service.isAuthenticated()).toBe(false);
    expect(service.user()).toBeNull();
  });

  it('restores the session from a valid, unexpired stored token', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const token = fakeJwt({
      sub: '1',
      email: 'admin@tg-group.local',
      name: 'Admin',
      role: 'Administrador',
      exp: futureExp,
    });
    localStorage.setItem('access_token', token);

    const service = TestBed.inject(AuthService);

    expect(service.isAuthenticated()).toBe(true);
    expect(service.user()).toEqual({
      id: '1',
      email: 'admin@tg-group.local',
      name: 'Admin',
      role: 'Administrador',
    });
  });

  it('discards an expired stored token', () => {
    const pastExp = Math.floor(Date.now() / 1000) - 3600;
    const token = fakeJwt({
      sub: '1',
      email: 'admin@tg-group.local',
      name: 'Admin',
      role: 'Administrador',
      exp: pastExp,
    });
    localStorage.setItem('access_token', token);

    const service = TestBed.inject(AuthService);

    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('access_token')).toBeNull();
  });

  it('login() persists the token and the user on success', () => {
    const service = TestBed.inject(AuthService);
    const response: LoginResponse = {
      accessToken: 'signed.jwt.token',
      user: { id: '1', name: 'Admin', email: 'admin@tg-group.local', role: 'Administrador' },
    };

    service.login('admin@tg-group.local', 'secret').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'admin@tg-group.local', password: 'secret' });
    req.flush(response);

    expect(localStorage.getItem('access_token')).toBe('signed.jwt.token');
    expect(service.user()).toEqual(response.user);
    expect(service.isAuthenticated()).toBe(true);
  });

  it('logout() clears the token and the user', () => {
    localStorage.setItem('access_token', 'signed.jwt.token');
    const service = TestBed.inject(AuthService);

    service.logout();

    expect(localStorage.getItem('access_token')).toBeNull();
    expect(service.user()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });
});
