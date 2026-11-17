# Revisión lote 15 (Ciencia y Tecnología 5.º, 7 claves)

| Clave | Veredicto |
|---|---|
| cyt.p5.nutrientes-oxigeno-celulas | APROBADA |
| cyt.p5.observacion-celulas-cebolla | APROBADA (menor: ej2-situacion muestra la respuesta) |
| cyt.p5.pared-cloroplastos-vacuola | CAMBIOS |
| cyt.p5.partes-de-la-celula | CAMBIOS (menor) |
| cyt.p5.reproduccion-seres-vivos | CAMBIOS |
| cyt.p5.variables-experimento | APROBADA |
| cyt.p5.lupa-y-microscopio | CAMBIOS (menor) |

Defectos:
- reproduccion `comprobacion`: correcta (a) la más larga (71 vs 50/49). Igualar (p. ej. «Sexual, porque participan dos progenitores» y «Asexual, porque nace un solo pollito de cada huevo»).
- pared svg `mapa` (momento `mapa`, paso-1, error): el núcleo morado y un cloroplasto (abajo, junto a la pared) pisan la línea naranja de la membrana; parecen estar sobre la membrana. Moverlos hacia dentro.
- pared svg `plantas` / ej2-situacion: narración y alt dicen «plantas de maíz» pero el dibujo muestra hojas ovaladas (no son hojas de maíz). Decir «dos plantas» o «dos plantas pequeñas».
- partes svg `numeros` (ej2-situacion, ej2-razona, paso-3): la marca 2 toca el borde naranja; narración dice «en la sustancia gelatinosa del interior». Mover el 2 hacia dentro.
- partes `comprobacion`: correcta (c) la más larga (63 vs 56/58): menor, igualar.
- lupa `paso-1` (recursoRef partes): narra «en cada una está grabado su aumento, como 10 o 40»; `partes` no muestra números (los muestra `lentes`). Cambiar ref a `lentes` o quitar esa frase. Menor: `paso-3` ref `campo` narra tornillos que no aparecen.
- cebolla ej2-situacion: `campos` muestra ya la respuesta (células sin pared) a la pregunta «¿verá una pared?». Menor; aceptable si se prefiere.

Ilustraciones Z-Image (4): fieles a alt/descripcion, sin texto, anatomía plausible, aptas. Cebolla: el rostro asoma recortado en el borde derecho; no inquieta (solo ojo y mejilla), aceptable. Lentejas: la cuchara está a la altura del pecho, no «a la boca» (descripcion; trivial).
Ciencia: sin errores en célula, orgánulos, microscopio (4×10=40; 10×40=400; objetivo menor = mayor distancia de trabajo), reproducción (papa = asexual), variables.

Técnica: validar-banco OK (2238 fichas), typecheck OK. Ejercicios de las 7 claves intactos vs HEAD. cyt.p5.la-celula: claseGuiada de 11 momentos con 4 recursos `…-gemini-v1.webp`, refs sin romper, pero sus ejercicios/ideaCentral/ejemplos/vocabulario/fuentes difieren de HEAD (reescritura previa sin commit, no de este lote). cyt.p5.ciencia-y-tecnologia: claseGuiada de 11 momentos, refs y archivos íntegros. Sin refs rotas ni recursos sin usar; ≥3 recursos por clave; idea sin imagen; SVG a 360 px legibles (texto ≥26/640 ≈ 14,6 px), sin solapes de texto.
Sin comprobar: audio, UI real, lector de pantalla; SVG renderizados con sharp, no con navegador.
