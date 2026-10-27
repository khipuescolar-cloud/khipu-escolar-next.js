# 08 — Chat familia ↔ profesor

> Estado: borrador (requisitos) · Última actualización: 2026-10-26 (Claude Code). Quien lo implemente completa las secciones de la plantilla. · Plan: Básico

## Reglas
- Conversación = (alumno, profesor, apoderado). El apoderado puede escribir al tutor y a los profesores de los cursos de su hijo. El profesor puede escribir a los apoderados de sus alumnos.
- **Nunca se muestran teléfonos ni correos** de la otra parte, solo el nombre y el rol («Lucía García · Tutora de 3.° B»).
- Mensajes de texto (máximo 2000). Leído/no leído (`leidoAt`). Contador de no leídos en el mosaico.
- Aviso por correo o push de un mensaje nuevo, como máximo 1 cada 15 minutos por conversación (no por mensaje).
- Dirección puede ver las conversaciones (auditado) y no puede escribir en nombre de otros.
- Actualización: *polling* cada 10 s o revalidación tras enviar (sin Realtime en el MVP).

## Rutas
`/mensajes` (bandeja) y `/mensajes/[id]` (hilo). Botón «Escribir a la tutora» desde la asistencia del hijo.
