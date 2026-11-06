# Dirección visual · Khipu Escolar

## Mundo y propósito

Una jornada escolar ordenada y cercana: fondo crema, papel claro para información que requiere atención, índigo como ancla de marca y acentos suaves con función. La interfaz debe permitir reconocer el estado del día y encontrar la siguiente acción en segundos. Se conserva la identidad oficial de `docs/marca/MANUAL-DE-MARCA.md`; estos tokens son una extensión semántica de interfaz.

## Composición y densidad

- La página abre con título claro, una frase corta y la acción pertinente. Después viene el dato o tarea del día. Las secciones de navegación son listas compactas con encabezado; se reserva una superficie destacada para un resumen, formulario o estado que de verdad necesite contención.
- Dirección y docente: filas comparables, tablas y agrupación compacta. Familia y alumno: más aire entre bloques y lenguaje directo. Portería: acción principal grande, estados inmediatos y pocas distracciones.
- Ritmo base: 4, 8, 12, 16, 24, 32 y 48 px. Dentro de un grupo, 8–16 px; entre grupos, 24–32 px. El encabezado se separa del contenido con una línea sutil, no con otra tarjeta.

## Color

`--fondo` es crema cálido; `--superficie` es el plano de lectura; `--superficie-elevada` acompaña encabezados y menús. `--superficie-2` y `--acento-suave` son fondos funcionales. `--borde-sutil` divide filas y secciones. `--tinta`, `--pizarra` y `--texto-terciario` forman los niveles de texto. Índigo se reserva para navegación activa, enlaces y acción primaria. Turquesa y cochinilla conservan usos de marca; maíz se usa como fondo cálido con tinta oscura. Los estados usan sus propios pares de fondo y texto. No se introducen hexadecimales sueltos en componentes.

### Contraste verificado

Razones WCAG calculadas con luminancia relativa sRGB; texto normal mínimo 4.5:1, límites y controles significativos mínimo 3:1. Pares de texto:

| Par | Claro | Oscuro |
|---|---:|---:|
| principal / fondo | 15.40:1 | 15.85:1 |
| secundario / fondo | 5.80:1 | 7.83:1 |
| terciario / fondo | 5.44:1 | 8.86:1 |
| primario / sobre primario | 12.67:1 | 7.18:1 |
| activo / fondo suave | 10.63:1 | 5.08:1 |
| éxito / fondo | 6.35:1 | 7.73:1 |
| aviso / fondo | 5.66:1 | 8.17:1 |
| error / fondo | 5.56:1 | 6.89:1 |
| información / fondo | 7.54:1 | 8.24:1 |

El foco usa `--indigo-cielo` con contorno de 2 px y separación de 2 px. En controles, `--input` tiene más presencia que el divisor de contenido; el estado de foco completa la identificación del control.

## Tipografía y forma

Sora: título de página 32/38, sección 22/28 y encabezados breves. Inter: lectura 16/24, texto auxiliar 14/20 y etiqueta 13/16. Nunito solo para voz de Nudito. Títulos balanceados; cifras con `tabular-nums`. Radios: 6 px en piezas pequeñas, 10 px en controles, 14 px en superficies. La esquina interior de un elemento anidado debe ser menor que la exterior.

La sombra tiene desplazamiento y desenfoque; solo indica una capa flotante. Las superficies de contenido usan borde sutil o separación, nunca borde y sombra a la vez. La navegación activa tiene un fondo índigo tenue y texto índigo; el resto de opciones se diferencia por posición y tipografía.

## Iconos, ilustración y movimiento

Lucide con trazo 2, siempre unido a una palabra para comunicar estados. Nudito saluda en inicio y acompaña vacíos benignos o práctica; jamás aparece junto a faltas, errores, incidencias o malas noticias. El SVG oficial no se deforma ni recolorea. Animación discreta con salida rápida y apoyo a `prefers-reduced-motion`; sin `transition: all`.

## Hacer / no hacer

| Hacer | No hacer |
|---|---|
| Mostrar la tarea de hoy antes del índice de módulos | Construir una rejilla de tarjetas idénticas con icono, título y texto |
| Usar filas, divisores y espacio para comparar | Anidar tarjetas, bordes y sombras |
| Dar significado concreto al color | Usar acentos sin función, chips para todo o gradientes decorativos |
| Mantener enlaces y controles con nombre claro | Usar iconos solos, emojis en personal o estados solo por color |
| Ajustar densidad al rol y al ancho | Repetir una misma composición en cada módulo |
| Revisar contenido real, foco y oscuridad | Dar por buena la pantalla solo por verse bien con datos de muestra |

## Aplicación

El código de tokens vive en `src/app/globals.css`; esta dirección complementa `specs/18-sistema-de-diseno.md`. La fase 1 modifica base, navegación e inicio. Cada módulo debe migrar sus propias superficies sin cambiar sus datos o permisos.
