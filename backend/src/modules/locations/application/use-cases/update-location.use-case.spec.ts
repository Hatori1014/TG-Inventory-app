import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { UpdateLocationUseCase } from './update-location.use-case';
import { LocationPrismaRepository } from '../../infrastructure/location.prisma.repository';

describe('UpdateLocationUseCase', () => {
  let useCase: UpdateLocationUseCase;
  let repository: jest.Mocked<LocationPrismaRepository>;

  const existingLocation = { id: '1', name: 'Sala A', parentId: 'root', status: 'active' as const };

  beforeEach(() => {
    repository = {
      findAllPaginated: jest.fn(),
      findById: jest.fn(),
      findByParentAndName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<LocationPrismaRepository>;
    useCase = new UpdateLocationUseCase(repository);
  });

  it('throws BadRequestException when no fields are provided', async () => {
    await expect(useCase.execute('1', {})).rejects.toThrow(BadRequestException);
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the location does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing', { status: 'inactive' })).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when parentId is the location itself', async () => {
    repository.findById.mockResolvedValue(existingLocation);

    await expect(useCase.execute('1', { parentId: '1' })).rejects.toThrow(BadRequestException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('deactivates a location that has stock associated — status toggle, never a delete', async () => {
    repository.findById.mockResolvedValue(existingLocation);
    repository.update.mockResolvedValue({ ...existingLocation, status: 'inactive' });

    const result = await useCase.execute('1', { status: 'inactive' });

    expect(repository.update).toHaveBeenCalledWith('1', { status: 'inactive' });
    expect(result.status).toBe('inactive');
  });

  it('allows renaming without triggering its own duplicate check', async () => {
    repository.findById.mockResolvedValue(existingLocation);
    repository.findByParentAndName.mockResolvedValue(existingLocation);
    repository.update.mockResolvedValue({ ...existingLocation, name: 'Sala A' });

    await useCase.execute('1', { name: 'Sala A' });

    expect(repository.update).toHaveBeenCalledWith('1', { name: 'Sala A' });
  });

  it('throws ConflictException when the new name collides with a sibling under the same parent', async () => {
    repository.findById.mockResolvedValue(existingLocation);
    repository.findByParentAndName.mockResolvedValue({ id: 'other', name: 'Sala B', parentId: 'root', status: 'active' });

    await expect(useCase.execute('1', { name: 'Sala B' })).rejects.toThrow(ConflictException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when the new parentId does not exist (P2003)', async () => {
    repository.findById.mockResolvedValue(existingLocation);
    repository.findByParentAndName.mockResolvedValue(null);
    repository.update.mockRejectedValue({ code: 'P2003' });

    await expect(useCase.execute('1', { parentId: 'missing' })).rejects.toThrow(BadRequestException);
  });
});
