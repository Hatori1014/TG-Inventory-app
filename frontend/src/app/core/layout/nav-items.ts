export interface NavItem {
  label: string;
  path: string;
  icon: string;
  description: string;
  roles?: string[];
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

// Single source of truth for the app's navigation — ShellComponent (the
// sidenav menu) and DashboardComponent (the quick-access grid) both read
// this instead of keeping their own copies. Labels, grouping, icons and
// descriptions match the Claude Design mockup exactly (docs/Design/TG
// Inventory UI.dc.html — the NAV constant and its `accesos` description
// map), which itself mirrors this app's real routes/role gates.
export const NAV_SECTIONS: NavSection[] = [
  {
    label: '',
    items: [
      {
        label: 'Panel principal',
        path: '/dashboard',
        icon: 'ph-squares-four',
        description: 'Volvé al panel principal.',
      },
    ],
  },
  {
    label: 'Catálogo',
    items: [
      {
        label: 'Productos',
        path: '/products',
        icon: 'ph-package',
        description: 'Catálogo de productos, con su unidad y categoría.',
      },
      {
        label: 'Categorías',
        path: '/categories',
        icon: 'ph-tag',
        description: 'Administrá las categorías que agrupan productos.',
      },
      {
        label: 'Unidades',
        path: '/units',
        icon: 'ph-ruler',
        description: 'Administrá las unidades de manejo.',
      },
    ],
  },
  {
    label: 'Inventario',
    items: [
      {
        label: 'Registrar movimiento',
        path: '/inventory',
        icon: 'ph-arrows-left-right',
        description: 'Registrá entradas, salidas, ajustes y traslados.',
        roles: ['Administrador'],
      },
      {
        label: 'Lotes',
        path: '/inventory/batches',
        icon: 'ph-stack',
        description: 'Cargá lotes y vencimientos de los productos que lo requieren.',
        roles: ['Administrador'],
      },
      {
        label: 'Stock actual',
        path: '/inventory/stock',
        icon: 'ph-list-magnifying-glass',
        description: 'Consultá existencias por producto y ubicación.',
      },
      {
        label: 'Stock mínimo',
        path: '/inventory/minimum-stock',
        icon: 'ph-warning',
        description: 'Definí el umbral mínimo de stock por producto.',
        roles: ['Administrador'],
      },
      {
        label: 'Alertas',
        path: '/alerts',
        icon: 'ph-bell-ringing',
        description: 'Panel de productos por debajo de su mínimo.',
      },
    ],
  },
  {
    // HU-04, first MVP2 screen — grows with Compras (HU-13/05) and
    // Comparativa de precios (HU-14) as those HUs land.
    label: 'Compras',
    items: [
      {
        label: 'Proveedores',
        path: '/suppliers',
        icon: 'ph-truck',
        description: 'Registrá y administrá proveedores.',
        roles: ['Administrador'],
      },
      {
        label: 'Compras',
        path: '/purchases',
        icon: 'ph-shopping-cart-simple',
        description: 'Registrá compras a proveedores y consultá el histórico.',
        roles: ['Administrador'],
      },
      {
        label: 'Tipos de documento',
        path: '/document-types',
        icon: 'ph-identification-card',
        description: 'Catálogo de tipos de documento (cédula, NIT, etc.).',
        roles: ['Administrador'],
      },
      {
        label: 'Tipos de persona',
        path: '/person-types',
        icon: 'ph-users',
        description: 'Catálogo de tipos de persona (natural, jurídica).',
        roles: ['Administrador'],
      },
      {
        label: 'Comparativa de precios',
        path: '/purchases/price-comparison',
        icon: 'ph-chart-line',
        description: 'Compará precios de compra entre proveedores.',
        roles: ['Administrador'],
      },
    ],
  },
  {
    // HU-15, first MVP4 screen — grows with consumo (HU-16) y
    // aprobación (HU-17) as those HUs land.
    label: 'Solicitudes',
    items: [
      {
        label: 'Mis solicitudes',
        path: '/requests',
        icon: 'ph-clipboard-text',
        description: 'Creá y seguí tus solicitudes de compra.',
        roles: ['Administrador'],
      },
    ],
  },
  {
    label: 'Administración',
    items: [
      {
        label: 'Ubicaciones',
        path: '/locations',
        icon: 'ph-map-pin-area',
        description: 'Bodegas, salas y estantes en jerarquía.',
        roles: ['Administrador'],
      },
      {
        label: 'Roles y permisos',
        path: '/roles',
        icon: 'ph-shield-check',
        description: 'Roles y su matriz de permisos por módulo.',
        roles: ['Administrador'],
      },
      {
        label: 'Usuarios',
        path: '/users',
        icon: 'ph-users-three',
        description: 'Altas, edición y bloqueo de cuentas.',
        roles: ['Administrador'],
      },
    ],
  },
];

export function visibleSections(role: string | undefined): NavSection[] {
  const r = role ?? '';
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.roles || item.roles.includes(r)),
  })).filter((section) => section.items.length > 0);
}
