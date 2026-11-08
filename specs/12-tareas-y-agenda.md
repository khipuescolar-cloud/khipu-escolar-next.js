# 12 — Tareas y agenda

> Estado: implementado · Plan: Khipu Pro · Última actualización: 2026-11-03 (rama `pro-calendario`: calendario institucional con vistas Día/Semana/Mes/Lista, clases del profesor y filtros; antes: `pre-notificaciones`, bandeja general y canales, specs/38)

> **2026-11-03:** las tareas pasan a ser estilo Classroom (secciones, destinatarios, entregas, revisión, calificación).
> Lo de tareas de esta spec queda como historia; la regla vigente está en **specs/39-tareas.md**. La agenda muestra las
> entregas con `tareasVisiblesParaAgenda` (solo tareas publicadas y visibles con asignación; sin fecha → no aparece).

## Objetivo
Que los profesores publiquen tareas por curso y eventos por salón, que dirección publique eventos del colegio y que las familias vean todo ordenado por fecha, sin llamadas ni grupos de mensajería.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Profesor | Crear/borrar tareas de sus cursos; crear eventos de sus salones y borrar los que creó; ver tareas y agenda de sus salones | Crear eventos de otros salones o del colegio |
| Dirección | Ver todas las tareas y borrarlas; crear eventos del colegio o de cualquier salón; borrar eventos | Crear tareas (son del profesor) |
| Administrativo | Crear eventos de **todo el colegio** y editar o borrar los que creó; ver la agenda del colegio | Crear eventos de un salón («El personal administrativo crea eventos de todo el colegio.»); ver o crear tareas |
| Apoderado | Ver tareas de sus hijos y la agenda de sus salones y del colegio | Crear o borrar |
| Alumno (cuenta propia) | Ver sus tareas y la agenda de su salón y del colegio (con las entregas de sus tareas) | Crear, editar o borrar |
| Colegio con Khipu Base | — | 403 en `/tareas` y `/agenda` |

## Flujos
1. Profesor → `/tareas`: formulario (curso, fecha de entrega, título, descripción opcional, casilla **«Avisar a las familias»**, desmarcada por defecto) y lista de sus tareas (próximas y de la última semana) con «Eliminar».
2. Apoderado → `/tareas`: por hijo, tareas pendientes en «Para mañana», «Esta semana» y «Más adelante».
3. `/agenda`: calendario institucional (ver «Calendario») con vistas Día, Semana, Mes y Lista, filtros por tipo y por salón, y formulario «Nuevo evento» (dirección, profesor y administrativo). Las tareas aparecen como «Entrega de tarea».

## Reglas de negocio
- Todas las fechas se calculan en **America/Lima** (`src/lib/fechas.ts`). La tarea vence a las 8:00 a. m. del día elegido; el evento sin hora se guarda a las 8:00.
- Agrupación: hoy y mañana → «Para mañana»; de 2 a 7 días → «Esta semana»; más → «Más adelante». Las vencidas no aparecen a las familias; el profesor las ve hasta 7 días después.
- No se crean tareas con fecha pasada.
- **Aviso a familias** (solo si se marcó la casilla): `avisarTareaNueva()` (`notificaciones/avisos-tareas.ts`) crea una notificación en la **bandeja** (`/notificaciones`, tipo `tarea`, clave `tarea:<id>`) por familia de los alumnos activos del salón del curso y por cada alumno con cuenta propia, y encola el **push** `tarea_nueva` (tipo `tarea`, `referenciaId = tareaId`) a los dispositivos de las familias con consentimiento vigente y push activado. **Sin correo** desde 2026-11-03 (specs/38). Una notificación por familia aunque tenga varios hijos en el salón (`alumno` = «Mateo» o «Mateo y Ana»). En lote: alumnos, vínculos (consentimiento, preferencias y dispositivos) y cuentas en un número fijo de consultas, `createMany`. Idempotente: un reintento no duplica la notificación ni el push. La action procesa la cola con `after()`. Se audita `enviar · tarea`.
- Alcance de eventos: sin salón = todo el colegio (lo ven todos); con salón = solo ese salón (profesores del salón, familias de sus alumnos, dirección).

## Modelo de datos
`tareas` (curso, título, descripción, `fecha_entrega`, creado por) y `eventos_agenda` (salón opcional, título, descripción, tipo, inicio, creado por). Sin cambios de esquema.

