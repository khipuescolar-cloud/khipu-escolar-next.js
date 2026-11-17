# Informe editorial · Primaria Comunicación 2.º y 3.º, lote 08

Fecha: 2026-11-16. Autor: agente Sonnet. Estado: **escrito y validado técnicamente; pendiente de revisión independiente**. No se aprueba ni se renueva ninguna huella.

## Alcance

Solo cambió el campo `claseGuiada` de cada ficha (ejercicios, ids, respuestas y dificultad intactos; comprobado con `git show HEAD` contra el archivo actual: la única diferencia por clave es `claseGuiada`).

| Clave | Archivo (bajo `src/lib/nudito/conocimiento/banco/comunicacion/`) | Momentos | Recursos | Comprobación |
|---|---|---:|---|---|
| `com.p2.como-son-los-personajes` | `primaria-2/fichas/inferir-e-interpretar.json` | 10 | 3 SVG | `b` |
| `com.p2.escribo-un-texto-corto` | `primaria-2/fichas/textualizar.json` | 10 | 3 SVG | `c` |
| `com.p2.punto-final` | `primaria-2/fichas/ortografia.json` | 10 | 3 SVG | `a` |
| `com.p2.tema-del-texto` | `primaria-2/fichas/inferir-e-interpretar.json` | 11 | 3 SVG | `b` |
| `com.p3.ensenanza-del-texto` | `primaria-3/fichas/inferir-e-interpretar.json` | 11 | 3 SVG | `c` |
| `com.p3.escribo-un-cuento` | `primaria-3/fichas/escribir-segun-el-tipo-de-texto.json` | 11 | 3 SVG | `a` |
| `com.p3.inferir-personajes` | `primaria-3/fichas/inferir-e-interpretar.json` | 10 | 3 SVG | `b` |
| `com.p3.opinar-sobre-el-texto` | `primaria-3/fichas/reflexionar-y-opinar.json` | 10 | 3 SVG | `c` |
| `com.p3.predecir-por-indicios` | `primaria-3/fichas/antes-de-leer.json` | 10 | 3 SVG | `a` |
| `com.p3.punto-y-comas` | `primaria-3/fichas/ortografia-y-puntuacion.json` | 10 | 3 SVG | `b` |

Estructura común: idea inicial sin imagen; situación visual; dos ejemplos distintos (guiado y razonado); error frecuente; tres pasos; comprobación nueva con una sola respuesta correcta y la letra correcta variada entre claves (a/b/c).

## Decisiones pedagógicas

- **Texto visible:** todos los textos a leer (cuentos, oraciones, listas) están escritos en el SVG y citados en la narración; el audio apoya y no sustituye la lectura.
- **Imagen sin spoiler:** en las situaciones y los «lee», el SVG muestra solo el texto y la pregunta; la respuesta aparece en el momento que razona. Los SVG «antes/después» se usan en el momento que ya los describe (ejemplos de corrección).
- **2.º:** consignas cortas, textos de dos o tres oraciones. Personajes: pista por lo que hace y contraste dice/hace (Tito, Luis). Texto corto: tema, descartar oración ajena, de idea suelta a oración completa. Punto final: regla con ejemplo y contraejemplo (sin mayúscula/punto; dos ideas juntas; punto y luego minúscula). Tema: qué se repite, propósito informar/enseñar, y dato suelto como error.
- **3.º:** tema vs enseñanza con consecuencia causal (Mateo, hormigas); cuento con inicio-nudo-final y elección de final que resuelva (Kusi, Tomás); inferencia de personaje y de lugar con pistas citadas; opinión con razón del texto separando hecho y opinión; predicción por título, dibujo y forma con confirmación/cambio; comas de lista, «y» sin coma y punto seguido con contraejemplos.
- Ejercicios de la ficha no reutilizados (personajes Rita/Pedro/zorro, Valeria, vicuña, etc.); contextos peruanos variados (puna, chacra, terminal, quena, mercado) sin estereotipos.
- Errores frecuentes con recurso en 7 de 10 claves; en `escribo-un-texto-corto`, `punto-final`, `escribo-un-cuento` y `punto-y-comas` se enseña solo en la narración (el texto con el contraejemplo queda visible en pantalla).

## Recursos (SVG como código, sin imágenes generadas)

