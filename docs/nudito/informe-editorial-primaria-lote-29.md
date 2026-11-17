# Informe editorial · Primaria, Matemática, lote 29

Fecha: 2026-11-16. Autor: subagente Claude (Sonnet). Estado: **escrito y validado técnicamente; pendiente de revisión independiente**. No se tocaron estado, huellas, BD, specs ni componentes. Solo cambió el campo `claseGuiada` de cada clave (comparado con `HEAD`, `claseGuiada` es el único campo distinto en las seis); ejercicios, ids, respuestas y dificultad quedan intactos.

## Alcance

Archivos bajo `src/lib/nudito/conocimiento/banco/matematica/`. Todas con 10 momentos (el primero sin recurso) y 5 recursos enlazados por `recursoRef`. SVG en `public/nudito/diagramas/matematica/`, nombre `<prefijo>-<id>.svg`.

| Clave | Archivo | Recursos (prefijo) |
|---|---|---|
| `mat.p1.caras-y-vertices` | `primaria-1/fichas/formas-del-entorno.json` | `cubo-pregunta`, `cubo-caras`, `lata-pregunta`, `lata-caras`, `errores` (`caras-y-vertices`) |
| `mat.p2.comparar-datos` | `primaria-2/fichas/graficos-y-pictogramas.json` | `mascotas-pregunta`, `mascotas-resta`, `bus-pregunta`, `bus-resta`, `errores` (`comparar-datos`) |
| `mat.p3.centena-como-unidad` | `primaria-3/fichas/c23-numeracion-fracciones-dinero.json` | `decenas-pregunta`, `centena-cuadro`, `resto-pregunta`, `resto-resultado`, `errores` (`centena-como-unidad`) |
| `mat.p4.completar-la-unidad` | `primaria-4/fichas/c23-fracciones.json` | `tira-pregunta`, `tira-falta`, `pizza-pregunta`, `pizza-falta`, `errores` (`completar-la-unidad`) |
| `mat.p5.comparar-posibilidades` | `primaria-5/fichas/azar.json` | `caja-pregunta`, `caja-conteo`, `bolsas-pregunta`, `bolsas-fracciones`, `errores` (`comparar-posibilidades`) |
| `mat.p6.comparar-capacidad` | `primaria-6/fichas/cuerpos-geometricos-y-volumen.json` | `bidon-pregunta`, `bidon-convertido`, `botellas-pregunta`, `botellas-convertido`, `errores` (`comparar-capacidad`) |

Momentos: idea, situacion, ejemplo-1-guiado, ejemplo-1-razona, ejemplo-2-guiado, ejemplo-2-razona, contraejemplo, paso-1, paso-2, paso-3. Todos menos `idea` llevan recurso; los pasos reutilizan recursos de los ejemplos.

30 SVG nuevos, 640×480, texto mínimo 26 px, paleta de specs/18 (rojo `#B5412A` solo en errores, texto ámbar no usado), sin `<tspan>`, con `<title>`, sin elementos pegados al borde. Se generaron con un script Python (código a mano, sin generador de imágenes), se rasterizaron con Chrome headless en hojas de contacto y se vieron antes de escribir `alt` y `descripcion`. Se corrigieron en el proceso: marca de verificación pegada a un punto de rincón (p1 errores), texto «perros: tres más» que invadía una columna y número demasiado cerca del título (p2).

## Decisiones pedagógicas

