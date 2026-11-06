# 07 — Justificaciones de faltas

> Estado: implementado · Plan: Khipu Base · Última actualización: 2026-11-03 (Claude Code, rama `dev`: plazo de 15 días **calendario**, una solicitud por fecha, aprobación que avisa a los docentes y consecuencia por vencimiento — specs/37; antes, vistas «Por revisar» e «Historial»)

## Objetivo
Que la familia justifique una falta en un minuto, desde el correo o desde Khipu, y que la tutora la revise.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Sin sesión con enlace | Justificar esa falta una vez, dentro del plazo del reglamento del colegio (15 días calendario por defecto) | Ver otra información |
| Apoderado | Justificar faltas de sus hijos desde `/asistencia` dentro del plazo; ver sus justificaciones en `/justificaciones` | Justificar faltas ajenas, dos veces o fuera de plazo |
| Profesor tutor | Ver y revisar las de su salón | Ver las de otros salones |
| Dirección | Ver y revisar todas | — |

## Flujos
1. Al encolar un aviso de falta se crea un `justificacion_tokens` por familia, que vence al fin del día (zona del colegio) del n-ésimo día **calendario** posterior a la falta, con n = `Tenant.plazoJustificacionDias` (15 por defecto, 1–30; `src/lib/plazo-justificacion.ts`). El correo lleva `<raíz>/justificar/<token>` (token derivado con HMAC; en BD solo el hash).
2. `/justificar/[token]` (dominio raíz, sin sesión): muestra colegio, alumno y fecha; formulario **motivo** (1..500) + **adjunto opcional** (JPG/PNG/WEBP/PDF ≤ 5 MB, spec 14). Token usado, vencido o falta corregida → «Este enlace ya se usó o venció. Escríbele a la tutora desde Khipu.»
3. Con sesión: `/asistencia` → «Justificar falta» (con «Puedes justificar hasta el vie 14 nov» debajo) → `/asistencia/justificar/[asistenciaId]`, que repite la fecha límite. Fuera de plazo, `/asistencia` muestra «Plazo vencido» en lugar del botón y la página de justificar muestra el mensaje de plazo vencido sin formulario. Al enviar, se invalidan los enlaces pendientes de esa falta.
4. Al enviar: `justificaciones.estado = pendiente`, `usadoAt` del token, auditoría y aviso `justificacion_recibida` (tipo `justificacion`, `referenciaId = justificacionId`) por correo a la tutora del salón.
5. `/justificaciones` (tutor/dirección) tiene **una sola vista** (2026-11-06; antes eran las pestañas «Por revisar» e «Historial»; `?vista=` ya no se usa):
   - Tabla de todas las del alcance del rol (`historialJustificaciones`): **pendientes primero** (fila con fondo suave) y luego de la más reciente a la más antigua, 25 por página, con filtros GET: **alumno** (nombre o apellido, varias palabras), **estado** (pendiente, aceptada, no aceptada), **salón** (`salonesDeJustificaciones`: dirección todos, tutor los suyos) y **fecha de la falta** desde/hasta (`desde ≤ hasta`). Columnas: falta, alumno y salón, motivo (2 líneas, «Con adjunto»), enviada (fecha y quién), estado, revisión (quién y cuándo, o «Sin revisar») y la acción. «Limpiar» quita los filtros.
   - En el encabezado, «N por revisar» (`contarPendientes`) filtra `?estado=pendiente`.
   - **«Revisar»** (pendiente) o **«Ver»** (revisada) abre un **panel lateral** (abajo en móvil, `DetalleJustificacion`) con alumno, salón, fecha, estado, motivo completo, adjunto, quién la envió y cuándo, quién la revisó, cuándo y el comentario. Si está pendiente, el pie del panel trae el comentario opcional y Aceptar/Rechazar (con confirmación); al decidir, el panel se cierra y la tabla se actualiza.
   - La familia (apoderado) no cambia: ve solo la lista de sus justificaciones.
   Detalle de la revisión: pendientes primero, adjunto con URL temporal (5 min), comentario opcional, **Aceptar** / **Rechazar**. El comentario se guarda en `justificaciones.comentarioRevision`; la familia lo ve en `/justificaciones` («Comentario del colegio: …») y recibe `justificacion_revisada` (neutral, tipo `justificacion`, con el comentario) según sus preferencias y consentimiento.

