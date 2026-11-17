# Revisión independiente · Primaria, Matemática, lote 52

Fecha: 2026-11-16. Revisor independiente (no autor). Autor del lote: Codex.

## Verificación mecánica y técnica

- `tsx scripts/nudito-lint-clase-guiada.ts` (4 claves): **0 errores, 0 avisos** de `claseGuiada`; 2 observaciones preexistentes (`ficha-correcta-mas-larga`: p4 `e03`, p5 `e11`). Letras correctas de la comprobación: B, B, A, C (sin repetición consecutiva problemática).
- `tsc --noEmit`: correcto. `tsx scripts/nudito-validar-banco.ts`: «Banco válido: 2238 fichas activas; 27034 ejercicios».
- Comparado con `HEAD` por JSON: en las 4 claves solo cambió `claseGuiada` (antes inexistente); el resto de la ficha es idéntico. Ningún ejercicio editado.
- Se rasterizaron los 16 SVG (sharp/librsvg, 640×480) y se miraron. Todos con texto ≥26 px, sin `<tspan>`, colores de texto permitidos (`#8A5A00`, `#0C706E`, `#1E2A78`, `#B5412A`). Cálculos y conteos de las clases verificados: correctos (8=8; 3×4=12=12; 6+5=11; 3×5=15; 10−6=4; 60/15=4; 180/30=6 y cinco no alcanzan; 18→20→19; 4→6→6; 4×3=12; 4×20=80; 5→8→8). Respuesta única en las cuatro comprobaciones.

## mat.p2.grupos-misma-cantidad — CAMBIOS
Archivo: `primaria-2/fichas/igualdades-y-equivalencias.json`.

1. Recurso `situacion`, `descripcion`: dice «ocho botones… ocho botones» y revela la respuesta de «piensa si tienen la misma cantidad». Quitar los totales (describir «dos filas de botones amarillos» y «tres filas desiguales de botones turquesa»).
2. Recurso `papas`, `descripcion` (momento `ejemplo-1-guiado`): «doce papas… doce papas» entrega la respuesta de «¿los dos conteos terminan igual?». Quitar «doce» (la propia descripción ya dice «sin escribir los totales»; contradicción interna).
3. Recurso `errores` / momento `contraejemplo`: el panel izquierdo («Más separado», dos filas de cuatro con una línea) no muestra ningún grupo de comparación; la narración «ocupa más espacio sin tener más objetos» no se ve en el dibujo. Añadir un grupo compacto de ocho al lado o ajustar la narración (menor).
4. (Opcional, auditivo) «Sol»/«Luna» están bien; sin otros defectos.

## mat.p4.el-litro — CAMBIOS
Archivo: `primaria-4/fichas/capacidad.json`.

1. Recurso `balde` (`ejemplo-2-guiado`/`razona`): el «?» está dentro del agua, justo sobre la marca de 6 L (valor conocido). La incógnita es lo que falta (zona vacía entre 6 y 10 L). Mover el «?» a la parte vacía; actualizar `descripcion` («contiene un signo de pregunta» → «en la parte vacía»).
2. Momento `situacion` + recurso `situacion`: el título del SVG y la `descripcion` preguntan «¿Cuánto cabe en el balde?» (capacidad, desconocida), pero la narración pregunta cuántos litros recibiría al vaciar las tres jarras (3 L). Preguntas distintas y, con el dibujo, «cuánto cabe» no tiene respuesta. Unificar: título «¿Cuántos litros recibe el balde?» y ajustar `descripcion`/`alt`.
3. Recurso `bidones`: los tres bidones se dibujan llenos a ~60 % y rotulados «5 L», mientras la narración dice «contiene cinco litros» (capacidad vs. contenido ambiguo). Rellenarlos al tope o decir «con capacidad de cinco litros».
4. `contraejemplo`: usa «kilos» (masa); solo se menciona «no masa» una vez en `ejemplo-1-razona`. Aceptable, pero valorar una frase que lo nombre antes (menor).

## mat.p5.interpretar-representaciones — CAMBIOS
Archivo: `primaria-5/fichas/graficos.json`.

1. SVG `interpretar-representaciones-situacion.svg`: el texto «Cada círculo: 20 sacos» (x 337–603) toca/pisa el borde derecho de su tarjeta (borde interior ≈603). Reducir texto o partir en dos líneas con margen ≥12 px.
2. SVG `interpretar-representaciones-pictograma.svg`: «Tabla: 60 familias» queda a ~6 px de los bordes de su tarjeta (pegado). Ampliar la tarjeta o partir el texto.
3. SVG `…-situacion.svg`: «Producto» casi toca la línea divisoria de columnas (≈9 px). Dar más margen.
4. Recurso `error`: el SVG y la `descripcion` dicen «bus», mientras la narración dice «combi». Unificar a «combi» (o «bus» en ambos).
5. `ejemplo-2-guiado` (taller): la narración ya da «cincuenta» y «la barra llega a cincuenta»; la pregunta «¿coinciden?» no pide ningún razonamiento. Reformular para que el alumno lea la barra (p. ej. no decir el valor de la barra en la narración guiada) (menor).

