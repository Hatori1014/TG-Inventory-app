import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PriceComparisonComponent } from './price-comparison.component';

describe('PriceComparisonComponent', () => {
  let httpMock: HttpTestingController;

  afterEach(() => httpMock.verify());

  function create(): PriceComparisonComponent {
    TestBed.configureTestingModule({
      imports: [PriceComparisonComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(PriceComparisonComponent);
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url.endsWith('/products')).flush({ items: [], total: 0, page: 1, pageSize: 100 });
    httpMock.expectOne((r) => r.url.endsWith('/suppliers')).flush({ items: [], total: 0, page: 1, pageSize: 100 });

    return fixture.componentInstance;
  }

  it('defaults to the product comparison tab', () => {
    const component = create();

    expect(component.activeTab()).toBe('product');
  });

  it('switches tabs', () => {
    const component = create();

    component.activeTab.set('supplier');

    expect(component.activeTab()).toBe('supplier');
  });
});
