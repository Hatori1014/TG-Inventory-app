import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { MinimumStockListComponent } from './minimum-stock-list.component';

describe('MinimumStockListComponent', () => {
  let httpMock: HttpTestingController;

  afterEach(() => httpMock.verify());

  function create(): MinimumStockListComponent {
    TestBed.configureTestingModule({
      imports: [MinimumStockListComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(MinimumStockListComponent);

    httpMock.expectOne((r) => r.url.endsWith('/inventory/minimum-stock')).flush({
      items: [{ id: 'min-1', productId: 'p1', productName: 'Arroz', minimumQuantity: 10 }],
      total: 1,
      page: 1,
      pageSize: 100,
    });
    httpMock.expectOne((r) => r.url.endsWith('/products')).flush({
      items: [
        { id: 'p1', name: 'Arroz' },
        { id: 'p2', name: 'Paracetamol' },
      ],
      total: 2,
      page: 1,
      pageSize: 100,
    });

    return fixture.componentInstance;
  }

  it('loads existing minimums and products', () => {
    const component = create();

    expect(component.minimums().length).toBe(1);
    expect(component.products().length).toBe(2);
  });

  it('excludes products that already have a minimum from the add-row select', () => {
    const component = create();

    const available = component.productsWithoutMinimum();

    expect(available.map((p) => p.id)).toEqual(['p2']);
  });

  it('addMinimum() does nothing without a selected product', () => {
    const component = create();
    component.newQuantity = 5;

    component.addMinimum();

    httpMock.expectNone((r) => r.url.endsWith('/inventory/minimum-stock') && r.method === 'POST');
  });

  it('addMinimum() posts the new threshold and reloads', () => {
    const component = create();
    component.newProductId = 'p2';
    component.newQuantity = 20;

    component.addMinimum();

    const postReq = httpMock.expectOne((r) => r.url.endsWith('/inventory/minimum-stock') && r.method === 'POST');
    expect(postReq.request.body).toEqual({ productId: 'p2', minimumQuantity: 20 });
    postReq.flush({ id: 'min-2', productId: 'p2', productName: 'Paracetamol', minimumQuantity: 20 });

    httpMock.expectOne((r) => r.url.endsWith('/inventory/minimum-stock') && r.method === 'GET').flush({
      items: [],
      total: 0,
      page: 1,
      pageSize: 100,
    });
    httpMock.expectOne((r) => r.url.endsWith('/products')).flush({ items: [], total: 0, page: 1, pageSize: 100 });

    expect(component.newProductId).toBe('');
    expect(component.newQuantity).toBeNull();
  });

  it('startEdit() then cancelEdit() clears the editing state without a request', () => {
    const component = create();

    component.startEdit(component.minimums()[0]);
    expect(component.editingId).toBe('min-1');

    component.cancelEdit();

    expect(component.editingId).toBeNull();
    httpMock.expectNone((r) => r.method === 'PATCH');
  });

  it('confirmEdit() does nothing when the value did not change', () => {
    const component = create();
    component.startEdit(component.minimums()[0]);

    component.confirmEdit(component.minimums()[0]);

    httpMock.expectNone((r) => r.method === 'PATCH');
    expect(component.editingId).toBeNull();
  });

  it('confirmEdit() patches the threshold and reloads', () => {
    const component = create();
    component.startEdit(component.minimums()[0]);
    component.editingQuantity = 35;

    component.confirmEdit(component.minimums()[0]);

    const patchReq = httpMock.expectOne((r) => r.url.endsWith('/inventory/minimum-stock/min-1'));
    expect(patchReq.request.body).toEqual({ minimumQuantity: 35 });
    patchReq.flush({ id: 'min-1', productId: 'p1', productName: 'Arroz', minimumQuantity: 35 });

    httpMock.expectOne((r) => r.url.endsWith('/inventory/minimum-stock') && r.method === 'GET').flush({
      items: [],
      total: 0,
      page: 1,
      pageSize: 100,
    });
    httpMock.expectOne((r) => r.url.endsWith('/products')).flush({ items: [], total: 0, page: 1, pageSize: 100 });
  });
});
