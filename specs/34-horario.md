# 34 — Horario

> Estado: implementado · Plan: Khipu Base y Khipu Pro · Última actualización: 2026-11-07 (rama `feat/agenda-unificada`: el horario vive dentro del módulo **Agenda**, en `/agenda/horario`; antes: 2026-11-03, `CalendarioSemana` usa la grilla compartida `GrillaTiempo`)

> **2026-11-07 — Horario dentro de la Agenda.** Ya no hay entradas «Mi horario», «Horario», «Horarios» ni «Plantillas de
> horario» en el menú: todo se entra por **Agenda** (grupo «Académico»), con pestañas por rol (`PestanasAgenda`,
> `src/components/agenda/PestanasAgenda.tsx`): Calendario (si el colegio tiene `agenda`, Khipu Pro) · Mi horario
> (profesor, alumno) / Horario (apoderado) / Horarios de salones + Carga de profesores (dirección) · Plantillas de horario
> (dirección y administrativo). En **Khipu Base** (sin `agenda`) la Agenda abre en la primera pestaña del horario y no muestra
> «Calendario». El mosaico «Agenda» usa `feature: "agenda"` con `alternativa: "horario"` (vale si cualquiera está activo).
> `/horario/…` redirige a `/agenda/horario/…` (enlaces viejos). Los roles del módulo `horario` se declaran en
> `USOS_FUERA_DE_NAVEGACION` (`src/lib/modulos.ts`). Las rutas de abajo llevan el prefijo `/agenda`.

## Objetivo
Que cada salón tenga su horario semanal (lunes a viernes) y que cada persona sepa qué clase tiene ahora y cuál sigue:
dirección lo arma sin poner a un profesor en dos salones a la vez; el profesor ve «Mi horario» en todos sus salones con
accesos a pasar lista, tareas y notas; el alumno y la familia ven el horario del salón con la clase de ahora.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Dirección | Crear, editar y eliminar plantillas de horario y asignarlas a los salones; retocar las «Horas del día» de una plantilla; llenar, cambiar y vaciar casilleros de cualquier salón; copiar el horario de otro salón del mismo grado; ver la carga y la semana de cada profesor | Poner a un profesor en dos lugares que se cruzan; programar clases en el recreo |
| Profesor | Ver «Mi horario» (sus cursos y los bloques a su cargo en todos sus salones) y el horario de los salones donde es tutor o dicta | Editar horarios u horas; ver la semana de otro profesor (pedirla devuelve la suya) |
| Apoderado | Ver el horario del salón de cada hijo (elige al hijo si tiene varios) | Ver salones que no son de sus hijos (403) |
| Alumno | Ver el horario de su salón («Mi horario») | Ver otros salones (403) |
| Administrativo (secretaría) | Crear, editar y eliminar plantillas de horario y asignarlas a los salones (`/horario/plantillas`) | Armar los casilleros del horario |
| Portería | — (el módulo no es para ella: 403) | — |

Plan: módulo `horario` en `FEATURES` con plan mínimo `base` (está en **Khipu Base y Khipu Pro**); la migración
`20261103090000_horario` lo agrega a `plan_modulos` de ambos planes. `requireFeature(ctx, "horario")` en la página, cada
action y cada función de `src/lib/server/horario.ts`.

## Flujos
0. **Plantillas de horario** (dirección y administrativo, `/horario/plantillas`): lista de plantillas (entrada, salida,
   recreos, horas de clase, hora de falta y salones que la usan) con «Nueva plantilla», «Editar» y «Eliminar» (solo si
   ningún salón la usa). El formulario pide nombre («Primaria mañana»), hora de entrada, hora de salida, duración de cada
   hora de clase (20–120 min), hora límite de falta (sugerida: entrada + 1 h) y los recreos (hasta 6, cada uno «desde» y
   «hasta»). Khipu calcula las horas de clase (`generarPeriodos`: llena con horas completas cada tramo entre la entrada,
   los recreos y la salida) y muestra la vista previa al lado (entrada, horas, recreos, salida) y avisa los minutos que
   quedan sin clase. Abajo, «Salones que la usan»: los marcados pasan a esta plantilla. Al guardar una plantilla
   existente, las horas se recalculan **en su lugar** (la 3.ª hora sigue siendo la 3.ª, con sus casilleros); las que
   sobran se vacían. Al pasar un salón a otra plantilla, sus casilleros van a la misma hora de clase (por posición) de la
   nueva; los que no tienen equivalente se vacían. Los mensajes dicen cuántos casilleros se vaciaron y si quedaron cruces.
