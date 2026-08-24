import { SimpleChange } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ProductThumbnailComponent } from './product-thumbnail.component';
import { environment } from '../../../../environments/environment';

describe('ProductThumbnailComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ProductThumbnailComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('does not request an image when the product has none', () => {
    const fixture = TestBed.createComponent(ProductThumbnailComponent);
    fixture.componentInstance.productId = '1';
    fixture.componentInstance.hasImage = false;
    fixture.componentInstance.ngOnChanges({ hasImage: new SimpleChange(null, fixture.componentInstance.hasImage, true) });

    httpMock.expectNone((r) => r.url.endsWith('/products/1/image'));
    expect(fixture.componentInstance.previewUrl()).toBeNull();
  });

  it('fetches and previews the image as a blob when the product has one', () => {
    const fixture = TestBed.createComponent(ProductThumbnailComponent);
    fixture.componentInstance.productId = '1';
    fixture.componentInstance.hasImage = true;
    fixture.componentInstance.ngOnChanges({ hasImage: new SimpleChange(null, fixture.componentInstance.hasImage, true) });

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/products/1/image`);
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['fake-webp'], { type: 'image/webp' }));

    expect(fixture.componentInstance.previewUrl()).toMatch(/^blob:/);
  });

  it('reloads when the productId changes', () => {
    const fixture = TestBed.createComponent(ProductThumbnailComponent);
    fixture.componentInstance.productId = '1';
    fixture.componentInstance.hasImage = true;
    fixture.componentInstance.ngOnChanges({ hasImage: new SimpleChange(null, fixture.componentInstance.hasImage, true) });
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/products/1/image`).flush(new Blob(['a']));

    fixture.componentInstance.productId = '2';
    fixture.componentInstance.ngOnChanges({ productId: new SimpleChange('1', '2', false) });

    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/products/2/image`).flush(new Blob(['b']));
    expect(fixture.componentInstance.previewUrl()).toMatch(/^blob:/);
  });
});
