# Pendientes de interfaz: contador de mensajes, género, invitaciones, logo y botones de Nudito

| Campo | Valor |
|---|---|
| Fecha | 2026-10-27 |
| Colaborador | Claude Code (orquestador) |
| Agente y modelo | Claude Code (subagente) · Claude Sonnet 5.5 |
| Rama y commits | `feat/ui-pendientes` · ver `git log` de la rama |
| Specs afectadas | `specs/02`, `04`, `05`, `08`, `10`, `11`, `13` |

## Pedidos del colaborador (textual)
> You are finishing pending items of the Khipu Escolar MVP (multitenant school platform for Peru, Spanish UI). Work ONLY in the git worktree `khipu-wt/ui-pendientes` (branch `feat/ui-pendientes`).
>
> 1. Unread badge on the Mensajes tile (icono + número + texto para lectores de pantalla).
> 2. «Escribir a la tutora» en la vista de asistencia de la familia → `/mensajes/nuevo?alumno=<id>`.
> 3. Etiquetas con género («Tutora/Profesora», «Tutor/Profesor», «Tutor(a)/Profesor(a)») según `Profile.genero`; ayudante puro en `src/lib/roles.ts`; gestión puede indicar el género.
> 4. Estado real «invitada»: las invitaciones crean membresías `invitada`, el primer ingreso las pasa a `activa`; «Invitación pendiente» y «Reenviar invitación» en gestión.
> 5. Logo del colegio: subida real con `FileStorage`, `urlLogoColegio(tenant)`, en el encabezado, la libreta PDF y los carnets QR.
> 6. Botones de Nudito (`RespuestaNudito.acciones`) guardados en `NuditoMensaje.acciones` y mostrados en `/nudito` y al reabrir el widget.

## Decisiones
- `Mosaico.contador` en `navegacion.ts` marca qué mosaico lleva contador; el número se calcula en `/inicio` con `conteoNoLeidos` solo si el plan incluye mensajes.
- `tituloProfesor` / `nombreRol` (puros) en `src/lib/roles.ts`; `etiquetaProfesor` recibe el género. También se aplicó a la libreta (título del tutor) y al encabezado.
- Invitación: siempre `invitada`; `activarInvitaciones` corre en `iniciarSesion` y al fijar contraseña en `/restablecer`. Reinvitar a alguien con invitación pendiente da error y remite a «Reenviar invitación». Un profesor `invitada` puede asignarse como tutor/curso.
- Reenviar: `inviteUserByEmail` y, si la cuenta ya existe, `resetPasswordForEmail`; se vuelve a encolar el aviso `invitacion`.
- Logo: solo PNG, JPG y WEBP (el validador por magic bytes no soporta SVG), máx. 1 MB, archivo público. El PDF solo incrusta PNG/JPG.
- Nudito: al reabrir el widget se retoma la última conversación con actividad en 12 horas; en el historial se omiten los botones `elegir_hijo`.

## Cambios realizados
- `src/lib/roles.ts`, `src/lib/mensajes.ts`, `src/lib/server/mensajes.ts` (solo etiquetas), `src/lib/server/libreta.ts`, layout y perfil: etiquetas con género.
- `src/lib/server/gestion.ts`, `src/app/colegio/[slug]/gestion/{actions.ts,profesores,apoderados,salones}`: invitada, reenviar, género.
- `src/lib/server/auth.ts`, `src/app/(publico)/restablecer/actions.ts`: `activarInvitaciones`.
- `src/lib/server/logo.ts`, `configuracion/{actions.ts,page.tsx}`, `layout.tsx`, `libreta-pdf.tsx`, ruta del PDF, `gestion/carnets/[salonId]/page.tsx`: logo.
- `src/lib/navegacion.ts`, `inicio/page.tsx`, `asistencia/page.tsx`: contador y botón.
- `src/lib/server/nudito/acciones.ts`, `nudito/{actions.ts,page.tsx}`, `NuditoWidget.tsx`: botones persistentes.
- Tests: `tests/unit/mensajes-etiquetas.test.ts`, `tests/unit/nudito-acciones-guardadas.test.ts`, `tests/integracion/invitaciones-y-logo.test.ts`, `tests/e2e/ui-pendientes.test.ts`; ajustes en tests existentes por el género y el estado `invitada`.

## Validación
- `pnpm lint`, `pnpm typecheck`, `pnpm test` y `E2E_PORT=3006 pnpm exec playwright test --workers=1` en verde (ver conteos en el commit/informe).

## Pendientes y preguntas abiertas
- Logo en WEBP no sale en el PDF; soporte SVG requeriría ampliar el validador.
- No hay e2e específico de los botones de Nudito reabiertos (cubierto por unit de `leerAcciones` y por el e2e de Nudito existente).
