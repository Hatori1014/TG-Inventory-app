import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { LocationsService } from './locations.service';
import { environment } from '../../../environments/environment';
import { Location } from '../../shared/models/location.model';

describe('LocationsService', () => {
  let service: LocationsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LocationsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('list() calls GET /locations with page/pageSize params', () => {
    service.list(1, 100).subscribe();

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/locations` && r.method === 'GET');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('100');
    req.flush({ items: [], total: 0, page: 1, pageSize: 100 });
  });

  it('create() POSTs to /locations with the request body', () => {
    const expected: Location = { id: '1', name: 'Sede Central', parentId: null, status: 'active' };

    service.create({ name: 'Sede Central' }).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/locations`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Sede Central' });
    req.flush(expected);
  });

  it('update() PATCHes /locations/:id with the request body', () => {
    const expected: Location = { id: '1', name: 'Sede Central', parentId: null, status: 'inactive' };

    service.update('1', { status: 'inactive' }).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/locations/1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'inactive' });
    req.flush(expected);
  });
});
