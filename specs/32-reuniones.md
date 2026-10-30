# 32 — Reuniones (convocatoria, confirmación y acta)

> Estado: en construcción · Plan: Khipu Pro (módulo `reuniones`) · Última actualización: 2026-10-31 (Claude Code)

## Objetivo
Convocar reuniones (de aula, de colegio o individuales con una familia), saber quién confirma, marcar la asistencia real
y publicar el acta. Hoy `EventoAgenda` tiene el tipo `reunion` pero sin invitados ni respuestas.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| dirección | Convocar cualquier reunión, ver todas, publicar actas | — |
| profesor (tutor) | Convocar reuniones de su salón e individuales con familias de sus alumnos (por definir) | Convocar a todo el colegio |
| apoderado / personal invitado | Ver sus invitaciones, responder asistiré / no asistiré, leer el acta publicada | Ver reuniones a las que no fue invitado |

## Flujos
1. Convocar: título, fecha/hora, lugar o enlace, alcance; se crean las filas de `ReunionInvitado` y se avisa (correo/push).
2. Responder: el invitado marca `asistire` / `no_asistire` (con comentario opcional).
3. Después: quien convocó marca `asistio`, cambia `estado` a `realizada`, escribe el `acta` y la publica (`actaPublicadaAt`).
4. Cancelar: `estado = cancelada` y aviso a los invitados.

## Reglas de negocio
- `alcance = salon` exige `salonId`; `individual` puede llevar `salonId` del alumno; `colegio` sin salón.
- Invitado: una fila por (reunión, membresía, alumno); `alumnoId` = hijo por el que se cita al apoderado (un apoderado con dos hijos en el mismo salón puede tener dos filas o una con `alumnoId` null, decidir en la implementación). Único con **NULLS NOT DISTINCT**.
- Las familias ven el acta solo si `actaPublicadaAt` tiene valor.
- `requireFeature(ctx, "reuniones")`. La clave `reuniones` ya está en `plan_modulos` para `pro`; falta en `FEATURES`. Avisos con `TipoAviso.reunion` (ya en el enum).

## Modelo de datos
Migración `20261031130000_pro_completo_nudito_plus`.

- **`Reunion`** (`reuniones`): `titulo`, `descripcion?`, `inicio` (Timestamptz), `fin?` (CHECK `fin >= inicio`), `lugar?`, `enlace?`, `alcance` (`AlcanceReunion`: `colegio | salon | individual`), `salonId?` (Cascade), `convocadaPorId` (membresía, NoAction), `estado` (`EstadoReunion`: `programada | realizada | cancelada`, def. `programada`), `acta?`, `actaPublicadaAt?`, `createdAt`, `updatedAt`. Índices `(tenantId, inicio)`, `(tenantId, salonId)`.
- **`ReunionInvitado`** (`reunion_invitados`): `reunionId` (Cascade), `membershipId` (Cascade), `alumnoId?` (Cascade), `respuesta` (`RespuestaReunion`: `pendiente | asistire | no_asistire`, def. `pendiente`), `respondidaAt?`, `comentario?`, `asistio Boolean?` (null = sin marcar). Único `(reunionId, membershipId, alumnoId)`.

## Contratos de `src/lib/server`
```ts
// por definir: reuniones.ts — convocarReunion, responderInvitacion, marcarAsistencia, publicarActa, cancelarReunion, misReuniones
```

## Rutas y UI
- Por definir: `/reuniones`. ¿Mostrar también en la agenda (`specs/12`)?

## Textos y UX
- Por definir. Estados con ícono + palabra.

## Errores y casos borde
- Reunión pasada: no se puede responder.

## Pruebas
- Por definir.

## Pendientes
- Recordatorio automático el día anterior; exportar acta a PDF; integración con `.ics`.
