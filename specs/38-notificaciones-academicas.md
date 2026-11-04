# 38 — Notificaciones académicas por eventos (bandeja interna y Web Push)

> Estado: implementado (preproducción) · Plan: Khipu Base (bandeja, módulo `avisos`) y Khipu Pro (calificaciones) · Última actualización: 2026-11-03 (Claude Code, rama `pre-notificaciones`: bandeja general, correo solo para lo importante, retiro del resumen diario)

## Objetivo
Avisar a los apoderados cuando un profesor **publica** los resultados de una actividad evaluada:
- con una notificación dentro de Khipu (bandeja);
- con un Web Push en la PWA.

Sin correo por cada calificación. **Reemplaza al resumen académico diario** (specs/37 §9), retirado el 2026-11-03 por costo de cómputo y volumen de correos.

Desde la rama `pre-notificaciones` (2026-11-03) la bandeja es **general** (§8): también tareas, evaluaciones programadas, mensajes, comunicados y, para el profesor, justificaciones aprobadas e incidencias. Está en **Khipu Base** («Notificaciones dentro de Khipu», módulo `avisos`) para familias, alumnos con cuenta, profesores, dirección y administrativos.

## Roles y permisos

| Rol | Puede | No puede |
|---|---|---|
| Profesor del curso | Publicar resultados (genera el evento); corregir con motivo | Notificar mientras edita borradores |
| Apoderado | Ver su bandeja, abrir notificaciones, ver el registro auxiliar **publicado** de sus hijos; elegir si quiere push de notas | Ver borradores, observaciones internas, notas de otros alumnos, notificaciones de otra familia o de otro colegio |
| Alumno con cuenta | Ver su bandeja (tareas, evaluaciones programadas, comunicados; sin push ni correo) | Ver las de su familia |
| Profesor, dirección, administrativo | Ver su propia bandeja (mensajes de familias, justificaciones aprobadas, incidencias) | Ver las de otra persona |
| Portería | — | La bandeja (403) |

Todo se valida en el servidor: `requireFeature("avisos")`, `requireRol(ROLES_BANDEJA)`, siempre `membership_id = ctx.membership.id`; para familia y alumno, si la notificación trata de un alumno, solo mientras siga en `alumnoIdsVisibles` (si se desvinculó, desaparece). `ctx.db` lleva el colegio inyectado. RLS queda cerrado para `anon` y `authenticated` en `eventos_academicos` y `notificaciones`: ningún cliente las lee directamente.

## Flujos

### 1. Publicar (outbox transaccional)
`publicarEvaluacion` hace dos cosas en **una transacción**:
- cambia las columnas de `programada` a `publicada`;
- crea un `eventos_academicos` (`resultados_publicados`, por `grupo_id`).

Garantías:
- Un índice único parcial asegura un solo evento por publicación, aunque haya dos clics a la vez.
- Guardar borradores no crea eventos.
- La publicación no depende del servicio de notificaciones: la nota ya es visible aunque el worker o el push fallen.

### 2. Worker (`procesarEventosAcademicos`)
Corre en `after()` de la acción, sin bloquear al profesor, y en el cron `/api/cron/avisos` como respaldo.

**Reserva**
- Rescata los eventos `procesando` de más de 10 min.
- Reserva pendientes con `UPDATE … WHERE id IN (SELECT … FOR UPDATE SKIP LOCKED) RETURNING`: dos workers nunca toman el mismo.

**Procesamiento, con un número fijo de consultas por evento (no una por alumno)**
1. Columnas publicadas del grupo.
2. Alumnos con nota (`distinct`).
3. Alumnos activos.
4. Vínculos con apoderados `recibe_avisos` y activos, con preferencias, consentimiento y dispositivos.
5. `createMany` de `notificaciones` en lotes de 500 con `skipDuplicates`.
6. `createMany` de push en `avisos` en lotes de 500: una fila por dispositivo, única por `(notificacion_id, destinatario)`.

**Errores**
- Un error deja el evento `pendiente` con su mensaje.
- Tras 5 intentos pasa a `error`.
- Reintentar no duplica nada.

### 3. Agrupación
Una actividad de varias competencias genera **una** notificación por apoderado y alumno, no una por columna ni por nota. En el dispositivo, el push lleva `tag = notas-<alumnoId>`: varias publicaciones seguidas del mismo hijo se reemplazan en una sola notificación visible (`renotify`). En la bandeja quedan todas.

