# UI/UX Design Brief

> Fuente: definido con el usuario en esta conversación (paleta de azules, tono profesional, responsive desde el inicio). English version: `ui-ux-design-brief.en.md`.

## 1. Principios de diseño

- **Densidad media-profesional**: el sistema maneja tablas (inventario, movimientos, compras) que se benefician de mostrar varias filas a la vez, pero los formularios y pantallas de detalle usan espacio en blanco generoso para no abrumar a roles no técnicos (ej. encargados de bodega). No es un dashboard analítico denso, tampoco un sitio de marketing minimalista.
- **Responsive desde el día 1**, no como ajuste posterior — mismo componente, layout adaptado (ver sección 4).
- **Consistencia sobre creatividad**: Angular Material provee los patrones (tablas, formularios, diálogos); no se reinventan componentes custom salvo que Material no cubra el caso.
- **Preparado para tema oscuro desde el inicio del theming**, aunque el HU-30 (modo claro/oscuro) sea post-MVP — ver sección 6.

## 2. Paleta de colores

Definida por el usuario: azules oscuros, claros, celestes y blancos. Traducida a una paleta concreta para Angular Material:

| Token | Hex | Uso |
|---|---|---|
| `primary-900` (azul oscuro) | `#0B3C6B` | Headers, texto sobre fondo claro con alto contraste, sidenav |
| `primary-700` | `#0F4C81` | Color primario base (botones, app-bar, elementos activos) |
| `primary-500` | `#1E6FB5` | Estados hover/focus de elementos primarios |
| `primary-300` (celeste) | `#6FB1E8` | Acentos, iconos secundarios, bordes activos |
| `primary-100` (celeste muy claro) | `#CFE8FB` | Fondos de sección, filas seleccionadas en tablas |
| `surface` (blanco) | `#FFFFFF` | Fondo de tarjetas y formularios |
| `background` | `#F5F8FC` | Fondo general de la app (blanco azulado, no blanco puro) |

**Colores semánticos** (no forzados a la paleta de marca — deben distinguirse claramente por convención universal):
| Token | Hex | Uso |
|---|---|---|
| `success` | `#2E7D32` | Confirmaciones, solicitud aprobada |
| `warning` | `#ED6C02` | Alertas de stock bajo (HU-12) — color central del sistema, úsalo con cuidado en otros contextos para no diluirlo |
| `error` / `warn` (Material) | `#D32F2F` | Errores de validación, solicitud rechazada, bloqueo de cuenta (HU-20) |
| `info` | `#1E6FB5` | Mismo que `primary-500`, para mensajes informativos |

**Logo**: no se definió el logo real todavía — se generó un placeholder (`frontend/public/logo-placeholder.png`, monograma "IC" en la paleta de azules) para no bloquear el desarrollo. Reemplazar antes de MVP 4 (UAT final) o antes si el logo real está listo.

## 3. Tipografía

**Roboto** (fuente por defecto de Angular Material) — no hay razón de negocio para desviarse; Material la optimiza para densidad de datos en tablas y formularios, que es exactamente el caso de uso principal.

| Uso | Tamaño | Peso |
|---|---|---|
| Encabezado de página | 24px | 500 (medium) |
| Encabezado de sección/card | 18px | 500 |
| Cuerpo / celdas de tabla | 14px | 400 |
| Texto secundario / hints | 12px | 400 |

## 4. Estrategia responsive

Un mismo layout se adapta con los breakpoints estándar de Angular CDK (`BreakpointObserver`):

| Breakpoint | Rango | Navegación | Tablas |
|---|---|---|---|
| Mobile | < 600px | Drawer colapsable (hamburguesa) | Se transforman en tarjetas apiladas (una fila = una card) |
| Tablet | 600–960px | Drawer colapsable, más ancho | Tabla con scroll horizontal si hace falta |
| Desktop | > 960px | Sidenav persistente | Tabla completa |

**Regla práctica**: nunca ocultar información en mobile, solo reorganizarla — un encargado de bodega puede estar registrando un movimiento desde el celular en la sala misma.

## 5. Pantallas clave y su patrón de layout

| Pantalla | Patrón |
|---|---|
| Login | Card centrada, sin sidenav |
| Dashboard | Sidenav + grid de accesos por rol (ver `app-flow-diagram.png`) |
| Listados (proveedores, ubicaciones, productos, etc.) | `mat-table` con filtro y paginación; se vuelve lista de `mat-card` en mobile |
| Formularios de creación/edición | `mat-card` centrada, `mat-form-field` con validación inline (Reactive Forms) |
| Panel de alertas | Grid de `mat-card` con `mat-badge` de severidad (color `warning`/`error`) |
| Crear solicitud | `mat-stepper` (selección de producto → cantidad → confirmación) — natural para un flujo de varios pasos |
| Aprobar solicitud | Detalle + dos acciones primarias claras (Aprobar en `success`, Rechazar en `error`) |

## 6. Preparación para tema oscuro (HU-30, post-MVP)

Aunque el selector claro/oscuro es post-MVP, el theming se implementa desde el inicio con **tokens de Angular Material (CSS custom properties)**, no colores hardcodeados en los componentes. Esto es una decisión técnica temprana que evita retrabajo: cuando llegue HU-30, alternar tema es cambiar la clase del `<body>`, no reescribir estilos.

## 7. Accesibilidad

- Contraste mínimo WCAG AA: `primary-700` (#0F4C81) sobre blanco cumple (ratio > 7:1); verificar `primary-300` (celeste) antes de usarlo como texto sobre blanco — es mejor para fondos/acentos que para texto pequeño.
- Toda acción disponible por teclado (Angular Material lo da por defecto si no se rompen los componentes nativos).
- Iconos de alerta (`warning`/`error`) siempre acompañados de texto, nunca solo color (por daltonismo).

## 8. Qué NO se definió (fuera de este brief)

- Mockups pantalla por pantalla (Figma) — este brief da lineamientos, no diseño pixel-perfect
- Logo final — placeholder en uso, ver sección 2
- Copys/textos exactos de la UI — se escriben durante la implementación de cada HU
