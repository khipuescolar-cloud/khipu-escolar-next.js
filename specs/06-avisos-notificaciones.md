# 06 — Avisos y notificaciones

> Estado: implementado · Plan: Khipu Base · Última actualización: 2026-11-03 (Claude Code: bandeja general, correo solo para lo importante y correcciones de seguridad; antes: pool SMTP 2026-10-30)

## Objetivo
Avisar a la familia por correo y push cada vez que se registra la asistencia (y en justificaciones, correcciones de notas, comunicados importantes, libretas e invitaciones), notificar dentro de Khipu (bandeja `/notificaciones`, specs/38) y por push lo habitual (calificación nueva, tarea, evaluación programada, mensaje, comunicado), avisar al personal cuando le toca actuar (mensajes de familias, justificaciones, incidencias, correos desactivados) y no pasarse de los límites del proveedor.

**Estrategia de canales (2026-11-03):** bandeja interna + push para lo habitual; **correo solo para lo importante**: alertas de asistencia, justificaciones, correcciones de notas, comunicados marcados «Importante» y documentos académicos relevantes (libretas). Reuniones (specs/40): correo solo en invitación (`reunion_convocada`, asunto «Khipu — Invitación a reunión»), reprogramación (`reunion_reprogramada`), cancelación (`reunion_cancelada`) y solicitud de una familia al docente (`reunion_solicitada`); respuestas y acuerdos solo bandeja + push (`reunion_respuesta`). Sin cambios por ahora (decisión pendiente): `asistencia_llego` (llegada diaria por correo), `reunion_recordatorio`, `documento_nuevo` e `informe_progreso` siguen por correo y push.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Apoderado | Elegir correo y/o push (`/asistencia#avisos`), activar push en su dispositivo | Ver avisos de otras familias |
| Dirección | Ver `/avisos`: enviados, apertura (meta 70 %), cola, rebotes, errores; recibir `alerta_rebote` y `soporte_inicio` | — |
| Profesor | Recibir `mensaje_nuevo` (bandeja + push, sin correo) cuando una familia le escribe, `justificacion_recibida` como tutor y `justificacion_aprobada_docente` / `incidencia_docente` (bandeja + push + correo según su perfil) | — |
| Cron | `GET/POST /api/cron/avisos` con `Authorization: Bearer <CRON_SECRET>` | — |
| SNS (AWS) | `POST /api/webhooks/ses` con firma SNS válida | — |

## Flujos
1. Un módulo crea filas `pendiente` en `avisos` (ver **Contrato**). Asistencia y portería usan `encolarAvisosAsistencia()`; justificaciones, `encolarAviso()` / `encolarParaDestinatario()`; chat, `avisarMensajeNuevo()`; tareas, `avisarTareaNueva()`; el webhook de SES, `alertarCorreoDesactivado()`.
2. Tras guardar, la action llama `after(() => procesarCola({ tenantId }))`. El cron llama `procesarCola()` global.
3. El worker recupera las filas atascadas en `enviando`, reserva su lote (`pendiente → enviando`), renderiza por `plantilla` + `payload`, envía por el canal y guarda `estado = enviado`, `enviadoAt`, `providerMessageId` (Message-ID de Nodemailer). **Repite por lotes** hasta vaciar la cola, quedarse sin cupo diario o agotar su presupuesto de tiempo (`PRESUPUESTO_MS` = 240 s, dentro del límite de la función en Vercel).
4. SES → SNS → `/api/webhooks/ses`: valida la firma, confirma la suscripción y actualiza `entregado` / `abierto` / `rebotado` / `queja`. Rebote permanente o queja → desactiva los avisos de esa familia y encola `alerta_rebote` a dirección.

