import { ListAlertsUseCase } from './list-alerts.use-case';
import { MinimumStockPrismaRepository } from '../../infrastructure/minimum-stock.prisma.repository';

describe('ListAlertsUseCase', () => {
  let useCase: ListAlertsUseCase;
  let repository: jest.Mocked<MinimumStockPrismaRepository>;

  beforeEach(() => {
    repository = {
      findAllWithStockSums: jest.fn(),
    } as unknown as jest.Mocked<MinimumStockPrismaRepository>;
    useCase = new ListAlertsUseCase(repository);
  });

  it('returns only the products below (or at) their minimum, most urgent first', async () => {
    repository.findAllWithStockSums.mockResolvedValue([
      { productId: 'p1', productName: 'Arroz', minimumQuantity: 10, totalQuantity: 9 },
      { productId: 'p2', productName: 'Agua', minimumQuantity: 20, totalQuantity: 25 },
    ]);

    const result = await useCase.execute();

    expect(result).toEqual([
      { productId: 'p1', productName: 'Arroz', minimumQuantity: 10, totalQuantity: 9, deficit: -1 },
    ]);
  });

  it('returns an empty array when nothing is in alert', async () => {
    repository.findAllWithStockSums.mockResolvedValue([]);

    expect(await useCase.execute()).toEqual([]);
  });
});