## Contratos de `src/lib/server`
```ts
// tareas.ts — requireFeature(ctx, "tareas")
crearTarea(ctx, { cursoId, titulo, descripcion?, fechaEntrega: "AAAA-MM-DD", avisarFamilias? }): Resultado   // profesor + requireCursoDelProfesor
// notificaciones/avisos-tareas.ts
avisarTareaNueva(ctx, tareaId, entrada): number /* familias */   // no hace nada si entrada.avisarFamilias no es true/"on"
eliminarTarea(ctx, tareaId): Resultado
cursosParaTareas(ctx); tareasDelDocente(ctx)
tareasDeFamilia(ctx, ahora?)  // [{ alumno, grupos: { manana, semana, despues } }]
// agenda.ts — requireFeature(ctx, "agenda")
itemsDeAgenda(ctx, desde, hasta): ItemAgenda[]   // forma posicional (el .ics y «Mi horario»): sin clases, filtro «todo»
itemsDeAgenda(ctx, { desde, hasta, filtros?: { filtro?, salonId? }, incluirClases? }): ItemAgenda[]
// ItemAgenda: tipo (evento|reunion|examen|feriado|actividad|entrega|clase), categoria (clase|mi-reunion|personal|academico|institucional|salon), salonId, estado?
salonesParaFiltro(ctx)   // salones visibles y no archivados para «Curso o sección»
salonesParaEventos(ctx)
crearEvento(ctx, { titulo, descripcion?, tipo, fecha, hora?, salonId? }): Resultado
eliminarEvento(ctx, eventoId): Resultado
```

## Rutas y UI
- `/tareas` (profesor, dirección, apoderado) · `/agenda` (los mismos). Acciones en `tareas/actions.ts` y `agenda/actions.ts`.
- **2026-11-07:** la Agenda es el módulo único de calendario y horario. Arriba, `PestanasAgenda` (Calendario + las
  pestañas del horario de specs/34 según el rol). El horario vive en `/agenda/horario` (y `/agenda/horario/plantillas`).
  Colegio sin `agenda` (Khipu Base) pero con `horario`: el menú muestra «Agenda» sin candado y `/agenda` redirige al
  horario; el calendario sigue siendo de Khipu Pro.

## Textos y UX

- **Diseño (spec 18):** «Nueva tarea» y «Nuevo evento» están en el encabezado y abren un `Dialog`; editar tarea/evento también es un `Dialog` (en la vista Lista); eliminar pide confirmación (`BotonConfirmar`, botón «Eliminar tarea»/«Eliminar evento»). Tareas como tarjetas con insignia de fecha (ícono + palabra); agenda como calendario (ver «Calendario»).
- Tipos con ícono + palabra: Clase, Reunión, Evaluación, Entrega de tarea, Evento, Examen, Feriado, Actividad (estilos en `src/components/calendario/estilos.ts`).
- Familias: «Lo que tus hijos tienen que entregar.» / «No tiene tareas pendientes.»
- Casilla: «Avisar a las familias» · «Las familias la ven en sus notificaciones de Khipu y en el celular (sin correo).»
- Aviso: asunto «Nueva tarea de Matemática» · «Mateo tiene una tarea nueva de Matemática: «Fichas de fracciones».» · «Se entrega el 30/10/2026.» + **Ver tareas**.

## Reuniones en la agenda
`itemsDeAgenda` también devuelve las reuniones visibles para el usuario (módulo `reuniones`, `specs/32`) como ítems `tipo: "reunion"`; no son `EventoAgenda`. El `.ics` las incluye. La consulta vive en una sola función local (`reunionesDeAgenda`), para cambiarla luego por `reunionesParaCalendario` de `reuniones.ts`.
- **Mis reuniones** (`categoria: "mi-reunion"`): las que el usuario convocó **o donde está invitado** (`reunion_invitados`); la familia, solo donde la invitan. Un profesor invitado ahora las ve en la agenda (antes solo las que convocaba).
- **Reuniones del personal** (`categoria: "personal"`, filtro solo para dirección y administrativo): todas las del colegio. El administrativo ve las individuales ajenas como «Reunión individual», sin título, descripción ni enlace.
- En «Todo», dirección ve todas (como antes); el resto, solo las suyas. Las canceladas no se muestran; otros estados se muestran tal cual (`estado` en el ítem; si llegara «cancelada» se dibuja tachada).
- Enlace a `/reuniones/<id>` solo si esa página se la mostrará: dirección, quien convocó y la familia invitada (un profesor invitado no tiene enlace).

