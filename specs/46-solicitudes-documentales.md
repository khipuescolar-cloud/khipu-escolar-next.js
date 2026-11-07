# 46 — Solicitudes documentales (gestión académica)

> Estado: backend W3 implementado (migración, servicio, acciones y CSV; interfaz W4 pendiente) · Plan: Khipu Pro (`requireFeature(ctx, "documentos")`, sin módulo nuevo) · Actualizado: 2026-11-07 · Plan de trabajo: `docs/documentos-plan-implementacion.md` (flujo W3)

## Objetivo

Que dirección pida un documento a profesores o áreas (p. ej. «Programación curricular del primer trimestre»), controle quién entregó, lo revise, lo observe o apruebe y conserve todas las versiones y el historial. No es Tareas (alumnos) ni Biblioteca (publicación): es el circuito administrativo-académico del personal.

## Roles y permisos

| Rol | Puede | No puede |
|---|---|---|
| Dirección | Crear, editar (en borrador), publicar, anular, cerrar/reabrir solicitudes; elegir destinatarios; ver todas las entregas; revisar (en revisión, observar, aprobar); reabrir una aprobada con motivo; ver historial y reportes | Entregar en nombre de un profesor (fuera de alcance) |
| Administrativo | **Decisión pendiente.** Por defecto: nada | — |
| Profesor | Ver **solo** las solicitudes en las que es destinatario; descargar la plantilla; presentar versiones; ver su historial y las observaciones | Ver entregas o estados de otros profesores; revisar |
| Alumno, apoderado, portería | Nada | Todo |
| Modo soporte | Nada (se trata como `FEATURES_PRIVADAS_SOPORTE`; los archivos no se ven) | — |

Toda acción valida rol y plan en servidor. Base → 403 (prueba 19). Los `id` de solicitud, destinatario, versión y archivo se vuelven a resolver con `ctx.db` (aislamiento por colegio) y, para profesores, contra su propia membresía.

## Requisitos funcionales

- **RF-S1** Crear solicitud: título, instrucciones, plantilla institucional opcional (un `Documento` de la Biblioteca), año académico, etiqueta de periodo opcional («Primer trimestre»), fecha límite (con o sin hora, zona del colegio), si acepta entregas tardías (por defecto sí).
- **RF-S2** Destinatarios: profesores concretos o **por área académica** (`Curso.areaCneb`/nombre de curso: se expande a los profesores que dictan ese curso en el año). Se guarda una fila por profesor y la etiqueta del grupo desde el cual se agregó.
- **RF-S3** Publicar notifica a los destinatarios (bandeja y push, `specs/38`; sin correo). Un destinatario agregado después recibe el aviso al agregarse.
- **RF-S4** El profesor presenta una versión (1 a 3 archivos de ≤ 25 MB, categoría `solicitud`, carga directa de `specs/45`) con comentario opcional. Cada presentación crea una **versión inmutable** numerada.
- **RF-S5** Dirección revisa: «Comenzar revisión», «Aprobar» o «Registrar observaciones» (texto obligatorio; plazo de corrección opcional) sobre la **última versión**.
- **RF-S6** Tras una observación el profesor presenta una versión nueva; la anterior se conserva con su observación.
- **RF-S7** Historial consultable (línea de tiempo por destinatario): quién, cuándo, qué versión, qué estado, observaciones, revisor y fecha de revisión.
- **RF-S8** Reportes calculados de estados y fechas reales (ver abajo).
- **RF-S9** Dirección puede quitar un destinatario (queda `retiradoAt`, se conserva lo entregado) y cambiar la fecha límite (evento registrado).
- **RF-S10** Vencimiento: se **calcula**, no se guarda como estado.

## Estados y transiciones

Estado de la **solicitud** (`EstadoSolicitudDocumental`): `borrador → publicada → cerrada`; `publicada → anulada`; `cerrada → publicada` (reabrir). Solo `publicada` admite entregas y revisiones; `anulada` y `borrador` no.

Estado por **destinatario** (`EstadoEntregaDocumental`): `pendiente`, `entregado`, `en_revision`, `observado`, `aprobado`.

| Desde | Hacia | Quién | Condición |
|---|---|---|---|
| `pendiente` | `entregado` | profesor destinatario | solicitud publicada; crea versión 1 |
| `entregado` | `en_revision` | dirección | «Comenzar revisión» |
| `entregado` / `en_revision` | `observado` | dirección | observación obligatoria; marca la versión `observada` |
| `entregado` / `en_revision` | `aprobado` | dirección | marca la versión `aprobada` |
| `observado` | `entregado` | profesor destinatario | crea versión n+1; la anterior queda observada |
| `aprobado` | `en_revision` | dirección | «Reabrir revisión» con motivo obligatorio; evento y auditoría |
| `entregado` | `entregado` | profesor | **No permitido** reemplazar: una nueva presentación solo si el estado es `pendiente` u `observado` |

