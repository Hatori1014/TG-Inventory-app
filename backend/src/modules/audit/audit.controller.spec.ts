import { Test } from '@nestjs/testing';
import { AuditController } from './audit.controller';
import { ListAuditEventsUseCase } from './application/use-cases/list-audit-events.use-case';

describe('AuditController', () => {
  let controller: AuditController;
  let listAuditEventsUseCase: jest.Mocked<ListAuditEventsUseCase>;

  beforeEach(async () => {
    listAuditEventsUseCase = { execute: jest.fn() } as unknown as jest.Mocked<ListAuditEventsUseCase>;

    const moduleRef = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [{ provide: ListAuditEventsUseCase, useValue: listAuditEventsUseCase }],
    }).compile();

    controller = moduleRef.get(AuditController);
  });

  it('list() delegates to ListAuditEventsUseCase with the query', async () => {
    const expected = { items: [], total: 0, page: 1, pageSize: 20 };
    listAuditEventsUseCase.execute.mockResolvedValue(expected);

    const query = { page: 1, pageSize: 20, entity: 'Role' };
    const result = await controller.list(query);

    expect(listAuditEventsUseCase.execute).toHaveBeenCalledWith(query);
    expect(result).toBe(expected);
  });
});
