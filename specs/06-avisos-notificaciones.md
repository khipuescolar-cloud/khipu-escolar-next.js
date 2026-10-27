# 06 — Avisos y notificaciones

> Estado: implementado · Plan: Básico · Última actualización: 2026-10-27 (Claude Code, rama `feat/avisos-pendientes`)

## Objetivo
Avisar a la familia por correo y push cada vez que se registra la asistencia (y en mensajes, comunicados, invitaciones, justificaciones y tareas), avisar al personal cuando le toca actuar (mensajes de familias, justificaciones recibidas, correos desactivados) y no pasarse de los límites del proveedor.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Apoderado | Elegir correo y/o push (`/asistencia#avisos`), activar push en su dispositivo | Ver avisos de otras familias |
| Dirección | Ver `/avisos`: enviados, apertura (meta 70 %), cola, rebotes, errores; recibir `alerta_rebote` | — |
| Profesor | Recibir `mensaje_nuevo` (correo + push) cuando una familia le escribe y `justificacion_recibida` como tutor | — |
| Cron | `GET/POST /api/cron/avisos` con `Authorization: Bearer <CRON_SECRET>` | — |
| SNS (AWS) | `POST /api/webhooks/ses` con firma SNS válida | — |

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
| `alerta_rebote` | alerta_direccion | dirección (correo) | apoderadoId | `{ colegio, apoderado, alumnos: string[], motivo, url }` |

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
procesarCola({ ahora?, tenantId?, maxAvisos = 100, canales?, esperar?, limites? }): Promise<{ enviados, reintentos, errores, omitidos, diferidos, resumenes, recuperados }>
ENVIANDO_MAX_MINUTOS = 10
generarResumenesLlegadas({ ahora, tenantId? }): Promise<number>
// notificaciones/limites.ts (puras): cupoDiario, pausaEntreCorreosMs, esperaReintentoMs, MAX_INTENTOS = 4, leerLimites, tocaResumen
// notificaciones/ses.ts: urlDeAwsValida, textoAFirmar, verificarFirmaSns, confirmarSuscripcion, procesarEventoSes
// notificaciones/avisos-familia.ts: encolarAvisoFamilia(ctx, { plantilla: mensaje_nuevo (con conversacionId) | comunicado | invitacion, … })
// notificaciones/avisos-mensajes.ts: avisarMensajeNuevo(ctx, conversacion): number   // a la familia o al profesor según quién escribe
// notificaciones/avisos-tareas.ts: avisarTareaNueva(ctx, tareaId, entrada): number, pideAvisarFamilias(entrada)
// notificaciones/alertas-direccion.ts: alertarCorreoDesactivado(tenantId, apoderadoId, "rebote" | "queja", ahora?): number
// notificaciones/preferencias.ts: obtenerPreferencias, guardarPreferencias, guardarSuscripcionPush, quitarSuscripcionPush
// email/plantillas/index.ts: renderizarPlantilla(nombre, payload): { asunto, html, texto, push }, NOMBRES_PLANTILLA
// avisos.ts: panelAvisos(ctx) (dirección)
```

## Rutas y UI
- `/api/cron/avisos` (GET/POST, bearer `CRON_SECRET`, comparación en tiempo constante; sin `CRON_SECRET` siempre 401).
- `/api/webhooks/ses` (POST): firma SNS v1 (SHA1) y v2 (SHA256) con `node:crypto`; certificado solo de `https://sns.<región>.amazonaws.com(.cn)/….pem`; si `SES_SNS_TOPIC_ARN` está definido, exige ese tema.
- `/asistencia#avisos` (apoderado): casillas correo/push y «Activar notificaciones en este dispositivo» (registra `public/sw.js`, suscribe con VAPID y guarda vía server action).
- `/avisos` (dirección): tarjetas (enviados 30 días, apertura, cola/rebotes/errores) y los 100 últimos avisos; filtros por estado (incluye `enviando`) y tipo (incluye `justificacion`, `tarea`, `alerta_direccion`).
- Componente `VistaPreviaAviso` (iframe `sandbox`) usado al pasar lista.

