# 16 — Plataforma: super administrador

> Estado: implementado · Plan: interno (equipo Khipu) · Última actualización: 2026-10-27 (Claude Code · pendientes v2: métricas por `user_id`, gráficos y acceso de soporte; p3: aviso a dirección, soporte a suspendidos y solo lectura en SQL crudo)

## Objetivo
Que el equipo de Khipu cree colegios (tenants), los monitoree y gestione su ciclo de vida desde un panel propio. Khipu es un SaaS y este es el usuario principal.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Super administrador (`admins_plataforma.activo`) | Ver métricas agregadas de todos los colegios; crear colegios; cambiar plan, estado, datos e insignia; reenviar la bienvenida; agregar administradores; exportar el ZIP de un colegio; entrar a un colegio como **soporte** (solo lectura, con motivo y vencimiento) | Ver chats, notas, libretas ni Nudito (tampoco en modo soporte); escribir nada en el colegio en modo soporte; ver nombres de alumnos o familias desde el panel; borrar colegios (solo por script); crear otros super administradores desde la web |
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
  - usuarios activos: perfiles con membresía activa en algún colegio y `profiles.ultimo_ingreso_at` en los últimos 7 días;
  - correos de las últimas 24 h frente a `EMAIL_DAILY_LIMIT` (la misma ventana móvil que usa la cola);
  - apertura de la semana (abiertos / enviados, meta 70 %);
  - rebotes y quejas (7 días);
  - cola: pendientes, retrasados (pendientes con más de 15 min), atascados (en `enviando` más de `ENVIANDO_MAX_MINUTOS`) y con error (7 días).
- Cada indicador con semáforo de ícono + palabra («Bien» / «Revisar»).
- **Últimos 30 días** (gráficos con `src/components/ui/chart.tsx` + recharts, colores `--chart-1`/`--chart-2`; la 2.ª serie además punteada y con leyenda):
  - ingresos diarios (personas distintas por `login_intentos.user_id`, día en hora de Lima);
  - correos enviados frente a abiertos por día;
  - alumnos activos por colegio (barras horizontales, los 8 mayores + «Otros»).
  Cada gráfico tiene una tabla `sr-only` con los mismos datos y un total de 30 días en texto (`serieDiariaPlataforma`).
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
- **Tabla:** colegio, subdominio, plan, estado, alumnos, profesores, familias, último ingreso (máximo `ultimo_ingreso_at` de los perfiles con membresía activa en ese colegio), asistencia registrada (7 días), avisos y apertura (7 días), rebotes y fecha de alta. `FilaReporte.usuariosActivos7d`: perfiles con membresía activa en el colegio e ingreso en los últimos 7 días.
- **Filtros:** texto (nombre, subdominio o ciudad), plan y estado.
- **CSV:** `/colegios/reporte.csv` con los mismos filtros (UTF-8 con BOM, celdas que empiezan con `= + - @` se anteponen con `'`).

### Detalle (`/colegios/[id]`)
- Insignia, nombre, eslogan, estado, plan, ciudad, alta y enlace al subdominio.
- Resumen (alumnos, profesores, familias, usuarios activos 7 d, asistencia, apertura y último ingreso).
- Últimos 30 días en gráficos diarios: ingresos (`login_intentos.user_id` de miembros activos del colegio), correos enviados frente a abiertos y asistencia registrada (cada uno con tabla `sr-only`). La tabla por semana sigue disponible en «Ver la tabla por semana» (`<details>`).
- Administradores: nombre, cargo, correo y si ya cambió su contraseña inicial.
- Acciones (todas auditadas): cambiar plan, cambiar estado (piloto, activo o suspendido), editar datos, cambiar insignia, reenviar la bienvenida, agregar otro administrador, exportar ZIP (`/colegios/[id]/exportar`, asíncrono).
- Bitácora de la plataforma para ese colegio (últimas 20 acciones; filtra y ordena por `(tenant_id, created_at)`, que tiene índice).
- **Borrado:** solo con el script `khipu:borrar-colegio`; el panel no borra.

