import { RequestItemInput } from './request-item-input.value-object';

// Entity with behavior (ADR-17) — canSubmit() is the real business rule of
// what makes a purchase request ready to leave draft/pending-edit state:
// HU-15's own criterion ("requiere al menos un producto y cantidad") plus
// the supplier DoR resolved with the user (chosen by the requester at
// creation time, required to submit — a draft can still be saved without
// one, construction itself never throws). SubmitRequestUseCase asks this
// rather than re-deriving the rule itself.
export class PurchaseRequestSubmission {
  constructor(
    private readonly supplierId: string | null,
    private readonly items: RequestItemInput[],
  ) {}

  canSubmit(): boolean {
    return this.supplierId !== null && this.items.length > 0;
  }
}
