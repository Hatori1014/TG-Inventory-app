import { Component, ElementRef, OnDestroy, ViewChild, effect, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Chart } from 'chart.js/auto';
import { PurchasesService } from '../../purchases.service';
import { SuppliersService } from '../../../suppliers/suppliers.service';
import { Supplier } from '../../../../shared/models/supplier.model';
import { SupplierPriceComparison } from '../../../../shared/models/price-comparison.model';

const CHART_COLORS = ['#3d7ab8', '#e08a3c', '#4c9c6e'];

// HU-14, view 2 — DoR resolved by the user: up to 3 suppliers, general
// monthly average across everything each has sold (not scoped to a single
// product). Table/chart toggle added at the user's explicit request — line
// chart, since this view is specifically about the trend over time.
@Component({
  selector: 'app-supplier-price-comparison',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './supplier-price-comparison.component.html',
  styleUrl: './supplier-price-comparison.component.scss',
})
export class SupplierPriceComparisonComponent implements OnDestroy {
  private readonly purchasesService = inject(PurchasesService);
  private readonly suppliersService = inject(SuppliersService);

  @ViewChild('canvas') private readonly canvasRef?: ElementRef<HTMLCanvasElement>;
  private chart?: Chart;

  suppliers = signal<Supplier[]>([]);
  selectedSupplierIds = signal<string[]>([]);
  comparison = signal<SupplierPriceComparison | null>(null);
  viewMode = signal<'table' | 'chart'>('table');
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  constructor() {
    this.suppliersService.listSuppliers(1, 100).subscribe({ next: (r) => this.suppliers.set(r.items) });

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

  isSelected(supplierId: string): boolean {
    return this.selectedSupplierIds().includes(supplierId);
  }

  toggleSupplier(supplierId: string): void {
    const current = this.selectedSupplierIds();
    if (current.includes(supplierId)) {
      this.selectedSupplierIds.set(current.filter((id) => id !== supplierId));
    } else if (current.length < 3) {
      this.selectedSupplierIds.set([...current, supplierId]);
    }
    this.comparison.set(null);
    this.errorMessage.set(null);
  }

  canCompare(): boolean {
    const count = this.selectedSupplierIds().length;
    return count >= 2 && count <= 3;
  }

  compare(): void {
    if (!this.canCompare()) return;

    this.loading.set(true);
    this.errorMessage.set(null);
    this.purchasesService.getSupplierPriceComparison(this.selectedSupplierIds()).subscribe({
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

  private renderChart(canvas: HTMLCanvasElement, data: SupplierPriceComparison): void {
    this.chart?.destroy();
    this.chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: data.rows.map((row) => row.month),
        datasets: data.suppliers.map((supplier, index) => ({
          label: supplier.supplierName,
          data: data.rows.map((row) => row.averageBySupplier[supplier.supplierId]),
          borderColor: CHART_COLORS[index % CHART_COLORS.length],
          backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
          tension: 0.2,
        })),
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true } },
      },
    });
  }
}
