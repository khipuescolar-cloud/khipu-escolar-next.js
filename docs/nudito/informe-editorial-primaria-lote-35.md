# Informe editorial · Primaria, Ciencia y Tecnología, lote 35

Fecha: 2026-11-16. Autor: subagente Claude (Sonnet). Estado: **escrito y validado técnicamente; pendiente de revisión independiente**. No se tocaron estado, huellas, BD, specs ni componentes. Solo cambió el campo `claseGuiada` de cada clave (comparado con `HEAD`: el resto de cada clave es idéntico; ejercicios, ids, respuestas y dificultad intactos).

## Alcance

Archivos bajo `src/lib/nudito/conocimiento/banco/ciencia-tecnologia/`. Todas con 10 momentos (el primero sin recurso) y comprobación nueva. Ilustraciones Z-Image (WebP) en `public/nudito/ilustraciones/ciencia-tecnologia/primaria-5|6/`; esquemas SVG en `public/nudito/diagramas/ciencia-tecnologia/`.

| Clave | Archivo | Momentos | Recursos (id) |
|---|---|---|---|
| `cyt.p5.agua-como-solvente` | `primaria-5/fichas/sustancias-y-mezclas.json` | 10 | `mesa`, `sal`, `aceite`, `arena` (Z-Image `solvente-*`), `tabla` (SVG `solvente-se-disuelve-o-no`) |
| `cyt.p5.agua-dulce-salada` | `primaria-5/fichas/estructura-externa-de-la-tierra.json` | 10 | `planeta`, `glaciar`, `mar` (Z-Image `agua-*`), `cien`, `reparto` (SVG `agua-dulce-salada-*`) |
| `cyt.p5.alternativas-sostenibles` | `primaria-5/fichas/tecnologia-y-ambiente.json` | 10 | `ladera`, `siembra`, `tachos` (Z-Image `alternativas-*`), `erres` (SVG `alternativas-sostenibles-tres-erres`) |
| `cyt.p6.acidos-bases-indicadores` | `primaria-6/fichas/cambios-quimicos.json` | 10 | `mesa`, `limon`, `jabon`, `agua` (Z-Image `indicadores-*`), `escala` (SVG `indicadores-escala-colores`) |
| `cyt.p6.agentes-internos-externos` | `primaria-6/fichas/dinamica-interna-de-la-tierra.json` | 10 | `paisaje`, `volcan`, `canon` (Z-Image `agentes-*`), `levanta`, `clasif` (SVG `agentes-relieve-*`) |
| `cyt.p6.alimentos-transgenicos` | `primaria-6/fichas/debates-sobre-ciencia-y-sociedad.json` | 10 | `mercado`, `maiz` (Z-Image `transgenicos-*`), `gen`, `cruce` (SVG `transgenicos-*`) |

18 ilustraciones Z-Image (una a la vez, 1200×896, vistas con Read) y 9 SVG (640×480, texto mínimo 26 px, paleta crema/índigo/turquesa/maíz, texto ámbar `#8A5A00`, sin `<tspan>`, con `<title>`; rasterizados con Chrome y vistos).

## Decisiones

- Estructura común: idea (sin recurso) → situación con imagen sin respuesta → ejemplo 1 guiado y razonado → ejemplo 2 guiado y razonado → contraejemplo con su recurso → tres pasos → comprobación. Los guiados sin imagen apropiada no llevan `recursoRef` y no dicen «dibujo/imagen»; los que reutilizan la imagen de la situación señalan solo algo ya visible (por ejemplo los tocones o la basura de la ladera).
- Voz: números y cifras en palabras, sin letras sueltas, sin «parte N de M», sin repetir títulos.
- Comprobaciones nuevas (letra correcta y longitudes de opciones): solvente, jugo en polvo (b; 29/31/32); agua dulce, grifo que gotea (c; 37/35/34); alternativas, canastas en un mercado de Iquitos (a; 38/37/40); ácidos, vinagre y bicarbonato con col morada (b; 35/35/36); agentes, acantilado y mar (c; 40/37/39); transgénicos, mensaje reenviado sin fuentes (a; 34/36/34).
- Ciencia: reparto del agua dulce como barra a escala (hielo ≈ 69 %, subterránea ≈ 30 %, superficial ≈ 1 %) sin cifras en el recurso; cien cuadros con noventa y siete salados y tres dulces; col morada (rojo/rosado ácido, morado neutro, verde azulado base); transgénico ilustrado con el ejemplo de un gen bacteriano contra orugas (maíz), sin nombrar la sigla técnica.

## Verificaciones