### 4. Push (Web Push existente)
- La cola `avisos` (canal `push`, plantilla `notificacion_academica`) y `PushChannel` (VAPID) ya existían.
- Tiene reintentos con espera creciente.
- Una suscripción 404/410 se borra y la fila queda `omitido`.

**Texto (se ve en la pantalla bloqueada)**
- Título: «Nuevo resultado publicado» o «Calificación actualizada».
- Cuerpo: «Hay un resultado nuevo de Mateo en Matemática: «Fracciones».»
- **Nunca la nota.**

**Destino del toque**
- Lleva a `/notificaciones/<id>/abrir`: la marca leída y redirige a `/notas?alumno=…&periodo=…#ev-<grupoId>`, que resalta la actividad.

**Condiciones del push**
- Exige consentimiento vigente y las preferencias `push` y `push_academico`.
- La bandeja no depende de ellas: solo exige vínculo activo con avisos.

### 5. Correcciones
`guardarNota` sobre una nota publicada (con motivo) crea, en la misma transacción que la nota y su historial, un evento `nota_corregida` para ese alumno: bandeja y push «Calificación actualizada».

Sigue además el **correo** `nota_corregida` (specs/37), porque es una comunicación importante. Lo mismo hace la consecuencia por vencimiento sobre una actividad publicada. `avisarCambioNota` encola **solo el correo** (`encolarParaDestinatario(…, { push: false })`): antes también encolaba un push `nota_corregida` y el dispositivo recibía dos push por la misma corrección. Ahora el único push es el de la notificación del evento.

### 6. Registro auxiliar visible para la familia (`/notas`, `notasDeAlumno`)

**Qué muestra, por curso**
- profesor;
- cada actividad publicada con fecha, tipo de evaluación (instrumento) y competencia;
- el resultado, o NSP o NE con su leyenda;
- recuperación y vencimiento;
- observación del profesor.

**Qué no muestra**
- borradores;
- otros alumnos;
- **observaciones internas**: `notas.comentario_privado` lo marca el profesor con «Observación interna: la familia no la ve» y nunca sale del servidor hacia la familia.

Va bajo «Registro auxiliar publicado», con la aclaración de que no es la calificación oficial de la libreta.

### 7. Correo (se mantiene solo para lo importante)
- alertas de asistencia (tardanza, falta, problema, aún no llega);
- justificaciones (a la familia, a la tutora y al profesor afectado, según su perfil);
- correcciones de calificaciones publicadas y recuperaciones;
- libreta publicada o rectificada;
- comunicados **marcados «Importante»**;
- invitaciones y alertas a dirección.

**Sin correo** (bandeja + push): calificación nueva, tarea nueva, evaluación programada, mensaje recibido y comunicado normal. Sigue el SMTP actual; el camino a SES está en `docs/despliegue.md`.

**Decisión pendiente (sin cambios en esta rama):** `asistencia_llego` (llegada diaria, correo + push a cada familia cada día), `reunion_recordatorio`, `documento_nuevo` e `informe_progreso` siguen por correo y push. Son candidatos a pasar a bandeja + push; conviene decidirlo con los colegios piloto (la llegada diaria es el mayor volumen de correos).

### 8. Bandeja general (productores en lote)
Helper común `notificaciones/internas.ts`:
- `crearNotificaciones(tdb, { tenantId, tipo, clave, filas })`: `createMany skipDuplicates` en lotes de 500, una fila por membresía; la **clave de idempotencia** (`tarea:<id>`, `evaluacion:<grupoId>`, `comunicado:<id>`, `mensaje:<conversación>:<ventana de 15 min>`, `justificacion:<id>`, `incidencia:<id>:<cursoId>`) es única por `(tenant_id, membership_id, clave)`: un reintento no duplica.
- `entregarNotificaciones(tdb, { tenant, tipo, clave, tipoAviso, plantilla, referenciaId, entregas })`: crea las notificaciones y, en un `createMany`, el push de cada dispositivo (y el correo si la entrega lo trae), con `notificacion_id`: único con el destinatario, tampoco se duplica. El push abre `/notificaciones/<id>/abrir`; el correo lleva el enlace directo.
- `vinculosFamilias(tdb, alumnoIds)`: **una consulta** con vínculos `recibe_avisos`, apoderado activo, consentimiento vigente, preferencias y dispositivos. `cuentasDeAlumnos(tdb, alumnoIds)`: cuentas propias activas (bandeja sin push).

