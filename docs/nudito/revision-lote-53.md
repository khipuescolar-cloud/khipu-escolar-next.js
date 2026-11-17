# Revisión independiente — lote 53 (Matemática)

Revisor: Claude (no autor). Informe del autor: `informe-editorial-primaria-lote-53.md`.

## Verificaciones globales
- `tsx scripts/nudito-lint-clase-guiada.ts` (4 claves): 0 errores, 0 avisos; 1 aviso informativo `ficha-correcta-mas-larga` en p5 e09, e10, e12 (se cuenta como defecto, ver G).
- `pnpm` no está en el PATH del entorno; se usó `node_modules/.bin/tsc --noEmit` (sin errores) y `node_modules/.bin/tsx scripts/nudito-validar-banco.ts` (banco válido: 2238 fichas, 27034 ejercicios).
- Comparación con HEAD por JSON: en las 4 claves solo cambia `claseGuiada`. Los 4 archivos y las 20 rutas SVG existen; 20 SVG en disco = 20 recursos (sin huérfanos ni duplicados); todos tienen `<title>`, `font-size` ≥ 26, sin `<tspan>`, sin texto ámbar.
- Rasterizado headless de los 20 SVG (Chrome, copiados a ruta sin espacios) y revisados a ojo. Recalculados todos los datos y los 48 ejercicios: respuestas correctas únicas y correctas.
- Todos los `alt` ≤ 200 y `descripcion` ≤ 500.

## mat.p2.posible-imposible — CAMBIOS
Archivo: `primaria-2/fichas/posible-e-imposible.json`
1. Pedagógico: el caso «imposible» nunca se resuelve en la clase. La `situacion` (bolsa 2 rojas + 2 azules, ¿verde?) no se contesta y los dos ejemplos guiados y el contraejemplo son todos «posible». El alumno ve el imposible solo en la comprobación. Corregir: en `ejemplo-1-razona` o `paso-3` cerrar la situación («En la bolsa del inicio no hay verde: sacar una verde es imposible»), o cambiar un ejemplo a imposible.
2. Visual: `posible-imposible-bolita-pregunta.svg` (y `bolita-resuelta`): la bolita morada pisa la pared derecha de la bolsa. Moverla hacia dentro.
3. Ejercicio e01: opción correcta «Un perro habla como una persona» (31) es la más larga (distractores 17 y 29, diferencia 14). Corrección mínima: a «Hoy llueve fuerte en Iquitos» (28), b «Un perro habla como un niño» (27), c «Juego a la pelota en el patio» (29); ajustar `retroalimentacion` («un perro hable como un niño»). Menor: e05 opciones 9/8/12 (dif. 4); no afecta, se puede dejar.
Correcto: contenido, dado/bolitas, comprobación (c, longitudes 22/22/20), alt/descripcion coinciden con los dibujos.

## mat.p4.elemento-siguiente-patron — CAMBIOS
Archivo: `primaria-4/fichas/patrones.json`
1. Vocabulario inconsistente: `banderines-resuelto.svg` rotula «núcleo» y su título dice «Tres núcleos…», pero la narración dice «grupo» y nunca presenta «núcleo». Cambiar el SVG (y alt/descripcion) a «grupo».
2. `contraejemplo` / `error-regla.svg`: el SVG dice «Se duplica en cada paso» (regla multiplicativa) que no se narra ni se trabaja en la clase. Narrarlo en una frase («en realidad cada número se duplica») o quitar esa línea del SVG y su mención en `descripcion`.
3. `error-regla.svg`: la equis roja atraviesa «Siempre sumo tres» y dificulta leerlo; poner la equis a un costado del texto (igual en media-reparto-error-moda, ver p6).
4. Menor: «maíz» e «índigo» como nombres de color son poco naturales para 4.º y la voz; preferir «amarillo» y «azul» en narración, alt y descripcion de los banderines.
Correcto: banderines 10 (M T I M T I M T I M) → posición 11 turquesa; 6, 10, 14 → 18; comprobación collar posición 7 = roja (A); ejercicios e01–e12 recalculados (e09 = 13, e11 = 53, e12 = 192).

