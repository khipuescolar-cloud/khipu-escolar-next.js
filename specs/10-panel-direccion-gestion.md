# 10 — Panel de dirección y gestión

> Estado: implementado · Plan: Khipu Base · Última actualización: 2026-11-03 (Claude Code: reglas académicas y plazo en días calendario, specs/37) · 2026-10-30 (Claude Code, rama `feat/carga-masiva`: carga masiva, DNI del alumno, CSV de alumnos hasta 1 500) · 2026-10-31 (Claude Code: grado mínimo para la cuenta del alumno; sin canales de pago) · 2026-10-30 (rama `feat/asistencia-colegio-cursos`: asistencia por curso por nivel en Configuración; dirección sin «Pasar lista»)

## Objetivo
Que dirección administre profesores, salones, alumnos y familias, configure el colegio y vea si los avisos llegan.

## Roles y permisos
Todo lo de esta spec es **solo dirección** (`requireRol` + `requireFeature(ctx, "gestion")`, en `exigirGestion`). Las familias solo ven `/consentimiento` y `/perfil`.

## Flujos
- **Inicio de dirección:** componente `inicio/ResumenDireccion.tsx` con llegaron / tarde / faltas / sin registrar de hoy por salón (fecha en `tenant.zonaHoraria`; solo la asistencia al colegio, `ambito = "dia"`: las listas de curso no cuentan, igual que en spec 27). Debajo, **«Avisos de hoy»** (solo con plan que incluya `avisos`): enviados, abiertos y con error (`error`, `rebotado` o `queja`) creados hoy en la zona del colegio (`resumenAvisosHoy`), con enlace «Ver todos los avisos» → `/avisos`; ícono + palabra y el color de error solo si hay errores.
- **Profesores y personal** (`/gestion/profesores`, `/gestion/personal`): ahora son un CRM con alta con datos personales (DNI, correo, cargo…), lista con filtros, ficha, desactivar/reactivar y reenviar bienvenida; el detalle está en `specs/17-crm-personal-colegio.md`. Ya no se invita a profesores por Supabase `inviteUserByEmail`: se crea la cuenta con el DNI como contraseña inicial. Se conservan `reenviarInvitacion` (apoderados y profesores antiguos en estado `invitada`) y `cambiarGeneroProfesor`. Un profesor `invitada` puede asignarse como tutor o a un curso; el género sigue definiendo «Tutora», «Profesor»… (`tituloProfesor`).
- **Carga masiva** (`/gestion/carga-masiva`, botón «Cargar desde archivo» en Grados y salones y en Familias): salones y cursos (solo dirección) y familias (dirección y administrativo) desde CSV o Excel, con plantilla, vista previa con errores por línea, confirmación y resumen; idempotente. Detalle en `specs/36-carga-masiva.md`.
- **Grados y salones** (`/gestion/salones`): vista nivel → grado → sección con tutor, alumnos y cursos; crear, editar, **archivar/reactivar** (`archivadoAt`, «Ver archivados») y quitar (solo vacío); tutor y profesor por curso; borrar curso solo sin asistencia, notas ni tareas.
- **Alumnos** (`/gestion/alumnos`): crear, editar, retirar/reactivar, filtrar por salón, **importar CSV** (`nombres, apellidos, codigo, salon` y, opcional, `documento`; todo o nada, errores por línea, máx. 1 500 filas y 2 MB). Campo opcional «DNI del alumno» (`Alumno.numeroDocumento`, único en el colegio), con el que la carga masiva enlaza a las familias.
- **Familias** (`/gestion/apoderados`): carga masiva (spec 36: cuenta con el documento como contraseña inicial y bienvenida por la cola; «Reenviar invitación» a esas familias vuelve a encolar la bienvenida); invitar al correo personal y vincular al alumno con parentesco; vincular más alumnos; quitar vínculos; editar nombres, apellidos y teléfono; ver estado del consentimiento; **buscador** (nombre, correo, documento o alumno) y **paginación** de 20 en 20. Alumnos y Familias también son del rol `administrativo` (specs/17 y specs/03); los salones archivados no admiten alumnos nuevos.
- **Consentimiento** (`/consentimiento`): primer ingreso del apoderado; texto versionado en `src/lib/consentimiento.ts` (`CONSENTIMIENTO_VERSION`); crea `consentimientos` y lo enlaza a todos sus `apoderados_alumnos.consentimientoId`. Sin aceptar, `/inicio`, `/mensajes` y `/comunicados` redirigen aquí y no se le encolan avisos.
- **Configuración** (`/configuracion`): hora límite de tardanza, dominios de correo (únicos entre colegios), escala de calificación, **plazo para justificar faltas (días calendario)** (1–30, 15 por defecto; spec 07) y **cuenta propia del alumno** (desde qué grado de primaria; ver abajo). Ya **no** se configuran el «Modo de avisos» ni la «Hora del resumen de llegadas»: cada llegada se avisa al cerrar la lista (spec 04/06); `actualizarConfiguracion` rechaza `modoAvisos` y `horaEnvioAvisos` («El modo y la hora de los avisos ya no se configuran…») y las columnas `Tenant.modoAvisos`/`horaEnvioAvisos` quedan sin uso en la BD. **Logo**: subida real (PNG, JPG o WEBP, máx. 1 MB, validada por magic bytes) con `FileStorage` como archivo público; se guarda en `tenants.logo_archivo_id`, reemplaza y borra el anterior, y se puede quitar (`src/lib/server/logo.ts`: `subirLogoColegio`, `quitarLogoColegio`, `urlLogoColegio(tenant)`, `logoParaPdf`). Se muestra en el encabezado del colegio, en la libreta PDF y los carnets en PDF (WEBP se convierte a PNG con `sharp`) y en los carnets QR. SVG no se admite (el validador no lo soporta).
- **Reglas académicas** (`/configuracion`, tarjeta propia, solo con el módulo Notas; specs/37): consecuencia al vencer el plazo sin justificar (AD/A/B/C o 0–20 según la escala; vacío = sin configurar, el NSP se mantiene) (la hora del resumen académico diario se quitó: specs/38). `actualizarReglasAcademicas` (solo dirección) audita antes/después. Si hay NSP vencidos sin consecuencia, la tarjeta lo avisa.
- **Asistencia por curso** (`/configuracion`, tarjeta propia con su botón «Guardar asistencia por curso»): una casilla por nivel (Inicial, Primaria, Secundaria; Academia solo si el colegio tiene salones de academia), con cuántos salones activos tiene cada uno. `actualizarAsistenciaPorCurso(ctx, niveles)` valida con zod (`Nivel[]`, sin repetidos, en orden fijo), guarda `tenants.asistencia_por_curso_niveles` y audita `{ asistenciaPorCursoNiveles: { antes, ahora } }`. Efecto en la spec 04.
- **Menú de dirección:** sin «Pasar lista» (es tarea del profesor; spec 04). La asistencia se ve y se corrige en «Reportes de asistencia» (spec 27).
- **Avisos** (`/avisos`, también solo lectura para `administrativo`): tabla filtrable (estado, tipo, correo) y apertura de la semana (abiertos / enviados de los últimos 7 días; meta 70 %), con ícono + palabra.

