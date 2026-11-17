# Revisión independiente · Primaria CyT, lote 35

Fecha: 2026-11-16. Revisor: subagente Claude (Sonnet), distinto del autor. Solo lectura sobre banco y recursos.

## Verificaciones técnicas (E)

- `pnpm typecheck`: sin errores. `pnpm nudito:validar-banco`: válido (2238 fichas, 27034 ejercicios).
- Por clave, comparado con `HEAD` (JSON): solo cambió `claseGuiada`; el resto de la ficha es idéntico en las 6 claves.
- Script propio: 10 momentos, primer momento sin recurso, `recursoRef` ↔ recursos exactos (ninguno sin usar), archivos existen, alt ≤ 200, descripcion ≤ 500, sin dígitos ni «parte N», ningún «dibujo/imagen» en momentos sin recurso. Opciones de la comprobación: diferencia ≤ 3 y la correcta nunca es la más larga; letras correctas b, c, a, b, c, a.
- Las 18 imágenes Z-Image y los 9 SVG se abrieron uno por uno (SVG rasterizados en headless). Ninguna imagen tiene texto incrustado, niños diminutos ni anatomía defectuosa; `siembra` (tres adultos con sombrero, manos correctas) coincide con alt y descripcion. Estilo del lote: coherente en general; `agua-glaciar`, `agua-mar` y `agentes-canon` son algo más planas (vectorial) que el resto (acuarela suave); no bloqueante.
- Retoques manuales: `agua-glaciar` (recorte) no se nota. `agentes-paisaje` (parche) sí se nota a tamaño normal (ver clave 5).

## Veredictos

| Clave | Veredicto |
|---|---|
| cyt.p5.agua-como-solvente | APROBADA |
| cyt.p5.agua-dulce-salada | APROBADA |
| cyt.p5.alternativas-sostenibles | CAMBIOS |
| cyt.p6.acidos-bases-indicadores | CAMBIOS |
| cyt.p6.agentes-internos-externos | CAMBIOS |
| cyt.p6.alimentos-transgenicos | CAMBIOS |

## cyt.p5.agua-como-solvente (`sustancias-y-mezclas.json`): APROBADA

Contenido correcto (sal/azúcar/jugo en polvo solubles; aceite capa; arena granos), contraejemplo adecuado, imágenes coherentes con alt y descripcion y sin revelar la respuesta en la situación; tabla SVG solo en el paso 3. Sin defectos.

## cyt.p5.agua-dulce-salada (`estructura-externa-de-la-tierra.json`): APROBADA

Ciencia correcta para 5.º (≈97 % salada, ≈3 % dulce; reparto ≈69/30/1 como barra sin cifras). `cien` y `reparto` legibles y coinciden con la narración; `planeta`, `glaciar` (recorte invisible, sin personas) y `mar` coinciden con alt/descripcion. Sin defectos en la clase guiada. Ver G (e10) aparte.

## cyt.p5.alternativas-sostenibles (`tecnologia-y-ambiente.json`): CAMBIOS

1. Recurso `tachos`, `alt` y `descripcion`: asocian color con material (azul = papel, amarillo = plástico, verde = vidrio). En el Perú la norma de colores (NTP 900.058) es azul = papel y cartón, verde = vidrio, **amarillo = metales, blanco = plástico**. Un alumno peruano aprendería un código incorrecto. Corrección mínima: quitar los colores de la asignación; p. ej. alt «Tres tachos grandes en fila, con papel, botellas de plástico y frascos de vidrio asomando.» y descripcion «Tres tachos grandes en fila en un patio, cada uno con un símbolo blanco de reciclaje. En el primero asoman hojas de papel, en el segundo botellas de plástico y en el tercero frascos de vidrio.»
2. Símbolo de reciclaje (flechas) en los tachos: aceptable. Es el emblema real del objeto, idéntico en los tres, no explicativo ni texto; no exige regenerar.
3. Resto sin defectos (ladera sin personas, sin revelar respuesta; siembra coherente; esquema `erres` correcto).

## cyt.p6.acidos-bases-indicadores (`cambios-quimicos.json`): CAMBIOS

1. Recursos `mesa` y `jabon`: continuidad rota. En `mesa` el jabón es una barra celeste/turquesa sobre un plato (alt: «jabón celeste»); en `jabon` es crema, de forma abultada que parece más una esponja o un bollo que una barra (descripcion: «color crema de bordes redondeados»). El alumno ve dos jabones distintos en la misma ficha. Corrección mínima: regenerar `jabon` con barra celeste rectangular de bordes redondeados, o, como mínimo, que alt/descripcion lo describan fielmente («barra de jabón crema») y quitar «celeste» del alt de `mesa` aunque la imagen siga turquesa (esto último no resuelve lo visual; se prefiere regenerar).
2. `limon`: detalle menor, parche rosado sobre el borde del vaso (arriba). No bloquea; opcional.
3. Ciencia: verificada (limón/vinagre rojo-rosado; jabón y bicarbonato verde-azulado; agua morado). Aceptable para 6.º. Comprobación: las tres opciones difieren solo en el orden de colores; legible a oído porque el audio puede decir «vinagre … bicarbonato …», sin cambios requeridos.

## cyt.p6.agentes-internos-externos (`dinamica-interna-de-la-tierra.json`): CAMBIOS

