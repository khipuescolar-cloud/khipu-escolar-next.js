# 04 — Asistencia (pasar lista)

> Estado: implementado · Plan: Básico · Última actualización: 2026-10-26 (Claude Code, rama `feat/basico`)

## Objetivo
El profesor pasa lista en menos de un minuto y las familias se enteran al instante.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Profesor | Pasar lista en los cursos que dicta; si es tutor, la «Asistencia del día» y los cursos de su salón | Pasar lista en cursos o salones ajenos (403) |
| Dirección | Todo lo anterior en cualquier salón + resumen del día del colegio | — |
| Apoderado | Ver los últimos 30 días de sus hijos y justificar faltas | Ver otros alumnos; pasar lista |
| Portería | Registra llegadas desde `/porteria` (spec 05) | Entrar a `/asistencia` (403) |

## Flujos
1. `/asistencia` (profesor/dirección) muestra las listas disponibles agrupadas por salón: «Asistencia del día · 3.° B» (`ambito = "dia"`) y cada curso (`ambito = cursoId`). Dirección ve además el conteo del día (Llegó/Tarde/Falta/Problema/Sin registro).
2. `/asistencia?salon=<id>&ambito=<dia|cursoId>`: lista de alumnos con 4 botones grandes **Llegó / Tarde / Falta / Problema** (ícono + palabra, `aria-pressed`). Por defecto «Llegó» o el estado ya guardado hoy. Muestra la hora actual de Lima. «Problema» abre un campo de nota (máx. 300).
3. Vista previa del correo (componente `VistaPreviaAviso`, compartido con la spec 06) para la familia del alumno elegido, según el estado marcado.
4. **«Guardar y avisar a los padres»** → `guardarListaAction` → `guardarLista()` → resumen «Lista guardada. Se avisó a N familias.» y `after()` procesa la cola del colegio.
5. Apoderado: `/asistencia` lista por hijo los últimos 30 días con `EstadoAsistencia` y, en faltas sin justificar (o con justificación rechazada), el botón **Justificar falta** → `/asistencia/justificar/<asistenciaId>` (spec 07). Debajo, «Tus avisos» (preferencias y push, spec 06).

## Reglas de negocio
- Fecha y hora en `tenant.zonaHoraria` (America/Lima) con `momentoEnZona()` (`src/lib/fechas.ts`).
- Upsert por `(alumnoId, fecha, ambito)` con `origen = lista`. La hora se fija al crear o al cambiar el estado; si solo cambia la nota, se conserva.
- Solo se encola aviso si el registro es nuevo o **cambia el estado**. Repetir la misma lista no crea filas ni avisos.
- En la lista de un curso, «Llegó» no se vuelve a avisar si el alumno ya tiene hoy otra llegada (del día u otro curso). Tarde, falta y problema siempre se avisan.
- Falta: texto «no llegó hoy a la 1.ª hora» (lista del día) o «no llegó hoy a <curso>».
- Todos los alumnos enviados deben ser del salón y estar activos; si no, 403.
- `auditar()` en cada creación y cambio (con estado antes/después) y al ver la lista o el historial.

## Modelo de datos
- `asistencias`: `alumnoId`, `cursoId` (null en el día), `ambito`, `fecha` (`@db.Date`), `hora` (HH:mm), `estado`, `nota`, `origen`, `registradoPorId`. Única `(alumnoId, fecha, ambito)`.
- Lee `salones`, `cursos`, `alumnos`, `justificaciones`; escribe `avisos` y `justificacion_tokens` vía spec 06/07.

## Contratos de `src/lib/server`
```ts
// src/lib/server/asistencia.ts
opcionesDeLista(ctx): Promise<{ salonId; salonNombre; ambito; titulo }[]>   // profesor/dirección
obtenerLista(ctx, salonId, ambito)    // 403 si no es su lista; audita «ver»
guardarLista(ctx, entrada: unknown, ahora?) : Promise<{ guardados; cambios; familiasAvisadas }>
  // zod: { salonId: uuid, ambito: "dia" | uuid, registros: [{ alumnoId, estado, nota? }] (1..200) }
resumenDelDia(ctx)                    // solo dirección
historialDeHijos(ctx, dias = 30)      // solo apoderado
hoyDelColegio(ctx, ahora?) : { isoFecha, hora }
```

## Rutas y UI
- `/asistencia` (profesor, dirección): elegir lista; con `?salon&ambito`, pasar lista (`ListaAsistencia.tsx`, cliente).
- `/asistencia` (apoderado): historial de 30 días + preferencias de aviso (`#avisos`).
- `/asistencia/justificar/[asistenciaId]` (apoderado): formulario de justificación con sesión.

## Textos y UX
- Botón: «Guardar y avisar a los padres». Resultado: «Lista guardada. Se avisó a 1 familia.» / «… a N familias.»
- Estados siempre con ícono + palabra; en la familia: «Justificación en revisión», «Falta justificada».

## Diseño (rediseño del día a día)
- Pasar lista: tarjeta por alumno con botones grandes (Llegó/Tarde/Falta/Problema, ícono + palabra); en móvil la barra «Guardar y avisar a los padres» queda fija abajo con el conteo; en escritorio vive en el panel lateral junto a la vista previa. Éxito: aviso en página y toast «Asistencia guardada».
- Vista de la familia: registros en tarjeta, estados vacíos con `EstadoVacio`, preferencias de aviso en tarjeta.

## Errores y casos borde
- Datos inválidos → «Revisa la lista: hay datos que no son válidos.»
- Salón sin alumnos activos → mensaje y sin botón.
- Corregir de falta a llegó genera un aviso de llegada (cambia el estado); el enlace de justificar de la falta deja de servir porque la falta ya no existe.

## Pruebas
- integración (`tests/integracion/pasar-lista.test.ts`): upsert idempotente, avisos solo con consentimiento, corrección = aviso nuevo, token de falta solo con hash, auditoría, preferencia sin correo, llegada en curso no se re-avisa, profesor no pasa lista en curso o salón ajeno, alumno de otro salón rechazado, apoderado no pasa lista, modo `solo_excepciones`.
- e2e (`tests/e2e/pasar-lista-aviso-justificar.test.ts`): Lucía pasa lista en 3.° B → correo en Mailpit → enlace de justificar funciona una vez. `tests/e2e/paginas-basico-por-rol.test.ts`: resumen del día, vista de familia, portería sin acceso.

## Pendientes
- (Hecho) Vista de la familia: botón «Escribir a la tutora» por hijo → `/mensajes/nuevo?alumno=<id>` (spec 08).
- Calendario mensual para la familia (hoy es lista de 30 días).
- Guardado sin conexión (PWA) para salones sin buena señal.
