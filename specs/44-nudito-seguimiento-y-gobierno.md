# 44 — Nudito: seguimiento, gobierno institucional, privacidad y fin de las licencias familiares

> Estado: implementado (rama `nudito-d`; integra con A/B/C) · Plan: Khipu Pro · Última actualización: 2026-11-14 (Claude Code, Dev D) · Responsable: Dev D

## Objetivo
Que docentes y familias vean el **progreso formativo** de Nudito (specs/41) dentro de su alcance; que cada colegio encienda y
gobierne Nudito (límites, retención, fotos); y dejar **inerte**, sin borrar datos, el modelo de licencias familiares con Yape
(specs/28).

## Responsabilidades (Dev D)
- Progreso: `src/lib/server/nudito/progreso.ts` y páginas `/nudito/seguimiento` (docente y dirección) y el panel del apoderado.
- Interruptor institucional y configuración: `config-colegio.ts` + página de configuración de dirección.
- Acceso: adaptar `src/lib/server/nudito-plus/acceso.ts`: la licencia se reemplaza por configuración del colegio + grado y área
  habilitados; se mantienen el modo hijo y el consentimiento.
- Retención (`retencion.ts`) en el cron semanal `/api/cron/nudito-plus` (resúmenes + purga).
- Fotos privadas (`fotos.ts`).
- Licencias inertes, menú, plataforma, exportación y consentimiento v2.

## Roles y permisos (seguimiento)
| Rol | Ve | No ve |
|---|---|---|
| alumno | Su progreso | El de otros |
| apoderado | El progreso de sus hijos (`alumnoIdsVisibles`) | Conversaciones; otros alumnos |
| profesor | Alumnos de los cursos que dicta, **solo el área de ese curso**; el tutor ve todas las áreas de su salón | Conversaciones, textos libres del alumno |
| dirección | Todo el colegio (agregado) y la configuración | Conversaciones |
| super administrador | Consumo agregado por colegio; puede bloquear (`bloqueado_plataforma`) | Conversaciones |

## Reglas de negocio
- **Producto**: Nudito es el tutor de Khipu Pro, no un producto aparte. `NUDITO_TUTOR_DISPONIBLE = true`
  (`src/lib/planes.ts`; `NUDITO_PLUS_DISPONIBLE` y `nuditoPlusDisponible()` quedan como alias). La clave interna del módulo
  sigue siendo `nudito_plus` (fija por plan, solo Pro) para no romper datos. `INFO_MODULO`: «Nudito, tutor de práctica»;
  la landing lo lista en Pro sin precio (specs/25).
- **Interruptor**, en orden (`configNudito`, `config-colegio.ts`): producto → plan Pro (+ módulo) → `bloqueado_plataforma`
  → `nudito_config_colegio.activo` (sin fila = apagado). Devuelve `{ activo, motivo?: producto|plan|plataforma|colegio, config }`.
- **Acceso al tutor** (`evaluarAccesoNuditoPlus` / `requireNuditoPlus`, `src/lib/server/nudito-plus/acceso.ts`, firmas
  conservadas + `opciones.area` opcional): nunca en modo soporte ni fuera de Pro (`plan`) → alumno = él mismo (`alumno`) o
  apoderado de un hijo sin cuenta propia activa (`hijo`; si tiene cuenta → `cuenta_propia`) → colegio activo (`colegio`) →
  nivel, grado mínimo de primaria y área habilitados (`grado`; un salón sin grado no se bloquea por grado) → modo hijo
  permitido (`modo_hijo`) → consentimiento vigente (`consentimiento`). **Sin licencia.** Textos amables por motivo:
  `textoSinAcceso` (`SinAccesoNuditoPlus.tsx`).
- **Licencias familiares inertes** (specs/28): `NUDITO_LICENCIAS_FAMILIARES = false` (`licenciasFamiliaresNudito()`; en tests
  `KHIPU_TEST_NUDITO_LICENCIAS=1`). Activar/reportar pago → 404; verificar, rechazar, crear, extender, cancelar licencias y
  guardar precio/Yape → 403; el cron de avisos no procesa vencimientos; el panel muestra licencias y pagos como «Histórico»
  sin acciones. Las tablas `licencias_nudito` y `pagos_nudito` y sus filas **se conservan** (y se siguen exportando).
- **Configuración institucional** (`/configuracion/nudito`, solo dirección; tarjeta en `/configuracion` para colegios Pro):
  activo, áreas, niveles, grado mínimo en primaria, modo hijo, fotos (apagadas por defecto), sesiones y minutos por día,
  horario (HH:mm, ambos o ninguno, inicio < fin), tope de costo mensual (USD), retención (30–730 días, por defecto 180) y
  cambios a la política de dominio. Validación: `esquemaConfigNudito` + `validarCambiosPolitica` (la entrada cruda debe
  cumplir `esquemaPoliticaDominio.partial().strict()` y la combinación con `POLITICA_DOMINIO_POR_DEFECTO` el esquema
  completo; clave inventada o valor fuera de rango → error). La página muestra los valores por defecto (v1) como
  **provisionales**. Guarda `actualizadoPorId`, `activadoAt` (al encender) y audita `editar · nudito_config` (antes/después).
