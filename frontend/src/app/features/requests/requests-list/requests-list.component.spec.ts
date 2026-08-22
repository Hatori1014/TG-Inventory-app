import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { RequestsListComponent } from './requests-list.component';

describe('RequestsListComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RequestsListComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(): RequestsListComponent {
    const fixture = TestBed.createComponent(RequestsListComponent);
    httpMock.expectOne((r) => r.url.endsWith('/requests')).flush({ items: [], total: 45, page: 1, pageSize: 20 });
    return fixture.componentInstance;
  }

  it('computes totalPages from the initial response', () => {
    const component = create();

    expect(component.totalPages()).toBe(3);
  });

  it('maps a known status to its Spanish label', () => {
    const component = create();

    expect(component.statusLabel('pending_inventory_integration')).toBe('Pendiente integrar');
  });

  it('falls back to the raw value for an unknown status', () => {
    const component = create();

    expect(component.statusLabel('made_up_status')).toBe('made_up_status');
  });

  it('previousPage() does nothing on the first page', () => {
    const component = create();

    component.previousPage();

    httpMock.expectNone((r) => r.url.endsWith('/requests'));
    expect(component.page()).toBe(1);
  });

  it('nextPage() advances and requests the next page', () => {
    const component = create();

    component.nextPage();

    const req = httpMock.expectOne((r) => r.url.endsWith('/requests'));
    expect(req.request.params.get('page')).toBe('2');
    req.flush({ items: [], total: 45, page: 2, pageSize: 20 });
    expect(component.page()).toBe(2);
  });

  it('setScope("pending-approval") resets to page 1 and calls the pending-approval endpoint', () => {
    const component = create();
    component.page.set(2);

    component.setScope('pending-approval');

    expect(component.page()).toBe(1);
    const req = httpMock.expectOne((r) => r.url.endsWith('/requests/pending-approval'));
    req.flush({ items: [], total: 3, page: 1, pageSize: 20 });
    expect(component.total()).toBe(3);
  });

  it('setScope("pending-integration") calls the pending-integration endpoint', () => {
    const component = create();

    component.setScope('pending-integration');

    const req = httpMock.expectOne((r) => r.url.endsWith('/requests/pending-integration'));
    req.flush({ items: [], total: 1, page: 1, pageSize: 20 });
    expect(component.total()).toBe(1);
  });

  it('setScope() with the same scope does nothing', () => {
    const component = create();

    component.setScope('mine');

    httpMock.expectNone((r) => r.url.includes('/requests'));
    expect(component.scope()).toBe('mine');
  });

  it('sets loadError when the list request fails (e.g. 403 for a non-approver)', () => {
    const component = create();

    component.setScope('pending-approval');

    const req = httpMock.expectOne((r) => r.url.endsWith('/requests/pending-approval'));
    req.flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });

    expect(component.loadError()).toBe(true);
    expect(component.requests()).toEqual([]);
  });
});
