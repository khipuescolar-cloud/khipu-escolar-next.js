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
- `/gestion/**` es **solo dirección** (`exigirGestion`), salvo **Alumnos** y **Familias** (`exigirAlumnosFamilias`: dirección + `administrativo`). Profesor y portería reciben 403; el administrativo recibe 403 en profesores, personal, salones, carnets y configuración, también en las funciones de `src/lib/server/personal.ts`.
- **Permisos del `administrativo`** (ver `specs/03-planes-y-permisos.md`): Comunicados (crear y editar, para todo el colegio o un salón activo), Agenda (ver y crear eventos **de todo el colegio**; edita o borra solo los suyos), Gestión → Alumnos y Familias (alta, edición, retirar, importar CSV, invitar, reenviar invitación, vincular, activar/desactivar cuentas de familias), Avisos enviados (solo lectura). **Sin Mensajes** (el chat es familia ↔ profesor). Su `/gestion` solo muestra Alumnos y Familias; no ve documentos de las familias (la búsqueda por documento es solo de dirección).

## Flujos implementados
- **Alta** (`altaPersonal`): zod (`esquemaPersona`) → `crearCuentaConDocumento` (contraseña inicial = documento, cambio obligatorio) → membresía `activa` con `cargo` → `encolarBienvenida` (sin el número) → la acción de servidor dispara `procesarCola()` con `after()`. Correo ya existente en Khipu: solo membresía; la bienvenida dice que use su contraseña de siempre. Mismo rol ya registrado: error claro (si está inactiva, se indica reactivarla).
- **Lista** (`/gestion/profesores`, `/gestion/personal`): búsqueda por nombre, correo o documento; filtros por estado y, en profesores, por salón y curso; columnas nombre, documento, correo, teléfono, cursos, tutoría (o rol y cargo en personal) y estado. Mostrarla queda en la auditoría (`personal_lista`).
- **Ficha** (`/gestion/profesores/[id]`, `/gestion/personal/[id]`): datos personales y cargo editables (el correo es el usuario y no se edita), cursos y tutorías asignados, historial (`auditoria` de la membresía: vio, creó, editó con el **nombre** de los campos cambiados, nunca los valores), desactivar/reactivar (`cambiarEstadoMembresia`; nunca se borra; al desactivar un profesor se liberan tutorías y cursos) y **Reenviar bienvenida** (`reenviarBienvenida`; dice «contraseña inicial» solo si aún no la cambió). Abrir la ficha queda en la auditoría. Para invitaciones antiguas (`invitada`) se conserva «Reenviar invitación».
- **Grados y salones** (`/gestion/salones`): vista nivel → grado → sección con tutor, alumnos activos y cursos; crear, editar y cursos igual que antes. **Archivar salón** (`Salon.archivadoAt`; `archivarSalon`/`reactivarSalon`, con `BotonConfirmar`): el salón deja de salir al pasar lista y en los selectores (comunicados, tareas/notas vía `cursosDelDocente`, agenda, carnets, alumnos nuevos e importación CSV) y no admite alumnos nuevos ni comunicados o eventos propios; conserva alumnos, asistencia y notas, y las vistas históricas (libreta, asistencia de la familia) lo siguen mostrando. «Ver archivados» (`?archivados=1`) lista solo los archivados para reactivarlos. «Quitar salón vacío» aparece solo si no tiene alumnos ni cursos. Helper: `src/lib/server/salones-activos.ts` (`whereSalonActivo`, `salonesActivos`, `salonEsActivo`).
- **Importación CSV** (`importarPersonalCsv`, parser puro en `src/lib/importar-personal.ts`): columnas `nombres, apellidos, documento, correo` (obligatorias) más `tipo_documento, telefono, genero, fecha_nacimiento, direccion, cargo` (y `rol` = administrativo o porteria en el CSV de personal). Todo o nada: valida cada línea (datos, correos y documentos repetidos, rol ya registrado) y devuelve errores por línea; máx. 200 filas y 1 MB.
- **Navegación** de `/gestion`: Profesores, Personal, Grados y salones, Alumnos, Familias y Carnets. Apoderados mantienen la invitación por correo personal (`invitarUsuario` ahora solo admite `apoderado`).

## Contratos de `src/lib/server/personal.ts`
`altaPersonal`, `reenviarBienvenida`, `listarPersonal`, `obtenerFicha`, `editarFicha`, `importarPersonalCsv` (todas con `exigirGestion`). Quien llama a `altaPersonal`/`importarPersonalCsv`/`reenviarBienvenida` debe disparar `procesarCola()` (la acción lo hace con `after()`).

## Errores y casos borde
Documento inválido (DNI de 8 dígitos; CE/pasaporte 8–12 alfanuméricos), correo duplicado con el mismo rol, correo existente en otro colegio, CSV con líneas inválidas, salón con alumnos o cursos.

## Pruebas
- unit: `tests/unit/importar-personal.test.ts` · integración: `tests/integracion/gestion-p2.test.ts` (archivar salones, permisos del administrativo, familias, datos globales y reinicio de contraseña), `tests/integracion/crm-personal.test.ts` (alta sin DNI en el aviso, correo existente, 403, filtros, historial, CSV) e `invitaciones-y-logo.test.ts` (adaptada) · e2e: `tests/e2e/crm-personal.test.ts` (alta con DNI, correo en Mailpit, ingreso con DNI y cambio obligatorio; personal administrativo con su inicio) y `direccion-panel.test.ts`.

## Datos globales del perfil y contraseña
- Editar nombres, documento o teléfono cambia el `Profile` global. Si la persona tiene membresías en otros colegios, el formulario avisa «Estos datos también se ven en los otros colegios de esta persona» (`obtenerFicha().otrosColegios`; también en la edición de familias) y el cambio se audita con entidad `perfil_global` en este colegio y en cada uno de los otros (`auditarCambioGlobal`; solo nombres de campos, nunca valores).
- **Restablecer contraseña al documento** (`restablecerPasswordAlDocumento`, solo dirección, `BotonConfirmar` en «Más acciones»): `supabaseAdmin().auth.admin.updateUserById` con el documento actual como contraseña y `debeCambiarPassword = true`; auditado (`reinicioPassword: "documento"`), nunca muestra ni registra la contraseña. Variante «Restablecer y avisar por correo» que encola la plantilla `bienvenida` con `restablecida: true`: «Restablecimos tu contraseña: ahora es tu número de documento. Al entrar te pediremos cambiarla.» (sin el número; auditoría `reenvio: "restablecimiento"`). Test de plantilla en `tests/unit/plantillas-avisos.test.ts`. La cuenta es única: el reinicio también vale en los otros colegios de la persona (se advierte).

## Familias: buscador y paginación
`listarApoderados(ctx, { q, pagina })`: busca por nombre, correo, documento (solo dirección) o alumno; 20 por página (`FAMILIAS_POR_PAGINA`) con `pagination` de shadcn; parámetros `?q=&pagina=` en la URL.

## Pendientes
- Ninguno propio de este módulo.

## Cambios de interfaz (rediseño)
Las listas de profesores y personal usan `Table` en `Card` con barra de búsqueda y filtros; «Agregar profesor/personal» e «Importar CSV» están en el encabezado y abren un `Sheet`/`Dialog`. La ficha muestra avatar con iniciales, datos en lista descriptiva, historial en línea de tiempo, y «Editar datos» (Sheet) y acciones de cuenta (reenviar bienvenida, desactivar/reactivar con confirmación) en un menú. Sin cambios de comportamiento ni de campos.
