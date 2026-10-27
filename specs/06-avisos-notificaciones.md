# 06 — Avisos y notificaciones

> Estado: implementado · Plan: Básico · Última actualización: 2026-10-27 (Claude Code, rama `feat/p3-canales-pago`)

## Objetivo
Avisar a la familia por correo y push (y, si el colegio lo activa, WhatsApp y SMS) cada vez que se registra la asistencia (y en mensajes, comunicados, invitaciones, justificaciones y tareas), avisar al personal cuando le toca actuar (mensajes de familias, justificaciones recibidas, correos desactivados) y no pasarse de los límites del proveedor.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Apoderado | Elegir correo y/o push (`/asistencia#avisos`), activar push en su dispositivo; WhatsApp/SMS si el colegio los activó; guardar su celular en `/perfil#celular` | Ver avisos de otras familias |
| Dirección | Activar o apagar WhatsApp y SMS (`/configuracion`, «Canales de pago»); ver `/avisos`: enviados, apertura (meta 70 %), cola, rebotes, errores; recibir `alerta_rebote` y `soporte_inicio` | — |
| Profesor | Recibir `mensaje_nuevo` (correo + push) cuando una familia le escribe y `justificacion_recibida` como tutor | — |
| Cron | `GET/POST /api/cron/avisos` con `Authorization: Bearer <CRON_SECRET>` | — |
| SNS (AWS) | `POST /api/webhooks/ses` con firma SNS válida | — |
| Meta (WhatsApp) | `GET/POST /api/webhooks/whatsapp` (verificación y estados, firma HMAC) | — |

## Flujos
1. Un módulo crea filas `pendiente` en `avisos` (ver **Contrato**). Asistencia y portería usan `encolarAvisosAsistencia()`; justificaciones, `encolarAviso()` / `encolarParaDestinatario()`; chat, `avisarMensajeNuevo()`; tareas, `avisarTareaNueva()`; el webhook de SES, `alertarCorreoDesactivado()`.
2. Tras guardar, la action llama `after(() => procesarCola({ tenantId }))`. El cron llama `procesarCola()` global.
3. El worker recupera las filas atascadas en `enviando`, reserva su lote (`pendiente → enviando`), renderiza por `plantilla` + `payload`, envía por el canal y guarda `estado = enviado`, `enviadoAt`, `providerMessageId` (Message-ID de Nodemailer).
4. SES → SNS → `/api/webhooks/ses`: valida la firma, confirma la suscripción y actualiza `entregado` / `abierto` / `rebotado` / `queja`. Rebote permanente o queja → desactiva los avisos de esa familia y encola `alerta_rebote` a dirección.