Cualquier otra transición se rechaza (`ErrorDeNegocio`) y no cambia nada. Cada transición se aplica con `updateMany` condicionado al estado anterior (reclamo atómico, igual que Tareas) para que dos clics no dupliquen versiones.

**Vencimiento (derivado, no es estado):**
`vencida = ahora > límite` y estado ∈ {`pendiente`}; para `observado`: `vencida = plazoCorreccion != null && ahora > plazoCorreccion`. `entregaTardia` se fija **una vez** al presentar la versión 1 (`presentadaAt > límite`) y no se recalcula. Un destinatario `entregado` fuera de plazo sigue `entregado/en_revision` y se distingue con `entregaTardia`; `aprobado` no se ve afectado.

## Reglas

1. Una versión nunca se edita ni se borra; solo gana resultado de revisión una vez.
2. El profesor solo ve sus filas (`membershipId = ctx.membership.id`).
3. Los archivos de solicitudes no se eliminan por usuario ni por purga automática (retención: decisión pendiente).
4. La plantilla es una referencia a `Documento`; el destinatario la descarga por una regla de acceso de solicitud (no necesita que la Biblioteca se la muestre).
5. Cerrar una solicitud no borra nada; los pendientes quedan como «no entregó» en el reporte.
6. Cambiar fecha límite registra `plazo_cambiado` con antes/después y motivo, y no recalcula `entregaTardia` ya fijada.
7. Todo cambio relevante escribe un evento inmutable y una entrada de auditoría.

## Modelo de datos

Migración W3 `20261116090200_solicitudes_documentales` (aditiva; RLS cerrado y `REVOKE` a `anon/authenticated` como las tablas de Documentos).

```prisma
enum EstadoSolicitudDocumental { borrador publicada cerrada anulada }
enum EstadoEntregaDocumental   { pendiente entregado en_revision observado aprobado }
enum ResultadoVersionDocumental { presentada observada aprobada }
enum TipoEventoSolicitud {
  creada publicada plazo_cambiado destinatario_agregado destinatario_retirado
  version_presentada revision_iniciada observada aprobada revision_reabierta cerrada reabierta anulada
}

model SolicitudDocumental {           // solicitudes_documentales
  id, tenantId, titulo, instrucciones?, anioAcademico Int, periodoEtiqueta?,
  plantillaDocumentoId? (FK Documento, SetNull), fechaLimite? , conHora Boolean,
  permiteTardias Boolean @default(true), estado EstadoSolicitudDocumental @default(borrador),
  creadaPorId (Membership), publicadaAt?, cerradaAt?, createdAt, updatedAt
  // índices: (tenantId, estado), (tenantId, anioAcademico)
}
model SolicitudDestinatario {         // solicitud_destinatarios, unique(solicitudId, membershipId)
  id, tenantId, solicitudId, membershipId (profesor), grupo String?   // «Matemática», «Tutores 3.°»…
  estado EstadoEntregaDocumental @default(pendiente),
  versionActual Int @default(0), entregaTardia Boolean @default(false),
  primeraEntregaAt?, ultimaEntregaAt?, plazoCorreccion?, revisadoPorId?, revisadoAt?, aprobadoAt?,
  retiradoAt?, createdAt, updatedAt
  // índices: (tenantId, membershipId), (solicitudId, estado)
}
model SolicitudVersion {              // solicitud_versiones, unique(destinatarioId, numero), unique(archivoId)
  id, tenantId, destinatarioId, numero Int, comentario?, presentadaPorId, presentadaAt, tardia Boolean,
  resultado ResultadoVersionDocumental @default(presentada),
  observaciones?, revisadaPorId?, revisadaAt?,
  archivoId (FK Archivo, Restrict)    // un registro por archivo: ver «Varios archivos»
}
model SolicitudEvento {               // solicitud_eventos, append-only (trigger bloquea UPDATE/DELETE)
  id, tenantId, solicitudId, destinatarioId?, versionId?, tipo TipoEventoSolicitud, actorId?, detalle Json?, createdAt
}
```
**Varios archivos por versión:** para mantener «una versión = una fila» con N archivos se usa la tabla de enlace `solicitud_version_archivos(versionId, archivoId, orden)` en lugar de `archivoId` único en la versión; `Archivo` solo gana el `categoria = solicitud`. (El agente W3 define el SQL con este diseño; `archivoId` arriba es ilustrativo.) Un trigger bloquea cambios a `numero`, `presentadaAt`, `presentadaPorId` y a los archivos de una versión.

