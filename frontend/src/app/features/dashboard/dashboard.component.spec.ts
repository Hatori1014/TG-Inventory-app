import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { DashboardComponent } from './dashboard.component';

function fakeJwt(payload: object): string {
  // UTF-8-encode before base64 (decodeJwtPayload decodes assuming UTF-8
  // bytes) — otherwise any non-ASCII claim (e.g. an accented Spanish name)
  // decodes to garbage and AuthService silently treats the session as absent.
  const base64url = (obj: object) => {
    const utf8Bytes = encodeURIComponent(JSON.stringify(obj)).replace(
      /%([0-9A-F]{2})/g,
      (_, hex: string) => String.fromCharCode(parseInt(hex, 16)),
    );
    return btoa(utf8Bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  return `${base64url({ alg: 'HS256' })}.${base64url(payload)}.signature`;
}

function seedSession(name: string, role: string): void {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const token = fakeJwt({ sub: '1', email: 'user@test.local', name, role, exp });
  localStorage.setItem('access_token', token);
}

describe('DashboardComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
  });

  afterEach(() => localStorage.clear());

  it('greets the user by their first name', () => {
    seedSession('María Cabrera', 'Administrador');
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.firstName()).toBe('María');
  });

  it('shows every non-dashboard access for an Administrador user', () => {
    seedSession('María Cabrera', 'Administrador');
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    const paths = fixture.componentInstance.accesos().map((item) => item.path);
    expect(paths).toEqual([
      '/products',
      '/categories',
      '/units',
      '/inventory',
      '/inventory/batches',
      '/inventory/stock',
      '/suppliers',
      '/document-types',
      '/person-types',
      '/locations',
      '/roles',
      '/users',
    ]);
  });

  it('hides Administrador-only accesses for another role', () => {
    seedSession('Juanita Ríos', 'Consulta');
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    const paths = fixture.componentInstance.accesos().map((item) => item.path);
    expect(paths).toEqual(['/products', '/categories', '/units', '/inventory/stock']);
  });
});
