import { Injectable } from '@nestjs/common';
import { MinimumStockPrismaRepository } from '../../infrastructure/minimum-stock.prisma.repository';
import { StockAlertResponseDto } from '../../dto/stock-alert-response.dto';
import { buildStockAlerts } from '../../domain/stock-alert.util';

// HU-12 — "Panel de productos en alerta" (plan section 7.4: GET /alerts).
// Not paginated: the result set is inherently bounded by business meaning
// (products actually below their minimum), not by catalog size, and the
// aggregation (SUM across every location/batch per product) can't be
// pushed into a DB-level LIMIT/OFFSET without raw SQL — same
// scale-based judgment call as the client-side forkJoin counts used
// elsewhere (TT-24 phases 4/6/9) when a catalog is small. Revisit if the
// catalog grows large enough that "everything with a minimum" itself
// becomes a pagination-worthy list.
@Injectable()
export class ListAlertsUseCase {
  constructor(private readonly minimumStockRepository: MinimumStockPrismaRepository) {}

  async execute(): Promise<StockAlertResponseDto[]> {
    const summaries = await this.minimumStockRepository.findAllWithStockSums();
    return buildStockAlerts(summaries);
  }
}
