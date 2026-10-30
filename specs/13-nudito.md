# 13 — Nudito (asistente para familias)

> Estado: retirado · Plan: — · Última actualización: 2026-10-31 (Claude Code)

**Retirado 2026-10-31: reemplazado por Nudito+ (por alumno, en preparación).**

## Objetivo
El asistente por intenciones para apoderados (incluido antes en el plan «Pro Max») se retiró al pasar a dos planes
institucionales (Khipu Base y Khipu Pro, `specs/03`). Lo reemplazará **Nudito+**: una licencia opcional **por alumno**,
para colegios con Khipu Pro, que paga la familia. Nudito+ tendrá su propia spec cuando se diseñe.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| todos | — | Usar el asistente: no hay widget, ni `/nudito`, ni action (la ruta ya no existe) |

## Flujos
1. Ninguno. La landing presenta «Nudito+ · próximamente» como complemento opcional por alumno (`specs/25`), sin prometer funciones.

## Reglas de negocio
- `nudito` ya no es una clave de `FEATURES` (`src/lib/planes.ts`); la migración `20261031100000_planes_base_pro` borró sus filas de `plan_modulos`, `tenant_modulos` y `rol_modulos`, y la configuración «nudito:horario».
- Se mantiene la **marca**: el personaje (`NuditoMascota`, `public/marca/nudito.svg`, `font-nudito`, `src/lib/nudito/estado.ts`) y su imagen en los correos de tareas y libretas. Nudito nunca da malas noticias.

## Modelo de datos
Se conservan sin uso, para que Nudito+ las reutilice o rehaga: `nudito_conversaciones`, `nudito_mensajes` y `documentos_colegio`.

## Contratos de `src/lib/server`
```ts
// Ninguno: src/lib/server/nudito/ se eliminó.
```

## Rutas y UI
- Eliminadas: `/nudito` (historial), `NuditoWidget` (burbuja del apoderado) y el horario de Nudito en la configuración de la plataforma.

## Textos y UX
- Landing: «Nudito+ · Próximamente: un complemento opcional que estamos preparando para los colegios con Khipu Pro. Se contrata por alumno y lo paga la familia que lo quiera. No está incluido en ningún plan.»

## Errores y casos borde
- Un enlace viejo a `/nudito` responde 404.

## Pruebas
- unit: `tests/unit/planes.test.ts` (sin `nudito` en `FEATURES`), `tests/unit/nudito-estado.test.ts` (estado visual del personaje).

## Pendientes
- Diseñar Nudito+ (licencia por alumno, pago de la familia) y su spec.
