# 19 — Planes, módulos y roles (desde la base de datos)

> Estado: implementado · Plan: todos (panel interno de plataforma) · Última actualización: 2026-10-28 (Claude Code)

## Objetivo
Que el equipo Khipu configure desde el panel de plataforma, sin desplegar código: qué módulos incluye cada plan
(y su nombre comercial y precio referencial), qué módulos extra o quitados tiene cada colegio, y qué módulos ve
cada uno de los roles por defecto de todos los colegios. El bloqueo sigue siendo del servidor (`requireFeature`).

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Super administrador (`AdminPlataforma`) | Editar planes, la matriz módulos × planes, la matriz rol × módulo, restablecer roles y ajustar módulos de un colegio (con motivo). Todo auditado. | Quitar o desactivar `gestion`; dar a un rol un módulo que su código no soporta. |
| Usuarios de colegio | Ven solo los módulos activos de su colegio y habilitados para su rol. | Ver nada de este panel. |

## Flujos
1. **Planes y módulos** (`/planes`): tarjetas por plan (nombre comercial, descripción, precio por alumno, mínimo mensual,
   tope de alumnos, activo, colegios en piloto/activos que lo usan) con «Editar» en `Sheet`. Debajo, la matriz
   módulos × planes (ícono de `navegacion.ts` + descripción): cada casilla incluye o quita el módulo. Quitar un módulo
   de un plan con colegios pide confirmación con `BotonConfirmar` («Afecta a N colegios»). `gestion` aparece fija («Siempre»).
2. **Roles y permisos** (`/roles`): los 6 roles (dirección, profesor, administrativo, portería, familia, alumno) con lo
   que hace cada uno y la matriz rol × módulo: «Habilitado» (clic → confirmar «Desactivar», afecta a todos los
   colegios), «Desactivado» (clic → habilitar), «No disponible» (el código no tiene pantallas para ese rol; no se
   puede activar) y «Esencial» (`gestion`). Botón «Restablecer valores por defecto» (borra todos los ajustes).
3. **Ficha del colegio** (`/colegios/[id]`, sección «Módulos del colegio»): cada módulo con su estado
   «Incluido por el plan» / «Extra» / «Quitado» / «No incluido» y su motivo; botones «Agregar», «Quitar» o «Volver
   al plan» abren un `Dialog` con el motivo (obligatorio, ≥ 5 caracteres, salvo «Volver al plan»).

## Reglas de negocio
- **Resolución central** (`src/lib/server/modulos.ts` + `src/lib/modulos.ts`):
  `módulos del colegio = PlanModulo(plan) ± TenantModulo(colegio)`. Si el plan no tiene filas en `plan_modulos`, se usa
  `FEATURES` (código) como respaldo. `TenantModulo.habilitado=true` agrega un extra (solo si el plan no lo trae);
  `false` lo quita (solo si el plan lo trae). Claves desconocidas se ignoran. `gestion` siempre está.
- **Roles**: `ROLES_SOPORTADOS` = roles de `MOSAICOS` por módulo + usos fuera de la navegación (la familia usa
  `avisos` para sus preferencias y push). `RolModulo.habilitado=false` lo quita a ese rol en todos los colegios; sin
  fila = habilitado. Solo se guardan combinaciones soportadas.
- **`TenantContext`** gana `modulos` (activos del colegio) y `accesoModulos` (`quitadosColegio`, `quitadosRol`,
  `nombrePlan`, `planMinimo` por módulo). Lo arma `resolverContextoColegio` (también en modo soporte, como dirección).
- **`tieneFeature(ctx, f)`** = no privado en soporte && `ctx.modulos.has(f)` && no desactivado para el rol
  (salvo `gestion`). La restricción por rol que fija el código sigue en `requireRol`/cada página. `requireFeature` no
  cambia por fuera: todas las páginas, actions y route handlers quedan cubiertos.
- **Navegación e inicio** (`estadoModulo(ctx, f)`): quitado al colegio o al rol, privado en soporte, o que ningún plan
  incluye → no se muestra; no está en el plan → candado con el nombre del plan mínimo que lo incluye según el
  catálogo (prefiere planes activos, por `orden`); si no → enlace. «Plan X» del inicio y de Configuración usa el
  nombre comercial del catálogo.
- **Caché**: `cache` de React por request y caché en memoria de 30 s por proceso (catálogo global y ajustes por
  colegio). Cada guardado del panel la invalida (`invalidarCacheModulos`). Con varias instancias, las demás ven el
  cambio en ≤ 30 s.
- Cambiar los módulos de un plan cuando aún no tenía filas guarda primero los del código (no se pierden).
- Auditoría de plataforma: `editar_plan`, `plan_modulo` (con `colegiosAfectados`), `rol_modulo`, `restablecer_roles`,
  `colegio_modulo` (con `tenantId`, motivo).

## Modelo de datos
`PlanCatalogo` (`planes_catalogo`: nombre, descripción, `precioPorAlumno`, `precioMinimoMensual`, `maxAlumnos`, `orden`,
`activo`), `PlanModulo` (`plan_modulos`: plan + módulo), `RolModulo` (`rol_modulos`: rol + módulo + habilitado),
`TenantModulo` (`tenant_modulos`: colegio + módulo + habilitado + motivo). Los tres primeros son globales
(`MODELOS_GLOBALES`). Migración `20261028120000_plataforma_v2` (siembra el catálogo igual que `FEATURES`).