1. **Horas del día** (dirección, `/horario`): cada salón muestra su plantilla («Plantilla «Primaria» (08:00–13:00)») y
   «Cambiar plantilla». Un salón sin plantilla muestra un estado vacío con «Elegir plantilla» (o, si el colegio aún no
   tiene ninguna, «Usar la plantilla sugerida de primaria», que crea la plantilla del nivel con `PERIODOS_SUGERIDOS`:
   inicial 08:00–11:50, primaria 08:00–13:00, secundaria y academia 08:00–13:35, y la asigna a los salones del nivel sin
   plantilla) y el enlace «Crear una plantilla nueva». El botón «Horas del día» abre un panel lateral (`Sheet`) para
   retocar a mano nombre, inicio, fin y tipo de cada hora de la plantilla; vale para todos los salones que la usan.
2. **Armar el horario**: elegir el salón → cuadrícula (columnas Lun–Vie, filas = horas del nivel; el recreo ocupa la
   fila entera) → tocar un casillero → diálogo: «Un curso del salón» (muestra su profesor) u «Otro bloque» (título con
   sugerencias «Tutoría», «Formación»…, «A cargo de» con el tutor elegido por defecto) y aula opcional → «Guardar»;
   «Vaciar casillero» si ya tenía algo.
3. **Copiar de otro salón** (si hay salones del mismo nivel y grado): reemplaza el horario del salón; los cursos se
   emparejan por nombre y quedan con su propio profesor; un bloque sin curso a cargo del tutor del origen pasa al tutor del
   destino. Se saltan los casilleros sin curso equivalente o que cruzarían a un profesor (el mensaje dice cuántos).
4. **Carga de profesores** (`/horario?vista=profesores`): por profesor, horas por semana, bloques, salones y cruces
   («Sin cruces» ✓ o «N cruces» ⚠). «Ver semana» abre `/horario?profesor=<id>` con su semana y los cruces marcados.
5. **Mi horario** (profesor): además de clases y reuniones, la **jornada** de las plantillas de sus salones: líneas
   punteadas de **entrada** y **salida** (la entrada más temprana y la salida más tarde; la hora en el margen y la
   palabra en la primera columna) y franjas de **recreo** en todos los días (las horas sin clase no se marcan). La
   leyenda suma «Entrada 08:00 · salida 13:00» y «Recreo». La cuadrícula va **siempre de 7:00 a 19:00, una fila por
   hora** (con línea punteada a la media hora); si una clase o reunión cae fuera, se amplía hasta su hora en punto. La semana en vista de calendario (estilo Google Calendar), en una sola tarjeta con barra
   superior (mes, «Semana del 2 al 6», «Próxima semana» si es fin de semana, y el resumen «Ahora: Matemática · 3.° B hasta
   las 10:30» / «Después: … a las 10:30»), leyenda de cursos con sus horas por semana al pie y las clases ya dictadas de
   la semana atenuadas. También muestra las **reuniones y los eventos de la agenda** de esa semana (misma visibilidad
   que la agenda, specs/32: las reuniones que el profesor convocó y los eventos de sus salones y del colegio; sin las
   entregas de tareas), con borde punteado, ícono y tipo («Reunión», «Examen», «Actividad», «Evento», «Feriado»);
   los feriados y eventos sin hora van en una fila «Todo el día». Al tocarlos, su detalle con «Ver la reunión» o «Ver en
   la agenda». Columnas de lunes a viernes con su fecha (la semana actual; el
   fin de semana, la siguiente), horas a la izquierda, cada bloque ubicado y medido según su hora, con el color de su
   curso (el mismo curso, el mismo color en todos los salones; «Tutoría» en gris) y una línea con la hora actual en el día
   de hoy, con la hora escrita en el margen. Los bloques que se cruzan se reparten el ancho. Al tocar un bloque se abre su detalle (salón, aula, duración,
   cruce) con «Pasar lista» (solo hoy, si el colegio tiene asistencia y asistencia por curso en ese nivel), «Tareas» y
   «Notas» del curso (si el plan los incluye).
6. **Horario** (familia) / **Mi horario** (alumno): píldoras por hijo si hay varios; franja «Ahora / Después» con fondo de sección y la
   cuadrícula del salón en solo lectura.
7. **Inicio**: tarjeta «Hoy» para profesor, alumno y familia con los bloques del día, el de ahora marcado y el enlace al
   horario. No se muestra a dirección, el fin de semana, si no hay clases hoy o si el módulo no está activo.