## Reglas de negocio
- Toda escritura valida con zod, usa `ctx.db` con FKs escalares y llama a `auditar()`.
- Un apoderado «revocado» puede usar la plataforma pero no recibe avisos; «pendiente» debe aceptar primero.
- Las acciones de servidor obtienen el colegio del `Host` (`contextoDeAccion`), nunca del cliente.

## Modelo de datos
`memberships`, `profiles`, `salones`, `cursos`, `alumnos`, `apoderados_alumnos`, `consentimientos`, `tenants` (configuración), `avisos`.

## Contratos de `src/lib/server`
`carga-masiva.ts` (previsualizar/importar Salones y Familias, spec 36), `gestion.ts` (invitarUsuario [solo apoderados], reenviarInvitacion, cambiarGeneroProfesor, cambiarEstadoMembresia, listarProfesores, crear/editar/eliminarSalon|Curso, crear/editar/cambiarEstadoAlumno, importarAlumnosCsv, vincular/desvincular/invitarApoderado, listarApoderados), `personal.ts` (altaPersonal, reenviarBienvenida, listarPersonal, obtenerFicha, editarFicha, importarPersonalCsv), `configuracion.ts` (actualizarConfiguracion, actualizarAsistenciaPorCurso, actualizarReglasAcademicas), `avisos-panel.ts` (panelAvisos, porcentajeApertura), `resumen-direccion.ts` (resumenAsistenciaHoy), `consentimiento.ts`, `notificaciones/encolar.ts` (`encolarAviso`, contrato de plantillas `mensaje_nuevo`, `comunicado`, `invitacion`).

