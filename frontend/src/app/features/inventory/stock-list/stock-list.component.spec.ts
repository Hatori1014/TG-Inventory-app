import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { StockListComponent } from './stock-list.component';
import { PaginatedResponse } from '../../../shared/models/paginated-response.model';
import { StockItem } from '../../../shared/models/inventory.model';

function emptyPage<T>(page: number, pageSize: number, total = 0): PaginatedResponse<T> {
  return { items: [], total, page, pageSize };
}

describe('StockListComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [StockListComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(): StockListComponent {
    const fixture = TestBed.createComponent(StockListComponent);
    // Constructor fires products/locations/stock requests; flush all three
    // so the component reaches a settled state before each test's assertions.
    httpMock.expectOne((req) => req.url.endsWith('/products')).flush({ items: [], total: 0, page: 1, pageSize: 100 });
    httpMock.expectOne((req) => req.url.endsWith('/locations')).flush({ items: [], total: 0, page: 1, pageSize: 100 });
    httpMock.expectOne((req) => req.url.endsWith('/inventory/stock')).flush(emptyPage<StockItem>(1, 20));
    return fixture.componentInstance;
  }

  it('computes totalPages from total/pageSize', () => {
    const component = create();

    component.total.set(45);
    component.pageSize.set(20);

    expect(component.totalPages()).toBe(3);
  });

  it('applyFilters() resets to page 1 and sends the selected filters', () => {
    const component = create();
    component.page.set(3);
    component.filterProductId = 'p1';
    component.filterLocationId = 'l1';

    component.applyFilters();

    const req = httpMock.expectOne(
      (r) => r.url.endsWith('/inventory/stock') && r.params.get('productId') === 'p1' && r.params.get('locationId') === 'l1',
    );
    expect(req.request.params.get('page')).toBe('1');
    req.flush(emptyPage<StockItem>(1, 20));
    expect(component.page()).toBe(1);
  });

  it('clearFilters() drops both filters and reloads from page 1', () => {
    const component = create();
    component.filterProductId = 'p1';
    component.filterLocationId = 'l1';
    component.page.set(2);

    component.clearFilters();

    expect(component.filterProductId).toBe('');
    expect(component.filterLocationId).toBe('');
    const req = httpMock.expectOne((r) => r.url.endsWith('/inventory/stock'));
    expect(req.request.params.has('productId')).toBe(false);
    expect(req.request.params.has('locationId')).toBe(false);
    req.flush(emptyPage<StockItem>(1, 20));
  });

  it('nextPage() does nothing past the last page', () => {
    const component = create();
    component.total.set(10);
    component.pageSize.set(20);
    expect(component.totalPages()).toBe(1);

    component.nextPage();

    httpMock.expectNone((r) => r.url.endsWith('/inventory/stock'));
    expect(component.page()).toBe(1);
  });

  it('previousPage() does nothing on the first page', () => {
    const component = create();

    component.previousPage();

    httpMock.expectNone((r) => r.url.endsWith('/inventory/stock'));
    expect(component.page()).toBe(1);
  });

  it('nextPage() advances and reloads when not on the last page', () => {
    const component = create();
    component.total.set(45);
    component.pageSize.set(20);

    component.nextPage();

    const req = httpMock.expectOne((r) => r.url.endsWith('/inventory/stock'));
    expect(req.request.params.get('page')).toBe('2');
    req.flush(emptyPage<StockItem>(2, 20, 45));
    expect(component.page()).toBe(2);
  });

  it('changePageSize() resets to page 1', () => {
    const component = create();
    component.page.set(3);

    component.changePageSize(50);

    const req = httpMock.expectOne((r) => r.url.endsWith('/inventory/stock'));
    expect(req.request.params.get('pageSize')).toBe('50');
    expect(req.request.params.get('page')).toBe('1');
    req.flush(emptyPage<StockItem>(1, 50));
    expect(component.pageSize()).toBe(50);
  });
});
