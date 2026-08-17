import { Inject, Injectable } from '@nestjs/common';
import { ROLE_REPOSITORY, RoleRepository } from '../../domain/role.repository.interface';
import { RoleResponseDto } from '../../dto/role-response.dto';
import { toRoleResponseDto } from '../role-response.mapper';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../../../../common/dto/paginated-response.dto';
import { buildPaginatedResponse, toPrismaSkipTake } from '../../../../common/utils/pagination.util';

@Injectable()
export class ListRolesUseCase {
  constructor(@Inject(ROLE_REPOSITORY) private readonly roleRepository: RoleRepository) {}

  async execute(query: PaginationQueryDto): Promise<PaginatedResponseDto<RoleResponseDto>> {
    const { skip, take } = toPrismaSkipTake(query);
    const { items, total } = await this.roleRepository.findAllPaginated(skip, take);
    return buildPaginatedResponse(items.map(toRoleResponseDto), total, query);
  }
}
