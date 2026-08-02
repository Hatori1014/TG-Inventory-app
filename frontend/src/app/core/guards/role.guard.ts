import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

// Reinforces RBAC in the UI (hiding routes), but the backend (RolesGuard,
// section 8.2) is the only validation that actually matters — see the
// cross-cutting security note, plan section 7.4.
export const roleGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const allowedRoles = route.data?.['roles'] as string[] | undefined;

  // [PENDING: read the authenticated user's real role from AuthService — Iteration 1]
  const userRole = localStorage.getItem('user_role');

  if (allowedRoles && !allowedRoles.includes(userRole ?? '')) {
    router.navigate(['/login']);
    return false;
  }
  return true;
};
