# 23 — Mesa de ayuda (chat del colegio con el equipo Khipu)

> Estado: implementado · Plan: Básico, Familia y Pro Max (todos) · Última actualización: 2026-10-28 (Claude, subagente mesa-ayuda)

## Objetivo
Que la dirección (o quien tenga el permiso) hable directamente con el equipo de soporte de Khipu desde el colegio, en un chat con historial, estados y valoración; y que el equipo atienda todas las conversaciones desde una bandeja en el panel de plataforma (`/mesa-ayuda`) con notas internas, asignación y SLA.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Dirección | Ver todas las conversaciones del colegio; abrir, responder, resolver, reabrir, cerrar y valorar | Ver notas internas del equipo |
| Administrativo (solo si se le habilita «Soporte Khipu» en Roles y permisos; **desactivado por defecto**) | Ver sus conversaciones y las que abrió la dirección; lo mismo que dirección sobre ellas | Ver las de otros administrativos; ver notas internas |
| Profesor, portería, familia, alumno | — | Entrar al módulo (403) |
| Super administrador en modo soporte | — | Ver el módulo dentro del colegio (está en `FEATURES_PRIVADAS_SOPORTE`): responde desde `/mesa-ayuda`, no haciéndose pasar por el colegio |
| Super administrador (panel) | Ver todo, responder, agregar notas internas, asignar, cambiar estado y prioridad | — |

## Flujos
1. **Colegio abre una conversación** (`/soporte` → «Nueva conversación», `Dialog`): asunto, categoría, prioridad, mensaje y captura opcional (PNG/JPG/PDF ≤ 5 MB) → estado «Abierta» (el colegio la ve como «Enviada») → correo `soporte_nuevo` al buzón del equipo y al asignado → redirige al hilo con toast.
2. **Khipu atiende** (`/mesa-ayuda` → fila → detalle): lee el hilo (marca `leidoKhipuHasta`), agrega notas internas («Nota interna · solo el equipo», el colegio nunca las ve) o responde. La primera respuesta pública fija `primeraRespuestaAt`; si no estaba asignada, se asigna a quien responde; estado → «Esperando al colegio»; aviso `soporte_respuesta` al creador y, si no la abrió dirección, también a la dirección.
3. **Colegio ve la respuesta** por sondeo (~5 s, pestaña visible) o al entrar; la campana muestra «Soporte: N respuestas nuevas». Puede responder (→ «En progreso»), «Marcar como resuelto», reabrir (si está resuelta), cerrar y valorar (1–5 + comentario) cuando está resuelta o cerrada.
4. **Cierre automático:** el cron de avisos (`/api/cron/avisos`) llama a `cerrarResueltosInactivos()`: las «Resueltas» sin actividad hace más de 7 días pasan a «Cerradas» con un mensaje del sistema.

## Reglas de negocio
- **Estados** (`EstadoTicket`): `abierto` (sin respuesta de Khipu) · `en_progreso` · `esperando_colegio` · `resuelto` · `cerrado`. Transiciones:
  - Respuesta pública de Khipu en `abierto`/`en_progreso` → `esperando_colegio` (en otros estados no cambia). Nota interna: no cambia nada ni avisa.
  - Respuesta del colegio → `abierto` si Khipu aún no respondió nunca; si no, `en_progreso`. Sobre una `resuelto`, la reabre (mensaje del sistema). Sobre `cerrado`: error «Esta conversación está cerrada…».
  - Colegio: resolver (desde los activos), reabrir (solo desde `resuelto`), cerrar (desde cualquiera salvo `cerrado`). Khipu: cualquier estado desde el selector; `resuelto` fija `resueltoAt`.
  - Cada cambio de estado, prioridad o asignación deja un mensaje `sistema` visible para ambos lados (sin `autorId`; el nombre va en el texto).
