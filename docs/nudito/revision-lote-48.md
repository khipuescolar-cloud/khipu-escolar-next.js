# Revisión independiente · Primaria, Comunicación, lote 48

Fecha: 2026-11-16. Revisor independiente (no escribió el lote). Solo lectura sobre banco y recursos.

## Resumen

| Clave | Veredicto |
|---|---|
| `com.p1.agrupar-palabras` | APROBADA |
| `com.p1.como-son-lugares-y-objetos` | CAMBIOS |
| `com.p1.contar-silabas` | APROBADA |
| `com.p2.antonimos` | APROBADA |
| `com.p2.comparar-en-el-texto` | CAMBIOS |
| `com.p3.adjetivo-y-concordancia` | CAMBIOS |

Aprobadas: 3. Con cambios: 3 (una con defecto de contenido/imagen, dos menores).

## Comprobaciones técnicas (E)

- `tsc --noEmit` (typecheck): sin errores. `tsx scripts/nudito-validar-banco.ts`: «Banco válido: 2238 fichas activas; 27034 ejercicios». (`pnpm` no está en el PATH de esta terminal; se ejecutaron los binarios de `node_modules/.bin`.)
- Comparado con `git show HEAD` por clave: en las 6 claves solo cambió `claseGuiada` (`ejercicios`, ids, respuestas intactos).
- Lint mecánico `nudito-lint-clase-guiada.ts`: 1 error (`com.p2.comparar-en-el-texto`, `titulo-repetido`) y 1 aviso (`com.p1.agrupar-palabras`, `letra-suelta «por c»`): es falso positivo, sale de «solo **por c**ómo suenan» (no hay letra suelta); sin acción. Los avisos informativos `ficha-correcta-mas-larga` son de ejercicios previos (agrupar e11; como-son e05, e12; comparar e08, e09), no del lote.
- Letras de comprobación: C, A, B, C, A, B (variadas); correcta nunca la más larga; diferencias de longitud ≤ 3.
- 18 SVG rasterizados en Chrome headless y vistos: texto cabe, sin `<tspan>`, con `<title>`, coinciden con alt/descripcion. Solo queda espacio vacío bajo las tarjetas (cosmético, ya declarado).
- 12 ilustraciones Z-Image abiertas con Read: sin texto ni marcas incrustadas, manos y rostros aceptables (la lente de `pistas-lupa` deforma un poco el ojo: cosmético), animales sin deformaciones, estilo coherente salvo `silabas-casa` (ver nota). Alt ≤ 200 y descripcion ≤ 500 en todas, coherentes con la imagen.

## `com.p1.agrupar-palabras` — APROBADA

Estructura, recursos y narración correctos; primer momento sin imagen; la comprobación (tomate, cebolla, lechuga, zapato → zapato) tiene respuesta única. Notas no bloqueantes: la narración dice «dos niños tocan flautas» y la imagen `musica` muestra una niña y un niño con flauta (genérico, aceptable); la zampoña citada no aparece en la imagen (la narración dice «flautas, como la quena»: coherente).

## `com.p1.como-son-lugares-y-objetos` — CAMBIOS

1. **Imagen contradice la tarjeta** (`pistas-burro-zimage-v1.webp`, recurso `burro`, momento `ejemplo-2-razona`): la ilustración muestra al burro **bajando** la ladera (cuerpo inclinado hacia abajo a la derecha), mientras la tarjeta previa (`burro-pregunta`, momento `ejemplo-2-lee`) dice «Sube el cerro sin parar». El alumno ve ambas seguidas. alt y descripcion no mienten (dicen «camina»), pero el conjunto confunde. Corrección mínima (sin regenerar): en `como-son-burro-pregunta.svg`, en `ejemplo-2-lee` (narración, y alt/descripcion de `burro-pregunta`) cambiar «Sube el cerro sin parar» por «Camina por el cerro sin parar» (o «Anda por el cerro sin parar»). La pista «sin parar» se mantiene y la conclusión «fuerte» sigue válida. Alternativa: regenerar la imagen con el burro subiendo.
2. Menor: la niña y el hombre de la imagen no se mencionan en el texto del ejemplo (no pedidos). Aceptable; no bloquea.

Lo demás correcto: ejemplo 1 (caliente) bien razonado; comprobación (oscuro) única; contraejemplo coherente con la tarjeta.

## `com.p1.contar-silabas` — APROBADA

Todo correcto (casa = 2, zapato = 3, sapo = 2, conejo = 3 verificados). Nota: `silabas-casa-zimage-v1.webp` es estilo «pegatina» con contorno y fondo blanco liso, distinto del resto del lote (cosmético; alt y descripcion lo declaran). Los esquemas de palmadas parecen soles pequeños pero la descripcion los explica.

## `com.p2.antonimos` — APROBADA

Contenido y recursos correctos (ligero/pesado, despierto/dormido, limpio/sucio; contraejemplo perro/gato válido). `antonimos-carrera` muestra un conejo y la narración dice «conejo» (coherente). Nota: `mascotas` (ejemplo-2-razona) muestra el escenario que la narración explica justo después: aceptable por ser momento de razonamiento.

