import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuditLogComponent } from './audit-log.component';

describe('AuditLogComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AuditLogComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(): AuditLogComponent {
    const fixture = TestBed.createComponent(AuditLogComponent);
    httpMock.expectOne((r) => r.url.endsWith('/audit-events')).flush({ items: [], total: 45, page: 1, pageSize: 20 });
    return fixture.componentInstance;
  }

  it('computes totalPages from the initial response', () => {
    const component = create();

    expect(component.totalPages()).toBe(3);
  });

  it('previousPage() does nothing on the first page', () => {
    const component = create();

    component.previousPage();

    httpMock.expectNone((r) => r.url.endsWith('/audit-events'));
    expect(component.page()).toBe(1);
  });

  it('nextPage() advances and requests the next page', () => {
    const component = create();

    component.nextPage();

    const req = httpMock.expectOne((r) => r.url.endsWith('/audit-events'));
    expect(req.request.params.get('page')).toBe('2');
    req.flush({ items: [], total: 45, page: 2, pageSize: 20 });
    expect(component.page()).toBe(2);
  });

  it('applyFilter() resets to page 1 and forwards the entity filter', () => {
    const component = create();
    component.page.set(3);
    component.entityFilter = 'Role';

    component.applyFilter();

    const req = httpMock.expectOne((r) => r.url.endsWith('/audit-events'));
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('entity')).toBe('Role');
    req.flush({ items: [], total: 0, page: 1, pageSize: 20 });
    expect(component.page()).toBe(1);
  });

  // Same lesson as roles-list's mobile fix (2026-08-22): a table with no
  // overflow handling can hide its own columns on a narrow viewport with
  // nothing to scroll it back into view — verified against the real DOM,
  // not just the component's TS state.
  it('renders the table inside a horizontal-scroll wrapper', () => {
    const fixture = TestBed.createComponent(AuditLogComponent);
    httpMock.expectOne((r) => r.url.endsWith('/audit-events')).flush({
      items: [
        {
          id: 'evt-1',
          userId: 'user-1',
          userLabel: 'Ada Admin <ada@example.com>',
          action: 'role.delete',
          entity: 'Role',
          entityId: 'role-1',
          occurredAt: '2026-08-22T00:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });
    fixture.detectChanges();

    const scrollWrapper = fixture.nativeElement.querySelector('.audit-table-scroll table.audit-table');
    expect(scrollWrapper).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Ada Admin');
    expect(fixture.nativeElement.textContent).toContain('role.delete');
  });
});
