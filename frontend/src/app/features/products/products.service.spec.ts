import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ProductsService } from './products.service';
import { environment } from '../../../environments/environment';
import { Product } from '../../shared/models/product.model';

describe('ProductsService', () => {
  let service: ProductsService;
  let httpMock: HttpTestingController;

  const unit = { id: 'unit-1', name: 'Kilogramo', status: 'active' as const };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProductsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('listProducts() calls GET /products with page/pageSize params', () => {
    service.listProducts(2, 10).subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiUrl}/products` && r.method === 'GET',
    );
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('pageSize')).toBe('10');
    req.flush({ items: [], total: 0, page: 2, pageSize: 10 });
  });

  it('createProduct() POSTs to /products with the request body', () => {
    const expected: Product = {
      id: '1',
      name: 'Arroz',
      description: null,
      unit,
      category: null,
      requiresBatch: false,
      imageUrl: null,
      status: 'active',
    };
    const requestBody = { name: 'Arroz', unitId: 'unit-1' };

    service.createProduct(requestBody).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/products`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(requestBody);
    req.flush(expected);
  });

  it('updateProduct() PATCHes /products/:id with the request body', () => {
    const expected: Product = {
      id: '1',
      name: 'Arroz',
      description: null,
      unit,
      category: null,
      requiresBatch: false,
      imageUrl: null,
      status: 'discontinued',
    };

    service.updateProduct('1', { status: 'discontinued' }).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/products/1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'discontinued' });
    req.flush(expected);
  });
});
