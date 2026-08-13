import { ConflictException } from '@nestjs/common';
import { withOptimisticLock } from './optimistic-lock.util';

describe('withOptimisticLock', () => {
  it('returns the result on the first successful attempt without retrying', async () => {
    const operation = jest.fn().mockResolvedValue('done');

    const result = await withOptimisticLock(operation);

    expect(result).toBe('done');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('retries when the operation reports a version conflict (null), then succeeds', async () => {
    const operation = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('done');

    const result = await withOptimisticLock(operation);

    expect(result).toBe('done');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('throws ConflictException after exhausting the default max attempts', async () => {
    const operation = jest.fn().mockResolvedValue(null);

    await expect(withOptimisticLock(operation)).rejects.toBeInstanceOf(ConflictException);
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('respects a custom maxAttempts option', async () => {
    const operation = jest.fn().mockResolvedValue(null);

    await expect(withOptimisticLock(operation, { maxAttempts: 5 })).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(operation).toHaveBeenCalledTimes(5);
  });
});
