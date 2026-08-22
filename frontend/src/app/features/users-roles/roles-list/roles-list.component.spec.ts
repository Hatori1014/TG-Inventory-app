import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { RolesListComponent } from './roles-list.component';

describe('RolesListComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RolesListComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(): RolesListComponent {
    const fixture = TestBed.createComponent(RolesListComponent);
    httpMock.expectOne((r) => r.url.endsWith('/roles')).flush({
      items: [
        { id: 'role-admin', name: 'Administrador', description: 'Acceso total', permissions: [] },
        { id: 'role-consulta', name: 'Consulta', description: null, permissions: [] },
      ],
      total: 2,
      page: 1,
      pageSize: 100,
    });
    httpMock.expectOne((r) => r.url.endsWith('/users')).flush({
      items: [
        { id: 'u-1', name: 'María Cabrera', email: 'mc@tginventory.cl', role: { id: 'role-admin', name: 'Administrador' }, status: 'active' },
        { id: 'u-2', name: 'Juanita Ríos', email: 'jr@tginventory.cl', role: { id: 'role-consulta', name: 'Consulta' }, status: 'active' },
        { id: 'u-3', name: 'Jorge Pérez', email: 'jp@tginventory.cl', role: { id: 'role-consulta', name: 'Consulta' }, status: 'active' },
      ],
      total: 3,
      page: 1,
      pageSize: 100,
    });
    return fixture.componentInstance;
  }

  it('counts users per role from the fetched user list', () => {
    const component = create();

    expect(component.userCountFor('role-admin')).toBe(1);
    expect(component.userCountFor('role-consulta')).toBe(2);
  });

  it('defaults to zero for a role with no users', () => {
    const component = create();

    expect(component.userCountFor('role-unused')).toBe(0);
  });

  // Real mobile bug: the edit action used to be a text link ("Editar
  // permisos") inside a table with no horizontal-scroll handling, so on a
  // narrow viewport it was pushed off-screen with nothing to scroll it
  // into view — the link was in the DOM but unreachable. Now it's an
  // icon-only link (fits without needing the scroll fallback in the first
  // place) with an aria-label so it stays accessible.
  it('renders an accessible edit-permissions link for each role', () => {
    const fixture = TestBed.createComponent(RolesListComponent);
    httpMock.expectOne((r) => r.url.endsWith('/roles')).flush({
      items: [{ id: 'role-admin', name: 'Administrador', description: 'Acceso total', permissions: [] }],
      total: 1,
      page: 1,
      pageSize: 100,
    });
    httpMock.expectOne((r) => r.url.endsWith('/users')).flush({ items: [], total: 0, page: 1, pageSize: 100 });
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a.roles-edit-link');
    expect(link).toBeTruthy();
    expect(link.getAttribute('aria-label')).toBe('Editar permisos');
    expect(link.getAttribute('href')).toContain('role-admin/permissions');
    expect(link.querySelector('i.ph-pencil-simple')).toBeTruthy();
  });
});
