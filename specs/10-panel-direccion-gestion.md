# 10 — Panel de dirección y gestión

> Estado: borrador (requisitos) · Última actualización: 2026-10-26 (Claude Code). Quien lo implemente completa las secciones de la plantilla. · Plan: Básico

## Inicio de dirección
- Mosaicos por rol (`src/lib/navegacion.ts`, ya implementado).
- Resumen del día: llegaron, tarde, faltas y sin registrar por salón, más los avisos enviados, abiertos y con error.

## Gestión (`/gestion`)
- **Profesores:** invitar por correo (Supabase `inviteUserByEmail` o creación con un enlace para fijar la contraseña), desactivar (`estado=inactiva`, nunca borrar), asignar tutoría y cursos.
- **Salones y cursos:** crear y editar (nivel, grado, sección, año).
- **Alumnos:** crear, editar, retirar e importar CSV (nombres, apellidos, código, salón).
- **Apoderados:** invitar al correo personal y vincular a alumnos (parentesco). Al entrar por primera vez aceptan el **consentimiento** versionado (tabla `consentimientos`); sin consentimiento no reciben avisos.
- **Carnets QR** (spec 05).

## Configuración (`/configuracion`)
- Hora de envío del resumen y modo de avisos (`todos` / `solo_excepciones`), hora límite de tardanza.
- Logo (spec 14) y dominios de correo del colegio.
- Escala de calificación (literal o vigesimal; spec 11).
- Exportar los datos del colegio (spec 15).

## Avisos (`/avisos`)
Tabla filtrable con el estado de cada aviso y el % de apertura de la semana (meta: 70 %).
