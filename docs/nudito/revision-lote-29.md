# Revisión independiente · Primaria, Matemática, lote 29

Fecha: 2026-11-16. Revisor: subagente Claude (Sonnet), no autor. Solo lectura sobre banco y recursos.

## Resumen

| Clave | Veredicto |
|---|---|
| mat.p1.caras-y-vertices | CAMBIOS (menores) |
| mat.p2.comparar-datos | APROBADA |
| mat.p3.centena-como-unidad | APROBADA |
| mat.p4.completar-la-unidad | APROBADA |
| mat.p5.comparar-posibilidades | CAMBIOS |
| mat.p6.comparar-capacidad | APROBADA |

## Verificaciones técnicas (E)

- `pnpm typecheck`: sin errores. `pnpm nudito:validar-banco`: «Banco válido: 2238 fichas activas; 27034 ejercicios».
- Comparado con `HEAD` por JSON: en las seis fichas el único campo distinto es `claseGuiada`. Ejercicios intactos.
- Script propio: `recursoRef` == recursos (exactos), alt <= 200, descripcion <= 500, sin dígitos en narración, sin «parte N de M». Las palabras «dibujo/imagen/gráfico» aparecen solo en momentos con recurso (p2 situacion, p3 paso-1, p6 situacion: todos llevan recurso).
- 30 SVG rasterizados en headless y vistos: todo texto >= 26 px, 0 `<tspan>`, sin ámbar claro, sin desbordes ni solapes. Contadores verificados contra alt/descripcion (siete perros/cuatro gatos, doce/siete círculos, nueve/cinco, cuatro/seis de diez, pizza 5/6, 6 amarillas/4 turquesas, Ana 4 rojas+1 azul, Raúl 6+4, Eva 3+1, Ivo 5+5, 7 puntos + 1 círculo punteado en el cubo, `>` abierto hacia la izquierda en las botellas).
- Cuentas recalculadas: todas correctas. Respuesta única en cada comprobación; letras c, a, b, c, a, b; longitudes de opciones con diferencia <= 3 y la correcta nunca es la más larga.

## mat.p1.caras-y-vertices · CAMBIOS (menores)

1. `contraejemplo` (narración) y `errores.svg` (título «Dos errores»): el panel derecho (cubo con puntos en los rincones y palomita) es un caso correcto sobre puntas, no un error. Narración dice «Mira estos dos errores» y el SVG se titula «Dos errores». Corrección mínima: narración «Mira estos dos casos» y título del SVG «Cuidado con el cubo» (o «Dos casos»); el resto del texto ya distingue la equis de la palomita.
2. Hueco didáctico: ningún ejemplo ni paso cuenta las ocho puntas del cubo con dibujo; la comprobación (dado = 8 puntas) depende solo de la frase de `idea` y del panel derecho de `errores`. `paso-3` reutiliza `lata-caras` (puntas: cero). Corrección mínima: `paso-3` con `recursoRef: "errores"` y narrar «En el cubo, los puntos marcan ocho puntas: siete se ven y una queda atrás. En la lata no hay ninguna, y por eso escribimos cero». (Alternativa: dejarlo y aceptar el hueco.)
3. Leve: `errores` alt dice «una palomita» sin decir a qué lado de la línea; coincide con el dibujo, solo informativo. No hay que corregir.

Resto: primer momento sin imagen, orden idea, situación, dos ejemplos, contraejemplo, pasos correcto; vocabulario oral limpio; alt/descripcion coinciden con el dibujo; las imágenes «pregunta» no revelan 6 ni 8.

## mat.p2.comparar-datos · APROBADA

Observaciones menores sin bloquear:
- `errores.svg`: la palabra «manzanas» del panel izquierdo queda a unos 17 px del borde (en 640x480). Aceptable; si se quiere margen, mover 8 px a la derecha.
- `mascotas-resta.svg`: «7 − 4 = 3» queda a unos 13 px de la columna de gatos; sin solape.

### G. Ejercicios reportados por el autor

