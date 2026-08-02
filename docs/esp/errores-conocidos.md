# Errores conocidos

> Fuente: `plan-inicial-proyecto-inventario.md`. **Este documento no puede tener contenido real todavía** — un "gotcha" se detecta en código, tests o comentarios que existen y fallan de una forma específica; el repositorio en GitHub aún no se ha creado (TT-01 pendiente), aunque ya existe un esqueleto de código local (Iteración 0) con el health-check y la migración de Prisma verificados. English version: `known-issues.en.md`.

[PENDIENTE: este archivo debe regenerarse a partir del código, tests y comentarios reales una vez avance la implementación de HU de negocio (Iteración 1 en adelante).]

## Riesgos de diseño anticipados (no son bugs — son puntos frágiles señalados durante la planeación)

Esto es distinto a un "error conocido" real, pero se incluye porque el documento de planeación sí identificó explícitamente estos puntos como propensos a fallar si no se implementan con cuidado:

- **`LocationStock` puede desincronizarse de `InventoryMovement`** si una implementación futura actualiza el stock sin pasar por la misma transacción del movimiento. El diseño asume que `InventoryMovement` siempre gana en caso de inconsistencia, pero eso requiere que el código lo respete — no es automático.
- **Validación de `requiresBatch` fácil de omitir**: como es condicional por producto (no todos los productos lo requieren), un DTO o formulario que no valide bien esta bandera podría permitir crear un lote para un producto que no lo requiere, o al revés, permitir un movimiento sin lote para un producto que sí lo requiere.
- **Rate limiting (HU-20) mal calibrado podría bloquear al propio usuario funcional** durante la fase de UAT, si los intentos fallidos de login por error humano superan el umbral — vale la pena revisar el umbral antes de cada checkpoint de UAT.
- **Los estimados de cronograma (sección 6) son supuestos, no medidos**: el documento ya advierte que deben recalibrarse después del cierre de la Iteración 1, cuando haya una medida real del ritmo de trabajo del desarrollador.

[PENDIENTE: todo lo demás — cualquier gotcha real de librerías (versiones de NestJS/Angular/Prisma con bugs conocidos), configuración de Cloudflare R2, límites reales de las capas gratuitas alcanzados en la práctica, etc. — solo se puede documentar una vez exista implementación de negocio]
