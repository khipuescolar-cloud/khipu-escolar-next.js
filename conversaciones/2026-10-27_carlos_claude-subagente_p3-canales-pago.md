# Canales de pago: WhatsApp Cloud API y SMS

| Campo | Valor |
|---|---|
| Fecha | 2026-10-27 |
| Colaborador | Carlos (desarrollo) |
| Agente y modelo | Claude Code (subagente) · claude-sonnet-5-5 |
| Rama y commits | `feat/p3-canales-pago` |
| Specs afectadas | `specs/06-avisos-notificaciones.md`, `specs/10-panel-direccion-gestion.md`, `specs/15-privacidad-auditoria-exportacion.md` |

## Pedidos del colaborador (textual)
> Si borralos , si ya no lo estamos usando y ya no lo necesitamos , no hay problema con borrarlos no? y porfavor ve resolviendo todos los pendientes que tengamos , quiero que por a hora trabajes de manera autonoma resolviendo cada problema que tengas y que lances multiagentes para que solucioones todos, si necesitas lazar 50 miltiagentes no hay problema pr que la finalidad es que termines con todo lo pendiente que tuvimos

Tarea derivada: resolver el pendiente «WhatsApp Cloud API y SMS con la misma interfaz» (apagado por defecto, sin paquetes nuevos).

## Decisiones
- Canales `whatsapp.ts` y `sms.ts` con `fetch` inyectable, detrás de `NotificationChannel`; la fila de `avisos` lleva el celular E.164 como destinatario.
- Sin credenciales en el servidor **no se encola** (se registra en el log) para no dejar filas condenadas a fallar; si las credenciales desaparecen después, la fila pasa a `omitido` con motivo y sin reintentos.
- Solo plantillas con versión en el canal (asistencia llegó/tarde/falta, comunicado, mensaje nuevo, libreta). Plantillas Meta tipo *utility*, idioma `es`.
- SMS sin tildes (GSM-7, ≤ 160) y solo con el nombre de pila del alumno; comunicado y mensaje no incluyen título ni remitente.
- Tope diario propio por canal (`WHATSAPP_DAILY_LIMIT` 1000, `SMS_DAILY_LIMIT` 300), ventana de 24 h global.
- El webhook de WhatsApp nunca hace retroceder el estado del aviso.
- El perfil no tenía forma de guardar el celular: se agregó «Mi celular» en `/perfil` (todos los roles).
- No se tocó el esquema ni `package.json`.

## Cambios realizados
- `src/lib/telefono.ts`; `src/lib/server/notificaciones/{whatsapp,sms,whatsapp-webhook,canales-pago}.ts`; `src/app/api/webhooks/whatsapp/route.ts`.
- Ediciones aditivas en `encolar.ts`, `cola.ts`, `limites.ts`, `tipos.ts`, `preferencias.ts`, `avisos-familia.ts`, `avisos-mensajes.ts`, `avisos-tareas.ts` y `notas.ts` (condición `tieneCanalAviso`).
- UI: sección «Canales de pago» en configuración; casillas WhatsApp/SMS en `PreferenciasAvisos` y `PreferenciasPersonal`; tarjeta «Mi celular» en perfil.
- Docs: specs 06, 10 y 15, `.env.example`, `docs/despliegue.md` §6b.
- Tests: `telefono-peru`, `canales-whatsapp-sms` (unit e integración) y e2e `canales-pago`.

## Validación
- `pnpm lint`, `pnpm typecheck`, `pnpm test` (47 archivos, 419 pruebas) en verde.
- `pnpm e2e` completo con `E2E_PORT=3034`: 42 pruebas en verde.

## Pendientes y preguntas abiertas
- **Externo:** crear la cuenta Meta Business verificada y el número, la cuenta Twilio, y aprobar las 6 plantillas `khipu_*`; definir las variables en el servidor.
- Las tarifas por mensaje de la spec son aproximadas: confirmar con los proveedores.
