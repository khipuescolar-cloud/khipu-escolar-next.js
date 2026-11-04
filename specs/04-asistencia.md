# 04 — Asistencia (pasar lista)

> Estado: implementado · Plan: Khipu Base · Última actualización: 2026-11-03 (Claude Code, rama `pre-asistencia`: permisos de asistencia, «Con permiso» al pasar lista, salida en el historial de la familia; antes, 2026-10-30, rama `feat/asistencia-colegio-cursos`: asistencia al colegio vs. asistencia por curso, asistencia por curso configurable por nivel, avisos de curso solo de faltas y tardanzas, dirección ya no pasa lista: ve y corrige desde los reportes)

## Objetivo
El profesor pasa lista en menos de un minuto y las familias se enteran al instante.

## Dos asistencias
- **Asistencia al colegio** (`ambito = "dia"`, `cursoId = null`): ¿entró al colegio hoy? La fuente principal es la **portería con QR** (spec 05); la lista «Asistencia del día» del **tutor** es el respaldo (olvidó el carnet, portería no lo escaneó). Es la única que cuenta en los porcentajes de asistencia (spec 27).
- **Asistencia por curso** (`ambito = cursoId`): ¿estuvo en Matemática? Puede haber entrado al colegio y faltar a la clase; esa falta debe llegar a la familia. La **dirección la activa por nivel** (inicial, primaria, secundaria; academia solo si el colegio tiene salones de academia) en Configuración. Por defecto, ningún nivel.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Profesor | Pasar lista (hoy) en los cursos que dicta; si es tutor, la «Asistencia del día» y los cursos de su salón. Las listas de curso solo en salones de niveles con asistencia por curso activa | Cursos o salones ajenos (403); listas de curso de un nivel apagado (error de negocio); otro día que no sea hoy (403) |
| Dirección | **No pasa lista** (no tiene «Pasar lista» en el menú; `/asistencia` la lleva a `/asistencia/reportes`). Desde los reportes abre la lista de un salón (del día o de un curso) de cualquier fecha hasta hoy y **corrige** entradas; activa la asistencia por curso por nivel | Corregir días futuros; listas de curso de un nivel apagado |
| Apoderado | Ver el calendario mensual de sus hijos y justificar faltas | Ver otros alumnos; pasar lista |
| Portería | Registra llegadas y salidas desde `/porteria` (spec 05) | Entrar a `/asistencia` o `/permisos` (403) |
| Administrativo | Registrar y anular permisos de asistencia (`/permisos`) | Pasar lista |

