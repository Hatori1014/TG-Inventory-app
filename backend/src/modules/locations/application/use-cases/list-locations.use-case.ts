import { Injectable } from '@nestjs/common';
import { LocationPrismaRepository } from '../../infrastructure/location.prisma.repository';
import { LocationResponseDto } from '../../dto/location-response.dto';
import { toLocationResponseDto } from '../location-response.mapper';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../../../../common/dto/paginated-response.dto';
import { buildPaginatedResponse, toPrismaSkipTake } from '../../../../common/utils/pagination.util';

@Injectable()
export class ListLocationsUseCase {
  constructor(private readonly locationRepository: LocationPrismaRepository) {}

  async execute(query: PaginationQueryDto): Promise<PaginatedResponseDto<LocationResponseDto>> {
    const { skip, take } = toPrismaSkipTake(query);
    const { items, total } = await this.locationRepository.findAllPaginated(skip, take);
    return buildPaginatedResponse(items.map(toLocationResponseDto), total, query);
  }
}
