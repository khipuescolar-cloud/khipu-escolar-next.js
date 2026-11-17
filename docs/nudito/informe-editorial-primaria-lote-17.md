# Informe editorial · Primaria, Matemática 1.º a 6.º, lote 17

Fecha: 2026-11-16. Autor: subagente Claude (Sonnet). Estado: **escrito y validado técnicamente; pendiente de revisión independiente**. No se tocaron estado, huellas, BD, specs, componentes ni git.

## Alcance

| Clave | Archivo (`src/lib/nudito/conocimiento/banco/matematica/`) | Momentos | Recursos (ID) |
|---|---|---:|---|
| `mat.p1.comparar-hasta-20` | `primaria-1/fichas/numeros-hasta-50.json` | 10 | `lapices-pregunta`, `pareo`, `decena`, `pasos` |
| `mat.p2.canje-decenas-unidades` | `primaria-2/fichas/numeracion-hasta-100.json` | 10 | `botones-pregunta`, `juntar`, `restar`, `pasos` |
| `mat.p3.arreglos-rectangulares` | `primaria-3/fichas/c23-multiplicacion-division.json` | 10 | `bandeja-pregunta`, `suma-repetida`, `girar`, `pasos` |
| `mat.p4.comparar-fracciones` | `primaria-4/fichas/fracciones.json` | 10 | `cintas-pregunta`, `cintas`, `botellas`, `pasos` |
| `mat.p5.area-figuras-compuestas` | `primaria-5/fichas/perimetro-y-superficie.json` | 10 | `sala-pregunta`, `sala-partes`, `pared`, `pasos` |
| `mat.p6.area-paralelogramo` | `primaria-6/fichas/longitud-perimetro-y-area.json` | 10 | `terreno-pregunta`, `rectangulo`, `vidrio`, `pasos` |

Solo cambió `claseGuiada` de cada clave (se añadió al final del objeto). Ejercicios, ids, respuestas y dificultad intactos. Estructura: idea sin imagen, situación con variante «pregunta» (es el mismo escenario del ejemplo 1), ejemplo 1 guiado sin imagen y «razona» con la solución, ejemplo 2 igual con otro contexto, contraejemplo sin imagen, tres pasos (tarjetas resumen en el paso 3) y comprobación nueva con tres opciones.

Letra correcta: p1 b, p2 c, p3 a, p4 c, p5 b, p6 a.

## Decisiones pedagógicas

- p1: cuadros de diez y emparejamiento (7 vs 12, sobran 5); misma decena, se comparan unidades (14 vs 18). Frases cortas.
- p2: unidades a decena (3 decenas y 12 sueltos, 42) y decena a unidades para restar (52 − 7 = 45). Contraejemplo: «una decena = una unidad» y perder objetos.
- p3: suma repetida a multiplicación (4 × 5) y girar el arreglo (3 × 8 = 8 × 3). Contraejemplo: sumar filas y columnas, esquina contada dos veces.
- p4: mismo numerador (2/3 vs 2/5) y mismo denominador (3/8 vs 5/8). Contraejemplo: 1/8 mayor que 1/4 «porque 8 > 4» y enteros distintos. Fracciones escritas en palabras en narración y opciones.
- p5: figura en ele dividida (3 × 4 + 8 × 3 = 36) y pared menos ventana (45 − 6 = 39). Contraejemplo: 8 × 7 = 56 y superposición.
- p6: recortar y mover el triángulo (14 × 6 = 84, lado de 10 m no se usa) y hallar la altura (72 ÷ 9 = 8). Medidas 6-8-10 coherentes con el dibujo. Contraejemplo: base × lado inclinado y dividir entre dos.
- Los ejercicios existentes de las seis claves se revisaron: sin errores matemáticos ni de grado. Observación menor: en `mat.p4.comparar-fracciones` el enunciado e08 («Es cierto que 2/6 es mayor…») es verdadero_falso con respuesta falsa, correcto pero con encabezado afirmativo.

## SVG nuevos (24, viewBox 640×480, texto ≥ 26 px, `<title>`, sin `<tspan>`)

`comparar-lapices-pregunta`, `comparar-pareo-lapices`, `comparar-cuentas-decena`, `comparar-tres-pasos`, `canje-botones-pregunta`, `canje-botones-juntar`, `canje-lapices-restar`, `canje-tres-pasos`, `arreglos-alfajores-pregunta`, `arreglos-suma-repetida`, `arreglos-girar-mosaico`, `arreglos-tres-pasos`, `fracciones-cinta-pregunta`, `fracciones-cinta-comparar`, `fracciones-botellas-octavos`, `fracciones-tres-pasos`, `area-sala-ele-pregunta`, `area-sala-ele-partes`, `area-pared-ventana`, `area-compuestas-tres-pasos`, `paralelogramo-terreno-pregunta`, `paralelogramo-a-rectangulo`, `paralelogramo-vidrio-altura`, `paralelogramo-tres-pasos`, en `public/nudito/diagramas/matematica/`.

Renderizados con Chrome headless (hoja de contacto a 640 px). Se corrigieron: tarjeta de pasos de fracciones que desbordaba, texto de pasos de área al borde, etiqueta «mover» pegada al dibujo y «8 cm» cerca del borde del paralelogramo. `alt` y `descripcion` escritos tras ver el render. Las variantes «pregunta» no muestran respuesta ni regla.

## Verificación

- Script con `assert`: 7+5, 12−7, 30+12=42, 52−7=45, 4×5=20, 3×8=8×3=24, 3×4+8×3=36, 8×7−5×4=36, 9×5−2×3=39, 6×4+3×2=30, 14×6=84, 72÷9=8, 18×10=180, 18×12=216, 6×7=42, 6²+8²=10², fracciones con `Fraction`.
- Script de estructura: primer momento sin recurso, todos los recursos usados y solo ellos, ids únicos, `alt` ≤ 200, archivos SVG existentes, narración sin dígitos ni «parte N de M».
- `pnpm nudito:validar-banco`: banco válido, 2 238 fichas, 27 034 ejercicios. `pnpm typecheck`: sin errores. `git diff --check` (seis JSON y diagramas): limpio.

## Riesgos y pendientes

- Sin revisión independiente ni recorrido en navegador con audio real, móvil o movimiento reducido; los SVG se vieron sueltos.
- La descripción de cada recurso se añade a la narración: posible redundancia leve con la situación.
- Los ejemplos 1 guiado y 2 guiado no llevan imagen; el recurso aparece en «razona».
- Fórmulas como «2/3» aparecen en SVG como cifras; en narración y opciones están en palabras.
- No se actualizaron `estado-refuerzo-primaria.json`, specs ni bitácora (fuera del encargo).

## Correcciones tras la revisión independiente (`revision-lote-17.md`)

- `fracciones-cinta-comparar.svg`: la línea punteada pasa a x=400 (fin de las dos partes de Elena), más gruesa y cruzando la barra de Bruno; la descripción de `cintas` ahora dice «línea punteada gruesa… cruza la barra de Bruno».
- `paralelogramo-vidrio-altura.svg`: «8 cm» separado de la altura punteada y del borde derecho; «72 cm²» subido.
- `paralelogramo-a-rectangulo.svg`: figura y rectángulo desplazados hacia abajo; «mover» y la flecha tienen aire respecto al título y a la figura.
- Pistas suavizadas: p4 «Compara cuántas partes usó cada uno y cómo es el tamaño de las partes.»; p6 «Piensa qué medida forma un ángulo recto con la base.»
- Rerasterizados y revisados a la vista; revalidados `pnpm nudito:validar-banco`, `pnpm typecheck` y `git diff --check`.