## Errores y casos borde
Correo ya registrado con ese rol, código de alumno repetido, salón inexistente en el CSV, dominio usado por otro colegio, borrar salón con alumnos.

## Pruebas
- unit: `tests/unit/importar-alumnos.test.ts`, `tests/unit/carga-masiva-archivos.test.ts` · integración: `tests/integracion/carga-masiva.test.ts`, `tests/integracion/dia-a-dia-offline-plazo.test.ts` (plazo en días hábiles 1–30; rechaza modo/hora de avisos), `tests/integracion/gestion-mensajes-privacidad.test.ts`, `tests/integracion/invitaciones-y-logo.test.ts`, `tests/integracion/crm-personal.test.ts`, `tests/integracion/gestion-p2.test.ts` · e2e: `tests/e2e/direccion-panel.test.ts`, `tests/e2e/ui-pendientes.test.ts` (logo). · e2e: `tests/e2e/dia-a-dia-offline-calendario.test.ts` (avisos de hoy en el inicio), `tests/e2e/direccion-panel.test.ts`, `tests/e2e/ui-pendientes.test.ts` (logo).

## Cuenta propia del alumno: grado mínimo
- `Tenant.gradoMinimoCuentaAlumno` (`grado_minimo_cuenta_alumno`, entero, **5** por defecto): grado de **primaria** (1–6) desde el que un alumno puede tener cuenta propia. **Secundaria** (y academia) siempre; **inicial** nunca.
- Se fija en `/configuracion` (solo dirección), sección «Cuenta propia del alumno»: selector «Desde qué grado de primaria» (1.° a 6.°). `actualizarConfiguracion` lo valida con zod (entero 1..6; error «El grado mínimo para la cuenta propia del alumno va de 1.° a 6.° de primaria.») y lo audita con el resto.
- `crearCuentaAlumno` (`gestion-cuentas-alumno.ts`) lo exige con `motivoSinCuentaPorGrado(nivel, grado, minimo)` (`src/lib/cuenta-alumno.ts`): primaria por debajo del mínimo → «Este colegio da cuenta propia desde X.° de primaria.»; inicial → «En inicial el alumno no tiene cuenta propia.». Si el salón de primaria no tiene `grado` registrado, no se bloquea (no se puede saber).
- Pruebas: unit `tests/unit/grado-minimo-cuenta-alumno.test.ts`; integración `tests/integracion/dia-a-dia-offline-plazo.test.ts` (validación 1..6) y `tests/integracion/rol-alumno.test.ts` (bloqueo por grado e inicial).
- WhatsApp y SMS se retiraron el 2026-10-31: ya no hay sección «Canales de pago» (`specs/06`).

## Pendientes
- Ninguno propio del módulo.

## Cambios de interfaz (rediseño)
Hub de gestión con tarjetas y pestañas de sección en las subpáginas; alumnos, familias, salones y carnets siguen el sistema de diseño (specs/18): formularios de alta en `Dialog`/`Sheet`, acciones por fila en menú con confirmación, estados vacíos y avance de carnets con `Progress`. Configuración se agrupa en secciones (avisos, dominio, escala, cuenta propia del alumno, logo, privacidad); «Quitar logo» ahora pide confirmación. Auditoría con ícono por acción. Sin cambios de lógica.

## Redirect URLs locales
`supabase/config.toml` permite `lvh.me` y `*.lvh.me` en los puertos 3000–3030, así el enlace de invitación y recuperación vuelve al puerto del worktree.
