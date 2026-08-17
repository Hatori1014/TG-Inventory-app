import { Inject, Injectable } from '@nestjs/common';
import {
  PERMISSION_REPOSITORY,
  PermissionRepository,
} from '../../domain/permission.repository.interface';
import { PermissionResponseDto } from '../../dto/permission-response.dto';
import { toPermissionResponseDto } from '../role-response.mapper';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../../../../common/dto/paginated-response.dto';
import { buildPaginatedResponse, toPrismaSkipTake } from '../../../../common/utils/pagination.util';

@Injectable()
export class ListPermissionsUseCase {
  constructor(
    @Inject(PERMISSION_REPOSITORY) private readonly permissionRepository: PermissionRepository,
  ) {}

  async execute(query: PaginationQueryDto): Promise<PaginatedResponseDto<PermissionResponseDto>> {
    const { skip, take } = toPrismaSkipTake(query);
    const { items, total } = await this.permissionRepository.findAllPaginated(skip, take);
    return buildPaginatedResponse(items.map(toPermissionResponseDto), total, query);
  }
}