Las tablas nuevas entran solas a la exportación del colegio (se derivan de `Prisma.ModelName`); ninguna se omite.

## Reportes (calculados, sin tablas de resumen)

Por solicitud y por rango (`anioAcademico`, `periodoEtiqueta`, fechas), agrupables por docente o por área (`grupo`):
- **Emitidas:** solicitudes publicadas.
- **Destinatarios:** filas no retiradas.
- **Pendientes:** estado `pendiente` (de ellos, vencidas = derivado).
- **Entregas realizadas:** `versionActual ≥ 1`.
- **Fuera de plazo:** `entregaTardia = true` o (`pendiente` y vencida).
- **Aprobados**, **observados**, **en revisión**.
- **Cumplimiento por docente/área** = entregas realizadas a tiempo ÷ destinatarios (porcentaje), y **aprobación** = aprobados ÷ destinatarios. Ambas definiciones se muestran en pantalla.
Una solicitud cerrada fija el corte: lo no entregado cuenta como no cumplido. Exportación CSV por la misma consulta (decisión menor para W3).

## Casos de uso

CU-S1 Dirección crea y publica la solicitud de programación curricular → CU-S2 el profesor ve «Pendiente» y descarga la plantilla → CU-S3 presenta v1 → CU-S4 dirección comienza revisión y registra observaciones → CU-S5 el profesor presenta v2 → CU-S6 dirección aprueba → CU-S7 dirección consulta historial (v1 con observación, v2 aprobada) y el reporte de cumplimiento.

## Criterios de aceptación

Cubren las pruebas 11 a 16 de la lista obligatoria: solicitar planificación; profesor entrega; observaciones; segunda versión; aprobación; historial conservado. Además: transición inválida rechazada (p. ej. aprobar un `pendiente`); un profesor no ve las entregas de otro; entrega tardía sigue en revisión y se cuenta fuera de plazo; plan Base → 403; otro colegio no ve nada; descarga de archivo de solicitud por quien no es dirección ni el destinatario → 403.

## Estrategia de pruebas

unit (`tests/unit/solicitudes-reglas.test.ts`): tabla de transiciones, `vencida` derivada, `entregaTardia` fija, expansión de áreas, cálculo de cumplimiento. integración (`tests/integracion/solicitudes-documentales.test.ts`): flujo 11–16 completo, concurrencia (dos presentaciones simultáneas generan una versión), trigger de inmutabilidad, aislamiento, plan Base, reportes contra datos sembrados. e2e (`tests/e2e/solicitudes-documentales.test.ts`): dirección crea, Lucía entrega, dirección observa, Lucía reentrega, dirección aprueba.

## Decisiones pendientes

1. Si el administrativo (secretaría o coordinación) puede crear y revisar.
2. Retención mínima de versiones y aprobaciones (obligación de conservación).
3. Máximo de versiones por destinatario.
4. Recordatorios antes del vencimiento (no hay cron horario; ver `specs/39` pendientes).
5. Si el reporte se comparte con la UGEL u otras entidades (legal).

## Implementación W3 y contratos de integración

La migración local `20261116090200_solicitudes_documentales` añade las cinco tablas, RLS forzado y revocación de `anon`/`authenticated`. Los disparadores impiden modificar o borrar eventos, enlaces de archivos y campos originales de una versión; permiten fijar una sola revisión. El borrado del colegio por el proceso de limpieza conserva la cascada de claves externas.

El servicio está en `src/lib/server/solicitudes/index.ts`; debe importarse con `/index` explícito, porque `src/lib/server/solicitudes.ts` ya pertenece a los pedidos de demo de la plataforma. Expone creación, edición de borrador, publicación, cierre/reapertura/anulación, gestión de destinatarios, cambio de plazo, presentación, revisión, vistas y reporte. Las acciones están en `/documentos/solicitudes/actions.ts` y el CSV en `/api/documentos/solicitudes/reporte`. W4 debe enlazar estas acciones desde su interfaz.

La bandeja interna avisa con claves idempotentes. Mientras el enum global `TipoNotificacion` no tenga un valor propio para solicitudes, usa provisionalmente `tarea`; la integración de push debe completar ese contrato antes del piloto. `materializarArchivos` consume el contrato de W1: la carga directa y el límite de 25 MB dependen de su implementación final.

La reapertura de una entrega aprobada registra evento y deja el estado `en_revision`, preservando el resultado de la versión original. La decisión de cómo emitir una segunda decisión sobre esa misma versión sigue pendiente; no se sobrescribe una aprobación histórica.
