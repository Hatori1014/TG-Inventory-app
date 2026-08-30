import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { ErrorLogComponent } from './error-log.component';

describe('ErrorLogComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ErrorLogComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(): ErrorLogComponent {
    const fixture = TestBed.createComponent(ErrorLogComponent);
    httpMock.expectOne((r) => r.url.endsWith('/error-events')).flush({ items: [], total: 45, page: 1, pageSize: 20 });
    return fixture.componentInstance;
  }

  it('computes totalPages from the initial response', () => {
    const component = create();

    expect(component.totalPages()).toBe(3);
  });

  it('previousPage() does nothing on the first page', () => {
    const component = create();

    component.previousPage();

    httpMock.expectNone((r) => r.url.endsWith('/error-events'));
    expect(component.page()).toBe(1);
  });

  it('nextPage() advances and requests the next page', () => {
    const component = create();

    component.nextPage();

    const req = httpMock.expectOne((r) => r.url.endsWith('/error-events'));
    expect(req.request.params.get('page')).toBe('2');
    req.flush({ items: [], total: 45, page: 2, pageSize: 20 });
    expect(component.page()).toBe(2);
  });

  it('applyFilter() resets to page 1 and forwards the module/action filters', () => {
    const component = create();
    component.page.set(3);
    component.moduleFilter = 'roles';
    component.actionFilter = 'delete';

    component.applyFilter();

    const req = httpMock.expectOne((r) => r.url.endsWith('/error-events'));
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('module')).toBe('roles');
    expect(req.request.params.get('action')).toBe('delete');
    req.flush({ items: [], total: 0, page: 1, pageSize: 20 });
    expect(component.page()).toBe(1);
  });

  it('renders the table inside a horizontal-scroll wrapper and marks 5xx errors distinctly', () => {
    const fixture = TestBed.createComponent(ErrorLogComponent);
    httpMock.expectOne((r) => r.url.endsWith('/error-events')).flush({
      items: [
        {
          id: 'err-1',
          userId: 'user-1',
          userLabel: 'Ada Admin <ada@example.com>',
          module: 'roles',
          action: 'delete',
          method: 'DELETE',
          path: '/roles/role-1',
          statusCode: 500,
          message: 'Unhandled exception',
          occurredAt: '2026-08-26T00:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });
    fixture.detectChanges();

    const scrollWrapper = fixture.nativeElement.querySelector('.error-table-scroll table.error-table');
    expect(scrollWrapper).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.error-status-badge--5xx')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Unhandled exception');
  });

  it('links to the sensitive-actions tab', () => {
    const fixture = TestBed.createComponent(ErrorLogComponent);
    httpMock.expectOne((r) => r.url.endsWith('/error-events')).flush({ items: [], total: 0, page: 1, pageSize: 20 });
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a[href="/audit"]');
    expect(link).toBeTruthy();
    expect(link.textContent).toContain('Acciones sensibles');
  });
});
