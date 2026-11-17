# Revisión independiente · Primaria, Matemática, lote 33

Revisor independiente (no escribió el lote). Solo lectura sobre banco y recursos. Los 25 SVG se rasterizaron en Chrome headless y se vieron uno por uno.

## Resultado

| Clave | Veredicto |
|---|---|
| `mat.p1.completar-10-para-sumar` | CAMBIOS |
| `mat.p2.continuar-completar-patron` | APROBADA |
| `mat.p4.conmutativa-multiplicacion` | APROBADA |
| `mat.p5.convertir-km-m-cm` | APROBADA |
| `mat.p6.completar-tablas-doble-entrada` | CAMBIOS |

## Verificaciones generales (E)

- `pnpm typecheck`: sin errores. `pnpm nudito:validar-banco`: válido (2238 fichas, 27034 ejercicios).
- Comparado con HEAD por JSON: en las 5 claves solo cambió `claseGuiada`. No hay ediciones de ejercicios.
- SVG: 25 archivos en `public/nudito/diagramas/matematica/` con los prefijos `completar-diez-`, `continuar-patron-`, `conmutativa-`, `convertir-longitud-`, `tabla-doble-`. Coinciden exactamente con los `recursos[].id`/`src` (5 por clave, todos referenciados por `recursoRef`). Sin huérfanos ni duplicados.
- Colores de texto: solo `#1E2A78`, `#0C706E`, `#8A5A00`, `#B5412A` y `#FFFFFF` (sobre cabecera azul). Ningún `#C98F1E`. Sin `<tspan>`. Tamaño de fuente mínimo 26 px. Sin desbordes ni solapes en los 25. Todos usan viewBox 640x480.
- alt ≤ 116, descripcion ≤ 279. Letras correctas: c, a, b, c, b. Longitudes de opciones con diferencia ≤ 3 y la correcta nunca es la más larga. Sin dígitos ni «parte N de M» en narración. Primer momento sin imagen en las cinco. Ningún momento sin recurso nombra «tarjeta», «dibujo» o «imagen».
- Falsa alarma al rasterizar: dos PNG (`convertir-longitud-cm-m`, `completar-diez-nueve-seis-pregunta`) salieron con franja blanca por un fallo de captura de Chrome. Se volvieron a capturar en otra ventana y el SVG llena el viewBox completo.

## Decisión sobre los riesgos del autor

- p2 `situacion`, espacio vacío bajo la fila: **aceptable**. Es una sola fila con título y pregunta; no hay desborde ni pierde legibilidad. Opcional: bajar la fila al centro vertical.
- p1 `nueve-seis-pregunta`, aves como círculos: **aceptable**. alt y descripción lo declaran («representadas por círculos»), rotulado «Nueve aves»/«Seis aves», y para primero basta. Sí se pide arreglar el contraejemplo (abajo).
- p5 `cm-pregunta`, cinta ondulada sin escala: **aceptable**. Es a propósito y la medida va rotulada.

## mat.p1.completar-10-para-sumar: CAMBIOS

1. `momento contraejemplo` + recurso `error` (`completar-diez-error.svg`): no es un contraejemplo claro. Título «Una separación que no funciona», pero la tarjeta muestra la separación **correcta** de siete más cinco (marco con siete turquesa y tres amarillas, «Usadas: tres», «Quedan: dos»). La separación errónea (tres y tres) no se dibuja, solo se nombra en rojo «Tres y tres no suman cinco». La narración es confusa de oír: «Si se usan tres de cinco, quedan dos; dejar otras tres sería un error». Además las tres fichas amarillas dentro del marco y los círculos punteados «Usadas» se leen como dos cosas distintas. Corregir: que el dibujo muestre el error (cinco separado en tres y tres, con las tres «que quedan» tachadas o en rojo, y la comprobación «tres y dos son cinco») y que la narración diga el error con una frase corta: «Aquí se separó el cinco en tres y tres. Pero tres y tres son seis, no cinco. Comprueba que las dos partes formen el número que separaste». Actualizar alt y descripcion al nuevo dibujo.
2. `momento situacion` (menor, no bloquea): narra «El marco tiene dos espacios vacíos», con lo que ya entrega el primer paso («a ocho le faltan dos») que luego se pregunta en `ejemplo-1-guiado`. Sugerido: quitar esa frase de la narración (el dibujo ya lo muestra).

Contenido verificado: ocho más cinco son trece, nueve más seis son quince, ocho más siete son quince. Respuesta única (c, «Quince fichas»); distractores catorce y dieciséis plausibles. El resto de momentos, los SVG `situacion`, `ocho-cinco`, `nueve-seis-pregunta` y `nueve-seis` coinciden con alt y descripcion.

## mat.p2.continuar-completar-patron: APROBADA

