import { isUniqueConstraintViolation } from './prisma-error.util';

describe('isUniqueConstraintViolation', () => {
  it('returns true for an error with Prisma code P2002', () => {
    expect(isUniqueConstraintViolation({ code: 'P2002' })).toBe(true);
  });

  it('returns false for an error with a different code', () => {
    expect(isUniqueConstraintViolation({ code: 'P2025' })).toBe(false);
  });

  it('returns false for non-object values', () => {
    expect(isUniqueConstraintViolation('not an error')).toBe(false);
    expect(isUniqueConstraintViolation(null)).toBe(false);
    expect(isUniqueConstraintViolation(undefined)).toBe(false);
  });

  it('returns false for a plain Error without a code', () => {
    expect(isUniqueConstraintViolation(new Error('boom'))).toBe(false);
  });
});
