# 17 — CRM del colegio: profesores, personal y grados

> Estado: borrador (requisitos) · Última actualización: 2026-10-27 (Claude Code). Quien lo implemente completa las secciones de la plantilla. · Plan: Básico (gestión)

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
