# 07 — Justificaciones de faltas

> Estado: implementado · Plan: Básico · Última actualización: 2026-10-26 (Claude Code, rama `feat/basico`)

## Objetivo
Que la familia justifique una falta en un minuto, desde el correo o desde Khipu, y que la tutora la revise.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Sin sesión con enlace | Justificar esa falta una vez, dentro de 7 días | Ver otra información |
| Apoderado | Justificar faltas de sus hijos desde `/asistencia`; ver sus justificaciones en `/justificaciones` | Justificar faltas ajenas o dos veces |
| Profesor tutor | Ver y revisar las de su salón | Ver las de otros salones |
| Dirección | Ver y revisar todas | — |

## Flujos
1. Al encolar un aviso de falta se crea un `justificacion_tokens` por familia (7 días). El correo lleva `<raíz>/justificar/<token>` (token derivado con HMAC; en BD solo el hash).
2. `/justificar/[token]` (dominio raíz, sin sesión): muestra colegio, alumno y fecha; formulario **motivo** (1..500) + **adjunto opcional** (JPG/PNG/WEBP/PDF ≤ 5 MB, spec 14). Token usado, vencido o falta corregida → «Este enlace ya se usó o venció. Escríbele a la tutora desde Khipu.»
3. Con sesión: `/asistencia` → «Justificar falta» → `/asistencia/justificar/[asistenciaId]`. Al enviar, se invalidan los enlaces pendientes de esa falta.
4. Al enviar: `justificaciones.estado = pendiente`, `usadoAt` del token, auditoría y aviso `justificacion_recibida` por correo a la tutora del salón.
5. `/justificaciones` (tutor/dirección): pendientes primero, adjunto con URL temporal (5 min), comentario opcional, **Aceptar** / **Rechazar**. La familia recibe `justificacion_revisada` (neutral) según sus preferencias y consentimiento.

## Reglas de negocio
- El token se marca usado con un `updateMany` condicionado (`usadoAt IS NULL AND expiraAt > ahora`): un solo uso aunque haya dos envíos simultáneos. Si la subida o el guardado fallan, se libera.
- El adjunto se valida (magic bytes y tamaño) **antes** de gastar el token.
- Una falta con justificación pendiente o aceptada no se puede volver a justificar; con una rechazada, sí.
- La revisión solo cambia filas `pendiente` (doble clic no duplica avisos).

## Modelo de datos
- `justificacion_tokens` (`tokenHash` único, `expiraAt`, `usadoAt`), `justificaciones` (`motivo`, `adjuntoArchivoId`, `estado`, `revisadoPorId`, `revisadoAt`), `archivos`.

## Contratos de `src/lib/server`
```ts
// src/lib/server/justificaciones.ts
buscarTokenJustificacion(token, { tenantId?, ahora? }): Promise<DatosTokenJustificar | null>
justificarConToken(token, { motivo, archivo: Buffer | null }, { tenantId?, ahora? }): Promise<{ ok: true, tenantId } | { ok: false, error }>
faltaParaJustificar(ctx, asistenciaId)          // apoderado; 403 si no es su hijo
justificarConSesion(ctx, asistenciaId, { motivo, archivo })
listarJustificaciones(ctx): Promise<JustificacionVista[]>   // por rol; audita «ver»
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

## Pruebas
- integración (`tests/integracion/justificar-token.test.ts`): datos sin sesión, token vencido, token de otro colegio, adjunto inválido no gasta el token, un solo uso + aviso a la tutora, revisión por tutora (otro profesor 403) + aviso neutral, apoderado no justifica dos veces ni faltas ajenas.
- e2e: el enlace del correo justifica una vez y luego muestra el mensaje de enlace usado.

## Pendientes
- El comentario de la revisión solo viaja en el aviso y la auditoría: `justificaciones` no tiene columna para guardarlo.
- Plazo de 48 h del reglamento (hoy el enlace dura 7 días).