8. **Pasar lista** (`/asistencia`, profesor): con horario, dentro de cada salón las listas de curso de hoy van en orden de
   hora con «Hoy 08:00–08:45», la que está en clase lleva la insignia «Ahora», y los salones se ordenan por su primera
   clase de hoy. Sin horario, el orden alfabético de siempre.

## Reglas de negocio
- Días 1 (lunes) a 5 (viernes). Un casillero = (salón, día, hora): único. Es un curso **del mismo salón** (el profesor
  sale del curso: si dirección cambia el profesor del curso en Gestión, el horario lo sigue) o un bloque sin curso con
  título y profesor opcional (CHECK en BD: curso o título).
- **Sin cruces de profesor**: al asignar se buscan los bloques del profesor ese día en salones no archivados y se compara
  la **hora real** (inicio–fin), no la fila, porque cada nivel tiene sus propias horas. Tocarse en el borde
  (08:45 termina, 08:45 empieza) no es cruce. Reemplazar el mismo casillero no cuenta como cruce. Error:
  «Lucía García ya tiene Matemática en 3.° B el martes de 08:00–08:45. Elige otra hora u otro curso.»
- Cambiar el profesor de un curso o las horas del día puede dejar cruces (no se bloquea): «Guardar horas» lo avisa y la
  carga de profesores y «Mi horario» los marcan («Se cruza con otra clase»).
- Plantillas: nombre único en el colegio (sin distinguir mayúsculas); salida después de la entrada; falta después de la
  entrada; recreos dentro de la jornada y sin cruzarse; al menos una hora de clase. Su **entrada** es la hora de tardanza
  y su **hora límite de falta** la del control de ingreso de los salones que la usan (specs/05); los salones sin
  plantilla usan las horas de Configuración.
- Horas del día: por plantilla, formato HH:mm, inicio antes del fin, sin cruces entre sí, nombre obligatorio, máximo 16.
  Quitar una hora o volverla recreo vacía sus casilleros (el mensaje dice cuántos). En el recreo no se programan clases.
- «Ahora» y «Después» usan la hora del colegio (`Tenant.zonaHoraria`).
- Salones archivados: no salen en el selector ni en las semanas de los profesores.
- Auditoría (`auditar`): `plantillas_horario` (crear, editar, borrar, sugerida), `salones` (cambio de plantilla),
  `horario_periodos` (editar) y `horario` (editar / borrar casillero, copiar) con
  el salón como `entidadId`.

## Modelo de datos
- `PlantillaHorario` (`plantillas_horario`): `tenantId`, `nombre` (único por colegio), `horaEntrada`, `horaSalida`,
  `duracionClase` (min), `horaLimiteFalta`. `Salon.plantillaId?` (SetNull al borrar). Migración
  `20261107090000_plantillas_horario`: crea una plantilla por nivel que ya tenía horas («Inicial», «Primaria»,
  «Secundaria», «Academia»; entrada = primera hora, salida = última, falta = entrada + la distancia tardanza→falta de
  Configuración), pasa las horas a ella y se la asigna a los salones del nivel.
- `HorarioPeriodo` (`horario_periodos`): `tenantId`, `plantillaId`, `nombre`, `horaInicio`, `horaFin` (HH:mm), `tipo`
  (`TipoHoraHorario`: `clase` | `recreo`). Índice `(tenant_id, plantilla_id)`; se borra con su plantilla. Se ordena por
  hora de inicio.
- `BloqueHorario` (`bloques_horario`): `tenantId`, `salonId`, `dia` (CHECK 1–5), `periodoId`, `cursoId?`, `titulo?`,
  `profesorId?` (solo bloques sin curso), `aula?`. Único `(salon_id, dia, periodo_id)`; índices `(tenant_id, salon_id)`,
  `(tenant_id, curso_id)`, `(tenant_id, profesor_id)`, `(periodo_id)`. Borrado en cascada con el colegio, el salón, la
  hora y el curso; el profesor a cargo pasa a null si se borra su membresía.
- Ambas tablas tienen `tenantId`: entran solas en la exportación del colegio (`exportar.ts`) y se borran con el colegio.
  RLS cerrado para `anon`/`authenticated`.

