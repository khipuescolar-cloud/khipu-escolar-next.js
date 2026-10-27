# Panel de plataforma: super administrador, crear colegios y reportes

| Campo | Valor |
|---|---|
| Fecha | 2026-10-27 |
| Colaborador | Carlos (vía Claude Code orquestador) |
| Agente y modelo | Claude Code (subagente) · claude-opus-5-5 |
| Rama y commits | `feat/plataforma` · ver `git log` de la rama |
| Specs afectadas | `specs/16-plataforma-superadmin.md`, `specs/00-indice.md` |

## Pedidos del colaborador (textual)
> si, crealo con subagentes; necesitamos la vista principal del super super admin, luego dentro del mismo podemos crear un tenant que sera un nuevo colegio, tambien vamos a poder ver el reporte de todos los tenants, cuando se crea un nuvo tenant se va a subir la insignia del colegio, el nombre, un pequeño eslogan si es que lo usan , el correo del administrador principal de ese colegio , al correo que acabamos de registrar como administrador principal le llegara un correo de bienvenida al sistema y que sus credenciales seran el correo que ingreso y su contraseña sera su dni, para esto cuando se crea el nuevo tenant debe solicitar los datos de la persona involucrada; bueno despues de que le llegue el correo con las credenciales podra darle click a un boton que le aparezca donde estara la ruta del dominio del sistema, y con eso mismo poder ingresar al sistema

Encargo del orquestador (resumen): construir `src/lib/server/plataforma.ts` (acceso, auditoría, métricas, reporte, `crearColegio` con compensación y el resto de acciones), las páginas de `src/app/plataforma/`, el script `khipu:crear-superadmin`, mostrar el eslogan en el encabezado del colegio, y tests unit, de integración y e2e, reutilizando la base ya hecha en main.

## Decisiones
- `AdminContext = { user }` solo lo produce `verificarAdminPlataforma()`; `requireAdminPlataforma()` lo envuelve con `cache()` y `usuarioActual()`. Las funciones del servidor reciben el contexto (como `TenantContext`) y vuelven a consultar todo id del cliente (404 si no existe o no es del colegio).
- Contraseña inicial pendiente → redirect a `/cambiar-password?siguiente=<panel>` en el dominio raíz (el subdominio `admin` reescribe todo a `/plataforma`).
- `logo.ts`: se extrajeron `validarLogo`, `reemplazarLogo` y `retirarLogo` (sin `TenantContext`); `subirLogoColegio`/`quitarLogoColegio` siguen igual por fuera.
- La insignia se valida antes de crear el tenant; la compensación borra archivos del proveedor, el tenant (cascade) y, solo si la cuenta era nueva, el usuario de Auth y su perfil.
- «Usuarios activos» y «último ingreso» salen de `login_intentos` por correo (no hay `userId`). «Avisos de hoy» = correos de las últimas 24 h, la misma ventana móvil con la que la cola aplica `EMAIL_DAILY_LIMIT`.
- Métricas de 30 días como tabla semanal (sin gráfico).
- Exportar ZIP desde la plataforma reutiliza `exportarColegioZip` con un contexto sintético de «dirección» (cargo «Equipo Khipu»); queda en ambas auditorías.
- Los formularios largos (nuevo colegio, agregar administrador) envían con `onSubmit` + `useActionState` para no vaciar los campos si hay error.
- `SUBDOMINIOS_RESERVADOS` ahora se exporta de `src/lib/dominio.ts`; `sugerirSlug`/`errorDeSlug` (puros) se usan en el formulario y en el servidor.

## Cambios realizados
- `src/lib/server/plataforma.ts` (nuevo), `src/lib/server/logo.ts` (helpers sin contexto), `src/lib/dominio.ts` (export), `src/lib/slug-colegio.ts` y `src/lib/csv.ts` (nuevos, puros).
- `src/app/plataforma/`: `layout.tsx`, `page.tsx`, `actions.ts`, `EstadoColegio.tsx`, `colegios/page.tsx`, `colegios/reporte.csv/route.ts`, `colegios/nuevo/{page,CamposColegio}.tsx`, `colegios/[id]/page.tsx`, `colegios/[id]/exportar/route.ts`, `colegios/{CamposAdministrador,FormularioPlataforma}.tsx`.
- `src/app/colegio/[slug]/layout.tsx`: eslogan bajo el nombre del colegio (una línea).
- `scripts/crear-superadmin.ts` + script `khipu:crear-superadmin` en `package.json`.
- Tests: `tests/unit/slug-colegio.test.ts`, `tests/integracion/plataforma-superadmin.test.ts`, `tests/e2e/plataforma-superadmin.test.ts`.
- `specs/16-plataforma-superadmin.md` completada (implementado), `specs/00-indice.md`, `AGENTS.md` (comando y cuenta demo del super administrador).

## Validación
- `pnpm lint` sin errores ni avisos; `pnpm typecheck` sin errores.
- `pnpm test`: 29 archivos, 257 tests OK (nuevos: 20 unit + 13 de integración).
- `E2E_PORT=3008 pnpm exec playwright test`: 27 tests; 26 OK a la primera y 1 (`pasar-lista-aviso-justificar`) falló por `net::ERR_NETWORK_CHANGED` (red) y pasó al reintentarlo solo. Los 2 e2e nuevos pasan.
- El script `khipu:crear-superadmin` se probó con una cuenta `@test-plat.demo` (crear, promover, faltan argumentos) y se borró.
- Limpieza verificada: 0 colegios `test-plat-*`, 0 perfiles y 0 usuarios de Auth `@test-plat.demo` después de las pruebas.

## Pendientes y preguntas abiertas
- Huecos del esquema (no se cambió `schema.prisma`):
  - `login_intentos` sin `user_id`: las métricas de actividad se calculan por correo;
  - sin índice en `auditoria_plataforma.tenant_id`;
  - sin `profiles.ultimo_ingreso`.
- `crearCuentaConDocumento` completa datos vacíos de un perfil existente; la compensación no los revierte.
- La página 403 global enlaza a `/inicio`, que en el panel no existe.
- Gráfico de las métricas de 30 días (hoy es una tabla semanal).