## Textos y UX
- llegó: «Mateo llegó al colegio a las 7:52 a. m.»
- tarde: «Lucía llegó tarde hoy (8:15 a. m.). Si tienes dudas, escríbele a su tutora.»
- falta: «Mateo no llegó hoy a la 1.ª hora. Si ya lo sabías, puedes justificar la falta.» + botón **Justificar falta**.
- problema: «Hoy, a las 10:05 a. m., el colegio registró una situación con Mateo que necesita tu atención.» · «Detalle: …» · «Por favor, escríbele a su tutora para conversarlo.» + **Escribir a la tutora**.
- resumen: «Llegadas de hoy» con una línea por hijo.
- mensaje: «Lucía García te escribió sobre Mateo.» + **Leer mensaje** · comunicado: «<colegio> publicó un comunicado: «<título>».» + **Leer comunicado** · invitación: «Hola, Rosa.» «<colegio> te invitó a Khipu Escolar como Familia.» + **Aceptar invitación**.
- tarea: «Mateo tiene una tarea nueva de Matemática: «Fichas de fracciones».» · «Se entrega el 30/10/2026.» + **Ver tareas** (sin hijo: «Hay una tarea nueva de…»).
- alerta a dirección (insignia «! Correo desactivado»): «Dejamos de enviar avisos por correo a Rosa Quispe (familia de Mateo) porque su correo rebotó (la dirección no existe o no recibe mensajes).» · «Revisa su correo con la familia y actualízalo para que vuelva a recibir avisos.» + **Ver avisos**. Con queja: «… porque marcó nuestro correo como spam.»
- justificación revisada: «El colegio revisó la justificación de la falta de Mateo del 26/10/2026.» + «La falta quedó justificada.» o «La justificación no fue aceptada. Si tienes dudas, escríbele a su tutora.»
- Insignia de estado con símbolo tipográfico + palabra (✓ Llegó, ◷ Tarde, ✕ Falta, ! Problema); sin emojis. Pie: «Este aviso lo envía <colegio> con Khipu Escolar.» + «Ajustar mis avisos».

## Errores y casos borde
- SMTP caído → reintentos; Mailpit/SES sin respuesta no bloquea al profesor (se envía en `after()`).
- Push sin claves VAPID → aviso `omitido`.
- Evento SES sin fila conocida → se ignora (200).
- Worker caído a mitad del lote → las filas quedan en `enviando` y el siguiente worker las recupera pasados 10 min (puede repetirse un envío que sí salió; preferimos eso a perder el aviso).
- Si falla encolar la alerta a dirección, el webhook igual responde 200 (se registra en el log).

## Pruebas
- unit: `plantillas-avisos.test.ts` (textos exactos, botón de falta, sin emojis, todas las plantillas del contrato incl. `tarea_nueva` y `alerta_rebote`, payload inválido), `cola-limites.test.ts` (tope diario, ritmo, reintentos, hora del resumen), `firma-sns.test.ts`.
- integración: `cola-avisos.test.ts` (cola → Mailpit con remitente y enlace, tope diario → pendiente, reintentos → error, plantilla desconocida, eventos SES y rebote permanente, resumen de llegadas una vez al día); `avisos-pendientes.test.ts` (dos workers en paralelo no repiten filas, recuperación de `enviando`, aviso al profesor correo + push y límite de 15 min, aviso de tarea, alerta de rebote/queja una vez por día).

## Pendientes
- WhatsApp Cloud API y SMS con la misma interfaz.
- Preferencias de aviso para el personal (hoy el profesor siempre recibe `mensaje_nuevo` por correo y en sus dispositivos con push).
- Los avisos de chat y de alertas a dirección los envía el cron (no hay `after()` en esas acciones).

## Cron programado
`vercel.json` ejecuta `/api/cron/avisos` cada minuto (y `/api/cron/exportaciones` cada 5). Vercel envía `Authorization: Bearer <CRON_SECRET>`. Guía: `docs/despliegue.md`.
