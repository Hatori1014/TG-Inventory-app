# Design — capturas de referencia de Claude Design

Este directorio guarda **exportaciones de referencia** (capturas, PDF) de los prototipos generados en Claude Design — no los prototipos vivos/editables, que se quedan en el workspace de Claude Design (están ligados a la organización, no al repo).

## Convención de nombres
`[pantalla]-v[n].png` — ej. `login-v1.png`, `dashboard-v2.png`. El número de versión sube cada vez que se re-exporta tras una iteración significativa; no hace falta guardar cada micro-ajuste.

## Flujo
1. Diseñar/iterar en Claude Design
2. Exportar una captura de referencia aquí cuando el usuario funcional lo valide (o antes del checkpoint de UAT del MVP correspondiente)
3. Al implementar: el código real va en `frontend/src/app/features/...` como componentes Angular — este directorio es solo la referencia visual, no se copia el HTML/CSS crudo
