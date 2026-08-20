import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ProductPriceComparisonComponent } from './product-price-comparison.component';

describe('ProductPriceComparisonComponent', () => {
  let httpMock: HttpTestingController;

  afterEach(() => httpMock.verify());

  function create(): { component: ProductPriceComparisonComponent; fixture: ReturnType<typeof TestBed.createComponent<ProductPriceComparisonComponent>> } {
    TestBed.configureTestingModule({
      imports: [ProductPriceComparisonComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ProductPriceComparisonComponent);
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url.endsWith('/products')).flush({
      items: [{ id: 'product-1', name: 'Arroz' }],
      total: 1,
      page: 1,
      pageSize: 100,
    });

    return { component: fixture.componentInstance, fixture };
  }

  it('loads the product list on init', () => {
    const { component } = create();

    expect(component.products().length).toBe(1);
    expect(component.products()[0].name).toBe('Arroz');
  });

  it('does nothing when no product is selected', () => {
    const { component } = create();

    component.onProductChange();

    httpMock.expectNone((r) => r.url.includes('/reports/price-comparison'));
    expect(component.comparison()).toBeNull();
  });

  it('fetches and stores the comparison for the selected product', () => {
    const { component, fixture } = create();
    component.selectedProductId.set('product-1');

    component.onProductChange();

    const req = httpMock.expectOne((r) => r.url.endsWith('/reports/price-comparison'));
    expect(req.request.params.get('productId')).toBe('product-1');
    req.flush({
      productId: 'product-1',
      productName: 'Arroz',
      suppliers: [{ supplierId: 's1', supplierName: 'Acme', latestUnitPrice: 10, latestPurchasedAt: '2026-08-01T00:00:00.000Z' }],
    });
    fixture.detectChanges();

    expect(component.comparison()?.suppliers.length).toBe(1);
    expect(component.loading()).toBe(false);
  });

  it('sets an error message when the request fails', () => {
    const { component } = create();
    component.selectedProductId.set('product-1');

    component.onProductChange();

    httpMock.expectOne((r) => r.url.endsWith('/reports/price-comparison')).flush('error', { status: 500, statusText: 'Server Error' });

    expect(component.errorMessage()).toBe('No se pudo cargar la comparativa.');
  });

  it('switching to chart mode does not throw once data is loaded', () => {
    const { component, fixture } = create();
    component.selectedProductId.set('product-1');
    component.onProductChange();
    httpMock.expectOne((r) => r.url.endsWith('/reports/price-comparison')).flush({
      productId: 'product-1',
      productName: 'Arroz',
      suppliers: [{ supplierId: 's1', supplierName: 'Acme', latestUnitPrice: 10, latestPurchasedAt: '2026-08-01T00:00:00.000Z' }],
    });
    fixture.detectChanges();

    expect(() => {
      component.viewMode.set('chart');
      fixture.detectChanges();
    }).not.toThrow();
  });
});
