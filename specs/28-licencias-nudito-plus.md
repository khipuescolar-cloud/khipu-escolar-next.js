# 28 — Licencias de Nudito+ (venta por alumno, pago con Yape)

> Estado: en construcción · Plan: Khipu Pro (complemento pagado por la familia) · Última actualización: 2026-10-31 (Claude Code)

## Objetivo
Vender **Nudito+** (tutor IA, `specs/29`) **por alumno** a las familias de colegios con plan `pro`. La familia paga por
adelantado (prepago, p. ej. S/ 20 al mes) con Yape u otro medio; el equipo Khipu verifica el abono y activa la licencia
desde el **panel de plataforma**. No necesita autorización del colegio. Antes de usarlo, el apoderado acepta el
consentimiento de uso de IA (Ley 29733).

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| super administrador (equipo Khipu) | Registrar y verificar pagos, crear, extender y cancelar licencias, ver historial | Ver conversaciones de los alumnos |
| apoderado | Ver estado de la licencia de su hijo, reportar un pago (n.° de operación), aceptar o revocar el consentimiento | Activar licencias |
| dirección del colegio | (por definir) ver qué alumnos tienen Nudito+ | Cobrar, activar o cancelar |
| alumno | Usar Nudito+ con licencia vigente y consentimiento | Ver pagos |

## Flujos
1. La familia paga por Yape y reporta el pago (opcional): `PagoNudito` con `estado = pendiente`, `apoderadoId`, `referencia`.
2. El equipo Khipu verifica el abono en el panel: `estado = verificado`, `registradoPorId`, `verificadoAt`; crea o extiende la `LicenciaNudito` (`origen = pago`) y enlaza `PagoNudito.licenciaId`.
3. Cortesías y pruebas: licencia con `origen = cortesia | prueba`, sin pago.
4. Un cron marca `estado = vencida` cuando `hasta < hoy` (hora de Lima).
5. El apoderado acepta el consentimiento (`ConsentimientoIa`) antes del primer uso; puede revocarlo (`revocadoAt`).

## Reglas de negocio
- **Licencia vigente:** `estado = activa` y `desde <= hoy <= hasta` (fechas en hora de Lima; `hasta` incluido). Índice `licencias_nudito(alumno_id, estado, hasta)`.
- Solo para colegios con `Tenant.plan = pro`; si el colegio baja de plan, Nudito+ se bloquea aunque la licencia siga vigente (por definir: compensación).
- Uso permitido = licencia vigente **y** consentimiento vigente (`revocadoAt` null) de un apoderado del alumno.
- Historial: nunca se borra una licencia; renovar = nueva fila o extender `hasta` (decidir en la implementación; preferible fila nueva por periodo pagado).
- Aviso a la familia al activar o por vencer: `TipoAviso.nudito`.
- Las licencias y pagos tienen `tenantId` (datos del colegio): el panel de plataforma usa el cliente `db` global y pasa `tenantId` explícito.

## Modelo de datos
Migración `20261031130000_pro_completo_nudito_plus`.

- **`LicenciaNudito`** (`licencias_nudito`, por colegio): `alumnoId`, `estado` (`EstadoLicenciaNudito`: `activa | vencida | cancelada`, def. `activa`), `origen` (`OrigenLicenciaNudito`: `pago | cortesia | prueba`, def. `pago`), `desde`/`hasta` (Date, `hasta` incluido; CHECK `hasta >= desde`), `registradaPorId` (perfil del super administrador, sin FK), `notas`, `createdAt`, `updatedAt`. Relación `pagos`.
- **`PagoNudito`** (`pagos_nudito`, por colegio): `alumnoId`, `licenciaId?` (SetNull), `apoderadoId?` (membresía que pagó/reportó, SetNull), `monto` Decimal(10,2) > 0, `moneda` (def. `PEN`), `meses` (def. 1, > 0), `metodo` (`MetodoPagoNudito`: `yape | transferencia | otro`, def. `yape`), `referencia` (n.° de operación), `fechaPago` (Date), `estado` (`EstadoPagoNudito`: `pendiente | verificado | rechazado`, def. `pendiente`), `registradoPorId?` (perfil del super administrador, sin FK), `verificadoAt?`, `notas`, `createdAt`.
- **`ConsentimientoIa`** (`consentimientos_ia`, por colegio): `apoderadoId` (membresía, Cascade), `alumnoId`, `versionTexto`, `aceptadoAt`, `ip`, `revocadoAt`.
- **Configuración global** (`ConfigPlataforma`, clave → JSON):
  - `nudito_plus:precio` → `{ "montoMensual": 20, "moneda": "PEN" }`
  - `nudito_plus:yape` → `{ "numero": "…", "titular": "…" }` (datos que se muestran a la familia para pagar)
  - `nudito_plus:consentimiento` → `{ "version": "2026-11", "texto": "…" }` (versión vigente del texto)

## Contratos de `src/lib/server`
```ts
// por definir: licencia-nudito.ts — licenciaVigente(tenantId, alumnoId, hoy), registrarPago, verificarPago, activarLicencia, cancelarLicencia
```

## Rutas y UI
- Por definir: panel de plataforma `/nudito-plus` (pagos pendientes, licencias); familia: tarjeta «Nudito+» del hijo.

## Textos y UX
- Por definir.

## Errores y casos borde
- Pago duplicado (misma `referencia`): por definir si se agrega índice único.
- Alumno retirado con licencia vigente: por definir.

## Pruebas
- Por definir.

## Pendientes
- Política de reembolso y prorrateo; boleta electrónica.
- ¿Índice único por `referencia`? ¿Una sola licencia `activa` por alumno a la vez (índice parcial)?
- Qué ve dirección del colegio.