## Flujos
1. `/asistencia` (profesor) muestra las listas disponibles agrupadas por salón: «Asistencia del día · 3.° B» (`ambito = "dia"`, solo el tutor) y cada curso (`ambito = cursoId`, solo si el nivel del salón tiene asistencia por curso). Dirección es redirigida a `/asistencia/reportes` (el conteo del día del colegio vive allí, spec 27).
2. `/asistencia?salon=<id>&ambito=<dia|cursoId>`: lista de alumnos con 4 botones grandes **Llegó / Tarde / No llegó / Aviso** (valor interno `falta` y `problema`; manual de marca: Check, Clock, CircleAlert, TriangleAlert) (ícono + palabra, `aria-pressed`). Por defecto «Llegó» o el estado ya guardado hoy. Muestra la hora actual de Lima. «Aviso» abre un campo de nota (máx. 300).
3. Vista previa del correo (componente `VistaPreviaAviso`, compartido con la spec 06) para la familia del alumno elegido, según el estado marcado. En una lista de curso: «Llegó» muestra «En las listas de curso no se avisa la llegada…»; «No llegó» muestra el aviso de falta a clase con la hora de ingreso real del alumno (el servidor renderiza con la hora marcador `HORA_MARCADOR_INGRESO` de `src/lib/vista-previa.ts` y el cliente la reemplaza) o, si el alumno no registra ingreso al colegio, explica que no se avisa aparte. Cada tarjeta de alumno de un curso muestra «Ingresó 7:52 a. m.» o «Sin ingreso al colegio».
4. Antes de guardar, el resumen (panel lateral en escritorio, barra fija en móvil) dice a quién se avisará, con la misma regla que el servidor (`seAvisaCambio` de `src/lib/asistencia-por-curso.ts`, usada por `src/lib/resumen-avisos-lista.ts`): «Se avisará a 24 familias: 20 llegadas, 2 tardanzas, 2 faltas.»; en un curso «Se avisará a 3 familias: 1 tardanza, 2 faltas a clase.» y, si aplica, «2 faltas no se avisan aparte: esos alumnos no registran ingreso al colegio hoy (sus familias reciben el aviso de la asistencia del día).» o «La llegada de 1 alumno ya se avisó hoy.» (`obtenerLista` devuelve `familiasConAviso` e `ingreso` por alumno).
5. **«Guardar y avisar a los padres»** (cerrar la lista) → `guardarListaAction` → `guardarLista()` → resumen «Lista guardada. Se avisó a N familias.» y `after()` procesa la cola del colegio en ese momento (el aviso sale sin esperar al cron). Un error de negocio (nivel apagado, fecha futura) vuelve como mensaje en la lista.
5b. **Dirección corrige** (modo «corregir»): desde `/asistencia/reportes` («Corregir» en la tabla del día por salón, en el detalle de un alumno o en el detalle de un curso) abre `/asistencia?salon=<id>&ambito=<dia|cursoId>&fecha=AAAA-MM-DD`. Título «Corregir · Matemática · 3.° B», enlace «Volver a los reportes», sin «Marcar a todos «Llegó»» ni cola sin conexión. Los alumnos sin registro quedan sin marcar («Sin registro») y solo se envían los alumnos que cambiaron («No hay cambios para guardar.» si ninguno). Botón «Guardar corrección y avisar» (hoy) o «Guardar corrección» (día pasado: «Corrección de un día pasado: no se envían avisos.»).
6. Apoderado: `/asistencia` calendario del mes por hijo (`CalendarioAsistencia`, lógica en `src/lib/calendario-asistencia.ts`) y, debajo, la lista detallada del mes con `EstadoAsistencia` y, en faltas sin justificar (o con justificación rechazada) **dentro del plazo** (spec 07), el botón **Justificar falta** → `/asistencia/justificar/<asistenciaId>` con la fecha límite debajo («Puedes justificar hasta el vie 14 nov»); fuera de plazo se muestra «Plazo vencido» (ícono + palabra) en lugar del botón. Debajo, «Tus avisos» (preferencias y push, spec 06).

## Reglas de negocio
- Fecha y hora en `tenant.zonaHoraria` (America/Lima) con `momentoEnZona()` (`src/lib/fechas.ts`).
- Upsert por `(alumnoId, fecha, ambito)` con `origen = lista`. La hora se fija al crear o al cambiar el estado; si solo cambia la nota, se conserva.
- **Asistencia del día (portería / tutor):** al guardar (cerrar) la lista, las familias de **todos** los alumnos reciben aviso según su estado: presentes (`llego` → `asistencia_llego`), tardanzas, faltas y problemas, por correo, push y demás canales según sus preferencias y consentimiento (spec 06). Ya no existe el modo «solo excepciones».
- Solo se encola aviso si el registro es nuevo o **cambia el estado**. Repetir la misma lista no crea filas ni avisos.
- **Un solo aviso de llegada por alumno y día:** la llegada solo se avisa desde la asistencia al colegio (portería y la lista del día escriben la misma fila `ambito = "dia"`), así que sale una vez; «Llegó» tampoco se avisa si esta lista lo tenía «Tarde». Motivo: cada correo cuesta y el envío diario tiene tope (Gmail ~500 por día; `EMAIL_DAILY_LIMIT`). Una llegada marcada antes en un curso **no** impide el aviso de ingreso (las listas de curso nunca lo avisan).
- **Listas de curso: solo faltas y tardanzas** (y «Aviso»/problema como siempre), **nunca «llegó»** (`seAvisaCambio`, `src/lib/asistencia-por-curso.ts`):
  - Tardanza → `asistencia_tarde` con `curso`: «Mateo llegó tarde a Matemática (10:12 a. m.).»
  - Falta, si el alumno **ingresó al colegio** ese día (registro `dia` en «Llegó» o «Tarde», consultado después de guardar) → `asistencia_falta` con `curso`, `ingreso` y `horaClase`: «Mateo ingresó al colegio a las 7:52 a. m., pero no estuvo en Matemática (10:00 a. m.).», con «Justificar falta».
  - Con el **control de ingreso automático** activo (spec 05), quien no registra ingreso al colegio solo puede quedar con «No llegó» en la lista de un curso (botones desactivados y `guardarLista` lo rechaza; no aplica sin conexión ni en correcciones). La falta del día la pone el control a la hora límite.
  - Falta **sin ingreso al colegio** (sin registro del día, o con «No llegó» o «Aviso» en el día) → **no se avisa aparte**: la familia ya recibe (o recibirá) «no llegó» de la asistencia del día. El registro se guarda igual y cuenta en «Asistencia por curso» (spec 27). Límite conocido: si el ingreso se registra *después* de la lista del curso, esa falta a clase no se avisa (la decisión se toma al guardar la lista del curso).
  - Se respetan consentimiento, preferencias (correo/push) y el tope diario de la cola como cualquier aviso (spec 06).
