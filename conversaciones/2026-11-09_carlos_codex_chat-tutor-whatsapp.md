# Chat solo con tutores y rediseño de Mensajes

| Campo | Valor |
|---|---|
| Fecha | 2026-11-09 |
| Colaborador | Carlos |
| Agente y modelo | Codex · GPT-6 |
| Rama y commits | feat/chat-tutor-whatsapp · Restrict chat to tutors and redesign messages like a messenger |
| Specs afectadas | specs/08-chat-familia-profesor.md |

## Pedidos del colaborador (textual)
> «dentro de este modulo de mensajes, quiero que se vea profesional y ademas la regla seria que solo los padres de familia se pueden comunicar con los tutores, no con cualquier profesor; de igual manera los profesores solo se pueden comunicar con los padres de los alumnos bajo su tutoria, quiero que el chat se vea como wsp, que tenga mucho profesionalismo»

## Decisiones
- La tutoría vigente determina a quién se puede escribir; el historial anterior sigue visible en solo lectura.
- El patrón de interacción del chat usa los tokens y componentes de Khipu, sin marca ni colores de WhatsApp.

## Cambios realizados
- src/lib/server/mensajes.ts: destinatarios, vigencia y autorización de envío.
- src/app/colegio/[slug]/mensajes/: bandeja, hilo, contactos y skeletons.
- prisma/seed-comunicacion.ts: conversaciones demo solo de tutorías.
- tests/unit/mensajes-etiquetas.test.ts, tests/integracion/gestion-mensajes-privacidad.test.ts y tests/e2e/chat-familia-profesor.test.ts: casos de privacidad, presentación y flujo.
- tests/integracion/permisos-salida-reportes.test.ts: fecha fija para evitar colisión entre fixtures en el día actual.
- specs/08-chat-familia-profesor.md: permisos y experiencia actualizados.

## Validación
- pnpm lint: correcto.
- pnpm typecheck: correcto.
- pnpm test: correcto tras aislar la fecha de fixture de asistencia.
- E2E_PORT=3060 APP_BASE_DOMAIN=lvh.me:3060 NEXT_DIST_DIR=.next-e2e pnpm exec playwright test tests/e2e/chat-familia-profesor.test.ts: 1 prueba correcta.
- Capturas Playwright: scratchpad/capturas (seis vistas).
- git checkout tsconfig.json: ejecutado tras e2e.

## Pendientes y preguntas abiertas
- Ninguno previsto.
