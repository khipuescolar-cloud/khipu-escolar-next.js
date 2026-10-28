# App instalable (PWA) y camino a tiendas — frente p5-pwa

| Campo | Valor |
|---|---|
| Fecha | 2026-10-28 |
| Colaborador | Carlos (dirección del proyecto) |
| Agente y modelo | Claude Code (subagente del orquestador) · claude-opus-5-5 |
| Rama y commits | `feat/p5-pwa` · ver `git log` de la rama |
| Specs afectadas | `specs/24-app-instalable.md` (nueva), `specs/00-indice.md`, `specs/04-asistencia.md` |

## Pedidos del colaborador (textual)
> okey necesito que vayas avanzando con algo mas , no se si sepas pero necesito que este sistema tambien sea descargable como si fuera un app, entonces vamos creando eso mismo y tambien quiero que crees la primera landing del proyecto, ahi mostraras todas las funcionalidades, si necesitas capturas tu mismo puedes hacerlo , si quieres ejemplo tu mismo puedes trabajarlo; despliega multiagentes para que todo esto se trabaje y lo dejo todo en tus manos, ire a descansar

(Este frente cubre solo la parte «descargable como si fuera un app»; la landing la hace otro agente.)

## Decisiones
- PWA completa con `src/app/manifest.ts` (reemplaza `public/manifest.webmanifest`); mismo manifiesto con rutas relativas en todos los orígenes: cada colegio se instala desde su subdominio.
- Íconos maskable (zona segura 80 %) y de atajos generados con `sharp` por `scripts/generar-iconos-app.mjs`; capturas de los colegios demo con Playwright, optimizadas en `public/app/capturas/`.
- Service worker versionado sin `skipWaiting` automático: toast «Hay una nueva versión · Actualizar». Navegaciones sin red → `/sin-conexion` precacheada. Nunca se cachean páginas con datos de alumnos. Push y colas offline intactos.
- Registro del SW en el layout raíz (antes solo en portería y pasar lista).
- Instalación guiada: tarjeta en el inicio (30 días al cerrarla), ítem en el menú de cuenta y página pública `/instalar`. En iOS, pasos de Safari.
- Cambios mínimos en `src/components/shell/**` (permitidos por el pedido): `Proveedores` (`/instalar`, `/sin-conexion` como rutas públicas), `MenuUsuario` (ítem «Instalar app»), `BarraSuperior` (`pt-[env(safe-area-inset-top)]` con `box-content`).
- `src/proxy.ts`: solo se agregó `RUTAS_APP` (pasan sin reescribir en colegios y panel). El cambio de `pathname === "/"` queda para el agente de la landing.
- Tiendas: `docs/app-tiendas.md` (Google Play como TWA con PWABuilder/Bubblewrap, App Store con advertencia de la guía 4.2 y alternativa Capacitor); ruta `/.well-known/assetlinks.json` desde `ANDROID_PACKAGE_NAME` y `ANDROID_SHA256_FINGERPRINTS`.

## Cambios realizados
- `src/app/manifest.ts`, `src/app/layout.tsx` (appleWebApp, formatDetection, viewportFit, registro del SW), `public/sw.js`, `src/components/RegistrarServiceWorker.tsx`.
- `src/components/app/InstalarApp.tsx`, `src/lib/app-instalable.ts`, `src/lib/app-tiendas.ts`, `src/app/.well-known/assetlinks.json/route.ts`.
- `src/app/(publico)/instalar/page.tsx`, `src/app/(publico)/sin-conexion/page.tsx`, tarjeta en `src/app/colegio/[slug]/inicio/page.tsx`.
- `src/proxy.ts`, `src/components/shell/{Proveedores,MenuUsuario,BarraSuperior}.tsx`, `src/components/nudito/NuditoWidget.tsx` (área segura).
- `public/marca/icono-maskable-{192,512}.png`, `public/marca/atajo-*.png`, `public/app/capturas/*.png`, `scripts/generar-iconos-app.mjs`.
- `docs/app-tiendas.md`, `docs/despliegue.md` (§6c), `.env.example`.
- Tests: `tests/unit/app-instalable.test.ts`, `tests/e2e/app-instalable.test.ts`.

## Validación
- `pnpm lint && pnpm typecheck && pnpm test`: verde (586 tests).
- `E2E_PORT=3081 playwright test` de `app-instalable`, `paginas-basico-por-rol`, `login-flow`, `dia-a-dia-offline-calendario`, `plataforma-superadmin`: 20/20 verde.
- Prueba manual en `localhost`: al cambiar la versión del SW aparece el toast, «Actualizar» recarga y deja solo la caché nueva.

## Pendientes y preguntas abiertas
- Cuentas de Google Play (25 USD único) y Apple Developer (99 USD/año) **(externo)**; decidir app genérica vs. por colegio.
- Probar la instalación en celulares reales sobre el despliegue HTTPS.
- Pantallas de arranque de iOS y métrica anónima de `?origen=app` (no implementadas).
