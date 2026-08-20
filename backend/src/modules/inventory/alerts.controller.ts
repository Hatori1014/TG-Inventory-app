import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ListAlertsUseCase } from './application/use-cases/list-alerts.use-case';
import { StockAlertResponseDto } from './dto/stock-alert-response.dto';

// HU-12 — plan section 7.4: GET /alerts, "cualquier autenticado" — no
// @RequirePermission(), same criterion as GET /inventory/stock (HU-10).
// Own top-level route (not /inventory/alerts) per the plan's own endpoint
// table; lives in the inventory module anyway, same reasoning as
// SupplierPurchaseHistoryController/PriceComparisonController living
// outside their URL's own module in HU-05/HU-14 — the capability
// (MinimumStockPrismaRepository) belongs here.
@ApiTags('alerts')
@Controller('alerts')
export class AlertsController {
  constructor(private readonly listAlertsUseCase: ListAlertsUseCase) {}

  @Get()
  list(): Promise<StockAlertResponseDto[]> {
    return this.listAlertsUseCase.execute();
  }
}
