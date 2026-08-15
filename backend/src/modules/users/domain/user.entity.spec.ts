import { User } from './user.entity';

describe('User', () => {
  it('isActive() returns true for an active user', () => {
    const user = new User('1', 'Admin', 'admin@tg-group.local', 'hash', 'role-1', 'Administrador', 'active');
    expect(user.isActive()).toBe(true);
  });

  it('isActive() returns false for a blocked user', () => {
    const user = new User('1', 'Blocked', 'blocked@tg-group.local', 'hash', 'role-1', 'Comprador', 'blocked');
    expect(user.isActive()).toBe(false);
  });
});
