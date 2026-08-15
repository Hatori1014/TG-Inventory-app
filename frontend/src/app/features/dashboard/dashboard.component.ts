import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

// HU-01 — placeholder landing screen for every role post-login. No feature
// screens exist per-role yet (only /suppliers); this is where "redirects
// according to role" points until real per-role screens land in later HUs.
@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
    <h1>Bienvenido, {{ authService.user()?.name }}</h1>
    <p>Rol: {{ authService.user()?.role }}</p>
  `,
})
export class DashboardComponent {
  authService = inject(AuthService);
}
