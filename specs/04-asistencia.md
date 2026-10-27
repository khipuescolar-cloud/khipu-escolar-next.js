# 04 — Asistencia (pasar lista)

> Estado: implementado · Plan: Básico · Última actualización: 2026-10-27 (Claude Code, rama `feat/p2-dia-a-dia`: calendario mensual y pasar lista sin conexión)

## Objetivo
El profesor pasa lista en menos de un minuto y las familias se enteran al instante.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Profesor | Pasar lista en los cursos que dicta; si es tutor, la «Asistencia del día» y los cursos de su salón | Pasar lista en cursos o salones ajenos (403) |
| Dirección | Todo lo anterior en cualquier salón + resumen del día del colegio | — |
| Apoderado | Ver el calendario mensual de sus hijos y justificar faltas | Ver otros alumnos; pasar lista |
| Portería | Registra llegadas desde `/porteria` (spec 05) | Entrar a `/asistencia` (403) |

## Flujos
1. `/asistencia` (profesor/dirección) muestra las listas disponibles agrupadas por salón: «Asistencia del día · 3.° B» (`ambito = "dia"`) y cada curso (`ambito = cursoId`). Dirección ve además el conteo del día (Llegó/Tarde/Falta/Problema/Sin registro).
2. `/asistencia?salon=<id>&ambito=<dia|cursoId>`: lista de alumnos con 4 botones grandes **Llegó / Tarde / Falta / Problema** (ícono + palabra, `aria-pressed`). Por defecto «Llegó» o el estado ya guardado hoy. Muestra la hora actual de Lima. «Problema» abre un campo de nota (máx. 300).
3. Vista previa del correo (componente `VistaPreviaAviso`, compartido con la spec 06) para la familia del alumno elegido, según el estado marcado.
4. **«Guardar y avisar a los padres»** → `guardarListaAction` → `guardarLista()` → resumen «Lista guardada. Se avisó a N familias.» y `after()` procesa la cola del colegio.
5. Apoderado: `/asistencia` calendario del mes por hijo (`CalendarioAsistencia`, lógica en `src/lib/calendario-asistencia.ts`) y, debajo, la lista detallada del mes con `EstadoAsistencia` y, en faltas sin justificar (o con justificación rechazada), el botón **Justificar falta** → `/asistencia/justificar/<asistenciaId>` (spec 07). Debajo, «Tus avisos» (preferencias y push, spec 06).

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
- `/asistencia` (apoderado): calendario mensual + lista del mes (`?mes=AAAA-MM`, «Mes anterior» / «Mes siguiente»; no pasa del mes actual ni retrocede más de 24 meses) + preferencias de aviso (`#avisos`).
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

## Calendario mensual de la familia
- Una cuadrícula por hijo (lunes a domingo, zona del colegio `America/Lima`): cada día con estado muestra **ícono + palabra** (la palabra va como texto accesible) y el color del token `llego/tarde/falta/problema`; fines de semana y días futuros se atenúan; «hoy» lleva un anillo. Leyenda con el conteo del mes y «Sin registro».
- Un día con varios registros muestra el ingreso al colegio (`ambito = "dia"`); si no hay, el más grave de los cursos (falta > problema > tarde > llegó).
- La lista detallada del mes (con «Justificar falta») queda debajo del calendario. `historialDeHijos(ctx, mes?)` consulta solo ese mes y audita `ver` por hijo.

## Pasar lista sin conexión (PWA)
- Si no hay conexión (o la acción falla por red) al guardar, la lista se guarda en **IndexedDB** (`khipu-offline`, almacén `listas`, API nativa sin paquetes; `src/lib/cliente/cola-offline.ts`) con la hora real. Guardar otra vez la misma lista (mismo salón y ámbito) reemplaza a la anterior. Se muestra «Sin conexión · 1 lista pendiente de enviar» (`IndicadorSinConexion`, con `role="status"`).
- El reenvío es automático al abrir `/asistencia` (elegir lista o pasar lista) y con el evento `online`, con un candado (`navigator.locks`) para que dos pestañas no envíen a la vez; al terminar hay un toast «Se envió la lista guardada sin conexión». No pide acción del profesor.
- **Servidor idempotente:** `guardarLista` acepta `registradoAt` (ISO) y lo respeta **solo si es razonable** (`src/lib/registro-offline.ts`): no más de 5 min en el futuro ni más de 48 h en el pasado; si no, usa la hora del servidor. Con esa hora se calculan la fecha y la hora del registro (una lista tomada ayer sin red queda en el día de ayer). Reenviar lo mismo no cambia nada ni vuelve a avisar (única por alumno/fecha/ámbito). Si el servidor ya tiene un cambio **posterior** a la hora de la lista offline (p. ej. portería), ese registro no se pisa y se cuenta en `omitidos`. Los avisos a las familias salen cuando se sincroniza.
- Service worker (`public/sw.js`, comparte archivo con push): guarda en caché, con red primero, `/_next/static/**` y `/marca/**`. **Límite documentado:** las páginas con datos de alumnos (`/asistencia`) no se guardan en caché porque podrían quedar en un equipo compartido; por eso se puede guardar sin red con la página ya abierta, pero no recargarla sin red. El service worker solo funciona en HTTPS (o `localhost`), no en `lvh.me` por http.
- **Reintentos acotados** (`vaciarCola`, `src/lib/registro-offline.ts`; vale también para la cola de portería, spec 05): un error de red («reintentar») detiene el envío y NO cuenta. Un error del servidor que no es de red («fallo») suma un `intentos` al registro y se sigue con los demás. Con `MAX_INTENTOS_COLA` (5) fallos el registro ya no se reenvía y queda como «No se pudo enviar» (`AvisoColaFallida`, con `role="alert"`, ícono + palabra y botón «Descartar»), más un aviso al profesor al alcanzar el tope. Volver a guardar la misma lista reemplaza el registro y reinicia los intentos. Test unitario: `tests/unit/registro-offline.test.ts`.
- Datos locales: la lista pendiente (ids de alumnos y estados) vive en el dispositivo hasta sincronizar y se borra al enviarse.

## Pruebas
- unit: `tests/unit/calendario-asistencia.test.ts` (armado del mes, estado por día, navegación, zona Lima), `tests/unit/registro-offline.test.ts` (hora razonable, cola, contador). integración: `tests/integracion/dia-a-dia-offline-plazo.test.ts` (lista offline con hora real, idempotencia, no pisa un cambio posterior). e2e: `tests/e2e/dia-a-dia-offline-calendario.test.ts` (calendario y navegación; lista sin conexión con `context.setOffline`).
- integración (`tests/integracion/pasar-lista.test.ts`): upsert idempotente, avisos solo con consentimiento, corrección = aviso nuevo, token de falta solo con hash, auditoría, preferencia sin correo, llegada en curso no se re-avisa, profesor no pasa lista en curso o salón ajeno, alumno de otro salón rechazado, apoderado no pasa lista, modo `solo_excepciones`.
- e2e (`tests/e2e/pasar-lista-aviso-justificar.test.ts`): Lucía pasa lista en 3.° B → correo en Mailpit → enlace de justificar funciona una vez. `tests/e2e/paginas-basico-por-rol.test.ts`: resumen del día, vista de familia, portería sin acceso.

## Pendientes
- (Hecho) Vista de la familia: botón «Escribir a la tutora» por hijo → `/mensajes/nuevo?alumno=<id>` (spec 08).
- (Resuelto) Reintentos acotados de la cola sin conexión: ver el párrafo de la cola.
