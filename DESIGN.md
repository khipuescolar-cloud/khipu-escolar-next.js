# Dirección visual · Khipu Escolar

## Mundo y propósito: un khipu del día

Un khipu registra cantidades con nudos en cuerdas de colores que cuelgan de una cuerda principal. Esa es la gramática propia de la interfaz: **cada sección es una cuerda con su color, cada pendiente es un nudo con su cantidad**. La jornada se lee como un khipu ordenado y cálido: papel crema, franjas de maíz suave, cuerdas de color con función y Nudito acompañando. Se conserva la identidad oficial (`docs/marca/MANUAL-DE-MARCA.md`, `tokens.json`, `public/marca/` incluido `patron-khipu.svg`): logotipo e isotipo, índigo, Sora para títulos, Inter para texto, Nunito solo para Nudito.

Modo **Operate**: el motivo vive en detalles precisos (cuerdas, nudos, color de sección), nunca en decoración que compita con la tarea. Para el personal, nada infantil; la calidez está en el color, las formas redondeadas y Nudito en momentos benignos.

## Color con roles: las cuatro cuerdas

Cada grupo del menú tiene una cuerda de marca. Cuatro roles por sección, en `src/app/globals.css`:

| Sección | nudo (relleno decorativo) | trazo (ícono, línea ≥3:1) | suave (fondo) | tinta (texto sobre suave) |
|---|---|---|---|---|
| Día a día | turquesa `#0F7C7A` | `#0F7C7A` | `#E2F3F1` | `#0B5F5D` |
| Comunicación | cochinilla `#A8325E` | `#A8325E` | `#FBE9EF` | `#8A2550` |
| Académico | maíz `#F2B84B` | ocre `#9A6A0C` | `#FCF0D6` | `#74490A` |
| Colegio (e Inicio) | índigo cielo `#3A4BB5` | `#3A4BB5` | `#E9EAFB` | `#1E2A78` |

Oscuro: nudo/trazo `#4FC3BF`, `#E8789F`, `#F2B84B`, `#A9B5FF`; suave `#133533`, `#3A1D2B`, `#352812`, `#262C50`; tinta `#7FD8D4`, `#F4A3C0`, `#F5CB72`, `#C3CBFF`.

**Cómo se usa.** Un contenedor declara `data-seccion="dia|comunicacion|academico|colegio"` y los componentes leen `bg-sec-suave`, `text-sec-tinta`, `text-sec-trazo`, `bg-sec-nudo`. Sin atributo, la sección es la marca (índigo). `ZonaSeccion` (en `MarcoPanel`) pone el atributo según la ruta activa del menú, así cada página hereda el color de su sección (`/horario` es siempre «Día a día»). `ZonaSeccion` también publica la sección por contexto (`useSeccion`) y Dialog, Sheet, Popover, AlertDialog y menús la repiten en su `data-seccion`, porque viven en un portal fuera de la página: no hace falta parchear `data-seccion` en cada modal. La dosis es baja: íconos del menú, nudo y fondo del ítem activo, cuerda del encabezado, pestaña activa, nudos del tablero. Botones primarios, enlaces y foco siguen en índigo; los estados de asistencia conservan sus pares fijos y siempre llevan ícono y palabra.

**Superficies.** `--fondo` crema (contenido), `--papel-menu` `#F4EEE4` / `#161922` (menú lateral, segunda capa neutra un punto más cálida), `--saludo-fondo` `#FCF0D6` / `#2A2416` (franja de saludo del inicio), `--superficie` blanco para tablas y formularios que necesitan contención.

### Contraste verificado (WCAG, luminancia relativa sRGB)

| Par | Claro | Oscuro |
|---|---:|---:|
| tinta / fondo | 15.40 | 15.85 |
| pizarra / papel-menu | 5.37 | 7.47 |
| tinta / saludo-fondo | 14.56 | 13.30 |
| academico-tinta / saludo-fondo (fecha) | 6.88 | 10.03 |
| dia-tinta / dia-suave | 6.52 | 8.00 |
| comunicacion-tinta / comunicacion-suave | 7.32 | 7.80 |
| academico-tinta / academico-suave | 6.88 | 9.34 |
| colegio-tinta / colegio-suave | 10.63 | 8.54 |
| dia-tinta / papel-menu (rótulo) | 6.48 | 10.60 |
| comunicacion-tinta / papel-menu | 7.39 | 9.07 |
| academico-tinta / papel-menu | 6.74 | 11.43 |
| colegio-tinta / papel-menu | 10.98 | 11.12 |
| trazo día / papel-menu (ícono) | 4.35 | 8.66 |
| trazo académico / papel-menu (ícono) | 4.10 | 10.27 |
| contador (papel sobre comunicacion-tinta) | 7.39 | 9.07 |
| estados (llegó, tarde, falta, info) | ≥5.56 | ≥6.89 |
| sobre-falta / falta (botón destructivo) | 6.47 | 8.07 |
| texto de ayuda (pizarra) / superficie-elevada (campo) | 6.10 | 6.09 |
| placeholder (texto-terciario) / superficie-elevada | 5.72 | 6.89 |
| texto de toast (llegó / tarde / falta) sobre su fondo | ≥5.56 | ≥6.89 |

