# 28 — Licencias de Nudito+ (venta por alumno, pago con Yape)

> Estado: en pausa — desactivado (implementación conservada; el modelo familia/Yape se descartó; producto futuro contratado por el colegio; ver docs/nudito-plus-viabilidad.md) · Plan: — (módulo fijo `nudito_plus`, apagado) · Última actualización: 2026-11-03 (Claude Code)

> **Estado comercial (2026-11-03): en pausa — desactivado.** El modelo familia/Yape se descartó; si vuelve, será un
> producto futuro contratado por el colegio (sin precio ni fecha). Ver `docs/nudito-plus-viabilidad.md`. El interruptor
> `NUDITO_PLUS_DISPONIBLE = false` (`src/lib/planes.ts`, `nuditoPlusDisponible()`) deja `nudito_plus` inactivo en todos
> los colegios (fuera del menú; `requireFeature` → 403), el cron `/api/cron/avisos` no llama a `procesarVencimientosNudito`
> y `/api/cron/nudito-plus` responde `{ desactivado: true, creados: 0 }` sin trabajo (su entrada de `vercel.json` se
> mantiene a propósito). El panel `/plataforma/nudito-plus` sigue accesible para uso interno con el aviso «Nudito+ está
> desactivado: producto en estudio». No se borró código, tablas ni datos. Los tests de integración lo fuerzan con
> `KHIPU_TEST_NUDITO_PLUS=1` (solo vale con `NODE_ENV=test`); los e2e de Nudito+ se saltan mientras esté apagado. Lo que
> sigue describe la implementación existente.

## Objetivo
Vender **Nudito+** (tutor IA, `specs/29`) **por alumno** a las familias de colegios con plan `pro`. La familia paga por
adelantado (prepago, precio configurable, por defecto **S/ 20 al mes**) con **Yape**: sin tarjeta y sin renovación
automática. El equipo Khipu verifica el abono y activa, renueva o cancela la licencia desde el **panel de plataforma**.
No necesita autorización del colegio. Antes de usarlo, el apoderado acepta el consentimiento de uso de IA para un menor
(Ley 29733). La familia ve reportes, alertas y resúmenes de su hijo, **nunca las conversaciones**. Las familias de
colegios que no usan Khipu no pueden comprar (todo pasa dentro del colegio, con la cuenta del apoderado).

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| super administrador (equipo Khipu) | Ver la cola de pagos, verificar o rechazar (con motivo), dar licencias de cortesía o prueba, extender y cancelar (con motivo), editar precio, Yape, texto de consentimiento y topes, administrar `SitioPermitido`. Todo auditado en `auditoria_plataforma` | Ver conversaciones de los alumnos (el panel nunca consulta `NuditoConversacion`/`NuditoMensaje`) |
| apoderado (colegio Pro) | Ver el estado de cada hijo, reportar un pago (n.° de operación, monto, fecha, meses 1–12), aceptar o retirar la autorización de IA, ver uso del mes, resúmenes y alertas (marcar como vistas), abrir el «modo hijo» | Activar licencias; ver conversaciones; ver hijos de otras familias |
| apoderado (colegio Base) | — (403: el módulo no está en su plan) | Comprar |
| dirección, profesor, alumno | — (el módulo solo tiene pantallas para el apoderado; el uso del alumno es de `specs/29`) | Ver pagos, licencias o reportes |

