# QA de navegador ronda 2: clases guiadas 1.°, 2.°, 4.° y 6.° (2026-11-16)

Entorno: dev local `nuevohorizonte.lvh.me:3000`, Playwright/Chromium, 1280x800 y 360x740, pasada móvil con `prefers-reduced-motion: reduce`, espía de `speechSynthesis.speak`. Scripts: `.../scratchpad/qa2/` (bat.cjs, par.sh, sum.py, frag.py), JSON `qa2/res-<id>.json`, capturas `qa2/shots/`. No se tocó código, fichas, specs, estado, BD ni git.

Cuentas: 6.° Adriana Ríos (`adriana.rios@nuevohorizonte.demo`, cuenta propia); 4.° Martín y 2.° Adriana (`mariela.palomino@familia.demo`, modo hijo `?alumno=`); 1.° Josué (`janet.aguilar@familia.demo`, modo hijo).

## F1 (elegirCurso 403 en modo hijo): NO se reprodujo
Martín, Adriana (2.°) y Josué eligieron curso y tema sin error; 0 respuestas >= 400 en todas las pasadas. Aparente corrección ya aplicada.

## Tabla

| Grado / clave | Momentos (con imagen) | Escritorio | Móvil | Recursos | Comprobación | Volver a teoría | Mov. reducido |
|---|---|---|---|---|---|---|---|
| 6.° mat.p6.patrones-termino-general | 11 (7 SVG; 4 distintos) | OK | OK | OK | OK (error, pista, reintento, correcto) | OK | OK |
| 6.° com.p6.figuras-literarias | 11 (7 SVG; 3 distintos) | OK | OK | OK | OK (2 errores con pista, 3.ª correcta) | OK | OK |
| 4.° mat.p4.perimetro-poligonos | 11 (7 SVG; 2 distintos) | OK | OK | OK | OK (error, reintento, correcto) | OK | OK |
| 4.° com.p4.texto-instructivo | 12 (5 SVG; 3 distintos) | OK | OK | OK | OK (error, reintento, correcto) | OK | OK |
| 2.° mat.p2.valor-posicional | 11 (7 SVG; 2 distintos) | OK | OK | OK | OK (2 errores, 3.ª correcta) | OK | OK |
| 2.° com.p2.punto-final | 11 (6 SVG; 3 distintos) | OK | OK con reserva (R1) | OK (R1) | OK (acierto 1.ª; error no ejercido) | OK | OK |
| 1.° com.p1.personajes | 12 (8 WebP; 2 ilustraciones: pollito, cuaderno) | OK | OK | OK | OK (acierto 1.ª; error no ejercido) | OK | OK |

Claves pedidas y no abiertas: mat.p6.area-triangulos, com.p6.resumen, cyt.p1.el-suelo (basta con las probadas; el plan sí ofrecía las demás pedidas). Los cuatro temas de 6.°, 4.° y 2.° pedidos salieron todos.

Comunes a las 7 clases (esc y móvil): consola sin errores, 0 respuestas >= 400, `scrollWidth - innerWidth = 0` en todos los momentos, momento 1 y comprobación sin imagen, Iniciar -> Pausar -> Reanudar -> Pausar correcto, Anterior/Siguiente correctos, volver a teoría y retomar conserva opción, retroalimentación y «¡A practicar!» habilitado (antes de acertar está deshabilitado), 0 animaciones infinitas con movimiento reducido y ningún SVG con `<animate>`, `@keyframes` ni `animation:`. Pase completo con voz simulada llega al último momento (68-80 utterances por clase).

## Audio (texto recibido por speak)
Sin fragmentos huérfanos: 0 sospechosos (`».`, `1.`, `p.`/`m.`, `?.`) en las 7 clases (script frag.py). Opciones se narran «Opción 1.», números en palabras («veintitrés», «setenta y ocho metros»), «Cinco n» para 5n, preguntas con `¿…?` intactas, tildes intactas. Parece que F2/F3 de la ronda anterior ya no afectan a estas clases. Pronunciación real no oída.

## SVG en móvil
Se muestran a 292x219 px (viewBox 640, escala 0,46); fuente mínima 26 u (~12 px) en 6.°, 4.° y 2.°. Ninguno se ve cortado ni ilegible en capturas revisadas (p2mat-mov-m4, p1com-mov-m2). 1.° usa ilustraciones WebP sin texto: sin problema. Sin desbordes.

## Fallos de app
- R1 (menor, no reproducido): una vez, com.p2.punto-final móvil momento 2 dejó la imagen en blanco (`currentSrc` vacío, `complete=false`) tras 600 ms; en pasadas escritorio y reducido y en 2 reintentos dirigidos cargó bien. Probable carrera de `loading=lazy` con 3 navegadores en paralelo. Sin evidencia de fallo real; vale revisar si la imagen lazy no carga si el momento aparece de golpe.
- Sin otros fallos de app.

## Observaciones de contenido
- C1: texto de acierto «¡Correcto! Correcto. …» duplicado en mat.p6.patrones-termino-general, mat.p4.perimetro-poligonos y mat.p2.valor-posicional (prefijo de app + «Correcto.» en la ficha); en las clases de comunicación no ocurre.
- C2: pocas ilustraciones distintas por clase (1 a 4); el mismo SVG se repite en 2-5 momentos (p4mat/p2mat solo 2 distintos; p1com repite 2 ilustraciones en 8 momentos) y su descripción larga se narra cada vez.
- C3: en p1com y p2com la opción 1 era la correcta (acierto directo); posible sesgo de posición, a revisar con más temas.
- Latencia de `onComprobar` 1,5 a 8,6 s por intento en dev.

## No comprobado
- Audio real, pausa/reanudación nativa (el espía no pausa), error de comprobación en p1com y p2com (acierto directo).
- mat.p6.area-triangulos, com.p6.resumen, cyt.p1.el-suelo y los lotes 01-02 restantes de 1.°.
- Una sola ejecución por clase; R1 no confirmado.
- Efectos colaterales: sesiones y respuestas de práctica de estos alumnos en BD local.
