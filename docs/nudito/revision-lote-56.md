# Revisión independiente · Primaria, Matemática, lote 56

Fecha: 2026-11-16. Revisor independiente (no escribió el lote). Solo lectura sobre banco y recursos.

| Clave | Veredicto |
|---|---|
| `mat.p4.fraccion-todo-continuo` | **APROBADA** (con 2 notas menores opcionales) |
| `mat.p5.patrones-graficos-5` | **CAMBIOS** (2 defectos) |
| `mat.p6.potencia-cuadrada` | **CAMBIOS** (2 defectos) |

## Comprobaciones técnicas (E)
- `tsx scripts/nudito-lint-clase-guiada.ts` sobre las 3 claves: 0 errores, 0 avisos. Letras correctas: C, B, A.
- `tsc --noEmit`: limpio. `nudito-validar-banco`: «Banco válido: 2238 fichas activas; 27034 ejercicios». (`pnpm` no está en el PATH de esta sesión; se usaron `tsc` y `tsx` de `node_modules/.bin`.)
- Comparación con HEAD por JSON (archivos `c23-fracciones-comprension.json`, `patrones.json`, `potenciacion.json`): en todas las fichas solo difiere `claseGuiada`; ejercicios, ids y respuestas intactos.
- SVG: 15 archivos con los prefijos del lote, los 15 referenciados por `recursoRef`/`src`, sin huérfanos ni duplicados (md5 distintos), todos con `<title>`, todos viewBox 640×480. `alt` ≤ 200 y `descripcion` ≤ 500 en todos.

## Revisión visual (D)
Los 15 SVG se rasterizaron en Chrome headless y se vieron. Texto mínimo 26 px, sin `<tspan>`, sin desbordes ni solapes. Márgenes laterales ≥ 20 px. El ámbar de texto es `#8A5A00` (correcto; no hay `#C98F1E`). Cada dibujo coincide con su alt y descripcion (conteos, colores, totales y rótulos verificados uno a uno).

## mat.p4.fraccion-todo-continuo — APROBADA
Archivo: `primaria-4/fichas/c23-fracciones-comprension.json`.
- Contenido verificado: 3/8 (cinta de ocho, tres pintadas), 2/4 (regleta de 12 cm con marcas cada 3 cm), 2/6 frente a 6/2; comprobación 3/5, única correcta (c). Opciones de 13/12/12 caracteres. Orden idea → situación → 2 ejemplos → contraejemplo → 3 pasos → comprobación. Primer momento sin imagen y sin «parte N de M».
- Los `recursoRef` corresponden a lo narrado.
- Notas menores (no bloquean, el orquestador decide):
  1. `cinta-pregunta` y `regleta-pregunta` (alt y descripcion) dan los conteos (8 partes/3 pintadas; 4 tramos/2 coloreados) que los guiados piden contar. Es inevitable para quien no ve y no entrega la fracción; se deja.
  2. `contraejemplo` y `errores`: «seis medios» (6/2) es una fracción impropia no trabajada en la clase. Funciona como «fracción al revés», pero conviene decir «el seis arriba y el dos abajo, al revés» si se toca el texto.

## mat.p5.patrones-graficos-5 — CAMBIOS
Archivo: `primaria-5/fichas/patrones.json`.
Verificado: 1, 3, 6, 10 (+2, +3, +4); 4, 9, 15, 22 (+5, +6, +7); 2+3+4 = 9; comprobación 6, 9, 13 → +5 → 18 (b), única correcta; opciones 9/10/10.
1. **`contraejemplo` (narración) y `errores.svg` (panel inferior, rótulo «Los aumentos no son siempre iguales»; alt y descripcion):** la segunda mitad no muestra ningún error. La secuencia 2 → 5 → 9 (+3, +4) es del mismo tipo que se enseñó, sin «mal/bien», y la frase «los aumentos no siempre son iguales» no dice qué se hace mal. Corregir: nombrar el error real, p. ej. «No repitas siempre el mismo aumento: de dos a cinco son tres más y de cinco a nueve son cuatro más, así que el aumento cambia». Ajustar el panel (marcar «mal: sumar siempre 3» y «bien: sumar 3 y luego 4») y regenerar alt/descripcion en consecuencia.
2. **`fichas-pregunta` (alt):** «filas de cuatro, cuatro y cinco, y cuatro, cinco y seis fichas» es una lista de números ambigua al oído. Cambiar a «la primera con una fila de cuatro; la segunda con filas de cuatro y cinco; la tercera con filas de cuatro, cinco y seis».
- Menor (opcional): la comprobación dice «etapa» y la clase «figura»; unificar vocabulario.

## mat.p6.potencia-cuadrada — CAMBIOS
Archivo: `primaria-6/fichas/potenciacion.json`.
Verificado: 8² = 64, 20² = 400 m², 6² = 36 frente a 6×2 = 12, 11² = 121 cm²; comprobación única correcta (a «Once por once»); opciones 13/12/13.
1. **`idea` (narración):** «su área tiene esa cantidad de unidades cuadradas» es imprecisa: se lee como «el mismo número que el lado» (lado 8 → área 8). Corregir: «su área es el lado al cuadrado, medida en unidades cuadradas».
2. **`mosaico-pregunta` (alt):** «Piso cuadrado de ocho por ocho baldosas» entrega la operación (8 × 8) que el ejemplo 1 pide decidir. Cambiar a «ocho baldosas por lado» (la descripcion ya dice «ocho filas y ocho columnas»; igual conviene «ocho baldosas en cada lado»).
- Menor (opcional): la pista de la comprobación («los dos lados del cuadrado miden lo mismo») casi entrega «once por once»; sustituir por «Piensa en cuántas baldosas de un centímetro caben en cada fila y cuántas filas hay».

## G) Ejercicios existentes
- p4 `e09`: la retroalimentación dice «equivale a la mitad», concepto de equivalencia que la clase no trabaja y que además invita a escribir 1/2, que la respuesta no acepta (solo `3/6` y «tres sextos»). Corrección mínima: quitar «; equivale a la mitad, pero aquí contamos seis tramos».
- p4 `e10`: la retroalimentación menciona «20/30 es equivalente», también sin trabajar. Corrección mínima: «Queda marcada 4/6 de la regleta: cuatro de seis tramos». Sin efecto en la respuesta.
- El autor recalculó los 36 ejercicios y no reportó otro error; no se contradijo nada en las tres claves.

## Vocabulario oral (F)
Sin dígitos ni letras sueltas en narraciones; fracciones en palabras (tres octavos, dos cuartos, tres quintos, dos sextos). Las opciones de comprobación se leen bien. Sin defectos salvo el alt de `fichas-pregunta` (p5, defecto 2).

## Ronda 2 (2026-11-16, revisor independiente)

Verificado: lint 0 errores / 0 avisos; `validar-banco` válido; `tsc` limpio; vs HEAD solo cambió `claseGuiada` (ejercicios intactos). `errores.svg` de p5 rerasterizado y visto: paneles «mal: sumar siempre 3 / bien: sumar 3 y luego 4» claros, sin solapes; alt/descripcion coinciden. 15 SVG del lote todos referenciados.

- `mat.p4.fraccion-todo-continuo` — **APROBADA** (ya aprobada en ronda 1).
- `mat.p5.patrones-graficos-5` — **APROBADA**. Nota menor opcional: la comprobación aún dice «cuarta etapa» (el informe dice que se unificó a «figura»).
- `mat.p6.potencia-cuadrada` — **APROBADA** (`idea` precisa, alt sin «ocho por ocho», pista sin regalar la operación).
