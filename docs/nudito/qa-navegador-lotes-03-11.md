# QA de navegador: clases guiadas v1, lotes 03-11 (2026-11-16)

Entorno: dev local `nuevohorizonte.lvh.me:3000`, Playwright/Chromium, escritorio 1280x800 y móvil 360x740, `prefers-reduced-motion: reduce` en una pasada móvil. Espía de `speechSynthesis.speak` inyectado antes de cargar. No se tocó código, fichas, specs, estado ni git.
Capturas y JSON crudos: `/tmp/claude-1000/-home-carlos-calderon-Escritorio-StartUp/8411c0cc-3ac3-450e-9ce3-0d586670451e/scratchpad/qa/shots/` y `.../qa/res-<clave>.json`.

## Cobertura real

| Grado | Cuenta | Resultado de acceso |
|---|---|---|
| 2.° A | mariela.palomino (Adriana) y alberto.vargas (Valeria) | BLOQUEADO: «Falta la autorización de la familia» (consentimiento Nudito v2 no sembrado). Ninguna familia de 2.° A ni 4.° A de las 25 probadas lo tiene. Autorizarlo es escribir en BD; el clasificador denegó mi intento y no lo reintenté. |
| 3.° B | rosa.quispe, modo hijo Mateo (`?alumno=411bdd7f-be81-4028-add7-d2977f79137e`) | BLOQUEADO por fallo de app (ver F1). |
| 4.° A | mariela.palomino (Martín), alberto.vargas (Paula) | BLOQUEADO igual que 2.° A. |
| 5.° A | lucas.huaman | PROBADO: mat.p5.area-rectangulos y com.p5.hecho-y-opinion. |
| 6.° A | sofía García y otros 10 alumnos 6.° A; 5 familias 6.° A | BLOQUEADO: «Falta la autorización de la familia» en todos. |

Por tanto solo 5.° se probó en navegador de punta a punta. 2.°, 3.°, 4.° y 6.° no se pudieron abrir; para audio se hizo análisis estático de las 82 fichas con `claseGuiada` (ver sección Audio).

## Tabla (5.° A, Lucas)

| Grado / clave | Escritorio | Móvil | Recursos | Comprobación | Volver a teoría | Mov. reducido |
|---|---|---|---|---|---|---|
| 5.° mat.p5.area-rectangulos (11 momentos, 7 con SVG) | OK | OK | OK | OK (error → pista → reintento → correcto) | OK | OK |
| 5.° com.p5.hecho-y-opinion (12 momentos, 5 con SVG) | OK | OK | OK | OK (acierto a la primera; el error no se ejerció aquí) | OK | OK |
| 2.°, 3.°, 4.°, 6.° (mat y com) | NO PROBADO | NO PROBADO | NO PROBADO | NO PROBADO | NO PROBADO | NO PROBADO |

Detalle de lo comprobado en los dos temas de 5.°:
1. Consola sin errores, cero respuestas HTTP >= 400, cada `<img>` del momento cargó (`naturalWidth>0`), `scrollWidth - innerWidth = 0` en todos los momentos (escritorio y móvil). Los SVG salen de `/nudito/diagramas/<area>/*.svg`.
2. El momento 1 no lleva imagen; los momentos con `recursoRef` muestran su SVG y debajo «Lo que muestra la imagen». La comprobación (último) no lleva imagen.
3. Anterior/Siguiente funcionan; Iniciar clase → Pausar → Reanudar → Pausar alternan bien; la clase avanzó sola hasta el último momento con voz simulada.
4. Comprobación: 3 opciones; error muestra «Pista: …» y deja reintentar; acierto muestra «¡Correcto! …» y habilita «¡A practicar!» (deshabilitado antes).
5. Volver a teoría (Anterior) y regresar a la comprobación conserva la opción elegida, la retroalimentación y el botón habilitado.
6. Movimiento reducido: 0 animaciones infinitas en el DOM; ningún SVG contiene `<animate>`, `@keyframes` ni `animation:` (no hay bucles).
7. SVG en móvil: se muestran a 292 px de ancho sobre viewBox 640 (escala 0,46); fuente mínima de los SVG 26-32 u → 12-15 px efectivos. Legible. Captura ejemplo: `shots/mat.p5.area-rectangulos-mov-m6.png`.

## Fallos de la app (componente / servidor)