## Flujos
1. **Activar o renovar** (`/nudito-plus/[alumnoId]/activar`): la familia ve el precio, el número y titular de Yape (configuración) y las instrucciones; paga por Yape y reporta el pago → `PagoNudito` con `estado = pendiente`, `metodo = yape`, `apoderadoId` = su membresía. Error → vuelve al formulario con el mensaje; éxito → panel del hijo con «Recibimos tu pago…».
2. **Verificar** (panel `/nudito-plus`): el equipo Khipu confirma el abono en Yape y pulsa «Verificar» → reserva atómica del pago (`updateMany` pendiente→verificado, `registradoPorId`, `verificadoAt`), crea o **extiende** la `LicenciaNudito` (`origen = pago`) y enlaza `PagoNudito.licenciaId`. Aviso `nudito_plus` a la familia («Nudito+ está activo para Mateo»).
3. **Rechazar** con motivo (≥ 5 letras): `estado = rechazado`, `notas` = motivo; aviso solo a quien lo reportó; la familia ve el motivo en el historial de pagos.
4. **Cortesías y pruebas** (`/nudito-plus/licencias/nueva`): colegio Pro → alumno activo → tipo, fecha final (≤ 1 año) y motivo. Sin pago.
5. **Extender / cancelar** desde la lista de licencias, con motivo; la línea queda en `notas` (historial) y en la auditoría.
6. **Vencimiento**: `marcarLicenciasVencidas` pasa a `vencida` las `activa` con `hasta < hoy` (Lima). Se llama de forma perezosa al leer (pantallas de familia y panel) y en el cron `/api/cron/avisos`, que además envía el recordatorio «vence el dd/mm/aaaa» una sola vez por licencia y `hasta` cuando faltan ≤ 3 días (solo licencias de pago).
7. **Consentimiento** (`/nudito-plus/[alumnoId]/consentimiento`): texto y versión de `nudito_plus:consentimiento`; al aceptar se guarda `ConsentimientoIa` (versión, IP). «Retirar autorización» revoca **todos** los consentimientos vigentes del alumno (cualquier apoderado puede detener el uso) y Nudito+ deja de funcionar.

## Reglas de negocio
- **Disponibilidad:** módulo `nudito_plus` (plan `pro` en `FEATURES`, **fijo por plan**: `MODULOS_FIJOS_POR_PLAN`, sin fila en `plan_modulos` ni ajuste en el panel; ver specs/29) **y** `Tenant.plan = pro` (`requireFamiliaNuditoPlus`): no se vende a colegios Base. Si el colegio baja a Base, el apoderado pierde la pantalla y el panel no verifica ni da licencias nuevas en ese colegio (compensación: pendiente).
- **Licencia vigente:** `estado = activa` y `desde <= hoy <= hasta` (hora de Lima, `hasta` incluido).
- **Fechas** (`src/lib/nudito-plus.ts`): periodo nuevo de N meses = `desde = hoy`, `hasta = (hoy + N meses) − 1 día`; extender N meses = `hasta' = (hasta + 1 día + N meses) − 1 día`. Si el mes destino no tiene ese día se usa el último (31 ene + 1 mes → 28 feb).
- **Verificar** extiende la licencia activa que aún no venció (`hasta >= hoy`); si no hay, crea una nueva desde hoy. Una sola fila por periodo continuo: renovar **extiende** `hasta` (no crea otra fila); el historial queda en `notas`, en los pagos enlazados y en la auditoría. Nunca se borra una licencia.
- **Extender una vencida** desde el panel la reactiva desde hoy (no se cobran días sin uso).
- **Pago:** referencia 4–40 caracteres, única entre pagos no rechazados (de todos los colegios); monto > 0 (el panel marca «Monto distinto» si no coincide con precio × meses); fecha no futura y de los últimos 60 días; meses 1–12; máximo 3 pagos pendientes por alumno.
- **Uso permitido** (contrato para `specs/29`) = licencia vigente **y** consentimiento vigente: no revocado, de la **versión vigente** del texto (si el equipo publica otra versión, las familias aceptan de nuevo) y de un apoderado activo aún vinculado al alumno.
- La familia ve uso del mes (`UsoNudito.mensajes` vs `mensajesPorMes`), resúmenes y alertas; nunca conversaciones. Las alertas se marcan como vistas (`vistaAt`).
- **Exportación del colegio** (`specs/15`): se omiten `NuditoConversacion`, `NuditoMensaje`, `AlertaNudito`, `ResumenNudito` y `UsoNudito` (actividad privada de la familia). Licencias, pagos y consentimientos sí se exportan (registros administrativos sin contenido de IA).
- Avisos: plantilla `nudito_plus` (`TipoAviso.nudito`), firmados por el equipo Khipu, a familias con canal y consentimiento de avisos (`destinatariosDeAlumno`).

## Modelo de datos
Migración `20261031130000_pro_completo_nudito_plus` (sin cambios de esquema en esta entrega).