## Reglas de negocio
- **Destinatarios** (`destinatariosDeAlumno`): vínculo con `recibeAvisos = true`, membresía activa y **consentimiento no revocado**; canales según `preferencias_aviso` (sin fila = correo y push). Push = una fila por suscripción del usuario.
- **Tope diario** `EMAIL_DAILY_LIMIT`: correos con `enviadoAt` en las últimas 24 h, **global** (todos los colegios). Sin cupo, la fila queda `pendiente` (se cuenta como `diferidos`).
- **Ritmo** `EMAIL_RATE_PER_SECOND`: pausa de `ceil(1000/ritmo)` ms entre correos.
- **Reserva atómica**: el worker elige el lote (respetando el cupo diario) y lo reserva con un solo `UPDATE avisos SET estado = 'enviando', programado_para = now() WHERE id = ANY(lote) AND estado = 'pendiente' RETURNING id`. Postgres bloquea cada fila y reevalúa la condición: si dos workers corren a la vez, cada fila la obtiene uno solo (probado con dos `procesarCola()` en paralelo). Mientras está `enviando`, `programadoPara` guarda la hora de la reserva.
- **Recuperación**: al empezar, las filas en `enviando` hace más de `ENVIANDO_MAX_MINUTOS` (10) vuelven a `pendiente` contando un intento (o pasan a `error` si ya agotaron los reintentos). El resumen devuelve `recuperados`.
- **Reintentos**: 1 intento + 3 reintentos (esperas 1, 5 y 15 min); al 4.º fallo, `error`. Plantilla o payload inválido → `error` sin reintento. Suscripción push vencida (404/410) → se borra y el aviso queda `omitido`.
- **`modoAvisos = solo_excepciones`**: tarde, falta y problema al instante; las llegadas no se encolan y, desde `horaEnvioAvisos` (hora local), el worker crea un `resumen_llegadas` por familia con la primera llegada de cada hijo (una vez al día, marcado con `payload.fecha`).
- **Falta**: se crea un `justificacion_tokens` por familia; el payload guarda solo `justificacionTokenId` y el worker arma `urlJustificar` con el token derivado (HMAC con `APP_SECRET`). El token nunca se guarda en la BD.
- Remitente: nombre = colegio (`tenant.nombre`), dirección = `EMAIL_FROM_ADDRESS`. Encabezados `List-Unsubscribe: <…/asistencia#avisos>` y `X-Khipu-Aviso: <avisoId>`.
- SES: un estado nunca retrocede (abierto no vuelve a entregado). Rebote **permanente** o queja → `recibeAvisos = false` en todos los vínculos de ese apoderado en el colegio + auditoría + `alerta_rebote` (tipo `alerta_direccion`, correo) a cada miembro activo de dirección, `referenciaId = apoderadoId`, **máx. 1 por apoderado por día** (Lima). Esas filas no llevan `apoderadoId`, así un rebote del correo de dirección no genera otra alerta.
- **Mensajes**: `mensaje_nuevo` con `referenciaId = conversacionId`; máx. 1 por conversación y destinatario cada 15 min (familia: por `apoderadoId`; profesor: filas sin `apoderadoId`). Al profesor: correo + push por cada suscripción, sin consentimiento.
- **Tareas**: `tarea_nueva` solo si el profesor marca «Avisar a las familias»; familias del salón con consentimiento, `referenciaId = tareaId`, una vez por tarea.
- **Libreta publicada**: `libreta_publicada` (tipo `libreta`) cuando dirección usa «Publicar libreta y avisar a las familias» (spec 11): una fila por familia y canal (no por hijo; los nombres de los hijos van juntos), `referenciaId = periodoId`. Solo se envía una vez por periodo; «Reenviar aviso» lo repite.
- **Enlace de preferencias**: el worker agrega `urlPreferencias` (y `List-Unsubscribe`) solo a plantillas de familia **en filas con `apoderadoId`**; los avisos al personal no lo llevan.

## Contrato de plantillas (para otros módulos)
Insertar en `avisos`: `tenantId`, `tipo`, `canal` (`correo` → `destinatario` = email; `push` → endpoint), `plantilla`, `asunto` (informativo; el worker usa el de la plantilla), `payload`, `apoderadoId` (si es familia), `referenciaId` (conversación, tarea, justificación o apoderado; para agrupar y limitar), `estado = pendiente` (por defecto). **Solo para apoderados con consentimiento vigente y según sus preferencias** (usa `destinatariosDeAlumno` + `encolarParaDestinatario`, que además valida el payload). El worker agrega `colegio` si falta y `urlPreferencias` en las plantillas de familia (filas con `apoderadoId`). Los avisos al personal (profesor, tutora, dirección) no exigen consentimiento.

| `plantilla` | `tipo` | Destinatario | `referenciaId` | `payload` |
|---|---|---|---|---|
| `asistencia_llego` | asistencia | familia | — | `{ colegio, alumno, hora: "HH:mm" }` |
| `asistencia_tarde` | asistencia | familia | — | `{ colegio, alumno, hora }` |
| `asistencia_falta` | asistencia | familia | — | `{ colegio, alumno, momento?: "a la 1.ª hora", justificacionTokenId? \| urlJustificar? }` |
| `asistencia_problema` | asistencia | familia | — | `{ colegio, alumno, hora, nota?, urlMensajes? }` |
| `resumen_llegadas` | resumen_llegadas | familia | — | `{ colegio, llegadas: [{ alumno, hora }], fecha?: "AAAA-MM-DD" }` |
| `mensaje_nuevo` | mensaje | familia o profesor | conversacionId | `{ colegio, remitente, alumno, url }` |
| `comunicado` | comunicado | familia | — | `{ colegio, titulo, url }` |
| `invitacion` | invitacion | persona invitada | — | `{ colegio, nombre, rol, url }` |
| `justificacion_recibida` | justificacion | tutora (correo) | justificacionId | `{ colegio, alumno, fecha: "AAAA-MM-DD", url }` |
| `justificacion_revisada` | justificacion | familia | justificacionId | `{ colegio, alumno, fecha: "AAAA-MM-DD", estado: "aceptada" \| "rechazada", comentario? }` |
| `tarea_nueva` | tarea | familia | tareaId | `{ colegio, alumno?, curso, titulo, fechaEntrega: "AAAA-MM-DD", url }` |
| `libreta_publicada` | libreta | familia | periodoId | `{ colegio, alumno?, periodo: "I Bimestre 2026", url }` (botón «Ver libreta» → `/libreta`) |
| `alerta_rebote` | alerta_direccion | dirección (correo) | apoderadoId | `{ colegio, apoderado, alumnos: string[], motivo, url }` |
| `soporte_inicio` | alerta_direccion | dirección (correo y/o push según su perfil) | accesoId | `{ colegio, hasta: "HH:mm", motivo, url }` → «El equipo de Khipu Escolar entró a tu colegio en modo soporte (solo lectura) hasta las HH:mm. Motivo: …», botón «Ver auditoría» (specs/16) |

