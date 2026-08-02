import { HttpInterceptorFn } from '@angular/common/http';

// HU-01 — attaches the JWT (stored by AuthService after login) to every
// request. Wired up fully in Iteration 1 alongside the backend auth module.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('access_token'); // [PENDING: revisit token storage strategy in Iteration 1]
  if (!token) return next(req);

  const cloned = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });
  return next(cloned);
};
