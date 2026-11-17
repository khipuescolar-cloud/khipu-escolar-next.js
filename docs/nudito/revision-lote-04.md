# Revisión independiente lote 04 (Matemática)

| Clave | Veredicto |
|---|---|
| mat.p2.patrones-aditivos | CAMBIOS |
| mat.p3.grupos-iguales | CAMBIOS |
| mat.p4.fracciones-equivalentes | APROBADA |
| mat.p5.numeros-decimales | APROBADA (observaciones menores) |
| mat.p6.porcentajes | APROBADA (observaciones menores) |

Exactitud: todos los cálculos de narraciones, ejemplos y comprobaciones recalculados a mano/script; correctos y con una sola respuesta. Banco: solo cambió `claseGuiada` en las 5 fichas (comparado con HEAD). `pnpm nudito:validar-banco` OK (2238 fichas, 27034 ejercicios); `pnpm typecheck` OK. Los 15 SVG se renderizaron en Chrome headless a 360 px de ancho; sin solapes.

## Defectos
1. p2 `ejemplo-1-razona`: título dice "sin mirar el dibujo" pero tiene recursoRef regla-mas-tres, y el SVG solo muestra 3,6,9,12 (se narran 18 y 21). Quitar recursoRef o cambiar título a "seguimos la serie".
2. p3 `paso-2`: narra las cestas ("escribimos cinco tres veces") pero recursoRef es bolsas-pan (muestra 3+3+3+3). Usar cestas-choclos.
3. p3 `paso-3`: narra las cestas (5+5=10, +5=15) pero recursoRef es paltas-recta. Usar cestas-choclos.
4. Legibilidad móvil (SVG antiguos, texto ~9-10 px a 360 px): patrones-aditivos.svg (rótulos "+3 →"), grupos-iguales.svg (suma al pie casi pegada al borde del recuadro), porcentajes.svg (leyenda "1 de 4 grupos = 25 %"), numeros-decimales.svg y fracciones-equivalentes.svg (rótulos pequeños). Afecta p2, p3, p6 (y levemente p4, p5). Sugerencia: agrandar fuente o rehacer a 640x480 como los nuevos.
5. p5 `ejemplo-2-razona`: abre con "Todavía no se completa la unidad." (frase suelta y ambigua). Sugerido: "Ahora averigüemos qué parte no germinó."
6. p5 `comprobacion`: opciones "0,7", "7,0", "0,07" dependen de que la voz lea bien la coma decimal. Considerar "Cero coma siete", "Siete coma cero", "Cero coma cero siete".
7. p6 `situacion-equivalencias`: audio no dicta los cuatro pares porcentaje-fracción; solo la descripcion. Añadir "diez por ciento, un décimo; veinticinco, un cuarto..." para quien solo escucha.
8. p6 `paso-2`: "usando la tabla" y luego añade veinte por ciento = un quinto, que no está en el recurso. Aclarar "este no aparece en la tabla".
9. p3 `idea`/p2 `idea`: "Como idea principal, recuerda…" no es defecto grave; el "recuerda" abre contenido nuevo (alumno aún no vio nada). Sugerido "Como idea principal, ten presente…".

## Sin hacer (no dado por hecho)
- Reproducción de audio real (TTS): lectura de números/comas, avance automático, sincronía texto-voz.
- Verificación en la app (navegador): carga de recursos en la clase, recursoRef visibles por momento, comprobación interactiva, repetir pregunta, móvil real.
- Las capturas se hicieron con el SVG suelto, no dentro del componente.
- No leí informe-editorial-primaria-lote-04.md.
