# 2026-10-28 · carlos · Claude Code · Aplicar el manual de marca de marketing

- **Colaborador:** carlos
- **Agente:** Claude Code (Opus 5.5) como orquestador + 4 subagentes Claude (Sonnet) en worktrees
- **Ramas:** `feat/marca-colegio-dia`, `feat/marca-colegio-gestion`, `feat/marca-nudito-correos`, `feat/marca-publico-plataforma` → integradas en `main` y borradas
- **Specs afectadas:** 18 (reescrita §0–§7: el manual es la fuente de verdad), 04, 05, 06, 11, 13, 16

## Pedido del colaborador (textual)

> okey ahora te eh dejado una carpeta completa que me entrego mi compañero de marketing; donde tiene el contenido completo de los colores, iconos, svg , etc ; quiero que lo estudies y lo implementes en el sistema; quiero que todo este como lo esta proponiendo en diseño porfavor

## Decisiones

- El kit (`Khipu-Escolar-Manual-de-marca/`) se copió al repo: `docs/marca/` (manual, `tokens.json`, documentos 04, 05 y 09) y `public/marca/` (10 SVG revisados: sin scripts ni recursos externos). Se generaron PNG: favicon 32, ícono de app 192/512, apple-touch-icon y versiones para correo.
- Tokens claro/oscuro exactos de `tokens.json`; escala tipográfica (`titulo-xl/1/2`, `cuerpo`, `cuerpo-sm`, `etiqueta`, `sobretitulo`, `voz-nudito`); radios 6/10/14/píldora; sin sombras en reposo (`sombra-1` solo hover y Nudito); foco sólido de 2 px en indigo-cielo.
- Estructura: barra superior `indigo` con el logotipo blanco (manual: «indigo es el color de la barra superior»), barra lateral clara con el ítem activo en `acento`; contadores como nudo maíz con texto tinta.
- Estados: ✓ «Llegó», reloj «Tarde», ! «No llegó», «Aviso» (problema en rojo, como falta).
- Nudito oficial (`nudito.svg`) con 7 estados CSS y `prefers-reduced-motion`; duerme fuera de 7:00–17:00. Correos con logotipo PNG de Khipu Escolar + logo público del colegio (solo URL https permanente), etiquetas de estado con ícono + palabra; sin Nudito en faltas/tardanzas/problemas.
- PDFs (libreta, carnets) con la paleta y la firma «Khipu Escolar» con el isotipo; Helvetica (react-pdf no incrusta Sora/Inter).
- Login: portada índigo con logotipo blanco, lema en `titulo-xl` y patrón de cuerdas; en celular `logotipo-escolar`.

## Validación

- `pnpm lint`, `pnpm typecheck`: limpios. `pnpm test`: 54 archivos, 495 pruebas OK. `pnpm e2e`: 43/43 OK (se actualizó el título del carnet público a «Carnet escolar»).
- Se corrigió una prueba que fallaba entre 00:00 y 01:00 (hora fija en `dia-a-dia-offline-plazo.test.ts`).

## Pendientes

- Nudito animado en Rive/Lottie cuando marketing entregue los archivos (`docs/marca/documentos/05-nudito-personaje.md` §6).
- La palabra ESCOLAR de `logotipo-escolar.svg` es texto en Sora: marketing debe convertirla a trazos (manual).
- Logo del colegio en correos solo cuando esté en Cloudinary/S3 (URL pública https).

## Continuación: login siempre en tema claro

> el login no me gusta , debe tener un color estandar de siempre, el login no debe de depender de tema del sistema o del tema que se quedo guardado

- Las páginas públicas fuerzan el tema claro (`forcedTheme="light"` en `Proveedores` según la ruta, `colorScheme: light` en su layout y el toaster sigue el tema forzado). La preferencia guardada del usuario no se borra: el panel la sigue respetando (verificado con preferencia «Oscuro»: login claro, panel oscuro).
- Se corrigió un error de typecheck preexistente (TS2321 en `salones-activos.ts`) declarando el tipo de resultado.

## Continuación: rediseño del login

> /ui-ux-pro-max [captura del login] mejoremos el diseño y como esta organizado el login

- Diagnóstico: patrón como recorte pegado en el panel, formulario pequeño perdido en espacio vacío, sin ver contraseña ni ayuda de primera vez, jerarquía débil.
- Cambios: portada en dos mitades con sobretítulo, lema, promesa de marca, tres puntos con título y frase, y cuerdas de khipu (`src/components/marca/CuerdasKhipu.tsx`) colgando hasta el borde; formulario de 440 px con `titulo-1`, campos de 44 px, `CampoClave` (botón «Mostrar lo escrito», sin la palabra «contraseña» para no chocar con la etiqueta), botón a todo el ancho, ayuda «¿Primera vez?» y pie © Khipu Escolar. Pautas de la skill aplicadas: visibilidad de la contraseña, etiquetas visibles, controles ≥ 44 px.

## Continuación: «Nuevo colegio» no es un módulo

> [captura de la barra lateral con «Colegios» y «Nuevo colegio» resaltados] si es un submodulo no deberia tener ese diseño no tampoco deberia verse asi , ten en cuenta que crear un nuevo colegio no deberia ser un nuevo modulo, ya que esa es una funcion dentro del modulo de colegios

- La barra lateral de la plataforma queda con dos módulos: «Vista principal» y «Colegios» (sin rótulo de grupo). «Nuevo colegio» pasa a ser un botón en el encabezado de Colegios (junto a «Descargar CSV»), y su pantalla tiene «← Colegios»; en `/colegios/nuevo` solo «Colegios» queda activo.
- La página «Reporte de colegios» se llama «Colegios» (también el enlace de vuelta desde el detalle).
- Arreglo de paso: el contenido de `MarcoPanel` no tenía `min-w-0` y una tabla ancha estiraba la página (botones cortados). Ahora la tabla se desplaza dentro de su tarjeta.
- Regla nueva en specs/18 §7: la barra lateral lista solo módulos; las acciones van en el encabezado del módulo.