- **Asistencia por curso por nivel:** `Tenant.asistenciaPorCursoNiveles` (`Nivel[]`, por defecto vacío). Si el nivel del salón no está activo, `opcionesDeLista` no ofrece sus cursos y `obtenerLista`/`guardarLista` con ese `ambito` lanzan `AsistenciaPorCursoDesactivada` (`ErrorDeNegocio`): «La asistencia por curso está desactivada para primaria. Dirección puede activarla en Configuración.» Vale también para dirección. Apagar un nivel no borra registros: el historial de la familia y los reportes siguen mostrando los de curso pasados.
- **Corrección de dirección** (`fecha` en `obtenerLista`/`guardarLista`): solo dirección (un profesor con otra fecha que no sea hoy → 403), nunca un día futuro («No se puede corregir la asistencia de un día que aún no llega.»). Hoy: mismas reglas de aviso que la lista. Día pasado: se guarda y se audita (`correccion: true`, `fecha`), **sin avisos** (los textos dicen «hoy» y el momento pasó; la familia puede justificar desde su calendario dentro del plazo). Al corregir un día pasado se conserva la hora del registro anterior si lo había.
- Falta del día: texto «no llegó hoy a la 1.ª hora».
- **NSP** (specs/37): cada lista guardada (y portería, el control de ingreso y las incidencias) ajusta los NSP de las actividades de ese día: falta a clase, o falta del día sin registro de la clase, = NSP; si la asistencia pasa a presente, el NSP se quita (con historial). Una calificación ya puesta no se pisa.
- **Incidencias** (specs/37): `origen = incidencia` (`asistencias.incidencia_id`) son faltas a clase creadas al registrar un accidente o retiro anticipado en `/incidencias`; no envían aviso a la familia y se justifican como cualquier falta.
- Todos los alumnos enviados deben ser del salón y estar activos; si no, 403.
- `auditar()` en cada creación y cambio (con estado antes/después) y al ver la lista o el historial.

## Permisos de asistencia (2026-11-03)
Regla aprobada: **las tardanzas y los permisos autorizados no se convierten automáticamente en NSP.**
- **Qué es:** el colegio autoriza que un alumno no asista **todo el día** o falte **unas horas** (HH:mm desde–hasta), de una fecha a otra (máximo 60 días). Motivo obligatorio (3–500 caracteres).
- **Quién:** registran y anulan dirección, administrativo y el **tutor del salón** del alumno. Los demás profesores ven en solo lectura los permisos de sus salones (`salonIdsVisibles`). Familias, alumnos y portería: 403. Todo se audita (`permiso_asistencia`: crear, editar con `anulado: true`, ver).
- **No se borran:** «Anular permiso» pide motivo y guarda quién y cuándo (`anulado_at`, `anulado_por`, `motivo_anulacion`). Anular dos veces responde «Este permiso ya estaba anulado.»
- **Efectos:**
  - **Control de ingreso** (spec 05): con permiso de día completo vigente ese día, el alumno no recibe «aún no llega» ni falta automática (`alumnosSinIngreso` lo excluye).
  - **NSP** (spec 37): una falta cubierta por un permiso vigente no genera NSP. El de día completo cubre la falta del día y las faltas a clase; uno por horas, solo las faltas a clase cuyo registro (`hora`) cae dentro de esas horas. Si el permiso se registra **después**, `sincronizarNsp` retira el NSP automático (historial «La falta está cubierta por un permiso de asistencia autorizado.», actor Khipu) en cada día del permiso con actividades, hasta hoy. Si se anula, el NSP vuelve si la falta sigue. Una calificación o una consecuencia ya aplicada no se tocan (misma regla que corregir la asistencia).
  - **Pasar lista:** la tarjeta del alumno muestra «Con permiso · Todo el día» (o las horas). No cambia los botones ni los avisos.
  - **Familia:** en su lista del mes, la falta cubierta dice «Con permiso del colegio» y no ofrece «Justificar falta» (no hace falta justificarla).
  - **Reportes** (spec 27): columna «Con permiso»; la falta con permiso cuenta como justificada.
