// HU-16 — "no se puede solicitar más cantidad de la que hay en stock en
// esa ubicación (validación en backend, no solo UI)", the user's own
// criterion. Pure function, no NestJS/Prisma dependency (ADR-17) — the
// repository sums LocationStock.quantity across batches per
// (productId, locationId); this only decides which requested items
// exceed what's actually available. Convenciones.md's TDD rule applies
// here explicitly ("inventario mal contado" is exactly the class of
// error this exists to prevent), even though the arithmetic itself is
// simple.
export interface ConsumptionAvailabilityCheck {
  productId: string;
  locationId: string;
  requestedQuantity: number;
  availableQuantity: number;
}

export function findInsufficientStockItems(
  checks: ConsumptionAvailabilityCheck[],
): ConsumptionAvailabilityCheck[] {
  return checks.filter((check) => check.requestedQuantity > check.availableQuantity);
}
