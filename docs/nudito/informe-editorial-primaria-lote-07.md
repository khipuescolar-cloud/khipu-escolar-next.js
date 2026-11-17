# Informe editorial · Primaria, Matemática 6.º, lote 07

Fecha: 2026-11-16. Autor: subagente Claude (Sonnet). Estado: **escrito y validado técnicamente; pendiente de revisión independiente**. No se tocaron estado, huellas, BD, specs, componentes ni git.

## Alcance

| Clave | Archivo (`src/lib/nudito/conocimiento/banco/matematica/primaria-6/fichas/`) | Momentos | Recursos (ID) |
|---|---|---:|---|
| `mat.p6.area-triangulos` | `longitud-perimetro-y-area.json` | 10 | `paralelogramo`, `tapete-altura`, `tres-pasos` |
| `mat.p6.ecuaciones-cuatro-operaciones` | `ecuaciones.json` | 10 | `balanza`, `inversas`, `comprobar` |
| `mat.p6.multiplicacion-fracciones` | `fracciones.json` | 10 | `huerta`, `recta`, `simplificar` |
| `mat.p6.operaciones-decimales` | `numeros-decimales.json` | 10 | `cuadricula`, `jarras`, `cifras` |
| `mat.p6.patrones-termino-general` | `patrones.json` | 10 | `palitos`, `tabla`, `comprobar` |
| `mat.p6.proporcionalidad-directa` | `proporcionalidad.json` | 10 | `arroz`, `regla`, `tarifa` |

Solo cambió el campo `claseGuiada` de cada clave (el único `-` del diff es `"revisado": null` que gana coma). Ejercicios, ids, respuestas y dificultad intactos. Estructura: idea sin imagen, situación visual, dos ejemplos (guiado y razonado, dos contextos distintos), contraejemplo de errores frecuentes, tres pasos y comprobación nueva con tres opciones y una sola correcta. Todo recurso se enlaza por `recursoRef` y cada momento con recurso narra lo que ese dibujo muestra.

## Decisiones

- Área del triángulo: paralelogramo partido en dos; altura en ángulo recto frente a lado inclinado (26 cm como distractor); contraejemplo 30×26÷2=390 incorrecto.
- Ecuaciones: balanza (4x+6=30) y cadena de operaciones inversas (n÷3−2=6); la «x» se narra «equis».
- Fracciones: modelo de área (1/2 × 3/4 = 3/8), recta con seis saltos de 2/3, simplificación 6/12 = 1/2; contraejemplo de sumar numeradores y denominadores (4/6 > 1/2).
- Decimales: cuadrícula de cien (0,4 × 0,3), reparto de 5,2 L entre 4 jarras con canje de unidad por décimos, tarjeta de conteo de cifras (1,5 × 0,2 = 0,30 = 0,3). Todas las cifras de narración, pregunta y opciones están en palabras (no dependen de leer la coma).
- Patrones: cuadrados de palitos (3n+1), tabla del ahorro (5n+2), comprobación que descarta 3n; la comprobación final (5n+3) no repite ejercicios del banco.
- Proporcionalidad: tabla de reducción a la unidad, regla de tres con productos cruzados, tarifa fija como no proporcional; distractor 13 = error aditivo.
- Evitados defectos de lotes previos: sin «recuerda» al inicio, sin «Atención:», sin «¿Es verdad…?», recursoRef revisado momento por momento, ningún SVG reutilizado (los 18 son nuevos).

## SVG nuevos (viewBox 640×480, texto ≥ 26 px, paleta spec 18) en `public/nudito/diagramas/matematica/`

