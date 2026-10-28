# 21 — Operación de plataforma: usuarios, monitoreo y auditoría

> Estado: implementado · Plan: Interno (super administrador) · Última actualización: 2026-10-28 (Claude subagente p4-operacion)

## Objetivo
Dar al equipo Khipu herramientas para soportar a personas (`/usuarios`), vigilar la salud del sistema de avisos y los procesos automáticos (`/monitoreo`) y revisar todo lo que se hizo en el panel (`/auditoria`). Nunca muestra alumnos, notas, chats ni contraseñas (Ley 29733).

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Super administrador activo | Todo lo de esta spec | Ver contraseñas, documentos completos, IP completas, contenido de avisos |
| Cualquier otro | — (403) | Entrar a las rutas |

## Flujos
1. **Usuarios.** Busca por correo, nombres o documento (20 por página) → ficha → acciones con `BotonConfirmar`: enviar enlace de recuperación, restablecer al documento, forzar cambio de contraseña, desactivar/reactivar una membresía.
2. **Monitoreo.** Tarjetas de canales (24 h vs tope), cola, exportaciones, accesos de soporte, última ejecución de cada cron; gráfico de 14 días; rebotes y quejas por colegio; avisos con error. Acciones: «Reintentar» por colegio y «Procesar la cola ahora».
3. **Auditoría.** Bitácora con filtros (colegio, acción, quién, fechas), paginación por cursor, detalle expandible y CSV.

## Reglas de negocio
- Toda acción exige `requireAdminPlataforma()` y se registra en `auditoria_plataforma` (acciones `usuario_restablecer_password`, `usuario_enviar_recuperacion`, `usuario_forzar_cambio_password`, `usuario_membresia_estado`, `avisos_reintentar`, `cola_procesar`) y, cuando afecta a un colegio, también en su `auditoria`.
- Restablecer al documento: solo con documento válido (`esquemaDocumento`), nunca a uno mismo; fija `debeCambiarPassword`. No devuelve ni registra la contraseña ni el documento.
- IP enmascarada: IPv4 `a.b.•.•`, IPv6 primeros dos grupos.
- Topes: `EMAIL_DAILY_LIMIT`, `WHATSAPP_DAILY_LIMIT`, `SMS_DAILY_LIMIT` sobre ventana móvil de 24 h (push no tiene). Barra con texto y aviso desde 80 %.
- Cron: `ConfigPlataforma` clave `cron:<avisos|exportaciones>` = `{ ultimaEjecucion, resultado: "ok"|"error", duracionMs }`, escrita por `registrarEjecucionCron` al terminar cada ruta de cron (nunca interrumpe al cron). Estado: al día ≤ 10 min · atrasado > 10 min · nunca.
- Reintentar: solo avisos en estado `error` del colegio pasan a `pendiente` (intentos 0, error vacío). Rebotes y quejas no se tocan.
- Auditoría: el detalle oculta valores de claves sensibles (`pass`, `contraseña`, `token`, `documento`, `dni`, `hash`, `key`…). CSV: máximo 5000 filas, anti-fórmulas (`aCsv`). Las acciones desconocidas se muestran con su código legible.

## Modelo de datos
Sin cambios de esquema. Usa `Profile`, `Membership`, `LoginIntento`, `Aviso`, `ExportacionColegio`, `AccesoSoporte`, `AuditoriaPlataforma`, `Auditoria`, `ConfigPlataforma`.

## Contratos de `src/lib/server`
```ts
// plataforma-usuarios.ts
buscarUsuarios(admin, { q?, pagina? }) // → { total, pagina, paginas, filas }
fichaUsuario(admin, userId)            // → ficha | null (IP enmascarada, sin número de documento)
restablecerPasswordUsuario(admin, userId) / enviarRecuperacionUsuario(admin, userId, enviar?)
forzarCambioPasswordUsuario(admin, userId) / cambiarEstadoMembresiaUsuario(admin, membershipId, activa)
// plataforma-monitoreo.ts
registrarEjecucionCron(nombre, resultado, duracionMs) / estadoCron(ejecucion, ahora) / panelMonitoreo(admin)
reintentarAvisosConError(admin, tenantId) / procesarColaAhora(admin)
// plataforma-auditoria.ts
listarAuditoria(admin, filtro, limite?) // → { filas, siguienteCursor }
exportarAuditoria(admin, filtro) / opcionesFiltroAuditoria(admin) / textoAccion(codigo) / registrarAuditoriaPlataforma(...)
```

## Rutas y UI
- `/usuarios` (buscador y lista), `/usuarios/[id]` (ficha, «← Usuarios»).
- `/monitoreo` (acción «Procesar la cola ahora» en el encabezado).
- `/auditoria` y `/auditoria/auditoria.csv`.

## Textos y UX
Estados con ícono + palabra (Al día / Atrasado / Nunca corrió; Activa / Invitada / Inactiva). «Hace N min». Gráfico con `GraficoDiario` (colores `chart-1`) y tabla `sr-only`.

## Errores y casos borde
- Persona sin documento válido: se ofrece solo el enlace de recuperación.
- Membresía ya en el estado pedido: mensaje claro, sin cambios.
- Si `procesarCola` falla: mensaje genérico y registro en consola.
- Una cuenta eliminada aparece como «Cuenta eliminada» en la bitácora.

## Pruebas
- integración: `tests/integracion/operacion-plataforma.test.ts` (búsqueda, acciones auditadas, sin datos de alumnos, cron, reintentos, filtros y cursor de auditoría).
- e2e: `tests/e2e/operacion-plataforma.test.ts` (uno corto por módulo).

## Pendientes
- Correo de aviso a la persona tras restablecer su contraseña desde plataforma.
- Auditoría: el filtro «Quién» solo busca entre super administradores.
- `GraficoDiario` rotula «Total 30 días» aunque aquí son 14 (componente compartido).