- **`LicenciaNudito`**: `estado` (`activa | vencida | cancelada`), `origen` (`pago | cortesia | prueba`), `desde`/`hasta` (Date), `registradaPorId`, `notas` (historial de líneas `[AAAA-MM-DD] …`).
- **`PagoNudito`**: `licenciaId?`, `apoderadoId?`, `monto`, `moneda`, `meses`, `metodo`, `referencia`, `fechaPago`, `estado` (`pendiente | verificado | rechazado`), `registradoPorId?`, `verificadoAt?`, `notas` (motivo del rechazo).
- **`ConsentimientoIa`**: `apoderadoId`, `alumnoId`, `versionTexto`, `aceptadoAt`, `ip`, `revocadoAt`.
- **`ConfigPlataforma`** (`CLAVES_NUDITO_PLUS`):
  - `nudito_plus:precio` → `{ "montoMensual": 20, "moneda": "PEN" }` (por defecto si falta)
  - `nudito_plus:yape` → `{ "numero": "999 999 999", "titular": "Khipu Escolar (piloto)" }` (si falta, la familia ve «Muy pronto publicaremos el número»)
  - `nudito_plus:consentimiento` → `{ "version": "v1", "texto": "…" }` (párrafos separados por línea en blanco)
  - `nudito_plus:limites` → `{ "mensajesPorMes": 300, "tokensPorMes": 300000, "costoMaxUsdPorMes": 1.5 }` (por defecto)
  - `nudito_plus:proveedor` → lo usa `specs/29` (el seed pone el proveedor «falso»)
- **`SitioPermitido`** (global): CRUD en el panel; `dominio` normalizado (minúsculas, sin esquema, «www.», ruta ni puerto).

## Contratos de `src/lib/server`
```ts
// nudito-plus/licencias.ts — CONTRATO con el motor del tutor (specs/29): no cambiar estas firmas.
licenciaVigente(db: PrismaClient | DbTenant, tenantId, alumnoId, hoy?: "AAAA-MM-DD"): Promise<LicenciaNudito | null>
consentimientoVigente(db, tenantId, alumnoId): Promise<ConsentimientoIa | null>
limitesNudito(): Promise<{ mensajesPorMes; tokensPorMes; costoMaxUsdPorMes }>   // defaults 300 / 300000 / 1.5
sitiosPermitidos(): Promise<string[]>                                          // dominios activos
// además: precioNudito, datosYape, consentimientoActual, avisarFamiliaNudito,
// marcarLicenciasVencidas(hoy?, tenantId?), recordarVencimientos(hoy?, tenantId?), procesarVencimientosNudito(hoy?)

// nudito-plus/familia.ts (ctx del colegio; requireFamiliaNuditoPlus = apoderado + módulo + plan pro; requireAlumnoVisible)
hijosConNudito(ctx, hoy?)  panelHijo(ctx, alumnoId, hoy?)  datosParaActivar(ctx, alumnoId)
reportarPago(ctx, alumnoId, { referencia, monto, fechaPago, meses }, hoy?)
datosConsentimiento(ctx, alumnoId)  aceptarConsentimientoIa(ctx, alumnoId, ip)  revocarConsentimientoIa(ctx, alumnoId)
marcarAlertaVista(ctx, alertaId)

// plataforma-nudito-plus.ts (AdminContext; db global con tenantId explícito; auditoría `nudito_*`)
pagosPendientes  resumenNuditoPlus  verificarPago(admin, pagoId, hoy?)  rechazarPago(admin, pagoId, motivo)
listarLicencias(admin, { colegio?, estado?, vence?: "7" })  crearLicenciaManual  extenderLicencia  cancelarLicencia
configNuditoPlus  guardarPrecioYape  guardarConsentimientoTexto  guardarLimites
listarSitios  agregarSitio  editarSitio  cambiarActivoSitio  quitarSitio
```
Acciones en `auditoria_plataforma`: `nudito_pago_verificar`, `nudito_pago_rechazar`, `nudito_licencia_crear`, `nudito_licencia_extender`, `nudito_licencia_cancelar`, `nudito_config_precio_yape`, `nudito_config_consentimiento`, `nudito_config_limites`, `nudito_sitio_agregar|editar|activo|quitar`. En `auditoria` del colegio: ver panel del hijo, crear pago, aceptar o revocar consentimiento.

