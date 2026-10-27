# 07 — Justificaciones de faltas

> Estado: implementado · Plan: Básico · Última actualización: 2026-10-27 (Claude Code, rama `feat/p2-dia-a-dia`: plazo configurable del reglamento)

## Objetivo
Que la familia justifique una falta en un minuto, desde el correo o desde Khipu, y que la tutora la revise.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Sin sesión con enlace | Justificar esa falta una vez, dentro del plazo del reglamento del colegio (48 h por defecto) | Ver otra información |
| Apoderado | Justificar faltas de sus hijos desde `/asistencia`; ver sus justificaciones en `/justificaciones` | Justificar faltas ajenas o dos veces |
| Profesor tutor | Ver y revisar las de su salón | Ver las de otros salones |
| Dirección | Ver y revisar todas | — |

## Flujos
1. Al encolar un aviso de falta se crea un `justificacion_tokens` por familia (vence según `Tenant.plazoJustificacionHoras`, 48 h por defecto, 24–168 h; `src/lib/plazo-justificacion.ts`). El correo lleva `<raíz>/justificar/<token>` (token derivado con HMAC; en BD solo el hash).
2. `/justificar/[token]` (dominio raíz, sin sesión): muestra colegio, alumno y fecha; formulario **motivo** (1..500) + **adjunto opcional** (JPG/PNG/WEBP/PDF ≤ 5 MB, spec 14). Token usado, vencido o falta corregida → «Este enlace ya se usó o venció. Escríbele a la tutora desde Khipu.»
3. Con sesión: `/asistencia` → «Justificar falta» → `/asistencia/justificar/[asistenciaId]`. Al enviar, se invalidan los enlaces pendientes de esa falta.
4. Al enviar: `justificaciones.estado = pendiente`, `usadoAt` del token, auditoría y aviso `justificacion_recibida` (tipo `justificacion`, `referenciaId = justificacionId`) por correo a la tutora del salón.
5. `/justificaciones` (tutor/dirección): pendientes primero, adjunto con URL temporal (5 min), comentario opcional, **Aceptar** / **Rechazar**. El comentario se guarda en `justificaciones.comentarioRevision`; la familia lo ve en `/justificaciones` («Comentario del colegio: …») y recibe `justificacion_revisada` (neutral, tipo `justificacion`, con el comentario) según sus preferencias y consentimiento.

## Reglas de negocio
- El token se marca usado con un `updateMany` condicionado (`usadoAt IS NULL AND expiraAt > ahora`): un solo uso aunque haya dos envíos simultáneos. Si la subida o el guardado fallan, se libera.
- El adjunto se valida (magic bytes y tamaño) **antes** de gastar el token.
- Una falta con justificación pendiente o aceptada no se puede volver a justificar; con una rechazada, sí.
- La revisión solo cambia filas `pendiente` (doble clic no duplica avisos).

## Modelo de datos
- `justificacion_tokens` (`tokenHash` único, `expiraAt`, `usadoAt`), `justificaciones` (`motivo`, `adjuntoArchivoId`, `estado`, `comentarioRevision`, `revisadoPorId`, `revisadoAt`), `archivos`.

## Contratos de `src/lib/server`
```ts
// src/lib/server/justificaciones.ts
buscarTokenJustificacion(token, { tenantId?, ahora? }): Promise<DatosTokenJustificar | null>
justificarConToken(token, { motivo, archivo: Buffer | null }, { tenantId?, ahora? }): Promise<{ ok: true, tenantId } | { ok: false, error }>
faltaParaJustificar(ctx, asistenciaId)          // apoderado; 403 si no es su hijo
justificarConSesion(ctx, asistenciaId, { motivo, archivo })
listarJustificaciones(ctx): Promise<JustificacionVista[]>   // por rol; audita «ver»; incluye comentarioRevision
revisarJustificacion(ctx, { id, decision: "aceptada" | "rechazada", comentario? })
```

## Rutas y UI
- `/justificar/[token]` (público), `/asistencia/justificar/[asistenciaId]` (apoderado), `/justificaciones` (tutor, dirección, apoderado). Formulario compartido `FormJustificar`.

## Textos y UX
- «Justificar la falta de Mateo» · «Motivo de la falta» · «Adjunto (opcional)» · «Enviar justificación» · «Justificación enviada. La tutora la revisará y te avisaremos.»
- Estados: «Pendiente» (reloj), «Aceptada» (check), «No aceptada» (x), siempre ícono + palabra.

## Errores y casos borde
- «Escribe el motivo de la falta.» · «El archivo pesa más de 5 MB.» · «Solo se aceptan fotos (JPG, PNG, WEBP) o PDF.» · «Esta falta ya tiene una justificación.»
- Token de otro colegio (si se valida con `tenantId`) → inválido.

## Plazo del reglamento
- Dirección lo fija en `/configuracion` → «Avisos a las familias» → «Plazo para justificar faltas (horas)» (24 a 168; fuera de rango se rechaza). El vencimiento se calcula al crear el enlace (`crearTokenJustificacion`): `expiraAt = ahora + plazo`; los enlaces ya enviados conservan su vencimiento.
- Un enlace vencido muestra «El plazo para justificar venció. Escribe a la tutora.» (distinto de «Este enlace ya se usó o no es válido…», que cubre usado/inexistente/de otro colegio). `consultarTokenJustificacion` distingue los motivos; `buscarTokenJustificacion` sigue devolviendo null.
- Con sesión, el apoderado puede seguir justificando desde `/asistencia` (el plazo del reglamento aplica al enlace del correo).

## Pruebas
- integración (`tests/integracion/justificar-token.test.ts`): datos sin sesión, token vencido (47 h sirve, 49 h no, mensaje de plazo), token de otro colegio, adjunto inválido no gasta el token, un solo uso + aviso a la tutora, revisión por tutora (otro profesor 403) + aviso neutral con tipo `justificacion` + comentario guardado y visible para la familia, apoderado no justifica dos veces ni faltas ajenas.
- unit: `tests/unit/plazo-justificacion.test.ts`. integración: `tests/integracion/dia-a-dia-offline-plazo.test.ts` (48 h por defecto; el plazo configurado se respeta; rango 24–168).
- e2e: el enlace del correo justifica una vez y luego muestra el mensaje de enlace usado.

## Pendientes
- Aplicar el mismo plazo también a la justificación con sesión (hoy no vence): decisión de reglamento pendiente de la dirección del colegio.

## Diseño
- Aceptar y rechazar piden confirmación (`BotonConfirmar`) porque avisan a la familia; el comentario sigue siendo opcional. Tarjetas con `Card`, estados con ícono + palabra y estado vacío con `EstadoVacio`.
