# 40 — Disponibilidad del personal y reuniones institucionales

> Estado: implementado (backend completo; UI del asistente, invitaciones, solicitudes, disponibilidad y acuerdos) · Plan: Khipu Pro (módulo `reuniones`) · Última actualización: 2026-11-04 (Claude Code: paso «Horario» del asistente como calendario)

Amplía `specs/32-reuniones.md` (que sigue vigente para recordatorio, asistencia y acta).

## Objetivo
Programar reuniones institucionales como el asistente de programación de Microsoft Teams: ver la disponibilidad del
personal (clases, reuniones, bloqueos, ausencias, horas laborales y días no lectivos), elegir una franja libre común y
confirmarla sin choques aunque dos personas confirmen a la vez. Las familias son invitadas o solicitan reuniones.

## Roles y permisos
| Rol | Convoca (matriz `TIPOS_POR_ROL`, `src/lib/reuniones.ts`) | Ve | Disponibilidad |
|---|---|---|---|
| Dirección | Cualquier tipo; familias de todo el colegio, un salón o un alumno | Todas las reuniones | Consulta a todo el personal; ve «Clase» de terceros; puede **forzar sobre una clase** con motivo; registra ausencias |
| Administrativo | `administrativa`, `institucional` | Las que organiza, convocó o donde está invitado | Igual que dirección (ve «Clase», fuerza sobre clase, registra ausencias) |
| Profesor | `docente_apoderado` (familias de sus alumnos o salones), `tutoria` (solo como tutor del salón), `coordinacion` (solo personal) | Las que organiza, convocó o donde está invitado | Consulta personal; de terceros solo «Ocupado» |
| Apoderado | Solo **solicita** (`/reuniones/solicitar`) | Donde está invitado (incluye sus solicitudes) | Nunca consulta ocupación del personal; solo ve franjas ofrecidas |
| Portería, alumno | — (403) | — | — |
| Colegio Khipu Base | 403 (`requireFeature("reuniones")`) | | |

Tipos (`TipoReunion`): `docente_apoderado`, `tutoria`, `coordinacion`, `direccion`, `administrativa`, `institucional`.
Familias: obligatorias en `docente_apoderado`/`tutoria`, prohibidas en `coordinacion`, opcionales en el resto.
Familias de alumnos elegidos: `alcance: "individual"` con `alumnoIds[]` (máx. 30; `alumnoId` sigue valiendo para uno). Cada alumno debe estar activo, ser del colegio y visible para quien convoca (profesor: sus alumnos; tutoría de profesor: todos del salón que tutora); si uno falla, se rechaza todo («Solo puedes convocar a familias de tus alumnos.» / «No encontramos a uno de los alumnos elegidos.»). Se invita a cada apoderado activo de cada alumno: una fila por (apoderado, alumno) —la única `(reunión, membresía, alumno)` se respeta— y **un solo aviso por apoderado** (`notificarReunion` agrupa por membresía y nombra a sus hijos). La reunión queda en el salón si todos son del mismo; si no, sin salón.