## Reglas de negocio
- **Destinatarios** (`destinatariosDeAlumno`): vínculo con `recibeAvisos = true`, membresía activa y **consentimiento no revocado**; canales según `preferencias_aviso` (sin fila = correo y push). Push = una fila por suscripción del usuario.
- **Tope diario** `EMAIL_DAILY_LIMIT`: correos con `enviadoAt` en las últimas 24 h, **global** (todos los colegios). Sin cupo, la fila queda `pendiente` (se cuenta como `diferidos`).
- **Ritmo** `EMAIL_RATE_PER_SECOND`: `ceil(1000/ritmo)` ms entre el inicio de un correo y el siguiente (la pausa descuenta lo que tardó el envío). Es por colegio: hay un solo worker por colegio.
- **Un worker por colegio** (2026-10-30, prueba de estrés, `docs/pruebas-de-estres.md`): cada lote dura ~60 s al ritmo configurado (`tamaño = min(maxAvisos, 60 × EMAIL_RATE_PER_SECOND)`). Antes de cada lote, un worker con `tenantId` comprueba que ningún otro worker del colegio tenga filas `enviando` reservadas en los últimos 120 s (y la reserva lo vuelve a exigir en la misma sentencia `UPDATE … AND NOT EXISTS (…)`); si las hay, se retira y el otro, que vuelve a buscar pendientes tras cada lote (con la hora actual, así toma lo encolado mientras enviaba), sigue con el resto. Lo que no alcance a salir en `PRESUPUESTO_MS` lo continúa el siguiente llamado (otro `after()` o el cron): por eso `EMAIL_RATE_PER_SECOND` debe ser la cuota real del proveedor (SES: 14/s) y conviene un cron frecuente (ver `docs/pruebas-de-estres.md`). Una fila `enviando` de un worker caído deja de bloquear a los 120 s y se recupera a los 10 min. Antes, 40 listas guardadas a la vez lanzaban 40 `after()` que competían por las mismas 100 filas: los que no reservaban nada terminaban y ~20 % de los avisos de la mañana quedaban `pendiente` hasta el cron diario; además el ritmo real era N workers × `EMAIL_RATE_PER_SECOND`. El cron (sin `tenantId`) no se retira. Una fila devuelta a `pendiente` para reintentar no se reintenta en el mismo llamado.
- **Reserva atómica**: el worker elige el lote (respetando el cupo diario) y lo reserva con un solo `UPDATE avisos SET estado = 'enviando', programado_para = now() WHERE id = ANY(lote) AND estado = 'pendiente' RETURNING id`. Postgres bloquea cada fila y reevalúa la condición: si dos workers corren a la vez, cada fila la obtiene uno solo (probado con dos `procesarCola()` en paralelo). Mientras está `enviando`, `programadoPara` guarda la hora de la reserva.
- **Recuperación**: al empezar, las filas en `enviando` hace más de `ENVIANDO_MAX_MINUTOS` (10) vuelven a `pendiente` contando un intento (o pasan a `error` si ya agotaron los reintentos). El resumen devuelve `recuperados`.
- **Reintentos**: 1 intento + 3 reintentos (esperas 1, 5 y 15 min); al 4.º fallo, `error`. Plantilla o payload inválido → `error` sin reintento. Suscripción push vencida (404/410) → se borra y el aviso queda `omitido`.
- **Asistencia**: llegada, tardanza, falta y problema se encolan al instante (al cerrar la lista o al escanear en portería) y `after()` procesa la cola del colegio enseguida. Un solo aviso de llegada por alumno y día (spec 04).
- **Modo «solo excepciones» y resumen de llegadas: eliminados** (2026-10-27). Todos los colegios quedaron con `modoAvisos = todos` (migración `20261027230000_plazo_dias_habiles`). Se quitó el selector de `/configuracion`, la condición que saltaba las llegadas, el job `generarResumenesLlegadas` de la cola (y `tocaResumen`, `ResumenCola.resumenes`) y la plantilla `resumen_llegadas`. Quedan **sin uso en la BD** (no se cambió el esquema): el valor `solo_excepciones` del enum `ModoAvisos`, la columna `Tenant.modoAvisos`, la columna `Tenant.horaEnvioAvisos` y el valor `resumen_llegadas` del enum `TipoAviso` (filas históricas). Una fila histórica `pendiente` con esa plantilla terminaría en `error` (plantilla desconocida).
- **Falta**: se crea un `justificacion_tokens` por familia; el payload guarda solo `justificacionTokenId` y el worker arma `urlJustificar` con el token derivado (HMAC con `APP_SECRET`). El token nunca se guarda en la BD.
- Remitente: nombre = colegio (`tenant.nombre`), dirección = `EMAIL_FROM_ADDRESS`. Encabezados `List-Unsubscribe: <…/asistencia#avisos>` y `X-Khipu-Aviso: <avisoId>`.
- SES: un estado nunca retrocede (abierto no vuelve a entregado). Rebote **permanente** o queja → `recibeAvisos = false` en todos los vínculos de ese apoderado en el colegio + auditoría + `alerta_rebote` (tipo `alerta_direccion`, correo) a cada miembro activo de dirección, `referenciaId = apoderadoId`, **máx. 1 por apoderado por día** (Lima). Esas filas no llevan `apoderadoId`, así un rebote del correo de dirección no genera otra alerta.
- **Bandeja + push, sin correo** (specs/38, `notificaciones/internas.ts`): `mensaje_nuevo`, `tarea_nueva`, `evaluacion_programada` y `comunicado` (si no es importante) crean una notificación por destinatario en `notificaciones` (clave de idempotencia única por colegio y membresía) y el push en la cola, ligado a la notificación (`notificacion_id`, único con el destinatario: un reintento no duplica). El push abre `/notificaciones/<id>/abrir`. La bandeja exige solo vínculo activo con `recibeAvisos` (familias) o membresía activa (personal); push exige consentimiento vigente y la preferencia `push`.
- **Mensajes**: `referenciaId = conversacionId`; máx. 1 notificación por conversación y destinatario cada 15 min (se cuenta en la bandeja). Al profesor: push por cada suscripción según su perfil, sin consentimiento.
- **Tareas**: solo si el profesor marca «Avisar a las familias»; familias del salón y alumnos con cuenta, `referenciaId = tareaId`, una vez por tarea (clave `tarea:<id>`).
- **Evaluación programada**: al crear una evaluación con «Avisar a las familias» (spec 11); una notificación por familia y por alumno con cuenta, `referenciaId = grupoId` (clave `evaluacion:<grupoId>`).
- **Comunicados** (spec 09): bandeja + push siempre; **correo solo si se marcó «Importante»** (`comunicados.importante`).
- **Resultados publicados** (specs/38): no hay correo por calificación nueva ni resumen diario (retirado el 2026-11-03). Publicar crea un evento en `eventos_academicos` (outbox) y el worker crea la notificación de la bandeja interna y el push `notificacion_academica` (una fila por dispositivo, `notificacion_id`, `tag` por alumno, sin notas en el texto). Las plantillas `resumen_academico` y `resultados_publicados` se eliminaron del código (specs/38 «Retiro del resumen diario»).
- **Avisos específicos** (specs/37, inmediatos): `nota_corregida` (calificación publicada que cambió: corrección, asistencia, vencimiento u otra; sin valores) y `recuperacion_registrada` a la familia del alumno, **solo por correo** (`avisarCambioNota`): el push y la bandeja los pone el evento `nota_corregida`, así cada dispositivo recibe un único push. A profesores: `justificacion_aprobada_docente` (uno por profesor con actividades ese día) e `incidencia_docente` (uno por curso, sin el detalle), con bandeja + push + correo según sus preferencias (`destinosPersonal`).
- **Informe de progreso**: `informe_progreso` (tipo `libreta`) cuando el profesor usa «Compartir con las familias» en el informe de progreso de su curso (spec 11): una fila por familia y canal, solo para alumnos con informe, `referenciaId = cursoId`; «Reenviar aviso» lo repite.
- **Libreta publicada**: `libreta_publicada` (tipo `libreta`) cuando dirección usa «Publicar libreta y avisar a las familias» (spec 11): una fila por familia y canal (no por hijo; los nombres de los hijos van juntos), `referenciaId = periodoId`. Solo se envía una vez por periodo; «Reenviar aviso» lo repite.
- **Enlace de preferencias**: el worker agrega `urlPreferencias` (y `List-Unsubscribe`) solo a plantillas de familia **en filas con `apoderadoId`**; los avisos al personal no lo llevan.