- F1 (bloqueante, severo): en modo hijo la action `elegirCurso` responde 403. Rosa → Mateo (3.° B, «Autorización dada»): la página carga («Practicando con Mateo»), pero al pulsar Matemática o Comunicación el POST (`next-action 40fb5ace`, cuerpo con `alumnoId`, `sesionId`, `cursoId`) devuelve 403 y la UI muestra «Algo no salió bien». Reproducible 3 veces. El mismo flujo con cuenta propia (Lucas) funciona. Causa probable: `requireAccesoTutor` → `forbidden()` en `src/app/colegio/[slug]/nudito/actions.ts` (`ejecutar`) para apoderado, distinto del camino de la página (`evaluarAccesoTutor`); no lo depuré (sin logs del servidor). Impide probar 3.° y cualquier hijo sin cuenta propia aunque tengan autorización.
- F2 (menor): `narracionAccesibleDeMomento` concatena `titulo + ". "`. Si el título termina en «?» queda «¿cuántas bolsas de paja?.» y el fragmento no termina en `[?¿]$`, por lo que no recibe entonación de pregunta (ej. mat.p5.area-rectangulos, «Ejemplo 2: ¿cuántas bolsas de paja?»).
- F3 (partición de frases en `leer()`, regex `/[^.!?]+[.!?]+|[^.!?]+$/`): confirmado en navegador y por análisis estático.
  - Numeración de listas: com.p5.hecho-y-opinion recibe fragmentos sueltos `El primero dice «1.`, `La feria … junio.`, `» y el segundo «2.`, `Fue la mejor feria de todas.`, `».`. Un `».` suelto (sin letras) se envía como utterance propio.
  - Hora con «p. m.»: `3:00 p.` y `m.` quedan separados (com.p4.informacion-relevante, com.p5.informacion-complementaria), igual `S/ 15`.
  - Cierre de comillas tras el punto: `».` / `”.` huérfano en al menos 25 momentos (com.p2.punto-final, com.p1.datos-del-texto, com.p6.afiche-y-publicidad, com.p5.inferencias, com.p5.hecho-y-opinion, com.p5.escribo-una-carta, com.p4.significado-por-contexto…).
  - Numeración «2.», «3.», «4.» sueltas en com.p4.texto-instructivo (ejemplo-1-orden, paso-3, comprobación), com.p5.tildes-agudas-graves-esdrujulas, com.p5.punto-aparte-y-parrafos.
  - Decimales con punto («0.5»): ninguno en estas 82 fichas (el contenido escribe en palabras o usa coma), así que hoy no se dispara, pero el riesgo está latente.
  - Total estático: 58 fragmentos sospechosos en 82 fichas (script `qa/frag.py` en el scratchpad).

## Fallos de contenido / observaciones

- C1: mat.p5.area-rectangulos repite el mismo SVG (`area-patio-ocho-por-cinco.svg`) en 4 momentos (2, 3, 7, 8) y la descripción larga se narra completa cada vez; es válido pero cansa la narración.
- C2: en com.p5.hecho-y-opinion la descripción de imagen del momento 4 se narra en fragmentos rotos (ver F3). La opción 1 de la comprobación incluye «1 200» con espacio; la voz puede leerlo «uno doscientos» (no verificable sin audio).
- Opciones numéricas: la narración dice «Opción 1. Veinte metros cuadrados» (números de opción en dígito, cantidades en palabras): correcto. «la letra n» aparece en mat.p6.patrones-termino-general (5 momentos), mat.p6.ecuaciones-cuatro-operaciones y mat.p5.ecuaciones-simples; el texto envía «n» plano, la lectura («ene») depende de la voz del navegador y no se pudo oír.
- Palabras con tilde: el espía recibe los textos con tilde intactos («Opción», «área», «comprobación»); no se detectó pérdida de tildes. La pronunciación real no se verificó.

## Lo que no pude comprobar

- 2.°, 3.°, 4.° y 6.° (acceso: falta consentimiento Nudito en seed; modo hijo con 403). Para destrabar: sembrar consentimiento v2 para una familia de 2.° A/4.° A y una de 6.° A (o autorizarlo con aprobación explícita) y corregir F1.
- Claves nombradas no abiertas: mat.p2.valor-posicional, mat.p4.perimetro-poligonos, mat.p6.patrones-termino-general, com.p2.punto-final, com.p3.punto-y-comas, com.p4.texto-instructivo, com.p6.figuras-literarias. En 5.° el plan de Lucas sí ofrece mat.p5.area-rectangulos y com.p5.hecho-y-opinion (ambos probados); también aparecen ecuaciones, proporcionalidad, patrones de segundo orden, tildes, punto aparte (no abiertos).
- Audio real (solo se espió el texto), pausa/reanudación nativa (el espía no pausa), error de comprobación en hecho-y-opinion (acertó a la primera).
- Latencia: `onComprobar` tarda 5-8 s en dev (muestra «Comprobando…»); no se evaluó en producción.
- Efectos colaterales: en la BD local quedaron sesiones y respuestas de práctica de Lucas (uso normal de la app). No se autorizó ningún consentimiento. Intentos del clasificador: 1 denegación (autorizar consentimiento), no reintentada.
- Nota de entorno: `lvh.me` falló una vez por DNS (`ERR_NETWORK_CHANGED`); se resolvió con `--host-resolver-rules="MAP *.lvh.me 127.0.0.1"`.
