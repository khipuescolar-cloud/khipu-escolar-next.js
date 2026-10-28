# 2026-10-28 · carlos · Claude Code · Panel de plataforma v2 (planes, roles, responsables y más)

- **Colaborador:** carlos
- **Agente:** Claude Code (Opus 5.5) como orquestador + 5 subagentes (Opus para planes/roles; Sonnet para el resto)
- **Ramas:** `feat/p4-planes-roles`, `feat/p4-colegio-comercial`, `feat/p4-operacion`, `feat/p4-plataforma-config`, `feat/p4-nombres-planes` → integradas en `main` y borradas
- **Migraciones:** `20261028120000_plataforma_v2` (10 tablas; siembra el catálogo de planes y los responsables desde las direcciones activas) y `20261028120100_tenant_modulos_id`
- **Specs:** 19 (planes, módulos y roles), 20 (responsables y suscripciones), 21 (operación), 22 (equipo, anuncios y configuración); actualizadas 03, 16 y 18

## Pedidos del colaborador (textuales)

> [captura de la barra lateral] si es un submodulo no deberia tener ese diseño no tampoco deberia verse asi , ten en cuenta que crear un nuevo colegio no deberia ser un nuevo modulo, ya que esa es una funcion dentro del modulo de colegios

> aqui en esta panel faltan bastantes cosas , como el tema de los planes, los roles por defectos que dispondremos a cada colegio, los modulos que podran ver cada plan , configurar cada colegio para agregar mas de 1 responsable , etc . ponte creativo y agrega modulos necesarios para este sistema

## Decisiones

- Barra lateral de la plataforma por grupos: Vista principal · COLEGIOS (Colegios, Suscripciones) · CATÁLOGO (Planes y módulos, Roles y permisos) · OPERACIÓN (Usuarios, Monitoreo, Anuncios) · PLATAFORMA (Equipo Khipu, Configuración, Auditoría). Las acciones van dentro de cada módulo.
- Planes y permisos salen de la BD (`PlanModulo`, `TenantModulo`, `RolModulo`) con respaldo en el código; `gestion` es esencial; desde el panel solo se puede desactivar lo que el código soporta por rol; el bloqueo sigue en el servidor (`tieneFeature`/`requireFeature`). Caché por request + 30 s, invalidada al guardar.
- Responsables: varios por colegio, un principal único, con o sin acceso como dirección.
- Suscripciones y pagos: registro manual (sin pasarela); MRR = activas, anuales/12.
- Avisos automáticos de asistencia se envían aunque el colegio no tenga el módulo `avisos` (es solo la pantalla de seguimiento).
- Feriados extra (nacionales, regionales y por colegio) cuentan para los 15 días hábiles.
- Integración: conflictos en el layout del colegio (Nudito con `tieneFeature` + horario), asistencia (imports) y ficha del colegio; arreglo de la página que se desbordaba con tablas anchas (`min-w-0` en `MarcoPanel`); «Total N días» dinámico en los gráficos.

## Validación

- `pnpm lint`, `pnpm typecheck`: limpios. `pnpm test`: 62 archivos, 560 pruebas OK. `pnpm e2e`: 49/49 (un `ERR_NETWORK_CHANGED` transitorio, repetido y en verde).

## Pendientes

- Aplicar las 2 migraciones nuevas al Supabase en la nube (requiere confirmación del colaborador; `pnpm dev:nube` las necesita).
- Recordatorios de renovación por correo, comprobantes adjuntos, otras monedas; horario de Nudito por colegio; estadísticas de lectura de anuncios; correo a la persona tras restablecer su contraseña desde plataforma.
