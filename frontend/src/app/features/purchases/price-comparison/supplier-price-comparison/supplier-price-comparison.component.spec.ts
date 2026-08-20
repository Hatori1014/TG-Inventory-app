import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { SupplierPriceComparisonComponent } from './supplier-price-comparison.component';

describe('SupplierPriceComparisonComponent', () => {
  let httpMock: HttpTestingController;

  afterEach(() => httpMock.verify());

  function create(): { component: SupplierPriceComparisonComponent; fixture: ReturnType<typeof TestBed.createComponent<SupplierPriceComparisonComponent>> } {
    TestBed.configureTestingModule({
      imports: [SupplierPriceComparisonComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(SupplierPriceComparisonComponent);
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url.endsWith('/suppliers')).flush({
      items: [
        { id: 's1', name: 'Acme' },
        { id: 's2', name: 'Beta' },
        { id: 's3', name: 'Gamma' },
        { id: 's4', name: 'Delta' },
      ],
      total: 4,
      page: 1,
      pageSize: 100,
    });

    return { component: fixture.componentInstance, fixture };
  }

  it('loads the supplier list on init', () => {
    const { component } = create();

    expect(component.suppliers().length).toBe(4);
  });

  it('cannot compare with fewer than 2 suppliers selected', () => {
    const { component } = create();
    component.toggleSupplier('s1');

    expect(component.canCompare()).toBe(false);
  });

  it('caps selection at 3 suppliers', () => {
    const { component } = create();
    component.toggleSupplier('s1');
    component.toggleSupplier('s2');
    component.toggleSupplier('s3');
    component.toggleSupplier('s4');

    expect(component.selectedSupplierIds()).toEqual(['s1', 's2', 's3']);
  });

  it('toggling a selected supplier removes it', () => {
    const { component } = create();
    component.toggleSupplier('s1');
    component.toggleSupplier('s2');

    component.toggleSupplier('s1');

    expect(component.selectedSupplierIds()).toEqual(['s2']);
  });

  it('compare() fetches the comparison for the selected suppliers', () => {
    const { component, fixture } = create();
    component.toggleSupplier('s1');
    component.toggleSupplier('s2');

    component.compare();

    const req = httpMock.expectOne((r) => r.url.endsWith('/reports/supplier-price-comparison'));
    expect(req.request.params.getAll('supplierIds')).toEqual(['s1', 's2']);
    req.flush({
      suppliers: [
        { supplierId: 's1', supplierName: 'Acme' },
        { supplierId: 's2', supplierName: 'Beta' },
      ],
      rows: [{ month: '2026-06', averageBySupplier: { s1: 10, s2: 8 } }],
    });
    fixture.detectChanges();

    expect(component.comparison()?.rows.length).toBe(1);
  });

  it('compare() does nothing when the selection is invalid', () => {
    const { component } = create();
    component.toggleSupplier('s1');

    component.compare();

    httpMock.expectNone((r) => r.url.includes('/reports/supplier-price-comparison'));
  });

  it('switching to chart mode does not throw once data is loaded', () => {
    const { component, fixture } = create();
    component.toggleSupplier('s1');
    component.toggleSupplier('s2');
    component.compare();
    httpMock.expectOne((r) => r.url.endsWith('/reports/supplier-price-comparison')).flush({
      suppliers: [
        { supplierId: 's1', supplierName: 'Acme' },
        { supplierId: 's2', supplierName: 'Beta' },
      ],
      rows: [{ month: '2026-06', averageBySupplier: { s1: 10, s2: 8 } }],
    });
    fixture.detectChanges();

    expect(() => {
      component.viewMode.set('chart');
      fixture.detectChanges();
    }).not.toThrow();
  });
});
