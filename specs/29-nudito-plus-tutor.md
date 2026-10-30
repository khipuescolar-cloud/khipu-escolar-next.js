# 29 — Nudito+ (tutor IA por alumno)

> Estado: implementado (con proveedor de IA falso) · Plan: Khipu Pro + licencia por alumno (`specs/28`) · Última actualización: 2026-10-30 (Claude Code)

## Objetivo
Tutor IA para el **alumno**, alineado al CNEB de su grado, que guía paso a paso (socrático) y recomienda materiales solo
de sitios permitidos. La familia ve **reportes, alertas y resúmenes**, nunca las conversaciones. El proveedor de IA
**aún no está elegido**: hay una interfaz intercambiable (`ProveedorIA`, como `FileStorage`) y un **proveedor falso**
local y determinista. No hay ninguna API key. Topes de uso y costo por alumno y mes.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| alumno (cuenta propia, desde `Tenant.gradoMinimoCuentaAlumno`) | Conversar con Nudito+ en `/nudito-plus/chat` (`modo = alumno`) y ver/reabrir **sus** conversaciones | Superar el tope mensual; usarlo sin licencia o sin consentimiento vigentes |
| apoderado | Abrir el «modo hijo» `/nudito-plus/hijo/[alumnoId]` para **su** hijo **sin cuenta propia** (`modo = hijo`); ver alertas, resúmenes y uso (panel de familia: `specs/28`) | Leer las conversaciones de un hijo con cuenta propia; usar modo hijo con un hijo que ya tiene cuenta; abrirlo para un alumno que no es su hijo |
| dirección / profesor / administrativo / portería | Nada en Nudito+ | Leer conversaciones (tampoco en la exportación del colegio) |
| super administrador | Configurar proveedor, topes y lista blanca (`ConfigPlataforma`, `SitioPermitido`) | Leer conversaciones (el modo soporte no tiene acceso a Nudito+) |

## Flujos
1. **Acceso** (`evaluarAccesoNuditoPlus` / `requireNuditoPlus`): colegio `pro` y módulo `nudito_plus` activo (nunca en modo soporte) → quien llama es el alumno (rol `alumno`, `alumnoDeLaCuenta`) o su apoderado (vínculo `ApoderadoAlumno`, y el hijo sin cuenta propia activa) → licencia vigente y consentimiento de IA vigente (`licencias.ts`, specs/28). Si falta licencia/consentimiento (o el hijo ya tiene cuenta) la página muestra un aviso amable; las actions responden 403.
2. **Turno de conversación** (`conversar`): límite de 20 mensajes/minuto por membresía → tope del mes (`verificarTope`) → filtro de entrada (`analizarEntrada`) → prompt de sistema con el contexto del alumno (`construirContexto`) → proveedor → filtro de salida (`analizarSalida`) → se guardan el mensaje del alumno (con metadato de tema en `intencion`) y la respuesta (con `tokensEntrada`/`tokensSalida`) y se suma `UsoNudito`.
3. **Filtro de entrada** (sin llamar al proveedor ni contar uso):
   - riesgo (autolesión, violencia/acoso, abuso; incluye jerga peruana: «me chancan», «me sacan la mugre»…) → `bloqueado = true`, respuesta segura que pide hablar con un adulto de confianza (Línea 100, Línea 113 opción 5) y `AlertaNudito` `seguridad` (texto resumido, sin citar al alumno);
   - desánimo → respuesta cálida, no bloquea, `AlertaNudito` `animo` (una por conversación);
   - insultos o contenido no apto → `bloqueado = true`, rechazo amable;
   - datos personales de otra persona (teléfono, dirección, notas… «de Valentina», «de mi compañero», «dónde vive») → `bloqueado = true`;
   - «dame la respuesta / hazme la tarea» → no se bloquea: el prompt lleva `GUIA_SIN_RESOLVER: si` y se guía sin resolver.
