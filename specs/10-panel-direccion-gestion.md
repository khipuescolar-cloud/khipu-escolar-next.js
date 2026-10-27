# 10 — Panel de dirección y gestión

> Estado: implementado · Plan: Básico · Última actualización: 2026-10-27 (Claude Code, rama `feat/crm-personal`)

## Objetivo
Que dirección administre profesores, salones, alumnos y familias, configure el colegio y vea si los avisos llegan.

## Roles y permisos
Todo lo de esta spec es **solo dirección** (`requireRol` + `requireFeature(ctx, "gestion")`, en `exigirGestion`). Las familias solo ven `/consentimiento` y `/perfil`.

## Flujos
- **Inicio de dirección:** componente `inicio/ResumenDireccion.tsx` con llegaron / tarde / faltas / sin registrar de hoy por salón (fecha en `tenant.zonaHoraria`; por alumno prevalece la asistencia del día, `ambito = "dia"`).
- **Profesores y personal** (`/gestion/profesores`, `/gestion/personal`): ahora son un CRM con alta con datos personales (DNI, correo, cargo…), lista con filtros, ficha, desactivar/reactivar y reenviar bienvenida; el detalle está en `specs/17-crm-personal-colegio.md`. Ya no se invita a profesores por Supabase `inviteUserByEmail`: se crea la cuenta con el DNI como contraseña inicial. Se conservan `reenviarInvitacion` (apoderados y profesores antiguos en estado `invitada`) y `cambiarGeneroProfesor`. Un profesor `invitada` puede asignarse como tutor o a un curso; el género sigue definiendo «Tutora», «Profesor»… (`tituloProfesor`).
- **Grados y salones** (`/gestion/salones`): vista nivel → grado → sección con tutor, alumnos y cursos; crear, editar, **archivar/reactivar** (`archivadoAt`, «Ver archivados») y quitar (solo vacío); tutor y profesor por curso; borrar curso solo sin asistencia, notas ni tareas.
- **Alumnos** (`/gestion/alumnos`): crear, editar, retirar/reactivar, filtrar por salón, **importar CSV** (`nombres, apellidos, codigo, salon`; todo o nada, errores por línea, máx. 500 filas y 1 MB).
- **Familias** (`/gestion/apoderados`): invitar al correo personal y vincular al alumno con parentesco; vincular más alumnos; quitar vínculos; editar nombres, apellidos y teléfono; ver estado del consentimiento; **buscador** (nombre, correo, documento o alumno) y **paginación** de 20 en 20. Alumnos y Familias también son del rol `administrativo` (specs/17 y specs/03); los salones archivados no admiten alumnos nuevos.
- **Consentimiento** (`/consentimiento`): primer ingreso del apoderado; texto versionado en `src/lib/consentimiento.ts` (`CONSENTIMIENTO_VERSION`); crea `consentimientos` y lo enlaza a todos sus `apoderados_alumnos.consentimientoId`. Sin aceptar, `/inicio`, `/mensajes` y `/comunicados` redirigen aquí y no se le encolan avisos.
- **Configuración** (`/configuracion`): hora del resumen, hora límite de tardanza, modo de avisos, dominios de correo (únicos entre colegios), escala de calificación. **Logo**: subida real (PNG, JPG o WEBP, máx. 1 MB, validada por magic bytes) con `FileStorage` como archivo público; se guarda en `tenants.logo_archivo_id`, reemplaza y borra el anterior, y se puede quitar (`src/lib/server/logo.ts`: `subirLogoColegio`, `quitarLogoColegio`, `urlLogoColegio(tenant)`, `logoParaPdf`). Se muestra en el encabezado del colegio, en la libreta PDF (solo PNG/JPG) y en los carnets QR. SVG no se admite (el validador no lo soporta).
- **Avisos** (`/avisos`, también solo lectura para `administrativo`): tabla filtrable (estado, tipo, correo) y apertura de la semana (abiertos / enviados de los últimos 7 días; meta 70 %), con ícono + palabra.

## Reglas de negocio
- Toda escritura valida con zod, usa `ctx.db` con FKs escalares y llama a `auditar()`.
- Un apoderado «revocado» puede usar la plataforma pero no recibe avisos; «pendiente» debe aceptar primero.
- Las acciones de servidor obtienen el colegio del `Host` (`contextoDeAccion`), nunca del cliente.

## Modelo de datos
`memberships`, `profiles`, `salones`, `cursos`, `alumnos`, `apoderados_alumnos`, `consentimientos`, `tenants` (configuración), `avisos`.

## Contratos de `src/lib/server`
`gestion.ts` (invitarUsuario [solo apoderados], reenviarInvitacion, cambiarGeneroProfesor, cambiarEstadoMembresia, listarProfesores, crear/editar/eliminarSalon|Curso, crear/editar/cambiarEstadoAlumno, importarAlumnosCsv, vincular/desvincular/invitarApoderado, listarApoderados), `personal.ts` (altaPersonal, reenviarBienvenida, listarPersonal, obtenerFicha, editarFicha, importarPersonalCsv), `configuracion.ts` (actualizarConfiguracion), `avisos-panel.ts` (panelAvisos, porcentajeApertura), `resumen-direccion.ts` (resumenAsistenciaHoy), `consentimiento.ts`, `notificaciones/encolar.ts` (`encolarAviso`, contrato de plantillas `mensaje_nuevo`, `comunicado`, `invitacion`).

## Errores y casos borde
Correo ya registrado con ese rol, código de alumno repetido, salón inexistente en el CSV, dominio usado por otro colegio, borrar salón con alumnos.

## Pruebas
- unit: `tests/unit/importar-alumnos.test.ts` · integración: `tests/integracion/gestion-mensajes-privacidad.test.ts`, `tests/integracion/invitaciones-y-logo.test.ts`, `tests/integracion/crm-personal.test.ts`, `tests/integracion/gestion-p2.test.ts` · e2e: `tests/e2e/direccion-panel.test.ts`, `tests/e2e/ui-pendientes.test.ts` (logo).

## Pendientes
- Avisos enviados/abiertos/con error dentro del resumen del inicio (hoy están en `/avisos`).

## Cambios de interfaz (rediseño)
Hub de gestión con tarjetas y pestañas de sección en las subpáginas; alumnos, familias, salones y carnets siguen el sistema de diseño (specs/18): formularios de alta en `Dialog`/`Sheet`, acciones por fila en menú con confirmación, estados vacíos y avance de carnets con `Progress`. Configuración se agrupa en secciones (avisos, dominio, escala, logo, privacidad); «Quitar logo» ahora pide confirmación. Auditoría con ícono por acción. Sin cambios de lógica.

## Redirect URLs locales
`supabase/config.toml` permite `lvh.me` y `*.lvh.me` en los puertos 3000–3030, así el enlace de invitación y recuperación vuelve al puerto del worktree.
