import { Injectable } from '@nestjs/common';
import { PersonTypePrismaRepository } from '../../infrastructure/person-type.prisma.repository';
import { PersonTypeResponseDto } from '../../dto/person-type-response.dto';
import { toPersonTypeResponseDto } from '../person-type-response.mapper';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../../../../common/dto/paginated-response.dto';
import { buildPaginatedResponse, toPrismaSkipTake } from '../../../../common/utils/pagination.util';

@Injectable()
export class ListPersonTypesUseCase {
  constructor(private readonly personTypeRepository: PersonTypePrismaRepository) {}

  async execute(query: PaginationQueryDto): Promise<PaginatedResponseDto<PersonTypeResponseDto>> {
    const { skip, take } = toPrismaSkipTake(query);
    const { items, total } = await this.personTypeRepository.findAllPaginated(skip, take);
    return buildPaginatedResponse(items.map(toPersonTypeResponseDto), total, query);
  }
}
