# Informe editorial · Primaria, Ciencia y Tecnología (3.º y 4.º), lote 34

Fecha: 2026-11-16. Autor: subagente Claude (Sonnet). Estado: **escrito y validado técnicamente; pendiente de revisión independiente** (no se aprueba a sí mismo). No se tocaron estado, huellas, BD, specs ni componentes. En cada clave solo cambió `claseGuiada`; ejercicios, ids, respuestas y dificultad quedan intactos (comparado con `HEAD`: el resto de cada clave es idéntico).

## Alcance

Archivos en `src/lib/nudito/conocimiento/banco/ciencia-tecnologia/`. Todas con 10 momentos (el primero sin recurso). Imágenes Z-Image Turbo local (1200×896, `*-zimage-v1.webp`) en `public/nudito/ilustraciones/ciencia-tecnologia/primaria-3|4/`; SVG en `public/nudito/diagramas/ciencia-tecnologia/`.

| Clave | Archivo | Momentos | Recursos (id) | Resp. |
|---|---|---|---|---|
| `cyt.p3.actividades-segun-la-epoca` | `primaria-3/fichas/el-clima-durante-el-ano.json` | 10 | `campo-lluvia`, `siembra-lluvia`, `cosecha-seca` (imágenes), `cuadro-epocas` (SVG) | b |
| `cyt.p3.agrupar-seres-vivos` | `primaria-3/fichas/diversidad-de-especies.json` | 10 | `patio-animales`, `estanque-animales` (imágenes), `grupos-plumas`, `criterio-dos-grupos` (SVG) | c |
| `cyt.p3.ajustes-para-mejorar` | `primaria-3/fichas/construccion-prueba-y-evaluacion.json` | 10 | `carrito-carton`, `comedero-fino`, `comedero-grueso` (imágenes), `ciclo-ajuste` (SVG) | a |
| `cyt.p4.absorcion-de-nutrientes` | `primaria-4/fichas/sistema-digestivo.json` | 10 | `desayuno` (imagen), `pared-pregunta`, `pared-solucion`, `recorrido-pregunta`, `recorrido-solucion` (SVG) | c |
| `cyt.p4.actos-voluntarios-reflejos` | `primaria-4/fichas/relacion-y-locomocion.json` | 10 | `cocina-olla`, `reflejo-olla`, `voluntario-mano` (imágenes), `camino-orden` (SVG) | a |
| `cyt.p4.adaptaciones-conductuales` | `primaria-4/fichas/adaptaciones.json` | 10 | `oso-invierno`, `ballena-mar-calido`, `vicunas-grupo` (imágenes), `tres-conductas` (SVG) | b |

14 imágenes (semillas 3401–3493) y 9 SVG nuevos (`epoca-lluvias-y-seca-cuadro`, `agrupar-criterio-dos-grupos`, `agrupar-grupos-plumas`, `ajustes-ciclo-probar-cambiar`, `absorcion-pared-pregunta`, `absorcion-pared-solucion`, `absorcion-recorrido-pregunta`, `absorcion-recorrido-solucion`, `actos-reflejo-y-voluntario-camino`, `adaptaciones-tres-conductas`; 10 en total).

## Decisiones

- Estructura: idea (sin imagen) → situación → ejemplo 1 (observa + razona) → ejemplo 2 (observa + razona) → error frecuente → tres pasos → comprobación nueva.
- Situación y «observa» no muestran la respuesta: en `epoca` el momento «observa» va sin imagen y la imagen de la siembra/cosecha aparece solo al razonar; en la pared del intestino y el recorrido se usan variantes «pregunta» (sin valor, con «?») y «solución» aparte; en `ajustes` el comedero débil se ve antes y el firme después. En `agrupar`, `actos` y `adaptaciones` la imagen muestra el caso, no la clasificación (los grupos solo aparecen en el SVG del razonamiento).
- Letras correctas: b, c, a, c, a, b. Opciones con diferencia máxima de 3 caracteres y la correcta nunca la más larga (22/20/23; 22/23/20; 25/25/27; 30/28/28; 33/34/33; 26/23/25).
- Comprobaciones con casos nuevos: maíz seco y cosecha; criterio «tienen alas» (mariposa, abeja, colibrí frente a gato y cuy); parasol de cartón; lámina de la pared del intestino con tubo rojo; «rápido no siempre es reflejo» (patear la pelota); ardilla de tierra que hiberna.
- Rigor: siembra con la lluvia y cosecha en época seca solo para la sierra (octubre a marzo / abril a septiembre, igual que los ejercicios); vellosidades = absorción hacia la sangre, nunca del estómago a los músculos; reflejo = respuesta de la médula, el encéfalo se entera después; hibernar (meses) distinto de dormir una noche; migración de ballena jorobada de aguas frías del sur a Piura y Tumbes y de regreso.
- Voz: sin dígitos, sin «parte N de M», títulos distintos de la narración, sin aludir a «imagen/dibujo/esquema/tarjeta» en momentos sin recurso.
- Reintentos de imagen: `cosecha-seca` (segunda versión: había un niño pequeño no pedido), `comedero-grueso` (la primera tenía una marca de agua pseudo-texto abajo a la derecha), `reflejo-olla` (la primera mostraba dos manos extendidas hacia la olla, no un gesto de retirar), `vicunas-grupo` (la primera traía dos niños no pedidos). El resto salió a la primera.
- Texto ajustado a lo que se ve: ruedas negras (no tapas de botella) y comedero que no se inclina; el pez del estanque nada en la superficie; la niña de `reflejo-olla` ya retiró la mano y se la lleva al pecho.

