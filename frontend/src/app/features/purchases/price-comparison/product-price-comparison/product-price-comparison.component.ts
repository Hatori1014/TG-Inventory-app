import { Component, ElementRef, OnDestroy, ViewChild, effect, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart } from 'chart.js/auto';
import { PurchasesService } from '../../purchases.service';
import { ProductsService } from '../../../products/products.service';
import { Product } from '../../../../shared/models/product.model';
import { ProductPriceComparison } from '../../../../shared/models/price-comparison.model';

// HU-14, view 1 — "al seleccionar un producto, que muestre una tabla
// comparativa donde se evidencie precio de producto por proveedor" (DoR
// resolved by the user). Table/chart toggle added at the user's explicit
// request after the DoR was first resolved — bar chart, one bar per
// supplier, since this view is a snapshot comparison, not a trend. The
// <canvas> stays in the DOM at all times (just hidden via CSS in table
// mode) instead of behind an @if, so @ViewChild never races the toggle's
// change detection cycle.
@Component({
  selector: 'app-product-price-comparison',
  standalone: true,
  imports: [FormsModule, DatePipe, DecimalPipe],
  templateUrl: './product-price-comparison.component.html',
  styleUrl: './product-price-comparison.component.scss',
})
export class ProductPriceComparisonComponent implements OnDestroy {
  private readonly purchasesService = inject(PurchasesService);
  private readonly productsService = inject(ProductsService);

  @ViewChild('canvas') private readonly canvasRef?: ElementRef<HTMLCanvasElement>;
  private chart?: Chart;

  products = signal<Product[]>([]);
  selectedProductId = signal('');
  comparison = signal<ProductPriceComparison | null>(null);
  viewMode = signal<'table' | 'chart'>('table');
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  constructor() {
    this.productsService.listProducts(1, 100).subscribe({ next: (r) => this.products.set(r.items) });

    effect(() => {
      const data = this.comparison();
      const mode = this.viewMode();
      const canvas = this.canvasRef?.nativeElement;
      if (mode === 'chart' && data && canvas) {
        this.renderChart(canvas, data);
      } else {
        this.chart?.destroy();
        this.chart = undefined;
      }
    });
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  onProductChange(): void {
    const productId = this.selectedProductId();
    this.comparison.set(null);
    this.errorMessage.set(null);
    if (!productId) return;

    this.loading.set(true);
    this.purchasesService.getProductPriceComparison(productId).subscribe({
      next: (result) => {
        this.comparison.set(result);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudo cargar la comparativa.');
        this.loading.set(false);
      },
    });
  }

  private renderChart(canvas: HTMLCanvasElement, data: ProductPriceComparison): void {
    this.chart?.destroy();
    this.chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.suppliers.map((s) => s.supplierName),
        datasets: [
          {
            label: 'Precio más reciente',
            data: data.suppliers.map((s) => s.latestUnitPrice),
            backgroundColor: '#3d7ab8',
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } },
      },
    });
  }
}
