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
        { id: 'role-admin', name: 'Administrador', description: 'Acceso total', permissions: [], isDefault: false },
        { id: 'role-consulta', name: 'Consulta', description: null, permissions: [], isDefault: false },
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
      items: [{ id: 'role-admin', name: 'Administrador', description: 'Acceso total', permissions: [], isDefault: false }],
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

  describe('default-role delete protection', () => {
    function createWithRoles(roles: { id: string; name: string; isDefault: boolean }[]) {
      const fixture = TestBed.createComponent(RolesListComponent);
      httpMock.expectOne((r) => r.url.endsWith('/roles')).flush({
        items: roles.map((r) => ({ ...r, description: null, permissions: [] })),
        total: roles.length,
        page: 1,
        pageSize: 100,
      });
      httpMock.expectOne((r) => r.url.endsWith('/users')).flush({ items: [], total: 0, page: 1, pageSize: 100 });
      fixture.detectChanges();
      return fixture;
    }

    it('renders a clickable delete button for a non-default role', () => {
      const fixture = createWithRoles([{ id: 'role-comprador', name: 'Comprador', isDefault: false }]);

      const button = fixture.nativeElement.querySelector('button.roles-delete-link');
      expect(button).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.roles-delete-link--disabled')).toBeFalsy();
    });

    it('renders a disabled, non-clickable delete indicator for the default role', () => {
      const fixture = createWithRoles([{ id: 'role-solicitante', name: 'Solicitante', isDefault: true }]);

      expect(fixture.nativeElement.querySelector('button.roles-delete-link')).toBeFalsy();
      expect(fixture.nativeElement.querySelector('.roles-delete-link--disabled')).toBeTruthy();
    });

    it('clicking delete opens the confirmation dialog with the role name', () => {
      const fixture = createWithRoles([{ id: 'role-comprador', name: 'Comprador', isDefault: false }]);

      fixture.nativeElement.querySelector('button.roles-delete-link').click();
      fixture.detectChanges();

      const dialog = fixture.nativeElement.querySelector('.roles-confirm-dialog');
      expect(dialog).toBeTruthy();
      expect(dialog.textContent).toContain('Comprador');
    });
  });

  describe('executeDelete', () => {
    it('calls DELETE /roles/:id, reloads the list, and records the reassignment result', () => {
      const component = create();
      component.confirmDelete({ id: 'role-consulta', name: 'Consulta', description: null, permissions: [], isDefault: false });

      component.executeDelete();

      const deleteReq = httpMock.expectOne((r) => r.url.endsWith('/roles/role-consulta') && r.method === 'DELETE');
      deleteReq.flush({ reassignedUsers: 2 });

      // reload() fires right after a successful delete
      httpMock.expectOne((r) => r.url.endsWith('/roles')).flush({ items: [], total: 0, page: 1, pageSize: 100 });
      httpMock.expectOne((r) => r.url.endsWith('/users')).flush({ items: [], total: 0, page: 1, pageSize: 100 });

      expect(component.roleToDelete()).toBeNull();
      expect(component.lastDeleteResult).toEqual({ roleName: 'Consulta', reassignedUsers: 2 });
    });

    it('sets a clear error message when the backend refuses (409, default role)', () => {
      const component = create();
      component.confirmDelete({ id: 'role-solicitante', name: 'Solicitante', description: null, permissions: [], isDefault: true });

      component.executeDelete();

      const deleteReq = httpMock.expectOne((r) => r.url.endsWith('/roles/role-solicitante') && r.method === 'DELETE');
      deleteReq.flush({ message: 'Conflict' }, { status: 409, statusText: 'Conflict' });

      expect(component.deleteError).toBe('No se puede eliminar el rol por defecto.');
      expect(component.isDeleting()).toBe(false);
    });

    it('cancelDelete() closes the dialog without calling the API', () => {
      const component = create();
      component.confirmDelete({ id: 'role-consulta', name: 'Consulta', description: null, permissions: [], isDefault: false });

      component.cancelDelete();

      expect(component.roleToDelete()).toBeNull();
      httpMock.expectNone((r) => r.method === 'DELETE');
    });
  });
});