`justificacion_*` también guardan `asistenciaId`.

## Modelo de datos
- `avisos` (cola y registro; `estado` incluye `enviando`; `referenciaId`), `preferencias_aviso`, `push_suscripciones` (global por usuario, `endpoint` único), `apoderados_alumnos.recibeAvisos`, `consentimientos.revocadoAt`, `justificacion_tokens`.

## Contratos de `src/lib/server`
```ts
// notificaciones/tipos.ts
interface NotificationChannel { canal: CanalAviso; enviar(e: EnvioAviso): Promise<{ providerMessageId? }> }
// notificaciones/email.ts  → EmailChannel (Nodemailer, SMTP_HOST/PORT/SECURE/USER/PASS, EMAIL_FROM_ADDRESS)
// notificaciones/push.ts   → PushChannel (web-push, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT)
// notificaciones/encolar.ts
destinatariosDeAlumno(tdb, alumnoId): Promise<Destinatario[]>
encolarAviso(tdb, { tenantId, tipo, canal, destinatario, plantilla, payload, apoderadoId?, asistenciaId?, referenciaId?, programadoPara? }): Promise<string>
encolarParaDestinatario(tdb, destinatario, { tenantId, tipo, plantilla, payload, asistenciaId?, referenciaId? }): Promise<number>
encolarAvisosAsistencia(tdb, { tenant, asistencia, alumnoNombre, momento, urlMensajes? }): Promise<number /* familias */>
crearTokenJustificacion(tdb, { tenantId, asistenciaId, apoderadoId }): Promise<{ id, token }>
// notificaciones/cola.ts
procesarCola({ ahora?, tenantId?, maxAvisos = 100, canales?, esperar?, limites?, limitesPago? }): Promise<{ enviados, reintentos, errores, omitidos, diferidos, resumenes, recuperados }>
ENVIANDO_MAX_MINUTOS = 10
generarResumenesLlegadas({ ahora, tenantId? }): Promise<number>
// notificaciones/limites.ts (puras): limiteCanalDePago, CANALES_DE_PAGO, cupoDiario, pausaEntreCorreosMs, esperaReintentoMs, MAX_INTENTOS = 4, leerLimites, tocaResumen
// notificaciones/ses.ts: urlDeAwsValida, textoAFirmar, verificarFirmaSns, confirmarSuscripcion, procesarEventoSes
// notificaciones/avisos-familia.ts: encolarAvisoFamilia(ctx, { plantilla: mensaje_nuevo (con conversacionId) | comunicado | invitacion, … })
// notificaciones/avisos-mensajes.ts: avisarMensajeNuevo(ctx, conversacion): number   // a la familia o al profesor según quién escribe
// notificaciones/avisos-tareas.ts: avisarTareaNueva(ctx, tareaId, entrada): number, pideAvisarFamilias(entrada)
// notificaciones/alertas-direccion.ts: alertarCorreoDesactivado(tenantId, apoderadoId, "rebote" | "queja", ahora?): number
// notificaciones/preferencias.ts: obtenerPreferencias, guardarPreferencias, guardarSuscripcionPush, quitarSuscripcionPush, destinoPersonal(tdb, membershipId, roles)
//   `preferencias_aviso.apoderado_id` es en realidad un id de MEMBRESÍA: aplica a cualquier rol (apoderado, profesor, dirección, administrativo). Sin fila = correo y push activos.
// email/plantillas/index.ts: renderizarPlantilla(nombre, payload): { asunto, html, texto, push }, NOMBRES_PLANTILLA
// avisos.ts: panelAvisos(ctx) (dirección)
// notificaciones/whatsapp.ts: WhatsAppChannel, plantillaMeta(plantilla, payload), armarSolicitudWhatsapp, whatsappConfigurado, whatsappSoportaPlantilla
// notificaciones/sms.ts: SmsChannel, textoSms(plantilla, payload) (≤ 160, sin tildes), smsConfigurado, smsSoportaPlantilla
// notificaciones/whatsapp-webhook.ts: firmaWhatsappValida, verificarSuscripcionWhatsapp, extraerEstadosWhatsapp, aplicarEstadosWhatsapp
// notificaciones/canales-pago.ts: estadoCredenciales, resolverCanalesPago, actualizarCanalesPago (solo dirección, audita), obtenerOpcionesCanalesPago, guardarTelefonoPerfil
// encolar.ts: encolarCanalesPago(tdb, destinos, datos), tieneCanalAviso(destinatario)
// lib/telefono.ts: normalizarTelefonoPeru, enmascararTelefono, formatearTelefono
```

