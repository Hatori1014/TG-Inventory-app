import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
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

const NAV_SECTIONS: NavSection[] = [
  { label: '', items: [{ label: 'Panel principal', path: '/dashboard', icon: 'dashboard' }] },
  {
    label: 'Catálogo',
    items: [
      { label: 'Productos', path: '/products', icon: 'inventory_2' },
      { label: 'Categorías', path: '/categories', icon: 'category' },
      { label: 'Unidades', path: '/units', icon: 'straighten' },
    ],
  },
  {
    label: 'Inventario',
    items: [
      { label: 'Registrar movimiento', path: '/inventory', icon: 'swap_horiz', roles: ['Administrador'] },
      { label: 'Lotes', path: '/inventory/batches', icon: 'inventory', roles: ['Administrador'] },
      { label: 'Stock actual', path: '/inventory/stock', icon: 'list_alt' },
    ],
  },
  {
    label: 'Administración',
    items: [
      { label: 'Ubicaciones', path: '/locations', icon: 'store', roles: ['Administrador'] },
      { label: 'Roles y permisos', path: '/roles', icon: 'admin_panel_settings', roles: ['Administrador'] },
      { label: 'Usuarios', path: '/users', icon: 'group', roles: ['Administrador'] },
    ],
  },
];

// First real navigation shell for the app — until now every screen was an
// isolated route only reachable by typing its URL by hand (see
// docs/esp/ui-ux-design-brief.md section 5). Deliberately built with a
// stock Angular Material theme, not the final blue palette from the brief —
// that swap happens once the Claude Design mockups land.
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
    MatIconModule,
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