## Flujos
1. **Asistente** (`/reuniones/nueva`, personal), 3 pasos con **progreso** (`ProgresoPasos`: círculos numerados unidos por una línea, check en los hechos, el actual destacado con `aria-current="step"` y «Paso 2 de 3»; en el celular, barra de segmentos con el nombre del paso actual). Las acciones (Volver / Siguiente / «Usar … y seguir» / «Confirmar reunión») van en una **barra superior fija** junto al progreso (sticky bajo la barra del panel); no hay botones abajo. (1) tipo y participantes (buscador de personal requerido u opcional; familias: **familias de alumnos elegidos** (buscador de alumnos por nombre o salón, mín. 2 letras, solo los que puede convocar, chips con quitar y contador, máx. 30), las de un salón o todo el colegio); (2) **Horario** (`PasoHorario`), al estilo del calendario + asistente de programación de Teams con la identidad de Khipu: arriba, en una fila, duración (15/30/45/60/90 u «Otra» con minutos 5–240), Fecha y Hora de inicio (al minuto, p. ej. 11:38); el calendario ocupa todo el ancho; ver «Paso Horario» abajo; (3) detalles: título, motivo, modalidad (presencial/virtual/mixta), lugar o enlace externo (sin videollamadas propias), observaciones, casilla «Programar igual fuera de la jornada…» si aplica y motivo para forzar una clase; confirmar. Si al confirmar la franja se ocupó, vuelve al paso Horario (recalculado) con el aviso.
2. **Confirmar** (`convocarReunion`): el backend **revalida siempre** (ver Reglas). Si la franja se ocupó: «Esa franja se acaba de ocupar. Elige otra.» con alternativas nuevas.
3. **Invitaciones**: cada invitado (personal o familia) acepta / rechaza / propone otra hora (con nota) hasta el inicio. El organizador ve las respuestas (bandeja + push, sin correo).
4. **Reprogramar** (`reprogramarReunion`): revalida, desactiva las reservas viejas, crea nuevas, guarda `reprogramada_at`, deja todas las respuestas en «pendiente» y avisa (correo).
5. **Cancelar** con motivo (`cancelarReunion(ctx, id, { motivo })`): desactiva reservas, guarda `cancelada_por/at/motivo_cancelacion`, avisa (correo). Sobre una solicitud «por confirmar» = **rechazar** (aviso sin correo a la familia).
6. **Solicitud de familia** (`/reuniones/solicitar`, ajuste del colegio «Las familias pueden solicitar reuniones», activado por defecto): elige hijo (solo los suyos), docente permitido (tutor y profesores con curso en el salón del hijo) y franja. Si el docente configuró horario de atención, solo puede elegir franjas ofrecidas (= horario de atención ∩ libre, 30 min, 14 días); si no, propone fecha y hora. Queda `por_confirmar`, sin reservas. Antiabuso: máx. 2 abiertas por familia y docente, 5 por semana por familia. El docente confirma (misma u otra hora: `reprogramarReunion`, revalida y reserva) o rechaza (`cancelarReunion`).
7. **Mi disponibilidad** (`/reuniones/disponibilidad`, personal): horario de atención a familias (día, desde, hasta), bloqueos propios (motivo privado); dirección y administrativo registran ausencias de cualquiera del personal.
8. **Actas y acuerdos**: asistencia (`asistio`), acta y estado realizada como en specs/32; además **acuerdos** con responsable (organizador o participante), fecha de compromiso y seguimiento (marcar cumplido / reabrir; quien gestiona o el responsable). `/reuniones/acuerdos`: acuerdos pendientes (dirección todos; el resto, los suyos o de reuniones que organiza).