## Contratos de `src/lib/server`
```ts
// src/lib/server/horario.ts — todas exigen requireFeature(ctx, "horario")
periodosDeLaPlantilla(ctx, plantillaId | null): Promise<PeriodoVista[]>
crearPlantillaSugerida(ctx, salonId): Promise<Resultado>          // dirección; si el salón no tiene plantilla
guardarPeriodos(ctx, plantillaId, lista): Promise<Resultado>      // dirección y administrativo; valida, reemplaza, avisa cruces
salonesParaHorario(ctx)                                            // dirección: todos; otros: los que ven
horarioDelSalon(ctx, salonId): { salon, periodos, bloques }        // 403 fuera de alcance; 404 si no existe/archivado
opcionesDeCasillero(ctx, salonId): { cursos, profesores, mismoGrado } // dirección
asignarBloque(ctx, { salonId, dia, periodoId, cursoId? | titulo?, profesorId?, aula? }): Promise<Resultado>
quitarBloque(ctx, { salonId, dia, periodoId }): Promise<Resultado>
copiarHorario(ctx, destinoId, origenId): Promise<Resultado>
horarioDelProfesor(ctx, profesorId?): { profesor, bloques, cruces, jornada } // profesor: siempre el suyo
agendaDeLaSemana(ctx, hoyIso): EventoSemana[]                      // reuniones y eventos de la semana

// src/lib/server/plantillas-horario.ts — dirección y administrativo
listarPlantillas(ctx) / detallePlantilla(ctx, id): PlantillaVista
salonesParaPlantillas(ctx)
guardarPlantilla(ctx, id | null, { nombre, horaEntrada, horaSalida, duracionClase, horaLimiteFalta, recreos, salonIds })
asignarPlantilla(ctx, salonId, plantillaId)                        // mueve casilleros por posición
eliminarPlantilla(ctx, id)                                         // solo si ningún salón la usa
cargaDocente(ctx): { id, nombre, bloques, minutosSemana, salones, cruces }[] // dirección
alumnosParaHorario(ctx)                                            // apoderado: hijos activos; alumno: él
horarioDeHoy(ctx, ahora?): { hora, grupos: GrupoHoy[] } | null    // tarjeta «Hoy»
cursosDeHoy(ctx, ahora?): Map<cursoId, { horaInicio, horaFin, ahora }> // orden de las listas de curso
```
Puros en `src/lib/plantillas-horario.ts`: `generarPeriodos`, `validarPlantilla`, `faltaSugerida`, `horasDeIngreso`
(tardanza y falta de un salón: su plantilla o Configuración). En `src/lib/horario-calendario.ts`: `jornadaDe`,
`horasVisibles` (7:00–19:00). Puros en `src/lib/horario.ts`: `seSolapan`, `buscarCruce`, `crucesDe`, `mensajeCruce`, `ahoraYDespues`, `validarPeriodos`,
`PERIODOS_SUGERIDOS`, `diaDeSemana`, `diaPorDefecto`.

## Rutas y UI
- `/horario/plantillas`, `/horario/plantillas/nueva`, `/horario/plantillas/<id>` (dirección y administrativo;
  `FormPlantilla` con vista previa). Dirección y administrativo entran desde la pestaña «Plantillas de horario» de la Agenda.
- `/horario` (dirección): selector de salón + cuadrícula editable (`TablaHorario` + `DialogoCasillero`), «Cambiar
  plantilla» (`DialogoAccion`), «Horas del día» (`EditorHoras`, `Sheet`), «Copiar de otro salón» (`DialogoAccion`), «Carga de profesores» (pestañas de la Agenda: «Horarios de salones» y «Carga de profesores»).
- `/horario?vista=profesores`, `/horario?profesor=<id>` (dirección).
- `/horario` (profesor, pestaña «Mi horario» de la Agenda): `AhoraDespues` + `CalendarioSemana` (lógica pura en `src/lib/horario-calendario.ts`; reuniones y eventos con `agendaDeLaSemana` en `src/lib/server/horario.ts`). `CalendarioSemana` conserva sus props, su barra (mes, semana, «Ahora / Después») y su leyenda, y dibuja la cuadrícula con `GrillaTiempo` (`src/components/calendario/GrillaTiempo.tsx`), la misma de la agenda (specs/12): convierte bloques y eventos a `ItemCalendario` (`itemsDeLaSemana`) con la fecha de cada día; mismos colores por curso, carriles, fila «Todo el día», jornada (entrada, salida, recreos), línea de ahora y popovers. `agendaDeLaSemana` descarta las clases de la agenda (`tipo: "clase"`) porque «Mi horario» ya dibuja los bloques.
- `/horario?alumno=<id>` (familia, pestaña «Horario»; alumno, pestaña «Mi horario»): `AhoraDespues` + `TablaHorario`.
- Inicio: `TarjetaHoy` (`inicio/TarjetaHoy.tsx`).
- Responsive: desde `md` la cuadrícula es una tabla (`caption`, `th scope`); en el celular, pestañas Lun–Vie (Base UI
  `Tabs`, teclado con flechas) con hoy elegido. La semana del profesor es una cuadrícula de 5 días desde `lg`; en
  pantallas chicas, pestañas con día y fecha (hoy en círculo) y la cuadrícula de un día. Hoy: insignia «Hoy»
  (ícono + palabra); bloque en curso: insignia «Ahora» y borde. Foco visible global; animaciones con `motion-reduce`.