- **Visibilidad en el colegio:** dirección → todas; administrativo → `creadoPorId = su membresía` o `creadoPor.rol = direccion`. Ids ajenos o de otro colegio → 404.
- **Notas internas** (`interno = true`): se filtran en el servidor en cada consulta del colegio (`obtenerTicketColegio`, `listarTicketsColegio`, contadores, descarga de archivos). Nunca llegan al cliente del colegio.
- **No leídos:** colegio = mensajes públicos de Khipu posteriores a `leidoColegioHasta`; Khipu = mensajes del colegio posteriores a `leidoKhipuHasta`. Se actualizan al abrir el hilo y en cada sondeo.
- **Pendientes del equipo** = conversaciones `abierto` + `en_progreso` (insignia en la bandeja y título del documento «(N) Mesa de ayuda»). La barra lateral compartida no tiene contador (pendiente).
- **SLA** (solo en `abierto`/`en_progreso`): espera desde el primer mensaje del colegio posterior a la última respuesta pública de Khipu. Etiqueta «Sin respuesta hace 3 h» (tiempo de reloj); color por **horas hábiles aproximadas** (lun–vie 8:00–18:00, Lima, sin feriados): normal ≤ 2 h, ámbar > 2 h, rojo > 8 h. Ícono reloj + texto (nunca solo color).
- **Orden de la bandeja:** prioridad (urgente → baja) y luego antigüedad (la más antigua primero). Filtros: estado («Activas» por defecto = abierto, en progreso, esperando al colegio; «Todas»; o uno), prioridad, colegio y asignación (a mí / sin asignar).
- **Resumen:** abiertas sin respuesta, en progreso, esperando al colegio, tiempo medio de primera respuesta (creadas en los últimos 7 días) y valoración media (todas las valoradas).
- **Capturas:** una por mensaje, PNG/JPG/PDF por firma, ≤ 5 MB, privadas en `FileStorage` (carpeta `soporte`, `Archivo.mensajeSoporteId`). Colegio: `/archivos/<id>` si ve la conversación. Khipu: `/mesa-ayuda/archivos/<id>` (solo archivos de mensajes de soporte).
- **Avisos** (`TipoAviso.soporte`, `referenciaId = ticketId`, máx. 1 por conversación/plantilla/destinatario cada 15 min salvo la conversación nueva; se procesan con `after()`):
  - `soporte_respuesta` → creador (+ dirección si no la abrió dirección) por correo y push según su perfil. Texto sin el contenido del mensaje.
  - `soporte_nuevo` → buzón `ConfigPlataforma` «soporte:correo» (texto o `{ "correo": "…" }`; por defecto `SMTP_USER` o `EMAIL_FROM_ADDRESS`) y el asignado. Llevan el `tenantId` del colegio, pero el panel «Avisos» del colegio los excluye (no muestra correos del equipo).
- **Horario de atención** mostrado en `/soporte`: `ConfigPlataforma` «soporte:horario» (texto o `{ "texto": "…" }`), por defecto «Lunes a viernes, 8:00 a. m. – 6:00 p. m.».
- Auditoría de plataforma: `mesa_responder`, `mesa_nota_interna`, `mesa_asignar`, `mesa_estado`, `mesa_prioridad` (detalle con `ticketId`, nunca el texto).

## Modelo de datos
`TicketSoporte` (`tickets_soporte`) y `MensajeSoporte` (`mensajes_soporte`), ambos con `tenantId` (migración `20261028150000_mesa_de_ayuda`); `Archivo.mensajeSoporteId`; `TipoAviso.soporte`; módulo `soporte` en `plan_modulos` (todos los planes) y `rol_modulos` (administrativo deshabilitado). `asignadoAId` = id de perfil de un super admin (sin FK).

## Contratos de `src/lib/server`
```ts
// soporte.ts (colegio; ctx.db)
exigirSoporte(ctx)                                   // rol dirección/administrativo + requireFeature("soporte") + no modo soporte
listarTicketsColegio(ctx): FilaTicketColegio[]       // visibles, sin notas
obtenerTicketColegio(ctx, id): TicketVista           // sin notas; marca leído; 404 si no es visible
crearTicket(ctx, entrada, adjuntos?): { id, avisos }
responderColegio(ctx, id, cuerpo, adjuntos?): { avisos }
marcarResueltoColegio / reabrirColegio / cerrarColegio(ctx, id)
valorarTicket(ctx, id, { valoracion, comentario? })
respuestasNuevasSoporte(ctx): number                 // campana
puedeVerAdjuntoSoporte(ctx, mensajeSoporteId)        // lo usa requireArchivoVisible
horarioSoporte(): string
cerrarResueltosInactivos(ahora?): number             // cron
// plataforma-mesa-ayuda.ts (db global tras requireAdminPlataforma)
resumenMesaAyuda(admin) · pendientesMesaAyuda(admin) · listarBandeja(admin, filtro) · colegiosConTickets(admin)
obtenerTicketKhipu(admin, id): DetalleKhipu          // con notas; marca leído; panel del colegio
responderKhipu(admin, id, cuerpo, interno): { avisos, tenantId }
asignarTicket(admin, id, userId | null) · cambiarEstadoTicket(admin, id, estado) · cambiarPrioridadTicket(admin, id, prioridad)
adjuntoDeMesa(admin, archivoId)
// notificaciones/avisos-soporte.ts
avisarRespuestaKhipu(ticket) · avisarEquipoSoporte(ticket, { nueva }) · correoEquipoSoporte()
```
Puro y compartido: `src/lib/soporte.ts` (textos, límites, `minutosHabiles`, `etiquetaSla`, `duracionLegible`).

