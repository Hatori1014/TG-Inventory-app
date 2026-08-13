import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { buildPaginatedResponse, toPrismaSkipTake } from './pagination.util';

describe('toPrismaSkipTake', () => {
  it('maps the first page to skip 0', () => {
    const query = Object.assign(new PaginationQueryDto(), { page: 1, pageSize: 20 });

    expect(toPrismaSkipTake(query)).toEqual({ skip: 0, take: 20 });
  });

  it('maps a later page to the right offset', () => {
    const query = Object.assign(new PaginationQueryDto(), { page: 3, pageSize: 10 });

    expect(toPrismaSkipTake(query)).toEqual({ skip: 20, take: 10 });
  });
});

describe('buildPaginatedResponse', () => {
  it('wraps the items with total/page/pageSize from the query', () => {
    const query = Object.assign(new PaginationQueryDto(), { page: 2, pageSize: 5 });

    expect(buildPaginatedResponse(['a', 'b'], 12, query)).toEqual({
      items: ['a', 'b'],
      total: 12,
      page: 2,
      pageSize: 5,
    });
  });
});
