# 18 · Sistema de diseño (tema, colores, formas y estilos)

- **Estado:** implementado · alineado al manual de marca (2026-10-28)
- **Plan:** todos
- **Fuente de verdad del código:** `src/app/globals.css` (tokens), `src/components/ui/*` (shadcn/ui), `src/components/shell/*` (estructura)
- **Herramientas:** shadcn/ui (estilo `base-nova`, primitivas Base UI), Tailwind CSS v4, `lucide-react`, `next-themes`, `sonner`. Dirección visual definida con la skill *ui-ux-pro-max* (estilo «Minimalism & Swiss»: limpio, funcional, alto contraste, cuadrícula).

## 0. Fuente de verdad

El **manual de marca** entregado por marketing manda sobre esta spec: `docs/marca/MANUAL-DE-MARCA.md`, `docs/marca/tokens.json` y `docs/marca/documentos/04-identidad-visual.md` y `05-nudito-personaje.md`. Los SVG oficiales están en `public/marca/` (no se recolorean, estiran, giran ni se les pone sombra o degradado). Si algo de esta spec contradice el manual, se corrige la spec.

## 1. Principios

1. **Confiable, cercana, clara y orgullosamente peruana** (personalidad de marca). Moderna, nunca «de souvenir»: nada de grecas, llamas ni mezclar todos los colores.
2. **Proporción de color en una pantalla:** 60 % fondo claro, 25 % `indigo`, 10 % `cochinilla` o `turquesa`, 5 % `maiz`.
3. **Estado = ícono + palabra + color.** Nunca solo color (daltonismo, correos impresos en blanco y negro).
4. **Celular primero:** controles ≥ 40 px, margen lateral mínimo `espacio-4` (16 px), sin scroll horizontal de página.
5. **Accesible (WCAG 2.2 AA):** todo par de texto ≥ 4.5:1 (revisado en `tokens.json`); foco visible; `prefers-reduced-motion`.

## 2. Tema y modos

- Claro y oscuro con los valores de `tokens.json` (`next-themes`, `attribute="class"`, por defecto sigue al dispositivo; el usuario elige en *Menú de cuenta → Tema*).
- Todo color se usa por **token** (`src/app/globals.css`), nunca hex sueltos en componentes.

## 3. Colores (`tokens.json`)

### 3.1 Marca

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `indigo` | `#1E2A78` | `#2F3FA8` | Color de la marca y de la **barra superior** del panel; fondo del ícono de app. Texto `blanco` encima |
| `indigo-cielo` | `#3A4BB5` | `#A9B5FF` | **Enlaces** (`.enlace`), gráficos y **anillo de foco** |
| `cochinilla` | `#A8325E` | `#E8789F` | Nudito y destacados. **Nunca para errores** |
| `turquesa` | `#0F7C7A` | `#4FC3BF` | Íconos de acento, etiquetas de curso, gráficos (`chart-1`) |
| `maiz` | `#F2B84B` | `#F2B84B` | Solo nudos y fondos cálidos (contadores, franja de soporte). **Nunca texto sobre blanco**; encima va `sobre-maiz` (tinta) |
| `blanco` | `#FFFFFF` | — | Texto y marca sobre `indigo` |

### 3.2 Interfaz

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `fondo` (`background`) | `#FAF7F2` | `#12141C` | Página. Crema cálido, nunca blanco puro |
| `superficie` (`card`, `sidebar`) | `#FFFFFF` | `#1A1D28` | Tarjetas, mosaicos, formularios, barra lateral |
| `superficie-2` (`muted`, `secondary`, `accent`) | `#F3F0EA` | `#222636` | Botón secundario, campos deshabilitados, hover de menús |
| `tinta` (`foreground`) | `#1B1F2A` | `#ECEEF5` | Texto principal |
| `pizarra` (`muted-foreground`) | `#5B6170` | `#A3A9BA` | Texto secundario, fechas, ayudas, sobretítulos |
| `arena` (`border`) | `#E4E1DA` | `#2E3345` | Divisiones y bordes de tarjetas (no de controles) |
| `acento` (`primary`) | `#1E2A78` | `#8C9BFF` | Botón principal y **estados activos** (ítem activo de la barra lateral) |
| `sobre-acento` | `#FFFFFF` | `#10132A` | Texto sobre `acento` |