- `pnpm nudito:validar-banco`: válido (2238 fichas, 27034 ejercicios). `pnpm typecheck`: sin errores. `git diff --check` sobre banco CyT y diagramas: limpio.
- Script del lote: `recursoRef` ↔ recursos exactos (todos usados y solo ellos), 10 momentos, primer momento sin recurso, sin dígitos en narración, pregunta, opciones, mensaje y pista, alt ≤ 200 y descripcion ≤ 500, archivos existentes, opciones con diferencia ≤ 3 y la correcta no es la más larga.
- Cálculos: cien − noventa y siete = tres; ocho barras del reparto: 68,7 + 30,1 + 1,2 = 100.
- Ejercicios existentes de las 6 claves revisados (respuestas recalculadas): sin errores de contenido ni de grado. Observaciones sin editar: `agua-dulce-salada` e10 («aumentaría temporalmente») es una verdad matizada, algo fina para 5.º; `alimentos-transgenicos` e06 cita la moratoria «hasta 2035», dato legal vigente que conviene revisar si cambia la norma.

## Imágenes: intentos y correcciones

- `agua-planeta`: la primera salió fotorrealista (estilo distinto); regenerada plana.
- `agua-glaciar`: tres semillas, todas con un niño no pedido; se recortó la imagen (zona izquierda, sin figura) a 4:3.
- `agentes-paisaje`: tres semillas con figuras diminutas; la cuarta (reformulada) salió limpia salvo dos motas amarillas, que se taparon con un parche de terreno (imperceptible a tamaño normal, visible con ampliación).
- `agentes-canon`: segunda reformulación a nivel del agua, sin figuras.
- `transgenicos-maiz`: la primera oruga parecía tener dos cabezas; regenerada.
- `indicadores-mesa`: el jabón parecía mantequilla; regenerada con jabón celeste sobre un plato.

## Riesgos y pendientes

- Sin revisión independiente ni recorrido en navegador (audio, móvil, movimiento reducido).
- `alternativas-tachos` incluye el símbolo de reciclaje (flechas) impreso en los tachos; no es texto ni flecha explicativa, pero un revisor puede objetarlo.
- `agentes-paisaje` y `agua-glaciar` tienen intervención manual (parche y recorte); `agentes-paisaje` muestra una casita pequeña descrita en la descripcion.
- `indicadores-*`: Z-Image dibuja el color con pequeñas variaciones; el rosado, el verde azulado y el morado se verificaron a ojo.
- El esquema `transgenicos-cruce-vs-gen` usa óvalos para las papas y la planta; la descripcion lo dice así.
- No se actualizaron estado, specs ni bitácora (fuera del encargo).

## Correcciones tras la revisión independiente (`revision-lote-35.md`)

`cyt.p5.agua-como-solvente` aprobada: sin cambios.

- `cyt.p5.alternativas-sostenibles`: `alt` y `descripcion` de `tachos` sin asignar colores a materiales (papel, plástico y vidrio en «el primero, el segundo y el tercero»); la imagen no cambia.
- `cyt.p6.acidos-bases-indicadores`: `jabon` regenerado (Z-Image, una sola imagen, vista con Read) con barra de jabón celeste de bordes redondeados sobre un plato blanco, como en `mesa`; `alt` y `descripcion` reescritos tras verla.
- `cyt.p6.agentes-internos-externos`: `ejemplo-1-guiado` y `ejemplo-2-guiado` preguntan de dónde viene la fuerza («de adentro de la Tierra o de la superficie») sin declarar el origen; `paisaje` regenerado limpio (volcán de punta nevada, cerros pardos y río, sin figuras, casas ni parches) con `alt` y `descripcion` nuevos; `paso-2` incorpora «el mar también actúa en la superficie: golpea las costas y desgasta sus rocas», alineado con la comprobación.
- `cyt.p6.alimentos-transgenicos`: `maiz` regenerado (una sola cabeza, cola afinada, cara neutra, hueco mordido en la hoja) y `descripcion` solo con lo que se ve; `ejemplo-2-guiado` dice «hoja de maíz con un hueco en el borde y una oruga encima».
- Ejercicios existentes corregidos (mínimo cambio; id, tipo, dificultad y respuesta intactos):
  - `cyt.p5.agua-dulce-salada` e10: enunciado «Si todos los glaciares se derritieran, el nivel del mar subiría.» (verdadero); pistas «El hielo derretido se vuelve agua líquida.», «Esa agua correría hacia los ríos y los océanos.», «Más agua en los océanos hace que suba su nivel.»; retroalimentación «Es verdadero: el agua del hielo llega a los océanos y sube el nivel del mar, además de perderse una reserva de agua dulce.» Por tocar esta ficha, va a re-revisión.
  - `cyt.p6.alimentos-transgenicos` e06: enunciado sin el año («El Perú tiene una moratoria que impide cultivar transgénicos. ¿Qué significa moratoria?») y pista «Tiene una fecha límite.»; opciones, respuesta (a) y retroalimentación sin cambios.
- Revalidado: `pnpm nudito:validar-banco` (2238 fichas, 27034 ejercicios), `pnpm typecheck` y `git diff --check` limpios.
