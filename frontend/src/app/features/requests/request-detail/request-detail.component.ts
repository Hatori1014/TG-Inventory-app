import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { RequestsService } from '../requests.service';
import { AuthService } from '../../../core/services/auth.service';
import { PurchaseRequest } from '../../../shared/models/request.model';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  pending: 'Pendiente',
  in_review: 'En proceso',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  pending_inventory_integration: 'Pendiente integrar al inventario',
  closed: 'Cerrada',
};

// HU-17 — vista de detalle: historial de aprobaciones + las tres acciones
// nuevas (aprobar/rechazar/integrar). Igual que el resto de este frontend,
// los botones se muestran de forma optimista según el estado (no según un
// permiso que el JWT no trae) y es el backend (403) el que realmente
// autoriza — mismo criterio que "+ Nueva solicitud" en requests-list.
@Component({
  selector: 'app-request-detail',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, RouterLink, DatePipe],
  templateUrl: './request-detail.component.html',
  styleUrl: './request-detail.component.scss',
})
export class RequestDetailComponent {
  private fb = inject(FormBuilder);
  private requestsService = inject(RequestsService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);

  private requestId = this.route.snapshot.paramMap.get('id') as string;
  private currentUserId = this.authService.user()?.id;

  request = signal<PurchaseRequest | null>(null);
  loading = signal(true);
  actionError: string | null = null;
  isSubmitting = false;
  showRejectForm = false;

  rejectForm = this.fb.nonNullable.group({
    comment: ['', [Validators.required]],
  });

  integrateItems: { requestItemId: string; label: string; unitPrice: number | null; batchNumber: string }[] = [];

  constructor() {
    this.reload();
  }

  private reload(): void {
    this.loading.set(true);
    this.requestsService.getRequest(this.requestId).subscribe({
      next: (req) => {
        this.request.set(req);
        this.integrateItems = req.items.map((item) => ({
          requestItemId: item.id,
          label: `${item.productName} · ${item.locationName} · ${item.quantity} unid.`,
          unitPrice: item.estimatedPrice,
          batchNumber: '',
        }));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  statusLabel(status: string): string {
    return STATUS_LABELS[status] ?? status;
  }

  // El pedido no debe permitir que el propio solicitante apruebe o
  // rechace su solicitud (el backend igual lo bloquea con 403) — evita
  // mostrar un botón que sabemos de antemano que va a fallar.
  canActOnApproval(): boolean {
    const req = this.request();
    if (!req) return false;
    if (req.requesterId === this.currentUserId) return false;
    return req.status === 'pending' || req.status === 'in_review';
  }

  canIntegrate(): boolean {
    const req = this.request();
    return !!req && req.type === 'purchase' && req.status === 'pending_inventory_integration';
  }

  approve(): void {
    this.actionError = null;
    this.isSubmitting = true;
    this.requestsService.approveRequest(this.requestId).subscribe({
      next: (req) => {
        this.isSubmitting = false;
        this.request.set(req);
      },
      error: (error: HttpErrorResponse) => this.onActionError(error),
    });
  }

  openRejectForm(): void {
    this.showRejectForm = true;
    this.rejectForm.reset();
  }

  confirmReject(): void {
    if (this.rejectForm.invalid) {
      this.actionError = 'El motivo del rechazo es obligatorio.';
      return;
    }
    this.actionError = null;
    this.isSubmitting = true;
    const comment = this.rejectForm.getRawValue().comment;
    this.requestsService.rejectRequest(this.requestId, comment).subscribe({
      next: (req) => {
        this.isSubmitting = false;
        this.showRejectForm = false;
        this.request.set(req);
      },
      error: (error: HttpErrorResponse) => this.onActionError(error),
    });
  }

  integrate(): void {
    const items = this.integrateItems.map((item) => ({
      requestItemId: item.requestItemId,
      unitPrice: item.unitPrice ?? 0,
      batchNumber: item.batchNumber || undefined,
    }));
    if (items.some((item) => item.unitPrice <= 0)) {
      this.actionError = 'Cada ítem necesita un precio unitario real para integrarse al inventario.';
      return;
    }
    this.actionError = null;
    this.isSubmitting = true;
    this.requestsService.integrateRequest(this.requestId, items).subscribe({
      next: (req) => {
        this.isSubmitting = false;
        this.request.set(req);
      },
      error: (error: HttpErrorResponse) => this.onActionError(error),
    });
  }

  private onActionError(error: HttpErrorResponse): void {
    this.isSubmitting = false;
    if (error.status === 403) {
      this.actionError = 'No tenés permiso para esta acción.';
    } else if (error.status === 409) {
      this.actionError = error.error?.message ?? 'Esta solicitud ya no admite esa acción (puede que ya haya sido resuelta, o ya hayas votado).';
    } else if (error.status === 400) {
      this.actionError = Array.isArray(error.error?.message) ? error.error.message.join(' ') : (error.error?.message ?? 'Datos inválidos.');
    } else {
      this.actionError = 'No se pudo completar la acción. Intentá de nuevo.';
    }
  }
}
