import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ShellComponent } from './shell.component';
import { AuthService } from '../../services/auth.service';

function fakeJwt(payload: object): string {
  const base64url = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${base64url({ alg: 'HS256' })}.${base64url(payload)}.signature`;
}

function seedSession(role: string): void {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const token = fakeJwt({ sub: '1', email: 'user@test.local', name: 'Test User', role, exp });
  localStorage.setItem('access_token', token);
}

describe('ShellComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
      ],
    });
  });

  afterEach(() => localStorage.clear());

  it('shows every section for an Administrador user', () => {
    seedSession('Administrador');
    const fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();

    const paths = fixture.componentInstance
      .sections()
      .flatMap((section) => section.items.map((item) => item.path));

    expect(paths).toEqual([
      '/dashboard',
      '/products',
      '/categories',
      '/units',
      '/inventory',
      '/inventory/batches',
      '/inventory/stock',
      '/suppliers',
      '/purchases',
      '/document-types',
      '/person-types',
      '/purchases/price-comparison',
      '/locations',
      '/roles',
      '/users',
    ]);
  });

  it('hides Administrador-only sections for another role', () => {
    seedSession('Comprador');
    const fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();

    const paths = fixture.componentInstance
      .sections()
      .flatMap((section) => section.items.map((item) => item.path));

    expect(paths).toEqual(['/dashboard', '/products', '/categories', '/units', '/inventory/stock']);
  });

  it('logs out and redirects to /login', () => {
    seedSession('Administrador');
    const fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigateByUrl');
    const authService = TestBed.inject(AuthService);
    const logoutSpy = spyOn(authService, 'logout').and.callThrough();

    fixture.componentInstance.logout();

    expect(logoutSpy).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith('/login');
  });
});
