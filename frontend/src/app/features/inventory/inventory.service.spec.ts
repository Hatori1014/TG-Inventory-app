import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { InventoryService } from './inventory.service';
import { environment } from '../../../environments/environment';
import { Movement } from '../../shared/models/inventory.model';
import { Batch } from '../../shared/models/batch.model';

describe('InventoryService', () => {
  let service: InventoryService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(InventoryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('registerMovement() POSTs to /inventory/movements with an Idempotency-Key header', () => {
    const expected: Movement = {
      id: '1',
      productId: 'p1',
      locationId: 'l1',
      batchId: null,
      type: 'in',
      quantity: 10,
      userId: 'u1',
      occurredAt: '2026-08-16T00:00:00.000Z',
      notes: null,
    };

    service.registerMovement({ productId: 'p1', locationId: 'l1', type: 'in', quantity: 10 }).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/inventory/movements`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ productId: 'p1', locationId: 'l1', type: 'in', quantity: 10 });
    expect(req.request.headers.has('Idempotency-Key')).toBe(true);
    req.flush(expected);
  });

  it('listStock() calls GET /inventory/stock with page/pageSize params', () => {
    service.listStock(1, 100).subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiUrl}/inventory/stock` && r.method === 'GET',
    );
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('100');
    req.flush({ items: [], total: 0, page: 1, pageSize: 100 });
  });

  it('createBatch() POSTs to /inventory/batches with the request body', () => {
    const expected: Batch = { id: 'b1', productId: 'p1', batchNumber: 'LOT-1', expiresAt: null, receivedAt: '2026-08-16' };

    service.createBatch({ productId: 'p1', batchNumber: 'LOT-1' }).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/inventory/batches`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ productId: 'p1', batchNumber: 'LOT-1' });
    req.flush(expected);
  });

  it('listBatches() calls GET /inventory/batches/:productId with page/pageSize params', () => {
    service.listBatches('p1', 1, 100).subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiUrl}/inventory/batches/p1` && r.method === 'GET',
    );
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('100');
    req.flush({ items: [], total: 0, page: 1, pageSize: 100 });
  });
});
