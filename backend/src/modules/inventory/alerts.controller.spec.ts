import { Test } from '@nestjs/testing';
import { AlertsController } from './alerts.controller';
import { ListAlertsUseCase } from './application/use-cases/list-alerts.use-case';

describe('AlertsController', () => {
  let controller: AlertsController;
  let listAlertsUseCase: jest.Mocked<ListAlertsUseCase>;

  beforeEach(async () => {
    listAlertsUseCase = { execute: jest.fn() } as unknown as jest.Mocked<ListAlertsUseCase>;

    const moduleRef = await Test.createTestingModule({
      controllers: [AlertsController],
      providers: [{ provide: ListAlertsUseCase, useValue: listAlertsUseCase }],
    }).compile();

    controller = moduleRef.get(AlertsController);
  });

  it('list() delegates to ListAlertsUseCase', async () => {
    const expected = [{ productId: 'p1', productName: 'Arroz', minimumQuantity: 10, totalQuantity: 9, deficit: -1 }];
    listAlertsUseCase.execute.mockResolvedValue(expected);

    const result = await controller.list();

    expect(listAlertsUseCase.execute).toHaveBeenCalled();
    expect(result).toBe(expected);
  });
});
