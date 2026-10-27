# 03 — Planes y permisos

> Estado: implementado · Plan: todos · Última actualización: 2026-10-26 (Claude Code)

## Planes
| Plan | Clave | Funciones |
|---|---|---|
| Básico | `basico` | asistencia, avisos, portería, justificaciones, mensajes, comunicados, gestión |
| Familia (Fase 2) | `fase2` | Básico + notas, libreta, tareas, agenda |
| Pro Max | `promax` | Fase 2 + Nudito |

El mapa vive en `src/lib/planes.ts` (`FEATURES`, `planIncluye`).

## Reglas
- **El bloqueo se valida en el servidor:** `requireFeature(ctx, feature)` (`src/lib/server/plan.ts`) llama a `forbidden()` (403) en páginas, server actions y route handlers.
- La UI solo informa: el mosaico bloqueado muestra 🔒 «Plan Familia» o «Plan Pro Max» (ícono + texto) y no es un enlace.
- Roles por membresía (`direccion`, `profesor`, `apoderado`, `alumno`, `porteria`, `administrativo`), nunca globales.
- **`administrativo`** (personal no docente): Comunicados (crear/editar), Agenda (ver y crear eventos del colegio), Gestión → Alumnos y Familias, y Avisos enviados (solo lectura). NO: profesores, personal, salones, carnets, configuración ni Mensajes. Servidor: `exigirAlumnosFamilias` y listas de roles en cada acción; navegación: `src/lib/navegacion.ts`. `requireRol` / `requireTenantContext(slug, roles)`.
- Mosaicos por rol: `src/lib/navegacion.ts`.

## Pruebas
- unit: `tests/unit/planes.test.ts`.
- e2e: candados en Los Olivos (Básico). Pendiente: acceso directo a `/notas` en Básico → 403.
