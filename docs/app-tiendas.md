# Khipu Escolar en las tiendas de apps

Khipu Escolar ya es una **app instalable (PWA)**: se instala desde el navegador, sin tienda, en Android, iPhone/iPad, Windows, Mac y Chromebook (specs/24-app-instalable.md, página `/instalar`). Esta guía explica cómo, además, publicarla en **Google Play** y qué opciones hay para la **App Store**. Ninguno de estos pasos es necesario para el piloto.

Los pasos marcados **(externo)** requieren cuentas, pagos o decisiones del equipo.

## 0. Requisitos comunes

- Despliegue en **HTTPS** con dominio propio (p. ej. `khipuescolar.pe` y el comodín `*.khipuescolar.pe`; docs/despliegue.md §2). Sin HTTPS no hay service worker ni instalación.
- El manifiesto responde en `https://<dirección>/manifest.webmanifest` con íconos 192/512 normales y *maskable*, atajos y capturas (revísalo en Chrome → DevTools → *Application → Manifest*, sin advertencias).
- Lighthouse (DevTools → *Lighthouse → PWA*) sin errores de instalabilidad.

### Multicolegio: una sola app o una por colegio

Cada colegio vive en su propio origen (`<slug>.khipuescolar.pe`). En el navegador cada colegio se instala desde su dirección. En las tiendas hay dos caminos:

| Opción | Cómo | Cuándo |
|---|---|---|
| **App genérica «Khipu Escolar»** | Inicia en `https://khipuescolar.pe/login?origen=app`; los subdominios de cada colegio se declaran como *orígenes de confianza adicionales* (Bubblewrap `additionalTrustedOrigins`). Cada origen sirve su propio `/.well-known/assetlinks.json` (ya lo hace la app). | Recomendada. Al sumar un colegio hay que agregar su origen y publicar una actualización (si no, ese colegio se abre con una barra de navegador arriba, pero funciona). |
| **App propia de un colegio** (marca blanca) | Inicia en `https://<slug>.khipuescolar.pe/?origen=app`, con nombre e ícono del colegio. | Solo para colegios grandes que lo pidan y lo paguen: cada app es un listado y una revisión aparte. |

## 1. Google Play (TWA: Trusted Web Activity)

Una TWA es una app Android mínima que abre la PWA a pantalla completa con Chrome. No hay que reescribir nada.

1. **Cuenta de Google Play Console** **(externo)**: pago único de **25 USD**. Las cuentas personales nuevas deben hacer una prueba cerrada con al menos 12 personas durante 14 días antes de publicar; una **cuenta de organización** (requiere número D-U-N-S de la empresa) se libra de ese requisito.
2. **Generar el proyecto Android** (elige uno):
   - **PWABuilder** (más simple): entra a <https://www.pwabuilder.com>, pega `https://khipuescolar.pe`, *Package for stores → Android*. Datos sugeridos: *Package ID* `pe.khipuescolar.app`, nombre «Khipu Escolar», nombre corto «Khipu», color de tema `#1E2A78`, fondo `#FAF7F2`, *Start URL* `/login?origen=app`, *Display mode* `standalone`, notificaciones activadas. Descarga el `.zip`: trae el `.aab` firmado, la llave de firma (`signing.keystore` + contraseñas) y un `assetlinks.json` de ejemplo.
   - **Bubblewrap** (línea de comandos, más control): `npx @bubblewrap/cli init --manifest https://khipuescolar.pe/manifest.webmanifest` y luego `npx @bubblewrap/cli build`. Para la app genérica, en `twa-manifest.json` agrega los colegios en `additionalTrustedOrigins` (p. ej. `nuevohorizonte.khipuescolar.pe`).