## `com.p2.comparar-en-el-texto` — CAMBIOS

1. **Lint `titulo-repetido`** en `situacion`: el título «Dos mochilas sobre una banca» aparece literal dentro de la narración («Observemos estas dos mochilas sobre una banca»). Corregir la narración, p. ej. «Observemos esta escena: una mochila roja y otra azul, juntas en una banca. Si las miramos…» (o cambiar el título a «Mochilas en la banca»).

Resto correcto (comparación tomate/zanahoria, loro/gallo, cuyes; comprobación única, correcta «los dos comen pasto»).

## `com.p3.adjetivo-y-concordancia` — CAMBIOS

1. **La descripción de la ilustración entrega la respuesta** (recurso `chacra`, momento `ejemplo-2-razona`; alt y descripcion de `concordancia-chacra`, y la propia narración): «papas amarillas y … camotes morados» son exactamente las formas que el alumno debía deducir (tarjeta `chacra-pregunta`: «amarillo» y «morado»). La narración las da antes de razonar el género y número. Corrección mínima: en la narración decir «hay dos canastas, una con papas y otra con camotes, de colores distintos» y razonar después («Papas» es femenino y plural, entonces: «amarillas»…); en alt y descripcion de `chacra` quitar los adjetivos flexionados («una con papas amarillas y otra con camotes morados» → «una con papas y otra con camotes, de distinto color»; en descripcion indicar los colores sin flexionar: «color amarillo», «color morado»).

Resto correcto: sombrero nuevo/bufanda nueva, papas amarillas/camotes morados, «ventana … abierta» único; no se usan «-o/-a» sueltos.

## Errores de ejercicios existentes reportados por el autor (G)

El orquestador decide. Todas las correcciones son mínimas y afectan solo a `enunciado`, `retroalimentacion` y pistas.

1. `com.p1.agrupar-palabras` **e07** — afecta al alumno (el enunciado da la respuesta y la retro cita «Piedra», palabra inexistente). Enunciado → «Completa el grupo «plátano, manzana, ____» con una fruta de cáscara áspera y corona de hojas verdes que empieza con «pi».» Retro → ««Piña» es una fruta, igual que el plátano y la manzana; por eso completa el grupo.» Pista 3 («La palabra indicada es piña.») → «Empieza con «pi» y tiene cuatro letras.» (respuesta y `alternativasAceptadas` no cambian).
2. `com.p1.agrupar-palabras` **e12** — igual. Enunciado → «Completa «gato, perro, ____» con un animal de los Andes que da lana y empieza con «ll».» Retro → ««Llama» es un animal, igual que el gato y el perro; por eso mantiene el grupo.» Pista 3 → «Empieza con «ll» y tiene cinco letras.»
3. `com.p1.agrupar-palabras` **e01**, pista 3 «Mango es una fruta.» entrega la respuesta → «Descarta el animal y el mueble.»
4. `com.p1.como-son-lugares-y-objetos` **e12**, opción c «La plaza era una manta.» (absurda, la descarta cualquiera) → «La plaza era angosta; la calle, amplia.» (distractor plausible, longitud pareja; la respuesta b no cambia). Afecta poco, pero quita el descarte trivial.
5. `com.p2.antonimos` **e04**, opción d «tapar poco» (rara y ambigua al oído) → «pintar» (la pista 3 ya descarta «romper» y «mirar»; no cambia la respuesta c).

## Ronda 2

Fecha: 2026-11-16. Verificado contra HEAD por JSON y con lint, `nudito-validar-banco` (2238 fichas, 27034 ejercicios, válido) y `tsc --noEmit` (0 errores). `pnpm` no está en el PATH: se usaron `node_modules/.bin`. Lint: 0 errores, 1 aviso (falso positivo «por c» en agrupar-palabras).

| Clave | Veredicto |
|---|---|
| `com.p1.como-son-lugares-y-objetos` | APROBADA |
| `com.p2.comparar-en-el-texto` | APROBADA |
| `com.p3.adjetivo-y-concordancia` | APROBADA |
| `com.p1.agrupar-palabras` | APROBADA |
| `com.p2.antonimos` | APROBADA |

- como-son: «Camina por el cerro sin parar» coherente en narración, descripción y SVG (rasterizado y visto: cabe, sin tspan, con title); la conclusión «fuerte» sigue válida. e12 opción c = «La plaza era angosta; la calle, amplia.»: distractor plausible, respuesta b única, la correcta ya no es la más larga (empata con c). Solo cambiaron `claseGuiada` y esa opción.
- comparar: `titulo-repetido` resuelto; narración coherente con la imagen (mochila roja y azul). Sin otros cambios.
- adjetivo: narración, alt y descripción de `chacra` ya no dan las formas flexionadas; coherentes con la imagen. Sin otros cambios.
- agrupar-palabras: solo e01 (pista 3), e07 y e12 (enunciado, retro, pista 3); id, dificultad, respuesta y alternativas intactos. Los enunciados no revelan la respuesta (descripción + «pi»/«ll») y tienen respuesta única.
- antonimos: solo e04 opción d «pintar»; respuesta c única; ids y respuesta intactos.
- Defectos nuevos: ninguno.
