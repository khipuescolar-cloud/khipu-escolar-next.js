# Revisión independiente lote 05 (Matemática 2.º y 4.º)

Revisor: Claude (no escribió el contenido). Solo lectura; este es el único archivo escrito.

## Veredictos

| Clave | Veredicto |
|---|---|
| mat.p2.igualdades-equilibrio | CAMBIOS (menor, D1) |
| mat.p2.medir-longitudes | APROBADA |
| mat.p2.suma-resta-hasta-100 | APROBADA |
| mat.p2.valor-posicional | APROBADA |
| mat.p4.division-una-cifra | APROBADA |
| mat.p4.multiplicacion-varias-cifras | APROBADA |
| mat.p4.fraccion-de-cantidad | CAMBIOS (menor, D3) |
| mat.p4.igualdades-dos-equivalencias | CAMBIOS (menor, D2) |
| mat.p4.patrones-aditivos-multiplicativos | CAMBIOS (menor, D4) |
| mat.p4.perimetro-poligonos | APROBADA |

Ningún defecto de exactitud ni de integridad técnica. Los cambios son de coherencia momento-recurso y de redacción.

## Comprobaciones hechas

- Exactitud: recalculé por script todas las cuentas de narraciones, ejemplos, contraejemplos y comprobación (45−23=22; 21+13=34; 53−21=32; 612÷6=102; 648÷3=216; 735÷5=147; 804÷4=201; 243×3=729; 1256×4=5024; 238×6=1428; 2/3 de 36=24; 3/4 de 20=15; 2/5 de 30=12; 5×8=4×10; 4×6=3×8; 5×4≠2×8; 2·3^k=2,6,18,54,162; 30+40+50=120; 2(12+7)=38; 2(25+14)=78). Todas correctas. Cada comprobación tiene una sola respuesta correcta y distractores plausibles (errores típicos: sumar en vez de restar, omitir el cero, invertir cifras, multiplicar por el denominador).
- Técnica: `pnpm nudito:validar-banco` OK (2238 fichas, 27034 ejercicios); `pnpm typecheck` OK. `git diff` contra HEAD: en los 9 archivos solo se agrega `claseGuiada`; ejercicios y respuestas intactos. Las 10 fichas tienen `claseGuiada.version = 1`, ids de momento únicos, sin `recursoRef` rotos, sin recursos sin usar, idea sin imagen, 2 recursos distintos cada una, y los 20 SVG existen en public.
- Voz: sin «Atención:», sin «¿Es verdad que…?», sin «recuerda» antes de ver algo (solo `medir-longitudes` paso-3, que ya se vio en el ejemplo 2: válido); números narrados en palabras.
- SVG: los 21 renderizados con Chrome headless a 360 px de ancho. Sin solapes y texto legible (los más pequeños, las cuentas laterales de multiplicación y la línea inferior de los SVG de 2.º, rondan 11 a 12 px). Conté los elementos de cada dibujo contra alt, descripcion y narración: coinciden (balanza 6 y 6; 9 y 9; 9 contra 5 con 4 punteadas; 6 clips; 9 pies y 3 pasos; 53−21 con 2 barras y 1 cubito punteados; llevadas 1, 2, 2 de 1256×4 sobre las columnas correctas; 4 grupos de 5; 5 filas de 6; arreglos 4×6 y 3×8; cajas 3×8 y 4×6; triángulo 30, 40, 50; rectángulo 12 y 7).

## Defectos

1. **D1, mat.p2.igualdades-equilibrio, momento `paso-3`** (recurso `desigual`). El texto habla de calcular cada lado en general, pero el SVG muestra un caso concreto (título «Quitas 4 solo de un lado», nueve contra cinco). Corrección: o narrar el caso («En esta balanza hay nueve fichas a un lado y cinco al otro, no son iguales, así que falta arreglar un lado») o usar `balanza-seis` o `mas-tres` en este paso.
2. **D2, mat.p4.igualdades-dos-equivalencias, momento `ejemplo-1-guiado`** (recurso `arreglos`). El texto pregunta qué número falta en «cuatro por seis igual a tres por…», pero la imagen ya muestra «3 × 8 = 24» y revela la respuesta antes del razonamiento. Corrección: decir «mira que la imagen ya lo muestra, pero lo calculamos para entender por qué» o cambiar la narración para que describa los dos arreglos y luego plantee el hueco en el siguiente momento.
3. **D3, mat.p4.fraccion-de-cantidad, momento `paso-3`**. Cierra con «Responde con una oración completa.», instrucción suelta que no aparece en ningún ejemplo ni en la comprobación. Corrección: eliminarla, o pedir «Escribe el resultado con su unidad, por ejemplo, quince canicas».
4. **D4, mat.p4.patrones-aditivos-multiplicativos, momento `situacion-monedas`**. La narración dice «monedas… cinco, diez, quince y veinte soles», mientras alt y descripción hablan de «monedas» y no de soles. Mezcla unidad (monedas contra soles). Corrección: «Ana junta soles durante cuatro días» (y ajustar alt/descripcion), o decir «cinco, diez, quince y veinte monedas».
5. **Observación transversal, todas las claves.** La respuesta correcta de la comprobación es siempre `a` en las 4 claves de 2.º y siempre `b` en las 6 de 4.º. Es una pista de posición. Corrección: variar el orden de las opciones (p. ej. `c`, `a`, `b`, `c`…) sin cambiar el texto de las opciones. Verificar que el cambio no rompe tests de la `comprobacion`, que usa `respuesta` por id.
6. **Observación menor, `mat.p2.igualdades-equilibrio` `balanza-seis`.** No tiene título dentro del SVG (los demás sí), y el viewBox es 600×450 en vez de 640×480. Solo estilo; opcional.

## Pendiente (no hecho)

- Navegador real con la UI de Nudito (teoría, comprobación, práctica, volver a teoría), móvil y escritorio, y movimiento reducido.
- Audio real: voz española del navegador, sincronía texto-voz, pausa/reanudación, enumeración de opciones en la comprobación; la fluidez al leer en voz alta no se probó.
- Los SVG se vieron aislados en Chrome headless, no dentro del componente del repaso.
- Revisión de las huellas editoriales y aprobación editorial.
- No leí `informe-editorial-primaria-lote-05.md`, como se pidió.
