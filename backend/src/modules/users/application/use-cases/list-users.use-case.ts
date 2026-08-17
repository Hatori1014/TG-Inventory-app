import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from '../../domain/user.repository.interface';
import { UserResponseDto } from '../../dto/user-response.dto';
import { toUserResponseDto } from '../user-response.mapper';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../../../../common/dto/paginated-response.dto';
import { buildPaginatedResponse, toPrismaSkipTake } from '../../../../common/utils/pagination.util';

@Injectable()
export class ListUsersUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: UserRepository) {}

  async execute(query: PaginationQueryDto): Promise<PaginatedResponseDto<UserResponseDto>> {
    const { skip, take } = toPrismaSkipTake(query);
    const { items, total } = await this.userRepository.findAllPaginated(skip, take);
    return buildPaginatedResponse(items.map(toUserResponseDto), total, query);
  }
}
