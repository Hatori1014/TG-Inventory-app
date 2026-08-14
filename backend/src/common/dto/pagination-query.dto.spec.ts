import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';

function validate(query: Record<string, unknown>) {
  const instance = plainToInstance(PaginationQueryDto, query, { enableImplicitConversion: true });
  return { instance, errors: validateSync(instance) };
}

describe('PaginationQueryDto', () => {
  it('defaults page and pageSize when the client sends nothing', () => {
    const { instance, errors } = validate({});

    expect(errors).toHaveLength(0);
    expect(instance).toEqual({ page: 1, pageSize: 20 });
  });

  it('accepts a valid page/pageSize combination sent as query strings', () => {
    const { instance, errors } = validate({ page: '3', pageSize: '50' });

    expect(errors).toHaveLength(0);
    expect(instance).toEqual({ page: 3, pageSize: 50 });
  });

  it('rejects a pageSize over the 100 cap', () => {
    const { errors } = validate({ pageSize: '101' });

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('pageSize');
  });

  it('rejects a page below 1', () => {
    const { errors } = validate({ page: '0' });

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('page');
  });

  it('rejects a non-integer page', () => {
    const { errors } = validate({ page: '1.5' });

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('page');
  });
});
