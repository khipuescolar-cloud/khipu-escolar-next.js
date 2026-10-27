# 07 — Justificaciones de faltas

> Estado: implementado · Plan: Básico · Última actualización: 2026-10-27 (Claude Code, rama `feat/avisos-presentes-plazo`: plazo de 15 días hábiles para todas las vías)

## Objetivo
Que la familia justifique una falta en un minuto, desde el correo o desde Khipu, y que la tutora la revise.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Sin sesión con enlace | Justificar esa falta una vez, dentro del plazo del reglamento del colegio (15 días hábiles por defecto) | Ver otra información |
| Apoderado | Justificar faltas de sus hijos desde `/asistencia` dentro del plazo; ver sus justificaciones en `/justificaciones` | Justificar faltas ajenas, dos veces o fuera de plazo |
| Profesor tutor | Ver y revisar las de su salón | Ver las de otros salones |
| Dirección | Ver y revisar todas | — |

## Flujos
1. Al encolar un aviso de falta se crea un `justificacion_tokens` por familia, que vence al fin del día (hora de Lima) del n-ésimo día hábil posterior a la falta, con n = `Tenant.plazoJustificacionDiasHabiles` (15 por defecto, 1–30; `src/lib/plazo-justificacion.ts` y `src/lib/dias-habiles.ts`). El correo lleva `<raíz>/justificar/<token>` (token derivado con HMAC; en BD solo el hash).
2. `/justificar/[token]` (dominio raíz, sin sesión): muestra colegio, alumno y fecha; formulario **motivo** (1..500) + **adjunto opcional** (JPG/PNG/WEBP/PDF ≤ 5 MB, spec 14). Token usado, vencido o falta corregida → «Este enlace ya se usó o venció. Escríbele a la tutora desde Khipu.»
3. Con sesión: `/asistencia` → «Justificar falta» (con «Puedes justificar hasta el vie 14 nov» debajo) → `/asistencia/justificar/[asistenciaId]`, que repite la fecha límite. Fuera de plazo, `/asistencia` muestra «Plazo vencido» en lugar del botón y la página de justificar muestra el mensaje de plazo vencido sin formulario. Al enviar, se invalidan los enlaces pendientes de esa falta.
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
faltaParaJustificar(ctx, asistenciaId, ahora?) // apoderado; 403 si no es su hijo; { disponible, plazoVencido, venceAt, textoPlazo, mensajeVencido }
justificarConSesion(ctx, asistenciaId, { motivo, archivo }, ahora?)   // rechaza fuera de plazo
consultarTokenJustificacion(token, opciones)    // { ok:false, motivo:"vencido", plazoDias } distingue el vencido

// src/lib/dias-habiles.ts (puro)
esDiaHabil(fechaIso, feriadosExtra?)            // lunes a viernes, sin feriados nacionales del Perú
sumarDiasHabiles(fechaIso, n, feriadosExtra?)   // n-ésimo día hábil posterior
venceJustificacion(fechaFaltaIso, dias, zona = "America/Lima", feriadosExtra?) // 23:59:59.999 local de ese día
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
- **15 días hábiles** por defecto (`Tenant.plazoJustificacionDiasHabiles`, migración `20261027230000_plazo_dias_habiles`, que eliminó `plazoJustificacionHoras`). Dirección lo fija en `/configuracion` → «Avisos a las familias» → «Plazo para justificar faltas (días hábiles)» (1 a 30; fuera de rango se rechaza con «El plazo para justificar va de 1 a 30 días hábiles.»).
- **Días hábiles:** lunes a viernes, sin feriados nacionales del Perú: 1 ene; Jueves y Viernes Santo (Pascua por el algoritmo de Gauss/Meeus); 1 may; 7 jun; 29 jun; 23 jul; 28 y 29 jul; 6 ago; 30 ago; 8 oct; 1 nov; 8 dic; 9 dic; 25 dic. `esDiaHabil`/`sumarDiasHabiles`/`venceJustificacion` aceptan una lista opcional de feriados extra (días no laborables decretados); hoy no se configura por colegio.
- Se cuenta **desde el día de la falta** (no desde el envío del correo): la falta del martes 27/10/2026 vence el martes 17/11/2026 a las 23:59:59 de Lima. `crearTokenJustificacion(tdb, { …, fechaFalta, plazoDias, zonaHoraria })` guarda ese instante en `expiraAt`; los enlaces ya enviados conservan su vencimiento.
- **Aplica a todas las vías:** enlace del correo (`expiraAt`) y justificación con sesión (`faltaParaJustificar` calcula el vencimiento con el plazo vigente del colegio; `justificarConSesion` rechaza fuera de plazo). Mensaje: «El plazo para justificar venció (15 días hábiles). Escribe a la tutora.» (`mensajePlazoVencido(dias)`), distinto de «Este enlace ya se usó o no es válido…», que cubre usado/inexistente/de otro colegio.
- La familia ve la fecha límite: «Puedes justificar hasta el vie 14 nov» (`textoPlazoJustificacion`).

## Pruebas
- integración (`tests/integracion/justificar-token.test.ts`): datos sin sesión, token vencido (sirve hasta `expiraAt`, después no, mensaje de plazo con días hábiles), justificación con sesión rechazada fuera de plazo y aceptada dentro, token de otro colegio, adjunto inválido no gasta el token, un solo uso + aviso a la tutora, revisión por tutora (otro profesor 403) + aviso neutral con tipo `justificacion` + comentario guardado y visible para la familia, apoderado no justifica dos veces ni faltas ajenas.
- unit: `tests/unit/dias-habiles.test.ts` (fines de semana, Pascua 2024–2038, Semana Santa 2026 y 2027, fiestas patrias, diciembre y cruce de año, feriados extra, fin del día en Lima), `tests/unit/plazo-justificacion.test.ts` (rango, fecha límite, textos). integración: `tests/integracion/dia-a-dia-offline-plazo.test.ts` (token a 15 días hábiles por defecto; el plazo configurado se respeta; rango 1–30; la configuración ya no acepta modo ni hora de avisos).
- e2e: el enlace del correo justifica una vez y luego muestra el mensaje de enlace usado.

## Pendientes
- (Resuelto) El plazo aplica también a la justificación con sesión.
- Feriados regionales o días no laborables decretados por colegio: la función ya acepta `feriadosExtra`, falta dónde configurarlos.

## Diseño
- Aceptar y rechazar piden confirmación (`BotonConfirmar`) porque avisan a la familia; el comentario sigue siendo opcional. Tarjetas con `Card`, estados con ícono + palabra y estado vacío con `EstadoVacio`.