- **No cubre** las faltas a clase por incidencia ni el retiro anticipado (decisión pendiente, spec 37).
- **UI:** `/permisos` (barra lateral, grupo «Día a día», ícono `CalendarCheck`; junto a Incidencias): formulario (alumno, desde, hasta, todo el día o unas horas, motivo) y lista con «Vigente» / «Anulado» (ícono + palabra) y «Anular permiso» con motivo. `?alumno=<id>` preselecciona el alumno.
- **Contratos** (`src/lib/server/permisos-asistencia.ts`): `registrarPermiso(ctx, { alumnoId, desde, hasta, todoElDia, horaDesde?, horaHasta?, motivo }, ahora?)`, `anularPermiso(ctx, { permisoId, motivo }, ahora?)`, `listarPermisos(ctx, { alumnoId? })`, `alumnosParaPermiso(ctx)`, `permisosVigentes(tdb, alumnoIds, desde, hasta?)`, `coberturaDePermisos(permisos)`. Puro: `src/lib/permisos-asistencia.ts` (`cubreDiaCompleto`, `cubreHora`, `permisoVigenteEn`, `textoHorasPermiso`).
- **Límites conocidos:** un permiso por horas no cubre la falta del día (si el alumno no vino en todo el día, hace falta uno de día completo). Anular un permiso de un día pasado no crea la falta que el control de ingreso no puso. Hoy la familia no ve la lista de permisos (solo el efecto en su calendario).

## Modelo de datos
- `permisos_asistencia` (migración `20261112090200_permisos_asistencia`): `alumno_id`, `desde`/`hasta` (date, CHECK desde ≤ hasta), `todo_el_dia`, `hora_desde`/`hora_hasta` (CHECK: obligatorias y ordenadas si no es todo el día), `motivo`, `registrado_por`, `created_at`, `anulado_at`/`anulado_por`/`motivo_anulacion`. RLS cerrado. La misma migración agrega `asistencias.hora_salida` y `salida_registrada_por` (spec 05).
- `asistencias`: `alumnoId`, `cursoId` (null en el día), `ambito`, `fecha` (`@db.Date`), `hora` (HH:mm), `estado`, `nota`, `origen`, `registradoPorId`. Única `(alumnoId, fecha, ambito)`.
- `tenants.asistencia_por_curso_niveles` (`Nivel[]`, `DEFAULT ARRAY[]`; migración aditiva `20261102090000_asistencia_por_curso_niveles`). Seed: Nuevo Horizonte (único colegio demo, specs/35) primaria y secundaria; los e2e crean colegios temporales sin asistencia por curso.
- Lee `salones`, `cursos`, `alumnos`, `justificaciones`; escribe `avisos` y `justificacion_tokens` vía spec 06/07.