4. **Filtro de salida:** reemplaza respuestas no aptas, oculta correos y celulares y quita toda URL (con o sin esquema) cuyo dominio no esté en `SitioPermitido` activo (también subdominios) → «[enlace quitado]».
5. **Resumen semanal** (`generarResumenesSemanales`, cron `GET/POST /api/cron/nudito-plus` con `Authorization: Bearer <CRON_SECRET>`, lunes 13:00 UTC = 8:00 Lima en `vercel.json`): por cada alumno que conversó los últimos 7 días (hasta ayer) en un colegio Pro, un `ResumenNudito` con temas y «para reforzar», armado **solo con metadatos** (`intencion` = «área|tema|dificultad»). Si un tema tuvo 2+ mensajes con dificultad crea `AlertaNudito` `dificultad`. Idempotente por (alumno, desde, hasta). `generarResumenAlumno(tenantId, alumnoId, semana)` sirve para generarlo a mano.

## Reglas de negocio
- **Plan (decisión):** clave `nudito_plus` en `FEATURES` con plan `pro`, como **módulo fijo por plan** (`MODULOS_FIJOS_POR_PLAN` en `src/lib/modulos.ts`): lo activa solo el plan según el código, no el catálogo de la BD (`plan_modulos` no tiene la fila) ni los ajustes del panel, y no aparece en el panel de módulos. Se verifica además `ctx.tenant.plan === "pro"`. En colegios Base el ítem de menú queda oculto (sin candado).
- `NuditoConversacion.alumnoId` siempre con valor; `membershipId` = quien escribe (cuenta del alumno o del apoderado en modo hijo); `modo` = `alumno | hijo`. Una conversación solo la abre la misma membresía, para el mismo alumno y modo.
- Contenido según CNEB del grado: el prompt trae grado (`Salon.nivel/grado`), cursos del salón con sus competencias, desempeños del bimestre actual (los vinculados a evaluaciones del periodo vigente) o, si no hay, los del nivel y grado (specs/30), y tareas de los próximos 14 días. **Nada de otros alumnos.**
- Reglas del prompt (`REGLAS_NUDITO`): se presenta como IA, no reemplaza al profesor, nunca da la respuesta de una tarea, «tú» y frases cortas, contenido para su edad, deriva a un adulto, solo enlaces de la lista blanca, nunca malas noticias ni opina de notas.
- **Topes** (`limitesNudito()`, `ConfigPlataforma` «nudito_plus:limites», respaldo 300 mensajes / 300 000 tokens / 1,5 USD por alumno y mes Lima): al llegar a cualquiera, mensaje amable sin llamar al proveedor y **una** `AlertaNudito` `uso` por mes.
- **Costo:** `costoEstimadoUsd` con `costoEntradaUsdPorMillon`/`costoSalidaUsdPorMillon` de «nudito_plus:proveedor» (falso = 0).
- Proveedor caído: mensaje amable («Nudito está descansando un momento…»), no se guarda nada ni se cobra uso.
- La exportación del colegio (`specs/15`) **omite `NuditoMensaje`** (`TABLAS_OMITIDAS`).
- Avisos a la familia (`TipoAviso.nudito`) de alertas y resúmenes: pendiente (ver Pendientes).

## Modelo de datos
Migración `20261031130000_pro_completo_nudito_plus` (sin cambios de esquema en esta rama).

- **`NuditoConversacion`**: `membershipId`, `alumnoId`, `modo`. **`NuditoMensaje`**: `autor`, `cuerpo`, `intencion` (metadato «área|tema|ok|dificultad» o «filtro:<tipo>»), `derivado` (respuesta que deriva a un adulto), `tokensEntrada`, `tokensSalida`, `bloqueado`.
- **`UsoNudito`** (alumno, mes «AAAA-MM» Lima; `upsert` con `increment`), **`AlertaNudito`** (`seguridad | animo | dificultad | uso`), **`ResumenNudito`** (`temas` = `[{ area, tema, mensajes }]`), **`SitioPermitido`** (global).
- **`ConfigPlataforma`**: `nudito_plus:limites` → `{ mensajesPorMes, tokensPorMes, costoMaxUsdPorMes }`; `nudito_plus:proveedor` → `{ nombre: "falso", modelo, costoEntradaUsdPorMillon, costoSalidaUsdPorMillon }` (sin claves).