- **Bloqueo de plataforma**: `bloquearNuditoColegio(admin, tenantId, bloquear, motivo)` (motivo obligatorio) hace upsert de
  `bloqueado_plataforma` y registra `nudito_colegio_bloquear|desbloquear` en `auditoria_plataforma`. `colegiosNudito`
  lista colegios Pro con estado, sesiones del mes y costo IA del mes (`usos_nudito`), sin conversaciones.
- **Consentimiento v2**: `CONSENTIMIENTO_POR_DEFECTO` pasa a **v2** (finalidad: tutoría del colegio; práctica formativa, no
  es nota; docentes y dirección ven el progreso; fotos opcionales y privadas; retención). `VERSIONES_CONSENTIMIENTO_RETIRADAS
  = {v1}`: si la configuración de plataforma aún guarda v1, se usa la v2, así que **todas las familias vuelven a aceptar**.
  `asentimiento_alumno_at` opcional (pendiente de UI).
- **Progreso** (`progreso.ts`): `areasVisiblesDeAlumno` (alumno: el suyo; apoderado: vínculo; profesor: áreas
  `cursos.area_cneb` de los cursos que dicta en el salón del alumno, o todas si es su tutor; dirección: todas; otro → 403;
  alumno de otro colegio → 404). `progresoDeAlumno` / `detalleProgresoAlumno` leen `nudito_dominios` (temas, estado,
  dificultad alcanzada, intentos, aciertos, aciertos sin pista, pistas promedio de la ventana, motivo, última práctica) y
  auditan `ver · nudito_progreso`. `progresoDeCurso`: solo dirección, profesor del curso o tutor del salón; 3 `groupBy`
  (por alumno y estado, última actividad, top 5 temas «para reforzar»); audita `ver · nudito_progreso_curso`. Nunca
  devuelve evidencia cruda, respuestas ni texto de conversaciones. Nombres de temas: catálogo global (`temaPorClave`) o
  `nudito_temas_colegio`; si falta, la clave.
- **Pantallas**: docente/dirección `/nudito/seguimiento` (cursos con área de Nudito), `/nudito/seguimiento/curso/[cursoId]`
  (tabla por alumno + temas para reforzar) y `/nudito/seguimiento/alumno/[alumnoId]?area=` (detalle). Familia
  `/nudito-plus` (cada hijo: dominados, practicando, para reforzar, autorización y «Usar en modo hijo» → `/nudito?alumno=…`)
  y `/nudito-plus/[alumnoId]` (autorización + progreso). Siempre con «Práctica formativa, no es nota» (`AVISO_FORMATIVO`,
  `src/lib/nudito-seguimiento.ts`) y estados con ícono + palabra («Para reforzar», nunca «mal»).
- **Navegación** (`navegacion.ts`): alumno «Nudito» `/nudito`; apoderado «Nudito» `/nudito-plus`; profesor y dirección
  «Seguimiento de Nudito» `/nudito/seguimiento`.
- **Fotos** (`fotos.ts`): `subirFoto(ctx, acceso, { sesionId, ejercicioId?, archivo }, { proveedor?, proposito? })` exige
  colegio activo y `permitir_fotos` (si no, `MENSAJE_FOTOS_APAGADAS`), sesión (y ejercicio) del propio alumno, JPG/PNG/WEBP
  por firma (`detectarMime`) y ≤ 5 MB. Guarda `Archivo` privado (`nudito_sesion_id`, carpeta `nudito`), llama a
  `interpretarImagen` (proveedor de C; inyectable en pruebas) y registra el consumo (si el registro falla, no corta). Si hay
  rostro o la lectura no es utilizable (`lecturaUtilizable`: legible, confianza ≥ 0,6, con texto) **borra** la foto (proveedor
  y fila) y lanza `ErrorDeNegocio` amable («escríbelo o toma otra»): nunca se marca incorrecto con una lectura incierta.
  `urlFotoNudito` da URL de 5 min solo al propio alumno (o su apoderado en modo hijo). **Integración C**: la action llama
  `requireNuditoPlus` → `subirFoto`; con éxito manda `fotoArchivoId` en `responder`; con `ErrorDeNegocio` muestra el mensaje.
- **Retención** (`retencion.ts`, cron semanal `/api/cron/nudito-plus`): para cada colegio con sesiones o configuración,
  corte = ahora − `retencion_dias` (por defecto 180, acotado 30–730). Por lotes de 500 borra fotos de sesión (primero en el
  proveedor), intentos, ejercicios (contando intentos en cascada) y mensajes con `sesion_id`. **Conserva** dominios, eventos,
  sesiones (solo metadatos y totales), consumos y el chat antiguo de Nudito+ (sin `sesion_id`).
