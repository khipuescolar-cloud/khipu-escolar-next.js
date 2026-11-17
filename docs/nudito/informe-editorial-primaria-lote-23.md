# Informe editorial · Primaria, Matemática, lote 23

Fecha: 2026-11-16. Autor: subagente Claude (Sonnet). Estado: **escrito y validado técnicamente; pendiente de revisión independiente**. No se tocaron estado, huellas, BD, specs ni componentes. Solo cambió el campo `claseGuiada` de cada clave; ejercicios, ids, respuestas y dificultad quedan intactos.

## Alcance

Archivos bajo `src/lib/nudito/conocimiento/banco/matematica/`. Todas con 10 momentos (el primero sin recurso). SVG en `public/nudito/diagramas/matematica/`, 22 nuevos, 640×480, texto ≥ 26 px, paleta crema/índigo/turquesa/maíz, con `<title>`, sin `<tspan>`.

| Clave | Archivo | Recursos (ID, prefijo del SVG) | Letra correcta |
|---|---|---|---|
| `mat.p1.ayer-hoy-manana` | `primaria-1/fichas/medicion-masa-y-tiempo.json` | `situacion`, `lunes-martes`, `jueves-sabado`, `domingo-lunes` (`ayer-hoy-manana-*`) | c |
| `mat.p2.calendario` | `primaria-2/fichas/medicion-masa-y-tiempo.json` | `semana-pregunta`, `mes-completo`, `meses-orden`, `suma-semanas` (`calendario-*`) | b |
| `mat.p3.caras-aristas-vertices` | `primaria-3/fichas/c26-forma-movimiento.json` | `caja-pregunta`, `cubo-conteo`, `prisma-caras`, `piramide-conteo` (`caras-aristas-vertices-*`) | a |
| `mat.p4.cambio-dibujos-graficos` | `primaria-4/fichas/relaciones-de-cambio.json` | `canastas-pregunta`, `canastas-resuelto`, `cuyes-estrellas`, `canastas-cuatro` (`cambio-dibujos-graficos-*`) | c |
| `mat.p5.comparar-fracciones-heterogeneas` | `primaria-5/fichas/fracciones.json` | `cacao-pregunta`, `doceavos`, `cruzados`, `multiplos` (`comparar-fracciones-heterogeneas-*`) | b |
| `mat.p6.calculo-mental-naturales` | `primaria-6/fichas/numeros-naturales-y-operaciones.json` | `colecta-pregunta`, `compensar`, `doble-mitad`, `resta-igual` (`calculo-mental-naturales-*`) | a |

Estructura por clave: idea (sin imagen) → situación (recurso en variante pregunta) → ejemplo 1 guiado (sin recurso) y «razona» (recurso con la solución) → ejemplo 2 guiado y «razona» → contraejemplo (sin recurso) → tres pasos (reutilizan recursos ya presentados cuando lo narrado coincide) → comprobación nueva.

## Decisiones pedagógicas

- 1.º: tres tarjetas ayer/hoy/mañana; ejemplos lunes (ayer) y sábado (mañana); línea curva sábado-domingo-lunes para que la semana vuelve a empezar. Frases cortas. Comprobación: hoy lunes, ¿mañana? (martes); el distractor «Domingo» es el error de confundir ayer con mañana.
- 2.º: calendario de un mes de 30 días que empieza en jueves (coherente con los ejercicios existentes: 8 jueves, 10 sábado, 29 jueves, 4 domingos). La situación muestra solo una semana (no entrega el 15). Ejemplo 2: orden de meses. Paso 2: sumar siete por semana.
- 3.º: cubo, prisma triangular (cinco caras sueltas, para evitar un dibujo oblicuo con caras ocultas) y pirámide. La situación solo rotula una cara, una arista y un vértice, sin cantidades. Comprobación: aristas del prisma triangular (nueve).
- 4.º: canastas con puntos (mazorcas) y pictograma de estrellas (cuyes). La jaula se llama «uno», no «A», para que la voz no lea una letra suelta. Comprobación: pictograma de gotas (cuatro gotas de tres litros).
- 5.º: dos tarjetas con fracciones (sin barras sombreadas, para no revelar la respuesta), barras en doceavos, productos cruzados y múltiplos de cuatro y seis. Comprobación: dos tercios frente a tres quintos (quince, Rosa).
- 6.º: compensar en suma (398 + 257), doble y mitad (25 × 16), compensar en resta (704 − 296, para no repetir el e12 del banco). Comprobación: quince por doce a treinta por seis.
- Descripciones: símbolos convertidos a palabras («por», «igual a», «más», «menos»); sin letras sueltas (iniciales de los días descritas como tales).
- Longitudes de opciones (caracteres): p1 7/5/6, p2 6/4/5, p3 13/12/14, p4 13/12/11, p5 16/16/19, p6 16/16/15; en ningún caso la correcta es la más larga.

## Verificaciones