## Rutas y UI
- `/soporte` (colegio · dirección y administrativo habilitado): encabezado con «Nueva conversación», aviso fijo con el horario y «No compartas datos personales de alumnos si no es necesario.», lista con asunto, último mensaje, prioridad, categoría, estado (ícono + palabra), fecha y «N respuestas nuevas».
- `/soporte/[id]`: «← Soporte Khipu», hilo tipo chat (propias en `primary`; Khipu en `superficie-2` con «Equipo Khipu · Nombre»; sistema discreto y centrado), acciones «Marcar como resuelto», «Reabrir», «Cerrar» (`BotonConfirmar`), caja de envío con captura y tarjeta «¿Cómo te atendimos?» (1–5 estrellas + comentario).
- `/mesa-ayuda` (plataforma): insignia «N pendientes», 5 métricas (`StatTile`), filtros (GET), tabla (≥ md) o tarjetas (móvil) con SLA y «N sin leer». Se refresca cada 15 s con la pestaña visible.
- `/mesa-ayuda/[id]`: hilo completo (notas resaltadas en ámbar con borde punteado), conmutador «Responder al colegio» / «Nota interna», panel lateral: estado, prioridad, asignación (+ «Asignármela»), «Abierta por» (nombre, cargo, correo) y colegio (plan, estado, responsables, «Ver ficha», «Entrar como soporte» → ficha, donde está el flujo auditado).
- Íconos Lucide: `LifeBuoy` (módulo), `MessagesSquare`, `CircleDot`/`Hourglass`/`MessageCircleQuestion`/`CircleCheck`/`Archive` (estados), `SignalLow/Medium/High`/`Siren` (prioridad).

## Textos y UX
- Estados para el colegio: «Enviada», «En progreso», «Esperando tu respuesta», «Resuelta», «Cerrada». Para Khipu: «Abierta», «En progreso», «Esperando al colegio», «Resuelta», «Cerrada».
- Sistema: «Carmen marcó la conversación como resuelta.», «Rocío del equipo Khipu tomó tu consulta.», «El equipo Khipu cambió el estado a «Resuelta».», «La conversación se cerró automáticamente tras 7 días sin actividad.»
- Correo al colegio: asunto «El equipo de Khipu respondió a tu consulta "<asunto>"», botón «Ver conversación».

## Errores y casos borde
- Conversación cerrada: el colegio no puede escribir («…abre una nueva»); Khipu solo puede agregar notas hasta cambiar el estado.
- Valorar antes de resolver → «Podrás valorar la atención cuando la conversación esté resuelta.»
- Captura de otro tipo o > 5 MB → mensaje claro; si falla la subida se borra el mensaje (o la conversación nueva) para no dejar huérfanos.
- Un miembro del equipo desactivado no aparece en «Asignada a» ni recibe correos.

## Pruebas
- unit: `tests/unit/mesa-ayuda-sla.test.ts` (horas hábiles, SLA, textos), `tests/unit/plantillas-avisos.test.ts` (`soporte_respuesta`, `soporte_nuevo`).
- integración: `tests/integracion/mesa-ayuda.test.ts` (aislamiento entre colegios, notas nunca en consultas del colegio, 403 para profesor/portería/administrativo sin módulo, administrativo habilitado entra y ve lo suyo + dirección, plataforma ve todo, estados, `primeraRespuestaAt`, avisos por dirección, auditoría, cierre automático); `acceso-soporte.test.ts` (modo soporte niega «soporte»).
- e2e: `tests/e2e/mesa-ayuda.test.ts` (dirección abre → Khipu nota + responde → dirección ve la respuesta por sondeo, no la nota, y resuelve).

## Pendientes
- Contador de pendientes en el ítem «Mesa de ayuda» de la barra lateral de la plataforma (el layout es compartido; no se tocó).
- Pantalla en `/configuracion` de la plataforma para editar «soporte:correo» y «soporte:horario» (hoy se cargan directo en `config_plataforma`).
- El SLA no descuenta feriados; el resumen del inicio de dirección (`resumen-direccion.ts`) aún cuenta los avisos `soporte_nuevo` en sus totales.
- La habilitación real del administrativo se probó simulando `RolModulo` habilitado en el contexto (la tabla es global y la BD se comparte con otros agentes); la lectura del valor sembrado sí se prueba contra la BD.
