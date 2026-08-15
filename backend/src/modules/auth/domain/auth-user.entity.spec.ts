import { AuthUser } from './auth-user.entity';

describe('AuthUser', () => {
  it('isActive() returns true for an active user', () => {
    const user = new AuthUser('1', 'Admin', 'admin@tg-group.local', 'hash', 'Administrador', 'active');
    expect(user.isActive()).toBe(true);
  });

  it('isActive() returns false for a blocked user', () => {
    const user = new AuthUser('1', 'Admin', 'admin@tg-group.local', 'hash', 'Administrador', 'blocked');
    expect(user.isActive()).toBe(false);
  });
});
