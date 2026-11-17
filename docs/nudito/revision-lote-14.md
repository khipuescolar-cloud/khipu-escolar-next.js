# Revisión lote 14 (Ciencia y Tecnología 5.º, 6 claves)

| Clave | Veredicto |
|---|---|
| cyt.p5.celula-animal-vegetal | APROBADA |
| cyt.p5.formas-tamanos-celulas | APROBADA |
| cyt.p5.funciones-basicas-celula | CAMBIOS (menor) |
| cyt.p5.ecosistemas | APROBADA |
| cyt.p5.estructura-externa-tierra | APROBADA |
| cyt.p5.materia-particulas | CAMBIOS (menor) |

Defectos:
- materia-particulas svg `modelo`: el círculo de aumento (cx470, r165, trazo 5) llega a x=637,5 de 640: toca el borde derecho. Reducir r a ~150 o mover cx a ~450 (ajustar líneas punteadas y partículas). Además los rótulos «Partícula» y «Espacio vacío» tienen líneas que se cruzan y la de «Espacio vacío» roza la partícula de (557,210). Menor: bajar el rótulo de espacio vacío o cambiar el ángulo.
- funciones-basicas-celula `error-frecuente`: recursoRef `mapa` pero narra raíz de papa, quinua y absorción de agua, que el mapa no muestra (solo tres células genéricas). Menor: usar `rodilla`/sin recurso o añadir frase «en el mapa, la fila de reproducción…».
- funciones-basicas-celula `mapa`: la narración dice «fíjate en lo que le sucede… De esa acción depende la función», pero el SVG ya rotula las tres funciones; no es respuesta de un ejercicio, aceptable.
- celula-animal-vegetal / funciones: «raíz de papa» es ambigua (la papa comestible es un tubérculo, tallo). En el contexto es la raíz de la planta; menor, escribir «raíz de la planta de papa».
- formas `ejemplo-2-observa`: dice que el glóbulo «apenas cabe» en los capilares; el SVG `vaso-fino` muestra un conducto más estrecho que el glóbulo (y el alt lo dice). Menor: «es más angosto que un glóbulo rojo» o «tan estrechos que un glóbulo rojo apenas pasa».

Ilustraciones Z-Image (10 abiertas): todas sin texto, fieles a alt/descripcion, anatomía plausible, aptas.
- laguna: arboleda de coníferas lejana poco altoandina, pero al fondo y sin afectar el concepto; aceptable.
- niña del azúcar: de aspecto menor (~6-7 años) pero caricatura neutra; aceptable. Se ven granos en el fondo (coherente con el momento previo a disolverse).
- panoja de quinua: estilizada (espiga roja compacta); aceptable.
- huaico sin personas: correcto y plausible; las dos casas lejanas coinciden con alt.
- valle, dunas, chacra, rodilla, agua fría, perfume: coinciden.

Ciencia: sin errores en célula animal/vegetal, formas y tamaños (glóbulo 7-8 µm, óvulo ~0,1 mm, neurona hasta ~1 m), funciones, factores bióticos/abióticos, cambios lentos/bruscos, modelo de partículas y espacio vacío. Una sola respuesta correcta; letras b,c,a,c,b,a; longitudes parejas.
Recursos: sin refs rotas ni recursos sin usar, idea sin imagen, ≥3 recursos por clave. Sin revelación previa (dibujos-ab sin rótulos de partes; pecera es premisa narrada).
Voz: sin «Atención:» ni «¿Es verdad que…».

Técnica: validar-banco OK (2238 fichas, 27034 ejercicios), typecheck OK. Ejercicios de las 6 claves iguales a HEAD. `cyt.p5.la-celula` (ya aprobada) difiere de HEAD también en `ejercicios`, `ejemplos`, etc. (HEAD solo tiene 9 fichas antiguas: cambios previos sin confirmar, no de este lote); no se pudo verificar «sin cambios» contra HEAD. Sin comprobar: audio, UI real, lector de pantalla; SVG renderizados con sharp, no navegador; informe editorial no leído.
