import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Reinforces RBAC in the UI (hiding routes), but the backend (RolesGuard,
// section 8.2) is the only validation that actually matters — see the
// cross-cutting security note, plan section 7.4.
export const roleGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  const allowedRoles = route.data?.['roles'] as string[] | undefined;
  const userRole = authService.user()?.role;

  if (allowedRoles && !allowedRoles.includes(userRole ?? '')) {
    router.navigate(['/login']);
    return false;
  }
  return true;
};
