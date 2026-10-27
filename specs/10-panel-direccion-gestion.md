# 10 — Panel de dirección y gestión

> Estado: implementado · Plan: Básico · Última actualización: 2026-10-26 (Claude Code, rama `feat/gestion`)

## Objetivo
Que dirección administre profesores, salones, alumnos y familias, configure el colegio y vea si los avisos llegan.

## Roles y permisos
Todo lo de esta spec es **solo dirección** (`requireRol` + `requireFeature(ctx, "gestion")`, en `exigirGestion`). Las familias solo ven `/consentimiento` y `/perfil`.

## Flujos
- **Inicio de dirección:** componente `inicio/ResumenDireccion.tsx` con llegaron / tarde / faltas / sin registrar de hoy por salón (fecha en `tenant.zonaHoraria`; por alumno prevalece la asistencia del día, `ambito = "dia"`).
- **Profesores** (`/gestion/profesores`): invitar (Supabase `inviteUserByEmail`, `redirectTo = urlRaiz("/auth/callback?next=/restablecer")`) crea `Profile` (con `genero` opcional) + `Membership` en estado **`invitada`** y encola el aviso `invitacion`; mientras no entre se muestra «Invitación pendiente» con la acción **«Reenviar invitación»** (`reenviarInvitacion`: nueva invitación de Supabase o enlace de recuperación si la cuenta ya existe) y pasa a `activa` en el primer ingreso (spec 02). Un profesor `invitada` ya puede asignarse como tutor o a un curso. Dirección puede indicar o cambiar el **género** del profesor (`Profile.genero`: femenino / masculino / no especifica) para que se le nombre «Tutora», «Profesor»…, ver `tituloProfesor` en `src/lib/roles.ts`; desactivar/reactivar (`estado = inactiva`, nunca se borra; al desactivar se liberan tutoría y cursos).
- **Salones y cursos** (`/gestion/salones`): crear, editar, borrar (solo vacío); tutor y profesor por curso; borrar curso solo sin asistencia, notas ni tareas.
- **Alumnos** (`/gestion/alumnos`): crear, editar, retirar/reactivar, filtrar por salón, **importar CSV** (`nombres, apellidos, codigo, salon`; todo o nada, errores por línea, máx. 500 filas y 1 MB).
- **Familias** (`/gestion/apoderados`): invitar al correo personal y vincular al alumno con parentesco; vincular más alumnos; quitar vínculos; ver estado del consentimiento.
- **Consentimiento** (`/consentimiento`): primer ingreso del apoderado; texto versionado en `src/lib/consentimiento.ts` (`CONSENTIMIENTO_VERSION`); crea `consentimientos` y lo enlaza a todos sus `apoderados_alumnos.consentimientoId`. Sin aceptar, `/inicio`, `/mensajes` y `/comunicados` redirigen aquí y no se le encolan avisos.
- **Configuración** (`/configuracion`): hora del resumen, hora límite de tardanza, modo de avisos, dominios de correo (únicos entre colegios), escala de calificación. **Logo**: subida real (PNG, JPG o WEBP, máx. 1 MB, validada por magic bytes) con `FileStorage` como archivo público; se guarda en `tenants.logo_archivo_id`, reemplaza y borra el anterior, y se puede quitar (`src/lib/server/logo.ts`: `subirLogoColegio`, `quitarLogoColegio`, `urlLogoColegio(tenant)`, `logoParaPdf`). Se muestra en el encabezado del colegio, en la libreta PDF (solo PNG/JPG) y en los carnets QR. SVG no se admite (el validador no lo soporta).
- **Avisos** (`/avisos`): tabla filtrable (estado, tipo, correo) y apertura de la semana (abiertos / enviados de los últimos 7 días; meta 70 %), con ícono + palabra.

## Reglas de negocio
- Toda escritura valida con zod, usa `ctx.db` con FKs escalares y llama a `auditar()`.
- Un apoderado «revocado» puede usar la plataforma pero no recibe avisos; «pendiente» debe aceptar primero.
- Las acciones de servidor obtienen el colegio del `Host` (`contextoDeAccion`), nunca del cliente.

## Modelo de datos
`memberships`, `profiles`, `salones`, `cursos`, `alumnos`, `apoderados_alumnos`, `consentimientos`, `tenants` (configuración), `avisos`.

## Contratos de `src/lib/server`
`gestion.ts` (invitarUsuario, reenviarInvitacion, cambiarGeneroProfesor, cambiarEstadoMembresia, listarProfesores, crear/editar/eliminarSalon|Curso, crear/editar/cambiarEstadoAlumno, importarAlumnosCsv, vincular/desvincular/invitarApoderado, listarApoderados), `configuracion.ts` (actualizarConfiguracion), `avisos-panel.ts` (panelAvisos, porcentajeApertura), `resumen-direccion.ts` (resumenAsistenciaHoy), `consentimiento.ts`, `notificaciones/encolar.ts` (`encolarAviso`, contrato de plantillas `mensaje_nuevo`, `comunicado`, `invitacion`).

## Errores y casos borde
Correo ya registrado con ese rol, código de alumno repetido, salón inexistente en el CSV, dominio usado por otro colegio, borrar salón con alumnos.

## Pruebas
- unit: `tests/unit/importar-alumnos.test.ts` · integración: `tests/integracion/gestion-mensajes-privacidad.test.ts`, `tests/integracion/invitaciones-y-logo.test.ts` · e2e: `tests/e2e/direccion-panel.test.ts`, `tests/e2e/ui-pendientes.test.ts` (logo).

## Pendientes
- Avisos enviados/abiertos/con error dentro del resumen del inicio (hoy están en `/avisos`).
- `supabase/config.toml`: agregar el puerto de cada entorno a `additional_redirect_urls` (hoy solo `:3000`) para que el enlace de invitación vuelva al puerto correcto.
