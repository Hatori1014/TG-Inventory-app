import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { CategoriesListComponent } from './categories-list.component';

describe('CategoriesListComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CategoriesListComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(): CategoriesListComponent {
    const fixture = TestBed.createComponent(CategoriesListComponent);
    httpMock
      .expectOne((r) => r.url.endsWith('/categories'))
      .flush({
        items: [
          { id: 'cat-1', name: 'Insumos clínicos', status: 'active' },
          { id: 'cat-2', name: 'Papelería', status: 'inactive' },
        ],
        total: 2,
        page: 1,
        pageSize: 100,
      });
    httpMock
      .expectOne((r) => r.url.endsWith('/products'))
      .flush({
        items: [
          { id: 'p-1', category: { id: 'cat-1' } },
          { id: 'p-2', category: { id: 'cat-1' } },
          { id: 'p-3', category: null },
        ],
        total: 3,
        page: 1,
        pageSize: 100,
      });
    return fixture.componentInstance;
  }

  it('counts products per category from the fetched product list', () => {
    const component = create();

    expect(component.productCountFor('cat-1')).toBe(2);
    expect(component.productCountFor('cat-2')).toBe(0);
  });

  it('addCategory() posts the trimmed name and reloads the list', () => {
    const component = create();
    component.newName = '  Ferretería  ';

    component.addCategory();

    const postReq = httpMock.expectOne((r) => r.url.endsWith('/categories') && r.method === 'POST');
    expect(postReq.request.body).toEqual({ name: 'Ferretería' });
    postReq.flush({ id: 'cat-3', name: 'Ferretería', status: 'active' });

    httpMock.expectOne((r) => r.url.endsWith('/categories')).flush({ items: [], total: 0, page: 1, pageSize: 100 });
    httpMock.expectOne((r) => r.url.endsWith('/products')).flush({ items: [], total: 0, page: 1, pageSize: 100 });
    expect(component.newName).toBe('');
  });

  it('toggleStatus() sends the flipped status and reloads', () => {
    const component = create();

    component.toggleStatus({ id: 'cat-1', name: 'Insumos clínicos', status: 'active' });

    const patchReq = httpMock.expectOne((r) => r.url.endsWith('/categories/cat-1') && r.method === 'PATCH');
    expect(patchReq.request.body).toEqual({ status: 'inactive' });
    patchReq.flush({ id: 'cat-1', name: 'Insumos clínicos', status: 'inactive' });

    httpMock.expectOne((r) => r.url.endsWith('/categories')).flush({ items: [], total: 0, page: 1, pageSize: 100 });
    httpMock.expectOne((r) => r.url.endsWith('/products')).flush({ items: [], total: 0, page: 1, pageSize: 100 });
  });
});
