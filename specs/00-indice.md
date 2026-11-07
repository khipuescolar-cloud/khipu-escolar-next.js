# Índice de specs — Khipu Escolar

Cada módulo tiene su spec. Se actualiza en el mismo commit que cambia el comportamiento (ver `AGENTS.md`).

Planes institucionales (desde el 2026-10-31): **Khipu Base** (`base`) y **Khipu Pro** (`pro`); ver `03-planes-y-permisos.md`.

| # | Spec | Plan | Estado |
|---|---|---|---|
| 01 | [Arquitectura multitenant](01-arquitectura-multitenant.md) | Todos | implementado (base) |
| 02 | [Autenticación y login](02-autenticacion-login.md) | Todos | implementado |
| 03 | [Planes y permisos](03-planes-y-permisos.md) | Todos | implementado |
| 04 | [Asistencia (al colegio y por curso; pasar lista y corregir)](04-asistencia.md) | Khipu Base | implementado |
| 05 | [Portería con carnet QR](05-porteria-qr.md) | Khipu Base | implementado |
| 06 | [Avisos y notificaciones](06-avisos-notificaciones.md) | Khipu Base | implementado |
| 07 | [Justificaciones](07-justificaciones.md) | Khipu Base | implementado |
| 08 | [Chat familia ↔ profesor](08-chat-familia-profesor.md) | Khipu Base | implementado |
| 09 | [Comunicados](09-comunicados.md) | Khipu Base | implementado |
| 10 | [Panel de dirección y gestión](10-panel-direccion-gestion.md) | Khipu Base | implementado |
| 11 | [Notas y libreta](11-notas-y-libreta.md) | Khipu Pro | implementado |
| 12 | [Tareas y agenda](12-tareas-y-agenda.md) | Khipu Pro | implementado |
| 13 | [Nudito (asistente para familias, retirado)](13-nudito.md) | — | retirado 2026-10-31; Nudito vuelve como tutor de Khipu Pro (specs/41) |
| 14 | [Archivos (Cloudinary → S3)](14-archivos-cloudinary.md) | Todos | implementado |
| 15 | [Privacidad, auditoría y exportación](15-privacidad-auditoria-exportacion.md) | Todos | implementado |
| 16 | [Plataforma: super administrador](16-plataforma-superadmin.md) | Interno | implementado |
| 17 | [CRM del colegio: profesores, personal y grados](17-crm-personal-colegio.md) | Khipu Base | implementado |
| 18 | [Sistema de diseño (tema, colores, formas, estilos)](18-sistema-de-diseno.md) | Todos | implementado (base) |
| 19 | [Planes, módulos y roles (desde la BD)](19-planes-modulos-y-roles.md) | Interno | implementado |
| 20 | [Responsables del colegio y suscripciones](20-responsables-y-suscripciones.md) | Interno | implementado |
| 21 | [Operación de plataforma: usuarios, monitoreo y auditoría](21-operacion-de-plataforma.md) | Interno | implementado |
| 22 | [Equipo Khipu, anuncios y configuración de la plataforma](22-equipo-anuncios-y-configuracion.md) | Interno | implementado |
| 23 | [Mesa de ayuda (chat del colegio con el equipo Khipu)](23-mesa-de-ayuda.md) | Todos | implementado |
| 24 | [App instalable (PWA) y camino a tiendas](24-app-instalable.md) | Todos | implementado |
| 25 | [Landing pública (sitio de Khipu Escolar)](25-landing-publica.md) | Público | implementado |
| 26 | [Solicitudes de demo (panel de plataforma)](26-solicitudes-de-demo.md) | Interno | implementado |
| 27 | [Reportes de asistencia (general del colegio, por curso, alumno, salón, fechas; Excel y PDF)](27-reportes-asistencia.md) | Base (asistencia) | implementado (integración y e2e pendientes de correr) |
| 28 | [Licencias de Nudito+ (por alumno, pago con Yape)](28-licencias-nudito-plus.md) | — | obsoleto (inerte), ver specs/44 |
| 29 | [Nudito+ (tutor IA por alumno)](29-nudito-plus-tutor.md) | — | reemplazado por specs/41 |
| 30 | [Capacidades y desempeños del CNEB](30-capacidades-desempenos.md) | Khipu Pro | implementado |
| 31 | [Documentos: materiales de clase, gestión académica, biblioteca y borradores](31-documentos.md) | Khipu Pro | explorador implementado; reestructuración especificada (2026-11-07) |
| 32 | [Reuniones (convocatoria, confirmación y acta)](32-reuniones.md) | Khipu Pro | implementado |
| 33 | [Tablero de dirección](33-tablero-direccion.md) | Khipu Pro | implementada |
| 34 | [Horario semanal por salón («Mi horario», plantillas de horario, sin cruces de profesores)](34-horario.md) | Khipu Base y Pro | implementado |
| 35 | [Datos demo (un colegio piloto) y datos de prueba](35-datos-demo-y-pruebas.md) | Interno (desarrollo) | implementado |
| 36 | [Carga masiva: salones y cursos, y familias (CSV/Excel)](36-carga-masiva.md) | Khipu Base (gestión) | implementado |
| 38 | [Notificaciones académicas por eventos (bandeja y Web Push)](38-notificaciones-academicas.md) | Khipu Pro | implementado |
| 39 | [Tareas estilo Classroom: secciones, entregas, revisión y calificación](39-tareas.md) | Khipu Pro | implementado |
| 40 | [Disponibilidad del personal y reuniones institucionales (asistente, reservas sin choques, solicitudes, acuerdos)](40-disponibilidad-y-reuniones.md) | Khipu Pro | implementado |
| 41 | [Nudito, tutor educativo de Khipu Pro (visión general y sesiones)](41-nudito-tutor.md) | Khipu Pro | en desarrollo (paso 0: contratos) |
| 42 | [Nudito: currículo, áreas de los cursos y validación de temas](42-nudito-curriculo.md) | Khipu Pro | borrador |
| 43 | [Nudito: práctica, evaluación y dominio por habilidad](43-nudito-practica-y-dominio.md) | Khipu Pro | borrador |
| 44 | [Nudito: seguimiento, gobierno institucional, privacidad y fin de las licencias familiares](44-nudito-seguimiento-y-gobierno.md) | Khipu Pro | borrador |
| 37 | [NSP, justificaciones, recuperación, incidencias y libretas emitidas](37-nsp-justificaciones-recuperacion.md) | Khipu Base / Pro | implementado |
| 45 | [Almacenamiento centralizado, carga directa, cuotas y observabilidad](45-almacenamiento-y-cuotas.md) | Khipu Pro (Base: medición) | especificado, sin implementar |
| 46 | [Solicitudes documentales (gestión académica: estados, versiones y revisión)](46-solicitudes-documentales.md) | Khipu Pro | especificado, sin implementar |
| 47 | [Registro de notas](47-registro-de-notas.md) | Khipu Pro | en desarrollo (PASO 0: contrato y esquema) |