## Reglas de negocio
- **Disponibilidad** (`src/lib/disponibilidad.ts`, puro; `src/lib/server/disponibilidad.ts`): rangos en ms semiabiertos `[inicio, fin)` (tocarse no es cruce). Fuentes por membresía en un rango de máx. **14 días**: clases proyectadas por fecha desde `BloqueHorario` (`wherePorProfesor`, día de semana → `HorarioPeriodo` HH:mm → instante en `tenant.zonaHoraria`), reservas activas, bloqueos y ausencias, fuera de horas laborales (`tenants.hora_inicio_laboral`/`hora_fin_laboral`, 07:30–16:30 por defecto) y días no lectivos (fines de semana, feriados nacionales, `feriadosAplicables` y `EventoAgenda tipo=feriado` sin salón). Algoritmo: ventana laboral (igual para todo el personal) − ocupado fusionado = libre; coincidencias = intersección de requeridos (quien organiza siempre es requerido); franjas de la duración pedida con paso de 15 min; alternativas = 5 franjas más cercanas a la preferida (desempate: más opcionales libres), nunca en el pasado. Cuadrícula del día: celdas de 30 min de 07:00 a 18:00 (o más si la jornada lo exige) con `libre | ocupado | fuera_de_horario | no_lectivo`.
- **Privacidad**: de terceros solo «Ocupado» («Clase» únicamente para dirección y administrativo); nunca el título ni el motivo de reuniones, bloqueos o ausencias ajenas. La propia agenda se ve con detalle. Las franjas ofrecidas a familias no revelan qué ocupa al docente.
- **Confirmar / reprogramar / confirmar solicitud**: `ctx.db.$transaction` interactiva (maxWait 10 s, timeout 20 s): `pg_advisory_xact_lock(hashtextextended(tenant||':'||membership, 0))` por cada persona del personal **en orden de id**; relee clases, reservas, bloqueos y no lectivos dentro de la transacción; inserta reunión + invitados + reservas + `ReunionCambio`. Requerido con reunión, bloqueo o ausencia → «Esa franja se acaba de ocupar. Elige otra.»; con clase → error, salvo dirección/administrativo con `forzarClase` y `motivoForzar` (queda en `reunion_cambios.motivo` y `despues.clasesForzadas`; nunca se fuerza sobre otra reunión). Fuera de horario o día no lectivo exige `fueraDeHorario: true` (casilla en el asistente). Opcionales ocupados quedan invitados sin reserva. Última barrera: restricción de exclusión `reservas_agenda_sin_solape`; el error `23P01` se traduce al mismo mensaje con alternativas.
- Reuniones nuevas: sin fila de invitado para quien organiza (organiza = `organizador_id`, con reserva). Personal invitado: filas con `alumno_id = null` y `rol` requerido/opcional. Familias: como specs/32 (`generarInvitados`).
- Visibilidad (`dondeVisible`): dirección todas; personal las que organiza, convocó o donde está invitado; familia donde está invitada. Gestiona (`dondeGestiona`): dirección o quien organiza.
- Respuestas: `asistire` = **Aceptada**, `no_asistire` = **Rechazada**, `propone_otra` = **Propone otra hora** (`propuesta_inicio/fin`). Estado `programada` = **Confirmada**; `por_confirmar` = solicitud.
- Todas las horas nuevas usan `tenant.zonaHoraria` (`instanteEnZona`, `momentoEnZona`).

## Avisos (specs/06 y 38)
`notificarReunion` (`notificaciones/avisos-reuniones.ts`) usa `entregarNotificaciones` con `TipoNotificacion.reunion` y `TipoAviso.reunion` → bandeja + push + **correo** solo en: invitación (`reunion_convocada`, asunto «Khipu — Invitación a reunión»; también al confirmar una solicitud), reprogramación (`reunion_reprogramada`), cancelación (`reunion_cancelada`) y solicitud de familia al docente (`reunion_solicitada`). Contenido: colegio, título, fecha y hora en la zona del colegio, duración, organizador, modalidad, lugar/enlace, botón a Khipu. Familias: canales solo con consentimiento vigente y según preferencias; personal: según sus preferencias. Nunca a quien hace la acción. Claves idempotentes: `reunion:<id>:invitacion`, `reunion:<id>:reprogramada:<ms>`, `reunion:<id>:cancelada`, `reunion:<id>:solicitada`. Respuestas, rechazo de solicitud y acuerdos: `avisarSinCorreo` (plantilla `reunion_respuesta`, solo bandeja + push; claves `reunion:<id>:respuesta:<membresía>:<ms>`, `reunion:<id>:rechazada`, `reunion-acuerdo:<id>`). El recordatorio y el acta siguen con `avisarReunion` (specs/32).

