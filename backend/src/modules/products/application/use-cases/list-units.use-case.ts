import { Injectable } from '@nestjs/common';
import { UnitPrismaRepository } from '../../infrastructure/unit.prisma.repository';
import { UnitResponseDto } from '../../dto/unit-response.dto';
import { toUnitResponseDto } from '../unit-response.mapper';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../../../../common/dto/paginated-response.dto';
import { buildPaginatedResponse, toPrismaSkipTake } from '../../../../common/utils/pagination.util';

@Injectable()
export class ListUnitsUseCase {
  constructor(private readonly unitRepository: UnitPrismaRepository) {}

  async execute(query: PaginationQueryDto): Promise<PaginatedResponseDto<UnitResponseDto>> {
    const { skip, take } = toPrismaSkipTake(query);
    const { items, total } = await this.unitRepository.findAllPaginated(skip, take);
    return buildPaginatedResponse(items.map(toUnitResponseDto), total, query);
  }
}