### 3.3 Estados de asistencia (fijos, no cambian por colegio)

| Estado | Palabra | Ícono (Lucide) | Texto / fondo claro | Oscuro |
|---|---|---|---|---|
| Llegó | «Llegó» | `Check` (✓) | `#166534` / `#E8F5EC` | `#6FD394` / `#16301F` |
| Tarde | «Tarde» | `Clock` | `#9A4A07` / `#FDF2E3` | `#F5B266` / `#33240F` |
| Falta | «No llegó» | `CircleAlert` (!) | `#B91C1C` / `#FBEAEA` | `#FF8A8A` / `#3A1A1A` |
| Problema | «Aviso» | `TriangleAlert` | mismo rojo que falta | mismo rojo que falta |

El rojo de falta también es el de **errores del sistema** (`destructive`). El verde y el rojo se distinguen además por su claridad.

## 4. Tipografía (`tokens.json` · type)

| Clase | Fuente | Tamaño / interlínea / peso | Uso |
|---|---|---|---|
| `text-titulo-xl` | Sora | 40/44 · 700 · −0.02em | Portadas (login) |
| `text-titulo-1` | Sora | 32/38 · 700 · −0.01em | Título de cada pantalla (`EncabezadoPagina`) |
| `text-titulo-2` | Sora | 22/28 · 600 | Subtítulos y títulos de sección |
| `text-cuerpo` | Inter | 16/24 · 400 | Texto de lectura (por defecto en `body`) |
| `text-cuerpo-sm` | Inter | 14/20 · 400 | Secundario y descripciones de mosaicos, en `pizarra` |
| `text-etiqueta` | Inter | 13/16 · 600 | Etiquetas de estado, chips, botones pequeños |
| `sobretitulo` | Inter | 12/16 · 600 · 0.1em · MAYÚSCULAS · `pizarra` | Rótulos sobre grupos de mosaicos y de la barra lateral («MI DÍA») |
| `text-voz-nudito` | Nunito | 15/22 · 700 | **Solo** burbujas de Nudito |

- El texto de lectura **nunca baja de 14 px** (`text-xs` quedó en 13 px y solo se usa para etiquetas).
- Los títulos llevan `text-wrap: balance` (regla base en `globals.css`).
- En correos: fuentes con respaldo `Arial, Helvetica, sans-serif`.

## 5. Espacio, radios y sombras

- **Espacio:** `espacio-1…12` = 4, 8, 12, 16, 24, 32, 48 px (escala de Tailwind: 1, 2, 3, 4, 6, 8, 12). Relleno de tarjetas y mosaicos 16 px; entre grupos 24 px; entre secciones 32 px.
- **Radios:** `rounded-sm` 6 px (chips cuadrados) · `rounded-md` 10 px (**botones, campos, segmentos de asistencia**) · `rounded-lg` 14 px (**tarjetas, mosaicos, modales**; `rounded-xl` y `rounded-2xl` también valen 14 px) · `rounded-pildora` (etiquetas de estado y de plan).
- **Sombras:** en reposo **nada lleva sombra**; las tarjetas se separan con borde `arena` (`shadow-xs`/`shadow-sm` valen `none`). `shadow-sombra-1` solo **al pasar el cursor por un mosaico** y en el **botón flotante de Nudito**; los menús y modales flotantes usan la misma `sombra-1`.
- **Foco:** anillo sólido de **2 px en `indigo-cielo`, separado 2 px** del control (regla global `:focus-visible`).

## 6. Logotipo, isotipo e íconos