## Modelo de datos
Migración `20261113090100_reuniones_disponibilidad` (a mano, aditiva, sin borrar datos; RLS cerrado en tablas nuevas):
- `reuniones`: + `tipo` (backfill: colegio→institucional, salón→tutoria, individual→docente_apoderado), `motivo`, `modalidad`, `organizador_id` (backfill = `convocada_por`), `reprogramada_at`, `cancelada_por`, `cancelada_at` (backfill `updated_at` en canceladas), `motivo_cancelacion`, `observaciones`; `fin` pasa a NOT NULL (backfill `inicio + 60 min`). `EstadoReunion` += `por_confirmar`.
- `reunion_invitados`: + `rol` (`organizador | requerido | opcional`, default requerido), `invitado_at`, `propuesta_inicio/fin`. `RespuestaReunion` += `propone_otra`.
- `reunion_cambios` (historial inmutable: tipo `creada | reprogramada | cancelada | participantes | respuesta | realizada | acta`, `antes/despues` jsonb, `actor_id`, `motivo`).
- `reunion_acuerdos` (`texto`, `responsable_id?`, `fecha_compromiso?` date, `estado pendiente|cumplido`, `cumplido_at`).
- `reservas_agenda` (`membership_id`, `reunion_id?`, `inicio`, `fin`, `activa`) con `CHECK (fin > inicio)` y `EXCLUDE USING gist (tenant_id WITH =, membership_id WITH =, tstzrange(inicio, fin, '[)') WITH &&) WHERE (activa)` (no declarada en `schema.prisma`; `prisma migrate diff` no la pierde). `btree_gist` se crea `WITH SCHEMA extensions` si ese esquema existe (Supabase) y en el esquema por defecto si no (probado en BD limpia).
- `bloqueos_agenda` (`membership_id`, `inicio`, `fin`, `tipo bloqueo|ausencia`, `motivo` privado, `registrado_por`).
- `horarios_atencion` (`membership_id`, `dia` 1–7, `hora_desde`, `hora_hasta`, CHECKs).
- `tenants`: `hora_inicio_laboral` ('07:30'), `hora_fin_laboral` ('16:30'), `familias_solicitan_reuniones` (true). Configurables por dirección en `/configuracion` (tarjeta «Reuniones», `actualizarAjustesReuniones`).
- `archivos.reunion_id` (FK, adjuntos opcionales; la subida desde el asistente queda pendiente).
- `TipoNotificacion` += `reunion`.

