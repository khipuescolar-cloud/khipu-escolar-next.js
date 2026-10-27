# Rol alumno (cuenta propia) y pendientes de Nudito

| Campo | Valor |
|---|---|
| Fecha | 2026-10-27 |
| Colaborador | Carlos (dirección del proyecto) |
| Agente y modelo | Claude Code (subagente, frente `alumno-nudito`) · claude-opus-5-5 |
| Rama y commits | `feat/p3-alumno-nudito` · ver `git log` de la rama («Add student accounts and fix Nudito child scoping») |
| Specs afectadas | `specs/13-nudito.md`, `specs/03-planes-y-permisos.md`, `specs/17-crm-personal-colegio.md`, `specs/01-arquitectura-multitenant.md`, `specs/15-privacidad-auditoria-exportacion.md`, `specs/08-chat-familia-profesor.md`, `specs/11-notas-y-libreta.md` |

## Pedidos del colaborador (textual)
> Si borralos , si ya no lo estamos usando y ya no lo necesitamos , no hay problema con borrarlos no? y porfavor ve resolviendo todos los pendientes que tengamos , quiero que por a hora trabajes de manera autonoma resolviendo cada problema que tengas y que lances multiagentes para que solucioones todos, si necesitas lazar 50 miltiagentes no hay problema pr que la finalidad es que termines con todo lo pendiente que tuvimos

(El orquestador asignó a este subagente: rol alumno con cuenta propia y los pendientes de Nudito.)

## Decisiones
- **Rol alumno = solo lectura de lo suyo.** `alumnoIdsVisibles`/`salonIdsVisibles` devuelven solo su alumno y su salón (`alumnoDeLaCuenta`: `Alumno.cuentaId` = su membresía y alumno activo). Ve Mi asistencia, Notas, Libreta (solo periodos publicados), Tareas y Agenda de su salón y Comunicados. Se reutilizan las vistas de familia (`esVistaFamilia` en `src/lib/roles.ts`).
- **Sin chat** (el chat es familia ↔ profesor), sin gestión, sin justificar faltas, sin preferencias de avisos y sin PDF de la libreta (`/api/libreta` ya lo negaba).
- **Sin Nudito para el alumno** (protección de menores): el asistente automático conversa solo con adultos responsables.
- **Consentimiento:** crear o reactivar la cuenta exige un consentimiento vigente de al menos un apoderado vinculado; si no, la UI explica por qué. Revocarlo no apaga la cuenta automáticamente (queda como pendiente con abogado).
- La cuenta del alumno no puede usar el correo de alguien que ya está en el colegio (apoderado, personal u otro alumno).
- **Nudito, nombres ajenos:** detector puro y conservador (nombres comunes, mayúsculas fuera del inicio de oración, «mi hijo X», respuesta corta a «¿de cuál hijo?»). No consulta la BD por ese nombre, así que no revela si el alumno existe.
- **Enlaces:** los botones de chat de Nudito van a `/mensajes/nuevo?alumno=<id>`; `/mensajes?alumno=` redirige ahí (historial guardado). `/libreta` y `/mensajes/nuevo` validan `?alumno=` con `requireAlumnoVisible`.
- **Historial por hijo:** se usa `NuditoConversacion.alumnoId` (ya existía; sin cambios de esquema).

## Cambios realizados
- `src/lib/server/tenant.ts`: alcance del rol alumno (`alumnoDeLaCuenta`).
- `src/lib/server/gestion-cuentas-alumno.ts` (nuevo), `src/app/colegio/[slug]/gestion/alumnos/actions.ts` (nuevo) y `page.tsx`: crear, desactivar y reactivar la cuenta del alumno; columna «Cuenta del alumno».
- `src/lib/roles.ts` (`ROLES_FAMILIA`, `esVistaFamilia`), `src/lib/navegacion.ts` (mosaicos del alumno).
- Ediciones mínimas para admitir al alumno: páginas de asistencia, notas, libreta, tareas, agenda (+ `api/agenda.ics`), comunicados; servidor `asistencia.ts`, `libreta.ts`, `tareas.ts`, `agenda.ts`, `archivos.ts` (adjuntos de comunicados y tareas).
- Nudito: `intenciones.ts` (`nombresAjenos`, decisión `no_es_hijo`), `respuestas.ts` (`noEsHijo`, `rutaChatDe`, `rutaLibretaDe`), `intent-nudito.ts`, `tipos.ts`; `/nudito` agrupado por hijo; `/mensajes` y `/mensajes/nuevo` con `?alumno=`.
- Tests: `tests/unit/nudito-nombres-ajenos.test.ts`, `tests/integracion/rol-alumno.test.ts`, `tests/e2e/rol-alumno.test.ts` (nuevos); `tests/integracion/nudito.test.ts`, `tests/e2e/nudito.test.ts`, `tests/unit/nudito-respuestas.test.ts` (ajustados).
- Specs 01, 03, 08, 11, 13, 15 y 17.

## Validación
- `pnpm lint` ✓ · `pnpm typecheck` ✓ · `pnpm test` ✓ (46 archivos, 407 tests).
- e2e (`E2E_PORT=3031`): `rol-alumno`, `nudito`, `paginas-basico-por-rol`, `login-flow`, `chat-familia-profesor`, `notas-libreta`, `tareas-agenda`, `direccion-panel`, `crm-personal`, `pasar-lista-aviso-justificar`, `comunicados-adjuntos` ✓.

## Pendientes y preguntas abiertas
- **Externo:** LLM para Nudito tras aprobación explícita (mejoraría la detección de nombres).
- **Con un abogado:** si revocar el consentimiento debe desactivar sola la cuenta del alumno y desde qué edad un alumno puede tener cuenta.
- El detector de nombres es heurístico: un nombre poco común en minúsculas a mitad de frase no se detecta.