## Textos y UX
- Vacíos: «Primero define las horas del día de primaria», «Aún no tienes clases en el horario», «El horario aún no está
  listo» («Cuando el colegio lo publique, lo verás aquí.»).
- Éxitos: «Guardamos el horario.», «Vaciamos el casillero.», «Guardamos las horas del día.», «Copiamos N casilleros de 3.° A.».
- Ahora/después: «Ahora: Matemática · 3.° B hasta las 10:30», «Después: Ciencia a las 10:45», «Terminaron las clases de
  hoy.», «Hoy no hay clases en el horario.».

## Errores y casos borde
- Profesor ocupado → mensaje con el otro salón, día y horas. Recreo → «En el recreo no se programan clases.». Hora de otro
  nivel → «Esa hora no es del nivel de este salón.». Curso de otro salón → «Ese curso no es de este salón.».
- Horas cruzadas → ««1.ª hora» (08:00–08:45) y «2.ª hora» (08:30–09:15) se cruzan.».
- Copiar entre grados distintos → «Solo se copia entre salones del mismo grado.».
- Otro colegio: los ids ajenos no se encuentran (`ctx.db` filtra por colegio).

## Seed
`prisma/seed-horario.ts` (`sembrarHorario(prisma, { tenantIds? })`, llamado en la última línea de `prisma/seed.ts`):
para cada colegio crea una plantilla por nivel con las horas sugeridas (entrada 08:00, falta 09:00), se la asigna a los
salones sin plantilla y arma el horario de cada salón que aún no tiene,
de forma determinista (`planificarHorario`): «Tutoría» con el tutor (viernes, la última hora libre), y el resto rotando
los cursos del salón (máximo 2 horas del mismo curso por día) sin cruzar nunca a un profesor (compara horas reales,
también entre niveles). Si ningún curso cabe, el casillero queda vacío. Idempotente.

## Pruebas
- unit: `tests/unit/horario-calendario.test.ts` (horas visibles, carriles de bloques cruzados, color por curso, semana
  mostrada, reuniones y eventos en la semana, rango 7:00–19:00); `tests/unit/horario.test.ts` (cruces y bordes, distintas horas por nivel, reemplazo del mismo casillero, pares de
  cruces, ahora/después y recreo, días, horas sugeridas válidas, validación de horas, `planificarHorario` determinista y
  sin cruces).
- unit: `tests/unit/plantillas-horario.test.ts` (horas calculadas con dos recreos y minutos sobrantes, validación, horas de
  ingreso por salón); `horario-calendario.test.ts` también cubre la jornada.
- integración: `tests/integracion/plantillas-horario.test.ts` (secretaría crea y asigna, nombre repetido, falta antes de la
  entrada, permisos, editar conserva casilleros y vacía los que sobran, mover un salón de plantilla, eliminar solo sin
  salones, tardanza en portería por plantilla, control de ingreso por grupo de horas).
- integración: `tests/integracion/horario.test.ts` (módulo en Base y Pro, plantilla sugerida una vez, validación, quitar una
  hora vacía casilleros y audita, asignar/reemplazar/vaciar, recreo/otro nivel/otro salón/día inválido, cruce entre salones
  con mensaje, carga docente, copiar por nombre, permisos por rol, aislamiento entre colegios, «Hoy» y orden de listas,
  seed sin cruces e idempotente).
- e2e: `tests/e2e/plantillas-horario.test.ts` (secretaría crea una plantilla con dos recreos, ve la vista previa y la
  elimina).
- e2e: `tests/e2e/horario.test.ts` (dirección asigna un bloque en 3.° B, Lucía lo ve en «Mi horario», Rosa en el horario
  de Mateo sin botones de edición; en 375 px pestañas por día con hoy elegido).

## Pendientes
- Sábados u horarios por quincena/semestre (hoy una sola semana tipo, lunes a viernes).
- Imprimir o exportar el horario (PDF) y agregarlo al calendario (.ics).
- Avisar al profesor cuando cambia su horario.