## Contrato de plantillas (para otros módulos)
Insertar en `avisos`: `tenantId`, `tipo`, `canal` (`correo` → `destinatario` = email; `push` → endpoint), `plantilla`, `asunto` (informativo; el worker usa el de la plantilla), `payload`, `apoderadoId` (si es familia), `referenciaId` (conversación, tarea, justificación o apoderado; para agrupar y limitar), `estado = pendiente` (por defecto). **Solo para apoderados con consentimiento vigente y según sus preferencias** (usa `destinatariosDeAlumno` + `encolarParaDestinatario`, que además valida el payload). El worker agrega `colegio` si falta y `urlPreferencias` en las plantillas de familia (filas con `apoderadoId`). Los avisos al personal (profesor, tutora, dirección) no exigen consentimiento.

| `plantilla` | `tipo` | Destinatario | `referenciaId` | `payload` |
|---|---|---|---|---|
| `asistencia_llego` | asistencia | familia | — | `{ colegio, alumno, hora: "HH:mm" }` |
| `asistencia_tarde` | asistencia | familia | — | `{ colegio, alumno, hora, curso? }` — con `curso` (lista de un curso, spec 04): asunto «Mateo llegó tarde a Matemática», texto «Mateo llegó tarde a Matemática (10:12 a. m.).» |
| `asistencia_falta` | asistencia | familia | — | `{ colegio, alumno, momento?: "a la 1.ª hora", justificacionTokenId? \| urlJustificar?, curso?, ingreso?: "HH:mm", horaClase?: "HH:mm" }` — con `curso` + `ingreso` (falta a clase de un alumno que ingresó al colegio, spec 04): asunto «Mateo no estuvo en Matemática», texto «Mateo ingresó al colegio a las 7:52 a. m., pero no estuvo en Matemática (10:00 a. m.).» |
| `asistencia_problema` | asistencia | familia | — | `{ colegio, alumno, hora, nota?, urlMensajes? }` |
| `mensaje_nuevo` | mensaje | familia o profesor (solo push) | conversacionId | `{ colegio, remitente, alumno, url }` |
| `comunicado` | comunicado | familia (push; correo solo si es importante) | comunicadoId | `{ colegio, titulo, url, adjuntos? }` |
| `invitacion` | invitacion | persona invitada | — | `{ colegio, nombre, rol, url }` |
| `justificacion_recibida` | justificacion | tutora (correo) | justificacionId | `{ colegio, alumno, fecha: "AAAA-MM-DD", url }` |
| `justificacion_revisada` | justificacion | familia | justificacionId | `{ colegio, alumno, fecha: "AAAA-MM-DD", estado: "aceptada" \| "rechazada", comentario? }` |
| `tarea_nueva` | tarea | familia (solo push) | tareaId | `{ colegio, alumno?, curso, titulo, fechaEntrega: "AAAA-MM-DD", url }` |
| `documento_nuevo` | documento | familia | documentoId | `{ colegio, titulo, carpeta?, url }` (botón «Ver documentos» → `/documentos?carpeta=<id>`; solo con «Avisar a las familias», spec 31) |
| `libreta_publicada` | libreta | familia | periodoId | `{ colegio, alumno?, periodo: "I Bimestre 2026", url }` (botón «Ver libreta» → `/libreta`) |
| `evaluacion_programada` | libreta | familia (solo push) | grupoId | `{ colegio, alumno?, curso, titulo, fecha, descripcion?, url }` (botón «Ver notas»; spec 11) |
| `notificacion_academica` | libreta | familia (solo push) | grupoId | `{ colegio, titulo, cuerpo, url, tag? }` (specs/38; el texto ya viene sin notas) |
| `nota_corregida` | libreta | familia (solo correo) | evaluacionId | `{ colegio, alumno, curso, titulo, motivo: correccion_digitacion \| cambio_asistencia \| consecuencia_vencimiento \| otra, url }` |
| `recuperacion_registrada` | libreta | familia (solo correo) | evaluacionId | `{ colegio, alumno, curso, titulo, url }` |
| `justificacion_aprobada_docente` | justificacion | profesor (correo y/o push según su perfil) | justificacionId | `{ colegio, alumno, fecha, curso, actividades[], url }` («aprobada por el colegio»; no obliga a una recuperación) |
| `incidencia_docente` | asistencia | profesor (correo y/o push según su perfil) | incidenciaId | `{ colegio, alumno, fecha, hora?, curso, url }` (sin diagnóstico) |
| `informe_progreso` | libreta | familia | cursoId | `{ colegio, alumno?, curso, periodo: "I Trimestre 2027", url }` (botón «Ver el informe» → `/notas`; spec 11) |
| `alerta_rebote` | alerta_direccion | dirección (correo) | apoderadoId | `{ colegio, apoderado, alumnos: string[], motivo, url }` |
| `soporte_inicio` | alerta_direccion | dirección (correo y/o push según su perfil) | accesoId | `{ colegio, hasta: "HH:mm", motivo, url }` → «El equipo de Khipu Escolar entró a tu colegio en modo soporte (solo lectura) hasta las HH:mm. Motivo: …», botón «Ver auditoría» (specs/16) |
| `nudito_plus` | nudito | familia | `nudito-pago:<pagoId>` o `nudito-vence:<licenciaId>:<hasta>` | `{ colegio, alumno, titulo, parrafos: string[1..4], url }` → licencia activada, pago no confirmado o «vence el dd/mm/aaaa»; firmado por el equipo Khipu, botón «Ver Nudito+» (specs/28) |

