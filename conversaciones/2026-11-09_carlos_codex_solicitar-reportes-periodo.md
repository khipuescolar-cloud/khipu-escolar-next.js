# Solicitud de reportes periódicos

| Campo | Valor |
|---|---|
| Fecha | 2026-11-09 |
| Colaborador | Carlos |
| Agente y modelo | Codex · GPT-6 |
| Rama y commits | `feat/solicitar-reportes` · commit local de esta sesión |
| Specs afectadas | `specs/47-registro-de-notas.md`, `specs/06-avisos-notificaciones.md` |

## Pedidos del colaborador (textual)

> «en reporte periodico puedes crear un boton para poder notificar a los profesores que enseñan a mi salon que esta bajo mi tutoria que ya deberian enviar su reporte periodico, seria como un correo, asi que deberias dejarme mostrarme el titulo con la sugerencia de , Solicitud de Reportes periodico para el bimestr; una pequeña descripcion de manera opcional y listo, enviar el correo y notificacion obviamente»

## Decisiones

- Solo tutor del salón o dirección puede solicitar; el periodo y el salón se validan con la BD del colegio.
- Un profesor con varios cursos pendientes recibe una sola solicitud; no se incluye al remitente ni a cursos cerrados.
- La clave por salón, periodo y día local limita el envío; bandeja siempre, correo y push según preferencias. El correo queda en la cola local de pruebas.

## Cambios realizados

- `src/lib/server/calificacion-periodo.ts`: servicio, agrupación de destinatarios, límite diario y auditoría.
- `src/app/colegio/[slug]/notas/salon/[salonId]/periodo/page.tsx, ReporteSalon.tsx y actions.ts`: botón, diálogo y action.
- `src/lib/server/email/plantillas/index.ts`, `prisma/schema.prisma`, `prisma/migrations/20261109120000_reporte_periodo_notificacion/migration.sql`: plantilla, tipo y migración.
- `tests/integracion/solicitar-reportes-periodo.test.ts`, `tests/unit/plantillas-avisos.test.ts`: permisos, destinatarios, límite, correo y render.
- `specs/47-registro-de-notas.md`, `specs/06-avisos-notificaciones.md`: reglas y canales.

## Validación

- `pnpm exec prisma migrate deploy`: aplicado en `127.0.0.1:54322`.
- `pnpm lint`: aprobado.
- `pnpm typecheck`: aprobado tras `pnpm exec next typegen`.
- `pnpm test`: 164 archivos y 1327 pruebas aprobadas.

## Pendientes y preguntas abiertas

- Ninguno.
