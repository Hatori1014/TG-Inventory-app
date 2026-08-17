import { Permission } from './permission.value-object';

describe('Permission', () => {
  it('constructs with a valid module and action', () => {
    const permission = new Permission('roles', 'create');
    expect(permission.getModule()).toBe('roles');
    expect(permission.getAction()).toBe('create');
  });

  it('throws when module is empty', () => {
    expect(() => new Permission('', 'create')).toThrow();
  });

  it('throws when module is only whitespace', () => {
    expect(() => new Permission('   ', 'create')).toThrow();
  });

  it('throws when action is empty', () => {
    expect(() => new Permission('roles', '')).toThrow();
  });

  describe('matches', () => {
    it('returns true when module and action both match', () => {
      const permission = new Permission('roles', 'create');
      expect(permission.matches('roles', 'create')).toBe(true);
    });

    it('returns false when module or action differ', () => {
      const permission = new Permission('roles', 'create');
      expect(permission.matches('roles', 'read')).toBe(false);
      expect(permission.matches('users', 'create')).toBe(false);
    });
  });

  describe('equals', () => {
    it('returns true for two permissions with the same module/action, regardless of id', () => {
      const a = new Permission('roles', 'create', 'id-1');
      const b = new Permission('roles', 'create', 'id-2');
      expect(a.equals(b)).toBe(true);
    });

    it('returns false for permissions with different module/action', () => {
      const a = new Permission('roles', 'create');
      const b = new Permission('roles', 'read');
      expect(a.equals(b)).toBe(false);
    });
  });
});
