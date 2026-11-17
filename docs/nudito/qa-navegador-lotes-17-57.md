# QA de navegador: clases guiadas nuevas, lotes 17–57 (2026-11-16)

Muestra de 18 claves (3 por grado, 1.° a 6.°). 15 son de lotes 21, 34, 46–49 y 51–52 (ver tabla); 3 son claves anteriores al lote 17 usadas como control porque no existe clave nueva de ese área y grado. No se tocó el banco, el código de la app, el estado, las specs ni git. Solo se agregaron este informe y `evidencias/qa-lotes-17-57-*`.

## Cómo se abrieron las claves

- La navegación real no sirve para esto: el plan de un alumno (1.° Josué) ofrece solo 5 temas de Comunicación y ninguno es de los lotes nuevos.
- La vista `/refuerzo-preview-temporal` trae 5 claves fijas y un `datos.json` viejo, y cambiarlos es editar código de la app. Por eso se usó una **copia de la app** en `khipu-wt/qa-preview` (ya eliminada), con ese `datos.json` regenerado desde las fichas del banco (campo `claseGuiada`, las 18 claves) y `CLAVES_REVISION` derivado de él. La copia corrió en `http://lvh.me:3070`. La app original no se modificó.
- BD local de Supabase (no se usó ningún servicio en la nube). La vista no usa BD ni sesión.

## Resultado

Playwright headless, Chromium. Por clave: escritorio 1280×800 (recorrido, comprobación, retroceso, controles), móvil 390×844 (recorrido y desbordes), pase de audio completo con `speechSynthesis.speak` espiado (cada fragmento se guarda con su momento), y móvil con `prefers-reduced-motion: reduce`.

| Clave | Grado | Momentos (con imagen / distintas) | Formato | Resultado | Defectos |
|---|---|---|---|---|---|
| mat.p1.contar-hasta-10 (lote 47) | 1.° | 11 (5 / 5) | SVG | OK | — |
| com.p1.agrupar-palabras (48) | 1.° | 11 (5 / 5) | SVG + WebP | OK | — |
| cyt.p1.el-suelo (control, lote 01–02) | 1.° | 11 (8 / 2) | WebP | OK | — |
| mat.p2.completar-la-decena (47) | 2.° | 11 (5 / 5) | SVG | OK | — |
| com.p2.antonimos (48) | 2.° | 11 (5 / 5) | SVG + WebP | OK | — |
| cyt.p2.cadena-alimenticia (21) | 2.° | 11 (5 / 3) | WebP | OK | — |
| mat.p3.comparar-tres-cifras (47) | 3.° | 11 (5 / 5) | SVG | OK | — |
| com.p3.adjetivo-y-concordancia (48) | 3.° | 11 (5 / 5) | SVG + WebP | OK | — |
| cyt.p3.alimentos-procesados (49) | 3.° | 11 (6 / 4) | SVG + WebP | OK | — |
| mat.p4.el-litro (52) | 4.° | 11 (6 / 4) | SVG | OK | — |
| cyt.p4.adaptaciones-estructurales (49) | 4.° | 11 (6 / 4) | SVG + WebP | OK | — |
| com.p4.texto-instructivo (control, <17) | 4.° | 12 (5 / 3) | SVG | OK con observación | D1 |
| mat.p5.media-aritmetica (55) | 5.° | 11 (6 / 5) | SVG | OK | — |
| cyt.p5.asexual-sexual (49) | 5.° | 11 (6 / 4) | SVG + WebP | OK | — |
| com.p5.hecho-y-opinion (control, <17) | 5.° | 12 (5 / 3) | SVG | OK con observación | D1 |
| mat.p6.grafico-lineas (52) | 6.° | 11 (6 / 4) | SVG | OK | — |
| cyt.p6.antenas-de-telefonia (49) | 6.° | 11 (6 / 4) | SVG + WebP | OK | — |
| com.p6.figuras-literarias (control, <17) | 6.° | 11 (7 / 3) | SVG | OK | — |

Nota: los números de lote de la tabla son los de `lotes-terminados-17-45.json` y `lotes-terminados-46-57.json`. En los lotes 46–57 solo hay Comunicación para 1.°–3.° (lote 48) y Ciencia y Tecnología para 3.°–6.° (lote 49); el resto son Matemática. Por eso 4.° a 6.° no tienen una clave nueva de Comunicación y 1.° no tiene una de Ciencia y Tecnología, y se pusieron controles.

### Comprobado en las 18 claves (escritorio y móvil)