- e05, e06, e07: el autor temía que el gráfico/tabla no se mostrara. Verificado: cada ejercicio trae el campo `lectura`, que `TarjetaEjercicio.tsx` pinta en un recuadro («Texto de lectura») y lee en voz («Escucha primero este texto…»). Es decir, SÍ se muestra y e06/e07 son resolubles. Sí afecta al alumno otro detalle: el recuadro usa `whitespace-pre-line`, que colapsa los espacios, así que el gráfico ASCII de árboles (e01, e05, e06) se desalinea, y la voz leerá «██» sin sentido. Corrección mínima (orquestador decide): reemplazar el `lectura` de árboles por «Árboles plantados por los niños: Tara 3, Molle 7, Quinual 5». La tabla de talleres (e02, e07, e10) es texto simple y no tiene problema.
- e11: la correcta (d) es la más larga (45 caracteres frente a 15–33), incluye el cálculo «14 − 9, que da 5» y la opción c nombra a «Iquitos», que no está en el enunciado. Afecta al alumno (acierta por longitud). Corrección mínima: opciones a «Contó el nueve de más.», b «Restó mal al llevar.», c «Comparó mal con otra ciudad.», d «Sumó en vez de restar.» (todas de 20–24 caracteres; la retroalimentación ya trae las cuentas).

## mat.p3.centena-como-unidad · APROBADA

Sin defectos. Imágenes «pregunta» (diez barras, «10 decenas = ?», «16 decenas = ?») no revelan «centena» ni «ciento sesenta». Contraejemplo (diez unidades sueltas frente a diez decenas) correcto y con conceptos ya trabajados. Cifras y símbolos del SVG no obligan a la voz: la narración usa palabras.

## mat.p4.completar-la-unidad · APROBADA

- Contenido y pasos correctos; denominador constante bien explicado; contraejemplo («tres tercios», fracción ya usada) coherente con el dibujo.
- `errores.svg` lo declara el autor como error ficticio; el texto de la narración lo presenta como lo que «alguien escribió», aceptable.

### G. Ejercicios reportados por el autor

- e05, e08, e11 aceptan solo la fracción sin simplificar (2/6, 3/12, 6/15). Son `texto_corto` con comparación literal, así que 1/3, 1/4 o 2/5 se marcarían mal siendo matemáticamente correctas. Afecta al alumno que simplifica. Corrección mínima: agregar a `alternativasAceptadas` «1/3» (e05), «1/4» (e08), «2/5» (e11); en e08 ajustar la retroalimentación («también equivale a 1/4, pero aquí contamos…») para que no contradiga. Alternativa más barata: añadir «sin simplificar» a esos tres enunciados.

## mat.p5.comparar-posibilidades · CAMBIOS

