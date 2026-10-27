# 16 — Plataforma: super administrador

> Estado: borrador (requisitos) · Última actualización: 2026-10-27 (Claude Code). Quien lo implemente completa las secciones de la plantilla. · Plan: interno (equipo Khipu)

## Objetivo
Que el equipo de Khipu cree colegios (tenants), los monitoree y gestione su ciclo de vida desde un panel propio. Khipu es un SaaS y este es el usuario principal.

## Acceso (base ya implementada)
- Tabla `admins_plataforma` (`AdminPlataforma`). La cuenta se crea solo por script, nunca desde la web. En local, el seed crea `admin@khipuescolar.demo` / `demo123`.
- Panel en `admin.<APP_BASE_DOMAIN>` (local: http://admin.lvh.me:3000). `proxy.ts` reescribe a `src/app/plataforma/…`.
- Al entrar desde `/login`, `iniciarSesion` devuelve el destino `plataforma`.
- Cada página y acción debe llamar a `requireAdminPlataforma()`, que verifica la sesión, `AdminPlataforma.activo` y `debeCambiarPassword` (con 403 o redirect).
- Toda acción queda en `auditoria_plataforma`.
- **Privacidad (Ley 29733):** el super administrador ve métricas agregadas y la configuración. **No** ve chats, notas ni datos de alumnos.

## Vista principal (`/`)
- KPIs globales: colegios por estado y plan, alumnos, usuarios activos (últimos 7 días, a partir de `login_intentos`), avisos de hoy frente a `EMAIL_DAILY_LIMIT`, apertura de la semana (meta: 70 %), rebotes y quejas, cola pendiente o atascada.
- Lista de colegios con buscador.
- Botón «Nuevo colegio».

## Crear colegio (`/colegios/nuevo`)
1. **Datos del colegio:**
   - insignia o escudo (imagen PNG, JPG o WEBP, máximo 1 MB; se guarda con `FileStorage` en `tenants.logo_archivo_id`);
   - nombre;
   - eslogan (opcional);
   - slug o subdominio (sugerido a partir del nombre; único; minúsculas, números y guiones; no puede ser un subdominio reservado: www, app, api, admin);
   - ciudad, plan, estado (piloto o activo), dominios de correo (opcional) y escala de notas.
2. **Administrador principal (rol `direccion`):** correo, nombres, apellidos, tipo y número de documento (DNI de 8 dígitos por defecto), teléfono, género (opcional) y cargo (p. ej. «Director general»).
3. Al guardar, en una sola operación:
   - se crea el tenant;
   - `crearCuentaConDocumento()` (`src/lib/server/cuentas.ts`) crea el usuario con contraseña = su número de documento y `debeCambiarPassword = true`;
   - se crea la membresía `direccion` (activa, con su cargo);
   - `encolarBienvenida()` encola el correo **bienvenida**, que se procesa al instante con `after()` + `procesarCola()`.
   - Si algo falla después de crear el usuario de Auth, se deshace (borrar el colegio y, si la cuenta es nueva, el usuario).
4. **El correo** (plantilla `bienvenida`) dice cuál es su usuario (el correo), que su contraseña inicial es su número de DNI (**nunca se envía el número**) e incluye la dirección del colegio y el botón «Ingresar a Khipu Escolar» con el enlace al subdominio.
5. **En su primer ingreso** se le obliga a cambiar la contraseña (`/cambiar-password`, ya implementado; no puede contener el documento).

## Reporte de colegios (`/colegios` y `/colegios/[id]`)
- **Tabla:** colegio, plan, estado, alumnos, profesores, familias, último ingreso, asistencia registrada (7 días), avisos y apertura (7 días), rebotes y fecha de alta. Se puede filtrar y descargar en CSV.
- **Detalle:**
  - métricas en el tiempo (últimos 30 días);
  - datos y administrador principal;
  - acciones (todas auditadas): cambiar plan, cambiar estado (piloto, activo o suspendido), editar datos e insignia, reenviar la bienvenida, agregar otro administrador, exportar ZIP (garantía de salida).
- **Borrado:** solo con el script `khipu:borrar-colegio`; el panel no borra.

## Script
`pnpm khipu:crear-superadmin --email x --nombres … --apellidos …`: crea o promueve una cuenta y la marca para cambiar la contraseña. Se ejecuta solo en el servidor.
