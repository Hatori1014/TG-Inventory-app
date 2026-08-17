import { Role } from './role.entity';
import { Permission } from './permission.value-object';

describe('Role', () => {
  describe('hasPermission', () => {
    it('returns true when one of the assigned permissions matches', () => {
      const role = new Role('1', 'Administrador', 'Full access', [
        new Permission('roles', 'read'),
        new Permission('roles', 'create'),
      ]);
      expect(role.hasPermission('roles', 'create')).toBe(true);
    });

    it('returns false when no assigned permission matches', () => {
      const role = new Role('1', 'Comprador', null, [new Permission('suppliers', 'read')]);
      expect(role.hasPermission('roles', 'create')).toBe(false);
    });

    it('returns false when the role has no permissions at all', () => {
      const role = new Role('1', 'Comprador', null, []);
      expect(role.hasPermission('roles', 'create')).toBe(false);
    });
  });

  it('getPermissions() returns a defensive copy, not the internal array', () => {
    const original = [new Permission('roles', 'read')];
    const role = new Role('1', 'Administrador', null, original);

    const permissions = role.getPermissions();
    permissions.push(new Permission('roles', 'create'));

    expect(role.getPermissions()).toHaveLength(1);
  });
});