`justificacion_*` también guardan `asistenciaId`.

- **Reuniones (specs/40)**: `reunion_convocada`, `reunion_recordatorio`, `reunion_cancelada`, `reunion_acta` y `reunion_reprogramada` aceptan además `duracion` (min), `organizador` y `modalidad` opcionales; `reunion_solicitada` = las mismas + `solicitante`; `reunion_respuesta` = `{ colegio, titulo, texto, url }` (solo push/bandeja). `reunion_reprogramada` está en `PLANTILLAS_FAMILIA`.

## Modelo de datos
- `avisos` (cola y registro; `estado` incluye `enviando`; `referenciaId`), `preferencias_aviso`, `push_suscripciones` (global por usuario, `endpoint` único), `apoderados_alumnos.recibeAvisos`, `consentimientos.revocadoAt`, `justificacion_tokens`.

## Contratos de `src/lib/server`
```ts
// notificaciones/tipos.ts
interface NotificationChannel { canal: CanalAviso; enviar(e: EnvioAviso): Promise<{ providerMessageId? }> }
// notificaciones/email.ts  → EmailChannel (Nodemailer, SMTP_HOST/PORT/SECURE/USER/PASS, EMAIL_FROM_ADDRESS)
//   Un transporte por proceso (nivel de módulo). Con usuario SMTP (SES/Gmail) es un pool: `pool: true`,
//   SMTP_MAX_CONNECTIONS (3) y SMTP_MAX_MESSAGES (100); SMTP_POOL=true|false lo fuerza. Mailpit local (sin usuario): sin pool.
//   opcionesTransporte(env) (pura) · cerrarTransporteCorreo() (scripts y tests; el servidor lo deja abierto).
//   El ritmo sigue siendo EMAIL_RATE_PER_SECOND en procesarCola (el pool no limita).
// notificaciones/push.ts   → PushChannel (web-push, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT)
// notificaciones/encolar.ts
destinatariosDeAlumno(tdb, alumnoId): Promise<Destinatario[]>
encolarAviso(tdb, { tenantId, tipo, canal, destinatario, plantilla, payload, apoderadoId?, asistenciaId?, referenciaId?, programadoPara? }): Promise<string>
encolarParaDestinatario(tdb, destinatario, { tenantId, tipo, plantilla, payload, asistenciaId?, referenciaId? }, canales?: { correo?: false; push?: false }): Promise<number>
encolarAvisosAsistencia(tdb, { tenant, asistencia, alumnoNombre, momento, urlMensajes?, destinatarios? }): Promise<number /* familias */>
destinatariosPorAlumno(tdb, alumnoIds): Promise<Map<alumnoId, Destinatario[]>>   // una consulta para toda la lista (pasar lista)
crearTokenJustificacion(tdb, { tenantId, asistenciaId, apoderadoId }): Promise<{ id, token }>
// notificaciones/cola.ts
procesarCola({ ahora?, tenantId?, maxAvisos = 100 /* por lote */, presupuestoMs = PRESUPUESTO_MS, canales?, esperar?, limites? }): Promise<{ enviados, reintentos, errores, omitidos, diferidos, recuperados }>
ENVIANDO_MAX_MINUTOS = 10
// notificaciones/limites.ts (puras): cupoDiario, pausaEntreCorreosMs, esperaReintentoMs, MAX_INTENTOS = 4, leerLimites
// notificaciones/ses.ts: urlDeAwsValida, textoAFirmar, verificarFirmaSns, confirmarSuscripcion, procesarEventoSes
// notificaciones/avisos-familia.ts: encolarAvisoFamilia(ctx, { plantilla: "invitacion", destinatario, apoderadoId?, payload }) · VENTANA_MENSAJE_MINUTOS
// notificaciones/internas.ts (specs/38): crearNotificaciones(tdb, { tenantId, tipo, clave, filas }) · entregarNotificaciones(tdb, { tenant, tipo, clave, tipoAviso, plantilla, referenciaId?, entregas })
//   vinculosFamilias(tdb, alumnoIds) (una consulta: consentimiento, preferencias y dispositivos) · porFamilia · cuentasDeAlumnos · unirNombres
// notificaciones/avisos-mensajes.ts: avisarMensajeNuevo(ctx, conversacion): number   // a la familia o al profesor según quién escribe
// notificaciones/avisos-tareas.ts: avisarTareaNueva(ctx, tareaId, entrada): number, pideAvisarFamilias(entrada)
// notificaciones/alertas-direccion.ts: alertarCorreoDesactivado(tenantId, apoderadoId, "rebote" | "queja", ahora?): number
// notificaciones/preferencias.ts: obtenerPreferencias, guardarPreferencias, guardarSuscripcionPush, quitarSuscripcionPush, destinoPersonal(tdb, membershipId, roles), destinosPersonal(tdb, membershipIds, roles) (una consulta)
//   `preferencias_aviso.apoderado_id` es en realidad un id de MEMBRESÍA: aplica a cualquier rol (apoderado, profesor, dirección, administrativo). Sin fila = correo y push activos.
// email/plantillas/index.ts: renderizarPlantilla(nombre, payload): { asunto, html, texto, push }, NOMBRES_PLANTILLA
// avisos.ts: panelAvisos(ctx) (dirección)
// encolar.ts: tieneCanalAviso(destinatario)   // correo o algún dispositivo push
```

