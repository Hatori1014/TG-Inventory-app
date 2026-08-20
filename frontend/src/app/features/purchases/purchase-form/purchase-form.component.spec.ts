import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { PurchaseFormComponent } from './purchase-form.component';

describe('PurchaseFormComponent', () => {
  let httpMock: HttpTestingController;

  afterEach(() => httpMock.verify());

  function create(): PurchaseFormComponent {
    TestBed.configureTestingModule({
      imports: [PurchaseFormComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'purchases', component: PurchaseFormComponent }]),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(PurchaseFormComponent);

    httpMock.expectOne((r) => r.url.endsWith('/suppliers')).flush({
      items: [{ id: 'supplier-1', name: 'Acme Corp' }],
      total: 1,
      page: 1,
      pageSize: 100,
    });
    httpMock.expectOne((r) => r.url.endsWith('/products')).flush({
      items: [
        { id: 'product-1', name: 'Arroz', requiresBatch: false },
        { id: 'product-2', name: 'Paracetamol', requiresBatch: true },
      ],
      total: 2,
      page: 1,
      pageSize: 100,
    });
    httpMock.expectOne((r) => r.url.endsWith('/locations')).flush({
      items: [{ id: 'location-1', name: 'Bodega A' }],
      total: 1,
      page: 1,
      pageSize: 100,
    });

    return fixture.componentInstance;
  }

  it('starts with exactly one item row, invalid until filled in', () => {
    const component = create();

    expect(component.items.length).toBe(1);
    expect(component.form.invalid).toBe(true);
  });

  it('addItem() adds another row, removeItem() removes it, but never the last one', () => {
    const component = create();

    component.addItem();
    expect(component.items.length).toBe(2);

    component.removeItem(1);
    expect(component.items.length).toBe(1);

    component.removeItem(0);
    expect(component.items.length).toBe(1);
  });

  it('itemRequiresBatch() reflects the selected product', () => {
    const component = create();

    component.items.at(0).patchValue({ productId: 'product-1' });
    expect(component.itemRequiresBatch(0)).toBe(false);

    component.items.at(0).patchValue({ productId: 'product-2' });
    expect(component.itemRequiresBatch(0)).toBe(true);
  });

  it('computes the subtotal per item and the total across all items', () => {
    const component = create();
    component.items.at(0).patchValue({ quantity: 4, unitPrice: 2.5 });
    component.addItem();
    component.items.at(1).patchValue({ quantity: 3, unitPrice: 4 });

    expect(component.itemSubtotal(0)).toBe(10);
    expect(component.itemSubtotal(1)).toBe(12);
    expect(component.totalAmount).toBe(22);
  });

  it('posts supplierId and the mapped items, sending an Idempotency-Key header, and navigates on success', () => {
    const component = create();
    component.form.patchValue({ supplierId: 'supplier-1' });
    component.items.at(0).patchValue({
      productId: 'product-1',
      locationId: 'location-1',
      quantity: 10,
      unitPrice: 2.5,
    });

    component.onSubmit();

    const postReq = httpMock.expectOne((r) => r.url.endsWith('/purchases') && r.method === 'POST');
    expect(postReq.request.headers.has('Idempotency-Key')).toBe(true);
    expect(postReq.request.body).toEqual({
      supplierId: 'supplier-1',
      items: [
        {
          productId: 'product-1',
          locationId: 'location-1',
          batchNumber: undefined,
          batchExpiresAt: undefined,
          quantity: 10,
          unitPrice: 2.5,
        },
      ],
    });
    postReq.flush({
      id: 'purchase-1',
      supplierId: 'supplier-1',
      supplierName: 'Acme Corp',
      userId: 'user-1',
      purchasedAt: '2026-08-19T00:00:00.000Z',
      status: 'received',
      items: [],
      totalAmount: 25,
    });
    expect(component.isSubmitting).toBe(false);
  });

  it('maps a 403 to a permission message', () => {
    const component = create();
    component.form.patchValue({ supplierId: 'supplier-1' });
    component.items.at(0).patchValue({ productId: 'product-1', locationId: 'location-1', quantity: 1, unitPrice: 1 });

    component.onSubmit();

    const postReq = httpMock.expectOne((r) => r.url.endsWith('/purchases') && r.method === 'POST');
    postReq.flush({ message: 'forbidden' }, { status: 403, statusText: 'Forbidden' });
    expect(component.errorMessage).toBe('No tenés permiso para registrar compras.');
  });
});
