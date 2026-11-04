# 13 — Nudito (asistente para familias)

> Estado: retirado · Plan: — · Última actualización: 2026-11-14 (Claude Code: Nudito vuelve como tutor de Khipu Pro)

> **2026-11-14: Nudito vuelve como tutor educativo de Khipu Pro, ver `specs/41-nudito-tutor.md`.** Lo que sigue describe el
> asistente para familias retirado; la ruta `/nudito` se reutilizará para el tutor (specs/41).

**El asistente Nudito para familias fue retirado el 2026-10-31. Su restauración está pendiente de decisión.**
Nudito+ (`specs/28`, `specs/29`), que iba a reemplazarlo, está en pausa y desactivado desde el 2026-11-03.

## Objetivo
El asistente por intenciones para apoderados (incluido antes en el plan «Pro Max») se retiró al pasar a dos planes
institucionales (Khipu Base y Khipu Pro, `specs/03`). No hay reemplazo activo: **Nudito+** está en pausa — desactivado
(`NUDITO_PLUS_DISPONIBLE = false`); el modelo de licencia que paga la familia por Yape se descartó y, si vuelve, será un
producto futuro que contrata el colegio (ver `docs/nudito-plus-viabilidad.md`). Si el asistente se restaura (y en qué
forma) es una decisión pendiente; no se publica ni se vende.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| todos | — | Usar el asistente: no hay widget, ni `/nudito`, ni action (la ruta ya no existe) |

## Flujos
1. Ninguno. La landing ya no presenta Nudito ni Nudito+ (se quitó la sección `#nudito` el 2026-11-03, `specs/25`).

## Reglas de negocio
- `nudito` ya no es una clave de `FEATURES` (`src/lib/planes.ts`); la migración `20261031100000_planes_base_pro` borró sus filas de `plan_modulos`, `tenant_modulos` y `rol_modulos`, y la configuración «nudito:horario».
- Se mantiene la **marca**: el personaje (`NuditoMascota`, `public/marca/nudito.svg`, `font-nudito`, `src/lib/nudito/estado.ts`) y su imagen en los correos de tareas y libretas. Nudito nunca da malas noticias.

## Modelo de datos
`nudito_conversaciones` y `nudito_mensajes` se reutilizan y amplían para Nudito+ (migración `20261031130000_pro_completo_nudito_plus`, ver `specs/29`). `documentos_colegio` queda sin uso (la biblioteca nueva es `documentos`, `specs/31`).

## Contratos de `src/lib/server`
```ts
// Ninguno: src/lib/server/nudito/ se eliminó.
```

## Rutas y UI
- Eliminadas: `/nudito` (historial), `NuditoWidget` (burbuja del apoderado) y el horario de Nudito en la configuración de la plataforma.

## Textos y UX
- Landing: sin mención de Nudito+ ni de pagos de las familias. El personaje Nudito sigue como marca (p. ej. en «Respuestas rápidas»).

## Errores y casos borde
- Un enlace viejo a `/nudito` responde 404.

## Pruebas
- unit: `tests/unit/planes.test.ts` (sin `nudito` en `FEATURES`), `tests/unit/nudito-estado.test.ts` (estado visual del personaje).

## Pendientes
- Decidir si se restaura algún asistente para familias (pendiente de decisión comercial).
- Nudito+ (en pausa): `specs/28-licencias-nudito-plus.md` y `specs/29-nudito-plus-tutor.md`.