### Acceso de soporte (`AccesoSoporte`, tabla `accesos_soporte`)
1. En la ficha, «Entrar como soporte» abre un `Dialog` con **motivo** (obligatorio, 5–300 caracteres) y duración (30, 60 o 120 min). No aparece si ya hay un acceso vigente. **Sí aparece en colegios suspendidos** (decisión p3: un colegio suspendido es justo cuando más se necesita soporte; sigue siendo solo lectura, con motivo, vencimiento y auditoría, y la auditoría de plataforma guarda `suspendido: true`). Los miembros del colegio suspendido siguen recibiendo 403.
2. `iniciarAccesoSoporte()` cierra cualquier acceso abierto del mismo administrador en ese colegio, crea el `AccesoSoporte` (`inicioAt`, `expiraAt`), audita `soporte_inicio` (motivo, minutos y si estaba suspendido), **avisa a la dirección** (`avisarInicioSoporte`, `src/lib/server/notificaciones/aviso-soporte.ts`: plantilla `soporte_inicio`, tipo `alerta_direccion`, `referenciaId = accesoId`, a cada membresía activa de rol `direccion`, por correo y/o push según sus preferencias; nunca a otros roles) y la action redirige a `<slug>.<dominio>/inicio`.
3. `requireTenantContext` (`resolverContextoColegio` en `tenant.ts`): si el usuario **no** tiene membresía activa pero es super administrador activo con un acceso **vigente** (sin `cerradoAt` y `expiraAt` futuro) en ese colegio, arma un contexto con rol `direccion`, una membresía sintética (`MEMBERSHIP_SOPORTE_ID`, cargo «Soporte Khipu»), `ctx.soporte = { accesoId, expiraAt }` y **`ctx.db` de solo lectura** (`dbTenant(id, { soloLectura: true })`): create, createMany(AndReturn), update, updateMany(AndReturn), upsert, delete y deleteMany lanzan `ErrorSoloLectura` («Modo soporte: solo lectura»), también sobre modelos globales; también `$executeRaw`/`$executeRawUnsafe` y los `$queryRaw`/`$queryRawUnsafe` que no sean una lectura pura (`esSqlDeSoloLectura`: una sola sentencia `SELECT`/`WITH` sin `INSERT/UPDATE/DELETE/…`, `FOR UPDATE`, `nextval`, `set_config`…). `$transaction` (en lote o interactiva) pasa por las mismas intercepciones. Un colegio **suspendido** ignora las membresías (403 para todos) pero admite el acceso de soporte vigente. Vencido, cerrado, admin inactivo o un usuario que no es admin con un `AccesoSoporte` a su nombre → 403.
4. **Privacidad:** en modo soporte `requireFeature`/`tieneFeature` (`plan.ts`, `FEATURES_PRIVADAS_SOPORTE`) niegan `mensajes`, `notas`, `libreta` y `nudito` aunque el plan los incluya (todas sus páginas, actions y route handlers ya llaman a `requireFeature`). La exportación ZIP del colegio (`/api/exportar`) también se niega. La barra lateral oculta esos módulos.
5. Cada request en modo soporte registra `auditar({ accion: "soporte_ver", entidad: "colegio", detalle: { accesoId } })` en la auditoría **del colegio** (una vez por request: `contextoDelColegio` está cacheado).
6. Banner en el layout del colegio: «Modo soporte · solo lectura · vence a las HH:mm · Terminar». «Terminar» es un POST de formulario a `admin.<dominio>/soporte/terminar` (route handler que exige `Origin` de nuestro dominio y `requireAdminPlataforma`), que cierra el acceso, audita `soporte_fin` y vuelve a la ficha. En la ficha también hay «Terminar acceso» (con confirmación).
7. Si un super administrador además es miembro del colegio, entra con su membresía normal (sin modo soporte).
8. **Transparencia en el panel del colegio:** mientras haya un acceso vigente de un super administrador activo (`soporteVigenteHasta(tenantId)` en `tenant.ts`), la dirección (no en modo soporte) ve en la campana de la barra superior «Soporte de Khipu activo hasta HH:mm» con enlace a `/configuracion/auditoria`.