1. `ejemplo-2-razona` (narración): «escribimos cuatro quintos como ocho décimos» sin decir cómo. Es el paso clave del grado y la comprobación exige el mismo tipo de paso. Corrección mínima: «…cuatro quintos como ocho décimos, porque multiplicamos arriba y abajo por dos».
2. `contraejemplo` (narración): «tres cuartos es mayor que cinco décimos» se afirma sin justificar; el alumno no tiene cómo comprobarlo con lo enseñado (no hay denominador común directo: 3/4 = 15/20). Además se añade una segunda idea («ventaja pequeña en juego corto») que no se trabaja ni se dibuja y alarga el audio a siete oraciones. Corrección mínima: justificar con la mitad («cinco décimos es la mitad, y tres cuartos es más que la mitad») y quitar la última oración, o mover esa idea fuera de la ficha.
3. `bolsas-fracciones.svg`: «4/5» y «6/10» van en rojo (#B5412A), color que la propia ficha reserva para errores (equis y texto de error). Aquí el rojo es el de las bolitas, pero con la equis roja de `errores` el alumno puede leerlo como incorrecto. Corrección mínima: texto de esas dos fracciones en azul marino (#1F2A7A, como el resto de rótulos) y ajustar `descripcion` («…seis décimos, en rojo» → sin «en rojo»).
4. Leve: la comprobación (3/12 contra 2/6) necesita simplificar o usar denominador 12; el ejemplo 2 enseña denominador 10. Es resoluble (2/6 = 4/12) y la `pista` orienta; no obliga a cambio, pero conviene que el mensaje correcto conserve «un tercio es mayor que un cuarto».

### G. Ejercicios reportados por el autor

- e11 (dos dados, 7 contra 10): exigente para 5.º, pero las pistas enumeran los casos (6 y 3), por lo que es resoluble; dificultad 3. No requiere cambio. Si se prefiere, bajarlo a un solo dado.
- e08 («fracción o porcentaje»): la respuesta es literal («4/10 es una fracción») y no exige calcular porcentajes. No afecta al alumno; solo introduce una palabra no trabajada. Corrección mínima opcional: «fracción o suma».
- Extra no reportado: e09 tiene la opción correcta (c) mucho más larga («En ambas urnas la posibilidad es exactamente la misma», 53 caracteres) que las demás (12–14, y 51 la d); delata por longitud. Si se corrige, acortar c a «Es la misma» y d a «No se pueden comparar».

## mat.p6.comparar-capacidad · APROBADA

- Botellas del mismo tamaño, rótulos con la medida; flecha `>` abierta hacia la izquierda coincide con la descripción. Cuentas correctas (2 L = 2000 mL > 1800 mL; 0,9 L = 900 mL > 850 mL; 1,3 L = 1300 mL > 1250 mL).
- Observación menor: `paso-3` termina con «comprueba si el resultado concuerda con recipientes que conoces»; es vago y sin apoyo en el dibujo, pero no confunde.
- Voz: «cero coma nueve», «uno coma tres» se leen bien.

### G. Ejercicios reportados por el autor

- Tema más de 3.º–4.º que de 6.º: los ejercicios con decimales (e05, e12) y los de varios pasos (e10, e11) sí encajan. No requiere cambio.

## Notas sobre ejercicios no reportados (fuera del encargo, para el orquestador)

- mat.p1.caras-y-vertices e10: la opción correcta (c) es la más larga (34 caracteres frente a 24 y 19). Acortar a «Confundió caras con puntas» y rebalancear a/b.

## Ronda 2

Fecha: 2026-11-16. Revisor independiente (Sonnet). Solo lectura.

| Clave | Veredicto |
|---|---|
| mat.p1.caras-y-vertices | APROBADA |
| mat.p2.comparar-datos | APROBADA |
| mat.p4.completar-la-unidad | APROBADA |
| mat.p5.comparar-posibilidades | APROBADA |

- Diff contra `HEAD` por JSON (sin `claseGuiada`): solo cambian los campos autorizados; ids, dificultades y respuestas correctas intactos. `pnpm nudito:validar-banco` válido (2238 fichas, 27034 ejercicios); `pnpm typecheck` sin errores.
- p1: narración «dos casos», SVG titulado «Dos casos», `paso-3` con recurso `errores` y las ocho puntas (siete se ven, una atrás) coincide con alt/descripcion y con el dibujo rasterizado. e10: 23/25/24 caracteres, correcta c (24) no es la más larga.
- p2: `lectura` de e01, e05, e06 con Tara 3, Molle 7, Quinual 5 = alturas del gráfico original; respuestas 4, 2 y c siguen valiendo (7−3, 7−5, Tara y Molle). e11: opciones de 20 a 23 caracteres, sin «Iquitos», correcta d única (22).
- p4: 1/3 equivale a 2/6, 1/4 a 3/12, 2/5 a 6/15; ninguna acepta una respuesta incorrecta (4/6, 9/12, 9/15 no están). Retroalimentación coherente.
- p5: narración justifica 4/5 = 8/10 y la mitad; `bolsas-fracciones.svg` rasterizado: fracciones en azul marino, sin «en rojo» en la descripción, alt/descripcion coinciden. e09: 19–21 caracteres, correcta c (19) no es la más larga, 3/5 = 3/5 correcto.
- Sin defectos nuevos.