| Pieza (`public/marca/`) | Dónde se usa en el sistema |
|---|---|
| `logotipo-horizontal-blanco.svg` | Barra superior `indigo` del panel y portada del login (componente `Logo tono="blanco"`) |
| `logotipo-horizontal.svg` | Sobre fondos claros (`Logo`); `logotipo-horizontal@2x.png` en los correos |
| `logotipo-escolar.svg` | Versión pública: login en celular (`Logo variante="escolar"`) |
| `isotipo.svg` / `isotipo-blanco.svg` | Cabecera de la barra lateral cuando el colegio no tiene insignia (`Logo variante="isotipo"`) |
| `favicon.svg` (+ `favicon-32.png`) | Pestaña del navegador (`src/app/icon.svg`) e insignia de las notificaciones push |
| `icono-app.svg` (+ `icono-192/512.png`, `apple-touch-icon.png`) | Manifiesto PWA y pantalla de inicio del celular |
| `nudito.svg` (+ `nudito@2x.png`) | Mascota (widget, avatar del chat, correos de Nudito) |
| `patron-khipu.svg` | Fondo decorativo de portadas (login); nunca detrás de texto largo |

- **Nombre:** «Khipu Escolar» en lo público; dentro del panel la barra superior dice solo «khipu». Nunca «Quipu», «Kipu» ni «KHIPU». Nada de monedas, tarjetas ni gráficos de pagos junto a la marca.
- **Tamaños mínimos:** logotipo horizontal 96 px de ancho; isotipo 24 px (por debajo, `favicon.svg`). Área de seguridad: media altura de la «k».
- **Íconos:** Lucide de línea, trazo 2, puntas redondeadas, en `tinta` o `indigo`; el color de estado solo en íconos de asistencia. Sin íconos rellenos, 3D ni emojis en avisos serios.

## 7. Estructura de la app (shell)

```
┌──────────────────────────────────────────────────────────────┐
│ [≡]  khipu  (logotipo blanco)        BARRA SUPERIOR · indigo  [🔔•] │
├────────────┬─────────────────────────────────────────────────┤
│ [insignia] │ titulo-1 (EncabezadoPagina)          [Acción]    │
│ Colegio    │                                                 │
│ DÍA A DÍA  │  Tarjetas `superficie` con borde `arena`        │
│ ▌Pasar lista (activo en acento)                              │
│ ACADÉMICO  │                                                 │
│ [Avatar ▾] │                                                 │
└────────────┴─────────────────────────────────────────────────┘
```

- `MarcoPanel` (`src/components/shell/MarcoPanel.tsx`): barra superior a todo el ancho y debajo la barra lateral y el contenido (`--header-height` 3.5rem). Lo usan el colegio y la plataforma.
- **Barra superior** (`BarraSuperior.tsx`): fondo `indigo`, botón de menú, logotipo blanco (enlace al inicio), etiqueta opcional («Plataforma») y campana con contador en nudo `maiz` + número en tinta.
- **Barra lateral** (`BarraLateral.tsx`): `superficie` con borde `arena`; cabecera con la insignia y el nombre del colegio; grupos con `sobretitulo`; ítem activo relleno en `acento` con texto `sobre-acento`; funciones fuera del plan con candado. Colapsable a íconos (Ctrl/⌘+B) y **drawer** en móvil.
- **Páginas públicas:** portada `indigo` con logotipo blanco, lema en `titulo-xl`, tres puntos y el patrón; en móvil, `logotipo-escolar` sobre `fondo`.

## 8. Patrones de componentes

