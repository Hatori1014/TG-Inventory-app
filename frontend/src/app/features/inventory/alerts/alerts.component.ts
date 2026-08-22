import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { InventoryService } from '../inventory.service';
import { StockAlert } from '../../../shared/models/inventory.model';

// HU-12 — "Panel de productos en alerta" (plan section 7.4: GET /alerts).
// Not paginated (see ListAlertsUseCase on the backend) and not filtered —
// the whole point is a short, sorted list of what needs attention, already
// ordered most-urgent-first by the backend.
@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './alerts.component.html',
  styleUrl: './alerts.component.scss',
})
export class AlertsComponent {
  private readonly inventoryService = inject(InventoryService);

  alerts = signal<StockAlert[]>([]);
  loading = signal(true);
  errorMessage: string | null = null;

  constructor() {
    this.reload();
  }

  reload(): void {
    this.errorMessage = null;
    this.loading.set(true);
    this.inventoryService.listAlerts().subscribe({
      next: (alerts) => {
        this.alerts.set(alerts);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage = 'No se pudo cargar el panel de alertas.';
      },
    });
  }
}
