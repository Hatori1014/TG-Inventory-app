import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { CatalogService } from './catalog.service';
import { environment } from '../../../environments/environment';
import { Category } from '../../shared/models/category.model';
import { Unit } from '../../shared/models/unit.model';

describe('CatalogService', () => {
  let service: CatalogService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CatalogService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('listCategories() calls GET /categories with page/pageSize params', () => {
    service.listCategories(1, 100).subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiUrl}/categories` && r.method === 'GET',
    );
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('100');
    req.flush({ items: [], total: 0, page: 1, pageSize: 100 });
  });

  it('createCategory() POSTs to /categories with the request body', () => {
    const expected: Category = { id: '1', name: 'Alimentos', status: 'active' };

    service.createCategory({ name: 'Alimentos' }).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/categories`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Alimentos' });
    req.flush(expected);
  });

  it('updateCategory() PATCHes /categories/:id with the request body', () => {
    const expected: Category = { id: '1', name: 'Alimentos', status: 'inactive' };

    service.updateCategory('1', { status: 'inactive' }).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/categories/1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'inactive' });
    req.flush(expected);
  });

  it('listUnits() calls GET /units with page/pageSize params', () => {
    service.listUnits(1, 100).subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiUrl}/units` && r.method === 'GET',
    );
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('100');
    req.flush({ items: [], total: 0, page: 1, pageSize: 100 });
  });

  it('createUnit() POSTs to /units with the request body', () => {
    const expected: Unit = { id: '1', name: 'Kilogramo', status: 'active' };

    service.createUnit({ name: 'Kilogramo' }).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/units`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Kilogramo' });
    req.flush(expected);
  });

  it('updateUnit() PATCHes /units/:id with the request body', () => {
    const expected: Unit = { id: '1', name: 'Kilogramo', status: 'inactive' };

    service.updateUnit('1', { status: 'inactive' }).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/units/1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'inactive' });
    req.flush(expected);
  });
});
