# 24 — App instalable (PWA) y camino a tiendas

> Estado: implementado · Plan: Todos · Última actualización: 2026-10-28 (Claude subagente p5-pwa)

## Objetivo
Que Khipu Escolar «sea descargable como si fuera un app»: familias, docentes y dirección la instalan desde el navegador en Android, iPhone/iPad, Windows, Mac y Chromebook, con ícono propio, pantalla completa, atajos, notificaciones y una página amable cuando no hay señal. Deja documentado el camino a Google Play (TWA) y App Store (`docs/app-tiendas.md`).

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Cualquiera (sin sesión) | Ver `/instalar`, `/sin-conexion`, el manifiesto, `/sw.js` y `/.well-known/assetlinks.json` | — |
| Usuario del colegio | Instalar desde el menú de cuenta («Instalar app») o la tarjeta del inicio | — |
| Super administrador | Instalar el panel desde `admin.<dominio>` (mismo manifiesto) | — |

## Flujos
1. **Android / Chrome / Edge (escritorio y celular)**: el navegador dispara `beforeinstallprompt`; Khipu lo guarda (sin la mini barra automática) y muestra «Instalar app» en la tarjeta del inicio, en el menú de cuenta (lleva a `/instalar`) y en `/instalar`. Al tocarlo se abre el diálogo nativo.
2. **iPhone / iPad (Safari)**: no hay `beforeinstallprompt`; la tarjeta del inicio dice «Toca Compartir y luego Agregar a inicio» con enlace a los pasos; `/instalar` los muestra con íconos (Compartir, Agregar a inicio, Agregar). El iPad moderno (se presenta como Mac) se reconoce por la pantalla táctil.
3. **Ya instalada** (`display-mode: standalone` / `window-controls-overlay` o `navigator.standalone`): ni tarjeta ni ítem de menú; `/instalar` dice «Ya estás usando la app de Khipu».
4. **Tarjeta del inicio**: solo con aviso nativo o en iOS; la X la oculta **30 días** (`localStorage` `khipu:instalar-cerrada`, con try/catch: sin almacenamiento solo se oculta en esa visita).
5. **Nueva versión**: el service worker nuevo queda en espera; la página muestra el toast «Hay una nueva versión · Actualizar». Al tocar, la página envía `{ tipo: "ACTUALIZAR" }`, el SW hace `skipWaiting` y la página se recarga una vez (`controllerchange`). Sin recargas sorpresa. Las apps abiertas revisan actualizaciones cada hora.
6. **Sin conexión**: si una navegación falla por red, el SW responde con `/sin-conexion` (precacheada al instalar). Las colas offline de pasar lista y portería (specs/04, 05) siguen igual: se guardan en IndexedDB desde la página abierta y se reenvían solas.

## Reglas de negocio
- **Multicolegio**: cada subdominio es su propio origen y se instala como su propia app desde su dirección (rutas del manifiesto relativas al origen; el mismo manifiesto sirve en todos y en el panel). Una familia con hijos en dos colegios instala una app por colegio.
- **Privacidad**: el SW nunca guarda páginas con datos de alumnos. Solo cachea `/_next/static/**`, `/marca/**`, el cascarón de `/porteria` (sin datos) y `/sin-conexion` (con su CSS/fuentes y el logotipo). Las demás navegaciones van solo a la red.
- `?origen=app` (en `id`, `start_url` y atajos) marca que se abrió desde la app; hoy no se registra ninguna métrica, solo se preserva por el proxy.
- `/.well-known/assetlinks.json` sale de `ANDROID_PACKAGE_NAME` y `ANDROID_SHA256_FINGERPRINTS` (huellas `AA:BB:…` de 32 bytes, separadas por comas); si faltan o son inválidas responde `[]`.

## Modelo de datos
No usa la BD.

## Contratos
```ts
// src/lib/app-instalable.ts (puro, testeable)
detectarPlataforma(s: { userAgent; maxTouchPoints?; modoApp?; standaloneIOS?; avisoNativo? }):
  "instalada" | "nativa" | "ios" | "android" | "escritorio"
esIOS({ userAgent, maxTouchPoints }): boolean
tarjetaVisible(cerradaEn: number | null, ahora: number): boolean   // 30 días (DIAS_SIN_TARJETA)
// src/lib/app-tiendas.ts
declaracionesAssetLinks(paquete?: string, huellas?: string): DeclaracionAssetLinks[]
```
Componentes (`src/components/app/InstalarApp.tsx`): `useInstalacion()`, `InstalarAqui({ soloBoton })`, `TarjetaInstalarApp`, `ItemMenuInstalarApp`, `PasosIOS`, `PasosMenuNavegador`. `src/components/RegistrarServiceWorker.tsx` registra `/sw.js` y ofrece la actualización (montado en el layout raíz).

