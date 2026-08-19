import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { UnitsListComponent } from './units-list.component';

describe('UnitsListComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [UnitsListComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(): UnitsListComponent {
    const fixture = TestBed.createComponent(UnitsListComponent);
    httpMock
      .expectOne((r) => r.url.endsWith('/units'))
      .flush({
        items: [
          { id: 'unit-1', name: 'Caja', status: 'active' },
          { id: 'unit-2', name: 'Litro', status: 'inactive' },
        ],
        total: 2,
        page: 1,
        pageSize: 100,
      });
    httpMock
      .expectOne((r) => r.url.endsWith('/products'))
      .flush({
        items: [
          { id: 'p-1', unit: { id: 'unit-1' } },
          { id: 'p-2', unit: { id: 'unit-1' } },
          { id: 'p-3', unit: { id: 'unit-2' } },
        ],
        total: 3,
        page: 1,
        pageSize: 100,
      });
    return fixture.componentInstance;
  }

  it('counts products per unit from the fetched product list', () => {
    const component = create();

    expect(component.productCountFor('unit-1')).toBe(2);
    expect(component.productCountFor('unit-2')).toBe(1);
  });

  it('addUnit() posts the trimmed name and reloads the list', () => {
    const component = create();
    component.newName = '  Galón  ';

    component.addUnit();

    const postReq = httpMock.expectOne((r) => r.url.endsWith('/units') && r.method === 'POST');
    expect(postReq.request.body).toEqual({ name: 'Galón' });
    postReq.flush({ id: 'unit-3', name: 'Galón', status: 'active' });

    httpMock.expectOne((r) => r.url.endsWith('/units')).flush({ items: [], total: 0, page: 1, pageSize: 100 });
    httpMock.expectOne((r) => r.url.endsWith('/products')).flush({ items: [], total: 0, page: 1, pageSize: 100 });
    expect(component.newName).toBe('');
  });

  it('toggleStatus() sends the flipped status and reloads', () => {
    const component = create();

    component.toggleStatus({ id: 'unit-1', name: 'Caja', status: 'active' });

    const patchReq = httpMock.expectOne((r) => r.url.endsWith('/units/unit-1') && r.method === 'PATCH');
    expect(patchReq.request.body).toEqual({ status: 'inactive' });
    patchReq.flush({ id: 'unit-1', name: 'Caja', status: 'inactive' });

    httpMock.expectOne((r) => r.url.endsWith('/units')).flush({ items: [], total: 0, page: 1, pageSize: 100 });
    httpMock.expectOne((r) => r.url.endsWith('/products')).flush({ items: [], total: 0, page: 1, pageSize: 100 });
  });
});
