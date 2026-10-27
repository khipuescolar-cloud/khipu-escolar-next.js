# Plan Básico: asistencia, avisos, portería QR, justificaciones y archivos

| Campo | Valor |
|---|---|
| Fecha | 2026-10-26 |
| Colaborador | Claude Code (orquestador) |
| Agente y modelo | Claude Code · claude-opus-5-5 (subagente del worktree `basico`) |
| Rama y commits | `feat/basico` · ver `git log feat/basico` (commit «Add attendance, notices, QR gate and justifications») |
| Specs afectadas | `specs/04`, `05`, `06`, `07`, `14` y `specs/00-indice.md` |

## Pedidos del colaborador (textual)
> Resumen del encargo del orquestador: implementar parte del MVP de Khipu Escolar trabajando solo en el worktree `khipu-wt/basico` (rama `feat/basico`), en paralelo con otros agentes. Leer `AGENTS.md` y las specs 01–07 y 14; reutilizar `src/lib/server/*`, componentes y layout existentes; no cambiar `prisma/schema.prisma` ni migraciones, ni `src/app/colegio/[slug]/layout.tsx`, ni `src/lib/navegacion.ts`; tests de integración con un colegio de prueba propio (`test-basico-<azar>`) que se limpia; puerto 3001; commit sin push ni merge.

> «Your scope
> 1. **Asistencia (spec 04)**: pages `src/app/colegio/[slug]/asistencia/` — teacher/direction roll call (salón+curso or "Asistencia del día" via `ambito="dia"`), big Llegó/Tarde/Falta/Problema buttons (icon+word), time in America/Lima, "Guardar y avisar a los padres", email preview; parent read-only view of children's last 30 days with "Justificar falta" for unjustified absences. Server logic in `src/lib/server/asistencia.ts`.
> 2. **Avisos y notificaciones (spec 06)**: `src/lib/server/notificaciones/` with `NotificationChannel` interface, `EmailChannel` (Nodemailer, env `SMTP_*`, `EMAIL_FROM_ADDRESS`, from-name = school name), `PushChannel` (web-push, VAPID env vars, `public/sw.js`, subscription UI for parents + server action saving `push_suscripciones`), queue worker `procesarCola()` over the `avisos` table respecting `EMAIL_DAILY_LIMIT` (rolling 24h, global) and `EMAIL_RATE_PER_SECOND`, retries (3, backoff) and `modoAvisos=solo_excepciones` (+ resumen_llegadas at `horaEnvioAvisos`). Route `src/app/api/cron/avisos/route.ts` protected by `CRON_SECRET` (bearer); trigger processing after saving attendance with `after()`. Templates in `src/lib/server/email/plantillas/` (HTML + text, icon+word, exact texts from spec 06, falta → "Justificar falta" button with token link; no emojis on bad news). **Template registry contract (other agents insert rows into `avisos` relying on it):** the worker must render by `aviso.plantilla` name using `aviso.payload`, and support at least these plantillas: `asistencia_llego`, `asistencia_tarde`, `asistencia_falta`, `asistencia_problema`, `resumen_llegadas`, `mensaje_nuevo` (payload `{ colegio, remitente, alumno, url }`), `comunicado` (payload `{ colegio, titulo, url }`), `invitacion` (payload `{ colegio, nombre, rol, url }`), `justificacion_revisada` (payload `{ colegio, alumno, fecha, estado }`). Document this contract in spec 06. SES webhook `src/app/api/webhooks/ses/route.ts`: verify SNS message signature (fetch SigningCertURL only from `sns.*.amazonaws.com`, verify with node crypto), handle SubscriptionConfirmation, update aviso states (Delivery/Open/Bounce/Complaint by `providerMessageId`), permanent bounce/complaint → set `recibeAvisos=false` for that apoderado's links. Store nodemailer messageId in `providerMessageId`. Only enqueue for apoderados with a non-revoked consentimiento and per `preferencias_aviso`.
> 3. **Portería QR (spec 05)**: carnet generation page for dirección (printable page with `qrcode`, token random 32 bytes base64url, store SHA-256 hash in `carnets_qr`, regenerate/revoke), `/porteria` scanner page with `@zxing/browser` (client component) calling a server action that validates hash + same tenant, registers `ambito="dia"`, `origen="porteria"`, estado llego/tarde by `tenant.horaLimiteTardanza`, no duplicates, enqueue aviso; manual search fallback. Use `APP_SECRET` if you need HMAC.
> 4. **Justificaciones (spec 07)**: one-use token (hash stored, 7-day expiry) created when enqueuing a falta aviso; public page `src/app/(publico)/justificar/[token]/` (root domain, no session) with motivo + optional attachment; `/justificaciones` for tutor/dirección to accept/reject (enqueue `justificacion_revisada`), and parents see their submissions.
> 5. **Archivos (spec 14)**: `src/lib/server/storage/` with `FileStorage` interface, `LocalStorage` (`.uploads/`, served by a session-checked route handler) and `CloudinaryStorage` (server-signed upload, `type: "authenticated"` for private, signed URL 5 min). Select by `STORAGE_PROVIDER`. Validate mime by magic bytes, 5 MB max. Used for justification attachments.»

