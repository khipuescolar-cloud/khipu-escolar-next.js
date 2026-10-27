# 08 — Chat familia ↔ profesor

> Estado: implementado · Plan: Básico · Última actualización: 2026-10-27 (Claude Code, rama `feat/avisos-pendientes`: aviso al profesor)

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
1. `/mensajes/nuevo` lista a quién puede escribir (con etiqueta «Lucía García · Tutora de 3.° B — sobre Mateo»; el título sigue `Profile.genero`: femenino → Tutora/Profesora, masculino → Tutor/Profesor, sin dato → Tutor(a)/Profesor(a)). «Escribir» abre o reutiliza la conversación `(alumno, profesor, apoderado)`. Admite `?alumno=<id>`: la vista de asistencia de la familia (spec 04) muestra por hijo el botón «Escribir a la tutora» que enlaza ahí (si el plan incluye mensajes).
2. `/mensajes/[id]`: hilo. El cliente consulta cada 10 s la acción `refrescarHiloAction` (polling; sin Realtime). Al abrir o refrescar se marcan como leídos los mensajes de la otra parte.
3. Al enviar se encola un aviso `mensaje_nuevo` a la otra parte con `avisarMensajeNuevo()` (`notificaciones/avisos-mensajes.ts`), `referenciaId = conversacionId`, máximo 1 por conversación y destinatario cada 15 min:
   - escribe el profesor → a la familia, solo con consentimiento vigente y si acepta correos;
   - escribe la familia → al profesor por correo y por cada suscripción push suya, según sus preferencias de `/perfil#avisos` (`preferencias_aviso` por membresía; sin fila, ambos; el personal no necesita consentimiento). La fila no lleva `apoderadoId`, así que el correo no incluye «Ajustar mis avisos».

## Reglas de negocio
- Mensaje de texto, 1 a 2000 caracteres (zod).
- Nunca se serializa `email` ni `telefono` de la otra parte: las consultas solo seleccionan nombres y apellidos.
- Solo cuentan profesores con membresía `activa`; alumnos `activo`.
- Dirección no ve contador de no leídos y su polling está desactivado (para no llenar la auditoría).
- Los avisos al profesor van a su correo de la cuenta y a sus dispositivos con push activado; además ve el contador en la bandeja.

## Modelo de datos
`conversaciones` (única por alumno+profesor+apoderado), `mensajes` (`cuerpo`, `leidoAt`), `avisos` (cola).

## Contratos de `src/lib/server/mensajes.ts`
```ts
destinatariosPosibles(ctx): Interlocutor[]
abrirConversacion(ctx, { alumnoId, contraparteId }): string   // 403 si no corresponde
listarConversaciones(ctx): ResumenConversacion[]
conteoNoLeidos(ctx): number                                   // apoderado y profesor
obtenerHilo(ctx, id): HiloVista                               // 403 si no es suyo; marca leídos; audita a dirección
enviarMensaje(ctx, { conversacionId, cuerpo }): { avisos }    // 403 a dirección; encola aviso. La action llama a procesarCola con after() si avisos > 0
```
Etiquetas puras en `src/lib/mensajes.ts`.

## Rutas y UI
- `/inicio`: el mosaico Mensajes muestra un contador (ícono + número + texto accesible «N mensajes sin leer») con `conteoNoLeidos` (`Mosaico.contador` en `navegacion.ts`).
- `/mensajes` (bandeja con «N sin leer»), `/mensajes/nuevo`, `/mensajes/[id]` (componente cliente `Hilo`).
- Diseño (spec 18 §8): en escritorio dos columnas (lista `ListaConversaciones` + hilo; junto a un hilo abierto la lista omite la vista previa); en móvil lista → hilo con botón «Mensajes» para volver. Burbujas propias en `primary`, ajenas en `muted` con avatar de iniciales y hora; caja de envío fija al pie; «N sin leer» como `Badge`. Estado vacío con `EstadoVacio`.

## Textos y UX
«Hablas con el colegio sin compartir tu teléfono.» Estado no leído con ícono + «N sin leer». Dirección: «Estás leyendo como Dirección. No puedes escribir…».

## Errores y casos borde
- Conversación ajena → 403. Mensaje vacío o de más de 2000 caracteres → mensaje de error en el formulario.
- Apoderado sin consentimiento aceptado → redirige a `/consentimiento`.

## Pruebas
- unit: `tests/unit/mensajes-etiquetas.test.ts` · integración: `tests/integracion/gestion-mensajes-privacidad.test.ts` (alcance, no leídos, sin correo/teléfono, dirección solo lectura, límite de avisos, consentimiento) y `tests/integracion/avisos-pendientes.test.ts` (aviso al profesor por correo + push, 1 cada 15 min) y `tests/integracion/preferencias-personal-y-comunicados-push.test.ts` (preferencias del profesor) · e2e: `tests/e2e/chat-familia-profesor.test.ts` (Rosa ↔ Lucía).

## Pendientes
- Ninguno.