## Rutas y UI
- `/api/cron/avisos` (GET/POST, bearer `CRON_SECRET`, comparación en tiempo constante; sin `CRON_SECRET` siempre 401).
- `/api/webhooks/ses` (POST): firma SNS v1 (SHA1) y v2 (SHA256) con `node:crypto`; certificado solo de `https://sns.<región>.amazonaws.com(.cn)/….pem`; si `SES_SNS_TOPIC_ARN` está definido, exige ese tema; en producción (`NODE_ENV=production`) sin `SES_SNS_TOPIC_ARN` se rechaza todo mensaje (test en `tests/unit/firma-sns.test.ts`).
- `/perfil#avisos` (profesor, dirección, administrativo): las mismas casillas correo/push y «Activar notificaciones en este dispositivo» (`PreferenciasPersonal`, acciones en `perfil/actions.ts`). Se respetan en `mensaje_nuevo` al profesor (`avisarMensajeNuevo`) y en la alerta de correo desactivado a dirección (`alertarCorreoDesactivado`, que ahora también envía push a sus dispositivos). Si apaga ambos canales no se encola nada.
- **Envío inmediato (`after()`)**: `enviarMensajeAction` (chat) y `/api/webhooks/ses` (alerta a dirección, vía `procesarEventoSes(evento, { alEncolarAlerta })`) llaman a `procesarCola({ tenantId })` tras responder, solo si se encoló algo. Es el mismo worker del cron: respeta el tope diario global y la reserva atómica `pendiente → enviando`.
- Familias: mensajes y comunicados van por bandeja + push en lote (`internas.ts`); `encolarAvisoFamilia` queda solo para invitaciones.
- `/asistencia#avisos` (apoderado): casillas correo/push y «Activar notificaciones en este dispositivo» (registra `public/sw.js`, suscribe con VAPID y guarda vía server action).
- Plantilla `asistencia_no_llega` y campos `saludo` (avisos de asistencia) y `horaLimite` (falta automática): ver spec 05, «Control de ingreso automático».
- `/avisos` (dirección y administrativo), dos pestañas (2026-11-06):
  - **Masivos** (por defecto): una fila por **envío** que llegó a más de una familia: fecha, título («Lista del día · 3.° B», «Matemática · 3.° B», «Aún no llega (8:00 a. m.)», «Faltas del día (9:00 a. m.)», «Comunicado: …», «Tarea: … · curso», «Libreta: …», «Documento: …», «Reunión: … (recordatorio | acta)», «Invitación a reunión: …», «Reunión reprogramada: …», «Reunión cancelada: …», «Solicitud de reunión: …»), tipo, autor («Khipu (automático)» si no hay), familias, enviados, abiertos (con %), con error y en cola. Filtros: estado (envíos con algún aviso en ese estado; `fallidos` = error, rebote o queja), tipo y título. 50 más recientes. Clic → `/avisos/envios/[id]`: las mismas tarjetas para ese envío, chips Todos / Con error / En cola / No enviados / Abiertos y un aviso por familia y canal.
  - **Individuales** (`?vista=individuales`): avisos sin envío (escaneo de portería, chat, justificaciones, invitaciones, alertas, Nudito+) o de un envío que llegó a una sola familia. Los 100 últimos; filtros por estado (incluye `enviando` y `fallidos`), tipo y correo.
  - En ambas: **Hoy** (día de Lima, avisos creados desde las 00:00) de esa pestaña: correos enviados de N generados, abiertos con % (verde si llega a la meta), con error (enlace `?estado=fallidos`), en cola (pendiente o enviando, de cualquier día), push enviados y no enviados (`omitido`); chips por tipo que filtran. (La tarjeta «Apertura de la semana» se quitó el 2026-11-06; la meta de 70 % solo colorea «Correos abiertos».) Cálculo en `src/lib/server/avisos-panel.ts` (`panelAvisos`, `resumirHoy`, `totalesEnvio`, `detalleEnvio`).
