import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { UserFormComponent } from './user-form.component';

describe('UserFormComponent', () => {
  let httpMock: HttpTestingController;

  afterEach(() => httpMock.verify());

  function create(id: string | null): UserFormComponent {
    TestBed.configureTestingModule({
      imports: [UserFormComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'users', component: UserFormComponent }]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(UserFormComponent);
    return fixture.componentInstance;
  }

  describe('create mode', () => {
    function createInCreateMode(): UserFormComponent {
      const component = create(null);
      httpMock
        .expectOne((r) => r.url.endsWith('/roles'))
        .flush({ items: [{ id: 'role-1', name: 'Administrador', description: null, permissions: [] }], total: 1, page: 1, pageSize: 100 });
      return component;
    }

    it('requires a password and marks the form invalid until all fields are filled', () => {
      const component = createInCreateMode();

      expect(component.isEditMode).toBe(false);
      expect(component.form.invalid).toBe(true);

      component.form.setValue({
        name: 'Nuevo usuario',
        email: 'nuevo@tginventory.cl',
        password: 'contrasena123',
        roleId: 'role-1',
        status: 'active',
      });

      expect(component.form.valid).toBe(true);
    });

    it('posts the form value and navigates to /users on success', () => {
      const component = createInCreateMode();
      component.form.setValue({
        name: 'Nuevo usuario',
        email: 'nuevo@tginventory.cl',
        password: 'contrasena123',
        roleId: 'role-1',
        status: 'active',
      });

      component.onSubmit();

      const postReq = httpMock.expectOne((r) => r.url.endsWith('/users') && r.method === 'POST');
      expect(postReq.request.body).toEqual({
        name: 'Nuevo usuario',
        email: 'nuevo@tginventory.cl',
        password: 'contrasena123',
        roleId: 'role-1',
      });
      postReq.flush({ id: 'user-new', name: 'Nuevo usuario', email: 'nuevo@tginventory.cl', role: { id: 'role-1', name: 'Administrador' }, status: 'active' });
      expect(component.isSubmitting).toBe(false);
    });

    it('pre-selects the default role for a new user, still overridable', () => {
      const component = create(null);
      httpMock.expectOne((r) => r.url.endsWith('/roles')).flush({
        items: [
          { id: 'role-1', name: 'Administrador', description: null, permissions: [], isDefault: false },
          { id: 'role-2', name: 'Solicitante', description: null, permissions: [], isDefault: true },
        ],
        total: 2,
        page: 1,
        pageSize: 100,
      });

      expect(component.form.value.roleId).toBe('role-2');

      component.form.patchValue({ roleId: 'role-1' });
      expect(component.form.value.roleId).toBe('role-1');
    });

    it('maps a 409 conflict to a duplicate-email message', () => {
      const component = createInCreateMode();
      component.form.setValue({
        name: 'Nuevo usuario',
        email: 'repetido@tginventory.cl',
        password: 'contrasena123',
        roleId: 'role-1',
        status: 'active',
      });

      component.onSubmit();

      const postReq = httpMock.expectOne((r) => r.url.endsWith('/users') && r.method === 'POST');
      postReq.flush({ message: 'conflict' }, { status: 409, statusText: 'Conflict' });
      expect(component.errorMessage).toBe('Ya existe un usuario con ese correo.');
    });
  });

  describe('edit mode', () => {
    function createInEditMode(): UserFormComponent {
      const component = create('user-1');
      httpMock.expectOne((r) => r.url.endsWith('/roles')).flush({
        items: [{ id: 'role-1', name: 'Administrador', description: null, permissions: [] }],
        total: 1,
        page: 1,
        pageSize: 100,
      });
      httpMock.expectOne((r) => r.url.endsWith('/users')).flush({
        items: [{ id: 'user-1', name: 'María Cabrera', email: 'mcabrera@tginventory.cl', role: { id: 'role-1', name: 'Administrador' }, status: 'active' }],
        total: 1,
        page: 1,
        pageSize: 100,
      });
      return component;
    }

    it('does not require a password and preloads the target user found in the list', () => {
      const component = createInEditMode();

      expect(component.isEditMode).toBe(true);
      expect(component.form.value).toEqual({
        name: 'María Cabrera',
        email: 'mcabrera@tginventory.cl',
        password: '',
        roleId: 'role-1',
        status: 'active',
      });
      expect(component.form.valid).toBe(true);
    });

    it('sends name/email/roleId/status without a password on update', () => {
      const component = createInEditMode();
      component.form.patchValue({ status: 'blocked' });

      component.onSubmit();

      const patchReq = httpMock.expectOne((r) => r.url.endsWith('/users/user-1') && r.method === 'PATCH');
      expect(patchReq.request.body).toEqual({
        name: 'María Cabrera',
        email: 'mcabrera@tginventory.cl',
        roleId: 'role-1',
        status: 'blocked',
      });
    });
  });
});
