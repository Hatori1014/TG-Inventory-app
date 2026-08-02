# Flujo de trabajo

> Fuente: `plan-inicial-proyecto-inventario.md` (secciones 1, 6, 8.1, 9). El pipeline de CI/CD real (TT-07, TT-08) todavía no está configurado — esto describe el flujo *diseñado*. English version: `workflow.en.md`.

## Pasos para hacer un cambio

1. Tomar una HU (o TT) del backlog que cumpla la **Definition of Ready**: criterios de aceptación claros, diseño de UI si aplica, dependencias técnicas identificadas.
2. Crear una rama `feature/hu-XX-slug` o `feature/tt-XX-slug` desde `staging` (ver `convenciones.md` — Gitflow simplificado).
3. Moverla a "En progreso" en el tablero de Trello (WIP limit: 1-2 HU a la vez).
4. Si la lógica es crítica (dinero, inventario, acceso) → escribir el test primero (TDD) o el escenario Gherkin primero (BDD). Si es una pantalla simple → código directo + test E2E básico.
5. Implementar siguiendo la arquitectura hexagonal del módulo correspondiente (domain → application → infrastructure) — ver `arquitectura.md` y `convenciones.md`. Recordar: código en inglés, UI en español.
6. Commit siguiendo Conventional Commits, en inglés (ver `convenciones.md`).
7. Abrir PR contra `staging`. Requiere CI en verde para poder mergear (branch protection). Con un solo desarrollador, la revisión es autorevisión con checklist.

## Checklist de "terminado" (Definition of Done, por HU)

- [ ] Código escrito y autorrevisado (checklist personal)
- [ ] Tests unitarios y/o BDD pasando
- [ ] Desplegado en ambiente `staging`
- [ ] Autovalidado contra los criterios de aceptación de la HU

**Nota**: la validación del usuario funcional (VoBo) **no ocurre por HU individual**, sino al cierre de cada MVP (ver sección de MVP más abajo).

## Checklist de cierre de iteración

- [ ] Revisión personal: ¿la HU cumple los criterios de aceptación?
- [ ] Corregir errores encontrados **antes de avanzar a la siguiente iteración** — no se acumulan
- [ ] Dejar un commit desplegado y funcional en `staging`, aunque sea pequeño

## Checklist de cierre de MVP (UAT)

- [ ] Guía de pruebas entregada al usuario funcional, basada en las HU y criterios de aceptación de ese bloque de MVP
- [ ] Ambiente de staging con datos de ejemplo realistas (acumulativos entre MVPs)
- [ ] Canal trazable para que el usuario reporte hallazgos (hoja de cálculo o issues de GitHub)
- [ ] VoBo se otorga cuando **todas las HU del MVP** pasan el checklist
- [ ] Ajustes encontrados se corrigen antes de iniciar el siguiente MVP

## Deploy

Diseñado (no configurado todavía — TT-07/TT-08):
- PR aprobado y con CI en verde → merge a `staging` → deploy automático a **staging** (auto-deploy nativo de Vercel/Render, sección 9.2)
- PR de `staging` a `main` (al cerrar un MVP con VoBo) → deploy automático a **producción**

[PENDIENTE: comandos exactos de deploy, nombres reales de los servicios en Render/Fly.io/Vercel una vez se ejecuten las tareas técnicas TT-03 a TT-06]