- **Envíos** (`envios_aviso`, migración `20261106100000_envios_aviso`; `avisos.envio_id`): una acción que avisa a familias se envuelve en `conEnvio(tdb, { tenantId, tipo, titulo, creadoPorId }, accion)` (`src/lib/server/notificaciones/envios.ts`, `AsyncLocalStorage`); cada fila que crea `encolarAviso` dentro lleva el `envioId`. La fila del envío se crea con el primer aviso (una acción que no avisa a nadie no deja envío). Al terminar se guarda `familias` (unidades distintas: el **alumno** en asistencia y reuniones —papá y mamá de Juan son una familia—, el apoderado en el resto) y `masivo = familias > 1`. Usan envío: `guardarLista` (lista del día y de curso), el control de ingreso (spec 05), `publicarComunicado`, la libreta publicada, tarea nueva, documento nuevo y `avisarReunion`. No usan envío (individuales): portería, chat, justificaciones, invitaciones, alertas a dirección, soporte y Nudito+.
- Componente `VistaPreviaAviso` (iframe `sandbox`) usado al pasar lista.

## Canales
Solo **correo** (Nodemailer: Mailpit local, Amazon SES en el piloto) y **Web Push**. WhatsApp y SMS se **retiraron el
2026-10-31** (decisión del dueño: no se usarán). La migración `20261031100000_planes_base_pro` borró las filas de `avisos`
con esos canales, dejó el enum `CanalAviso` en (`correo`, `push`) y quitó `tenants.whatsapp_activo`, `tenants.sms_activo`,
`preferencias_aviso.whatsapp` y `preferencias_aviso.sms`. Se eliminaron la ruta `/api/webhooks/whatsapp`, la sección
«Canales de pago» de `/configuracion`, la tarjeta «Mi celular» de `/perfil` y las variables `WHATSAPP_*`, `SMS_*` y `TWILIO_*`.
La interfaz `NotificationChannel` se mantiene para correo y push.

