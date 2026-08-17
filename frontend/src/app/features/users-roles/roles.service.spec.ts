import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { RolesService } from './roles.service';
import { environment } from '../../../environments/environment';
import { Role } from '../../shared/models/role.model';

describe('RolesService', () => {
  let service: RolesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RolesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('listRoles() calls GET /roles with page/pageSize params', () => {
    service.listRoles(2, 10).subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiUrl}/roles` && r.method === 'GET',
    );
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('pageSize')).toBe('10');
    req.flush({ items: [], total: 0, page: 2, pageSize: 10 });
  });

  it('listPermissions() calls GET /permissions', () => {
    service.listPermissions().subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiUrl}/permissions` && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ items: [], total: 0, page: 1, pageSize: 100 });
  });

  it('createRole() POSTs to /roles with the request body', () => {
    const expected: Role = { id: '1', name: 'Comprador', description: null, permissions: [] };

    service.createRole({ name: 'Comprador' }).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/roles`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Comprador' });
    req.flush(expected);
  });

  it('updatePermissions() PATCHes /roles/:id with permissionIds', () => {
    const expected: Role = { id: '1', name: 'Comprador', description: null, permissions: [] };

    service.updatePermissions('1', { permissionIds: ['p1', 'p2'] }).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/roles/1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ permissionIds: ['p1', 'p2'] });
    req.flush(expected);
  });
});