## Contratos de `src/lib/server`
```ts
// src/lib/server/asistencia.ts
opcionesDeLista(ctx): Promise<{ salonId; salonNombre; ambito; titulo }[]>   // profesor/dirección; cursos solo de niveles activos
obtenerLista(ctx, salonId, ambito, fecha?)   // 403 si no es su lista; fecha ≠ hoy solo dirección; audita «ver»
obtenerLista(...): { salon, curso, ambito, hoy: { isoFecha, hora }, esHoy, alumnos[] }
obtenerLista(...).alumnos[i]: { id, nombres, apellidos, registro, familiasConAviso, ingreso /* solo cursos: registro del día */ }
guardarLista(ctx, entrada: unknown, ahora?) : Promise<{ guardados; cambios; familiasAvisadas; omitidos }>
  // zod: { salonId: uuid, ambito: "dia" | uuid, registros: [{ alumnoId, estado, nota? }] (1..200), registradoAt?, fecha? (corrección) }
  // Carga de una vez los registros previos de la lista y las familias a avisar (destinatariosPorAlumno), consulta en
  // una sola query el ingreso al colegio de los alumnos con falta (cursos) y audita con un solo INSERT (docs/pruebas-de-estres.md).
class AsistenciaPorCursoDesactivada extends ErrorDeNegocio
// src/lib/asistencia-por-curso.ts (puro): NIVELES, NOMBRE_NIVEL, asistenciaPorCursoActiva, mensajeCursoDesactivado,
//   nivelesConfigurables(tieneAcademia), ingresoAlColegio, seAvisaCambio({ esCurso, estado, anterior, ingreso })
// src/lib/server/configuracion.ts: actualizarAsistenciaPorCurso(ctx, niveles) // solo dirección; audita { antes, ahora }
historialDeHijos(ctx, mes?)           // apoderado/alumno; cada registro trae puedeJustificar, justificarHasta y plazoVencido
hoyDelColegio(ctx, ahora?) : { isoFecha, hora }
```

## Rutas y UI
- `/asistencia` (profesor): elegir lista (con el módulo Horario, specs/34: las listas de curso de hoy en orden de hora con «Hoy 08:00–08:45» y la insignia «Ahora» en la que está en clase; salones ordenados por su primera clase de hoy); con `?salon&ambito`, pasar lista (`ListaAsistencia.tsx`, cliente). Dirección: sin parámetros → redirige a `/asistencia/reportes`; con `?salon&ambito&fecha` → modo «corregir». Lista de curso de un nivel apagado → estado vacío «No se puede abrir esta lista» con el mensaje.
- `/configuracion` (dirección): tarjeta «Asistencia por curso» con una casilla por nivel (y cuántos salones tiene) → `guardarAsistenciaPorCursoAction`.
- `/asistencia` (apoderado): calendario mensual + lista del mes (`?mes=AAAA-MM`, «Mes anterior» / «Mes siguiente»; no pasa del mes actual ni retrocede más de 24 meses) + preferencias de aviso (`#avisos`).
- `/asistencia/justificar/[asistenciaId]` (apoderado): formulario de justificación con sesión.
- `/asistencia` (apoderado): cada ingreso al colegio con salida registrada muestra «Salió 1:10 p. m.» (`RegistroHistorial.horaSalida`); una falta con permiso, «Con permiso del colegio» (`conPermiso`).
- `/permisos` (dirección, administrativo, profesor): ver «Permisos de asistencia».

## Textos y UX
- Botón: «Guardar y avisar a los padres». Resultado: «Lista guardada. Se avisó a 1 familia.» / «… a N familias.»
- Estados siempre con ícono + palabra; en la familia: «Justificación en revisión», «Falta justificada».

## Diseño (rediseño del día a día)
- Pasar lista: tarjeta por alumno con botones grandes (Llegó/Tarde/No llegó/Aviso, ícono + palabra); en móvil la barra «Guardar y avisar a los padres» queda fija abajo con el conteo; en escritorio vive en el panel lateral junto a la vista previa. Éxito: aviso en página y toast «Asistencia guardada».
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
- Service worker (`public/sw.js`, comparte archivo con push): guarda en caché, con red primero, `/_next/static/**` y `/marca/**`. **Límite documentado:** las páginas con datos de alumnos (`/asistencia`) no se guardan en caché porque podrían quedar en un equipo compartido; por eso se puede guardar sin red con la página ya abierta, pero no recargarla sin red. El service worker solo funciona en HTTPS (o `localhost`), no en `lvh.me` por http. Desde specs/24, una navegación sin red muestra `/sin-conexion` (en vez del error del navegador) y las versiones nuevas del SW esperan el toque en «Actualizar».
- **Reintentos acotados** (`vaciarCola`, `src/lib/registro-offline.ts`; vale también para la cola de portería, spec 05): un error de red («reintentar») detiene el envío y NO cuenta. Un error del servidor que no es de red («fallo») suma un `intentos` al registro y se sigue con los demás. Con `MAX_INTENTOS_COLA` (5) fallos el registro ya no se reenvía y queda como «No se pudo enviar» (`AvisoColaFallida`, con `role="alert"`, ícono + palabra y botón «Descartar»), más un aviso al profesor al alcanzar el tope. Volver a guardar la misma lista reemplaza el registro y reinicia los intentos. Test unitario: `tests/unit/registro-offline.test.ts`.
- Datos locales: la lista pendiente (ids de alumnos y estados) vive en el dispositivo hasta sincronizar y se borra al enviarse.

