# 33 — Tablero de dirección

> Estado: en construcción · Plan: Khipu Pro (módulo `tablero`) · Última actualización: 2026-10-31 (Claude Code)

## Objetivo
Una vista para dirección con los indicadores del colegio: asistencia y tardanzas, justificaciones pendientes, avance de
notas por curso y periodo, desempeños bajos, tareas, reuniones y uso de la plataforma por las familias.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| dirección | Ver el tablero de todo el colegio | — |
| demás roles | — | Ver el tablero |

## Flujos
1. Dirección abre el tablero y filtra por fechas, nivel y salón.

## Reglas de negocio
- Solo lectura; agrega datos existentes (no tiene tablas propias).
- `requireFeature(ctx, "tablero")`. La clave `tablero` ya está en `plan_modulos` para `pro`; falta en `FEATURES`.
- Nunca muestra conversaciones ni datos de Nudito+ por alumno; a lo más, totales anónimos (por definir).

## Modelo de datos
Sin tablas nuevas. Lee `asistencias`, `justificaciones`, `evaluaciones`, `notas`, `calificaciones_periodo`, `cierres_curso`, `desempenos`/`evaluacion_desempenos` (`specs/30`), `tareas`, `reuniones`/`reunion_invitados` (`specs/32`), `avisos`.

## Contratos de `src/lib/server`
```ts
// por definir: tablero.ts — indicadoresColegio(ctx, { desde, hasta, nivel?, salonId? })
```

## Rutas y UI
- Por definir: `/tablero` (o dentro del inicio de dirección).

## Textos y UX
- Gráficos accesibles; estados con ícono + palabra.

## Errores y casos borde
- Colegios grandes: agregar con `groupBy`/SQL de solo lectura e índices existentes.

## Pruebas
- Por definir.

## Pendientes
- Lista definitiva de indicadores con la dirección del piloto.