## Reglas de negocio
- Subdominio: 3 a 40 caracteres, `[a-z0-9-]`, sin guion al inicio, al final ni doble; no puede ser `www`, `app`, `api` ni `admin` (`SUBDOMINIOS_RESERVADOS` en `src/lib/dominio.ts`); único.
- Ningún id del cliente se usa sin volver a consultarlo: `tenantId` debe existir (404 si no) y la membresía a reenviar debe ser `direccion` de ese colegio.
- El super administrador no tiene `TenantContext`: las escrituras del colegio usan `dbTenant(tenant.id)` con FK escalares.
- Exportar desde la plataforma usa la misma cola asíncrona que dirección (spec 15): `/colegios/[id]/exportar` es una página con «Preparar exportación» (`solicitarExportacion`), la lista de exportaciones con su estado y «Descargar» (`/colegios/[id]/exportar/descargar/[exportacionId]`, válido 7 días). Queda en la auditoría del colegio (actor = super administrador, al terminar) y en `auditoria_plataforma` (`exportar_colegio`, al solicitar y al descargar). `exportarColegioDesdePlataforma` (síncrono) se conserva solo para pruebas.
- Agregar un administrador que ya es dirección activa del colegio → error; si estaba inactivo/invitado, se reactiva.
- `crearCuentaConDocumento` devuelve `camposCompletados` (datos vacíos de un perfil existente que llenó). Si luego falla `crearColegio` o `agregarAdministrador`, la compensación (`revertirCamposCompletados`) los vuelve a `null`, salvo los que alguien cambió entretanto.
- Reenviar la bienvenida indica «contraseña inicial = documento» solo si la persona aún no la cambió.

## Modelo de datos
- `admins_plataforma` (`userId`, `activo`).
- `auditoria_plataforma` (`actorId`, `accion`, `tenantId` sin FK, `detalle` JSON; índice `(tenant_id, created_at)`). Acciones: `crear_colegio`, `cambiar_plan`, `cambiar_estado`, `editar_colegio`, `cambiar_insignia`, `reenviar_bienvenida`, `agregar_administrador`, `exportar_colegio`, `soporte_inicio`, `soporte_fin`.
- `accesos_soporte` (`tenantId`, `adminId`, `motivo`, `inicioAt`, `expiraAt`, `cerradoAt`).
- `login_intentos.user_id` (solo ingresos exitosos) y `profiles.ultimo_ingreso_at`, que `iniciarSesion` llena vía `registrarIntentoLogin` (specs/02).
- `tenants.eslogan`, `tenants.logo_archivo_id`.
- `profiles.tipo_documento`, `numero_documento`, `debe_cambiar_password`.
- `memberships.cargo`.
- Se leen (solo conteos): `alumnos`, `memberships`, `profiles.ultimo_ingreso_at`, `asistencias`, `avisos`, `login_intentos`.

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
auditoriaDelColegio(admin, tenantId, limite?, desde?)
serieDiariaPlataforma(admin): Promise<{ fecha, ingresos, enviados, abiertos }[]>   // 30 días
iniciarAccesoSoporte(admin, tenantId, { motivo, minutos: 30 | 60 | 120 }): Promise<{ accesoId, expiraAt, url }>
terminarAccesoSoporte(admin, accesoId): Promise<{ tenantId } | null>   // solo accesos propios
accesoSoporteActual(admin, tenantId)

