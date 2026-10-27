# 17 — CRM del colegio: profesores, personal y grados

> Estado: implementado · Última actualización: 2026-10-27 (Claude Code, rama `feat/crm-personal`) · Plan: Básico (gestión)

## Objetivo
Que la dirección administre a su gente desde el sistema: profesores, personal administrativo y grados/salones, con sus datos personales y correos.

## Datos de las personas (`profiles` + `memberships`)
- **Datos personales:** nombres, apellidos, tipo y número de documento (DNI de 8 dígitos), correo, teléfono, género, fecha de nacimiento y dirección.
- **Datos de la membresía:** cargo (`memberships.cargo`) y estado (invitada, activa o inactiva).
- Rol nuevo `administrativo` para el personal no docente (secretaría, auxiliares, psicología, contabilidad…). La portería sigue con su rol `porteria`.

## Alta de profesor o personal
- La dirección completa el formulario y se usa `crearCuentaConDocumento()` + membresía + `encolarBienvenida()`: la misma bienvenida que el super administrador (usuario = correo, contraseña inicial = DNI, cambio obligatorio).
- Si el correo ya tenía cuenta (p. ej. el profesor trabaja en otro colegio), solo se agrega la membresía y el correo le dice que use su contraseña de siempre.

## Pantallas (`/gestion/…`)
- **Profesores:**
  - lista con búsqueda, filtros (estado, salón o curso) y columnas (nombre, documento, correo, teléfono, cursos, tutoría y estado);
  - ficha con los datos personales editables, cursos y tutorías asignados, y la historia de cambios (auditoría);
  - acciones: desactivar o reactivar y reenviar la bienvenida.
- **Personal:** lo mismo para `administrativo` y `porteria`, con su cargo.
- **Grados y salones:** vista por nivel → grado → sección, con tutor, cantidad de alumnos y cursos. Se pueden crear, editar y archivar.
- **Importación CSV** de profesores y personal (opcional): todo o nada, con errores por línea.

## Reglas
- Solo la dirección. El documento y los datos personales solo los ve la dirección (no las familias ni otros profesores).
- Ver y editar fichas queda en la auditoría.
- Nunca se borra a una persona: se desactiva.

## Roles y permisos
- Todo `/gestion/**` es **solo dirección** (`requireTenantContext(slug, ["direccion"])` + `exigirGestion`). Profesor y administrativo reciben 403, también en las funciones de `src/lib/server/personal.ts`.
- El rol `administrativo` entra al sistema (prioridad de rol en `tenant.ts`) y su `/inicio` muestra **Comunicados** (solo lectura de los comunicados de todo el colegio). Mensajes y el resto de módulos no le corresponden por ahora.

## Flujos implementados
- **Alta** (`altaPersonal`): zod (`esquemaPersona`) → `crearCuentaConDocumento` (contraseña inicial = documento, cambio obligatorio) → membresía `activa` con `cargo` → `encolarBienvenida` (sin el número) → la acción de servidor dispara `procesarCola()` con `after()`. Correo ya existente en Khipu: solo membresía; la bienvenida dice que use su contraseña de siempre. Mismo rol ya registrado: error claro (si está inactiva, se indica reactivarla).
- **Lista** (`/gestion/profesores`, `/gestion/personal`): búsqueda por nombre, correo o documento; filtros por estado y, en profesores, por salón y curso; columnas nombre, documento, correo, teléfono, cursos, tutoría (o rol y cargo en personal) y estado. Mostrarla queda en la auditoría (`personal_lista`).
- **Ficha** (`/gestion/profesores/[id]`, `/gestion/personal/[id]`): datos personales y cargo editables (el correo es el usuario y no se edita), cursos y tutorías asignados, historial (`auditoria` de la membresía: vio, creó, editó con el **nombre** de los campos cambiados, nunca los valores), desactivar/reactivar (`cambiarEstadoMembresia`; nunca se borra; al desactivar un profesor se liberan tutorías y cursos) y **Reenviar bienvenida** (`reenviarBienvenida`; dice «contraseña inicial» solo si aún no la cambió). Abrir la ficha queda en la auditoría. Para invitaciones antiguas (`invitada`) se conserva «Reenviar invitación».
- **Grados y salones** (`/gestion/salones`): vista nivel → grado → sección con tutor, alumnos activos y cursos; crear, editar y cursos igual que antes. **Archivar:** el esquema no tiene un campo de archivado, así que solo se puede **quitar un salón vacío** (sin alumnos ni cursos), con el texto «Aún no hay archivado».
- **Importación CSV** (`importarPersonalCsv`, parser puro en `src/lib/importar-personal.ts`): columnas `nombres, apellidos, documento, correo` (obligatorias) más `tipo_documento, telefono, genero, fecha_nacimiento, direccion, cargo` (y `rol` = administrativo o porteria en el CSV de personal). Todo o nada: valida cada línea (datos, correos y documentos repetidos, rol ya registrado) y devuelve errores por línea; máx. 200 filas y 1 MB.
- **Navegación** de `/gestion`: Profesores, Personal, Grados y salones, Alumnos, Familias y Carnets. Apoderados mantienen la invitación por correo personal (`invitarUsuario` ahora solo admite `apoderado`).

## Contratos de `src/lib/server/personal.ts`
`altaPersonal`, `reenviarBienvenida`, `listarPersonal`, `obtenerFicha`, `editarFicha`, `importarPersonalCsv` (todas con `exigirGestion`). Quien llama a `altaPersonal`/`importarPersonalCsv`/`reenviarBienvenida` debe disparar `procesarCola()` (la acción lo hace con `after()`).

## Errores y casos borde
Documento inválido (DNI de 8 dígitos; CE/pasaporte 8–12 alfanuméricos), correo duplicado con el mismo rol, correo existente en otro colegio, CSV con líneas inválidas, salón con alumnos o cursos.

## Pruebas
- unit: `tests/unit/importar-personal.test.ts` · integración: `tests/integracion/crm-personal.test.ts` (alta sin DNI en el aviso, correo existente, 403, filtros, historial, CSV) e `invitaciones-y-logo.test.ts` (adaptada) · e2e: `tests/e2e/crm-personal.test.ts` (alta con DNI, correo en Mailpit, ingreso con DNI y cambio obligatorio; personal administrativo con su inicio) y `direccion-panel.test.ts`.

## Pendientes y brechas del esquema
- Sin campo de archivado en `salones` (p. ej. `archivadoAt`): hoy solo se quita un salón vacío.
- Editar nombres, documento o teléfono cambia el `Profile` global (vale en todos los colegios de la persona).
- El administrativo solo ve Comunicados; Mensajes, agenda, etc. quedan para cuando se definan sus permisos.
- Corregir el documento no cambia la contraseña de la persona.