## Rutas y UI
- `src/app/manifest.ts` → `/manifest.webmanifest` (reemplaza al antiguo `public/manifest.webmanifest`): `name` «Khipu Escolar», `short_name` «Khipu», `id`/`start_url` `/?origen=app`, `scope` `/`, `display` `standalone` + `display_override` [`window-controls-overlay`, `standalone`], orientación libre, `theme_color` `#1E2A78`, `background_color` `#FAF7F2`, `lang` `es-PE`, `categories` [`education`, `productivity`]; íconos 192/512 `any` y `maskable` (`public/marca/icono-maskable-*.png`: fondo índigo a sangre, isotipo dentro de la zona segura del 80 %), atajos Pasar lista/Mensajes/Comunicados/Inicio con íconos de 96 px (`public/marca/atajo-*.png`), capturas `narrow` 390×844 y `wide` 1366×768 de los colegios demo (`public/app/capturas/`). Íconos regenerables con `node scripts/generar-iconos-app.mjs`.
- Layout raíz: `appleWebApp` (capable, título «Khipu», barra `default`), `formatDetection.telephone: false`, `viewport.viewportFit: "cover"`; `apple-touch-icon` = `src/app/apple-icon.png`.
- Áreas seguras: `BarraSuperior` suma `pt-[env(safe-area-inset-top)]` (con `box-content`, la altura útil sigue siendo `--header-height`); el botón de Nudito usa `max(1rem, env(safe-area-inset-bottom/right))`.
- `/instalar` (público, layout público, tema claro): botón cuando el navegador lo ofrece, capturas y pasos para Android, iPhone/iPad y computador; nota «cada colegio se instala desde su dirección».
- `/sin-conexion` (público, estática): logotipo del layout público, «No hay conexión», «Lo que guardaste se enviará al volver la señal.» y «Volver a intentar».
- Inicio del colegio: `TarjetaInstalarApp` bajo el encabezado. Menú de cuenta (`MenuUsuario`): ítem «Instalar app».
- `src/proxy.ts`: `/instalar`, `/sin-conexion` y `/.well-known/assetlinks.json` pasan sin reescribir en la raíz, en cada colegio y en el panel (`RUTAS_APP`); `/manifest.webmanifest`, `/sw.js`, `/marca/**` y las imágenes de `/app/**` ya estaban fuera del `matcher`. `esRutaPublica` incluye `/instalar` y `/sin-conexion`.

## Textos y UX
- Tarjeta: «Instala Khipu en tu iPhone o iPad» / «Instala Khipu en tu equipo» · «Ábrelo desde tu pantalla de inicio, como cualquier app.» · botón «Instalar app» · cerrar «Cerrar: no mostrar en 30 días».
- Toast: «Hay una nueva versión» con acción «Actualizar».
- Sin conexión: «No hay conexión. Lo que guardaste se enviará al volver la señal.»

## Errores y casos borde
- `http://lvh.me` no es contexto seguro: no hay service worker ni instalación (todo lo demás funciona). Para probar en el equipo usa `http://localhost:<puerto>`; en un celular, el despliegue HTTPS.
- Usuarios con el SW anterior (v1, que hacía `skipWaiting` solo): la v2 queda en espera y verán el toast una vez.
- iOS anterior a 16.4 no lee `display` del manifiesto: Next emite `mobile-web-app-capable`; el `apple-touch-icon` y el título vienen de los metadatos.
- La mini barra automática de Chrome se suprime (`preventDefault`) para mostrar el botón propio.
- `start_url` en la raíz (`/`) lleva al login; en un colegio, al inicio. Un atajo usado en un rol sin ese módulo cae en la página de «sin acceso» del módulo.

## Pruebas
- unit `tests/unit/app-instalable.test.ts`: plataformas (android/iOS/iPad moderno/instalada/escritorio), 30 días de la tarjeta, `manifest.ts` (identidad, maskable, atajos, capturas), `assetlinks`.
- e2e `tests/e2e/app-instalable.test.ts`: manifiesto en raíz y colegio con maskable, atajos e imágenes existentes; `/sw.js` y `assetlinks.json` sin sesión; `/instalar` y `/sin-conexion` sin sesión en raíz y colegio; pasos de iPhone con UA de Safari; con service worker real en `localhost`, una navegación sin red muestra «No hay conexión».

## Pendientes
- Publicación real en Google Play / App Store (cuentas y pagos **externos**; `docs/app-tiendas.md`).
- Métrica anónima de aperturas con `?origen=app` (no se implementó a propósito).
- Pantallas de arranque (`apple-touch-startup-image`) por tamaño de iPhone.
