import { ReassignUsersRoleUseCase } from './reassign-users-role.use-case';
import { UserRepository } from '../../domain/user.repository.interface';

describe('ReassignUsersRoleUseCase', () => {
  it('delegates to the repository and returns the reassigned count', async () => {
    const repository = { reassignRole: jest.fn().mockResolvedValue(4) } as unknown as jest.Mocked<UserRepository>;
    const useCase = new ReassignUsersRoleUseCase(repository);

    const result = await useCase.execute('role-old', 'role-default');

    expect(repository.reassignRole).toHaveBeenCalledWith('role-old', 'role-default');
    expect(result).toBe(4);
  });
});
