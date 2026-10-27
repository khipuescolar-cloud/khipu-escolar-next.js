# 06 — Avisos y notificaciones

> Estado: borrador (requisitos) · Última actualización: 2026-10-26 (Claude Code). Quien lo implemente completa las secciones de la plantilla. · Plan: Básico

## Objetivo
Avisar a la familia por correo y push cada vez que se registra la asistencia, sin pasarse de los límites del proveedor.

## Canales (interfaz `NotificationChannel` en `src/lib/server/notificaciones/`)
- **Correo:** Nodemailer con SMTP configurable (`SMTP_*`). En local, Mailpit (puerto 54325, se ve en http://127.0.0.1:54324). En el piloto, **Amazon SES SMTP**.
- **Push:** `web-push` con VAPID, service worker `public/sw.js`, suscripción guardada en `push_suscripciones`. La familia la activa desde su panel.
- **Preferencias:** `preferencias_aviso` (correo y/o push) por apoderado.
- **Futuro:** WhatsApp Cloud API y SMS, con la misma interfaz.

## Cola (`avisos`)
1. Al guardar la asistencia se crean filas `pendiente`, una por apoderado con `recibeAvisos`, consentimiento vigente (no revocado) y canal activo.
2. Worker `procesarCola()`: route handler `/api/cron/avisos` protegido con `CRON_SECRET`, que se llama tras cada guardado (`after()`) y por cron. Envía en orden `programadoPara`, con un ritmo de `EMAIL_RATE_PER_SECOND`, sin pasar `EMAIL_DAILY_LIMIT` correos en 24 h (global). Si se pasa, quedan `pendiente` para el día siguiente. Hace 3 reintentos con espera creciente; después, `error`.
3. `tenant.modoAvisos = solo_excepciones`: `tarde`, `falta` y `problema` se avisan al instante; las llegadas se agrupan en un correo `resumen_llegadas` a la `horaEnvioAvisos`.

## Plantillas (`src/lib/server/email/plantillas/`)
- HTML simple y accesible, más una versión en texto. Las firma el colegio («I.E.P. Nuevo Horizonte» como nombre del remitente, `EMAIL_FROM_ADDRESS`). Siempre con ícono + palabra y nunca solo color. Sin emojis en las malas noticias.
- Textos:
  - llegó: «Mateo llegó al colegio a las 7:52 a. m.»
  - tarde: «Lucía llegó tarde hoy (8:15 a. m.). Si tienes dudas, escríbele a su tutora.»
  - falta: «Mateo no llegó hoy a la 1.ª hora. Si ya lo sabías, puedes justificar la falta.» + botón **Justificar falta** (token, spec 07)
  - problema: tono serio, invita a escribir al tutor.
  - nuevo mensaje, comunicado e invitación.
- Encabezados `List-Unsubscribe` y enlace para ajustar las preferencias.

## SES (piloto)
- Dominio verificado (Easy DKIM + SPF + DMARC), fuera del sandbox.
- Configuration set → SNS → `/api/webhooks/ses`: valida la firma SNS y actualiza `entregado`, `abierto`, `rebotado` y `queja`. Un rebote permanente o una queja desactivan ese correo (`recibeAvisos=false`) y se avisa a dirección.
- Meta del piloto: 70 % de apertura (se mide en `/avisos`).

## Límites de referencia
Gmail ≈500/día, Workspace ≈2000/día, Brevo gratis ≈300/día, SES ≈0,10 USD por 1000.

## Pruebas
- unit: plantillas (textos exactos, la falta incluye el botón), el tope diario.
- integración: cola → Mailpit (API http://127.0.0.1:54324/api/v1/messages).
