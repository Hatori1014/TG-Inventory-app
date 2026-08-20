import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { DocumentTypesListComponent } from './document-types-list.component';

describe('DocumentTypesListComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DocumentTypesListComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(): DocumentTypesListComponent {
    const fixture = TestBed.createComponent(DocumentTypesListComponent);
    httpMock
      .expectOne((r) => r.url.endsWith('/document-types'))
      .flush({
        items: [
          { id: 'doc-1', name: 'Cédula de ciudadanía', status: 'active' },
          { id: 'doc-2', name: 'NIT', status: 'inactive' },
        ],
        total: 2,
        page: 1,
        pageSize: 100,
      });
    httpMock
      .expectOne((r) => r.url.endsWith('/suppliers'))
      .flush({
        items: [
          { id: 's-1', documentType: { id: 'doc-1' } },
          { id: 's-2', documentType: { id: 'doc-1' } },
          { id: 's-3', documentType: { id: 'doc-2' } },
          { id: 's-4', documentType: null },
        ],
        total: 4,
        page: 1,
        pageSize: 100,
      });
    return fixture.componentInstance;
  }

  it('counts suppliers per document type from the fetched supplier list', () => {
    const component = create();

    expect(component.supplierCountFor('doc-1')).toBe(2);
    expect(component.supplierCountFor('doc-2')).toBe(1);
  });

  it('addDocumentType() posts the trimmed name and reloads the list', () => {
    const component = create();
    component.newName = '  Pasaporte  ';

    component.addDocumentType();

    const postReq = httpMock.expectOne((r) => r.url.endsWith('/document-types') && r.method === 'POST');
    expect(postReq.request.body).toEqual({ name: 'Pasaporte' });
    postReq.flush({ id: 'doc-3', name: 'Pasaporte', status: 'active' });

    httpMock.expectOne((r) => r.url.endsWith('/document-types')).flush({ items: [], total: 0, page: 1, pageSize: 100 });
    httpMock.expectOne((r) => r.url.endsWith('/suppliers')).flush({ items: [], total: 0, page: 1, pageSize: 100 });
    expect(component.newName).toBe('');
  });

  it('toggleStatus() sends the flipped status and reloads', () => {
    const component = create();

    component.toggleStatus({ id: 'doc-1', name: 'Cédula de ciudadanía', status: 'active' });

    const patchReq = httpMock.expectOne((r) => r.url.endsWith('/document-types/doc-1') && r.method === 'PATCH');
    expect(patchReq.request.body).toEqual({ status: 'inactive' });
    patchReq.flush({ id: 'doc-1', name: 'Cédula de ciudadanía', status: 'inactive' });

    httpMock.expectOne((r) => r.url.endsWith('/document-types')).flush({ items: [], total: 0, page: 1, pageSize: 100 });
    httpMock.expectOne((r) => r.url.endsWith('/suppliers')).flush({ items: [], total: 0, page: 1, pageSize: 100 });
  });
});