## Calendario (plan Pro)
- **Estado en la URL:** `/agenda?vista=dia|semana|mes|lista&fecha=AAAA-MM-DD&filtro=todo|mis-reuniones|personal|academico|institucional&salon=<uuid>`. Valores inválidos vuelven al defecto (semana, hoy en la zona del colegio, todo, sin salón). Lógica pura en `src/lib/agenda-calendario.ts` (`leerEstadoAgenda`, `urlAgenda`, `rangoDeVista`).
- **Vistas:** Día y Semana usan la grilla de tiempo compartida (`src/components/calendario/GrillaTiempo.tsx`, la misma de «Mi horario», specs/34): escala por minuto, carriles para los cruces, fila «Todo el día» (feriados, evaluaciones, entregas y eventos sin hora), línea de la hora actual y detalle en un popover (con adjuntos y «Editar o eliminar», que lleva a la Lista de ese día). La semana muestra sábado y domingo solo si tienen algo. En el celular la semana se ve un día a la vez con pestañas. **Mes:** cuadrícula lunes–domingo (`cuadriculaMes`) con hasta 3 ítems por día y «N más» (en el celular, puntos); tocar el día abre la vista Día. **Lista:** próximos 30 días desde la fecha, agrupados por día, con editar/eliminar evento. Navegación anterior/hoy/siguiente según la vista («Semana siguiente», «Mes siguiente»…).
- **Filtros:** Todo · Mis reuniones · Reuniones del personal (dirección y administrativo) · Eventos académicos (evaluaciones y entregas de tareas) · Actividades institucionales (EventoAgenda sin salón) · y aparte **Curso o sección** (selector con los salones de `salonIdsVisibles`; un salón ajeno no devuelve nada; con salón solo se ve lo de ese salón). Los EventoAgenda de un salón salen en «Todo» y con su salón.
- **Clases del profesor y del alumno** (`incluirClases`, roles profesor y alumno con el módulo `horario`, filtro «Todo» o por salón): cada bloque de su horario (profesor: `wherePorProfesor`; alumno: los bloques de su salón, con el nombre del profesor como ámbito) se proyecta a cada fecha del rango que cae en su día de la semana (`proyectarClases`), con sus horas «HH:mm» llevadas a instantes en `tenant.zonaHoraria`. Sin clases en feriados nacionales (`feriadosNacionales`), en los extra de la plataforma (`feriadosAplicables`: país, región o colegio) ni en días con un EventoAgenda «Feriado» de todo el colegio. Id de la clase: `<bloqueId>:<fecha>`. Rango máximo con clases: **42 días** (una cuadrícula de mes); más, error. La familia no ve clases en la agenda (el horario de cada hijo está en «Mi horario»).
- **Rendimiento:** una consulta por fuente (eventos, entregas, reuniones, evaluaciones, bloques; feriados de plataforma con caché), solo las fuentes que pide el filtro. La página es componente de servidor; solo la grilla (popover, pestañas, hora que avanza) es cliente.
- **Entregas de tareas:** la consulta vive en una sola función local (`entregasDeTareas`) y descarta las tareas sin fecha de entrega, para integrar `tareasVisiblesParaAgenda` de `tareas.ts`.
- **Accesibilidad:** vistas y filtros son enlaces con `aria-current`; cada columna del día es una `section` con su nombre y fecha; cada ítem es un botón con «Tipo: título, horario»; tipos con ícono + palabra (Clase, Reunión, Evaluación, Entrega de tarea, Evento, Actividad, Feriado, Examen) y leyenda bajo el calendario.

## Exportación .ics
`GET /api/agenda.ics` (sesión + `requireFeature(ctx, "agenda")`, `no-store`): calendario iCalendar (RFC 5545) con los eventos y las fechas de entrega visibles para el usuario (apoderado: salones de sus hijos; profesor: sus salones; dirección: todos), de hace 30 días a 1 año. Constructor puro en `src/lib/ics.ts`: CRLF, plegado a 75 octetos, escape de `\ ; ,` y saltos de línea, `DTSTAMP`, `UID` = `<id>@khipuescolar`. Eventos con hora en UTC (1 h de duración); entregas de tarea como evento de día completo (día de Lima). Enlace «Descargar calendario (.ics)» en `/agenda`. Es una descarga puntual, no una suscripción.