3. **Guarda la llave de firma** en el gestor de contraseñas del equipo **(externo)**. Nunca la subas al repositorio. Si se pierde, no se puede actualizar la app.
4. **Vincular dominio y app (Digital Asset Links)**: la app ya sirve `/.well-known/assetlinks.json` en la raíz y en cada subdominio (`src/app/.well-known/assetlinks.json/route.ts`) a partir de dos variables de entorno en Vercel:
   - `ANDROID_PACKAGE_NAME` = `pe.khipuescolar.app`
   - `ANDROID_SHA256_FINGERPRINTS` = huellas SHA-256 separadas por comas: la de tu llave de subida (`keytool -list -v -keystore signing.keystore`) **y** la de *Play Console → Configuración → Integridad de la app → Firma de apps* (Google vuelve a firmar la app; sin esa huella la app se abre con barra de navegador).
   Sin estas variables la ruta responde `[]` (válido y sin efecto). Comprueba con `curl https://khipuescolar.pe/.well-known/assetlinks.json` y con la herramienta de Google <https://developers.google.com/digital-asset-links/tools/generator>.
5. **Ficha de la tienda** **(externo)**: ícono 512 px (`public/marca/icono-512.png`), gráfico destacado 1024×500, capturas (puedes reutilizar `public/app/capturas/`), descripción corta y larga, categoría *Educación*, correo de contacto, **política de privacidad** pública (Ley 29733) y el formulario de **seguridad de los datos** (la app maneja datos de menores: declara qué se recoge y que no se vende). Como el público incluye familias y menores, revisa la política *Familias* de Google Play: la app es para padres, docentes y colegios, no está dirigida a niños.
6. **Sube el `.aab`** a una prueba interna, prueba en 2–3 celulares Android (abrir, iniciar sesión, notificación push, atajos con pulsación larga) y luego pásalo a producción. La revisión suele tardar de horas a unos días.
7. **Actualizaciones**: el contenido se actualiza solo con cada despliegue web. Solo hay que publicar una nueva versión de la app si cambian el ícono, el nombre, los orígenes de confianza o la versión de Android requerida.

## 2. App Store (iPhone y iPad)

En iPhone/iPad la PWA ya se instala desde Safari (*Compartir → Agregar a inicio*) y, desde iOS 16.4, recibe notificaciones push si está instalada. Publicar en la App Store es opcional y más exigente:

1. **Cuenta Apple Developer** **(externo)**: **99 USD al año**; para publicar a nombre de la empresa se necesita número D-U-N-S. Hace falta una Mac con Xcode para compilar y subir.
2. **PWABuilder → iOS** genera un proyecto Xcode (una app con `WKWebView` que abre la PWA). Se configura con el mismo dominio, ícono y colores, y se sube con Xcode a App Store Connect.
3. **Advertencia — revisión de Apple**: la guía 4.2 (*funcionalidad mínima*) permite a Apple **rechazar apps que son solo un sitio web empaquetado**. Para aprobar suele exigirse algo propio de iOS (notificaciones nativas, escaneo QR con la cámara, funcionamiento sin conexión, widgets). Hay que contar con al menos un rechazo y una segunda revisión.
4. **Alternativa recomendada a mediano plazo: Capacitor** (Ionic). Empaqueta la misma app web en proyectos nativos Android e iOS y permite sumar funciones nativas (push con APNs/FCM, cámara para portería, biometría) que hacen más fácil la aprobación. Es un proyecto aparte; evaluarlo cuando haya colegios que pidan la app en la App Store.

## 3. Costos resumidos

| Concepto | Costo | Frecuencia |
|---|---|---|
| PWA instalable (navegador) | 0 | — |
| Google Play Console | 25 USD | pago único |
| Apple Developer Program | 99 USD | anual |
| Número D-U-N-S (cuentas de organización) | gratis | una vez (tarda días) |

## 4. Cómo probar la instalación

- **En un celular**: usa el despliegue en HTTPS (Vercel o un túnel HTTPS). Abre `https://<colegio>.khipuescolar.pe/instalar`. En Android aparece el botón «Instalar app»; en iPhone, los pasos de Safari.
- **En tu equipo**: `http://localhost:<puerto>` es contexto seguro y registra el service worker (las rutas del colegio usan `lvh.me`, que por http no lo es). DevTools → *Application* muestra el manifiesto, el service worker y la opción de instalar. El e2e `tests/e2e/app-instalable.test.ts` comprueba el manifiesto y la página sin conexión así.
