import { Component, signal } from '@angular/core';
import { ProductPriceComparisonComponent } from './product-price-comparison/product-price-comparison.component';
import { SupplierPriceComparisonComponent } from './supplier-price-comparison/supplier-price-comparison.component';

// HU-14 — "Comparativa de precios de compra" (plan section 7.4), the last
// HU of MVP2. Two independent views (DoR resolved by the user): by product
// (price per supplier, cheapest first) and by supplier (monthly average
// trend across up to 3). A tab switcher, not two routes, since they're the
// same feature and switching between them shouldn't lose either view's
// in-progress selection.
@Component({
  selector: 'app-price-comparison',
  standalone: true,
  imports: [ProductPriceComparisonComponent, SupplierPriceComparisonComponent],
  templateUrl: './price-comparison.component.html',
  styleUrl: './price-comparison.component.scss',
})
export class PriceComparisonComponent {
  activeTab = signal<'product' | 'supplier'>('product');
}