| Necesidad | Usa | Notas |
|---|---|---|
| Etiqueta de curso | `EtiquetaCurso` (`components/academico`) | Pastilla `turquesa` (texto turquesa sobre `turquesa/10`), solo como acento |
| Título de página | `EncabezadoPagina` (`components/shell`) | Un solo `h1` por página; acciones principales a la derecha |
| Acción principal / secundaria | `Boton` (`primario`, `secundario`, `fantasma`, `peligro`) o shadcn `Button` | Un solo botón primario por bloque. Verbos concretos («Guardar y avisar», no «Aceptar») |
| Formulario con server action | `FormAccion` | Éxito → **toast**; error → `Alerta` junto al formulario |
| Campo | `Campo`, `Selector`, shadcn `Input`/`Textarea`/`Field` | **Etiqueta visible siempre** (nunca solo placeholder); error debajo del campo |
| Contenedor | `Tarjeta` o shadcn `Card` (`CardHeader/Title/Description/Content/Footer`) | |
| Lista de registros | shadcn `Table` dentro de `Card`, con `overflow-x-auto` | En móvil, si hay más de 4 columnas, preferir lista de tarjetas |
| Sin datos | `EstadoVacio` | Ícono + frase en positivo + siguiente acción |
| Crear / editar algo corto (≤ 6 campos) | `Dialog` (modal) | Título, descripción, formulario, botones al pie |
| Crear / editar algo largo o detalle de un registro | `Sheet` (panel lateral; desde abajo en móvil) | Mantiene el contexto de la lista |
| Acción destructiva o que avisa a familias | `BotonConfirmar` (shadcn `AlertDialog`) | Explica la consecuencia; botón con verbo concreto |
| Resultado de una acción | `toast` de `sonner` (`toast.success/error`) o `Notificar` para `?ok=`/`?error=` | Arriba al centro, 4 s, con ícono |
| Aviso persistente en la página | `Alerta` (`info`, `exito`, `aviso`, `error`) | Ícono + palabra para lectores de pantalla |
| Estado / plan / rol | shadcn `Badge` o `EstadoAsistencia` | |
| Secciones dentro de una página | shadcn `Tabs` | Si el contenido es independiente |
| Filtros rápidos | `ToggleGroup` o `Selector` | |
| Cargando | `Skeleton` con la forma del contenido; `Loader2` girando en botones | Nunca pantallas en blanco |
| Métrica | `StatTile` + `Semaforo` (`plataforma/_componentes`) | Ícono en recuadro `bg-accent`, valor `font-heading text-3xl`, nota con ícono + palabra |
| Páginas públicas | `(publico)/layout.tsx` | Escritorio: panel índigo de marca (`bg-sidebar`) con el lema + tarjeta centrada; móvil: logo arriba y tarjeta |
| Cambio de estado crítico (suspender) | `CambiarEstado` (`BotonConfirmar` con `peligro`) | Explica la consecuencia antes de aplicar |
| Plan del colegio | `PlanColegio` (`plataforma/EstadoColegio.tsx`) | Insignia con contorno, junto a `EstadoColegio` |
| Menú de acciones por fila | `DropdownMenu` con botón `MoreHorizontal` (`aria-label`) | |
| Formulario en panel con server action que redirige (CRM de gestión) | `gestion/_componentes/PanelFormulario` (`Dialog`/`Sheet`, se cierra solo al cambiar la URL con `?ok=`/`?error=`) | El `<form action>` sigue renderizado por el servidor; los nombres de campo no cambian |
| Acciones por fila con confirmación o formulario | `gestion/_componentes/AccionesFila` (menú `MoreHorizontal` con enlaces, paneles y `AlertDialog`) | Las acciones destructivas van en rojo y con verbo concreto |
| Persona (alumno, profesor, familia) | `AvatarPersona` (iniciales, sin fotos) + `InsigniaEstado` | |
| Pestañas de sección (gestión) | `gestion/_componentes/NavGestion` (subrayado índigo, `aria-current`; oculto en el hub) | |
| Formulario corto en modal con server action | `DialogoAccion` (`components/academico`) | Botón disparador + `Dialog`; éxito → toast y cierra; error → `Alerta` dentro. Se usa en notas, tareas, agenda y periodos |
| Rejilla de notas editable | `GrillaNotas` (`notas/`) dentro de tarjeta con `overflow-x-auto` | Primera columna fija, celdas de 40 px, guarda al cambiar/salir del campo, estado «Guardando/Guardado» con ícono + palabra |
| Secciones o periodos por enlace | `NavegacionPildoras` (`components/academico`) | Píldoras con `aria-current`; activa en `primary` |
| Fecha de entrega / tipo de evento | Insignia con ícono + palabra (`FechaEntrega` en tareas, `TIPOS` en agenda) | `falta` vencida, `tarde` hoy/mañana, `muted` resto |
| Chat (burbujas) | Propias `bg-primary text-primary-foreground rounded-2xl rounded-br-sm`; ajenas `bg-muted rounded-bl-sm` con `Avatar` de iniciales (`bg-maiz text-indigo`) y hora `text-[11px]` | Caja de envío fija al pie del contenedor; la lista hace el scroll, no la página. Lista + hilo en 2 columnas desde `lg` (mensajes y Nudito) |
| Sugerencias rápidas | Chips `rounded-pildora border-primary/40 text-primary`, ≥ 40 px | Ej. preguntas sugeridas de Nudito |
| Lista de alumnos para marcar en el celular | Tarjeta por alumno con botones `min-h-12` ícono + palabra y barra de acción `sticky bottom-0` (solo `< lg`) | El botón de guardar se duplica por CSS: `lg:hidden` en la barra y `max-lg:hidden` en el panel lateral |
| Revisión que avisa a familias con comentario | `BotonConfirmar` con `campos` dinámicos (ver `RevisionJustificacion`) | La decisión confirma antes de enviar |
| Mosaico del inicio | Enlace-tarjeta con ícono en contenedor `bg-primary/10 text-primary`, `Badge` para contadores | Fuera del plan: `PlanLock` y sin enlace |
| Tabla con vista móvil | `Card`+`Table` desde `md`; lista de `Card size="sm"` en móvil | Ver `avisos/page.tsx` |