## Verificaciones

- `pnpm nudito:validar-banco`: banco válido (2 238 fichas, 27 034 ejercicios). `pnpm typecheck`: sin errores. `git diff --check` sobre los seis JSON y los SVG: limpio.
- Script propio: 10 momentos, primer momento sin recurso, cada `recursoRef` resuelto y todos los recursos usados, `src` existentes, alt ≤ 200 (máx. 144) y descripción ≤ 500 (máx. 281), sin dígitos, sin «parte N de M», longitud de opciones y posición de la correcta. Los JSON se reescribieron con el mismo formato (ida y vuelta exacta).
- Todas las imágenes y todos los SVG se vieron con Read antes de escribir alt y descripción. SVG: 640×480, texto ≥ 26 px, sin `<tspan>`, con `<title>`, paleta de specs/18, texto ámbar `#8A5A00`. Se corrigieron en el proceso: flechas demasiado grandes, vellosidades dibujadas como huecos (ahora salientes), etiquetas de círculos que pisaban el borde, flecha del acto voluntario sin sentido.

## Errores o dudas en ejercicios existentes (no editados)

- `cyt.p4.actos-voluntarios-reflejos` e10: tropezar y mover los brazos para no caer, con respuesta «médula espinal», es dudoso (el equilibrio no es un reflejo espinal simple). e06: la pupila que se achica es un reflejo del tronco encefálico, no de la médula; contradice la idea central del banco («ordena la médula espinal»). Sugerir cambiar a un reflejo espinal claro (rodilla, pisar una espina).
- `cyt.p3.ajustes-para-mejorar` e07 y e10: el enunciado entrega la respuesta («Escribe “ajustar”», «Escribe “más agujeros”»); además e07 usa «ajustar» en sentido de apretar, distinto del sentido de la clase.
- `cyt.p3.agrupar-seres-vivos` e05: abeja y mosca también tienen pelillos; «tienen pelo» es ambiguo, mejor «tienen pelaje». e02 («pasan tiempo en el agua») no coincide exactamente con el criterio «viven en el agua».
- `cyt.p4.adaptaciones-conductuales`: el ejemplo del oso es de oso pardo; el oso andino del Perú no hiberna (la clase usa oso pardo, de lugares fríos). Sin error en los ejercicios.
- `cyt.p3.actividades-segun-la-epoca` e07: el enunciado ya nombra las dos opciones («impermeable o abrigo grueso»); menor.
- `cyt.p4.absorcion-de-nutrientes`: sin errores.

## Riesgos y pendientes

- Sin revisión independiente ni recorrido de navegador (audio, móvil, movimiento reducido).
- Recursos por clave: cuatro (cinco en absorción); sirven los pares «pregunta/solución» en absorción. Agrupar usa dos imágenes porque cada una contiene varios animales.
- Estilo único Z-Image, pero con distinta textura entre imágenes; `reflejo-olla` y `cocina-olla` muestran la misma cocina de leña con diferente encuadre.
- Los SVG usan palabras (sin cifras); la clase de época cita los meses del banco (octubre a marzo, abril a septiembre), válidos para la sierra.
- No se actualizaron `estado-refuerzo-primaria.json`, specs ni bitácora (fuera del encargo).

## Correcciones tras la revisión independiente (`revision-lote-34.md`)