| Productor | Tipo | Destinatarios | Push | Correo |
|---|---|---|---|---|
| `avisarTareaNueva` (`avisos-tareas.ts`) | `tarea` | familias del salón (una por familia) y alumnos con cuenta | sí | no |
| `avisarFamilias` de `crearEvaluacion` (`notas.ts`) | `evaluacion_programada` | ídem | sí | no |
| `avisarMensajeNuevo` (`avisos-mensajes.ts`) | `mensaje` | la familia o el profesor (máx. 1 cada 15 min por conversación) | sí | no |
| `publicarComunicado` (`comunicados.ts`) | `comunicado` | familias del destino y alumnos con cuenta | sí | solo si `importante` |
| `alAprobarJustificacion` (`nsp.ts`) | `justificacion` | profesores con actividades ese día (`destinosPersonal`) | según perfil | según perfil |
| `registrarIncidencia` (`incidencias.ts`) | `incidencia` | profesor de cada curso afectado | según perfil | según perfil |

La bandeja de la familia exige solo vínculo activo con `recibe_avisos` (no el consentimiento); push y correo exigen consentimiento vigente y las preferencias. Las calificaciones siguen saliendo del outbox (`tipo = calificacion`, §2).

**Consultas acotadas:** tarea y evaluación programada hacen el mismo número de consultas con 2 o con 60 alumnos (prueba con contador en `bandeja-general.test.ts`); el comunicado, un número fijo por publicación (antes ≈3 por familia).

### 9. Retiro del resumen diario
El resumen académico diario se retiró el 2026-11-03 (§1). Se quitaron del código: `src/lib/server/resumen-academico.ts`, su paso del cron, la hora en Configuración, el parámetro `horaResumenAcademico` de `actualizarReglasAcademicas`, las plantillas `resumen_academico` y `resultados_publicados` (y su entrada en `PLANTILLAS_FAMILIA` de `cola.ts`) y el texto «entra en el resumen académico del día».

**Queda en la BD sin uso** (no se borra para no perder historial):
- la tabla `resumenes_academicos` (una fila por colegio y día ya enviado);
- la columna `tenants.hora_resumen_academico` (default `18:00`);
- filas históricas de `avisos` con `plantilla = 'resumen_academico'` o `'resultados_publicados'`. Una fila histórica `pendiente` con esas plantillas terminaría en `error` (plantilla desconocida); las ya enviadas se siguen viendo en «Avisos enviados».

**Cómo eliminarlo en el futuro** (no se ejecuta ahora; requiere decidir antes qué historial conservar o exportar): una migración manual, p. ej. `prisma/migrations/<fecha>_retirar_resumen_diario/migration.sql`, que
1. marque como `omitido` las filas `pendiente` con esas plantillas (`UPDATE avisos SET estado = 'omitido', error = 'Plantilla retirada' WHERE estado = 'pendiente' AND plantilla IN ('resumen_academico', 'resultados_publicados')`);
2. `DROP TABLE "resumenes_academicos";`
3. `ALTER TABLE "tenants" DROP COLUMN "hora_resumen_academico";`
y quite del `schema.prisma` el modelo `ResumenAcademico`, su relación en `Tenant` y el campo `horaResumenAcademico`, seguido de `pnpm db:generate`.

## Reglas de negocio
- Sin notificación mientras el docente edita: solo publicar o corregir una nota **publicada** crea eventos.
- Un evento por publicación; una notificación por evento, apoderado y alumno; un push por notificación y dispositivo.
- La bandeja persiste aunque falle el push. El push fallido se reintenta (1, 5 y 15 min) y después queda `error` u `omitido`.
- **Preferencias del apoderado** (`/asistencia#avisos`):
  - «Recibir notificaciones en el celular o la computadora» (`push`);
  - «Notificarme en el celular cuando publiquen notas» (`push_academico`, nuevo);
  - el correo de asistencia queda aparte.

## Qué se conservó, adaptó o deshabilitó
- **Se conserva:**
  - NSP, vencimientos, justificaciones, control de ingreso, cola de avisos y correos importantes;
  - la tabla `resumenes_academicos` y la columna `tenants.hora_resumen_academico`, sin uso, para no perder historial (§9). Las plantillas `resumen_academico` y `resultados_publicados` se quitaron del código.