## 9. Movimiento

- Transiciones de 150–250 ms en hover y foco; modales y drawers usan las animaciones de shadcn (`tw-animate-css`).
- Sin animaciones de entrada en scroll ni efectos «parallax». Nudito tiene su propia animación suave.
- `prefers-reduced-motion: reduce` desactiva todas las animaciones (regla global en `globals.css`).

## 10. Responsive

- Puntos de quiebre de Tailwind: `sm` 640, `md` 768 (cambio barra lateral ↔ drawer), `lg` 1024, `xl` 1280.
- Rejillas de tarjetas: `grid gap-4 sm:grid-cols-2 lg:grid-cols-3`.
- Probar siempre en 375 px, 768 px y 1366 px.

## 11. Textos y tono

- Español de Perú, trato de «tú», una idea por mensaje, sin tecnicismos.
- Avisos de falta: los firma el colegio, tono serio, sin emojis. Nudito nunca da malas noticias.
- Estados vacíos y errores dicen qué pasó y qué hacer después.

## 12. Lista de verificación antes de entregar una pantalla

- [ ] Usa tokens (sin hex sueltos) y se ve bien en claro y oscuro.
- [ ] Un `h1` con `EncabezadoPagina`; una acción primaria por bloque.
- [ ] Controles ≥ 40 px; nada de scroll horizontal de página en 375 px.
- [ ] Todo estado con ícono + palabra; contraste ≥ 4.5:1.
- [ ] Campos con etiqueta visible; errores junto al campo.
- [ ] Acciones destructivas con confirmación; éxito con toast.
- [ ] Estado vacío y estado de carga definidos.
- [ ] Foco visible y navegable con teclado; íconos solo-decorativos con `aria-hidden`.

## Pendientes

- (Hecho) Gráficos de 30 días de la plataforma con `chart-1`/`chart-2` (specs/16).
- **Externo:** SVG oficiales de la marca (isotipo y logotipo) cuando lleguen los archivos del equipo de diseño.

## Estados de carga
Cada ruta con datos de `colegio/[slug]` y `plataforma` tiene `loading.tsx` con esqueletos (`src/components/carga/Esqueletos.tsx`: `EsqueletoPagina`, `EsqueletoTarjetas`, `EsqueletoTabla`, `EsqueletoLista`, `EsqueletoFormulario`) con `aria-busy` y texto `sr-only` «Cargando…».
