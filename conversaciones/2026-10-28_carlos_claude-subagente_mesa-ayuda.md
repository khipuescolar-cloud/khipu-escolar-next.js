# Mesa de ayuda: chat del colegio con el equipo de soporte de Khipu

| Campo | Valor |
|---|---|
| Fecha | 2026-10-28 |
| Colaborador | Carlos (fundador) · vía orquestador Claude Code |
| Agente y modelo | Claude Code (subagente) · claude-opus-5-5 |
| Rama y commits | `feat/mesa-ayuda` · ver `git log` de la rama («Add support desk chat for schools and Khipu team») |
| Specs afectadas | `specs/23-mesa-de-ayuda.md` (nueva), `specs/00-indice.md`, `specs/16-plataforma-superadmin.md` |

## Pedidos del colaborador (textual)
> puedes agregarle una nueva funcionalidad para el soporte tecnico, sera como un chat en el cual el director o la persona que tendra el permiso , podra entrar y hablar directamente com mi equipo de soporte

## Decisiones
- Esquema, migración, módulo `soporte` y entrada «Mesa de ayuda» de la barra lateral ya venían en `main`; no se tocaron.
- Visibilidad en el colegio: dirección ve todas; el administrativo (si se le habilita el módulo) ve las suyas y las que abrió la dirección, no las de otros administrativos.
- «Soporte Khipu» se agregó a `FEATURES_PRIVADAS_SOPORTE`: en modo soporte no se muestra; el equipo responde desde `/mesa-ayuda`.
- Notas internas filtradas en el servidor en cada consulta del colegio (hilo, lista, contadores y descarga de capturas).
- Estados: respuesta pública de Khipu → «Esperando al colegio»; respuesta del colegio → «En progreso» (o «Abierta» si Khipu nunca respondió); respuesta sobre «Resuelta» la reabre. Responder sin asignado asigna a quien responde.
- SLA: texto en tiempo de reloj, color por horas hábiles aprox. (lun–vie 8–18 Lima, sin feriados): ámbar > 2 h, rojo > 8 h.
- Pendientes del equipo = abiertas + en progreso (insignia y título «(N) Mesa de ayuda»).
- Avisos `soporte_respuesta` (al creador + dirección) y `soporte_nuevo` (buzón «soporte:correo» o `SMTP_USER`/`EMAIL_FROM_ADDRESS` + asignado), máx. 1 cada 15 min por conversación y destinatario. Los `soporte_nuevo` se excluyen del panel «Avisos» del colegio para no mostrar correos del equipo.
- Sondeo de 5 s (server action) en ambos hilos; la bandeja se refresca cada 15 s.

## Cambios realizados
- `src/lib/soporte.ts`: textos, límites y reglas puras (SLA, horas hábiles).
- `src/lib/server/soporte.ts`: lado del colegio, mensajes del sistema, horario y cierre automático.
- `src/lib/server/plataforma-mesa-ayuda.ts`: bandeja, resumen, detalle, respuestas, notas, asignación, estado y prioridad (auditados `mesa_*`).
- `src/lib/server/notificaciones/avisos-soporte.ts` + plantillas `soporte_respuesta` y `soporte_nuevo`.
- `src/app/colegio/[slug]/soporte/**` (lista, nueva conversación, hilo, valoración) y campana en `layout.tsx`.
- `src/app/plataforma/mesa-ayuda/**` (bandeja, detalle, descarga de capturas).
- `src/components/soporte/` (`HiloSoporte`, insignias de estado y prioridad).
- Cambios mínimos: `adjuntos.ts` (destino `mensajeSoporteId`), `archivos.ts` y `/archivos/[id]` (capturas), `plan.ts`, `avisos-panel.ts`, `plataforma-auditoria.ts` (textos), `/api/cron/avisos` (cierre automático).

## Validación
- `pnpm lint && pnpm typecheck && pnpm test` → verde (576 tests).
- `E2E_PORT=3071 playwright test mesa-ayuda plataforma-superadmin paginas-basico-por-rol planes-modulos crm-personal` → 12/12 verde.
- Capturas 1366 y 390 px en el scratchpad de la sesión (`p4-mesa-ayuda/`).

## Pendientes y preguntas abiertas
- Contador de pendientes en el ítem de la barra lateral de la plataforma (layout compartido; no se tocó).
- Pantalla para editar «soporte:correo» y «soporte:horario» en `/configuracion` de la plataforma.
- El SLA no descuenta feriados; `resumen-direccion.ts` aún suma los `soporte_nuevo` en sus totales.