- Recursos de situación y de ejemplo guiado en variante «pregunta»: muestran los datos, nunca el resultado (la resta, la fracción que falta, la conversión, el nombre «centena», el signo de comparación). Los marcadores «?» no fijan valor.
- p1 (1.º): cubo y lata; seis caras con las tres ocultas en cuadros punteados; lata con dos caras, costado curvo y cero puntas. Contraejemplo: contar solo las caras visibles y confundir puntas con caras. Frases cortas. Comprobación: un dado y una pelota, puntas entre los dos (ocho), opción c.
- p2 (2.º): columnas de bloques (siete perros, cuatro gatos, tres más) y pictograma (doce y siete niños, cinco menos). Contraejemplo con nueve manzanas y cinco peras: sumar frente a restar; restar al revés solo por voz. Comprobación: catorce panes y ocho bizcochos (seis), opción a.
- p3 (3.º): barras de diez cuadritos y cuadrado de cien; ejemplo 2 con dieciséis cajas (una centena y seis decenas). Contraejemplo: diez unidades sueltas frente a diez decenas. Comprobación: «¿Qué cantidad forma exactamente una centena?» (diez decenas), opción b.
- p4 (4.º): tira de diez partes (seis décimos) y pizza de seis porciones (cinco sextos). Contraejemplo: cambiar el denominador (tres tercios frente a tres quintos). Comprobación: cinta de nueve partes con cuatro usadas (cinco novenos), opción c.
- p5 (5.º): caja de fichas con el mismo total (seis amarillas contra cuatro turquesas) y dos bolsas con totales distintos (cuatro quintos frente a seis décimos, gana Ana aunque Raúl tenga más rojas). Contraejemplo con Eva e Ivo (tres cuartos contra cinco décimos). Nombres propios en vez de letras. Comprobación: Luna (tres de doce) y Beto (dos de seis): un tercio supera a un cuarto, opción a.
- p6 (6.º): botellas del mismo tamaño para no delatar la escala; dos litros contra mil ochocientos mililitros (doscientos mililitros más) y cero coma nueve litros contra ochocientos cincuenta mililitros. Contraejemplo: comparar quinientos y dos sueltos. Comprobación: uno coma tres litros contra mil doscientos cincuenta mililitros (la jarra), opción b.
- Letras correctas: c, a, b, c, a, b. Opciones de longitud pareja (diferencia máxima 3 caracteres) y la correcta nunca es la más larga. Pistas orientan sin dar operación ni respuesta.
- Voz: números, fracciones y decimales en palabras en narración, opciones, pregunta, mensaje, pista, `alt` y `descripcion`; sin «parte N de M»; «dibujo/imagen» solo en momentos con recurso; sin títulos repetidos en la narración.

## Verificaciones

- Cuentas recalculadas: seis caras y ocho puntas; 7 − 4 = 3; 12 − 7 = 5; 9 − 5 = 4; 10 × 10 = 100, 16 − 10 = 6; 10 − 4 = 6, 6 − 1 = 5; 6 contra 4; 4/5 = 8/10 > 6/10; 3/4 > 5/10; 3/12 = 1/4 < 2/6 = 1/3; 2 L = 2000 mL > 1800 mL; 0,9 L = 900 mL > 850 mL; 1,3 L = 1300 mL > 1250 mL; 14 − 8 = 6.
- Script de lote: `recursoRef` ↔ recursos exactos (todos usados y solo ellos), 10 momentos, primer momento sin recurso, sin dígitos en narración, `alt` ≤ 200 (máx. 171) y `descripcion` ≤ 500 (máx. 397), longitudes de opciones, sin títulos repetidos.
- Ejercicios existentes de las seis claves revisados (respuestas recalculadas): **sin errores de contenido**. Observaciones no bloqueantes, sin editar:
  - `mat.p2.comparar-datos` e05, e06, e07 dependen de un gráfico de árboles y una tabla de talleres que el enunciado no muestra; solo se resuelven si la interfaz los presenta (e06 es coherente con molle 7, tara 3, quinual 5).
  - `mat.p2.comparar-datos` e11: la opción correcta es la más larga (hay otras tres opciones breves).
  - `mat.p4.completar-la-unidad` e05, e08, e11: aceptan solo la fracción sin simplificar (2/6, 3/12, 6/15); una equivalente simplificada se marcaría mal.
  - `mat.p5.comparar-posibilidades` e11 (dos dados, suma siete frente a diez) es exigente para 5.º; e08 pregunta «fracción o porcentaje» sin que el porcentaje se trabaje en la ficha.
  - `mat.p6.comparar-capacidad`: el tema litro y mililitro es más habitual en 3.º–4.º; los ejercicios con decimales sí encajan en 6.º.
