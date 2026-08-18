import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../services/auth.service';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  roles?: string[];
}

interface NavSection {
  label: string;
  items: NavItem[];
}

// Labels, grouping and role gating match the Claude Design mockup exactly
// (docs/Design/TG Inventory UI.dc.html — the NAV constant), which itself
// mirrors this file's own information architecture: the redesign changes
// how this looks, not what it contains.
const NAV_SECTIONS: NavSection[] = [
  { label: '', items: [{ label: 'Panel principal', path: '/dashboard', icon: 'ph-squares-four' }] },
  {
    label: 'Catálogo',
    items: [
      { label: 'Productos', path: '/products', icon: 'ph-package' },
      { label: 'Categorías', path: '/categories', icon: 'ph-tag' },
      { label: 'Unidades', path: '/units', icon: 'ph-ruler' },
    ],
  },
  {
    label: 'Inventario',
    items: [
      { label: 'Registrar movimiento', path: '/inventory', icon: 'ph-arrows-left-right', roles: ['Administrador'] },
      { label: 'Lotes', path: '/inventory/batches', icon: 'ph-stack', roles: ['Administrador'] },
      { label: 'Stock actual', path: '/inventory/stock', icon: 'ph-list-magnifying-glass' },
    ],
  },
  {
    label: 'Administración',
    items: [
      { label: 'Ubicaciones', path: '/locations', icon: 'ph-map-pin-area', roles: ['Administrador'] },
      { label: 'Roles y permisos', path: '/roles', icon: 'ph-shield-check', roles: ['Administrador'] },
      { label: 'Usuarios', path: '/users', icon: 'ph-users-three', roles: ['Administrador'] },
    ],
  },
];

// First real navigation shell for the app — until now every screen was an
// isolated route only reachable by typing its URL by hand (see
// docs/esp/ui-ux-design-brief.md section 5). TT-24 phase 0 — visual design
// now matches the Claude Design mockup (blue palette, Phosphor icons);
// information architecture (sections/labels/role gating) is unchanged from
// the original functional pass.
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatButtonModule,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly breakpointObserver = inject(BreakpointObserver);

  private readonly isMobile = toSignal(
    this.breakpointObserver.observe('(max-width: 959.98px)').pipe(map((state) => state.matches)),
    { initialValue: false },
  );

  readonly sidenavMode = computed<'over' | 'side'>(() => (this.isMobile() ? 'over' : 'side'));
  readonly sidenavOpened = computed(() => !this.isMobile());

  readonly user = this.authService.user;

  readonly initials = computed(() => {
    const name = this.user()?.name ?? '';
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  });

  readonly sections = computed(() => {
    const role = this.user()?.role ?? '';
    return NAV_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.roles || item.roles.includes(role)),
    })).filter((section) => section.items.length > 0);
  });

  isExactMatch(path: string): boolean {
    // '/inventory' is a path prefix of '/inventory/batches' and
    // '/inventory/stock' — without exact matching, the "Registrar
    // movimiento" link would stay highlighted on those other screens too.
    return path === '/inventory';
  }

  closeIfMobile(sidenav: MatSidenav): void {
    if (this.sidenavMode() === 'over') sidenav.close();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }
}