## Contratos de `src/lib/server`
```ts
// disponibilidad.ts
leerAgendas(tdb, tenant, membershipIds, desde, hasta, { excluirReunionId? }): Agendas   // también dentro de la transacción
consultarDisponibilidad(ctx, { requeridos, opcionales, fecha, hora, duracion (5–240), dias?, excluirReunionId?, separar?, alternativas? (default true; false = sin sugerencias, lo usa el calendario) }): Disponibilidad | { error }  // solo personal
//   Disponibilidad += dias: { fecha, lectivo }[], jornada: { desde, hasta }, hoy: { fecha, hora } y, por persona, bloques: { fecha, desde, hasta ("24:00" = medianoche), etiqueta, esClase }[]
//   (tramos por día en la zona del colegio, unidos si son seguidos con la misma etiqueta; etiqueta según privacidad). `separar: true` → alternativas que no se cruzan, primero una por día y hasta 2 por día.
franjasDeAtencion(tdb, tenant, docenteId, desde, duracion = 30): FranjaVista[]
// reuniones.ts
convocarReunion(ctx, { titulo, tipo?, modalidad?, motivo?, observaciones?, fecha, hora (HH:mm, cualquier minuto), duracion? (5–240) | horaFin?, lugar?, enlace?, alcance: colegio|salon|individual|ninguno, salonId?, alumnoId?, alumnoIds? (máx. 30), requeridos?, opcionales?, fueraDeHorario?, forzarClase?, motivoForzar? }): Resultado & { id?, alternativas? }
opcionesParaConvocar(ctx)  // tipos permitidos, personal, salones, alumnos, horas laborales
responderInvitacion(ctx, id, { respuesta: asistire|no_asistire|propone_otra, comentario?, fechaPropuesta?, horaPropuesta? })
reprogramarReunion(ctx, id, { fecha, hora, duracion, motivo?, fueraDeHorario?, forzarClase?, motivoForzar? })   // también confirma solicitudes
cancelarReunion(ctx, id, { motivo })
agregarAcuerdo(ctx, id, { texto, responsableId?, fechaCompromiso? }) · marcarAcuerdo(ctx, acuerdoId, cumplido) · acuerdosPendientes(ctx)
opcionesSolicitud(ctx) · franjasParaSolicitud(ctx, alumnoId, docenteId) · solicitarReunion(ctx, { alumnoId, docenteId, fecha, hora, motivo })
miDisponibilidad(ctx) · guardarHorarioAtencion(ctx, franjas[]) · crearBloqueo(ctx, { fecha, fechaFin?, horaDesde, horaHasta, motivo?, tipo?, membershipId? }) · quitarBloqueo(ctx, id)
// Para la agenda / CalendarioSemana (los consume el módulo de agenda; no hay que tocar este módulo):
reunionesParaCalendario(ctx, desde: Date, hasta: Date): ReunionCalendario[]
//   { id, titulo, inicio, fin, estado, tipo, modalidad, lugar, enlace, rol: "organizador" | "invitado", href: "/reuniones/<id>" }
//   reuniones NO canceladas donde el usuario organiza o está invitado y que se cruzan con [desde, hasta); sin acta ni datos de otros.
ocupacionPropia(ctx, desde: Date, hasta: Date): { id, inicio, fin, tipo: "bloqueo" | "ausencia", motivo }[]
//   bloqueos y ausencias del propio usuario (personal; [] para familias).
// notificaciones/avisos-reuniones.ts
notificarReunion(ctx, { evento: invitacion|reprogramada|cancelada|solicitada, reunion, destinatarios, version?, solicitante? }): ResumenEntrega
avisarSinCorreo(ctx, { membershipId, reunionId, titulo, texto, clave }): ResumenEntrega
// src/lib/reuniones.ts (puro): TIPOS_POR_ROL, puedeConvocar, familiasDelTipo, tipoPorAlcance, motivoAntiabuso, TEXTO_TIPO, TEXTO_MODALIDAD
// src/lib/disponibilidad.ts (puro): fusionar, restar, intersectar, intersectarVarios, franjas, ventanasLaborales, rangosNoLectivos, estadoCelda, calcularDisponibilidad (opción `distintas`), celdasDelDia, etiquetaParaTercero, bloquesPorDia
// src/lib/asistente-horario.ts (puro, cliente): semanaDe, columnasSemana, rangoVisible, libresParaTodos, analizar, opcionalesOcupados, encajar, limitar, siguienteMarca, primerHueco, textoChoques
```

## Rutas y UI
- `/reuniones` («Nueva reunión» para personal; «Solicitar reunión» para familias si el colegio lo permite; «Mi disponibilidad»; «Acuerdos»).
- `/reuniones/nueva` (asistente en 3 pasos, `src/components/reuniones/AsistenteReunion.tsx` + `PasoHorario.tsx`, `ProgresoPasos.tsx`, `CalendarioHorario.tsx`, `LineaPersonas.tsx`, `paleta-personas.ts`; cálculos puros del paso en `src/lib/asistente-horario.ts`).

