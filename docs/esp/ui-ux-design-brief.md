# UI/UX Design Brief

> Fuente: definido con el usuario en esta conversación (paleta de azules, tono profesional, responsive desde el inicio). **Actualizado (2026-08-17)** para reflejar el estado real de MVP1 ya construido — ver sección 5 (gap de navegación, el motivo de esta actualización) y sección 6 (inventario real de pantallas). English version: `ui-ux-design-brief.en.md`.

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

**Logo**: real, en uso desde TT-24 fase 1 (`frontend/public/images/Logo.png`, con link a `https://tgconsultores.net/` en shell y login). Reemplazó al placeholder generado inicialmente.

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

## 5. El gap real a resolver: no existe navegación, solo pantallas sueltas

**Motivo de esta actualización del brief.** MVP1 (HU-01→02→03→06→07→08→09→10→28) ya está construido e implementado de punta a punta, pero **nunca se construyó un shell de navegación**. Hoy, después de iniciar sesión, `/dashboard` es literalmente un `<h1>Bienvenido, {{nombre}}</h1>` sin un solo link — cada pantalla existe como una ruta Angular aislada, y la única forma de llegar a ella es escribiendo la URL a mano en la barra del navegador. Algunos componentes tienen un `<a routerLink="...">` suelto y hecho a mano dentro del propio formulario (ej. el formulario de movimientos de inventario linkea a "Gestionar lotes"/"Consultar stock actual"), pero es ad-hoc, inconsistente entre pantallas, y no es una navegación real.

**Esto es lo primero que Design tiene que resolver**, antes que el detalle visual de cada pantalla individual: un **shell persistente** (`mat-sidenav` + `mat-toolbar`, con el patrón responsive ya definido en la sección 4 — drawer colapsable en mobile/tablet, sidenav persistente en desktop) que envuelve toda la aplicación después del login, con:

- **Menú de navegación consciente del rol**: hoy solo existe el rol "Administrador" con permisos reales sembrados (ver sección 6 para el detalle de qué ve cada quien); el menú debe ocultar entradas a las que el usuario logueado no tiene acceso, no solo redirigir con un error 403 al hacer clic.
- **Indicador de sección activa** (resaltar el ítem del menú correspondiente a la ruta actual).
- **Header con nombre y rol del usuario logueado** (`AuthService.user()` ya expone `name`/`role`) y una acción de **cerrar sesión** visible siempre (hoy no existe ningún botón de logout en ninguna pantalla).
- **Dashboard rediseñado como landing real**, no un saludo vacío: tarjetas/accesos rápidos a los módulos que el rol del usuario puede usar (mismo criterio que el menú), no necesariamente indicadores/métricas todavía (no hay HU de reporting en MVP1).

## 6. Inventario real de pantallas — MVP1 (lo que hay que diseñar ahora)

Reemplaza la tabla genérica de una versión anterior de este brief. Esto es exactamente lo que existe hoy en el código, funcional de punta a punta contra el backend real — es el alcance real para los mockups, no una proyección a futuro.

