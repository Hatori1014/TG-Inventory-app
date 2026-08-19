import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { UsersListComponent } from './users-list.component';

describe('UsersListComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [UsersListComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(): UsersListComponent {
    const fixture = TestBed.createComponent(UsersListComponent);
    httpMock
      .expectOne((r) => r.url.endsWith('/users'))
      .flush({ items: [], total: 45, page: 1, pageSize: 20 });
    return fixture.componentInstance;
  }

  it('computes totalPages from the initial response', () => {
    const component = create();

    expect(component.totalPages()).toBe(3);
  });

  it('previousPage() does nothing on the first page', () => {
    const component = create();

    component.previousPage();

    httpMock.expectNone((r) => r.url.endsWith('/users'));
    expect(component.page()).toBe(1);
  });

  it('nextPage() advances and requests the next page', () => {
    const component = create();

    component.nextPage();

    const req = httpMock.expectOne((r) => r.url.endsWith('/users'));
    expect(req.request.params.get('page')).toBe('2');
    req.flush({ items: [], total: 45, page: 2, pageSize: 20 });
    expect(component.page()).toBe(2);
  });

  it('nextPage() does nothing past the last page', () => {
    const component = create();
    component.page.set(3);

    component.nextPage();

    httpMock.expectNone((r) => r.url.endsWith('/users'));
    expect(component.page()).toBe(3);
  });

  it('initials() takes the first letter of the first and last name', () => {
    const component = create();

    expect(component.initials('María Cabrera')).toBe('MC');
    expect(component.initials('Diego Andrés Tapia')).toBe('DT');
  });

  it('initials() falls back to a single letter for a one-word name', () => {
    const component = create();

    expect(component.initials('Admin')).toBe('A');
  });
});
