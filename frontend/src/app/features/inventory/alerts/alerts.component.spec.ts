import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AlertsComponent } from './alerts.component';

describe('AlertsComponent', () => {
  let httpMock: HttpTestingController;

  afterEach(() => httpMock.verify());

  function create(): AlertsComponent {
    TestBed.configureTestingModule({
      imports: [AlertsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(AlertsComponent);
    return fixture.componentInstance;
  }

  it('loads the alerts panel on init', () => {
    const component = create();

    const req = httpMock.expectOne((r) => r.url.endsWith('/alerts'));
    req.flush([{ productId: 'p1', productName: 'Arroz', minimumQuantity: 10, totalQuantity: 9, deficit: -1 }]);

    expect(component.alerts().length).toBe(1);
    expect(component.loading()).toBe(false);
  });

  it('sets an error message when the request fails', () => {
    const component = create();

    httpMock.expectOne((r) => r.url.endsWith('/alerts')).flush('error', { status: 500, statusText: 'Server Error' });

    expect(component.errorMessage).toBe('No se pudo cargar el panel de alertas.');
    expect(component.loading()).toBe(false);
  });

  it('reload() refetches the alerts', () => {
    const component = create();
    httpMock.expectOne((r) => r.url.endsWith('/alerts')).flush([]);

    component.reload();

    httpMock.expectOne((r) => r.url.endsWith('/alerts')).flush([]);
  });
});