## Adjuntos
- Hasta 5 por tarea, 10 MB cada uno (PDF, JPG, PNG, WEBP, DOCX, XLSX), privados en `FileStorage` con `archivos.tarea_id` (módulo `adjuntos.ts`, spec 14). El formulario de crear y de editar tienen el selector de archivos (`CamposAdjuntos`); al editar se pueden quitar y agregar. Un adjunto inválido devuelve el error de formulario y no crea la tarea.
- `/tareas` los lista con `ListaAdjuntos` (ícono por tipo, nombre, tamaño, descarga) para el profesor, dirección y las familias. Descarga por `/archivos/<id>`: dirección, quien creó la tarea, profesores del salón y apoderados de ese salón; otros salones, 403. Al eliminar la tarea se borran los archivos (de la BD en cascada y luego del proveedor).
- `/agenda` muestra, bajo cada «Entrega de tarea», sus adjuntos con el mismo `ListaAdjuntos`. `itemsDeAgenda` solo los incluye si `puedeVerTarea` (la misma regla que `/archivos/<id>`): el personal administrativo ve la entrega pero no sus adjuntos, porque no podría descargarlos.

## Errores y casos borde
- Editar: el profesor edita título, descripción y fecha de sus tareas (`actualizarTarea`, mismas reglas que borrar; la fecha solo se valida si cambia) y los eventos que creó (`actualizarEvento`, no cambia el salón); dirección edita cualquier evento y solo consulta tareas. Queda auditado (`editar · tarea` / `editar · evento_agenda`). En la UI, un desplegable «Editar tarea» / «Editar evento».
- «La fecha de entrega ya pasó.» · «Solo puedes crear eventos de tus salones.» · «Elige el salón del evento.» (profesor sin salón).
- Hijos en varios salones: cada hijo tiene su propia tarjeta de tareas.

## Pruebas
- unit: `tests/unit/fechas.test.ts` (zona Lima, agrupación, semanas y cuadrícula del mes).
- unit: `tests/unit/ics.test.ts` (escape, plegado a 75 octetos, CRLF, fechas).
- unit: `tests/unit/agenda-calendario.test.ts` (proyección de clases: zona horaria, día de la semana, feriados, borde de mes; vistas y URL; conversión a ítems; celdas del mes).
- integración: `tests/integracion/agenda-calendario.test.ts` (profesor ve sus clases y sus reuniones convocadas e invitado; filtros por tipo y salón; «Personal» de dirección y administrativo sin detalle de individuales ajenas; familia solo lo de su hijo; otro colegio nada; feriado sin clases; rango máximo).
- integración: `tests/integracion/notas-libreta-tareas-agenda.test.ts` (tareas por curso y agrupación, alcance de eventos por salón, permisos de creación, Khipu Base → 403); `tests/integracion/avisos-pendientes.test.ts` (aviso de tarea solo con la casilla y solo a familias con consentimiento); `tests/integracion/extras-edicion-ics-zip.test.ts` (editar tarea/evento: permisos, auditoría, aislamiento entre colegios; alcance de la agenda por rol).
- integración: `tests/integracion/adjuntos-comunicados-tareas.test.ts` (adjuntos de tareas: acceso y borrado).
- e2e: `tests/e2e/agenda-calendario.test.ts` (cambiar de vista, navegar, filtrar por tipo y salón; filtro del personal por rol).
- e2e: `tests/e2e/tareas-agenda.test.ts` (profesora crea tarea con «Avisar a las familias», la familia la recibe en su bandeja (el e2e anterior buscaba el correo en Mailpit: revisar, pendiente) y la ve en «Para mañana»; agenda; periodos de dirección; edita su tarea y descarga el .ics).

## Pendientes
- Integrar `reunionesParaCalendario` / `ocupacionPropia` (agente de reuniones) en `reunionesDeAgenda` y `tareasVisiblesParaAgenda` (agente de tareas) en `entregasDeTareas`; el tipo `bloqueo` de `ItemCalendario` queda listo para la ocupación propia.
- Familia y alumno: mostrar en la agenda el horario del salón del hijo (opcional).
- Vista por defecto según el dispositivo (hoy: Semana; en el celular la semana ya se ve día a día con pestañas).
- (Resuelto) Adjuntos en la agenda: ver «Adjuntos».


## Diseño visual de la agenda (fase 2)
- La agenda pertenece a la sección Académico (`seccion="academico"`). El selector de vista activa y el día de hoy usan los tokens de sección (`sec-suave`, `sec-tinta`).
- Color por tipo de ítem (ícono + palabra, `components/calendario/estilos.ts`): clase = Día a día (turquesa), reunión = Comunicación (cochinilla), evaluación y entrega = Académico (ocre), eventos del colegio = índigo.
- Vistas Mes y Lista sin tarjetas internas: celdas y filas con divisores. `loading.tsx` imita el calendario.
