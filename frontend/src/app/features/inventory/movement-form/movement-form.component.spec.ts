import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { MovementFormComponent } from './movement-form.component';

describe('MovementFormComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MovementFormComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(): { component: MovementFormComponent } {
    const fixture = TestBed.createComponent(MovementFormComponent);
    httpMock.expectOne((r) => r.url.endsWith('/products')).flush({ items: [], total: 0, page: 1, pageSize: 100 });
    httpMock.expectOne((r) => r.url.endsWith('/locations')).flush({ items: [], total: 0, page: 1, pageSize: 100 });
    fixture.detectChanges();
    return { component: fixture.componentInstance };
  }

  it('defaults to type "in" with a positive delta preview', () => {
    const { component } = create();
    component.form.patchValue({ quantity: 24 });

    expect(component.ledgerRows()).toBe('1');
    expect(component.deltaPreview()).toBe('+24');
    expect(component.deltaColorClass()).toBe('movement-delta--positive');
  });

  it('selectType() switches the type and updates the location label for transfer', () => {
    const { component } = create();

    component.selectType('transfer');

    expect(component.form.value.type).toBe('transfer');
    expect(component.locationLabel()).toBe('Ubicación de origen');
    expect(component.ledgerRows()).toBe('2 (salida y entrada)');
  });

  it('out and transfer always show a negative delta preview', () => {
    const { component } = create();
    component.form.patchValue({ quantity: 10 });

    component.selectType('out');
    expect(component.deltaPreview()).toBe('-10');
    expect(component.deltaColorClass()).toBe('movement-delta--negative');

    component.selectType('transfer');
    expect(component.deltaPreview()).toBe('-10');
    expect(component.deltaColorClass()).toBe('movement-delta--negative');
  });

  it('adjustment delta follows the selected direction', () => {
    const { component } = create();
    component.form.patchValue({ type: 'adjustment', quantity: 5, direction: 'increase' });
    expect(component.deltaPreview()).toBe('+5');
    expect(component.deltaColorClass()).toBe('movement-delta--positive');

    component.form.patchValue({ direction: 'decrease' });
    expect(component.deltaPreview()).toBe('-5');
    expect(component.deltaColorClass()).toBe('movement-delta--negative');
  });

  it('submitLabel() reflects the selected type', () => {
    const { component } = create();

    expect(component.submitLabel()).toBe('Registrar entrada');

    component.selectType('adjustment');
    expect(component.submitLabel()).toBe('Registrar ajuste');
  });
});
