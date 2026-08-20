import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { SupplierPurchaseHistoryComponent } from './supplier-purchase-history.component';

describe('SupplierPurchaseHistoryComponent', () => {
  let httpMock: HttpTestingController;

  afterEach(() => httpMock.verify());

  function create(): SupplierPurchaseHistoryComponent {
    TestBed.configureTestingModule({
      imports: [SupplierPurchaseHistoryComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'supplier-1' }) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(SupplierPurchaseHistoryComponent);

    httpMock
      .expectOne((r) => r.url.endsWith('/suppliers'))
      .flush({ items: [{ id: 'supplier-1', name: 'Acme Corp', status: 'active' }], total: 1, page: 1, pageSize: 100 });
    httpMock
      .expectOne((r) => r.url.endsWith('/suppliers/supplier-1/purchases'))
      .flush({ items: [], total: 45, page: 1, pageSize: 20 });

    return fixture.componentInstance;
  }

  it('resolves the supplier id from the route and loads its name', () => {
    const component = create();

    expect(component.supplierId).toBe('supplier-1');
    expect(component.supplierName()).toBe('Acme Corp');
  });

  it('computes totalPages from the initial response', () => {
    const component = create();

    expect(component.totalPages()).toBe(3);
  });

  it('previousPage() does nothing on the first page', () => {
    const component = create();

    component.previousPage();

    httpMock.expectNone((r) => r.url.endsWith('/suppliers/supplier-1/purchases'));
    expect(component.page()).toBe(1);
  });

  it('nextPage() advances and requests the next page', () => {
    const component = create();

    component.nextPage();

    const req = httpMock.expectOne((r) => r.url.endsWith('/suppliers/supplier-1/purchases'));
    expect(req.request.params.get('page')).toBe('2');
    req.flush({ items: [], total: 45, page: 2, pageSize: 20 });
    expect(component.page()).toBe(2);
  });

  it('nextPage() does nothing past the last page', () => {
    const component = create();
    component.page.set(3);

    component.nextPage();

    httpMock.expectNone((r) => r.url.endsWith('/suppliers/supplier-1/purchases'));
    expect(component.page()).toBe(3);
  });
});