- Rigor: 398+257 = 400+255 = 655; 25×16 = 50×8 = 400; 704−296 = 708−300 = 408; 3/4 = 9/12, 5/6 = 10/12; 2×10 = 20 < 3×7 = 21 (2/3 < 7/10); 2/3 = 10/15 > 3/5 = 9/15; 8+7 = 15 (jueves); 5+7 = 12; 3×2 = 6; 4×3 = 12; cubo 6/12/8, prisma 5 caras y 9 aristas, pirámide 5/8/5; 15×12 = 30×6.
- Ejercicios existentes de las seis claves revisados uno a uno: sin errores matemáticos ni de grado. Observación: `mat.p2.calendario` e05/e07/e10/e11 dependen de «el calendario» de la ficha; son coherentes con un mes de 30 días que empieza en jueves (el mismo que usa la clase), pero esa dependencia no está escrita en los enunciados.
- Script de lote: `recursoRef` ↔ recursos exactos, 10 momentos, primer momento sin recurso, `alt` ≤ 200, descripciones ≤ 500, narraciones sin dígitos ni «parte N de M», sin «imagen/dibujo/tarjeta» en momentos sin recurso.
- Los 22 SVG se rasterizaron con Chrome headless y se vieron antes de escribir `alt` y `descripcion`. Se corrigieron: «miércoles» desbordando su tarjeta, «domingo» pegado al borde de su caja, punto de vértice oculto sobre la cara de la pirámide, fila de semanas descentrada, texto inferior cercano al borde en doceavos.
- Comparación contra `HEAD`: en cada archivo solo cambia `claseGuiada` de la clave del lote, salvo `primaria-5/fichas/fracciones.json`, donde también aparece `mat.p5.suma-resta-fracciones`, que es de otra sesión y no se tocó (se releyó el archivo justo antes de escribir y solo se asignó `claseGuiada` de la clave propia).
- `pnpm typecheck`: sin errores. `git diff --check` sobre banco de Matemática y diagramas: limpio.
- `pnpm nudito:validar-banco`: **falla por un archivo ajeno a este lote**, `matematica/primaria-3/c24-regularidad.json` (`claseGuiada.recursos[3].descripcion` supera 500 caracteres). No aparecen errores de las seis claves de este lote (la descripción más larga mide 432).

## Riesgos y pendientes

- Sin revisión independiente ni recorrido en navegador (audio, móvil, movimiento reducido).
- p2: el recurso `mes-completo` fija un mes de treinta días que empieza en jueves; la ficha lo usa de forma implícita.
- p3: `caja-pregunta` rotula una arista y un vértice cerca de la misma esquina de atrás-derecha/abajo-adelante; revisar si queda claro para 3.º.
- p4: el título de la idea es «Cambio en esquemas y gráficos» (la clave habla de dibujos) para evitar la palabra «dibujo» en un momento sin recurso.
- p5: la comprobación usa tercios y quintos; la pista menciona «partes del mismo tamaño» sin dar el denominador.

## Correcciones tras la revisión independiente (`revision-lote-23.md`)

`mat.p6.calculo-mental-naturales` aprobada: no se tocó su contenido (el archivo se reescribió con el mismo contenido de la clave).

- p1: `domingo-lunes` sin curva de regreso; ahora tres tarjetas con flechas gruesas sábado → domingo → lunes (la segunda, verde azulada); narración y descripción de `paso-3` acordes («la flecha del domingo lleva al lunes, porque otra semana empieza»).
- p2: abreviaturas Lun Mar Mié Jue Vie Sáb Dom (descripciones actualizadas); `mes-completo` con título «Un mes de treinta días» y usado también en `paso-1` («calendario del mes», el de la práctica); «una/semana» y «dos/semanas» en dos líneas en `suma-semanas`; `meses-orden` con recuadros más anchos y texto de 26 px; distractor «Quince» cambiado por «Diez».
- p3: `caja-pregunta` con el rótulo «una cara» encima y una línea corta que termina en un punto dentro de la cara (sin cruces); `paso-3` y `piramide-conteo` ya no dan cifras (solo piden contar caras, aristas y vértices); comprobación reformulada («tiene dos triángulos en los extremos») con pista por grupos.
- p4: coherencia acumulado/canasta: cada canasta trae tres mazorcas y las filas se rotulan «1 canasta», «2 canastas», «3 canastas», «4 canastas» (SVG, alt, descripciones y narración); contraejemplo con «si cada estrella vale cinco soles…».
- p5: en el ejemplo 2 se explica que cada producto queda del lado de la fracción que aporta el numerador y se justifica pasando a treintavos (dos tercios son veinte treintavos; siete décimos, veintiuno treintavos); `ejemplo-1-guiado` termina en pregunta; vocabulario unificado («tabla del cuatro, o múltiplos de cuatro»).
- SVG cambiados rerasterizados y revisados: p1 `domingo-lunes`; p2 `semana-pregunta`, `mes-completo`, `meses-orden`, `suma-semanas`; p3 `caja-pregunta`, `piramide-conteo`; p4 `canastas-pregunta`, `-resuelto`, `-cuatro`.
- Revalidado: `pnpm nudito:validar-banco` válido (2238 fichas), `pnpm typecheck` y `git diff --check` limpios. El cambio ajeno de `mat.p5.suma-resta-fracciones` se conservó (archivo releído antes de escribir).
