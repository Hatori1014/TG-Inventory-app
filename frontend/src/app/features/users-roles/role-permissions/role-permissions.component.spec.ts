import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { RolePermissionsComponent } from './role-permissions.component';

describe('RolePermissionsComponent', () => {
  let httpMock: HttpTestingController;

  function create(): RolePermissionsComponent {
    TestBed.configureTestingModule({
      imports: [RolePermissionsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'roles', component: RolePermissionsComponent }]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'role-admin' }) } },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(RolePermissionsComponent);

    httpMock.expectOne((r) => r.url.endsWith('/roles')).flush({
      items: [
        {
          id: 'role-admin',
          name: 'Administrador',
          description: 'Acceso total',
          permissions: [{ id: 'perm-roles-read', module: 'roles', action: 'read' }],
        },
      ],
      total: 1,
      page: 1,
      pageSize: 100,
    });
    httpMock.expectOne((r) => r.url.endsWith('/permissions')).flush({
      items: [
        { id: 'perm-roles-read', module: 'roles', action: 'read' },
        { id: 'perm-roles-create', module: 'roles', action: 'create' },
        { id: 'perm-products-create', module: 'products', action: 'create' },
        { id: 'perm-products-update', module: 'products', action: 'update' },
      ],
      total: 4,
      page: 1,
      pageSize: 100,
    });

    return fixture.componentInstance;
  }

  afterEach(() => httpMock.verify());

  it('derives the action columns from the distinct actions present in the catalog, in canonical order', () => {
    const component = create();

    expect(component.actions()).toEqual(['read', 'create', 'update']);
  });

  it('builds a module row with a null cell where the catalog has no matching permission', () => {
    const component = create();

    const productsRow = component.rows().find((r) => r.module === 'products');
    expect(productsRow?.cells).toEqual([
      { action: 'read', permission: null },
      { action: 'create', permission: { id: 'perm-products-create', module: 'products', action: 'create' } },
      { action: 'update', permission: { id: 'perm-products-update', module: 'products', action: 'update' } },
    ]);
  });

  it('preloads the roles current permission selection', () => {
    const component = create();

    expect(component.isSelected('perm-roles-read')).toBe(true);
    expect(component.isSelected('perm-roles-create')).toBe(false);
  });

  it('toggle() flips a permission id in and out of the selection', () => {
    const component = create();

    component.toggle('perm-roles-create');
    expect(component.isSelected('perm-roles-create')).toBe(true);

    component.toggle('perm-roles-create');
    expect(component.isSelected('perm-roles-create')).toBe(false);
  });

  it('onSubmit() replaces the permission set with the current selection', () => {
    const component = create();
    component.toggle('perm-products-create');

    component.onSubmit();

    const patchReq = httpMock.expectOne((r) => r.url.endsWith('/roles/role-admin') && r.method === 'PATCH');
    expect(patchReq.request.body).toEqual({ permissionIds: ['perm-roles-read', 'perm-products-create'] });
    patchReq.flush({ id: 'role-admin', name: 'Administrador', description: 'Acceso total', permissions: [] });
    expect(component.isSubmitting).toBe(false);
  });
});
