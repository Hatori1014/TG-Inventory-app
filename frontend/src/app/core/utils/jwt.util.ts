// Decodes a JWT payload client-side without pulling in a dependency
// (jwt-decode) for one line of logic. Never validates the signature — that
// only matters server-side; the client only reads claims it already
// received back from a successful login.
export function decodeJwtPayload<T>(token: string): T | null {
  const payload = token.split('.')[1];
  if (!payload) return null;

  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((char) => '%' + char.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export function isJwtExpired(payload: { exp?: number }): boolean {
  if (!payload.exp) return false;
  return Date.now() >= payload.exp * 1000;
}