- **Resúmenes semanales**: el mismo cron genera `generarResumenesPractica` (por sesiones y eventos de dominio de la semana:
  temas, dominados, para reforzar; texto en positivo y «no es nota») y luego el resumen antiguo del chat; uno por semana.
- **Tope del colegio**: suma de `usos_nudito.costo_estimado_usd` del mes contra `tope_costo_usd_mes` (lo aplica C en las
  sesiones con `configNudito`).
- **Exportación** (`exportar.ts`): se omiten `NuditoSesion`, `NuditoEjercicio`, `NuditoIntento`, `NuditoConsumoIa`
  (`TABLAS_NUDITO_PRACTICA`) y, como antes, conversaciones/mensajes/alertas/resúmenes/uso; las fotos de Nudito no salen
  (`FILTRO_EXPORTACION.archivo`, ni fila ni binario). Se exportan dominios, eventos, `nudito_config_colegio` y
  `nudito_temas_colegio`. Lo explica el README del ZIP.
- **Nudito no toca** notas, registro auxiliar, NSP ni libretas: `tests/unit/nudito-sin-notas-oficiales.test.ts` revisa
  imports y uso de delegados de esas tablas en `src/lib/server/nudito/**` y `src/lib/nudito/**`.

## Contratos
```ts
// progreso.ts: progresoDeAlumno(ctx, { alumnoId, area? }), progresoDeCurso(ctx, { cursoId }),
//   detalleProgresoAlumno(ctx, alumnoId, area?), areasVisiblesDeAlumno, cursosParaSeguimiento, cursoDeSeguimiento
// config-colegio.ts: configNudito(ctx), guardarConfigNudito(ctx, entrada) (solo dirección), validarCambiosPolitica,
//   nuditoHabilitadoPara(ctx, { nivel, grado, area? }), habilitadoEnConfig (puro), CONFIG_NUDITO_POR_DEFECTO
// retencion.ts: purgarRetencion(ahora?) → { colegios, intentos, ejercicios, mensajes, fotos }; purgarColegio(tenantId, corte)
// fotos.ts: subirFoto(ctx, acceso, { sesionId, ejercicioId?, archivo }, opciones?), urlFotoNudito(ctx, acceso, archivoId)
// acceso.ts: evaluarAccesoNuditoPlus(ctx, alumnoId, hoy?, { area? }), requireNuditoPlus(ctx, alumnoId, hoy?, { area? })
// plataforma-nudito-plus.ts: colegiosNudito(admin), bloquearNuditoColegio(admin, tenantId, bloquear, motivo)
```

## Modelo de datos
`nudito_config_colegio` (1:1 con el colegio), `archivos.nudito_sesion_id`, `consentimientos_ia.asentimiento_alumno_at`; lectura de
`nudito_dominios`, `nudito_dominio_eventos`, `nudito_sesiones`, `usos_nudito`, `nudito_consumos_ia`. Sin migraciones nuevas.

## Pruebas
- integración: `nudito-acceso.test.ts` (sin config → «colegio»; bloqueo; grado/área/modo hijo; consentimiento v1 no vale;
  Base y soporte → 403), `nudito-progreso-alcance.test.ts` (alumno, apoderado, profesor del área, tutor, dirección,
  portería, otro colegio, otro alumno; agregados del curso), `nudito-config-retencion.test.ts` (activar/desactivar,
  auditoría, overrides inválidos, bloqueo de plataforma, retención que conserva dominios y eventos), `nudito-fotos.test.ts`
  (apagadas por defecto, tipo y tamaño, privada, URL solo propia, ilegible y con rostro se descartan); se adaptaron
  `nudito-plus-tutor.test.ts` (configuración en vez de licencia) y `nudito-plus-licencias.test.ts` (regresión + modo real).
- unit: `nudito-sin-notas-oficiales.test.ts`, `nudito-plus-interruptor.test.ts`, `landing-planes.test.ts`,
  `nudito-plus-licencias.test.ts` (consentimiento v2).
- e2e: los de licencias y del chat antiguo se saltan con `NUDITO_LICENCIAS_FAMILIARES = false`.

## Riesgos (para la revisión legal)
Ley 29733 y su reglamento (consentimiento de menores), transferencia internacional al proveedor de IA, términos de cada
proveedor para menores, fotos de menores, quién accede a una conversación ante un incidente de seguridad.

## Pendientes
- UI de asentimiento del alumno (14+); límites de sesiones/minutos/horario y tope de costo los aplica C al iniciar sesiones.
- Fotos huérfanas (sesión borrada en cascada por baja de un alumno → `nudito_sesion_id` null) no las alcanza la retención.
- (Hecho 2026-11-04) `/nudito-plus/hijo/[alumnoId]` → `/nudito?alumno=<id>` y `/nudito-plus/chat` → `/nudito`. Los seeds ya no
  crean licencias ni pagos con `NUDITO_LICENCIAS_FAMILIARES = false`; siembran el consentimiento v2 de Mateo y de Lucas, y
  `seed-nudito-tutor.ts` activa la configuración de Nuevo Horizonte y rellena las áreas de los cursos.
