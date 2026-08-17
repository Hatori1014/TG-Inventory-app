import { decodeJwtPayload, isJwtExpired } from './jwt.util';

function fakeJwt(payload: object): string {
  const base64url = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${base64url({ alg: 'HS256' })}.${base64url(payload)}.signature`;
}

describe('decodeJwtPayload', () => {
  it('decodes a well-formed token payload', () => {
    const token = fakeJwt({ sub: '1', email: 'admin@tg-group.local', role: 'Administrador' });
    const claims = decodeJwtPayload<{ sub: string; email: string; role: string }>(token);
    expect(claims).toEqual({ sub: '1', email: 'admin@tg-group.local', role: 'Administrador' });
  });

  it('returns null for a malformed token', () => {
    expect(decodeJwtPayload('not-a-jwt')).toBeNull();
  });
});

describe('isJwtExpired', () => {
  it('returns false when there is no exp claim', () => {
    expect(isJwtExpired({})).toBe(false);
  });

  it('returns false for a future exp', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    expect(isJwtExpired({ exp: futureExp })).toBe(false);
  });

  it('returns true for a past exp', () => {
    const pastExp = Math.floor(Date.now() / 1000) - 3600;
    expect(isJwtExpired({ exp: pastExp })).toBe(true);
  });
});