## mat.p6.grafico-lineas — CAMBIOS
Archivo: `primaria-6/fichas/graficos-estadisticos.json`.

1. Recurso `planta` (`ejemplo-2-guiado`): el SVG rotula «Misma altura» sobre el tramo horizontal y la `descripcion`/`alt` dicen «permanece horizontal»/«mantiene la altura»; revelan la respuesta a «¿qué significa que quede horizontal?». Quitar el rótulo del SVG y neutralizar `alt` y `descripcion` (solo puntos y valores 4, 6, 6). El rótulo puede pasar a `ejemplo-2-razona`.
2. Recurso `temperatura` (`ejemplo-1-guiado`): la `descripcion` dice «sube… y baja…», entrega la respuesta a «¿cómo cambia entre cada par de días?». Limitarla a los tres puntos y sus valores.
3. SVG `grafico-lineas-error.svg`: «No saltes de un día a otro» en y=465 de 480; queda a ~9 px del borde inferior (pegado) y a ~15 px de las etiquetas de días. Subir el gráfico y dejar margen ≥16 px.
4. SVG `grafico-lineas-situacion.svg`: «Miércoles» y «11 L» casi se tocan (~18 px a 2×). Separar la columna de valores.

## G. Ejercicios existentes reportados por el autor

- **p4 `e12`** (verdadero/falso, respuesta `false`): la respuesta es correcta, pero la retroalimentación «bastan 3 botellas (2+2+2=6 litros)» describe un llenado que sobrepasa los 5 L. No cambia la respuesta, pero confunde. Corrección mínima: «con 2 botellas llegas a 4 litros y la tercera ya no cabe entera; hacen falta 3 botellas (o 2 y una de 1 litro), no 5».
- **p4 `e03`** y **p5 `e11`**: correcta claramente más larga (lint informativo). Afecta poco en `e03`; en `e11` conviene alargar los distractores. Respuesta de `e11` verificada única (d).
- **p2 `e01`/`e12`**: series de «●» ilegibles al audio; en `e12` «11 ● + 6 ●» se oirá mal. Corrección mínima: sustituir «●» por «fichas» o «semillas». En `e01` acortar la opción correcta.
- **p6**: sin hallazgos.

## Ronda 2 (2026-11-16)

Verificación: lint `claseGuiada` de las 4 claves 0 errores/0 avisos (solo informativos preexistentes p4 `e03`, p5 `e11`); `validar-banco` válido (2238 fichas, 27034 ejercicios); `tsc --noEmit` correcto. Comparado con HEAD por JSON, los únicos ejercicios tocados son los autorizados: p2 `e01` (enunciado sin «●», opción correcta «Tienen la misma cantidad») y `e12` (sin «●»), p4 `e12` (solo retroalimentación); id, dificultad y respuesta intactos; p5 y p6 sin ejercicios tocados. 15 SVG rerasterizados (sharp, 640×480) y vistos: texto ≥26 px, sin `<tspan>`, márgenes correctos.

- **mat.p2.grupos-misma-cantidad — APROBADA.** Descripciones de `situacion` y `papas` sin totales; contraejemplo reformulado («separarlas no cambia cuántas son»), coherente con el dibujo. Menor, no bloquea: en `errores` la ficha derecha del panel «Más separado» roza el borde del panel.
- **mat.p4.el-litro — APROBADA.** `?` del balde en la parte vacía y descripción actualizada; título/narración/descripción de `situacion` unificados («¿Cuántos litros recibe el balde?»); «capacidad para cinco litros» y «no masa» explicados; `e12` coherente. Menor: los bidones siguen dibujados al ~60 % con rótulo «5 L»; la narración aclara capacidad, aceptable.
- **mat.p5.interpretar-representaciones — APROBADA.** Márgenes de `situacion` y `pictograma` corregidos (texto en dos líneas, «Producto» con holgura); «combi» unificado; `taller` ya no da el valor de la barra en narración guiada, alt ni descripción.
- **mat.p6.grafico-lineas — APROBADA.** Rótulo «Misma altura» eliminado; alt/descripción de `planta` y `temperatura` neutros (solo puntos y valores); `error` con margen inferior ≈20 px; `situacion` con columna de valores separada de «Miércoles».

Sin defectos nuevos en recursoRef, longitud de opciones, vocabulario oral ni alt/descripción vs dibujo.