## Reglas de negocio
- El token se marca usado con un `updateMany` condicionado (`usadoAt IS NULL AND expiraAt > ahora`): un solo uso aunque haya dos envíos simultáneos. Si la subida o el guardado fallan, se libera.
- El adjunto se valida (magic bytes y tamaño) **antes** de gastar el token.
- **Una solicitud por fecha** (specs/37): si cualquier falta del mismo día (la del día o una falta a clase) tiene una justificación pendiente o aceptada, cubre las demás: «Esta fecha ya tiene una justificación.» Con una rechazada se puede volver a presentar dentro del plazo.
- **Aprobada:** vincula los NSP de esa fecha y avisa a los profesores de esas actividades (`justificacion_aprobada_docente`), sin cambiar notas. **Rechazada después del plazo:** se aplica de inmediato la consecuencia configurada (specs/37).
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
// src/lib/plazo-justificacion.ts (puro): ultimoDiaJustificacion, expiracionJustificacion, dentroDelPlazo (días calendario)
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
- **15 días calendario** por defecto (`Tenant.plazoJustificacionDias`; la migración `20261110090000_nsp_justificaciones_libretas` renombró `plazo_justificacion_dias_habiles` conservando el valor). Decisión del colegio piloto (2026-11-03): la falta es el día 0, el día 15 es el último y vence a las 23:59:59.999 en la zona del colegio. Se cuenta con fechas locales (`sumarDias` + `finDelDia`), sin restar horas UTC; los feriados **no** lo mueven.
- Dirección lo fija en `/configuracion` → «Plazo para justificar faltas (días calendario)» (1 a 30; fuera de rango: «El plazo para justificar va de 1 a 30 días calendario.»).
- Aplica a todas las vías: enlace del correo (`expiraAt`) y justificación con sesión (`faltaParaJustificar`, `justificarConSesion`). Mensaje: «El plazo para justificar venció (15 días calendario). Escribe a la tutora.» (`mensajePlazoVencido`).
- La familia ve la fecha límite: «Puedes justificar hasta el vie 20 nov» (`textoPlazoJustificacion`).
- Vencido sin justificación: consecuencia automática configurada por el colegio sobre los NSP de esa fecha (specs/37).

## Pruebas
- integración (`tests/integracion/justificar-token.test.ts`): datos sin sesión, token vencido (sirve hasta `expiraAt`, después no, mensaje de plazo con días calendario), justificación con sesión rechazada fuera de plazo y aceptada dentro, token de otro colegio, adjunto inválido no gasta el token, un solo uso + aviso a la tutora, revisión por tutora (otro profesor 403) + aviso neutral con tipo `justificacion` + comentario guardado y visible para la familia, apoderado no justifica dos veces ni faltas ajenas.
- unit: `tests/unit/plazo-justificacion.test.ts` (días calendario, día 15 dentro y 16 fuera, cruce de año, zona horaria, textos); `tests/unit/dias-habiles.test.ts` sigue cubriendo los días hábiles (control de ingreso, reportes). integración: `tests/integracion/nsp-justificaciones-recuperacion.test.ts` (specs/37). integración: `tests/integracion/dia-a-dia-offline-plazo.test.ts` (token a 15 días calendario por defecto; el plazo configurado se respeta; rango 1–30; la configuración ya no acepta modo ni hora de avisos).
- e2e: el enlace del correo justifica una vez y luego muestra el mensaje de enlace usado. `tests/e2e/justificaciones-vistas.test.ts`: vista única sin pestañas, panel de detalle con Aceptar/Rechazar, filtros y «Limpiar».

## Pendientes
- (Resuelto) El plazo aplica también a la justificación con sesión.
- (Resuelto por decisión del colegio) El plazo ya no depende de feriados: es en días calendario.

## Diseño
- Aceptar y rechazar piden confirmación (`BotonConfirmar`) porque avisan a la familia; el comentario sigue siendo opcional. Tarjetas con `Card`, estados con ícono + palabra y estado vacío con `EstadoVacio`.
