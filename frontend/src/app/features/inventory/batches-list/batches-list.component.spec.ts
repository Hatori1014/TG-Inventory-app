import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { BatchesListComponent } from './batches-list.component';

describe('BatchesListComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [BatchesListComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(): BatchesListComponent {
    const fixture = TestBed.createComponent(BatchesListComponent);
    httpMock
      .expectOne((r) => r.url.endsWith('/products'))
      .flush({
        items: [
          { id: 'p1', name: 'Guantes', requiresBatch: true },
          { id: 'p2', name: 'Resma', requiresBatch: false },
        ],
        total: 2,
        page: 1,
        pageSize: 100,
      });
    return fixture.componentInstance;
  }

  it('only offers products that require a batch', () => {
    const component = create();

    expect(component.products().map((p) => p.id)).toEqual(['p1']);
  });

  it('onProductChange() sums stock per batch from GET /inventory/stock', () => {
    const component = create();
    component.selectedProductId = 'p1';

    component.onProductChange();

    httpMock
      .expectOne((r) => r.url.endsWith('/inventory/batches/p1'))
      .flush({
        items: [
          { id: 'b1', productId: 'p1', batchNumber: 'L-1', expiresAt: null, receivedAt: '2026-01-01' },
          { id: 'b2', productId: 'p1', batchNumber: 'L-2', expiresAt: null, receivedAt: '2026-01-01' },
        ],
        total: 2,
        page: 1,
        pageSize: 100,
      });
    httpMock
      .expectOne((r) => r.url.endsWith('/inventory/stock'))
      .flush({
        items: [
          { id: 's1', product: { id: 'p1', name: 'Guantes' }, location: { id: 'l1', name: 'A' }, batchId: 'b1', quantity: 10 },
          { id: 's2', product: { id: 'p1', name: 'Guantes' }, location: { id: 'l2', name: 'B' }, batchId: 'b1', quantity: 5 },
          { id: 's3', product: { id: 'p1', name: 'Guantes' }, location: { id: 'l1', name: 'A' }, batchId: 'b2', quantity: 3 },
        ],
        total: 3,
        page: 1,
        pageSize: 100,
      });

    expect(component.stockFor('b1')).toBe(15);
    expect(component.stockFor('b2')).toBe(3);
    expect(component.stockFor('b3')).toBe(0);
  });

  it('addBatch() sends receivedAt when the user backdates it', () => {
    const component = create();
    component.selectedProductId = 'p1';
    component.newBatchNumber = 'L-9';
    component.newReceivedAt = '2026-01-15';

    component.addBatch();

    const req = httpMock.expectOne((r) => r.url.endsWith('/inventory/batches'));
    expect(req.request.body.receivedAt).toBe('2026-01-15');
    req.flush({ id: 'b9', productId: 'p1', batchNumber: 'L-9', expiresAt: null, receivedAt: '2026-01-15' });

    httpMock.expectOne((r) => r.url.endsWith('/inventory/batches/p1')).flush({ items: [], total: 0, page: 1, pageSize: 100 });
    httpMock.expectOne((r) => r.url.endsWith('/inventory/stock')).flush({ items: [], total: 0, page: 1, pageSize: 100 });
  });
});