### Paso «Horario» (calendario de disponibilidad)
- Consulta `consultarDisponibilidad` con `fecha = lunes`, `dias: 7`, `alternativas: false` (solo la agenda) al entrar, al cambiar de semana, de duración o de participantes (el paso guarda la respuesta por clave; nunca un spinner global: esqueleto de la grilla y la grilla anterior atenuada si es la misma semana). Si no hay selección, toma el primer hueco libre para todos desde la fecha inicial (`primerHueco`, en el navegador).
- **Hora al minuto**: la Hora de inicio se escribe con cualquier minuto (`step=60`, sin redondear); clic y arrastre encajan cada 15 min y las flechas van a la marca de 15 min siguiente/anterior (11:38 → 11:45 / 11:30). Duración «Otra»: 5–240 min (servidor: `esDuracionValida`). Choques y reservas trabajan en ms, así que valen minutos arbitrarios.
- **Vista «Calendario»** (por defecto; Semana | Día en escritorio, Día con pestañas de lunes a viernes en móvil ≤ 640 px): eje de horas como la agenda (`GrillaTiempo` exporta `NumeroDia` y `etiquetaHora`), de 07:00 a 18:00 como mínimo (jornada con margen; se amplía si la selección queda fuera). Un carril por participante con lo ocupado como barras redondeadas del color asignado (`PALETA_PERSONAS`: turquesa, cochinilla, maíz, índigo cielo, pizarra; texto en tinta; leyenda con iniciales + nombre + Requerido/Opcional; familias «Pendiente de confirmar»). La etiqueta de cada barra es la que ya decide el servidor (de terceros «Ocupado» o «Clase»). Fuera de la jornada sombreado, días no lectivos con trama y «No lectivo», pasado atenuado, línea «ahora», franjas libres para todos los requeridos en verde tenue. Al pasar el puntero, bloque fantasma con la duración (encaje de 15 min); clic = coloca la «Nueva reunión» (índigo; rojo con ícono + «Choca con: Rocío (Clase)» si choca con un requerido; ámbar si solo hay opcional ocupado o fuera de jornada / no lectivo). El bloque se arrastra o se mueve con ↑/↓ (15 min) y ←/→ (día hábil); Enter sigue.
- **Vista «Por persona»** (Calendario | Por persona): regla horaria horizontal (se desplaza dentro de su contenedor), fila «Todos» con las coincidencias, una fila por participante (avatar de iniciales, nombre, Requerido/Opcional) con barras continuas y fila de familias sin barras; la reunión propuesta es una banda vertical translúcida que cruza todas las filas (arrastre, clic o ←/→ 15 min, ↑/↓ día, Enter).
- **Horarios sugeridos** (botón con ícono `Sparkles` en la cabecera del calendario): abre un modal (`Dialog`) y **recién entonces** pide al servidor las alternativas de la semana visible (`alternativas: true`, `separar: true`), con esqueleto de carga, error con «Reintentar» y vacío «No hay franjas comunes esta semana · Ver la semana siguiente». Tarjetas con día, hora y «Todos libres» o «Libre salvo opcional X» (calculado en el navegador con los tramos). Elegir una cierra el modal, salta a esa fecha y coloca el bloque.
- **Barra superior** del paso: estado de la franja como pastilla con ícono + palabra («Todos libres», «Choca con: Rocío (Clase)», «Fuera de la jornada…», «Opcional ocupado…», «Esa hora ya pasó») y el botón «Usar jue 5 nov · 10:15–10:45 y seguir» (en el celular, «Usar 10:15–10:45»; el nombre accesible es siempre el completo), deshabilitado mientras se recalcula, si la franja ya pasó o si choca con un requerido sin la casilla para programar sobre la clase (solo dirección/administrativo y solo si todos los choques con requeridos son clases; está bajo la fila de Duración/Fecha/Hora).
- Los choques se evalúan en el navegador con los tramos recibidos (`analizar`); **el servidor revalida siempre al confirmar** (sin cambios).
- `/reuniones/[id]`: además de specs/32, responder con «Aceptar / Rechazar / Proponer otra hora», reprogramar, cancelar con motivo, confirmar o rechazar solicitudes, acuerdos e historial (solo quien gestiona).
- `/reuniones/solicitar`, `/reuniones/disponibilidad`, `/reuniones/acuerdos`.
- Navegación: el mosaico «Reuniones» ahora incluye al rol administrativo.