Contenido correcto: situación alternada, ejemplo de núcleo largo (triángulo, triángulo, círculo) y comprobación (círculo, cuadrado, cuadrado) con respuesta única. El contraejemplo coincide con el SVG (fila triángulo, triángulo, círculo, triángulo, círculo, anillo rojo en el último). `situacion` y `doble-pregunta` no revelan la respuesta; las imágenes de razonamiento coinciden con alt y descripcion. Sin defectos bloqueantes.

## mat.p4.conmutativa-multiplicacion: APROBADA

Verificado: tres por cuatro y cuatro por tres son doce; seis por dos y dos por seis son doce; cinco por tres son quince y cinco más tres son ocho. `bolsas-pregunta` muestra 6 bolsas con 2 semillas y 2 bandejas con 6, igual que alt y descripcion. Comprobación con respuesta única (b, «Cuatro por siete»); los distractores son una suma y un factor cambiado. Menor y opcional: `situacion` ya dice «las filas y las columnas intercambiaron su lugar», que anticipa la regla.

## mat.p5.convertir-km-m-cm: APROBADA

Verificado: dos km son 2000 m; 450 cm son 4,5 m; seis metros son 600 cm (el contraejemplo 0,06 cm es el error típico de dirección al revés). Comprobación: 800 cm a metros se divide entre cien; respuesta única (c). Imágenes coinciden con alt y descripcion, incluida la cinta ondulada sin escala. Voz: «cero coma cero seis», «cuatro coma cinco» se leen bien. Menor: `ejemplo-2-guiado` ya dice «la cantidad debe disminuir» antes de preguntar qué operación; es aceptable porque el alumno aún debe elegir «dividir entre cien».

## mat.p6.completar-tablas-doble-entrada: CAMBIOS

1. `ejemplo-2-razona` con `recursoRef: columna` (`tabla-doble-columna.svg`): la narración dice que «la tarjeta ... confirma la columna con cuatro más siete, que da once, y la fila azul con ocho más siete, que da quince». El dibujo solo muestra «Once menos cuatro es siete» y «Cuatro más siete confirma once»; la comprobación de la fila azul no aparece (ni en alt ni en descripcion). Corregir: o bien añadir en el SVG una tercera línea «Ocho más siete confirma quince» (y reflejarla en descripcion), o bien reescribir la narración para que solo atribuya a la tarjeta lo que muestra: «Luego confirma la columna con cuatro más siete, que da once. Y tú también puedes confirmar la fila azul: ocho más siete son quince».
2. `ejemplo-2-guiado`: la pregunta «¿Qué resta usa solo los datos de esa columna?» suena forzada al oído («qué resta usa») y ya nombra la operación. Sugerido: «¿Cómo calculas el dato que falta usando solo los datos de esa columna?».
3. `contraejemplo` (menor): «Solo el segundo sirve para el cálculo» es exacto entre los dos totales rodeados, pero el total 15 de la fila Azul también sirve (quince menos ocho). Sugerido: «De los dos totales marcados, solo el segundo sirve...».

Contenido verificado: quince menos ocho son siete; once menos cuatro son siete; 6+4=10, 8+7=15, 6+8=14, 4+7=11, 10+15=25 (tabla consistente). Comprobación: veinte menos doce son ocho, respuesta única (b). Las opciones tienen la misma longitud (17, 16, 17). Rótulos y cifras de los cinco SVG coinciden con alt y descripcion.

## G) Errores de ejercicios existentes

El autor no reportó errores en ejercicios de las cinco claves y no se detectó ninguno que afecte al alumno. No se propone ninguna corrección.

## Ronda 2

Revisor independiente. Solo lectura; los dos SVG cambiados se rasterizaron en Chrome headless y se vieron. `pnpm nudito:validar-banco` válido (2238 fichas, 27034 ejercicios); `pnpm typecheck` sin errores. En las dos claves solo difiere `claseGuiada` respecto de HEAD.

| Clave | Veredicto |
|---|---|
| `mat.p1.completar-10-para-sumar` | APROBADA |
| `mat.p6.completar-tablas-doble-entrada` | APROBADA |

- p1: `completar-diez-error.svg` muestra el error con claridad (marco con siete turquesas y tres amarillas, tres amarillas con anillo rojo afuera, textos «Usó tres para diez», «Dejó tres fuera», «Del cinco solo quedan dos», «Tres y tres no suman cinco»). Texto ≥27 px, sin solapes ni bordes pegados. alt, descripción y narración del contraejemplo coinciden y son comprensibles para 1.º. `situacion` ya no adelanta el primer paso.
- p6: `tabla-doble-columna.svg` añade «Ocho más siete confirma quince» (texto ≥26 px, cabe con margen), coherente con `ejemplo-2-razona` y la descripción. `ejemplo-2-guiado` pregunta «¿Cuántos del grupo azul van a pie?» sin revelar el siete. El contraejemplo dice «De los dos totales marcados, solo el segundo sirve».