## Textos y UX
- llegó: «Mateo llegó al colegio a las 7:52 a. m.»
- tarde: «Lucía llegó tarde hoy (8:15 a. m.). Si tienes dudas, escríbele a su tutora.»
- falta: «Mateo no llegó hoy a la 1.ª hora. Si ya lo sabías, puedes justificar la falta.» + botón **Justificar falta**.
- problema: «Hoy, a las 10:05 a. m., el colegio registró una situación con Mateo que necesita tu atención.» · «Detalle: …» · «Por favor, escríbele a su tutora para conversarlo.» + **Escribir a la tutora**.
- resumen: «Llegadas de hoy» con una línea por hijo.
- mensaje: «Lucía García te escribió sobre Mateo.» + **Leer mensaje** · comunicado: «<colegio> publicó un comunicado: «<título>».» (+ «Incluye N archivos adjuntos.») + **Leer comunicado** (lleva a `/comunicados#comunicado-<id>`) · invitación: «Hola, Rosa.» «<colegio> te invitó a Khipu Escolar como Familia.» + **Aceptar invitación**.
- tarea: «Mateo tiene una tarea nueva de Matemática: «Fichas de fracciones».» · «Se entrega el 30/10/2026.» + **Ver tareas** (sin hijo: «Hay una tarea nueva de…»).
- alerta a dirección (insignia «! Correo desactivado»): «Dejamos de enviar avisos por correo a Rosa Quispe (familia de Mateo) porque su correo rebotó (la dirección no existe o no recibe mensajes).» · «Revisa su correo con la familia y actualízalo para que vuelva a recibir avisos.» + **Ver avisos**. Con queja: «… porque marcó nuestro correo como spam.»
- justificación revisada: «El colegio revisó la justificación de la falta de Mateo del 26/10/2026.» + «La falta quedó justificada.» o «La justificación no fue aceptada. Si tienes dudas, escríbele a su tutora.»
- Insignia de estado con símbolo tipográfico + palabra (✓ Llegó, ◷ Tarde, ! No llegó, ! Aviso en rojo para problema); sin emojis. Cabecera con el logo de Khipu Escolar (`/marca/logotipo-horizontal@2x.png`, 190×56, URL absoluta) junto al nombre del colegio (y su logo si el payload trae `logoColegioUrl`). Cuerpo blanco con radio 14 px y borde `arena` sobre fondo `#FAF7F2`; botón índigo con texto blanco. Nudito (PNG fijo, `alt="Nudito, de Khipu Escolar"`) solo en tarea nueva y libreta publicada; nunca en faltas, tardanzas ni problemas. Pie: «Este aviso lo envía <colegio> con Khipu Escolar.» + «Ajustar mis avisos» + «Khipu Escolar · Cada día de tu hijo, bien anudado.».

