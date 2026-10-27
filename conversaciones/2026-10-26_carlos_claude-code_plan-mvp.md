# Plan del MVP y base del proyecto

| Campo | Valor |
|---|---|
| Fecha | 2026-10-26 |
| Colaborador | Carlos (desarrollo) |
| Agente y modelo | Claude Code · claude-opus-5-5 (orquestador) |
| Rama y commits | `main` · commit base (ver `git log`) |
| Specs afectadas | `specs/00` a `specs/15` (creadas) |

## Pedidos del colaborador (textual)
> estamos formando un sistema academico virtual y te muestro lo que estabamos conversando, necesito crear el sistema como el mvp del modelo, aqui te muestro lo conversado: [documento pegado: «Khipu Escolar: resumen del proyecto y especificaciones», actualizado el 22/10/2026. Su contenido se volcó en `specs/` y `AGENTS.md`]

Respuestas a las preguntas del agente:
- Ubicación: «Subcarpeta khipu-escolar/». Docs de marca: «Usar lo del resumen». Backend: «Supabase local (Docker)».
- Alcance: «deberian estar los 3 planes pero en fase MVP».
- Nudito: «Sin LLM, por intenciones». Fase 2: «Completo» (escala MINEDU, competencias, libreta PDF).

> vamos usar para el envio de correos por el momento usaremos nodemailer para el envio de los correos, pero quiero saber cuanto es el maximo por enviar antes que nos bloqueen o que otro tipo de comunicacion puede estar integrado para verificar que el alumno estuvo presente a clases o o, si el alumno asistio a clases o no , ese tipo de envio, ademas quiero usar prisma como orm por el momento , pero si supabase ya tiene un orm integrado esta bien, no tengo problemas; ademas que por el momento algun tipo de imagen se suba a claudinary por el momento, luego pasaremos a usar s3 de AWS

Respuestas: SMTP del piloto: «Amazon SES». Canales extra: «Notificaciones push» y «Carnet QR en portería».

> si esta bien, pero usa herdr para crear subagentes en codex que te ayuden con el trabajo

> tambien debes crear una parpeta llamada specs donde se va a documentar mediante archivos .md cad uno de los modulos y funcionalidades que vamos a tener , y tambien quiero otra carpeta donde se guarden los chats o conversaciones que cada uno de los colaboradores de este proyecto haga, eso es para poder prevenir algun cambio o mal entendido con mis trabajadores, entonces eso sera una norma dentro de este proyecto y que todos los agentes , de cualquier tipo lo tenga que hacer

## Decisiones
- App en `Asistente Virtual Academico (AVA)/khipu-escolar/`: Next.js 16 (App Router, `proxy.ts`), TypeScript y Tailwind v4.
- **Prisma 7** como ORM y dueño del esquema. Supabase solo para Auth; Supabase no trae ORM (supabase-js es un query builder).
- Aislamiento multitenant con `dbTenant()` (extensión de Prisma). RLS activado y cerrado para anon/authenticated como respaldo (en vez de políticas por rol, porque la app no usa supabase-js para datos).
- Correo con **Nodemailer**: Mailpit en local y **Amazon SES** en el piloto. Cola con tope diario (`EMAIL_DAILY_LIMIT`) y modo «solo excepciones».
  - Límites informados: Gmail ≈500 al día, Workspace ≈2000 al día, Brevo gratis ≈300 al día, SES ≈0,10 USD por cada 1000.
- Canales adicionales: **Web Push** y **carnet QR en portería**. WhatsApp y SMS, después.
- Archivos en **Cloudinary** detrás de la interfaz `FileStorage` (después, S3). En local, almacenamiento en disco.
- Los 3 planes en el MVP. Nudito sin LLM (intenciones + datos reales).
- `cacheComponents` desactivado (la app es dinámica por usuario). `authInterrupts` activado para `forbidden()`.
- Asistencia única por `(alumno, fecha, ambito)`, con `ambito` = cursoId o `"dia"`. Prisma no representa un índice `NULLS NOT DISTINCT`.
- Normas del proyecto: `specs/` por módulo y `conversaciones/` por sesión, obligatorias para todo agente (escritas en `AGENTS.md`).
- Trabajo en paralelo: agentes Codex lanzados con Herdr en worktrees (`feat/basico`, `feat/fase2`, `feat/promax`). Claude integra.

