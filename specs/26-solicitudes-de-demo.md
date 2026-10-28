# 26 — Solicitudes de demo (panel de plataforma)

> Estado: implementado · Plan: no aplica (equipo Khipu) · Última actualización: 2026-10-28 (carlos / Claude)

> Nota: la landing y su formulario se documentan en `specs/25-landing-publica.md` (otro frente). Si esa spec ya existe al integrar, esta sección se mueve allí como «Solicitudes de demo (panel)».

## Objetivo
Que el equipo Khipu se entere de cada pedido de demo que llega desde la landing, lo gestione (estado, notas, responsable) y lo convierta en un colegio sin volver a escribir los datos.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Super administrador | Ver, filtrar, exportar, cambiar estado, anotar, asignar, convertir y eliminar solicitudes | — |
| Colegios y familias | — | Ver el módulo (la tabla es global y vive solo en `admin.<dominio>`) |

## Flujos
1. Una persona envía el formulario de la landing → `crearSolicitudDemo` guarda la fila y, tras responder, avisa por correo al buzón del equipo.
2. El equipo ve el contador «Solicitudes de demo» en el menú (Colegios), abre `/solicitudes`, filtra y entra al detalle.
3. En el detalle cambia el estado, escribe notas internas y se asigna la solicitud.
4. «Crear colegio con estos datos» abre `/colegios/nuevo` prellenado. Al crear el colegio con éxito, la solicitud queda `convertida` con su `tenantId`.
5. Pedido de borrado de la persona: «Eliminar solicitud» (con confirmación).

## Reglas de negocio
- **Aviso al equipo** (`avisarSolicitudNueva`, plantilla `solicitud_demo`): destinatario = `correoEquipoSoporte()` (`ConfigPlataforma` «soporte:correo» o el remitente del sistema). Va directo por `EmailChannel` (la cola `avisos` exige colegio). Dentro de un request sale en `after()`; fuera de uno, de forma directa. Si falla, se registra con `console.error` y la solicitud ya quedó guardada. El correo lleva nombre, cargo, colegio, ciudad, alumnos, plan de interés y el enlace `/solicitudes/<id>`; **no** lleva correo, teléfono ni mensaje de la persona.
- Cambiar a un estado distinto de «nueva» asigna la solicitud a quien lo hace si no tenía responsable.
- Prellenado por query (`/colegios/nuevo?solicitud=&nombre=&ciudad=&plan=&admin_nombres=&admin_email=&admin_telefono=&admin_cargo=`): solo valores iniciales; el plan se ignora si no está en el catálogo ofrecido. `solicitudId` viaja oculto y, si `crearColegio` tuvo éxito, se llama `vincularSolicitudColegio` (si esto falla no se revierte el colegio; se registra el error).
- La auditoría (`auditoria_plataforma`) nunca guarda datos personales: solo el id de la solicitud, estados y conteos. Eliminar borra la fila con sus datos personales; queda el registro de que se eliminó.
- Exportar CSV contiene datos personales y por eso queda auditado (`solicitud_exportar`).

## Modelo de datos
`SolicitudDemo` (global): `estado` (`nueva`, `contactada`, `demo_agendada`, `convertida`, `descartada`), `notas`, `atendidaPor`, `tenantId`, `planInteres`, `ipHash`. Sin cambios de esquema en este frente.

## Contratos de `src/lib/server`
```ts
// solicitudes.ts (landing + aviso)
avisarSolicitudNueva(solicitud, canal?): Promise<boolean>   // nunca lanza; true si salió el correo
// plataforma-solicitudes.ts (panel; cada cambio audita solicitud_*)
pendientesSolicitudes(admin): Promise<number>                // estado = nueva
listarSolicitudes(admin, { estado?, q?, orden? }): Promise<SolicitudDemo[]>   // q: colegio, nombre, correo, ciudad
obtenerSolicitud(admin, id): Promise<DetalleSolicitud>        // 404 si el id no existe
cambiarEstadoSolicitud(admin, id, estado) · guardarNotasSolicitud(admin, id, notas) · asignarSolicitud(admin, id, userId | null)
vincularSolicitudColegio(admin, id, tenantId)                 // → convertida
eliminarSolicitud(admin, id) · exportarSolicitudes(admin, filtro)
```
Acciones de auditoría: `solicitud_estado`, `solicitud_notas`, `solicitud_asignar`, `solicitud_convertir`, `solicitud_eliminar`, `solicitud_exportar` (con texto en español en `plataforma-auditoria.ts`).

## Rutas y UI
- `/solicitudes`: lista con búsqueda, filtro por estado, orden por fecha, contador de nuevas y «Exportar CSV». Tabla en escritorio, tarjetas en móvil.
- `/solicitudes/[id]`: datos completos, estado, «Atiende», «Asignármela», notas internas, «Crear colegio con estos datos» (o «Ver colegio» si ya se convirtió) y «Eliminar solicitud».
- `/solicitudes/reporte.csv`: mismos filtros que la lista.
- `/colegios/nuevo`: acepta el prellenado por query.
- Menú: «Solicitudes de demo» (ícono `Inbox`) bajo «Suscripciones», con contador de nuevas.

## Textos y UX
Estados siempre con ícono + palabra. Toasts: «Estado actualizado.», «Notas guardadas.», «Asignación guardada.», «Solicitud eliminada.».

## Errores y casos borde
- Id inexistente o no UUID → 404. Estado inválido o persona fuera del equipo → mensaje de negocio.
- Sin buzón del equipo configurado: no hay aviso (se registra en el log).

## Pruebas
- integración: `tests/integracion/solicitudes-demo.test.ts` (aviso enviado o fallo registrado sin romper el guardado, campo trampa, límite por IP, filtros, auditoría de estado/notas/asignación, convertir, exportar y eliminar).
- e2e: `tests/e2e/solicitudes-demo.test.ts` (lista → detalle → estado → crear colegio prellenado → convertida).

## Pendientes
- Responder desde el panel (hoy se escribe desde el correo del equipo).
- Plazo de conservación automática de solicitudes descartadas.