## Errores y casos borde
- SMTP caído → reintentos; Mailpit/SES sin respuesta no bloquea al profesor (se envía en `after()`).
- Push sin claves VAPID → aviso `omitido`.
- Evento SES sin fila conocida → se ignora (200).
- Worker caído a mitad del lote → las filas quedan en `enviando` y el siguiente worker las recupera pasados 10 min (puede repetirse un envío que sí salió; preferimos eso a perder el aviso).
- Si falla encolar la alerta a dirección, el webhook igual responde 200 (se registra en el log).

## Pruebas
- unit: `plantillas-avisos.test.ts` (textos exactos, botón de falta, sin emojis, todas las plantillas del contrato incl. `tarea_nueva`, `libreta_publicada`, `alerta_rebote` y `soporte_inicio`, payload inválido), `cola-limites.test.ts` (tope diario, ritmo, reintentos), `firma-sns.test.ts`.
- integración: `cola-avisos.test.ts` (cola → Mailpit con remitente y enlace, tope diario → pendiente, reintentos → error, plantilla desconocida, eventos SES y rebote permanente, varios workers a la vez vacían toda la cola sin repetir filas, el worker activo toma lo que se encola mientras envía); `preferencias-personal-y-comunicados-push.test.ts` (preferencias del personal, alerta a dirección, comunicado normal sin correo e importante con correo, enlace directo); `bandeja-general.test.ts` (specs/38); `avisos-pendientes.test.ts` (dos workers en paralelo no repiten filas, recuperación de `enviando` —con otro worker activo en el colegio el llamado se retira y la fila recuperada sale en el siguiente—, aviso al profesor por bandeja + push sin correo y límite de 15 min, aviso de tarea (bandeja + push), alerta de rebote/queja una vez por día)

## Pendientes
- Ninguno de canales: no se agregarán WhatsApp ni SMS.

## Cron programado
`vercel.json` ejecuta `/api/cron/avisos` y `/api/cron/exportaciones` una vez al día (límite de Vercel Hobby); es un respaldo, porque cada acción procesa la cola al momento con `after()`. En producción `/api/cron/avisos` debe correr **cada 1–5 min** (Vercel Pro, `pg_cron` + `pg_net` de Supabase o disparador externo; ejemplos en `docs/despliegue.md` §3). Vercel envía `Authorization: Bearer <CRON_SECRET>`. Guía: `docs/despliegue.md` §3.