## Errores y casos borde
- Franja ocupada al confirmar o reprogramar: «Esa franja se acaba de ocupar. Elige otra.» + alternativas.
- Clase de un requerido: profesor → «X está ocupado a esa hora»; dirección/administrativo → «X tiene clase a esa hora…» (pueden forzar con motivo).
- Fuera de horario / no lectivo sin confirmarlo: mensaje para elegir otra franja o confirmar.
- Solicitudes: hijo ajeno o docente no permitido → 403; franja fuera de las ofrecidas → error; antiabuso → «Ya tienes 2 solicitudes abiertas…» / «…máximo de 5 solicitudes por semana».
- Ids ajenos, de otro colegio o inexistentes: 404 en páginas, 403 en acciones.

## Pruebas
- Unit: `tests/unit/disponibilidad.test.ts` (fusión, resta, intersección, franjas de 15 min, bordes `[)`, no lectivo, fuera de horario, alternativas, alternativas distintas, `bloquesPorDia`, análisis del paso Horario: choques con requeridos/opcionales, fuera de jornada, no lectivo, pasado, libres para todos, encaje y semana, 11:38 por 25 min, `limitar`, `siguienteMarca`, `primerHueco`, privacidad), `tests/unit/reuniones.test.ts` (matriz y antiabuso).
- Integración: `tests/integracion/reuniones-disponibilidad.test.ts` (clase de Lucía 10:00–11:00 bloquea, reunión de Luis 11:00–11:30 bloquea, coincidencias de 3 docentes para 45 min, privacidad, familias sin consulta, otro colegio, revalidación con alternativas, forzar clase con motivo, fuera de horario, concurrencia con `Promise.all` → una sola reserva, restricción de exclusión, profesor invitado ve la reunión, reprogramar y cancelar liberan reservas, correos solo en invitación/reprogramación/cancelación contando filas `avisos` canal correo, reintento sin duplicados, acuerdos, ocupación propia, solicitudes con antiabuso, hijo ajeno y docente no permitido, horario de atención); `tests/integracion/reuniones.test.ts` ajustado (franjas distintas, cancelar con motivo).
- Integración: familias de alumnos elegidos (3 alumnos → filas por apoderado y alumno, un aviso para la apoderada de dos de ellos, sin salón si son de salones distintos; alumno no visible, de otro colegio o más de 30 → rechazo); hora al minuto (11:38 por 25 min: preferida 11:38–12:03, reserva de 25 min, choques exactos; `alternativas: false` → sin sugerencias; 241 min → error). Además, calendario semanal (`dias`, `jornada`, `hoy`, alternativas `separar` sin cruces y ≤ 2 por día, `bloques` con «Clase»/«Ocupado» y detalle solo propio).
- e2e: `tests/e2e/reuniones-asistente.test.ts` (dirección arma una reunión con Lucía y Pedro y las familias de 2 alumnos elegidos (Mateo y Sofía) en el calendario: progreso «Paso 1 de 3», duración, fecha, leyenda, mover el bloque con el teclado, vista «Por persona», modal de horarios sugeridos; Rosa solicita a Lucía; Lucía la confirma); `tests/e2e/reuniones.test.ts` (Lucía fija 18:00 con los campos Fecha/Hora de inicio y confirma fuera de jornada).

## Pendientes
- Subir adjuntos desde el asistente (`archivos.reunion_id` y `CamposAdjuntos` ya disponibles).
- Editar participantes de una reunión confirmada (tipo de cambio `participantes` reservado).
- Familia que cancela su propia solicitud; aceptar con un clic la hora propuesta por un invitado.
- Recordatorio automático el día anterior (specs/32).
- Horas laborales por persona (hoy son las del colegio para todo el personal).
- Paso Horario: arrastrar el bloque en móvil con gesto largo (hoy se coloca con un toque y se ajusta con los campos o las flechas); duración libre arrastrando el borde del bloque.
