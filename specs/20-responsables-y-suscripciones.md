# 20 — Responsables del colegio y suscripciones

> Estado: implementado · Plan: Interno (plataforma) · Última actualización: 2026-10-28 (Claude subagente p4-colegio-comercial)

## Objetivo
El equipo Khipu necesita saber con quién habla en cada colegio (varios responsables, uno principal) y llevar a mano el contrato comercial: plan, ciclo, monto, renovación y pagos. No hay pasarela ni cobro automático.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Super administrador | Todo lo de este módulo (ficha del colegio y `/suscripciones`) | Ver datos personales de alumnos |
| Dirección del colegio | Ver sus responsables (solo lectura) en `/configuracion` | Editarlos; ver suscripción o pagos |

## Flujos
1. Crear colegio: el administrador principal queda también como responsable principal; opcionalmente un segundo responsable (p. ej. facturación) sin acceso.
2. Ficha → «Responsables»: agregar (Sheet), editar, marcar como principal, reenviar bienvenida, quitar.
3. Dar acceso: casilla «Darle acceso al sistema como dirección» reutiliza `agregarAdministrador` (cuenta con documento, membresía `direccion`, correo de bienvenida).
4. Ficha → «Suscripción»: crear/editar (Sheet), registrar pago (Dialog), anular pago (confirmación). Si el plan de la suscripción difiere del plan del colegio se ofrece «Aplicar plan al colegio» (reutiliza `cambiarPlanAction`).
5. `/suscripciones`: resumen, tabla con filtros (estado, plan) y CSV.

## Reglas de negocio
- Exactamente un principal por colegio (transacción en `marcarPrincipal`); el anterior pasa a «Dirección académica».
- Quitar al principal exige `reemplazoId`. Si tiene acceso se puede desactivar su membresía (por defecto no).
- El correo de un responsable con acceso no se edita (es su usuario). Correo único por colegio.
- Todo administrador agregado con `agregarAdministrador` se enlaza/crea como contacto (principal si el colegio no tenía).
- Ingreso mensual recurrente = suscripciones **activas**; anual / 12. Las de prueba no cuentan.
- Renovación: `vencida` si la fecha < hoy (Lima); `por vencer` si faltan 0–30 días; vence hoy cuenta como por vencer. «Vencidas sin pago» y «renuevan en 30 días» solo cuentan suscripciones en prueba o activa.
- Registrar un pago puede mover la próxima renovación al día siguiente del fin del periodo (si es posterior). Anular = borrar el registro; el detalle queda en la auditoría.
- Alumnos activos reales (estado `activo`) vs. contratados: alerta si se pasa.

## Modelo de datos
`ContactoColegio` (tipo, principal, `membershipId`), `Suscripcion` (una por colegio), `PagoRegistro` (método en texto: transferencia, yape, plin, deposito, otro). Sin cambios de esquema.

## Contratos de `src/lib/server`
```ts
// plataforma-responsables.ts
listarResponsables(admin, tenantId): Responsable[]            // con estado de acceso y último ingreso
responsablesAnteKhipu(tenantId)                               // vista de la dirección (sin notas)
agregarResponsable(admin, tenantId, entrada, acceso?)         // con acceso → agregarAdministrador
editarResponsable / marcarPrincipal / quitarResponsable(admin, tenantId, id, { reemplazoId?, desactivarAcceso? })
// plataforma-suscripciones.ts
suscripcionDelColegio(admin, tenantId); guardarSuscripcion(admin, tenantId, entrada)
registrarPago(admin, tenantId, entrada); anularPago(admin, tenantId, pagoId)
reporteSuscripciones(admin, filtro, hoy?) ; resumir(filas)
// src/lib/comercial.ts (puro): ingresoMensualRecurrente, estadoRenovacion, textoRenovacion, finDePeriodo, etiquetas
```
Auditoría (`auditoria_plataforma`): `agregar_responsable`, `editar_responsable`, `marcar_responsable_principal`, `quitar_responsable`, `guardar_suscripcion`, `registrar_pago`, `anular_pago`.

## Rutas y UI
- `/colegios/[id]`: secciones «Responsables» y «Suscripción» (reemplazan «Administradores» y «Agregar otro administrador»).
- `/suscripciones` y `/suscripciones/reporte.csv` (super administrador).
- `/colegio/[slug]/configuracion` (dirección): tarjeta «Responsables ante Khipu».

## Textos y UX
Estados con ícono + palabra («Vence en N días», «Vencida hace N días», «Pasa el contrato»). Montos en S/ (`es-PE`), fechas en Lima. Íconos `Receipt`, `CalendarClock`, `FileText`; sin monedas ni tarjetas.

## Errores y casos borde
Correo repetido, principal sin reemplazo, periodo invertido, monto ≤ 0, renovación antes del inicio, ids de otro colegio (404).

## Pruebas
- unit: `tests/unit/comercial.test.ts` · integración: `tests/integracion/plataforma-comercial.test.ts` · e2e: `tests/e2e/plataforma-comercial.test.ts` y `plataforma-superadmin.test.ts` (selectores del formulario de nuevo colegio).

## Pendientes
- Recordatorios automáticos de renovación por correo; adjuntar comprobantes; multimoneda (hoy solo PEN).
