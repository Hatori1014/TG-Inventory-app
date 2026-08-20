import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { ConsumptionRequestFormComponent } from './consumption-request-form.component';

describe('ConsumptionRequestFormComponent', () => {
  let httpMock: HttpTestingController;

  afterEach(() => httpMock.verify());

  function create(): ConsumptionRequestFormComponent {
    TestBed.configureTestingModule({
      imports: [ConsumptionRequestFormComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'requests', component: ConsumptionRequestFormComponent }]),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ConsumptionRequestFormComponent);

    httpMock.expectOne((r) => r.url.endsWith('/products')).flush({
      items: [{ id: 'product-1', name: 'Arroz' }],
      total: 1,
      page: 1,
      pageSize: 100,
    });
    httpMock.expectOne((r) => r.url.endsWith('/locations')).flush({
      items: [
        { id: 'location-1', name: 'Bodega A' },
        { id: 'location-2', name: 'Bodega B' },
      ],
      total: 2,
      page: 1,
      pageSize: 100,
    });
    httpMock.expectOne((r) => r.url.endsWith('/inventory/stock')).flush({
      items: [{ id: 's1', product: { id: 'product-1', name: 'Arroz' }, location: { id: 'location-1', name: 'Bodega A' }, batchId: null, quantity: 10 }],
      total: 1,
      page: 1,
      pageSize: 100,
    });

    return fixture.componentInstance;
  }

  it('starts with exactly one item row', () => {
    const component = create();

    expect(component.items.length).toBe(1);
  });

  it('reports available quantity from the fetched stock, aggregated per product+location', () => {
    const component = create();

    expect(component.availableQuantity('product-1', 'location-1')).toBe(10);
    expect(component.availableQuantity('product-1', 'location-2')).toBe(0);
  });

  it('locationHasStock() is false for a location with no stock of the selected product', () => {
    const component = create();
    component.items.at(0).patchValue({ productId: 'product-1' });

    expect(component.locationHasStock(0, 'location-1')).toBe(true);
    expect(component.locationHasStock(0, 'location-2')).toBe(false);
  });

  it('exceedsAvailableStock() flags a quantity above what is available', () => {
    const component = create();
    component.items.at(0).patchValue({ productId: 'product-1', locationId: 'location-1', quantity: 15 });

    expect(component.exceedsAvailableStock(0)).toBe(true);
  });

  it('exceedsAvailableStock() allows requesting exactly the available quantity', () => {
    const component = create();
    component.items.at(0).patchValue({ productId: 'product-1', locationId: 'location-1', quantity: 10 });

    expect(component.exceedsAvailableStock(0)).toBe(false);
  });

  it('onSubmit() does nothing when an item exceeds available stock', () => {
    const component = create();
    component.items.at(0).patchValue({ productId: 'product-1', locationId: 'location-1', quantity: 15 });

    component.onSubmit();

    httpMock.expectNone((r) => r.url.endsWith('/requests') && r.method === 'POST');
  });

  it('posts a consumption request and navigates on success', () => {
    const component = create();
    component.items.at(0).patchValue({ productId: 'product-1', locationId: 'location-1', quantity: 5 });

    component.onSubmit();

    const postReq = httpMock.expectOne((r) => r.url.endsWith('/requests') && r.method === 'POST');
    expect(postReq.request.body).toEqual({
      type: 'consumption',
      notes: undefined,
      items: [{ productId: 'product-1', locationId: 'location-1', quantity: 5 }],
    });
    postReq.flush({ id: 'request-1', status: 'pending' });
    expect(component.isSubmitting).toBe(false);
  });

  it('maps a 403 to a permission message', () => {
    const component = create();
    component.items.at(0).patchValue({ productId: 'product-1', locationId: 'location-1', quantity: 5 });

    component.onSubmit();

    const postReq = httpMock.expectOne((r) => r.url.endsWith('/requests') && r.method === 'POST');
    postReq.flush({ message: 'forbidden' }, { status: 403, statusText: 'Forbidden' });
    expect(component.errorMessage).toBe('No tenés permiso para crear solicitudes.');
  });
});