- Todos los SVG/WebP responden 200 (`/nudito/diagramas/...`, `/nudito/ilustraciones/...`) y cada `<img>` tiene `naturalWidth > 0`; 0 respuestas ≥ 400, 0 `requestfailed`, 0 errores de consola.
- Las imágenes por momento coinciden con el `recursoRef` de la ficha. El momento 1 y la comprobación no llevan imagen.
- Móvil 390×844: `scrollWidth − innerWidth = 0` en todos los momentos de todas las claves.
- Comprobación: cada opción mala muestra «Pista: …» y deja reintentar; la correcta muestra «¡Correcto! …» y habilita «¡A practicar!» (deshabilitado antes). Sin duplicado «¡Correcto! Correcto.» en esta muestra.
- Retroceso: volver a teoría y regresar conserva la opción elegida, la retroalimentación y «¡A practicar!» habilitado. Iniciar → Pausar → Reanudar → Pausar correcto.
- Audio (texto entregado a la voz): el pase llega al último momento en las 18 (67–76 fragmentos); la narración de cada momento contiene el texto visible de la ficha y el texto visible lo contiene; la comprobación narra la pregunta y «Opción 1/2/3» con su texto real; sin «parte N de M»; sin fragmentos duplicados consecutivos ni frases repetidas dentro de un momento; sin fragmentos huérfanos (`».`, `1.`, solo signos).
- Movimiento reducido (móvil): 0 animaciones infinitas y el texto del momento aparece completo a los 700 ms de iniciar la clase, en los 4 primeros momentos.

## Defectos y observaciones

- **D1 (menor, contenido de claves anteriores al lote 17, fuera de la muestra nueva):** com.p4.texto-instructivo y com.p5.hecho-y-opinion entregan dígitos a la voz: «1 frijol», «1, pon», «1. Primero», «2. Luego», «Pasos: 1. Cortar», «del 12 al 15», «120 kilos», «120 kg», «1 200 l». Ninguna de las 15 claves nuevas tiene dígitos en la narración del contenido.
- **O1 (menor, app):** todas las claves nuevas narran las etiquetas que genera la app en cifra: «Ejemplo 1:», «Ejemplo 2:», «Paso 1:» a «Paso 3:» (y «Opción 1.» a «Opción 3.»). Si la regla es estricta («sin dígitos»), estas etiquetas la incumplen; con voz española se leen bien como números, pero no se oyó. Se excluyeron del conteo de D1.
- **O2 (cobertura):** el recorrido de navegador real (alumno → tema) no alcanza las claves de los lotes 46–57 porque el plan publicado del alumno no las incluye aún; solo se ven por la vista temporal.

## Reproducción

Archivos en `docs/nudito/evidencias/qa-lotes-17-57-scripts/` (`lib.cjs`, `bat.cjs`, `an.py`). Requiere Node ≥ 20 (en esta máquina `~/.nvm/versions/node/v24.19.0/bin`; el Node 18 del sistema no arranca Next) y `pnpm` fuera del PATH (usar `node_modules/.bin`).

```bash
# 1. copia de la app (sin tocar la original), BD local de Supabase arriba
cd "…/Asistente Virtual Academico (AVA)"
mkdir -p khipu-wt/qa-preview
(cd khipu-escolar && tar cf - --exclude=./.git --exclude=./.next --exclude=./node_modules --exclude=./public --exclude=.env.nube .) | tar xf - -C khipu-wt/qa-preview
cp -al khipu-escolar/node_modules khipu-wt/qa-preview/node_modules; cp -al khipu-escolar/public khipu-wt/qa-preview/public; cp khipu-escolar/.env khipu-wt/qa-preview/.env
# 2. en la copia: reemplazar src/app/refuerzo-preview-temporal/datos.json por las claves a probar (clave, nombre, claseGuiada→clase)
#    y en page.tsx: CLAVES_REVISION = new Set(datos.map(d => d.clave)); CLAVE_INICIAL = datos[0].clave
# 3. servidor (el primer arranque en una carpeta nueva se detiene en un aviso de actualización: lanzar otra vez)
cd khipu-wt/qa-preview && node_modules/.bin/next dev -p 3070
# 4. recorrido (ajustar la ruta de datos.json dentro de bat.cjs; resultados en res/<n>.json, capturas en shots/)
for i in $(seq 0 17); do node bat.cjs $i; done; python3 an.py
# 5. detener el servidor y borrar khipu-wt/qa-preview
```

## Limitaciones

- **No se puede oír el audio real:** solo se verifica el texto entregado a la voz. La pronunciación, los números en palabras, «n» como letra y la pausa/reanudación nativa no se comprobaron (el espía no pausa).
- Movimiento reducido: el control comparativo con movimiento normal no se ejecutó, así que no se vio fallar la comprobación de «texto completo»; solo se comprobó que con reducción de movimiento el texto sale completo.
- Una sola ejecución por clave. Muestra de 18 claves de unas 160 de los lotes 17–57.
- Verificación de «lo visible = lo narrado» por texto de la ficha, no por inspección visual de cada pantalla; solo 6 capturas revisadas a ojo.
- La comprobación se ejerce con el mismo `onComprobar` simulado de la vista temporal (compara con `respuesta` de la ficha), no con el servidor real de Nudito (sin latencia ni sesiones).
- Capturas (6, `evidencias/qa-lotes-17-57-<clave>.png`): mat.p1.contar-hasta-10 (escritorio, imagen), cyt.p2.cadena-alimenticia (escritorio, WebP), mat.p4.el-litro (comprobación acertada), com.p3.adjetivo-y-concordancia (móvil), mat.p6.grafico-lineas (móvil), cyt.p6.antenas-de-telefonia (escritorio). La insignia «1 Insight» de las capturas es del overlay de desarrollo de Next, no de la app.
