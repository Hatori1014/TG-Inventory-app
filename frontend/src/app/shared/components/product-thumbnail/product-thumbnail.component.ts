import { Component, Input, OnChanges, OnDestroy, SimpleChanges, inject, signal } from '@angular/core';
import { ProductsService } from '../../../features/products/products.service';

// HU-26 follow-up, at the user's explicit request after testing the
// staging preview: the image also needs to show up wherever products are
// listed, not just the edit form. R2 is private, so this fetches the
// image as an authenticated blob (same reasoning as ProductFormComponent's
// preview) rather than a plain <img src>.
@Component({
  selector: 'app-product-thumbnail',
  standalone: true,
  template: `
    @if (previewUrl()) {
      <img [src]="previewUrl()" [alt]="alt" class="product-thumbnail-img" />
    } @else {
      <div class="product-thumbnail-placeholder"><i class="ph ph-image"></i></div>
    }
  `,
  styles: [
    `
      .product-thumbnail-img {
        width: 36px;
        height: 36px;
        border-radius: 6px;
        object-fit: cover;
        border: 1px solid var(--color-border);
        display: block;
      }

      .product-thumbnail-placeholder {
        width: 36px;
        height: 36px;
        border-radius: 6px;
        background: #eef3f9;
        color: #b7c6d4;
        display: grid;
        place-items: center;
        font-size: 16px;
      }
    `,
  ],
})
export class ProductThumbnailComponent implements OnChanges, OnDestroy {
  private productsService = inject(ProductsService);

  @Input({ required: true }) productId!: string;
  @Input() hasImage = false;
  @Input() alt = '';

  previewUrl = signal<string | null>(null);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['productId'] || changes['hasImage']) {
      this.load();
    }
  }

  ngOnDestroy(): void {
    this.revoke();
  }

  private load(): void {
    this.revoke();
    if (!this.hasImage || !this.productId) return;

    this.productsService.getProductImage(this.productId).subscribe({
      next: (blob) => this.previewUrl.set(URL.createObjectURL(blob)),
      // No image yet, or it failed to load — the placeholder icon covers it.
      error: () => {},
    });
  }

  private revoke(): void {
    const url = this.previewUrl();
    if (url) {
      URL.revokeObjectURL(url);
    }
    this.previewUrl.set(null);
  }
}