- `pnpm nudito:validar-banco`: banco válido (2 238 fichas, 27 034 ejercicios). `pnpm typecheck`: sin errores. `git diff --check` sobre los seis JSON: limpio.

## Riesgos y pendientes

- Sin revisión independiente ni recorrido en navegador (audio, móvil, movimiento reducido); los SVG se vieron solo en hojas de contacto.
- Los SVG llevan cifras y símbolos (`10 − 4 = 6`, `4/5`); narración y descripciones los dicen en palabras.
- p1: el cubo es liso y la narración lo llama «como un dado»; el nombre «dado» no aparece en el dibujo. El rincón oculto del cubo es un círculo punteado (descrito).
- p4: la fracción «tres tercios» del contraejemplo es un error ficticio escrito a propósito.
- p5: contraejemplo y ejemplo 2 usan el mismo patrón (fracciones con totales distintos) con números distintos; la comprobación es el tercero con otros números.
- p6: las botellas se dibujan iguales a propósito; la capacidad real solo la dicen los rótulos.
- No se actualizaron `estado-refuerzo-primaria.json`, specs ni bitácora (fuera del encargo).

## Correcciones tras la revisión independiente (`revision-lote-29.md`)

`mat.p3.centena-como-unidad` y `mat.p6.comparar-capacidad`: sin cambios (aprobadas).

- `mat.p1.caras-y-vertices`: `contraejemplo` dice «dos casos»; el título del SVG `errores` pasa a «Dos casos». `paso-3` usa ahora el recurso `errores` y cuenta las ocho puntas del cubo (siete se ven, una queda atrás) antes de la lata (cero); `lata-caras` sigue en el ejemplo 2. Ejercicio e10: opciones de longitud pareja (23, 25, 24 caracteres; la correcta ya no es la más larga).
- `mat.p5.comparar-posibilidades`: `ejemplo-2-razona` explica «multiplicamos arriba y abajo por dos»; `contraejemplo` justifica con «cinco décimos es la mitad, y tres cuartos es más que la mitad» y se quita la idea del juego corto; en `bolsas-fracciones.svg` las fracciones pasan a azul marino y la descripción ya no dice «en rojo». Ejercicio e09: opciones «Es mayor en la urna 1», «Es mayor en la urna 2», «Es igual en las dos», «No se pueden comparar» (19–21 caracteres; la correcta, c, no es la más larga).
- `mat.p2.comparar-datos` (ejercicios, autorizado): e01, e05 y e06 reemplazan el gráfico ASCII de `lectura` por «Árboles que plantaron los niños: Tara 3, Molle 7, Quinual 5» (datos tomados del gráfico; respuestas 4, 2 y c intactas). e07 usa la tabla de talleres, que ya era texto simple, y no cambia. e11: opciones «Contó el nueve de más.», «Restó mal al llevar.», «Se confundió de ciudad.», «Sumó en vez de restar.» (20–23 caracteres), sin «Iquitos»; la correcta sigue siendo d.
- `mat.p4.completar-la-unidad` (ejercicios, autorizado): `alternativasAceptadas` añade 1/3 (e05), 1/4 (e08) y 2/5 (e11), y la retroalimentación de los tres menciona la equivalencia.
- Ids, dificultades y respuestas correctas no cambian (comparado con `HEAD`). Estas ediciones invalidan las huellas: p1, p2, p4 y p5 requieren nueva revisión antes de renovar huellas.
- Revalidado: `pnpm nudito:validar-banco` válido (2 238 fichas, 27 034 ejercicios), `pnpm typecheck` sin errores, `git diff --check` limpio.
