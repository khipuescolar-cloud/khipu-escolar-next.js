# 16 — Plataforma: super administrador

> Estado: implementado · Plan: interno (equipo Khipu) · Última actualización: 2026-10-27 (Claude Code)

## Objetivo
Que el equipo de Khipu cree colegios (tenants), los monitoree y gestione su ciclo de vida desde un panel propio. Khipu es un SaaS y este es el usuario principal.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Super administrador (`admins_plataforma.activo`) | Ver métricas agregadas de todos los colegios; crear colegios; cambiar plan, estado, datos e insignia; reenviar la bienvenida; agregar administradores; exportar el ZIP de un colegio | Ver chats, notas, asistencia por alumno ni nombres de alumnos o familias; borrar colegios (solo por script); crear otros super administradores desde la web |
| Cualquier otro usuario | — | Entrar al panel (403) |

## Acceso
- Tabla `admins_plataforma` (`AdminPlataforma`). La cuenta se crea solo por script (`pnpm khipu:crear-superadmin`), nunca desde la web. En local, el seed crea `admin@khipuescolar.demo` / `demo123`.
- Panel en `admin.<APP_BASE_DOMAIN>` (local: http://admin.lvh.me:3000). `proxy.ts` reescribe a `src/app/plataforma/…`.
- Al entrar desde `/login`, `iniciarSesion` devuelve el destino `plataforma`.
- Cada página, action y route handler llama a `requireAdminPlataforma()` (cacheada por request): sin sesión → `/login`; `debeCambiarPassword` → `/cambiar-password?siguiente=<panel>`; sin `AdminPlataforma.activo` → 403.
- Toda acción queda en `auditoria_plataforma` (actor, acción, colegio y detalle sin datos personales).
- **Privacidad (Ley 29733):** el super administrador ve métricas agregadas (conteos) y la configuración. **No** ve chats, notas ni datos de alumnos. Un test de integración lo verifica.

## Flujos
### Vista principal (`/`)
- KPIs globales:
  - colegios por estado y plan;
  - alumnos activos;
  - usuarios activos (correos distintos con ingreso exitoso en `login_intentos` en los últimos 7 días);
  - correos de las últimas 24 h frente a `EMAIL_DAILY_LIMIT` (la misma ventana móvil que usa la cola);
  - apertura de la semana (abiertos / enviados, meta 70 %);
  - rebotes y quejas (7 días);
  - cola: pendientes, retrasados (pendientes con más de 15 min), atascados (en `enviando` más de `ENVIANDO_MAX_MINUTOS`) y con error (7 días).
- Cada indicador con semáforo de ícono + palabra («Bien» / «Revisar»).
- Lista de colegios con buscador (nombre, subdominio o ciudad) y botón «Nuevo colegio».

### Crear colegio (`/colegios/nuevo`)
1. **Colegio:**
   - insignia o escudo (PNG, JPG o WEBP, máximo 1 MB; vista previa en el navegador; se guarda pública con `FileStorage` en `tenants.logo_archivo_id`);
   - nombre;
   - eslogan (opcional, máx. 140);
   - subdominio: se sugiere a partir del nombre (`sugerirSlug`) y se muestra en vivo `<slug>.<APP_BASE_DOMAIN>`;
   - ciudad, plan, estado (piloto o activo), dominios de correo (opcional) y escala de notas.
2. **Administrador principal (rol `direccion`):** correo, nombres, apellidos, tipo y número de documento (DNI de 8 dígitos por defecto), teléfono, género (opcional) y cargo.
3. Al guardar, `crearColegio()`:
   - valida todo con zod y la insignia antes de crear nada;
   - crea el tenant (subdominio único);
   - guarda la insignia (`reemplazarLogo`);
   - `crearCuentaConDocumento()` crea el usuario con contraseña = número de documento y `debeCambiarPassword = true` (si el correo ya tenía cuenta, la reutiliza sin tocar su contraseña);
   - crea la membresía `direccion` **activa** con su cargo;
   - `encolarBienvenida()` encola el correo **bienvenida**;
   - audita `crear_colegio`.
   La action procesa la cola al instante con `after()` + `procesarCola({ tenantId })`.
4. **Compensación:** si algo falla después de crear el tenant, se borran los archivos del proveedor y el colegio (cascade) y, si la cuenta era nueva, el usuario de Supabase Auth y su perfil. Al final se muestra el error en el formulario, que conserva lo escrito.
5. **El correo** (plantilla `bienvenida`) dice cuál es su usuario (el correo), que su contraseña inicial es su número de DNI (**nunca se envía el número**) e incluye la dirección del colegio y el botón «Ingresar a Khipu Escolar» con el enlace a `http(s)://<slug>.<dominio>/inicio`.
6. **Primer ingreso:** el botón lleva al subdominio → `/login?colegio=<slug>` → con correo + DNI → `/cambiar-password` (no puede contener el documento) → `/entrando` → `/inicio` del colegio.

### Reporte de colegios (`/colegios`)
- **Tabla:** colegio, subdominio, plan, estado, alumnos, profesores, familias, último ingreso (de cualquier miembro), asistencia registrada (7 días), avisos y apertura (7 días), rebotes y fecha de alta.
- **Filtros:** texto (nombre, subdominio o ciudad), plan y estado.
- **CSV:** `/colegios/reporte.csv` con los mismos filtros (UTF-8 con BOM, celdas que empiezan con `= + - @` se anteponen con `'`).

### Detalle (`/colegios/[id]`)
- Insignia, nombre, eslogan, estado, plan, ciudad, alta y enlace al subdominio.
- Resumen (alumnos, profesores, familias, asistencia, apertura y último ingreso).
- Métricas de los últimos 30 días por semana: asistencia registrada, correos enviados, apertura, rebotes y quejas, ingresos.
- Administradores: nombre, cargo, correo y si ya cambió su contraseña inicial.
- Acciones (todas auditadas): cambiar plan, cambiar estado (piloto, activo o suspendido), editar datos, cambiar insignia, reenviar la bienvenida, agregar otro administrador, exportar ZIP (`/colegios/[id]/exportar`, asíncrono).
- Bitácora de la plataforma para ese colegio (últimas 20 acciones).
- **Borrado:** solo con el script `khipu:borrar-colegio`; el panel no borra.

## Reglas de negocio
- Subdominio: 3 a 40 caracteres, `[a-z0-9-]`, sin guion al inicio, al final ni doble; no puede ser `www`, `app`, `api` ni `admin` (`SUBDOMINIOS_RESERVADOS` en `src/lib/dominio.ts`); único.
- Ningún id del cliente se usa sin volver a consultarlo: `tenantId` debe existir (404 si no) y la membresía a reenviar debe ser `direccion` de ese colegio.
- El super administrador no tiene `TenantContext`: las escrituras del colegio usan `dbTenant(tenant.id)` con FK escalares.
- Exportar desde la plataforma usa la misma cola asíncrona que dirección (spec 15): `/colegios/[id]/exportar` es una página con «Preparar exportación» (`solicitarExportacion`), la lista de exportaciones con su estado y «Descargar» (`/colegios/[id]/exportar/descargar/[exportacionId]`, válido 7 días). Queda en la auditoría del colegio (actor = super administrador, al terminar) y en `auditoria_plataforma` (`exportar_colegio`, al solicitar y al descargar). `exportarColegioDesdePlataforma` (síncrono) se conserva solo para pruebas.
- Agregar un administrador que ya es dirección activa del colegio → error; si estaba inactivo/invitado, se reactiva.
- Reenviar la bienvenida indica «contraseña inicial = documento» solo si la persona aún no la cambió.

## Modelo de datos
- `admins_plataforma` (`userId`, `activo`).
- `auditoria_plataforma` (`actorId`, `accion`, `tenantId` sin FK, `detalle` JSON).
- `tenants.eslogan`, `tenants.logo_archivo_id`.
- `profiles.tipo_documento`, `numero_documento`, `debe_cambiar_password`.
- `memberships.cargo`.
- Se leen (solo conteos): `alumnos`, `memberships`, `asistencias`, `avisos`, `login_intentos`.

## Contratos de `src/lib/server`
```ts
// src/lib/server/plataforma.ts
type AdminContext = { user: Profile };
verificarAdminPlataforma(user: Profile | null): Promise<AdminContext>   // redirect login / cambiar-password, 403
requireAdminPlataforma(): Promise<AdminContext>                         // cache por request
auditarPlataforma(admin, accion, tenantId | null, detalle?): Promise<void>
crearColegio(admin, { colegio, administrador }, insignia?: Buffer): Promise<{ tenant, userId, cuentaNueva, avisoId }>
cambiarPlan(admin, tenantId, plan) · cambiarEstado(admin, tenantId, estado)
editarColegio(admin, tenantId, { nombre, eslogan, ciudad, emailDomains, escalaCalificacion })
cambiarInsignia(admin, tenantId, buffer | null)
reenviarBienvenida(admin, tenantId, membershipId): Promise<avisoId>
agregarAdministrador(admin, tenantId, persona + cargo): Promise<{ userId, cuentaNueva, membership }>
exportarColegioDesdePlataforma(admin, tenantId): Promise<{ tenant, zip }>
metricasPlataforma(admin): Promise<MetricasPlataforma>
reporteColegios(admin, { q?, plan?, estado? }): Promise<FilaReporte[]>
detalleColegio(admin, tenantId): Promise<{ tenant, fila, administradores, logoUrl, dias: DiaMetricas[] }>
auditoriaDelColegio(admin, tenantId, limite?)

// src/lib/server/logo.ts (sin TenantContext; los usan dirección y la plataforma)
validarLogo(buffer) · reemplazarLogo(tenant, buffer, subidoPorId) → archivoId · retirarLogo(tenant)

// src/lib/slug-colegio.ts (puro)
sugerirSlug(nombre) · errorDeSlug(slug) → mensaje | null
// src/lib/csv.ts (puro)
aCsv(encabezados, filas)
```

## Rutas y UI
- `admin.<dominio>/` → `src/app/plataforma/page.tsx`: vista principal.
- `/colegios` → reporte con filtros y CSV (`/colegios/reporte.csv`, route handler).
- `/colegios/nuevo` → formulario en dos secciones (Colegio / Administrador principal).
- `/colegios/[id]` → detalle y acciones; `/colegios/[id]/exportar` → exportaciones del colegio (pedir y descargar el ZIP).
- Layout propio: logo de Khipu, etiqueta «Plataforma Khipu», navegación, nombre del usuario y «Salir».
- En el encabezado del colegio (`src/app/colegio/[slug]/layout.tsx`) se muestra el eslogan bajo el nombre.

## Textos y UX
- Estados del colegio con ícono + palabra: «Activo» (check), «Piloto» (matraz), «Suspendido» (prohibido).
- Formulario: «Será su contraseña inicial. No se envía por correo.» bajo el número de documento; «El colegio estará en `<slug>.<dominio>`».
- Al crear: «Colegio creado. Enviamos el correo de bienvenida al administrador principal.»

## Errores y casos borde
- Subdominio repetido (incluida la carrera P2002) → «La dirección «x» ya está en uso. Elige otra.»
- Insignia de otro tipo o > 1 MB → error antes de crear nada.
- Correo que ya tenía cuenta → se reutiliza (no se cambia su contraseña; el correo lo dice) y, si falla algo, no se borra.
- Falla a mitad de la creación → compensación (ver arriba).
- Id inexistente o no UUID → 404.

## Script
`pnpm khipu:crear-superadmin --email x --nombres … --apellidos … [--documento 12345678]`: crea la cuenta (contraseña = documento o una temporal que se muestra una sola vez) o promueve una existente (conserva su contraseña); en ambos casos `debeCambiarPassword = true` y `admins_plataforma.activo = true`. Se ejecuta solo en el servidor (`tsx --conditions=react-server`).

## Pruebas
- unit: `tests/unit/slug-colegio.test.ts` (sugerencia y validación del subdominio, reservados, CSV).
- integración: `tests/integracion/plataforma-superadmin.test.ts` (403 para no administradores e inactivos, redirect con contraseña inicial, creación completa con aviso sin el DNI, login con el DNI, subdominios inválidos, acciones auditadas, 404 con ids ajenos, ZIP, compensación con cuenta nueva y existente, reportes sin datos de alumnos).
- e2e: `tests/e2e/plataforma-superadmin.test.ts` (crear colegio con insignia y administrador con DNI → correo en Mailpit con el botón al subdominio → ingreso con DNI → cambio obligatorio de contraseña → `/inicio` del colegio; un usuario de colegio recibe 403 en el panel).

## Pendientes
- `login_intentos` no guarda `userId` ni colegio: «usuarios activos» y «último ingreso» se calculan por correo. Si una persona está en varios colegios, su ingreso cuenta para todos.
- `profiles` no tiene `ultimo_ingreso`; las consultas por colegio hacen join por correo (bien para el piloto, revisar con volumen).
- `auditoria_plataforma` no tiene índice por `tenant_id` (la bitácora del detalle filtra por él).
- `crearCuentaConDocumento` completa datos vacíos de un perfil existente (p. ej. el documento); la compensación no los revierte.
- La página 403 global enlaza a `/inicio`, que no existe en el panel.
- Métricas de 30 días como tabla semanal; un gráfico queda para después.
