import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { visibleSections } from '../../core/layout/nav-items';

// HU-01 — landing screen for every role post-login. TT-24 phase 1 — was a
// bare welcome message with zero links; now a real landing page matching
// the Claude Design mockup (docs/Design/TG Inventory UI.dc.html): a quick
// access grid built from the same NAV_SECTIONS the sidenav uses, so it's
// never out of sync with what the shell actually offers. No metrics/
// indicators — MVP1 has no reporting story yet (see the info panel below
// the grid), that's what HU-12 eventually fills in here.
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private readonly authService = inject(AuthService);

  readonly user = this.authService.user;

  readonly firstName = computed(() => this.user()?.name?.trim().split(/\s+/)[0] ?? '');

  readonly accesos = computed(() =>
    visibleSections(this.user()?.role)
      .flatMap((section) => section.items)
      .filter((item) => item.path !== '/dashboard'),
  );
}