- **Se deshabilitó:** el resumen diario. Se borró `src/lib/server/resumen-academico.ts`, se quitó del cron y se quitó la hora en Configuración.
- **Se adaptó:**
  - `publicarEvaluacion`: transacción con outbox y mensaje nuevo;
  - `guardarNota`: evento de corrección;
  - `aplicarVencimientos`: evento al aplicar sobre publicadas;
  - `PushChannel` y el service worker: `tag` y `renotify`.

## Modelo de datos

Migración `20261111090000_notificaciones_por_eventos`, aditiva:

**Tabla `eventos_academicos`**
- Columnas: `tipo`, `grupo_id`, `alumno_id?`, `estado` (`pendiente|procesando|procesado|error`), `intentos`, `error`, `reservado_at`, `procesado_at` y los conteos `alumnos`, `notificaciones` y `push`.
- Índices: `(estado, created_at)` y el único parcial `(tenant_id, grupo_id) WHERE tipo = 'resultados_publicados'`.

**Tabla `notificaciones`**
- Columnas: `membership_id`, `alumno_id`, `evento_id`, `titulo`, `cuerpo`, `url` y `leida_at`.
- Índices: único `(evento_id, membership_id, alumno_id)` e índice `(membership_id, leida_at, created_at)`.

**Migración `20261112090100_bandeja_general`** (a mano, aditiva, sin borrar datos):
- `notificaciones.alumno_id` y `notificaciones.evento_id` pasan a **opcionales**;
- `notificaciones.tipo` (enum `TipoNotificacion`: `calificacion`, `tarea`, `evaluacion_programada`, `mensaje`, `comunicado`, `justificacion`, `incidencia`); backfill `calificacion` en las existentes;
- `notificaciones.clave` (texto, opcional) con único `(tenant_id, membership_id, clave)`; se mantiene el único `(evento_id, membership_id, alumno_id)` de las calificaciones;
- `comunicados.importante` (boolean, default `false`).

**Columnas nuevas (20261111090000)**
- `avisos.notificacion_id`, con único `(notificacion_id, destinatario)`.
- `preferencias_aviso.push_academico`.
- `notas.comentario_privado`.

**Volumen**
- Un salón de 1.000 alumnos con un apoderado cada uno da 1.000 notificaciones y hasta un push por dispositivo.
- En la prueba de integración local se procesa en un llamado, con lotes de 500.

## Contratos de `src/lib/server`
```ts
// eventos-academicos.ts
registrarEventoPublicacion(tx, { tenantId, grupoId, creadoPorId })          // dentro de la transacción
registrarEventoCorreccion(tx, { tenantId, grupoId, alumnoId, creadoPorId })
procesarEventosAcademicos({ tenantId?, ahora?, maxEventos? }): { procesados, errores, recuperados, notificaciones, push }
procesarEventosYPush(tenantId)                                              // after(): outbox + cola
// notificaciones/bandeja.ts (ROLES_BANDEJA: apoderado, alumno, profesor, direccion, administrativo; módulo avisos)
listarNotificaciones(ctx, { pagina? }) · contarNotificacionesSinLeer(ctx) · abrirNotificacion(ctx, id): url | null · marcarTodasLeidas(ctx)
// notificaciones/internas.ts (§8)
crearNotificaciones(tdb, { tenantId, tipo, clave, filas }) · entregarNotificaciones(tdb, { tenant, tipo, clave, tipoAviso, plantilla, referenciaId?, entregas }): { notificaciones, avisos, conCanal }
vinculosFamilias(tdb, alumnoIds) · porFamilia(vinculos, alumnoIds) · cuentasDeAlumnos(tdb, alumnoIds) · unirNombres(nombres)
// notificaciones/preferencias.ts
destinosPersonal(tdb, membershipIds, roles): Map<membershipId, { email, correo, pushEndpoints }>
// comunicados.ts
publicarComunicado(ctx, { titulo, cuerpo, audiencia?, salonId?, importante? }, adjuntos): { id, avisados /* familias en bandeja */, encolados }
// notas.ts
guardarComentarioNota(ctx, { evaluacionId, alumnoId, comentario, privado? })
notasDeAlumno(...).cursos[i]: { profesor, evaluaciones: [{ grupoId, instrumento, comentario /* null si es interna */, … }] }
```

