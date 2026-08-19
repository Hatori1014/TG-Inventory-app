import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { SupplierFormComponent } from './supplier-form.component';

describe('SupplierFormComponent', () => {
  let httpMock: HttpTestingController;

  afterEach(() => httpMock.verify());

  function create(id: string | null): SupplierFormComponent {
    TestBed.configureTestingModule({
      imports: [SupplierFormComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'suppliers', component: SupplierFormComponent }]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(SupplierFormComponent);
    return fixture.componentInstance;
  }

  describe('create mode', () => {
    it('only requires a name — no HTTP request until submit', () => {
      const component = create(null);

      expect(component.isEditMode).toBe(false);
      expect(component.form.invalid).toBe(true);

      component.form.patchValue({ name: 'Acme Corp' });

      expect(component.form.valid).toBe(true);
    });

    it('posts only the filled-in fields and navigates to /suppliers on success', () => {
      const component = create(null);
      component.form.patchValue({ name: 'Acme Corp', taxId: 'NIT-123' });

      component.onSubmit();

      const postReq = httpMock.expectOne((r) => r.url.endsWith('/suppliers') && r.method === 'POST');
      expect(postReq.request.body).toEqual({
        name: 'Acme Corp',
        taxId: 'NIT-123',
        contact: undefined,
        phone: undefined,
        email: undefined,
      });
      postReq.flush({
        id: 'sup-new',
        name: 'Acme Corp',
        taxId: 'NIT-123',
        contact: null,
        phone: null,
        email: null,
        status: 'active',
      });
      expect(component.isSubmitting).toBe(false);
    });

    it('maps a 409 conflict to a duplicate-tax-ID message', () => {
      const component = create(null);
      component.form.patchValue({ name: 'Acme Corp', taxId: 'NIT-123' });

      component.onSubmit();

      const postReq = httpMock.expectOne((r) => r.url.endsWith('/suppliers') && r.method === 'POST');
      postReq.flush({ message: 'conflict' }, { status: 409, statusText: 'Conflict' });
      expect(component.errorMessage).toBe('Ya existe un proveedor activo con ese NIT.');
    });

    it('rejects an invalid email', () => {
      const component = create(null);
      component.form.patchValue({ name: 'Acme Corp', email: 'not-an-email' });

      expect(component.form.invalid).toBe(true);
      expect(component.form.controls.email.errors).toEqual({ email: true });
    });
  });

  describe('edit mode', () => {
    function createInEditMode(): SupplierFormComponent {
      const component = create('sup-1');
      httpMock.expectOne((r) => r.url.endsWith('/suppliers')).flush({
        items: [
          {
            id: 'sup-1',
            name: 'Beta SA',
            taxId: 'NIT-999',
            contact: 'Jane Doe',
            phone: '555-0100',
            email: 'jane@beta.test',
            status: 'active',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 100,
      });
      return component;
    }

    it('preloads the target supplier found in the list', () => {
      const component = createInEditMode();

      expect(component.isEditMode).toBe(true);
      expect(component.form.value).toEqual({
        name: 'Beta SA',
        taxId: 'NIT-999',
        contact: 'Jane Doe',
        phone: '555-0100',
        email: 'jane@beta.test',
        status: 'active',
      });
    });

    it('sends the full field set including status on update', () => {
      const component = createInEditMode();
      component.form.patchValue({ status: 'inactive' });

      component.onSubmit();

      const patchReq = httpMock.expectOne((r) => r.url.endsWith('/suppliers/sup-1') && r.method === 'PATCH');
      expect(patchReq.request.body).toEqual({
        name: 'Beta SA',
        taxId: 'NIT-999',
        contact: 'Jane Doe',
        phone: '555-0100',
        email: 'jane@beta.test',
        status: 'inactive',
      });
    });
  });
});
