# 03 — Planes y permisos

> Estado: implementado · Plan: todos · Última actualización: 2026-10-27 (Claude Code)

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
- **`alumno`** (cuenta propia del estudiante, la crea dirección o el administrativo; ver `specs/17`): solo lectura de **lo suyo** — Mi asistencia, Notas, Libreta (solo periodos publicados, igual que la familia), Tareas y Agenda de su salón, y Comunicados del colegio y de su salón. NO: Mensajes (el chat es familia ↔ profesor), datos de otros alumnos, gestión, justificar faltas, preferencias de avisos, descargar el PDF de la libreta (`/api/libreta` lo niega) ni **Nudito** (decisión de protección de menores: el asistente conversa solo con adultos responsables; ver `specs/13`). Servidor primero: `alumnoIdsVisibles`/`salonIdsVisibles` devuelven solo su alumno y su salón (`alumnoDeLaCuenta`: `Alumno.cuentaId` = su membresía y alumno activo); las vistas de familia se reutilizan con un solo alumno (`esVistaFamilia` en `src/lib/roles.ts`). Respeta el plan: notas, libreta, tareas y agenda son Fase 2.
- Mosaicos por rol: `src/lib/navegacion.ts`.
- **Código HTTP de una página denegada:** las rutas con `loading.tsx` (pantallas de carga) empiezan a transmitir antes de que corra el chequeo, así que una página denegada puede responder **200** mostrando la página 403 («No tienes acceso a esta sección») sin ningún dato del módulo. Las rutas de API y las server actions sí devuelven 403. En e2e se usa `tests/e2e/sin-acceso.ts` (`esperarSinAcceso`).

## Pruebas
- unit: `tests/unit/planes.test.ts`.
- integración: `tests/integracion/rol-alumno.test.ts` (alcance del alumno: no ve notas, asistencia ni libreta de compañeros; ve sus tareas; sin mensajes ni gestión) · e2e: `tests/e2e/rol-alumno.test.ts`.
- e2e: candados en Los Olivos (Básico) y acceso directo a `/notas` en Básico → página 403 (`notas-libreta.test.ts`).