El nudo de maíz (1.67:1 sobre crema) es decorativo: siempre va junto a texto que nombra la sección y nunca es el único portador de información. El foco usa `--indigo-cielo` con contorno de 2 px separado 2 px.

## Motivo khipu: dónde aparece

- **Menú lateral.** Cada grupo es una cuerda colgante: nudo y rótulo en la tinta de su sección, una línea vertical suave baja por el grupo, íconos en el trazo de la sección. El ítem activo lleva un nudo sobre la cuerda, fondo suave de su sección y texto en su tinta (nunca un bloque índigo). Contadores en píldora sólida de la tinta de la sección. Colapsado quedan íconos con tooltip; en móvil, panel deslizable con lo mismo.
- **Encabezado de página** (`EncabezadoPagina`): migas «Inicio › Sección» con el nudo de la sección (si la página pasa `seccion`), título Sora, descripción, acciones a la derecha, y cierra con la **cuerda de la sección** (`CuerdaSeccion`): tramo de color con un grupo de nudos sobre una línea fina.
- **Inicio.** Franja de saludo en maíz suave con cuerdas colgantes derivadas de `patron-khipu.svg` y Nudito; debajo, **«Lo que te toca hoy»** como khipu vertical: un nudo por pendiente con su cantidad, del color de su sección, y la acción que lo resuelve.
- **Bloques secundarios** (`TituloBloque`, `components/shell`): título Sora 18 px con un nudo de su sección; contenido en `ListaDividida` (filas con divisores) o `CifrasJuntas` (cifras hermanas con `gap-px`), ambas en `components/ui/Superficies`, sin tarjetas. Pestañas de página: `PestanasLinea` (línea y nudo de la sección) y `PestanasSegmento` (control segmentado) en `components/shell/PestanasPagina`.

## Composición y densidad

- El inicio no es un índice de módulos: el menú ya navega. Abre con el saludo (fecha y hora del colegio, una frase con lo pendiente, Nudito) y sigue con dos columnas en escritorio: a la izquierda lo accionable (khipu del día, llegada de los hijos, ingresos de portería, asistencia del colegio, tareas próximas); a la derecha el contexto (horario de hoy, avisos, reuniones, comunicados). En móvil todo en una columna, en ese orden.
- Dirección y docente: filas comparables, barras y tablas. Familia y alumno: más aire y lenguaje directo. Portería: acción principal grande (Abrir escáner) y tres cifras del día.
- Ritmo: 4, 8, 12, 16, 24, 32, 40, 48 px. Dentro de un grupo 8–16; entre bloques 40. Más espacio sobre un título que bajo él.
- Contención solo cuando agrupa una tarea (filtros de curso y periodo, tablas). Cifras hermanas van en una sola superficie dividida por líneas, no en tarjetas iguales.

## Tipografía y forma

Sora: saludo 40/44, título de página 32/38, sección 22/28, bloque 18/24. Inter: lectura 16/24, auxiliar 14/20, etiqueta 13/16. Nunito solo en la burbuja y la voz de Nudito. Cifras con `tabular-nums`. Radios: 6 piezas pequeñas, 10 controles e ítems del menú, 14 superficies, 22 la franja de saludo; nudos y contadores en círculo o píldora.

Sombra solo en capas flotantes. Superficies de contenido con borde sutil o divisores, nunca borde y sombra a la vez.

## Nudito e ilustración

Nudito saluda en el inicio con frases benignas según la hora («¡Buenos días! Un paso a la vez.», «¿Practicamos un ratito?») y aparece en vacíos positivos («Todo al día por ahora»). Jamás junto a faltas, errores, incidencias o malas noticias. Las cuerdas del saludo usan las variables de sección para funcionar en claro y oscuro. Los SVG oficiales no se deforman ni recolorean.