## Rutas y UI
- Colegio (apoderado, menú «Académico › Nudito+»):
  - `/nudito-plus`: una tarjeta por hijo con estado (ícono + palabra): «Sin licencia», «Activa hasta dd/mm/aaaa», «Vencida el …», «Pago en revisión»; autorización dada / falta; «Ver reportes» y «Activar Nudito+» / «Renovar».
  - `/nudito-plus/[alumnoId]`: licencia, autorización (retirar), «Usar en modo hijo» (enlace a `/nudito-plus/hijo/[alumnoId]`, de `specs/29`; solo con licencia y autorización vigentes), uso del mes, alertas, resúmenes e historial de pagos.
  - `/nudito-plus/[alumnoId]/activar` y `/nudito-plus/[alumnoId]/consentimiento`.
- Panel (`admin.<dominio>`, menú «Colegios › Nudito+»), con pestañas:
  - `/nudito-plus`: indicadores, pagos por verificar (Verificar con confirmación, Rechazar con motivo) y resumen por colegio.
  - `/nudito-plus/licencias`: filtros (colegio, estado, «vencen en 7 días»), extender y cancelar con motivo; `/nudito-plus/licencias/nueva`.
  - `/nudito-plus/configuracion`: precio y Yape, topes, texto de autorización, sitios permitidos.
- Landing: tarjeta «Nudito+ · Próximamente» con la regla (por alumno, Yape, colegios Pro); el módulo no se lista como función de ningún plan.

## Textos y UX
- «Recibimos tu pago. Lo revisaremos y te avisaremos cuando Nudito+ esté activo.»
- «Tú ves reportes, alertas y resúmenes del avance de tu hijo, nunca sus conversaciones. El colegio tampoco las ve.»
- Avisos: «Nudito+ está activo para Mateo» / «No pudimos confirmar tu pago de Nudito+» (con motivo) / «Nudito+ de Mateo vence el dd/mm/aaaa» («Si no renuevas, solo se pausa: no se pierde nada.»).

## Errores y casos borde
- Pago revisado dos veces a la vez: la reserva atómica deja pasar solo uno («Este pago ya fue revisado.»).
- Número de operación repetido: «Ese número de operación ya fue reportado.»
- Alumno retirado: no puede reportar pagos; el panel solo da licencias a alumnos activos. Las licencias vigentes de un alumno retirado no se cancelan solas (pendiente).
- Colegio que deja Pro con pagos pendientes: el panel muestra «El colegio ya no tiene Khipu Pro» y no deja verificar (hay que rechazar y devolver).

## Pruebas
- Unit `tests/unit/nudito-plus-licencias.test.ts`: suma de meses, periodo nuevo, extensión, verificación (extender o nueva), vigencia, estado para la familia, configuración por defecto, normalización de dominios y URLs permitidas.
- Integración `tests/integracion/nudito-plus-licencias.test.ts`: el apoderado solo ve a sus hijos; colegio Base no compra; validaciones del pago; solo el super administrador verifica; verificar crea y extiende; rechazar con motivo; aislamiento por colegio; consentimiento (aceptar, idempotente, revocar); alertas propias; vencidas y recordatorio único; cortesía/extender/cancelar y auditoría; sitios; exportación sin actividad de IA.
- E2E `tests/e2e/nudito-plus-licencias.test.ts`: Rosa reporta un Yape y autoriza; `admin@khipuescolar.demo` verifica en `admin.lvh.me`; Rosa ve «Activa hasta …» (restaura los datos al terminar).
- Demo (`prisma/seed-nudito-plus.ts`, corre después de `seed-nudito-plus-tutor.ts`; fuente única de la configuración y la lista blanca): Mateo (hijo de Rosa en Nuevo Horizonte) con licencia de pago activa, consentimiento y reportes; pago Yape pendiente de la familia de Gael Chávez (5.° A); Valentina con prueba que vence en 2 días; Lucas Huamán (cuenta propia) con cortesía de 3 meses y consentimiento de su madre Julia (`familia.huaman@familia.demo`).

## Pendientes
- Decidir si Nudito+ vuelve y con qué modelo (contratado por el colegio). Para reactivarlo: `NUDITO_PLUS_DISPONIBLE = true` y quitar el `test.skip` de los e2e.
- Política de reembolso y prorrateo; boleta electrónica.
- Compensación si el colegio baja de plan con licencias vigentes; licencias de alumnos retirados.
- Qué ve dirección del colegio (por ahora, nada).
- Etiquetas legibles de las acciones `nudito_*` en `TEXTO_ACCION` de la auditoría de plataforma (hoy se muestran con su nombre).