## Contratos de `src/lib/server`
```ts
// nudito-plus/proveedor.ts
interface ProveedorIA { nombre: string; responder({ sistema, mensajes, herramientas? }): Promise<{ texto; tokensEntrada; tokensSalida }> }
configProveedor(): Promise<ConfigProveedor>            // «nudito_plus:proveedor», respaldo «falso»
obtenerProveedor(config?): Promise<ProveedorIA>        // nombre desconocido → falso
// nudito-plus/proveedor-falso.ts (puro): ProveedorFalso, responderFalso(sistema, mensajes), estimarTokens(texto) = ceil(chars/4)
// nudito-plus/prompt.ts (puro): armarSistema(datos, { guiarSinResolver? }), leerDatosDelSistema(sistema), REGLAS_NUDITO
// nudito-plus/contexto.ts: datosDelAlumno(ctx.db, alumnoId, ahora?), construirContexto(ctx.db, alumnoId, opciones?)
// nudito-plus/seguridad.ts (puro): analizarEntrada(texto, { cursos? }), analizarSalida(texto, dominios),
//   quitarEnlacesNoPermitidos(texto, dominios), dominioPermitido(host, dominios), detalleAlertaSeguridad(cat, nombre)
// nudito-plus/temas.ts (puro): detectarTema(texto, cursos), codificarTema, decodificarTema
// nudito-plus/uso.ts: mesLima, topeAlcanzado (puro), costoEstimadoUsd (puro), usoDelMes, verificarTope, registrarUso
// nudito-plus/resumenes.ts: agregarTemas, textoResumen, semanaAnterior (puros), generarResumenAlumno, generarResumenesSemanales
// nudito-plus/acceso.ts: evaluarAccesoNuditoPlus(ctx, alumnoId, hoy?) → { ok, alumno, modo } | { ok:false, motivo }
//   requireNuditoPlus(ctx, alumnoId, hoy?) → 403 si no
// nudito-plus/conversar.ts: conversar(ctx, acceso, { conversacionId, texto }, { proveedor?, ahora? }),
//   listarConversacionesNudito(ctx, acceso), mensajesDeConversacion(ctx, acceso, id) (null si no es suya)
// nudito-plus/licencias.ts — VERSIÓN MÍNIMA; la real es de specs/28 con las mismas firmas:
//   licenciaVigente(db, tenantId, alumnoId, hoy?), consentimientoVigente(db, tenantId, alumnoId),
//   limitesNudito(), sitiosPermitidos()
```
Action: `enviarMensajeNuditoPlusAction({ alumnoId, conversacionId, texto })` en `src/app/colegio/[slug]/nudito-plus/chat/actions.ts`
(zod: texto 1–800; roles alumno/apoderado; `requireFeature(ctx, "nudito_plus")` + `requireNuditoPlus`).

## Rutas y UI
- `/nudito-plus/chat` (alumno): chat con la mascota (`NuditoMascota`, fuente `font-nudito`), aviso de IA al inicio, sugerencias por curso, historial de **sus** conversaciones (`?c=<id>` reabre una), botón «Nueva». Menú «Nudito+» (grupo Académico) solo para alumnos de colegios Pro.
- `/nudito-plus/hijo/[alumnoId]` (apoderado): mismo chat con el banner «Modo hijo: está usando Nudito+ <nombre>» y el botón «Salir del modo hijo» (va a `/inicio`). Se audita `ver · nudito_modo_hijo`.
- `/nudito-plus` (panel de la familia) es de `specs/28`.
- `GET|POST /api/cron/nudito-plus` (cron semanal de resúmenes).
- Accesible: `role="log"` con `aria-live="polite"`, foco vuelve al campo tras cada respuesta, Enter envía, Shift+Enter salto de línea, Esc borra el borrador; contador 0/800; mascota quieta con «reducir movimiento»; historial plegable debajo del chat en móvil y a la izquierda en escritorio.