// src/lib/server/tenant.ts
resolverContextoColegio(user, slug, rolPreferido?): Promise<TenantContext>   // membresía o soporte vigente; 403/404
accesoSoporteVigente(userId, tenantId)
soporteVigenteHasta(tenantId): Promise<Date | null>   // campana de dirección
avisarInicioSoporte(tenantId, { id, motivo, expiraAt }): Promise<number>   // notificaciones/aviso-soporte.ts
// src/lib/server/db.ts
dbTenant(tenantId, { soloLectura? }) · ErrorSoloLectura
// src/lib/server/cuentas.ts
crearCuentaConDocumento(persona): Promise<{ userId, nueva, camposCompletados }> · revertirCamposCompletados(cuenta, persona)

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
- `POST /soporte/terminar` → cierra un acceso de soporte desde el banner del colegio.
- La página 403 global (`src/app/forbidden.tsx`) enlaza a `/` («Volver al inicio»), que existe tanto en el panel como en el colegio.
- Layout propio: logo de Khipu, etiqueta «Plataforma Khipu», navegación, nombre del usuario y «Salir».
- En el encabezado del colegio (`src/app/colegio/[slug]/layout.tsx`) se muestra el eslogan bajo el nombre.

- Módulos `/equipo`, `/anuncios` y `/configuracion`: ver `specs/22-equipo-anuncios-y-configuracion.md`. El script `crear-superadmin` usa ahora `src/lib/server/plataforma-equipo.ts`.

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
- integración: `tests/integracion/plataforma-superadmin.test.ts` (403 para no administradores e inactivos, redirect con contraseña inicial, creación completa con aviso sin el DNI, login con el DNI, subdominios inválidos, acciones auditadas, 404 con ids ajenos, ZIP, compensación con cuenta nueva y existente —revierte los datos completados y respeta los que ya tenía—, reportes sin datos de alumnos).
- integración: `tests/integracion/acceso-soporte.test.ts` (acceso vigente → contexto `direccion` de solo lectura; cada escritura lanza «Modo soporte: solo lectura»; mensajes/notas/libreta/Nudito → 403; `soporte_ver` en la auditoría del colegio; terminado, vencido, admin inactivo o no-admin con un acceso a su nombre → 403; no se cierra un acceso ajeno; login guarda `userId`/`ultimoIngresoAt` y el reporte cuenta activos por membresía; `camposCompletados`).
- integración: `tests/integracion/soporte-seguridad.test.ts` (`soporte_inicio` encolado a cada directora según sus preferencias y a ningún otro rol; campana vigente/terminada/admin inactivo; `$executeRaw(Unsafe)`, `$queryRaw` de escritura, `FOR UPDATE` y `$transaction` con escrituras → «Modo soporte»; lecturas crudas permitidas; colegio suspendido: soporte entra y los miembros no; `registrarIngreso`; título del tutor en la libreta).
- e2e: `tests/e2e/plataforma-superadmin.test.ts` (crear colegio con insignia y administrador con DNI → correo en Mailpit con el botón al subdominio → ingreso con DNI → cambio obligatorio de contraseña → `/inicio` del colegio; un usuario de colegio recibe 403 en el panel; modo soporte: gráficos en la vista principal, «Entrar como soporte» con motivo → banner en el colegio, `/mensajes` y `/notas` → 403, la dirección del colegio ve «Soporte de Khipu activo hasta HH:mm» en su campana y llega a la auditoría; «Terminar» → vuelve a la ficha y el colegio da 403).

## Pendientes
- `login_intentos` anteriores a la migración `20261027180000_pendientes_v2` no tienen `user_id`: los gráficos de ingresos solo cuentan desde entonces.

## Marca (2026-10-28)
Panel de plataforma y pantallas públicas según el manual de marca: títulos en `text-titulo-2`, tarjetas sin sombra con borde `arena`, cabeceras de tabla con `sobretitulo`, insignias de estado y plan `rounded-pildora` con ícono + palabra, título de pestaña «… · Khipu Escolar». El carnet público (`/q/[token]`) se titula «Carnet escolar».
