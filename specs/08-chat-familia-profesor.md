# 08 — Chat familia ↔ profesor

> Estado: implementado · Plan: Khipu Base · Última actualización: 2026-11-09 (rama feat/chat-tutor-whatsapp; antes: 2026-11-03, rama `pre-notificaciones`: bandeja general y canales, specs/38; antes: Claude Code, rama `feat/avisos-pendientes`: aviso al profesor)

## Objetivo
Que la familia y el profesor se escriban sobre un alumno sin compartir teléfonos ni correos.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Apoderado | Escribir solo al tutor activo del salón de cada hijo activo; leer sus conversaciones antiguas cerradas | Ver a otras familias; ver teléfono o correo del profesor |
| Profesor | Escribir solo a los apoderados activos de alumnos activos de los salones donde es tutor | Ver conversaciones de otros profesores; escribir a familias de salones donde solo dicta; ver teléfono o correo de la familia |
| Dirección | Leer cualquier conversación (queda auditado: `ver · conversacion`) | Escribir, marcar como leído |
| Portería | — | Todo |

## Flujos
1. `/mensajes/nuevo` agrupa por alumno a quién puede escribir y avisa «El salón de X aún no tiene tutor asignado» si corresponde (con etiqueta «Lucía García · Tutora de 3.° B — sobre Mateo»; el título sigue `Profile.genero`: femenino → Tutora/Profesora, masculino → Tutor/Profesor, sin dato → Tutor(a)/Profesor(a)). «Escribir» abre o reutiliza la conversación `(alumno, profesor, apoderado)`. Admite `?alumno=<id>` (validado con `requireAlumnoVisible`: 403 si no es su hijo o su alumno): la vista de asistencia de la familia (spec 04) enlaza ahí. `/mensajes?alumno=<id>` redirige a `/mensajes/nuevo?alumno=<id>` (enlaces antiguos). El rol `alumno` no tiene chat (403).
2. `/mensajes/[id]`: hilo. El cliente consulta cada 10 s la acción `refrescarHiloAction` (polling; sin Realtime). Al abrir o refrescar se marcan como leídos los mensajes de la otra parte.
3. Al enviar, `avisarMensajeNuevo()` (`notificaciones/avisos-mensajes.ts`) notifica a la otra parte en su **bandeja** (`/notificaciones`, tipo `mensaje`, specs/38) y por **push** (plantilla `mensaje_nuevo`, `referenciaId = conversacionId`). **Sin correo** desde 2026-11-03 (el chat no es una comunicación importante). Máximo 1 notificación por conversación y destinatario cada 15 min (clave `mensaje:<conversación>:<ventana>`, sin duplicados al reintentar):
   - escribe el profesor → a la familia: bandeja si la membresía está activa; push solo con consentimiento vigente y preferencia `push`;
   - escribe la familia → al profesor: bandeja siempre; push por cada dispositivo suscrito según sus preferencias de `/perfil#avisos` (`destinoPersonal`; el personal no necesita consentimiento). La fila no lleva `apoderadoId`.

## Reglas de negocio
- Mensaje de texto, 1 a 2000 caracteres (zod).
- Nunca se serializa `email` ni `telefono` de la otra parte: las consultas solo seleccionan nombres y apellidos.
- Solo cuentan tutores con membresía `activa`, apoderados con membresía `activa` y alumnos `activo`. Un profesor de curso no habilita chat si no es tutor del salón.
- La vigencia de una conversación se recalcula al abrir el hilo, listar y enviar. Si cambia el tutor o se rompe el vínculo activo, el historial permanece visible para sus participantes, pero queda en solo lectura con «Esta conversación está cerrada: ahora solo puedes escribir al tutor/a del salón». El servidor rechaza la apertura o el envío fuera de la regla actual.
- Dirección no ve contador de no leídos y su polling está desactivado (para no llenar la auditoría).
- Los avisos al profesor van a su bandeja de notificaciones y a sus dispositivos con push activado; además ve el contador de mensajes sin leer.

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
- Diseño (spec 18 §8): panel único de altura disponible en el viewport, lista de 360 px y chat a la derecha en escritorio; en móvil lista y luego hilo a pantalla completa. Búsqueda por nombre o alumno, avatares, fecha relativa, vista previa y contador de no leídos. El hilo muestra separadores de día, mensajes agrupados, hora y confirmación de lectura. Caja de envío al pie con Enter/Shift+Enter, envío optimista y polling cada 10 s. El panel sin selección explica la privacidad de los contactos. Los hilos cerrados y Dirección muestran un aviso de solo lectura.

## Textos y UX
«Hablas con el colegio sin compartir tu teléfono.» Estado no leído con ícono + «N sin leer». Dirección: «Estás leyendo como Dirección. No puedes escribir…».

## Errores y casos borde
- Conversación ajena → 403. Mensaje vacío o de más de 2000 caracteres → mensaje de error en el formulario.
- Apoderado sin consentimiento aceptado → redirige a `/consentimiento`.

## Pruebas
- unit: `tests/unit/mensajes-etiquetas.test.ts` · integración: `tests/integracion/gestion-mensajes-privacidad.test.ts` (alcance, no leídos, sin correo/teléfono, dirección solo lectura, límite de avisos, consentimiento) y `tests/integracion/avisos-pendientes.test.ts` (aviso al profesor por bandeja + push sin correo, 1 cada 15 min) y `tests/integracion/preferencias-personal-y-comunicados-push.test.ts` (preferencias del profesor) · e2e: `tests/e2e/chat-familia-profesor.test.ts` (Rosa ↔ Lucía).

## Pendientes
- Ninguno.