Estado: corregido y revalidado; pendiente de nueva revisión. `validar-banco` (2 238 fichas, 27 034 ejercicios), `typecheck` y `git diff --check` limpios. Fuera de `claseGuiada`, solo cambiaron los ejercicios autorizados (ids y dificultad intactos).

Clases guiadas
- `actividades-segun-la-epoca`: la `idea` ahora dice «en la sierra» para lluvias y época seca.
- `agrupar-seres-vivos`: «el pato pasa mucho tiempo en el agua» y el criterio habla de dónde pasan el tiempo.
- `ajustes-para-mejorar`: los dos «observa» solo dicen el síntoma (el carrito se detiene, el comedero se cae); la causa pasó a los «razona». `comedero-fino` regenerado (semilla 3473, UNA imagen, revisada) con el mismo comedero, fondo y árbol que el grueso; solo cambia la cuerda. Descripciones y alt actualizados.
- `absorcion-de-nutrientes`: comprobación nueva (nutrientes de las lentejas ya pequeños en el intestino; correcta «Pasan a la sangre», letra c, longitudes 17/19/17); `absorcion-pared-solucion.svg` ahora traslada los puntos (1 arriba, 2 en pliegues, 3 en el tubo = 6, como antes) y su descripción lo dice.
- `actos-voluntarios-reflejos`: `idea` y error frecuente limitan «la ordena la médula» a retirar la mano del calor; `ejemplo-1-observa` reformulado sin «sin querer/de golpe»; comprobación con «Mi cuerpo se movió rápido»; SVG `camino-orden` rehecho (flechas índigo encéfalo→médula→mano y flecha turquesa corta médula→mano), narración, alt y descripción alineadas. `ideaCentral` de la ficha no se tocó.
- `adaptaciones-conductuales`: se quitó el puma de `ejemplo-2-observa` (pasa al «razona»); oso pardo «de los bosques fríos del norte»; contraejemplo «gastando muy poca energía». Descripción de la ballena: «aleta junto al agua».

Ejercicios editados (mínimo cambio)
- `cyt.p3.actividades-segun-la-epoca` e07: se quitó «impermeable o abrigo grueso» del enunciado (queda «Escribe la prenda»). e10: «Puno/septiembre» pasó a «Cusco/octubre» (incluida la pista 1); opciones y respuesta (b) iguales.
- `cyt.p3.agrupar-seres-vivos` e02: respuesta principal «pasan tiempo en el agua»; «viven en el agua» queda como alternativa. e05: mosca y abeja se cambian por lagartija y pez («tienen pelo» → 2 igual); pista 2: «La lagartija y el pez tienen escamas, no pelo.»
- `cyt.p3.ajustes-para-mejorar` e07: «apretarla o aflojarla? Escribe la palabra.», respuesta «apretarla», alternativas «apretar, ajustarla, ajustar, amarrarla, amarrar más, ajustar la cuerda», retro «Debe apretar la cuerda…». e10: «Escribe una frase corta.» y alternativas ampliadas («hacerle más agujeros», «más huecos», «hacer más huecos», «perforar más agujeros», «más agujeros en la botella»).
- `cyt.p4.actos-voluntarios-reflejos` e10: caso de la rodilla con martillito (respuesta «médula espinal» igual), pistas sin «tropieza» y retro acorde. e06 no se tocó.

Sin cambios: imagen de la llama (parece alpaca, V2), mancha bajo el pato (V3) y el estilo más 3D del carrito (V1), observaciones opcionales/menores del revisor.

### Ronda 2 (dos claves)

- `cyt.p3.actividades-segun-la-epoca` e10: la pista 1 decía «septiembre»; ahora dice «octubre». Verificado en el JSON: enunciado (Cusco, octubre, empiezan las lluvias), respuesta b (época de lluvias y botas), pistas y retroalimentación coherentes con el cuadro de la clase (lluvias de octubre a marzo). Una sola mención de «septiembre» queda en el propio cuadro (época seca).
- `cyt.p3.ajustes-para-mejorar`: no se regeneró más. Los comederos se presentan como **dos comederos** distintos: `ejemplo-2-observa` («Luis prueba dos comederos… uno cuelga con una cuerda blanca… se cae») y `ejemplo-2-razona` («Prueba con el otro comedero, que cuelga de una cuerda gruesa… la parte que fallaba era la cuerda»). Sin «cambia solo la cuerda» ni «el mismo comedero»; alt/descripcion del grueso dicen «Otro comedero».
