// HU-07 scope: flat ids only ("GET /inventory/stock básico" — deliberately
// deferred, see PROJECT-STATUS.md). HU-10 owns enriching this with nested
// product/location details, filters, and its own frontend screen.
export interface StockResponseDto {
  id: string;
  productId: string;
  locationId: string;
  batchId: string | null;
  quantity: number;
}
