# 03 — Planes y permisos

> Estado: implementado · Plan: todos · Última actualización: 2026-11-14 (Claude Code, Dev D: Nudito, tutor de práctica, incluido en Khipu Pro; licencias familiares inertes)

## Planes
| Plan | Clave | Funciones |
|---|---|---|
| Khipu Base | `base` | asistencia, avisos, portería, justificaciones, mensajes, comunicados, gestión, horario (specs/34) y soporte (mesa de ayuda) |
| Khipu Pro | `pro` | Khipu Base + notas, libreta, tareas, agenda, `documentos` (specs/31), `reuniones` (specs/32), `tablero` (specs/33) y **Nudito, tutor de práctica** (clave `nudito_plus`, specs/41–44): implementados, en `FEATURES` (`src/lib/planes.ts`) y en `plan_modulos` para `pro` (migración `20261031130000_pro_completo_nudito_plus`) |

Decisión del 2026-10-30: solo hay **dos planes institucionales** y se venden completos (no se venden módulos sueltos).
El mecanismo interno de ajustes por colegio (`tenant_modulos`) se mantiene para pilotos y casos puntuales del equipo.
Las claves anteriores se migraron en `20261031100000_planes_base_pro`: `basico` → `base`, `fase2` → `pro` y `promax` → `pro`.
El asistente Nudito para familias se retiró (ver `specs/13`). Desde el 2026-11-14 **Nudito es el tutor de práctica de
Khipu Pro** (specs/41–44), no un producto aparte: `NUDITO_TUTOR_DISPONIBLE = true` (`src/lib/planes.ts`; el nombre antiguo
`NUDITO_PLUS_DISPONIBLE` y `nuditoPlusDisponible()` apuntan a él) deja el módulo fijo `nudito_plus` activo en todo colegio
Pro, y cada colegio lo enciende en `/configuracion/nudito` (`nudito_config_colegio.activo`, sin fila = apagado). Las
licencias familiares con Yape (`specs/28`) quedan **inertes** con `NUDITO_LICENCIAS_FAMILIARES = false` (solo en tests se
pueden forzar con `KHIPU_TEST_NUDITO_LICENCIAS=1`, `licenciasFamiliaresNudito()`). No hay precio aparte ni cobro a familias.

**Modelo comercial (2026-11-03):** SaaS B2B, paga el colegio; solo Khipu Base y Khipu Pro. No hay precios aprobados: no
se publican tarifas (la landing usa `PUBLICAR_PRECIOS = false`, `specs/25`). Piloto con 1–2 colegios, 6 a 8 semanas,
gratis y sin cobro automático.
Los avisos salen solo por correo y Web Push (WhatsApp y SMS se retiraron; ver `specs/06`). Khipu Base incluye además las **notificaciones dentro de Khipu** (bandeja `/notificaciones`, módulo `avisos`, specs/38).

**Fuente de verdad: la base de datos** (`planes_catalogo` + `plan_modulos`, editables en el panel de plataforma
`/planes`; ver `specs/19-planes-modulos-y-roles.md`). La tabla de arriba es la configuración sembrada y el **respaldo en
código** (`FEATURES` en `src/lib/planes.ts`) que se usa si un plan no tiene filas en `plan_modulos`. Además, cada colegio
puede tener módulos extra o quitados (`tenant_modulos`) y cada rol puede tener módulos desactivados en todos los colegios
(`rol_modulos`). `gestion` es esencial y nunca se quita.

## Reglas
- **El bloqueo se valida en el servidor:** `requireFeature(ctx, feature)` (`src/lib/server/plan.ts`) llama a `forbidden()` (403) en páginas, server actions y route handlers. Usa `ctx.modulos` (plan ± ajustes del colegio, resuelto en `resolverContextoColegio`) y los módulos desactivados para el rol (`ctx.accesoModulos.quitadosRol`).
- La UI solo informa (`estadoModulo(ctx, f)`): el mosaico de un módulo que no está en el plan muestra 🔒 «Plan <nombre del plan mínimo que lo incluye según el catálogo>» (ícono + texto; en Khipu Base: «Plan Khipu Pro») y no es un enlace; si ningún plan lo incluye, se oculta; un módulo quitado al colegio o al rol no se muestra.
- Roles por membresía (`direccion`, `profesor`, `apoderado`, `alumno`, `porteria`, `administrativo`), nunca globales.
- **`administrativo`** (personal no docente): Comunicados (crear/editar), Agenda (ver y crear eventos del colegio), Gestión → Alumnos y Familias, y Avisos enviados (solo lectura). NO: profesores, personal, salones, carnets, configuración ni Mensajes. Servidor: `exigirAlumnosFamilias` y listas de roles en cada acción; navegación: `src/lib/navegacion.ts`. `requireRol` / `requireTenantContext(slug, roles)`.
- **`alumno`** (cuenta propia del estudiante, la crea dirección o el administrativo; ver `specs/17`): solo lectura de **lo suyo** — Mi asistencia, Notas, Libreta (solo periodos publicados, igual que la familia), Tareas y Agenda de su salón, y Comunicados del colegio y de su salón. NO: Mensajes (el chat es familia ↔ profesor), datos de otros alumnos, gestión, justificar faltas, preferencias de avisos, descargar el PDF de la libreta (`/api/libreta` lo niega). Servidor primero: `alumnoIdsVisibles`/`salonIdsVisibles` devuelven solo su alumno y su salón (`alumnoDeLaCuenta`: `Alumno.cuentaId` = su membresía y alumno activo); las vistas de familia se reutilizan con un solo alumno (`esVistaFamilia` en `src/lib/roles.ts`). Respeta el plan: notas, libreta, tareas y agenda son Khipu Pro. Desde qué grado puede tener cuenta propia lo fija cada colegio (`Tenant.gradoMinimoCuentaAlumno`, ver `specs/10`).
- Mosaicos por rol: `src/lib/navegacion.ts`.
- **Código HTTP de una página denegada:** las rutas con `loading.tsx` (pantallas de carga) empiezan a transmitir antes de que corra el chequeo, así que una página denegada puede responder **200** mostrando la página 403 («No tienes acceso a esta sección») sin ningún dato del módulo. Las rutas de API y las server actions sí devuelven 403. En e2e se usa `tests/e2e/sin-acceso.ts` (`esperarSinAcceso`).

## Pruebas
- unit: `tests/unit/planes.test.ts` (solo `base` y `pro`, sin `nudito`), `tests/unit/modulos.test.ts`, `tests/unit/nombres-planes.test.ts`, `tests/unit/nudito-plus-interruptor.test.ts` (un colegio Pro tiene `nudito_plus`, Base nunca; las licencias familiares están apagadas y su variable de tests no vale fuera de `NODE_ENV=test`).
- integración: `tests/integracion/planes-modulos-roles.test.ts` (módulos desde la BD, specs/19).
- integración: `tests/integracion/rol-alumno.test.ts` (alcance del alumno: no ve notas, asistencia ni libreta de compañeros; ve sus tareas; sin mensajes ni gestión) · e2e: `tests/e2e/rol-alumno.test.ts`.
- e2e: candado «Plan Khipu Pro» en un colegio Khipu Base temporal (lo crea y borra cada e2e, specs/35; `login-flow.test.ts`, `planes-modulos.test.ts`) y acceso directo a `/notas` en Khipu Base → página 403 (`notas-libreta.test.ts`).