## Rutas y UI
- `/notificaciones` (familia, alumno, profesor, dirección, administrativo; grupo «Comunicación» del menú):
  - lista con «Nueva», fecha y hora;
  - «Marcar todas como leídas»;
  - páginas de 30;
  - estado vacío.
- Contador de no leídas en el menú («Notificaciones», grupo Comunicación).
- Comunicados: casilla «Importante: enviar también por correo» al publicar e insignia «Importante» en la lista.
- `/notificaciones/[id]/abrir`: marca leída y redirige con una ruta relativa, para quedarse en el subdominio del colegio.
- `/notas` (familia): «Registro auxiliar publicado», profesor del curso, tipo de evaluación y la actividad resaltada al llegar desde una notificación.

## Pruebas
- **integración:** `tests/integracion/notificaciones-eventos.test.ts` cubre:
  - borradores sin eventos;
  - dos publicaciones a la vez con un solo evento;
  - nota visible sin worker;
  - una notificación por apoderado y alumno, sin notas en el texto ni correo;
  - reproceso sin duplicados;
  - observación interna oculta;
  - varios apoderados, sin permiso de push y dos dispositivos;
  - fallo del servicio push (reintento) y suscripción vencida (`omitido`), con la bandeja intacta;
  - corrección con correo y notificación solo a esa familia;
  - tres actividades seguidas con dos workers a la vez;
  - otro alumno y otro colegio (sin acceso);
  - 30 notas de un salón y 1.000 resultados en lotes (< 15 s).
- **integración:** `tests/integracion/bandeja-general.test.ts`: tarea con una notificación por familia y por alumno con cuenta, push con consentimiento, reintento sin duplicados; consultas constantes con 2 o 60 alumnos (tarea y evaluación programada); comunicado normal sin correo e importante con correo, helper idempotente; apoderado no ve las de otro, otro colegio nada, portería 403, profesor con su bandeja; familia desvinculada deja de ver las del alumno; bandeja en Khipu Base; **corrección = un solo push por dispositivo** + correo. También `avisos-pendientes`, `gestion-mensajes-privacidad`, `preferencias-personal-y-comunicados-push`, `comunicados-por-nivel`, `evaluaciones-publicacion` y `nsp-justificaciones-recuperacion` (bandeja del profesor, reintento sin duplicados).
- **unit:** `plantillas-avisos` (push académico con `tag`; texto neutro «aprobada por el colegio»; plantillas del resumen retiradas).
- **e2e:** `flujo-evaluacion`: la apoderada ve la notificación tras la publicación y llega a la actividad.

## Pendientes y límites
- **Cron de respaldo:** en producción (Vercel Hobby) corre una vez al día. El camino normal es `after()`, inmediato. Si `after()` falla, el evento espera al cron; conviene el despertador cada minuto (pg_cron + pg_net, `docs/despliegue.md` §3).
- **Push en iOS:** solo funciona con la PWA instalada (iOS 16.4+). El service worker no funciona en `lvh.me` por http: el push real se prueba en HTTPS.
- **Preferencias por alumno:** no existen; son por apoderado.
- **El alumno con cuenta propia:** tiene bandeja (tareas, evaluaciones, comunicados), pero sin push ni correo (no tiene preferencias de aviso propias).
- **Hijos de una familia con varios en el salón:** la notificación de tarea o evaluación guarda el primer hijo como `alumno_id`; si solo se desvincula ese hijo, la familia deja de verla.
- **`e2e`:** `tareas-agenda` se adaptó (bandeja en vez de correo) pero no se corrió en esta rama.
- **Canales pendientes de decidir:** ver §7 (llegada diaria, recordatorio de reunión, documento nuevo, informe de progreso).
- **Retención:** no hay purga de notificaciones antiguas.

## Tareas (specs/39)
- Bandeja + push, sin correo, a los asignados (apoderado y alumno con cuenta): `tarea:<id>` (publicada; programadas vía cron con `avisada_at`), `tarea-plazo:<cambioId>`, `tarea-devuelta:<asignacionId>:<ms>`. Plantilla nueva `tarea_actualizada`; `tarea_nueva.fechaEntrega` es opcional.
- Sin recordatorio de vencimiento (pendiente: cron diario en Hobby).
