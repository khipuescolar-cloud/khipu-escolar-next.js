# Revisión independiente · Primaria, Matemática, lote 43

Revisor: subagente Claude (Sonnet), 2026-11-16. Solo lectura sobre banco y recursos. Informe del autor: `informe-editorial-primaria-lote-43.md`.

Resumen: **APROBADAS 4** (p1, p2, p3, p6) · **CAMBIOS 2** (p4, p5; correcciones pequeñas).

## Verificaciones técnicas (E)

- `pnpm typecheck`: sin errores. `pnpm nudito:validar-banco`: «2238 fichas activas; 27034 ejercicios» (válido).
- Comparado con `HEAD` por JSON: en las seis claves el único campo distinto es `claseGuiada`. Ejercicios intactos.
- `recursoRef` = ids de recursos en las seis (todos usados, ninguno de más); 10 momentos; primer momento sin recurso; alt máx. 109, descripción máx. 267.
- 30 SVG: sin `<tspan>`; `font-size` mínimo 26; texto solo en #1E2A78, #0C706E, #8A5A00, #B5412A y blanco (sin #C98F1E). Todos rasterizados con Chrome headless (hojas de contacto en el scratchpad) y mirados uno por uno.
- Cálculos recalculados y correctos: 6−4=2; 9−4=5; 8−3=5; 4 725 (÷5, suma 18, ÷9); 3 460 (÷2, ÷10, suma 13, no ÷3); 1 253 (suma 11); 208 = 100+100+8; 306 céntimos = S/ 3,06; 810 (÷9 y ÷10; 140 y 504 no); octavo lugar de ○□□ = □; lugar doce de ○○□ = □; 9+13+6+7 = 35.

## mat.p1.cuantos-faltan-equilibrio — APROBADA

Archivo: `primaria-1/fichas/igualdades-y-equivalencias.json`. Sin defectos. Dibujos coinciden con alt y descripción (conteos de círculos verificados, incluidos 6+2 y 4+2). Opciones 4/6/5, correcta «c» no es la más larga. Pista da el método, no la respuesta.
Opcional (no bloquea): la descripción de `error` omite la frase visible «Ahora la diferencia es mayor».

## mat.p2.croquis-del-aula — APROBADA

Archivo: `primaria-2/fichas/ubicacion-y-desplazamientos.json`. Sin defectos. Cuadrículas, leyendas y casillas resaltadas coinciden con alt y descripción. «Detrás» = abajo (más lejos de la pizarra) es coherente en narración y dibujo. Opciones 26/28/26, correcta «a» no es la más larga. Ver error de e02 en la sección G.

## mat.p3.continuar-patron-repeticion — APROBADA

Archivo: `primaria-3/fichas/c24-regularidad.json`. Sin defectos. El «?» solo marca la casilla vacía (valor no falso); el lugar doce lleva «?» sin revelar la figura. Comprobación de respuesta única (□). Ver e09 en G.

## mat.p4.decisiones-encuesta — CAMBIOS

Archivo: `primaria-4/fichas/conclusiones.json`.

1. Momento `contraejemplo` y recurso `error` (SVG `encuesta-decisiones-error.svg`): los datos contradicen la encuesta recién vista. En `situacion` danza tiene siete, dibujo nueve, teatro trece y hay música; en `error` danza tiene cinco, dibujo ocho, teatro doce y no hay música. La narración dice solo «En este dibujo…» sin avisar de que es otra votación; el alumno oye que «danza tiene cinco» tras ver siete. Corrección mínima: narración «En otra votación, alguien dice que elige danza porque le gusta…» y añadir «en otra votación» a alt/descripción de `error` (el SVG ya es coherente consigo mismo); o bien redibujar con los datos de `situacion` (danza siete, la barra más corta es música con seis, así que habría que cambiar el argumento: preferible lo primero).
2. `comprobacion`, opción «a» («Pintar de verde aunque no haya pintura»): se descarta sola por llevar la contradicción en el texto; la pista («descarta el que no se puede realizar») casi entrega la respuesta. Corrección mínima: opción «a» «Pintar de verde, el más votado» y pista «Ordena los colores por votos y revisa cuál se puede usar» (mantener diferencia de longitud ≤3: «Pintar de verde, el más votado» = 30 vs 38/37, hay que alargar a ~36, p. ej. «Pintar de verde, porque tuvo más votos» = 38).

