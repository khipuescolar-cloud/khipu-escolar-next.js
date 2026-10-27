# 01 — Arquitectura multitenant

> Estado: implementado (base) · Plan: todos · Última actualización: 2026-10-27 (Claude Code · modo soporte)

## Objetivo
Un solo sistema para muchos colegios (tenants), donde ningún colegio ve datos de otro, y cada colegio tiene su propio subdominio.

## Decisiones
- Una sola base de datos Postgres (Supabase), con `tenant_id` en todas las tablas de negocio.
- **Prisma 7** es el dueño del esquema y del acceso a datos. **Supabase solo da Auth** (usuarios, contraseñas, recuperación).
- Prisma se conecta con un rol que salta RLS. Por eso **el aislamiento real está en `dbTenant(tenantId)`** (`src/lib/server/db.ts`), una extensión de Prisma que:
  - agrega `tenantId` a todo `where` (find, update, delete, count, aggregate, groupBy, upsert);
  - fuerza `tenantId` en `create`, `createMany` y `upsert`;
  - borra `tenantId` del `data` de los `update` (no se puede mover una fila a otro colegio);
  - con `dbTenant(tenantId, { soloLectura: true })` (modo soporte) lanza `ErrorSoloLectura` («Modo soporte: solo lectura») en toda escritura: create, createMany(AndReturn), update, updateMany(AndReturn), upsert, delete y deleteMany, de cualquier modelo.
- **Respaldo:** RLS activado y forzado en todas las tablas, sin políticas, con `REVOKE ALL` para `anon` y `authenticated` (migración `rls_cerrado`). Nadie puede leer datos por PostgREST con la clave pública.
- Modelos globales sin `tenantId`: `Tenant`, `Profile`, `LoginIntento`, `PushSuscripcion`.
- La lógica de negocio va en `src/lib/server/*`, para poder migrar a Go cambiando solo esa capa.

## Resolución del colegio
1. **Subdominio:** `src/proxy.ts` lee el `Host`. `<slug>.<APP_BASE_DOMAIN>/x` → rewrite a `/colegio/<slug>/x`. `/` → `/inicio`. `/login` en un subdominio → login raíz.
2. En el dominio raíz, `/colegio/<slug>/…` redirige al subdominio.
3. `/api/webhooks/*` y `/api/cron/*` son globales (no se reescriben).
4. En desarrollo, `APP_BASE_DOMAIN=lvh.me:3000` (lvh.me y sus subdominios resuelven a 127.0.0.1). En producción, `khipuescolar.pe` (por confirmar).
5. La sesión de Supabase usa cookies con `COOKIE_DOMAIN` (`.lvh.me` / `.khipuescolar.pe`) para valer en todos los subdominios.

## Contexto por request
```ts
const ctx = await requireTenantContext(slug, rolesPermitidos?)
// ctx: { tenant, user (Profile), membership, rol, roles, db (dbTenant), soporte?: { accesoId, expiraAt } }
```
- Verifica la sesión con `supabase.auth.getUser()`, el colegio (no suspendido) y una membresía `activa`. La lógica sin cookies está en `resolverContextoColegio(user, slug, rolPreferido?)`.
- **Modo soporte (specs/16):** sin membresía, un super administrador activo con un `AccesoSoporte` vigente para ese colegio recibe rol `direccion`, `ctx.soporte` y `ctx.db` de solo lectura; `requireFeature` le niega `mensajes`, `notas`, `libreta` y `nudito`, y cada request se audita como `soporte_ver` en la auditoría del colegio.
- Si el usuario tiene varios roles en el colegio, se usa la cookie `khipu_rol` o la prioridad: dirección > profesor > portería > apoderado > alumno.
- Alcance por rol (`tenant.ts`):
  - `salonIdsVisibles`: dirección y portería ven todos; el profesor, donde es tutor o dicta; el apoderado, los salones de sus hijos.
  - `alumnoIdsVisibles`: el apoderado ve solo a sus hijos.
  - `requireAlumnoVisible` y `requireCursoDelProfesor` devuelven 403.

## Reglas para el código
- Nunca uses un `tenantId` que venga del cliente.
- En los `create`, usa FKs escalares (`alumnoId`), no `connect`.
- Usa `db` (sin filtro) solo para tablas globales o para flujos sin sesión ya validados (token de justificación, webhooks y cron).

## Pruebas
- `tests/unit/dominio.test.ts`: lectura del slug desde el host.
- `tests/integracion/aislamiento-tenant.test.ts`: lectura, edición y creación aisladas por colegio.

## Pendientes
- **Externo:** dominio definitivo y región de Supabase (sugerida `sa-east-1`; ver `docs/despliegue.md`).
- **Externo:** subdominio de correo por colegio.

## Despliegue
Pasos de Supabase cloud, Vercel (dominio comodín, `APP_BASE_DOMAIN`, `COOKIE_DOMAIN`), crons y correo en `docs/despliegue.md`.
