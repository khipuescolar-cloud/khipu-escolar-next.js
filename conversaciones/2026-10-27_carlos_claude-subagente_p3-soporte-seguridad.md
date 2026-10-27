# P3 · Soporte y seguridad (aviso de soporte, solo lectura completo, último ingreso, suspendidos, título del tutor)

| Campo | Valor |
|---|---|
| Fecha | 2026-10-27 |
| Colaborador | Carlos (dueño del producto) |
| Agente y modelo | Claude Code (subagente del orquestador) · claude-opus-5-5 |
| Rama y commits | `feat/p3-soporte-seguridad` · ver `git log` de la rama («Notify school direction on support access and harden read-only mode») |
| Specs afectadas | `specs/16-plataforma-superadmin.md`, `specs/01-arquitectura-multitenant.md`, `specs/02-autenticacion-login.md`, `specs/06-avisos-notificaciones.md`, `specs/11-notas-y-libreta.md` |

## Pedidos del colaborador (textual)
> Si borralos , si ya no lo estamos usando y ya no lo necesitamos , no hay problema con borrarlos no? y porfavor ve resolviendo todos los pendientes que tengamos , quiero que por a hora trabajes de manera autonoma resolviendo cada problema que tengas y que lances multiagentes para que solucioones todos, si necesitas lazar 50 miltiagentes no hay problema pr que la finalidad es que termines con todo lo pendiente que tuvimos

(El orquestador asignó a este subagente el frente `soporte-seguridad`: aviso a dirección al entrar en modo soporte, solo lectura completo, `ultimo_ingreso_at` en todos los ingresos, soporte a colegios suspendidos y título del tutor en la libreta.)

## Decisiones
- **Aviso de soporte:** plantilla nueva `soporte_inicio` (tipo `alerta_direccion`, sin emojis, botón «Ver auditoría»), encolada a cada membresía activa de `direccion` por correo y/o push según su perfil (`destinoPersonal`); `referenciaId = accesoId`. Se usa el tipo existente `alerta_direccion` para no tocar el esquema.
- **Campana:** `soporteVigenteHasta(tenantId)` (solo accesos de super administradores activos); el layout del colegio agrega «Soporte de Khipu activo hasta HH:mm» → `/configuracion/auditoria` para dirección (no en modo soporte).
- **Solo lectura completo:** se interceptan `$executeRaw`/`$executeRawUnsafe` (siempre bloqueados) y `$queryRaw`/`$queryRawUnsafe` (permitidos solo si son una lectura pura: una sentencia `SELECT`/`WITH` sin palabras de escritura, `FOR UPDATE`, `nextval`, `set_config`…). Las transacciones pasan por las mismas intercepciones.
- **Último ingreso:** `registrarIngreso(usuario, ip)` en `/auth/callback`, `/restablecer` y `/cambiar-password`, con ventana de 5 min para no duplicar (callback → restablecer o login → cambiar contraseña = un ingreso). `ipDeCabeceras` centraliza la IP (también en el login).
- **Colegios suspendidos:** se permite el acceso de soporte (es cuando más se necesita), siempre solo lectura, con motivo, vencimiento, aviso a dirección y auditoría (`suspendido: true`). Los miembros siguen con 403.
- **Título del tutor:** ya estaba implementado (`tituloProfesor(genero, "tutor")` en página y PDF); se agregó test unitario y de integración y se corrigió la spec 11 (se quitó de «Pendientes»).

## Cambios realizados
- `src/lib/server/db.ts`: intercepción de SQL crudo en modo solo lectura (`esSqlDeSoloLectura`).
- `src/lib/server/auth.ts`: `ipDeCabeceras`, `registrarIngreso`, `VENTANA_INGRESO_MINUTOS`.
- `src/app/auth/callback/route.ts`, `src/app/(publico)/restablecer/actions.ts`, `src/app/(publico)/cambiar-password/actions.ts`, `src/app/(publico)/login/actions.ts`: registran el ingreso / usan `ipDeCabeceras`. El callback además rechaza destinos `//…`.
- `src/lib/server/notificaciones/aviso-soporte.ts` (nuevo) y `src/lib/server/plataforma.ts`: aviso al iniciar soporte; se quitó el bloqueo a suspendidos.
- `src/lib/server/tenant.ts` (solo parte de soporte): `soporteVigenteHasta`; colegio suspendido ignora membresías pero acepta soporte.
- `src/app/colegio/[slug]/layout.tsx`: notificación de soporte en la campana.
- `src/app/plataforma/colegios/[id]/page.tsx`: «Entrar como soporte» visible también en suspendidos.
- `src/lib/server/email/plantillas/index.ts`: plantilla `soporte_inicio`.
- Tests: `tests/integracion/soporte-seguridad.test.ts` (nuevo), `tests/unit/titulo-tutor-libreta.test.ts` (nuevo), `tests/unit/plantillas-avisos.test.ts`, `tests/e2e/plataforma-superadmin.test.ts` (campana de dirección y limpieza de avisos).

## Validación
- `pnpm lint` ✓ · `pnpm typecheck` ✓ · `pnpm test` ✓ (46 archivos, 384 pruebas; `soporte-seguridad.test.ts` 8/8).
- `E2E_PORT=3032 playwright test plataforma-superadmin login-flow notas-libreta` ✓ (15/15).

## Pendientes y preguntas abiertas
- `esSqlDeSoloLectura` es una heurística por palabras clave: suficiente porque el código del colegio no usa SQL crudo con `ctx.db`; si algún día se usa, preferir una transacción `READ ONLY` real.
- El aviso de soporte no se envía al terminar el acceso (solo al inicio); la auditoría registra `soporte_fin`.
