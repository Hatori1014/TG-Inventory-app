import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuditService } from './audit.service';
import { environment } from '../../../environments/environment';

describe('AuditService', () => {
  let service: AuditService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuditService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('listEvents() calls GET /audit-events with page/pageSize params', () => {
    service.listEvents(1, 20).subscribe();

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/audit-events` && r.method === 'GET');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('20');
    expect(req.request.params.has('entity')).toBe(false);
    req.flush({ items: [], total: 0, page: 1, pageSize: 20 });
  });

  it('listEvents() forwards the entity filter when given', () => {
    service.listEvents(1, 20, 'Role').subscribe();

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/audit-events`);
    expect(req.request.params.get('entity')).toBe('Role');
    req.flush({ items: [], total: 0, page: 1, pageSize: 20 });
  });

  it('listErrorEvents() calls GET /error-events with page/pageSize params', () => {
    service.listErrorEvents(1, 20).subscribe();

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/error-events` && r.method === 'GET');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('20');
    expect(req.request.params.has('module')).toBe(false);
    expect(req.request.params.has('action')).toBe(false);
    req.flush({ items: [], total: 0, page: 1, pageSize: 20 });
  });

  it('listErrorEvents() forwards the module/action filters when given', () => {
    service.listErrorEvents(1, 20, 'roles', 'delete').subscribe();

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/error-events`);
    expect(req.request.params.get('module')).toBe('roles');
    expect(req.request.params.get('action')).toBe('delete');
    req.flush({ items: [], total: 0, page: 1, pageSize: 20 });
  });
});