`triangulos-paralelogramo`, `triangulos-altura-inclinada`, `triangulos-tres-pasos`, `ecuaciones-balanza-cajas`, `ecuaciones-operaciones-inversas`, `ecuaciones-comprobacion`, `fracciones-huerta-tres-octavos`, `fracciones-recta-dos-tercios`, `fracciones-simplificar-doceavos`, `decimales-cuadricula-doce`, `decimales-reparto-cuatro-jarras`, `decimales-contar-cifras`, `patrones-palitos-cuadrados`, `patrones-tabla-cinco-n`, `patrones-comprobar-tres-n`, `proporcionalidad-tabla-arroz`, `proporcionalidad-regla-tres-mototaxi`, `proporcionalidad-tarifa-fija` (todos `.svg`). Renderizados en Chrome headless a 360 px de ancho; se corrigieron solapes (etiqueta «6 cm» sobre la altura, encabezados de la cadena inversa, texto inferior de la tabla del arroz, espacios colapsados en patrones). `alt` y `descripcion` se escribieron tras ver el render final.

## Verificación

- Script con `assert` recalcula todas las cifras (fracciones con `Fraction`, decimales con `Decimal`): áreas 60/30/720/360/390/126/63/81; 4x+6=30→6, n÷3−2=6→24, 5x−4=21→5; 1/2·3/4=3/8, 6·2/3=4, 2/5·5/8=1/4; 0,4·0,3=0,12, 5,2÷4=1,3, 1,5·0,2=0,3, 0,75·6=4,5; 3n+1, 5n+2, 5n+3; 90·5÷3=150, 9÷3·7=21. Comprobado también: primer momento sin recurso, todos los recursos usados, sin términos vetados, opciones únicas.
- `pnpm nudito:validar-banco`: banco válido, 2 238 fichas activas, 27 034 ejercicios. `pnpm typecheck`: sin errores. `git diff --check` (banco de 6.º y diagramas): limpio.

## Riesgos y pendientes

- Sin revisión independiente, sin recorrido en navegador con audio real, móvil ni movimiento reducido; los SVG se vieron sueltos, no dentro del componente.
- La descripción de cada recurso se añade automáticamente a la narración: puede notarse alguna redundancia leve con la narración de la situación.
- «equis» y «n» se leen por la voz del navegador; revisar la pronunciación.
- No se actualizaron `estado-refuerzo-primaria.json`, spec 50 ni bitácora (fuera del encargo).

## Correcciones tras la revisión independiente (`revision-lote-07.md`)

- Imágenes que revelaban la respuesta: se quitó el `recursoRef` de los momentos «guiado» (area ej1 y ej2, ecuaciones ej1 y ej2, fracciones ej1, decimales ej2, patrones ej1 y ej2); el recurso queda en el momento «razona». En proporcionalidad se crearon dos SVG nuevos con la incógnita oculta, `proporcionalidad-arroz-pregunta.svg` (situación y ejemplo 1) y `proporcionalidad-regla-tres-pregunta.svg` (ejemplo 2); las tablas completas se usan al razonar y en los pasos. Esas dos clases pasan a 5 recursos.
- area ej1-razona: se eliminó la frase del triángulo alto y delgado.
- Narración: «la letra n» en ecuaciones y patrones.
- Letra correcta redistribuida: area a, fracciones a, decimales b, patrones b, ecuaciones c, proporcionalidad c; opciones reordenadas sin orden numérico.
- Revalidado: `pnpm nudito:validar-banco` (2 238 fichas, 27 034 ejercicios), `pnpm typecheck` y `git diff --check` limpios.

## Ronda 2 (`revision-lote-07-ronda2.md`)

Las situaciones iniciales ya no muestran resultados ni reglas. Nuevos SVG «pregunta» (incógnita oculta, renderizados a 360 px): `triangulos-paralelogramo-medidas`, `ecuaciones-balanza-pregunta`, `fracciones-huerta-pregunta`, `patrones-palitos-pregunta`. Los SVG con solución se usan solo en los momentos «razona» y pasos. fracciones: `ejemplo-2-guiado` sin recurso (la recta con «12/3 = 4 m» queda en «razona») y narración de la situación sin el conteo de cuadros; decimales: `ejemplo-1-guiado` sin recurso. proporcionalidad no se tocó. Revalidado: banco válido (2 238 fichas, 27 034 ejercicios), typecheck y `git diff --check` limpios. Cada clave sigue con 3 a 5 recursos distintos, todos usados.
