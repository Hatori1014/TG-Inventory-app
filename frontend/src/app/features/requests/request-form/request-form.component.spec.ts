import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { RequestFormComponent } from './request-form.component';

describe('RequestFormComponent', () => {
  let httpMock: HttpTestingController;

  afterEach(() => httpMock.verify());

  function create(id: string | null): RequestFormComponent {
    TestBed.configureTestingModule({
      imports: [RequestFormComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'requests', component: RequestFormComponent }]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(RequestFormComponent);

    httpMock.expectOne((r) => r.url.endsWith('/suppliers')).flush({
      items: [{ id: 'supplier-1', name: 'Acme Corp' }],
      total: 1,
      page: 1,
      pageSize: 100,
    });
    httpMock.expectOne((r) => r.url.endsWith('/products')).flush({
      items: [{ id: 'product-1', name: 'Arroz' }],
      total: 1,
      page: 1,
      pageSize: 100,
    });
    httpMock.expectOne((r) => r.url.endsWith('/locations')).flush({
      items: [{ id: 'location-1', name: 'Bodega A' }],
      total: 1,
      page: 1,
      pageSize: 100,
    });

    if (id) {
      httpMock.expectOne((r) => r.url.endsWith(`/requests/${id}`)).flush({
        id,
        type: 'purchase',
        status: 'draft',
        requesterId: 'user-1',
        requesterName: 'Ana',
        supplierId: 'supplier-1',
        supplierName: 'Acme Corp',
        createdAt: '2026-08-20T00:00:00.000Z',
        resolvedAt: null,
        notes: null,
        items: [{ id: 'item-1', productId: 'product-1', productName: 'Arroz', locationId: 'location-1', locationName: 'Bodega A', quantity: 5, estimatedPrice: null }],
      });
    }

    return fixture.componentInstance;
  }

  describe('create mode', () => {
    it('starts with exactly one empty item row', () => {
      const component = create(null);

      expect(component.isEditMode).toBe(false);
      expect(component.items.length).toBe(1);
    });

    it('canSubmit() is false without a supplier', () => {
      const component = create(null);
      component.items.at(0).patchValue({ productId: 'product-1', locationId: 'location-1', quantity: 5 });

      expect(component.canSubmit()).toBe(false);
    });

    it('canSubmit() is true with a supplier and a fully filled item', () => {
      const component = create(null);
      component.form.patchValue({ supplierId: 'supplier-1' });
      component.items.at(0).patchValue({ productId: 'product-1', locationId: 'location-1', quantity: 5 });

      expect(component.canSubmit()).toBe(true);
    });

    it('saveDraft() posts with saveAsDraft true and filters out empty item rows', () => {
      const component = create(null);

      component.saveDraft();

      const postReq = httpMock.expectOne((r) => r.url.endsWith('/requests') && r.method === 'POST');
      expect(postReq.request.headers.has('Idempotency-Key')).toBe(true);
      expect(postReq.request.body).toEqual({
        type: 'purchase',
        saveAsDraft: true,
        supplierId: undefined,
        notes: undefined,
        items: [],
      });
      postReq.flush({ id: 'request-1', status: 'draft' });
      expect(component.isSubmitting).toBe(false);
    });

    it('submitRequest() shows an error and makes no request when canSubmit() is false', () => {
      const component = create(null);

      component.submitRequest();

      httpMock.expectNone((r) => r.url.endsWith('/requests') && r.method === 'POST');
      expect(component.errorMessage).toContain('proveedor');
    });

    it('submitRequest() posts without saveAsDraft when valid', () => {
      const component = create(null);
      component.form.patchValue({ supplierId: 'supplier-1' });
      component.items.at(0).patchValue({ productId: 'product-1', locationId: 'location-1', quantity: 5 });

      component.submitRequest();

      const postReq = httpMock.expectOne((r) => r.url.endsWith('/requests') && r.method === 'POST');
      expect(postReq.request.body.saveAsDraft).toBeUndefined();
      expect(postReq.request.body.supplierId).toBe('supplier-1');
      postReq.flush({ id: 'request-1', status: 'pending' });
    });
  });

  describe('edit mode', () => {
    it('loads the existing draft and patches the form', () => {
      const component = create('request-1');

      expect(component.isEditMode).toBe(true);
      expect(component.form.value.supplierId).toBe('supplier-1');
      expect(component.items.length).toBe(1);
      expect(component.items.at(0).value.quantity).toBe(5);
    });

    it('saveDraft() PATCHes the existing request', () => {
      const component = create('request-1');

      component.saveDraft();

      const patchReq = httpMock.expectOne((r) => r.url.endsWith('/requests/request-1') && r.method === 'PATCH');
      patchReq.flush({ id: 'request-1', status: 'draft' });
      expect(component.isSubmitting).toBe(false);
    });

    it('submitRequest() PATCHes the request then calls submit', () => {
      const component = create('request-1');

      component.submitRequest();

      const patchReq = httpMock.expectOne((r) => r.url.endsWith('/requests/request-1') && r.method === 'PATCH');
      patchReq.flush({ id: 'request-1', status: 'draft' });

      const submitReq = httpMock.expectOne((r) => r.url.endsWith('/requests/request-1/submit') && r.method === 'PATCH');
      submitReq.flush({ id: 'request-1', status: 'pending' });
      expect(component.isSubmitting).toBe(false);
    });
  });
});