## Cambios realizados
- Scaffold de Next.js, dependencias y `pnpm-workspace.yaml` (builds permitidos).
- `supabase/config.toml`: servicios innecesarios apagados, `site_url` en lvh.me y SMTP de Mailpit en el puerto 54325.
- `prisma/schema.prisma` (todos los planes), 4 migraciones y `prisma/seed.ts` (3 colegios demo, cuentas con `demo123`).
- `src/lib/server/`: `db`, `supabase`, `tenant`, `plan`, `auth` y `auditoria`. `src/lib/`: `dominio`, `planes`, `navegacion`, `roles` y `env`.
- `src/proxy.ts` (subdominios + refresco de la sesión).
- UI:
  - login con detección del colegio, elegir colegio, «Entrando a…», recuperar y restablecer contraseña;
  - layout del colegio con cambio de rol y salir;
  - mosaicos por rol con candados por plan;
  - páginas 403 y 404.
- Tokens de marca en `globals.css` (claro y oscuro), isotipo provisional y manifest PWA.
- Tests: unit (dominio y planes), integración (aislamiento por colegio), e2e (login).
- `AGENTS.md`, `CLAUDE.md`, `specs/` y `conversaciones/`.

## Validación
- `pnpm typecheck` y `pnpm lint`: sin errores.
- `pnpm test`: 11/11 OK.
- `pnpm e2e`: 4/4 OK.
- Seed idempotente (se corrió 2 veces).

## Pendientes y preguntas abiertas
- Implementar las specs 04 a 15 (agentes Codex por frente).
- Dominio definitivo, cuenta de SES (salir del sandbox), cuenta de Cloudinary y región de Supabase.
- Revisión legal del consentimiento.
- Copiar los SVG reales de marca (`docs/marca/`) cuando estén en la máquina. Hoy hay un isotipo provisional.

## Continuación: implementación en paralelo e integración

> por el momento trabaja todo con claude, crea multiagentes de claude para terminar el trabajo y luego cuando se restaure lo hacemos con codex, usa sabiamente que modelos vas a usar para cada tarea del subagente

(Respuesta a: «A Codex le queda menos del 10 % del límite de 5 h».)

### Decisiones
- Los agentes de Codex quedaron abiertos e inactivos en Herdr (panes w3–w5). El colaborador autorizó «Trust and continue».
- Se usaron 4 subagentes de Claude, cada uno en su worktree:

  | Rama | Modelo | Alcance |
  |---|---|---|
  | `feat/basico` | Opus | asistencia, avisos, QR, justificaciones y archivos (lo más sensible: tokens, cola, webhooks) |
  | `feat/gestion` | Sonnet | chat, comunicados, gestión y privacidad |
  | `feat/fase2` | Sonnet | notas, libreta, tareas y agenda |
  | `feat/promax` | Sonnet | Nudito |

- Antes de lanzarlos se agregó `tenants.hora_limite_tardanza` para que ningún agente tuviera que migrar.
- Integración:
  - `encolar.ts` (cola central de Básico) + `avisos-familia.ts` (avisos de chat, comunicados e invitaciones, antes `encolar.ts` de gestión);
  - se unieron las funciones de `fechas.ts`;
  - se mantuvo el panel `/avisos` con filtros de gestión;
  - se borró `lib/server/avisos.ts`, que quedó sin uso.
- El test e2e de contraseña incorrecta ahora usa un correo único por corrida (el límite de intentos lo bloqueaba).
- `config.toml` permite redirigir a los puertos 3001–3004.

### Validación (main `b10bb1d`)
- `pnpm lint`, `pnpm typecheck`: sin errores.
- `pnpm test`: 22 archivos y 190 tests OK.
- `pnpm e2e`: 22/22 OK.

### Pendientes reportados por los agentes
- Mosaico de Mensajes con contador de no leídos y botón «Escribir a la tutora» desde asistencia (`/mensajes/nuevo?alumno=`).
- Subir el logo del colegio con `FileStorage` (ya existe) y mostrarlo en la libreta PDF y en los carnets.
- Avisos a profesores (mensaje nuevo de una familia), aviso al crear tareas y aviso a dirección por rebotes.
- Editar tareas y eventos, exportar .ics, exportar en ZIP.
- Brechas de esquema que no se resolvieron (no se cambió el esquema):
  - comentario de revisión en `justificaciones`;
  - valores de `TipoAviso` para justificaciones y tareas;
  - estado «enviando» en `avisos`;
  - género o tratamiento del tutor;
  - estado «invitada» real en las membresías;
  - columna para los botones en `nudito_mensajes`.
- Cron real en el hosting (`/api/cron/avisos`), y pruebas con cuentas reales de SES y Cloudinary.
