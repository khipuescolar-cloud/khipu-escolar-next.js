# 08 — Chat familia ↔ profesor

> Estado: implementado · Plan: Básico · Última actualización: 2026-10-26 (Claude Code, rama `feat/gestion`)

## Objetivo
Que la familia y el profesor se escriban sobre un alumno sin compartir teléfonos ni correos.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Apoderado | Escribir al tutor y a los profesores de los cursos de su hijo; leer y responder sus conversaciones | Ver a otras familias; ver teléfono o correo del profesor |
| Profesor | Escribir a los apoderados de los alumnos de sus salones (tutor o dicta) | Ver conversaciones de otros profesores; ver teléfono o correo de la familia |
| Dirección | Leer cualquier conversación (queda auditado: `ver · conversacion`) | Escribir, marcar como leído |
| Portería | — | Todo |

## Flujos
1. `/mensajes/nuevo` lista a quién puede escribir (con etiqueta «Lucía García · Tutor(a) de 3.° B — sobre Mateo»). «Escribir» abre o reutiliza la conversación `(alumno, profesor, apoderado)`. Admite `?alumno=<id>` para el botón «Escribir a la tutora» desde la asistencia.
2. `/mensajes/[id]`: hilo. El cliente consulta cada 10 s la acción `refrescarHiloAction` (polling; sin Realtime). Al abrir o refrescar se marcan como leídos los mensajes de la otra parte.
3. Al enviar, si el destinatario es una familia, se encola un aviso `mensaje_nuevo` (máximo 1 por conversación cada 15 min, solo con consentimiento vigente).

## Reglas de negocio
- Mensaje de texto, 1 a 2000 caracteres (zod).
- Nunca se serializa `email` ni `telefono` de la otra parte: las consultas solo seleccionan nombres y apellidos.
- Solo cuentan profesores con membresía `activa`; alumnos `activo`.
- Dirección no ve contador de no leídos y su polling está desactivado (para no llenar la auditoría).
- Los avisos de mensajes nuevos se envían solo a familias (contrato de la cola); el profesor ve el contador en la bandeja.

## Modelo de datos
`conversaciones` (única por alumno+profesor+apoderado), `mensajes` (`cuerpo`, `leidoAt`), `avisos` (cola).

## Contratos de `src/lib/server/mensajes.ts`
```ts
destinatariosPosibles(ctx): Interlocutor[]
abrirConversacion(ctx, { alumnoId, contraparteId }): string   // 403 si no corresponde
listarConversaciones(ctx): ResumenConversacion[]
conteoNoLeidos(ctx): number                                   // apoderado y profesor
obtenerHilo(ctx, id): HiloVista                               // 403 si no es suyo; marca leídos; audita a dirección
enviarMensaje(ctx, { conversacionId, cuerpo }): void          // 403 a dirección; encola aviso
```
Etiquetas puras en `src/lib/mensajes.ts`.

## Rutas y UI
- `/mensajes` (bandeja con «N sin leer»), `/mensajes/nuevo`, `/mensajes/[id]` (componente cliente `Hilo`).

## Textos y UX
«Hablas con el colegio sin compartir tu teléfono.» Estado no leído con ícono + «N sin leer». Dirección: «Estás leyendo como Dirección. No puedes escribir…».

## Errores y casos borde
- Conversación ajena → 403. Mensaje vacío o de más de 2000 caracteres → mensaje de error en el formulario.
- Apoderado sin consentimiento aceptado → redirige a `/consentimiento`.

## Pruebas
- unit: `tests/unit/mensajes-etiquetas.test.ts` · integración: `tests/integracion/gestion-mensajes-privacidad.test.ts` (alcance, no leídos, sin correo/teléfono, dirección solo lectura, límite de avisos, consentimiento) · e2e: `tests/e2e/chat-familia-profesor.test.ts` (Rosa ↔ Lucía).

## Pendientes
- Contador de no leídos en el mosaico de `/inicio` (requiere editar `navegacion.ts` / la página; `conteoNoLeidos` ya existe).
- Aviso al profesor cuando la familia escribe (hoy solo se avisa a familias) y push.
- Botón «Escribir a la tutora» en la asistencia del hijo (spec 04): enlazar a `/mensajes/nuevo?alumno=<id>`.
