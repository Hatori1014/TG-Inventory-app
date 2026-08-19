import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { LocationsListComponent } from './locations-list.component';

describe('LocationsListComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LocationsListComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(): LocationsListComponent {
    const fixture = TestBed.createComponent(LocationsListComponent);
    httpMock.expectOne((r) => r.url.endsWith('/locations')).flush({
      items: [
        { id: 'loc-central', name: 'Sede Central', parentId: null, status: 'active' },
        { id: 'loc-bodega', name: 'Bodega Central', parentId: 'loc-central', status: 'active' },
        { id: 'loc-estante-a1', name: 'Estante A1', parentId: 'loc-bodega', status: 'active' },
        { id: 'loc-oficina', name: 'Oficina RRHH', parentId: 'loc-central', status: 'inactive' },
      ],
      total: 4,
      page: 1,
      pageSize: 100,
    });
    return fixture.componentInstance;
  }

  it('orders rows depth-first from parentId and indents by level', () => {
    const component = create();

    const rows = component.rows();
    expect(rows.map((r) => [r.location.id, r.level])).toEqual([
      ['loc-central', 0],
      ['loc-bodega', 1],
      ['loc-estante-a1', 2],
      ['loc-oficina', 1],
    ]);
  });

  it('resolves a parent name and falls back to a dash at root level', () => {
    const component = create();

    expect(component.parentName('loc-central')).toBe('Sede Central');
    expect(component.parentName(null)).toBe('—');
  });

  it('addLocation() posts the trimmed name and optional parentId, then reloads', () => {
    const component = create();
    component.newName = '  Estante B2  ';
    component.newParentId = 'loc-bodega';

    component.addLocation();

    const postReq = httpMock.expectOne((r) => r.url.endsWith('/locations') && r.method === 'POST');
    expect(postReq.request.body).toEqual({ name: 'Estante B2', parentId: 'loc-bodega' });
    postReq.flush({ id: 'loc-new', name: 'Estante B2', parentId: 'loc-bodega', status: 'active' });

    httpMock.expectOne((r) => r.url.endsWith('/locations')).flush({ items: [], total: 0, page: 1, pageSize: 100 });
    expect(component.newName).toBe('');
    expect(component.newParentId).toBe('');
  });

  it('toggleStatus() sends the flipped status and reloads', () => {
    const component = create();

    component.toggleStatus({ id: 'loc-central', name: 'Sede Central', parentId: null, status: 'active' });

    const patchReq = httpMock.expectOne((r) => r.url.endsWith('/locations/loc-central') && r.method === 'PATCH');
    expect(patchReq.request.body).toEqual({ status: 'inactive' });
    patchReq.flush({ id: 'loc-central', name: 'Sede Central', parentId: null, status: 'inactive' });

    httpMock.expectOne((r) => r.url.endsWith('/locations')).flush({ items: [], total: 0, page: 1, pageSize: 100 });
  });

  it('confirmRename() sends the trimmed name, reloads, and exits edit mode', () => {
    const component = create();
    component.startRename({ id: 'loc-central', name: 'Sede Central', parentId: null, status: 'active' });
    component.editingName = '  Sede Norte  ';

    component.confirmRename({ id: 'loc-central', name: 'Sede Central', parentId: null, status: 'active' });

    const patchReq = httpMock.expectOne((r) => r.url.endsWith('/locations/loc-central') && r.method === 'PATCH');
    expect(patchReq.request.body).toEqual({ name: 'Sede Norte' });
    patchReq.flush({ id: 'loc-central', name: 'Sede Norte', parentId: null, status: 'active' });

    httpMock.expectOne((r) => r.url.endsWith('/locations')).flush({ items: [], total: 0, page: 1, pageSize: 100 });
    expect(component.editingId).toBeNull();
  });

  it('confirmRename() skips the request when the name is unchanged or blank', () => {
    const component = create();
    const location = { id: 'loc-central', name: 'Sede Central', parentId: null, status: 'active' as const };
    component.startRename(location);
    component.editingName = '  Sede Central  ';

    component.confirmRename(location);

    expect(component.editingId).toBeNull();
  });

  it('cancelRename() exits edit mode without sending a request', () => {
    const component = create();
    component.startRename({ id: 'loc-central', name: 'Sede Central', parentId: null, status: 'active' });

    component.cancelRename();

    expect(component.editingId).toBeNull();
    expect(component.editingName).toBe('');
  });
});