| Módulo / ruta | Pantallas | Quién la ve (gate actual) | Patrón sugerido |
|---|---|---|---|
| **Login** (`/login`) | Formulario email/contraseña | Público (sin sesión) | Card centrada, sin sidenav — antes del shell |
| **Dashboard** (`/dashboard`) | Landing post-login | Cualquier autenticado | Sidenav + grid de accesos rápidos por rol (ver sección 5) |
| **Roles** (`/roles`) | Listado, alta/edición, asignación de permisos (checkboxes por módulo/acción) | Solo Administrador | `mat-table` con filtro/paginación; formulario en `mat-card`; matriz de permisos como grid de checkboxes agrupado por módulo |
| **Usuarios** (`/users`) | Listado, alta (pide password)/edición (no pide password) | Solo Administrador | `mat-table`; un mismo formulario con dos modos (crear/editar) |
| **Productos** (`/products`) | Listado, alta/edición (con flujo inline "+ crear categoría/unidad" sin salir del formulario) | Lectura: cualquier autenticado. Escritura: según permiso `products:create/update` | `mat-table` con filtro/paginación; formulario con selects + acción inline de creación rápida |
| **Categorías** (`/categories`) | Listado + alta inline + activar/desactivar por fila | Lectura: cualquier autenticado. Escritura: según permiso | Lista simple, sin pantalla de formulario separada — todo en la fila/inline |
| **Unidades** (`/units`) | Listado + alta inline + activar/desactivar por fila | Lectura: cualquier autenticado. Escritura: según permiso | Igual que Categorías |
| **Ubicaciones** (`/locations`) | Listado (jerárquico por `parentId`, armado en el frontend) + alta inline (con selector de ubicación padre) + activar/desactivar | Solo Administrador (lectura y escritura) | Lista con indentación visual por nivel jerárquico; alta inline con selector de padre |
| **Movimientos de inventario** (`/inventory`) | Formulario único para 4 tipos de movimiento: entrada, salida, ajuste (incremento/decremento), traslado entre ubicaciones — campos condicionales según tipo elegido (`direction` solo en ajuste, `destinationLocationId` solo en traslado, selector de lote solo si el producto lo requiere) | Solo Administrador (rol "Admin Inventario" en el plan, no sembrado todavía como rol distinto) | `mat-card` con formulario reactivo; campos condicionales que aparecen/desaparecen según el `type` seleccionado, no pestañas separadas |
| **Lotes** (`/inventory/batches`) | Elegir producto que requiere lote → listar sus lotes → alta inline de lote nuevo (número de lote, fecha de vencimiento) | Solo Administrador | Selector de producto + tabla de lotes del producto elegido |
| **Stock actual** (`/inventory/stock`) | Tabla de stock por producto/ubicación, con dos filtros independientes (por producto, por ubicación) que recargan la tabla | Cualquier autenticado | `mat-table` con dos `mat-select` de filtro arriba; nombres de producto/ubicación (no ids), ya resueltos por el backend |

**Fuera de alcance para esta ronda de mockups** (existen en el plan maestro pero no tienen ni backend ni pantalla real construida todavía — no vale la pena diseñarlos en detalle hasta que arranque su iteración): Proveedores (`/suppliers` es hoy un esqueleto de ruta sin backend, MVP2/HU-04), Alertas de stock bajo, Compras, Solicitudes internas con flujo de aprobación. Si Design quiere adelantar lineamientos generales para esos (no pantallas finales), los patrones ya sugeridos en la sección 1 aplican igual (tablero de alertas en grid de cards, solicitud como stepper, aprobación como detalle con dos acciones).

## 7. Preparación para tema oscuro (HU-30, post-MVP)

Aunque el selector claro/oscuro es post-MVP, el theming se implementa desde el inicio con **tokens de Angular Material (CSS custom properties)**, no colores hardcodeados en los componentes. Esto es una decisión técnica temprana que evita retrabajo: cuando llegue HU-30, alternar tema es cambiar la clase del `<body>`, no reescribir estilos.

## 8. Accesibilidad

- Contraste mínimo WCAG AA: `primary-700` (#0F4C81) sobre blanco cumple (ratio > 7:1); verificar `primary-300` (celeste) antes de usarlo como texto sobre blanco — es mejor para fondos/acentos que para texto pequeño.
- Toda acción disponible por teclado (Angular Material lo da por defecto si no se rompen los componentes nativos).
- Iconos de alerta (`warning`/`error`) siempre acompañados de texto, nunca solo color (por daltonismo).

## 9. Qué NO se definió (fuera de este brief)

- Logo final — placeholder en uso, ver sección 2
- Copys/textos exactos de la UI — se escriben durante la implementación de cada HU
- Pantallas de Proveedores/Alertas/Compras/Solicitudes — ver nota de alcance al final de la sección 6, no tienen backend ni pantalla real construida todavía