Rutas en `public/nudito/diagramas/comunicacion/`, viewBox 640×480, Arial, texto 26–52 px (títulos 28), colores del sistema de diseño (`specs/18`), cruz y palomita dibujadas con trazos (no solo color). Generados por script; el ancho de cada línea se midió con la métrica de Liberation Sans para evitar desbordes. Renderizados en Chrome headless a 360 px y revisados; alt y descripción redactados después de ver el render.

- p2 personajes: `personajes-tito-escena`, `personajes-luis-dice-hace`, `personajes-error-sin-pista`
- p2 texto corto: `texto-corto-mercado-ideas`, `texto-corto-barrio-oracion`, `texto-corto-barrio-revision`
- p2 punto final: `punto-final-regla`, `punto-final-hoy-corregir`, `punto-final-dos-oraciones`
- p2 tema: `tema-cuy-texto`, `tema-limonada-orden`, `tema-se-repite-cuy`
- p3 enseñanza: `ensenanza-mateo-historia`, `ensenanza-hormigas-historia`, `ensenanza-tema-vs-ensenanza`
- p3 cuento: `cuento-kusi-tres-partes`, `cuento-tomas-finales`, `cuento-plan-tres-partes`
- p3 inferir: `inferir-joaquin-espera`, `inferir-orilla-lago`, `inferir-error-pistas`
- p3 opinar: `opinar-rio-limpieza`, `opinar-marta-promesa`, `opinar-razon-del-texto`
- p3 predecir: `predecir-portada-luciernagas`, `predecir-poema-forma`, `predecir-frase-confirmar`
- p3 comas: `comas-lista-mochila`, `comas-chacra-corregir`, `comas-terminal-puntos`

Total 30 SVG nuevos, todos usados. Pendiente (opcional, por id): ilustraciones de Gemini cuando haya cuota; no se usaron `agy` ni imágenes generadas.

## Comandos y resultados

- Script propio (ejecutado antes de escribir): `claseGuiada` con ids de momento únicos; momento `idea` sin `recursoRef`; todo `recursoRef` existe y todo recurso se usa; rutas SVG existen; alt ≤200 y descripción ≤500; sin «Atención:», «¿Es verdad que…», «como puedes ver» ni «Recuerda».
- `pnpm nudito:validar-banco`: «Banco válido: 2238 fichas activas; 27034 ejercicios.»
- `pnpm typecheck`: sin errores.
- `git diff --check` sobre bancos de primaria 2 y 3 y `public/nudito`: sin hallazgos.
- Comparación contra `HEAD` de los 8 archivos: solo cambia `claseGuiada` de las claves del lote.

## Riesgos y pendientes

- Falta revisión independiente (pedagógica, factual, visual) y prueba en navegador con audio, móvil, movimiento reducido y tema oscuro; el audio/TTS no se escuchó.
- Texto en los SVG ≥26 px sobre 640 de ancho equivale a unos 14 px a 360 px; los textos más largos (tarjetas de cuento) son justos en móvil.
- `predecir-portada-luciernagas` es un dibujo esquemático (siluetas); si se quiere ilustración, sustituir por imagen de Gemini manteniendo id y ajustando alt/descripción.
- Los ejemplos de `com.p3.ensenanza-del-texto` usan una enseñanza «a tiempo» y otra «juntos logramos más»; revisar si la redacción de la enseñanza es suficientemente única para 3.º.
- Dos archivos (`primaria-2` y `primaria-3` `inferir-e-interpretar.json`) contienen dos claves del lote cada uno y fichas de otros lotes; se recargaron justo antes de escribir y no se tocó ningún otro campo.
- No se tocaron estado, huellas, BD, specs, componentes ni git.

## Corrección tras la revisión independiente (2026-11-16)

Solo `com.p2.punto-final` y `com.p3.punto-y-comas` (las otras 8 claves no se tocaron). Se quitó el `recursoRef` de `ejemplo-hoy-mira`, `ejemplo-pedro-lee`, `ejemplo-chacra-lee` y `ejemplo-terminal-lee`, para que el resultado no se vea antes de razonarlo; `ejemplo-hoy-mira` ya no alude a ninguna tarjeta. Cada clave conserva 3 recursos, todos usados (desde los momentos de corrección y los pasos). Sin SVG nuevos. Revalidado: `pnpm nudito:validar-banco`, `pnpm typecheck` y `git diff --check`.
