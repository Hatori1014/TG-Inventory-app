import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductsService } from '../products.service';
import { Product } from '../../../shared/models/product.model';

@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './products-list.component.html',
})
export class ProductsListComponent {
  private productsService = inject(ProductsService);

  products = signal<Product[]>([]);
  loading = signal(true);

  constructor() {
    this.productsService.listProducts().subscribe({
      next: (response) => {
        this.products.set(response.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