## Textos y UX
- Aviso inicial: «Soy Nudito, un asistente con IA. Te ayudo a aprender; no reemplazo a tu profesor.»
- Sin licencia (alumno): «Pide a tu familia que active Nudito+». Familia: «Activa Nudito+ para <nombre>», «Acepta el uso de Nudito+ para <nombre>», «<nombre> ya tiene su propia cuenta».
- Tope: «¡Qué bien que practicaste tanto este mes! Ya usaste todos tus mensajes de Nudito+. El próximo mes seguimos…».
- Muy rápido: «Estás escribiendo muy rápido. Espera un momento e inténtalo de nuevo.»

## Errores y casos borde
- Licencia que vence a mitad de conversación: el siguiente mensaje responde 403 (la página muestra el aviso al recargar).
- Conversación ajena (otra membresía, otro alumno u otro modo): «No encontré esa conversación.» / 404 en la página.
- Hijo con cuenta propia en modo hijo → aviso; alumno de otra familia → 403.
- Colegio Base, modo soporte, profesor o dirección → 403.

## Pruebas
- unit: `tests/unit/nudito-plus-seguridad.test.ts` (riesgo, jerga, datos ajenos, trampa, URL fuera de la lista blanca, correos/celulares), `nudito-plus-proveedor-falso.test.ts` (determinismo, tokens, guía socrática, enlace permitido, tareas y desempeños), `nudito-plus-uso-resumenes.test.ts` (mes Lima, topes, costo, temas y resumen).
- integración: `tests/integracion/nudito-plus-tutor.test.ts` (sin licencia → 403; sin consentimiento; modo hijo solo para su hijo y sin cuenta propia; Base sin acceso; contexto aislado; conversación con tokens y uso; alerta de seguridad; proveedor caído; nadie más lee conversaciones ni salen en la exportación; resumen idempotente; tope con una alerta por mes; 20/min).
- e2e: `tests/e2e/nudito-plus-tutor.test.ts` (alumno con licencia recibe una guía con enlace permitido; la familia abre el modo hijo; hijo con cuenta propia → aviso). Con `CAPTURAS_DIR` guarda capturas de escritorio y 390 px.
- **Prueba manual** (tras `pnpm db:seed`, que crea a Lucas Huamán Soto, 5.° A, `lucas.huaman@nuevohorizonte.demo` / `demo123`, su madre `familia.huaman@familia.demo` / `demo123`, la lista blanca y dos conversaciones pasadas): crear licencia y consentimiento de IA con el panel de specs/28, o por SQL:
  ```sql
  insert into licencias_nudito (id, tenant_id, alumno_id, origen, desde, hasta, registrada_por, updated_at)
  select gen_random_uuid(), a.tenant_id, a.id, 'cortesia', current_date, current_date + 30, gen_random_uuid(), now()
  from alumnos a where (a.nombres, a.apellidos) in (('Lucas','Huamán Soto'), ('Mateo','Quispe Huamán'));
  insert into consentimientos_ia (id, tenant_id, apoderado_id, alumno_id, version_texto)
  select gen_random_uuid(), aa.tenant_id, aa.apoderado_id, aa.alumno_id, 'demo' from apoderados_alumnos aa
  join alumnos a on a.id = aa.alumno_id where (a.nombres, a.apellidos) in (('Lucas','Huamán Soto'), ('Mateo','Quispe Huamán'));
  ```
  Luego: Lucas → `http://nuevohorizonte.lvh.me:3000/nudito-plus/chat`; Rosa (`rosa.quispe@gmail.com`) → `/nudito-plus/hijo/<id de Mateo>`.

## Pendientes
- Elegir proveedor de IA real (y su política de datos de menores); sus claves irán en variables de entorno.
- Avisos a la familia (`TipoAviso.nudito`) por alertas y resúmenes nuevos; la UI de alertas/resúmenes es de specs/28.
- Panel de plataforma para `SitioPermitido`, topes y proveedor (hoy por seed/SQL).
- Retención de conversaciones (días) y acceso ante incidentes de seguridad.
- El filtro por palabras es una primera barrera; con el proveedor real sumar su moderación.
- Registrar el cron `nudito-plus` en el monitoreo de plataforma (`NOMBRES_CRON`, specs/21).
