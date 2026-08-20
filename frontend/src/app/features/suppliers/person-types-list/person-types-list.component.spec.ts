import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PersonTypesListComponent } from './person-types-list.component';

describe('PersonTypesListComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PersonTypesListComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(): PersonTypesListComponent {
    const fixture = TestBed.createComponent(PersonTypesListComponent);
    httpMock
      .expectOne((r) => r.url.endsWith('/person-types'))
      .flush({
        items: [
          { id: 'per-1', name: 'Natural', status: 'active' },
          { id: 'per-2', name: 'Jurídica', status: 'inactive' },
        ],
        total: 2,
        page: 1,
        pageSize: 100,
      });
    httpMock
      .expectOne((r) => r.url.endsWith('/suppliers'))
      .flush({
        items: [
          { id: 's-1', personType: { id: 'per-1' } },
          { id: 's-2', personType: { id: 'per-1' } },
          { id: 's-3', personType: { id: 'per-2' } },
          { id: 's-4', personType: null },
        ],
        total: 4,
        page: 1,
        pageSize: 100,
      });
    return fixture.componentInstance;
  }

  it('counts suppliers per person type from the fetched supplier list', () => {
    const component = create();

    expect(component.supplierCountFor('per-1')).toBe(2);
    expect(component.supplierCountFor('per-2')).toBe(1);
  });

  it('addPersonType() posts the trimmed name and reloads the list', () => {
    const component = create();
    component.newName = '  Consorcio  ';

    component.addPersonType();

    const postReq = httpMock.expectOne((r) => r.url.endsWith('/person-types') && r.method === 'POST');
    expect(postReq.request.body).toEqual({ name: 'Consorcio' });
    postReq.flush({ id: 'per-3', name: 'Consorcio', status: 'active' });

    httpMock.expectOne((r) => r.url.endsWith('/person-types')).flush({ items: [], total: 0, page: 1, pageSize: 100 });
    httpMock.expectOne((r) => r.url.endsWith('/suppliers')).flush({ items: [], total: 0, page: 1, pageSize: 100 });
    expect(component.newName).toBe('');
  });

  it('toggleStatus() sends the flipped status and reloads', () => {
    const component = create();

    component.toggleStatus({ id: 'per-1', name: 'Natural', status: 'active' });

    const patchReq = httpMock.expectOne((r) => r.url.endsWith('/person-types/per-1') && r.method === 'PATCH');
    expect(patchReq.request.body).toEqual({ status: 'inactive' });
    patchReq.flush({ id: 'per-1', name: 'Natural', status: 'inactive' });

    httpMock.expectOne((r) => r.url.endsWith('/person-types')).flush({ items: [], total: 0, page: 1, pageSize: 100 });
    httpMock.expectOne((r) => r.url.endsWith('/suppliers')).flush({ items: [], total: 0, page: 1, pageSize: 100 });
  });
});