## mat.p5.justificar-resolucion — CAMBIOS
Archivo: `primaria-5/fichas/justificacion-de-procesos.json`
1. Visual: `justificar-resolucion-combis-resuelto.svg`: la equis roja se solapa con la «s» de «4 combis». Desplazar la equis fuera del texto.
2. Menor: la `situacion` (9 × 16 = 144) y el ejemplo 1 (6 × 24 = 144) dan el mismo total 144 y la situación nunca se resuelve; puede confundir al oído en el contraejemplo («ciento cuarenta y cuatro»). Cambiar la situación a otros números (p. ej. nueve bolsas de quince = 135) o dejarlo anotado.
3. Menor: `combis-pregunta.svg` muestra solo dos combis para 138 estudiantes; ya figura «de muestra» en alt, pero se lee como pista engañosa. Opcional: tres combis o rótulo «ejemplo».
4. Ejercicios e09, e10 y e12: la opción correcta es la más larga por mucho (e09: 91 caracteres frente a 36–59; e10: 91 frente a 43–50; e12: 117 frente a 66–81). Afecta al alumno (acierta por longitud). Corrección mínima (solo `opciones.texto`, alargar distractores y acortar la correcta, ±3 caracteres):
   - e09: a «62 × 24 = 1488, sobran 12 latas: hace falta la caja 63» · b «1500 ÷ 24 da 62 exacto, por eso no sobra ninguna lata» · c «63 × 24 = 1500, por lo tanto alcanzan justo las cajas» · d «60 × 24 supera a 1500, por eso con 60 cajas alcanza».
   - e10: d «Beatriz: «Mitad: 210; luego 210 - 80 = 130 sacos quedan»» y alargar a/b/c a ~52–55 caracteres.
   - e12: c «Camilo ganó: gana quien demora menos y 14,2 es el menor» con a «Beto ganó porque en velocidad gana quien tiene más tiempo», b «Hubo empate general porque todos tienen dos cifras enteras», d igual.
Correcto: 138 ÷ 32 = 4 resto 10, 5 combis; contenidos y los 12 ejercicios recalculados (e09, e10, e11 = 52, e12 correctos); comprobación b (27/30/30).

## mat.p6.media-reparto-equitativo — CAMBIOS
Archivo: `primaria-6/fichas/moda-y-media.json`
1. `media-reparto-error-moda.svg`: los datos se escriben «4 · 4 · 10» con punto medio, que se lee como multiplicación. Usar comas («4, 4, 10»). La equis atraviesa «La media es 4» (igual que p4 punto 3): ponerla a un costado.
2. `contraejemplo`: introduce «moda» sin definirla («ese valor es la moda»). Añadir «la moda es el dato que más se repite» o evitar el término y su mención en el SVG (título «Moda y media no son lo mismo»).
3. `media-reparto-ventas-resuelto.svg`: barra amarilla suelta bajo el recuadro final, sin significado ni mención en descripcion. Quitarla.
4. Menor: `media-reparto-ventas-pregunta.svg`: rótulos «Día uno…Día cuatro» escalonados en dos alturas; alinearlos en una línea (reducir a «Día 1» no, para mantener 26 px legibles).
Correcto: 18 ÷ 3 = 6, 48 ÷ 4 = 12, comprobación 36 ÷ 4 = 9 (c; 20/20/19); ejercicios e01–e12 recalculados sin errores.

## Resumen
Aprobadas: ninguna. Con cambios: las 4 (ninguna con error matemático; defectos de pedagogía, SVG y opciones).

## Ronda 2
Verificado: lint de las 4 claves 0 errores/0 avisos (desaparece `ficha-correcta-mas-larga`); `nudito-validar-banco` válido (2238 fichas, 27034 ejercicios); `tsc --noEmit` sin errores. Diff vs HEAD por JSON: solo `claseGuiada` + las ediciones autorizadas (p2 e01 opciones a/b, pista y retroalimentación; p5 e09/e10/e12 solo `opciones.texto`); id, dificultad y respuesta intactos. Las diferencias de `claseGuiada` en p4 /0 y /2 son de otras claves del mismo archivo (fuera de alcance). SVG cambiados rasterizados con Chrome headless y revisados: sin solapes ni textos cortados.
- mat.p2.posible-imposible — APROBADA. `ejemplo-1-razona` cierra la bolsa (imposible); bolitas dentro de la bolsa; e01 opciones 28/27/29, respuesta única. e05 (dif. 4) no bloquea.
- mat.p4.elemento-siguiente-patron — APROBADA. «grupo» en SVG/alt/descripcion, «amarillo/azul», contraejemplo narra la duplicación, equis a un costado.
- mat.p5.justificar-resolucion — APROBADA. Equis fuera del texto; e09/e10/e12 con longitudes 51–59 y única correcta (a/d/c). Menores no bloquean: 144 repetido en situación, `combis-pregunta` con 2 combis (ya dice «de muestra»).
- mat.p6.media-reparto-equitativo — APROBADA. Datos con comas, equis debajo, «moda» definida, barra suelta eliminada, rótulos de día alineados.