## Rutas y UI
- `/api/cron/avisos` (GET/POST, bearer `CRON_SECRET`, comparación en tiempo constante; sin `CRON_SECRET` siempre 401).
- `/api/webhooks/ses` (POST): firma SNS v1 (SHA1) y v2 (SHA256) con `node:crypto`; certificado solo de `https://sns.<región>.amazonaws.com(.cn)/….pem`; si `SES_SNS_TOPIC_ARN` está definido, exige ese tema.
- `/api/webhooks/whatsapp`: **GET** verificación (`hub.mode=subscribe` + `hub.verify_token` = `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, comparación en tiempo constante; responde `hub.challenge` en texto plano, si no 403). **POST** estados: exige `X-Hub-Signature-256: sha256=<hmac>` (HMAC SHA-256 del cuerpo crudo con `WHATSAPP_APP_SECRET`, tiempo constante; sin secreto o firma mala → 403). Cada `status` se busca por `providerMessageId` (el `wamid`): `delivered → entregado` (+`entregadoAt`), `read → abierto` (+`abiertoAt`), `failed → error` con el motivo de Meta. Un estado nunca retrocede (un «entregado» tardío no pisa «abierto»).
- `/configuracion` → **Canales de pago** (solo dirección): interruptores WhatsApp y SMS, aviso de costo por mensaje y estado de credenciales del servidor («Configurado» / «Falta configurar en el servidor», nunca los valores). Guardar audita (`editar`, `configuracion`).
- `/perfil#celular` (todos los roles): celular de Perú que se guarda en E.164 en `profiles.telefono`. Las preferencias (`/asistencia#avisos` del apoderado y `/perfil#avisos` del personal) muestran las casillas WhatsApp/SMS **solo si el colegio activó el canal**, con el celular enmascarado («+51 *** *** 321») o un enlace para agregarlo.
- `/perfil#avisos` (profesor, dirección, administrativo): las mismas casillas correo/push y «Activar notificaciones en este dispositivo» (`PreferenciasPersonal`, acciones en `perfil/actions.ts`). Se respetan en `mensaje_nuevo` al profesor (`avisarMensajeNuevo`) y en la alerta de correo desactivado a dirección (`alertarCorreoDesactivado`, que ahora también envía push a sus dispositivos). Si apaga ambos canales no se encola nada.
- **Envío inmediato (`after()`)**: `enviarMensajeAction` (chat) y `/api/webhooks/ses` (alerta a dirección, vía `procesarEventoSes(evento, { alEncolarAlerta })`) llaman a `procesarCola({ tenantId })` tras responder, solo si se encoló algo. Es el mismo worker del cron: respeta el tope diario global y la reserva atómica `pendiente → enviando`.
- Familias: `encolarAvisoFamilia` (mensaje y comunicado) ahora encola también **push** (una fila por dispositivo) según `preferencias_aviso`.
- `/asistencia#avisos` (apoderado): casillas correo/push y «Activar notificaciones en este dispositivo» (registra `public/sw.js`, suscribe con VAPID y guarda vía server action).
- `/avisos` (dirección): tarjetas (enviados 30 días, apertura, cola/rebotes/errores) y los 100 últimos avisos; filtros por estado (incluye `enviando`) y tipo (incluye `justificacion`, `tarea`, `alerta_direccion`).
- Componente `VistaPreviaAviso` (iframe `sandbox`) usado al pasar lista.

## WhatsApp y SMS (canales de pago, apagados por defecto)
Misma interfaz `NotificationChannel` que correo y push; la fila de `avisos` lleva `canal = whatsapp | sms` y `destinatario` = celular E.164.

**Cuándo se encola** (todo debe cumplirse; `resolverCanalesPago` + `encolarCanalesPago`):
1. el colegio activó el canal (`Tenant.whatsappActivo` / `smsActivo`, por defecto `false`);
2. el servidor tiene las credenciales (si no, **no se encola** y se deja `console.warn`: así no hay filas condenadas a fallar ni se acumulan errores);
3. el destinatario lo eligió (`PreferenciaAviso.whatsapp` / `sms`, por defecto `false`) y tiene un celular válido en su perfil (`+51` + 9 dígitos que empiezan en 9; se acepta «987 654 321», «+51…», «0051…»);
4. la plantilla tiene versión para el canal: asistencia llegó/tarde/falta, comunicado, mensaje nuevo (a familia y a profesor) y libreta publicada. Resumen de llegadas, tarea, problema, justificaciones, invitación, bienvenida y alerta de rebote **no** salen por WhatsApp/SMS.
Una fila extra por canal, además del correo y push (la familia puede elegir solo WhatsApp: `tieneCanalAviso`). Comparte reglas de consentimiento con el resto.

**Worker** (`cola.ts`): reserva atómica y reintentos iguales a correo. Tope diario **propio por canal** en ventana de 24 h, global: `WHATSAPP_DAILY_LIMIT` (1000 por defecto) y `SMS_DAILY_LIMIT` (300); lo que excede queda `pendiente` (`diferidos`). Si las credenciales desaparecen después de encolar, el canal lanza `EnvioPermanenteError` y la fila pasa a `omitido` con el motivo («WhatsApp sin credenciales en el servidor…»), sin reintentos. Errores permanentes del proveedor (número sin WhatsApp, 131026; número inválido en Twilio, 21211…) → `omitido`; 5xx/429/red → reintento.

**WhatsApp Cloud API** (`whatsapp.ts`): `POST https://graph.facebook.com/<WHATSAPP_API_VERSION>/<WHATSAPP_PHONE_NUMBER_ID>/messages` con `Authorization: Bearer <WHATSAPP_TOKEN>`; mensaje `type: "template"`, idioma `es` (`IDIOMA_PLANTILLA`; se puede cambiar a `es_PE` si así se aprobaron), parámetros de texto del cuerpo. Plantillas a aprobar en Meta (categoría *Utility*, cuerpo con variables en este orden):
| Plantilla Meta | Parámetros |
|---|---|
| `khipu_asistencia_llego` | {{1}} alumno · {{2}} hora · {{3}} colegio |
| `khipu_asistencia_tarde` | {{1}} alumno · {{2}} hora · {{3}} colegio |
| `khipu_asistencia_falta` | {{1}} alumno · {{2}} momento («a la 1.ª hora») · {{3}} colegio |
| `khipu_comunicado` | {{1}} título · {{2}} colegio |
| `khipu_mensaje_nuevo` | {{1}} remitente · {{2}} alumno · {{3}} colegio |
| `khipu_libreta` | {{1}} alumno («tu hijo» si falta) · {{2}} periodo · {{3}} colegio |
Los parámetros se limpian (sin saltos de línea ni tabulaciones, ≤ 1024). Las plantillas no llevan botón con enlace: la familia entra a Khipu para justificar o leer.

**SMS** (`sms.ts`): `SMS_PROVEEDOR=twilio`; `POST https://api.twilio.com/2010-04-01/Accounts/<TWILIO_ACCOUNT_SID>/Messages.json` con Basic auth y `To`, `From = TWILIO_FROM`, `Body`. Texto ≤ 160 caracteres, sin tildes (GSM-7), con solo el nombre de pila del alumno: «<colegio>: Mateo no llego hoy a la 1.a hora. Justifica en Khipu Escolar.»; comunicado, mensaje y libreta no incluyen título ni remitente.

**Costos aproximados en Perú** (referenciales; verifica la tarifa vigente de cada proveedor): WhatsApp, conversación/mensaje de plantilla *utility* ≈ US$ 0.01–0.02 por mensaje (Meta cobra por mensaje de plantilla entregado, según país y categoría; los *marketing* cuestan varias veces más: por eso solo se usan plantillas *utility*). SMS Twilio a celulares de Perú ≈ US$ 0.05–0.10 por segmento. El correo y push siguen sin costo por mensaje. La pantalla de configuración advierte este costo antes de activar.

**Requisitos externos**: *Meta* — cuenta de Meta Business verificada, app con producto WhatsApp, número de teléfono dedicado, token permanente (usuario del sistema), las 6 plantillas aprobadas, webhook apuntando a `/api/webhooks/whatsapp` (campo `messages`/estados) con el *verify token* y el *App Secret*. *Twilio* — cuenta, número remitente o *Alphanumeric Sender ID* habilitado para Perú y permisos geográficos para Perú. Pasos de variables en `docs/despliegue.md` §6b.

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
- Insignia de estado con símbolo tipográfico + palabra (✓ Llegó, ◷ Tarde, ✕ Falta, ! Problema); sin emojis. Pie: «Este aviso lo envía <colegio> con Khipu Escolar.» + «Ajustar mis avisos».

## Errores y casos borde
- SMTP caído → reintentos; Mailpit/SES sin respuesta no bloquea al profesor (se envía en `after()`).
- Push sin claves VAPID → aviso `omitido`.
- WhatsApp/SMS sin credenciales → no se encola; si se quitan después, `omitido` con motivo. El webhook de WhatsApp que llega antes de guardar el `wamid` no encuentra fila y se ignora (200).
- Evento SES sin fila conocida → se ignora (200).
- Worker caído a mitad del lote → las filas quedan en `enviando` y el siguiente worker las recupera pasados 10 min (puede repetirse un envío que sí salió; preferimos eso a perder el aviso).
- Si falla encolar la alerta a dirección, el webhook igual responde 200 (se registra en el log).

## Pruebas
- unit: `plantillas-avisos.test.ts` (textos exactos, botón de falta, sin emojis, todas las plantillas del contrato incl. `tarea_nueva`, `libreta_publicada`, `alerta_rebote` y `soporte_inicio`, payload inválido), `cola-limites.test.ts` (tope diario, ritmo, reintentos, hora del resumen), `firma-sns.test.ts`, `telefono-peru.test.ts` (E.164 y máscara), `canales-whatsapp-sms.test.ts` (mapeo de plantillas, request a Meta/Twilio con `fetch` simulado, errores permanentes vs. reintentables, texto SMS ≤ 160, firma y verificación del webhook, estados).
- integración: `cola-avisos.test.ts` (cola → Mailpit con remitente y enlace, tope diario → pendiente, reintentos → error, plantilla desconocida, eventos SES y rebote permanente, resumen de llegadas una vez al día); `preferencias-personal-y-comunicados-push.test.ts` (preferencias del personal, alerta a dirección, comunicado con push y enlace directo); `canales-whatsapp-sms.test.ts` (encolado según colegio/preferencia/celular/credenciales/plantilla, worker con proveedor simulado, webhook de estados sin retroceso, tope por canal, sin credenciales, configuración solo dirección); `avisos-pendientes.test.ts` (dos workers en paralelo no repiten filas, recuperación de `enviando`, aviso al profesor correo + push y límite de 15 min, aviso de tarea, alerta de rebote/queja una vez por día)

## Pendientes
- **Externo:** crear las cuentas (Meta Business verificada con número, Twilio) y **aprobar las plantillas** de WhatsApp; luego definir las variables en el servidor y activar los canales por colegio. El código está listo y apagado.

## Cron programado
`vercel.json` ejecuta `/api/cron/avisos` cada minuto (y `/api/cron/exportaciones` cada 5). Vercel envía `Authorization: Bearer <CRON_SECRET>`. Guía: `docs/despliegue.md`.