## Decisiones
- **Tokens derivados** (carnet y justificar): `token = HMAC-SHA256(APP_SECRET, "<propósito>:<id>")` en base64url (32 bytes). En la BD solo va `SHA-256(token)`. Permite reimprimir carnets y que el worker arme el enlace de justificar sin guardar el token en `avisos.payload` (que solo guarda `justificacionTokenId`). Si `APP_SECRET` cambia, hay que regenerar carnets.
- **Lease en la cola**: el worker reserva cada fila moviendo `programadoPara` con un `updateMany` condicionado, en vez de un estado «enviando» (el enum no lo tiene).
- **Reintentos**: 1 intento + 3 reintentos (1, 5 y 15 min) → `error`. Plantilla inválida → `error` sin reintento; push vencido → `omitido`.
- **Llegadas en cursos**: no se re-avisa la llegada si el alumno ya tiene otra llegada hoy (evita un correo por clase).
- **Portería sobre una «Falta»** del tutor: se corrige a llegó/tarde y se avisa; sobre otros estados, «Ya registrado».
- **Webhook SES**: cruza eventos por cabecera `X-Khipu-Aviso` (id del aviso) o por Message-ID (`providerMessageId`); los estados no retroceden.
- Plantilla extra `justificacion_recibida` (aviso a la tutora). Las de justificación usan `tipo = asistencia` porque `TipoAviso` no tiene otro valor.
- `next.config.ts`: `experimental.serverActions.bodySizeLimit = "6mb"` para adjuntos de 5 MB.
- `/avisos` (dirección) con tasa de apertura; `/q/<token>` público sin datos del alumno.

## Cambios realizados
- `src/lib/server/asistencia.ts`, `porteria.ts`, `justificaciones.ts`, `archivos.ts`, `avisos.ts`, `tokens.ts`.
- `src/lib/server/notificaciones/` (`tipos`, `email`, `push`, `encolar`, `cola`, `limites`, `ses`, `preferencias`) y `src/lib/server/email/plantillas/` (`base`, `index` con el registro).
- `src/lib/server/storage/` (`tipos`, `validacion`, `local`, `cloudinary`, `index`).
- `src/lib/fechas.ts`, `src/lib/nombres.ts`, `src/lib/vista-previa.ts`; componentes `VistaPreviaAviso`, `FormJustificar`.
- Rutas: `colegio/[slug]/{asistencia, asistencia/justificar/[asistenciaId], porteria, gestion/carnets, gestion/carnets/[salonId], justificaciones, avisos, archivos/[id]}`, `(publico)/{justificar/[token], q/[token]}`, `api/cron/avisos`, `api/webhooks/ses`; `public/sw.js`.
- Tests: 6 unit, 4 integración (+ ayudante de colegio de prueba), 2 e2e.
- Specs 04, 05, 06 (con el contrato de plantillas), 07 y 14 en «implementado»; índice actualizado.

## Validación
- `pnpm lint` y `pnpm typecheck`: sin errores.
- `pnpm test`: 13 archivos, 73 tests en verde (unit + integración; los colegios `test-basico-*` y sus perfiles se borran al final).
- `E2E_PORT=3001 pnpm e2e`: 8 de 9 en verde. Falla `login-flow › contraseña incorrecta` (previo, no tocado): la BD compartida tiene bloqueado ese correo/IP por intentos fallidos de otros worktrees («Hubo demasiados intentos»).
- Prueba manual: `/api/cron/avisos` 401 sin bearer y 200 con `CRON_SECRET`; `/api/webhooks/ses` 403 con firma inválida.

## Pendientes y preguntas abiertas
- Esquema: `justificaciones` no tiene columna para el comentario de la revisión (hoy solo va al aviso y a la auditoría); `TipoAviso` no tiene valor para justificaciones.
- Avisar a dirección cuando un rebote permanente o queja desactiva un correo.
- Programar el cron en el hosting; probar Cloudinary y SES con cuentas reales en el piloto.
- PDF de carnets y logo del colegio en el carnet.
- El e2e de pasar lista modifica la asistencia de hoy de 3.° B y deja una justificación de Mateo en los datos demo.