1. Momentos `ejemplo-1-guiado` y `ejemplo-2-guiado`: la pregunta entrega la respuesta en su propia premisa. «Si la fuerza que lo formó viene de adentro, ¿será un agente interno o externo?» y «Si esa fuerza actúa en la superficie, ¿será … interno o externo?» son preguntas forzadas sin respuesta que pensar. Corrección: preguntar por el criterio, p. ej. «¿De dónde crees que viene la fuerza que forma un volcán: de adentro de la Tierra o de la superficie?» (y análogo para el río), sin declarar antes el origen.
2. Recurso `paisaje`: retoque visible. Hay un parche rectangular más claro en el terreno inferior derecho (aprox. x 900–960, y 760–800 sobre 1200×896), rocas pálidas de aspecto inconsistente (aprox. 1130,630 y 1010,850) y una mota oscura en la nieve de la cima (aprox. 595,150) que parece un ojo o defecto. Corrección: regenerar o limpiar esas tres zonas; la casita de arriba a la derecha es aceptable y está descrita.
3. `comprobacion`: introduce «mar/acantilado» (olas), que no aparece en la tabla `clasif` ni en la narración. Es razonable (mar = superficie), pero conviene mencionar «el mar» en `paso-2` o `contraejemplo` (p. ej. «la lluvia, el río, el viento, el mar y el glaciar»); la tabla tiene solo cuatro agentes. Menor.
4. Ciencia correcta (internos: sismos, volcanes, plegamiento; externos: lluvia, río, viento, glaciar). `volcan` y `canon` coinciden con alt/descripcion; `levanta` y `clasif` correctos.

## cyt.p6.alimentos-transgenicos (`debates-sobre-ciencia-y-sociedad.json`): CAMBIOS

1. Recurso `maiz`, `descripcion`: «Una oruga verde con **una sola cabeza**…». Es una nota de corrección del proceso de generación, no una descripción útil, y al leerse en voz alta confunde. Además el extremo trasero de la oruga es una esfera lisa que sigue pareciendo una segunda cabeza, y la oruga sonríe (tono de mascota para una «plaga»). Corrección mínima: descripcion «Una oruga verde descansa sobre una hoja de maíz que tiene varios agujeros pequeños…»; si se desea rigor, regenerar sin carita y con extremo trasero afinado.
2. Ejercicio existente `e06`: ver G.
3. Resto correcto para 6.º: definición de transgénico; ejemplo de gen bacteriano contra orugas coherente con `gen`; evidencia vs. opinión; contraejemplo cruce vs. transgénico con `cruce` (óvalos, la descripcion lo aclara). `mercado` coincide con alt/descripcion (fondo blanco, mesa suelta; aceptable).

## G. Ejercicios existentes reportados por el autor

- `agua-dulce-salada` e10 («Si todos los glaciares se derritieran, el agua dulce líquida disponible aumentaría temporalmente», respuesta verdadero): afecta al alumno. Es débil, no solo «fina»: casi toda esa agua llegaría al mar y se volvería salada o provocaría inundaciones, de modo que «agua dulce disponible» es discutible, y la pista («aumenta el agua líquida, no siempre utilizable») contradice el enunciado. Corrección mínima: reemplazar por «Si se derritieran todos los glaciares, el nivel del mar subiría» (V) con retroalimentación «Es verdadero: el agua del hielo llega a los océanos y sube el nivel del mar, además de perderse una reserva de agua dulce».
- `alimentos-transgenicos` e06 («moratoria … hasta 2035»): el dato coincide con lo que conozco (Ley 29811 de 2011, ampliada por Ley 31111 hasta el 31-12-2035), pero no lo pude verificar en línea en esta revisión y es dato legal que puede cambiar. Recomendación: reformular sin año: «El Perú tiene una moratoria que impide cultivar transgénicos. ¿Qué significa moratoria?», con la retroalimentación «Significa prohibición temporal: se suspende el cultivo hasta una fecha», manteniendo respuesta y opciones.
- Los demás ejercicios de las 6 claves se revisaron: respuestas correctas, sin errores de grado.

## Resumen

Aprobadas: agua-como-solvente, agua-dulce-salada. Con cambios: alternativas-sostenibles (colores de tachos), acidos-bases-indicadores (continuidad del jabón), agentes-internos-externos (preguntas forzadas y retoque visible en `paisaje`), alimentos-transgenicos (descripcion de `maiz`). Todos son arreglos pequeños; ninguno cuestiona la estructura del lote.

## Ronda 2

Fecha: 2026-11-16. Revisor independiente. `pnpm nudito:validar-banco` válido y `pnpm typecheck` sin errores. Ediciones de ejercicios comparadas con HEAD por JSON: solo `agua-dulce-salada` e10 y `alimentos-transgenicos` e06 cambiaron (id y dificultad intactos).

- cyt.p5.alternativas-sostenibles: APROBADA. `alt` y `descripcion` de `tachos` ya no asignan colores a materiales.
- cyt.p6.acidos-bases-indicadores: APROBADA. `jabon` regenerado: barra celeste de bordes redondeados sobre plato blanco, coherente con `mesa`; alt/descripcion exactos. Nota menor no bloqueante: la barra de `jabon` es más abultada que la de `mesa`.
- cyt.p6.agentes-internos-externos: APROBADA. `paisaje` limpio (sin parches, sin personas ni casas); preguntas guiadas sin declarar el origen; `paso-2` menciona el mar.
- cyt.p6.alimentos-transgenicos: APROBADA. `maiz`: una sola cabeza, cola afinada, cara neutra, hueco en la hoja; descripcion solo con lo visible. e06 sin 2035 (enunciado y pista), respuesta a.
- cyt.p5.agua-dulce-salada: APROBADA. e10 verdadero, pistas y retroalimentación coherentes, respuesta única.