## Contratos de `src/lib/server`
```ts
// modulos.ts
modulosDelColegio(tenant): Promise<ModulosResueltos>          // { activos, delPlan, extras, quitados }
accesoModulos(tenant, rol): Promise<{ modulos, accesoModulos }> // para TenantContext
catalogoModulos(): Promise<CatalogoModulos>                     // planes + desactivados por rol (caché 30 s)
planMinimoDelCatalogo(catalogo, modulo): { plan, nombre } | null
invalidarCacheModulos(alcance?: "todo" | { tenantId })
// plan.ts
tieneFeature(ctx, f): boolean · requireFeature(ctx, f): void (403) · estadoModulo(ctx, f): activo | oculto | bloqueado
// plataforma-planes.ts (requieren AdminContext; validan con zod; ErrorDeNegocio con mensaje)
planesDelCatalogo(admin) · editarPlan(admin, plan, entrada) · cambiarModuloDePlan(admin, plan, modulo, incluir) → { afectados }
modulosDeColegioParaPanel(admin, tenantId) · cambiarModuloDeColegio(admin, tenantId, { modulo, accion, motivo }) → mensaje
// plataforma-roles.ts
matrizRoles(admin) · cambiarModuloDeRol(admin, { rol, modulo, habilitado }) · restablecerRoles(admin) → filas borradas
// src/lib/modulos.ts (puro): INFO_MODULO, INFO_ROL, ROLES_SOPORTADOS, rolSoporta, rolPuedeVer, resolverModulos,
// modulosDeCodigo, accesoModulosDeCodigo (contextos sintéticos y tests)
```

## Rutas y UI
- `admin.<dominio>/planes` — «Planes y módulos» (`src/app/plataforma/planes/`).
- `admin.<dominio>/roles` — «Roles y permisos» (`src/app/plataforma/roles/`).
- `admin.<dominio>/colegios/[id]` — sección «Módulos del colegio» (`ModulosColegio.tsx`, `CambiarModuloColegio.tsx`,
  `modulos-actions.ts`).

## Textos y UX
Estados siempre con ícono + palabra: «Incluido» / «No incluido» / «Siempre», «Habilitado» / «Desactivado» /
«No disponible» / «Esencial», «Incluido por el plan» / «Extra» / «Quitado» / «No incluido». Montos en soles
(`Intl.NumberFormat("es-PE", PEN)`); precio vacío = «A convenir». Éxito con toast.

## Errores y casos borde
- Quitar `gestion` (plan, colegio o rol) → «Gestión es un módulo esencial…».
- Rol no soportado → «Ese módulo no está disponible para este rol.»
- Motivo vacío al agregar/quitar en un colegio → «Escribe el motivo del cambio (mínimo 5 caracteres).»
- «Agregar» un módulo que el plan ya trae o «Quitar» un extra = volver a lo del plan (se borra el ajuste).
- Si ningún plan incluye un módulo que el colegio no tiene, se oculta (no hay candado que ofrecer).

## Pruebas
- unit: `tests/unit/modulos.test.ts` (resolución, respaldo, roles soportados) y `tests/unit/nombres-planes.test.ts`
  (nombres con respaldo, inactivos fuera de `planesOfrecidos`).
- integración: `tests/integracion/planes-modulos-roles.test.ts` (quitar de un plan → 403 en páginas/acciones; extra
  por colegio; quitar a un rol solo afecta a ese rol; `gestion` intocable; caché invalidada al guardar; restablecer).
- e2e: `tests/e2e/planes-modulos.test.ts` (quita Agenda del plan Familia → candado «Plan Pro Max» en Academia Euler y
  `/agenda` sin acceso; restaura).

## Nombres comerciales de los planes
- `nombresDePlanes()` (`Record<Plan, string>`, catálogo cacheado con `NOMBRE_PLAN` de respaldo) y `planesOfrecidos()`
  (solo `activo`, por `orden`) en `src/lib/server/modulos.ts`; versiones puras `nombresDeCatalogo` / `ofrecidosDeCatalogo`.
- Todas las pantallas y CSV de plataforma (vista principal, colegios, ficha, suscripciones, anuncios) muestran el nombre
  comercial; los componentes cliente lo reciben por props. Filtros y reportes listan todos los planes; **«Nuevo colegio»**,
  el selector de plan de la ficha y el de la suscripción ofrecen solo planes activos (si el colegio ya tiene un plan
  inactivo, se muestra igual como «<nombre> (no se ofrece)»). En el colegio, `ctx.accesoModulos.nombrePlan` ya trae el nombre.
- `NOMBRE_PLAN` queda solo como respaldo.

## Decisión: módulo `avisos`
El módulo `avisos` es la pantalla de seguimiento «Avisos enviados». Quitarlo a un colegio **no detiene** los avisos
automáticos de falta/tardanza a las familias: son parte de asistencia y se siguen enviando. (Texto en la descripción del
módulo en `/planes`.)

## Pendientes
- Caché en memoria por proceso: con varias instancias, un cambio tarda hasta 30 s en verse en las demás.
