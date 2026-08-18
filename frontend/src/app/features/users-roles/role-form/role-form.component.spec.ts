import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { RoleFormComponent } from './role-form.component';

describe('RoleFormComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RoleFormComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'roles', component: RoleFormComponent }]),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(): RoleFormComponent {
    const fixture = TestBed.createComponent(RoleFormComponent);
    return fixture.componentInstance;
  }

  it('is invalid until a name is provided', () => {
    const component = create();

    expect(component.form.invalid).toBe(true);

    component.form.patchValue({ name: 'Admin Inventario' });

    expect(component.form.valid).toBe(true);
  });

  it('posts the name and optional description, omitting a blank description', () => {
    const component = create();
    component.form.setValue({ name: 'Admin Inventario', description: '' });

    component.onSubmit();

    const postReq = httpMock.expectOne((r) => r.url.endsWith('/roles') && r.method === 'POST');
    expect(postReq.request.body).toEqual({ name: 'Admin Inventario', description: undefined });
    postReq.flush({ id: 'role-new', name: 'Admin Inventario', description: null, permissions: [] });
    expect(component.isSubmitting).toBe(false);
  });

  it('maps a 409 conflict to a duplicate-name message', () => {
    const component = create();
    component.form.setValue({ name: 'Administrador', description: '' });

    component.onSubmit();

    const postReq = httpMock.expectOne((r) => r.url.endsWith('/roles') && r.method === 'POST');
    postReq.flush({ message: 'conflict' }, { status: 409, statusText: 'Conflict' });
    expect(component.errorMessage).toBe('Ya existe un rol con ese nombre.');
  });
});