Lo demás correcto: barras y números coinciden con alt/descripción; la barra más larga de `situacion` delata la respuesta, pero es el dato mismo (aceptado como en el informe del autor).

## mat.p5.decimales-con-dinero — CAMBIOS

Archivo: `primaria-5/fichas/numeros-decimales.json`.

1. Recurso `lectura` (`decimales-dinero-lectura.svg`): en el recuadro «Después de la coma» las dos monedas (0,20 y 0,05) están corridas a la izquierda (margen izquierdo ~35 px, derecho ~85 px) y desbalanceadas frente al recuadro «Antes de la coma», cuyas monedas llenan el ancho. Corrección mínima: centrar las dos monedas en el recuadro (x centradas en 470 del lienzo de la hoja de contacto, es decir, en el centro del recuadro). Alt y descripción no cambian.
2. Opcional (audio): `paso-2` dice «cero cinco, no cinco cero»; al oído «cinco cero» puede sonar a «cincuenta». Sugerido: «Cinco céntimos son cero cinco. Si escribes cinco cero, serían cincuenta céntimos.»

Contenido correcto: 208 = 2 soles con 8 céntimos; 306 céntimos = 3,06; opciones 28/31/31 con correcta «a» la más corta; sin dígitos en narración.

## mat.p6.criterios-divisibilidad — APROBADA

Archivo: `primaria-6/fichas/divisibilidad.json`. Sin defectos. Criterios correctos y completos para 2, 3, 5, 9, 10; contraejemplo (1 253, suma 11) válido; respuesta única (810). «Divisor» en `paso-1` es vocabulario de 6.º, aceptable. SVG sin desbordes; `Última cifra` alineado bajo la casilla marcada.

## G. Errores reportados en ejercicios existentes (no editados; decide el orquestador)

1. `mat.p2.croquis-del-aula` e02: enunciado «Para qué sirve un croquis del aula?». Afecta al alumno solo en ortografía/lectura visual (sin impacto en la corrección). Corrección mínima en `enunciado`: «¿Para qué sirve un croquis del aula?». Nota: la primera pista habla de «el dibujo» y e02 no tiene imagen; cambiar a «Piensa en lo que muestra un croquis: mesas, puerta, pizarra.»
2. `mat.p6.criterios-divisibilidad` e12 (`texto_corto`, respuesta «2,3,5,9,10»): el banco convierte en normalización `literal` (`servidor.ts` línea 119) y `normalizarLiteral` ya quita espacios alrededor de comas, así que «2, 3, 5, 9, 10» **sí** se acepta. No se aceptan «2 3 5 9 10» ni «2, 3, 5, 9 y 10»; el enunciado pide «en orden con comas», por lo que no es un error del alumno sino de formato. Corrección mínima y opcional: `alternativasAceptadas: ["2 3 5 9 10", "2,3,5,9 y 10"]`. No es bloqueante.
3. `mat.p3.continuar-patron-repeticion` e09: la respuesta (4) es correcta y única; la retroalimentación «Si pusiste 6, contaste todas las cuentas que faltan» es confusa porque no dice qué error es. Corrección mínima en `retroalimentacion`: «Las 6 cuentas que faltan son blanca, roja, roja, blanca, roja, roja: 4 rojas. Si pusiste 6, contaste todas las cuentas que faltan, y la pregunta es solo por las rojas.»

## Ronda 2

- `mat.p4.decisiones-encuesta` — APROBADA. Contraejemplo y alt/descripción de `error` dicen «En otra votación…» y los datos (8/12/5) coinciden con el SVG. Comprobación: opciones 30/31/29, única correcta «c» (azul, 11 votos, es lo mejor que se puede pintar), pista da el criterio sin la respuesta. Opcional: «Esperar la pintura verde nueva» podría defenderse como realizable; no bloquea porque el enunciado dice que la tienda ya no tiene verde.
- `mat.p5.decimales-con-dinero` — APROBADA. SVG `lectura` rasterizado: monedas 0,20 y 0,05 centradas en su recuadro. `paso-2` «Cinco céntimos llevan un cero delante del cinco» claro y sin ambigüedad oral.
- Solo cambió `claseGuiada` en ambas; `pnpm nudito:validar-banco` (2238 fichas, 27034 ejercicios) y `pnpm typecheck` sin errores.