## Componentes: reglas de uso

**Jerarquía de botones.** Un solo primario (índigo, verbo concreto) por bloque o modal. Secundario (`outline`) para la alternativa frecuente, fantasma para acciones de bajo peso (Cancelar en barras, Archivar), enlace para navegación en línea, destructivo solo en la confirmación final (nunca como primer botón de una fila). Estados: hover aclara, `active` escala 0.96 (no con reduced-motion), foco anillo índigo de 2 px, deshabilitado 50 %, cargando con indicador y `aria-busy` (el texto se mantiene). Tamaños táctiles propios: 44 px por defecto, 40 px `sm`.

**Modal o drawer.** Modal (`Dialog`) para decisiones y formularios cortos (≤ 6 campos): título, descripción, cuerpo, pie con acciones a la derecha (primario al final). El pie ocupa todo el ancho y queda pegado al borde inferior aunque el contenido haga scroll; su fondo tapa el contenido que pasa por detrás, y el borde superior lo separa. En móvil los botones del pie se apilan a todo el ancho. `AlertDialog`/`BotonConfirmar` solo para confirmar algo irreversible o que avisa a familias, explicando la consecuencia. Drawer (`Sheet`) para formularios largos, filtros y detalle que conviene mirar junto a la lista: lado derecho en escritorio, desde abajo en móvil; encabezado y pie fijos, cuerpo con scroll. Popover para ajustes pequeños anclados a un control; menú (`DropdownMenu`) para acciones por fila.

**Patrón de campo.** Etiqueta visible arriba (14 px, medio), control de 44 px, ayuda gris 14 px debajo, error debajo con ícono + texto en rojo y `aria-describedby`; el error reemplaza la ayuda. Campos relacionados en secciones con título; acciones agrupadas al final. Nunca placeholder como etiqueta.

**Superficies y forma.** Radios concéntricos (contenedor = radio interno + relleno): modal 14 con controles 10; menú 14 con ítems 10; pestañas segmentadas 10 con pestaña 7. Bordes para estructura; sombra solo en modales, hojas, menús y toasts.

**Tablas.** Cabecera sobria (13 px gris, sin mayúsculas, fondo `superficie-2` suave), filas con divisor, hover suave, cifras tabulares alineadas a la derecha; `densidad="compacta"` para trabajo del personal.

**Estados.** Insignias y alertas siempre con ícono + palabra; toasts con el par de color del estado. Vacíos con `EstadoVacio` (borde punteado, ícono en el trazo de la sección).

**Menú lateral.** El botón de colapsar es un círculo de 28 px sobre el borde derecho de la cabecera, discreto (70 % de opacidad) y pleno al pasar el cursor o enfocar.

## Movimiento

Transiciones de color de 150 ms en el menú; Nudito saluda una vez al entrar; todo respeta `prefers-reduced-motion`. Sin `transition: all`.

## Hacer / no hacer

| Hacer | No hacer |
|---|---|
| Mostrar lo pendiente de hoy con su cantidad y su acción | Repetir en el inicio los enlaces del menú |
| Dar a cada sección su cuerda de color en ícono, nudo y encabezado | Pintar fondos grandes con el color de sección o usarlo en texto largo |
| Filas con divisores y una sola superficie para cifras hermanas | Rejillas de tarjetas idénticas, tarjetas anidadas, gradientes o vidrio |
| Estados con ícono + palabra + color | Rótulos en mayúsculas sobre títulos o estados solo por color |
| Ítem activo con nudo y fondo suave de su sección | Bloque índigo pesado como ítem activo |
| Nudito en momentos benignos | Nudito junto a faltas, errores o incidencias |

## Aplicación a un módulo

1. Nada que hacer para el color: `ZonaSeccion` ya da la sección por ruta (cuerda del encabezado, pestañas, vacíos).
2. Pasa `seccion` a `EncabezadoPagina` para mostrar las migas con el nudo de la sección.
3. Quita tarjetas que solo envuelven: filtros y estado en una barra, cifras hermanas en una superficie dividida, listas con divisores.
4. Íconos de título de bloque en `text-sec-trazo`; nunca `text-primary` para decorar.

Patrón ya aplicado: `/inicio`, `/asistencia/reportes`, `/notas`, `/mensajes`. El código de tokens vive en `src/app/globals.css`; esta dirección complementa `specs/18-sistema-de-diseno.md`.