## Pruebas
- unit: `tests/unit/calendario-asistencia.test.ts` (armado del mes, estado por día, navegación, zona Lima), `tests/unit/registro-offline.test.ts` (hora razonable, cola, contador). integración: `tests/integracion/dia-a-dia-offline-plazo.test.ts` (lista offline con hora real, idempotencia, no pisa un cambio posterior). e2e: `tests/e2e/dia-a-dia-offline-calendario.test.ts` (calendario y navegación; lista sin conexión con `context.setOffline`).
- integración (`tests/integracion/pasar-lista.test.ts`): upsert idempotente, avisos solo con consentimiento, corrección = aviso nuevo, token de falta solo con hash, auditoría, preferencia sin correo, el curso nunca avisa la llegada, profesor no pasa lista en curso o salón ajeno, alumno de otro salón rechazado, apoderado no pasa lista; **aviso de presentes**: `asistencia_llego` a cada apoderado con consentimiento; **cursos**: `obtenerLista` trae `ingreso`, falta a clase con ingreso («no estuvo en Matemática», payload con `curso`/`ingreso`), tardanza a clase, sin ingreso o con falta del día no hay aviso aparte (un solo «no llegó»), una llegada previa en un curso no impide el aviso de ingreso; **nivel**: apagado no ofrece cursos y `guardarLista` falla con el mensaje (también dirección), dirección lo activa (auditado, valida niveles, profesor no puede), apagarlo conserva registros; **dirección**: sin «Pasar lista» en el menú, corrige hoy (auditado, con aviso), corrige un día pasado sin aviso conservando la hora, profesor no abre otro día (403), nadie corrige un día futuro.
- unit: `tests/unit/resumen-avisos-lista.test.ts` (conteo del resumen previo del día y de un curso, `seAvisaCambio`), `tests/unit/plantillas-avisos.test.ts` (falta y tardanza a clase).
- e2e: `tests/e2e/asistencia-colegio-cursos.test.ts` (dirección no ve «Pasar lista», `/asistencia` la lleva a los reportes, reporte general del día, activa/desactiva la asistencia por curso en Configuración, abre una lista en modo «corregir»).
- e2e (`tests/e2e/pasar-lista-aviso-justificar.test.ts`): Lucía pasa lista en 3.° B → el resumen dice «Se avisará a N familias: … llegadas» → el correo «Mateo llegó al colegio» llega a Mailpit → luego la falta → correo de falta → enlace de justificar funciona una vez. `tests/e2e/paginas-basico-por-rol.test.ts` (Khipu Base): resumen del día, vista de familia, portería sin acceso.

## Reportes
- Porcentaje de asistencia por alumno, salón y fechas, con descarga en Excel y PDF: ver [spec 27](27-reportes-asistencia.md) (`/asistencia/reportes`).

## Pruebas de permisos
- unit `tests/unit/permisos-asistencia.test.ts` (cobertura por día y por horas, anulado, resumen con permiso, grado, CSV).
- integración `tests/integracion/permisos-salida-reportes.test.ts`: solo roles autorizados registran (tutor sí, otro profesor/portería/familia/otro colegio no), lectura del profesor, permiso de día completo sin «aún no llega» ni falta automática, falta con permiso sin NSP, permiso registrado después → NSP retirado con historial, anular (motivo, una sola vez) → NSP de vuelta, tardanza nunca NSP, permiso por horas.

## Pendientes
- (Hecho) Vista de la familia: botón «Escribir a la tutora» por hijo → `/mensajes/nuevo?alumno=<id>` (spec 08).
- (Resuelto) Reintentos acotados de la cola sin conexión: ver el párrafo de la cola.
