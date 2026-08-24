import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { ProductFormComponent } from './product-form.component';

const unit = { id: 'unit-1', name: 'Kilogramo', status: 'active' as const };

describe('ProductFormComponent', () => {
  let httpMock: HttpTestingController;

  afterEach(() => httpMock.verify());

  function create(id: string | null): ProductFormComponent {
    TestBed.configureTestingModule({
      imports: [ProductFormComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'products', component: ProductFormComponent }]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ProductFormComponent);
    return fixture.componentInstance;
  }

  function flushCatalogs(): void {
    httpMock.expectOne((r) => r.url.endsWith('/units')).flush({ items: [unit], total: 1, page: 1, pageSize: 100 });
    httpMock.expectOne((r) => r.url.endsWith('/categories')).flush({ items: [], total: 0, page: 1, pageSize: 100 });
  }

  describe('create mode', () => {
    function createInCreateMode(): ProductFormComponent {
      const component = create(null);
      flushCatalogs();
      return component;
    }

    it('stages a selected image locally without uploading it yet (no product id exists)', () => {
      const component = createInCreateMode();
      const file = new File(['fake-bytes'], 'photo.jpg', { type: 'image/jpeg' });

      component.onImageSelected({ target: { files: [file], value: '' } } as unknown as Event);

      httpMock.expectNone((r) => r.url.includes('/image'));
      expect(component.imagePreviewUrl()).toMatch(/^blob:/);
    });

    it('creates the product, then uploads the staged image, then navigates', () => {
      const component = createInCreateMode();
      const file = new File(['fake-bytes'], 'photo.jpg', { type: 'image/jpeg' });
      component.onImageSelected({ target: { files: [file], value: '' } } as unknown as Event);
      component.form.patchValue({ name: 'Arroz', unitId: 'unit-1' });

      component.onSubmit();

      const createReq = httpMock.expectOne((r) => r.url.endsWith('/products') && r.method === 'POST');
      createReq.flush({
        id: 'product-new',
        name: 'Arroz',
        description: null,
        unit,
        category: null,
        requiresBatch: false,
        imageUrl: null,
        status: 'active',
      });

      const uploadReq = httpMock.expectOne((r) => r.url.endsWith('/products/product-new/image') && r.method === 'POST');
      expect(uploadReq.request.body instanceof FormData).toBe(true);
      uploadReq.flush({
        id: 'product-new',
        name: 'Arroz',
        description: null,
        unit,
        category: null,
        requiresBatch: false,
        imageUrl: 'products/product-new/x.webp',
        status: 'active',
      });

      expect(component.isSubmitting).toBe(false);
    });

    it('still navigates away if the staged image upload fails after the product was created', () => {
      const component = createInCreateMode();
      const file = new File(['fake-bytes'], 'photo.jpg', { type: 'image/jpeg' });
      component.onImageSelected({ target: { files: [file], value: '' } } as unknown as Event);
      component.form.patchValue({ name: 'Arroz', unitId: 'unit-1' });

      component.onSubmit();

      httpMock.expectOne((r) => r.url.endsWith('/products') && r.method === 'POST').flush({
        id: 'product-new',
        name: 'Arroz',
        description: null,
        unit,
        category: null,
        requiresBatch: false,
        imageUrl: null,
        status: 'active',
      });
      httpMock
        .expectOne((r) => r.url.endsWith('/products/product-new/image'))
        .flush({ message: 'invalid file' }, { status: 400, statusText: 'Bad Request' });

      expect(component.isSubmitting).toBe(false);
    });

    it('does not upload anything on submit when no image was staged', () => {
      const component = createInCreateMode();
      component.form.patchValue({ name: 'Arroz', unitId: 'unit-1' });

      component.onSubmit();

      httpMock.expectOne((r) => r.url.endsWith('/products') && r.method === 'POST').flush({
        id: 'product-new',
        name: 'Arroz',
        description: null,
        unit,
        category: null,
        requiresBatch: false,
        imageUrl: null,
        status: 'active',
      });

      httpMock.expectNone((r) => r.url.includes('/image'));
      expect(component.isSubmitting).toBe(false);
    });
  });

  describe('edit mode', () => {
    function createInEditMode(): ProductFormComponent {
      const component = create('product-1');
      flushCatalogs();
      httpMock.expectOne((r) => r.url.endsWith('/products')).flush({
        items: [
          {
            id: 'product-1',
            name: 'Arroz',
            description: null,
            unit,
            category: null,
            requiresBatch: false,
            imageUrl: null,
            status: 'active',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 100,
      });
      return component;
    }

    it('uploads a selected image immediately, using the existing product id', () => {
      const component = createInEditMode();
      const file = new File(['fake-bytes'], 'photo.jpg', { type: 'image/jpeg' });

      component.onImageSelected({ target: { files: [file], value: '' } } as unknown as Event);

      const req = httpMock.expectOne((r) => r.url.endsWith('/products/product-1/image') && r.method === 'POST');
      req.flush({
        id: 'product-1',
        name: 'Arroz',
        description: null,
        unit,
        category: null,
        requiresBatch: false,
        imageUrl: 'products/product-1/x.webp',
        status: 'active',
      });

      expect(component.isUploadingImage).toBe(false);
      expect(component.imagePreviewUrl()).toMatch(/^blob:/);
    });

    it('surfaces a clear message when the upload is rejected as an invalid file', () => {
      const component = createInEditMode();
      const file = new File(['fake-bytes'], 'photo.jpg', { type: 'image/jpeg' });

      component.onImageSelected({ target: { files: [file], value: '' } } as unknown as Event);

      httpMock
        .expectOne((r) => r.url.endsWith('/products/product-1/image'))
        .flush({ message: 'invalid' }, { status: 400, statusText: 'Bad Request' });

      expect(component.imageError).toBe('El archivo no es una imagen JPG, PNG o WEBP válida, o supera los 5MB.');
    });
  });
});
