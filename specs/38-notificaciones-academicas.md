# 38 — Notificaciones académicas por eventos (bandeja interna y Web Push)

> Estado: implementado (preproducción) · Plan: Khipu Pro · Última actualización: 2026-11-03 (Claude Code, rama `dev`)

## Objetivo
Avisar a los apoderados cuando un profesor **publica** los resultados de una actividad evaluada:
- con una notificación dentro de Khipu (bandeja);
- con un Web Push en la PWA.

Sin correo por cada calificación. **Reemplaza al resumen académico diario** (specs/37 §9), retirado el 2026-11-03 por costo de cómputo y volumen de correos.

## Roles y permisos

| Rol | Puede | No puede |
|---|---|---|
| Profesor del curso | Publicar resultados (genera el evento); corregir con motivo | Notificar mientras edita borradores |
| Apoderado | Ver su bandeja, abrir notificaciones, ver el registro auxiliar **publicado** de sus hijos; elegir si quiere push de notas | Ver borradores, observaciones internas, notas de otros alumnos o de otro colegio |
| Otros roles | — | La bandeja (403) |

Todo se valida en el servidor: `requireRol(["apoderado"])`, alcance `alumnoIdsVisibles` y `ctx.db` con el colegio inyectado. RLS queda cerrado para `anon` y `authenticated` en `eventos_academicos` y `notificaciones`: ningún cliente las lee directamente.

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

Sigue además el **correo** `nota_corregida` (specs/37), porque es una comunicación importante. Lo mismo hace la consecuencia por vencimiento sobre una actividad publicada.

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
- asistencia;
- justificaciones;
- correcciones de calificaciones publicadas;
- libreta publicada o rectificada;
- comunicados;
- reuniones;
- documentos.

**No** hay correo por calificación nueva: `resultados_publicados` ya no se encola y el resumen diario se retiró. Sigue el SMTP actual; el camino a SES está en `docs/despliegue.md`.

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
  - la tabla `resumenes_academicos`, la columna `tenants.hora_resumen_academico` y las plantillas `resumen_academico` y `resultados_publicados`, sin uso, para no perder historial.
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

**Columnas nuevas**
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
// notificaciones/bandeja.ts (solo apoderado)
listarNotificaciones(ctx, { pagina? }) · contarNotificacionesSinLeer(ctx) · abrirNotificacion(ctx, id): url | null · marcarTodasLeidas(ctx)
// notas.ts
guardarComentarioNota(ctx, { evaluacionId, alumnoId, comentario, privado? })
notasDeAlumno(...).cursos[i]: { profesor, evaluaciones: [{ grupoId, instrumento, comentario /* null si es interna */, … }] }
```

## Rutas y UI
- `/notificaciones` (apoderado):
  - lista con «Nueva», fecha y hora;
  - «Marcar todas como leídas»;
  - páginas de 30;
  - estado vacío.
- Contador de no leídas en el menú («Notificaciones», grupo Académico).
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
- **unit:** `plantillas-avisos` (push académico con `tag`).
- **e2e:** `flujo-evaluacion`: la apoderada ve la notificación tras la publicación y llega a la actividad.

## Pendientes y límites
- **Cron de respaldo:** en producción (Vercel Hobby) corre una vez al día. El camino normal es `after()`, inmediato. Si `after()` falla, el evento espera al cron; conviene el despertador cada minuto (pg_cron + pg_net, `docs/despliegue.md` §3).
- **Push en iOS:** solo funciona con la PWA instalada (iOS 16.4+). El service worker no funciona en `lvh.me` por http: el push real se prueba en HTTPS.
- **Preferencias por alumno:** no existen; son por apoderado.
- **El alumno con cuenta propia:** no tiene bandeja todavía.
- **Retención:** no hay purga de notificaciones antiguas.
