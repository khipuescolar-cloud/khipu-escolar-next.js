# Refuerzo de Matemática de primaria · lote 52

| Campo | Valor |
|---|---|
| Fecha | 2026-11-16 |
| Colaborador | Carlos (producto) |
| Agente y modelo | Codex |
| Rama y commits | árbol de trabajo compartido · sin commit |
| Specs afectadas | Ninguna; encargo editorial sin cambio de comportamiento |

## Pedidos del colaborador (textual)

> Eres autor de contenido del refuerzo de primaria de Nudito (Khipu Escolar). Repo: /home/carlos-calderon/Escritorio/StartUp/Asistente Virtual Academico (AVA)/khipu-escolar (muchos cambios sin commitear de otras sesiones y de ~10 agentes en paralelo que trabajan en OTRAS claves: NO uses git reset/checkout/stash/clean ni hagas commit; edita solo tus archivos). Al guardar un JSON edita SOLO el `claseGuiada` de tu clave, releyendo el archivo justo antes de escribir; nunca regraves el archivo desde una copia vieja. Respuesta final breve.
>
> TAREA: lote 52 de Matemática. Escribe/reescribe SOLO el campo `claseGuiada` (formato v1) de estas claves y crea sus recursos:
> - mat.p2.grupos-misma-cantidad
> - mat.p4.el-litro
> - mat.p5.interpretar-representaciones
> - mat.p6.grafico-lineas
> Ubica el archivo de cada clave en `docs/nudito/estado-refuerzo-primaria.json` (campo `archivo`). Ejercicios, ids, respuestas y dificultad quedan intactos; revisa que los ejercicios existentes sean correctos y apropiados al grado y, si hallas un error, repórtalo sin editarlo.
>
> LEE PRIMERO: docs/nudito/INSTRUCCIONES-CONTINUAR-REFUERZO-PRIMARIA.md («Qué debe mostrar y decir cada ficha», «Contrato técnico»), docs/nudito/informe-editorial-primaria-lote-22.md y -25.md (patrón vigente y correcciones) y docs/nudito/revision-lote-22.md, -23.md, -24.md, -25.md (defectos reales encontrados por revisores: evítalos desde el primer borrador). Estructura: 10 momentos, primer momento sin imagen; idea → situación → dos ejemplos distintos → contraejemplo de errores frecuentes → tres pasos → comprobación nueva (opciones, respuesta, mensajeCorrecto, pista). 4–5 recursos por clave, enlazados con `recursoRef` por id. Cada recurso: id, src, alt (≤200 caracteres), descripcion (≤500, idealmente ≤250); escríbelos DESPUÉS de ver el recurso final (rasteriza SVG con chromium/google-chrome --headless --screenshot o cairosvg y míralo con Read). La descripcion debe coincidir EXACTAMENTE con el dibujo.
>
> RECURSOS: SVG como código a mano en public/nudito/diagramas/matematica/ (no se usa generador de imágenes).
>
> LECCIONES OBLIGATORIAS (defectos reales de revisores en lotes 17–25):
> 1. Cada recursoRef corresponde exactamente a lo que narra ese momento; si un momento no tiene recurso no digas «el dibujo/la imagen». Si quitas un recurso de un momento, ajusta la narración.
> 2. Recursos de situación y de ejemplo guiado NO muestran ni nombran la respuesta ni la regla (ni en el dibujo, ni en alt, ni en descripcion): variante «pregunta»; marcadores «?» no deben fijar un valor falso ni dar el valor; ejes/escalas no deben delatar la escala antes del ejemplo.
> 3. Opciones de la comprobación de LONGITUD PAREJA (cuenta caracteres: diferencia ≤3) y la correcta NO es la más larga; varía la letra correcta entre claves; la pista orienta sin entregar la operación ni la respuesta; el enunciado es natural y de respuesta única.
> 4. Contraejemplo: no repetir su título en la narración; no mencionar conceptos no trabajados.
> 5. Voz: sin letras sueltas «a», «x», «y» en la narración; números, fracciones y decimales en palabras en la narración y en las opciones; listas de números en palabras largas son ambiguas al oído: usa nombres/etiquetas y frases cortas; no «parte N de M»; no repetir el título.
> 6. SVG: viewBox 640×480, texto ≥26 px, nada pegado al borde ni solapado, sin `<tspan>` con espacios frágiles (usa `&#160;`), `<title>`, paleta de specs/18 (crema #FCF0D6, índigo #1E2A78, turquesa #0F7C7A, maíz #F2B84B); texto ámbar solo #8A5A00 (contraste ≥4,5:1). Nombres únicos con el tema como prefijo en public/nudito/diagramas/matematica/.
> 7. Rigor: recalcula todo con script; ciencia/lengua factualmente correctas para el grado; frases cortas en 1.º–3.º.
> No toques componentes, specs, estado JSON ni BD.
>
> VALIDA antes de entregar: `pnpm nudito:validar-banco`, `pnpm typecheck`, `git diff --check` sobre tus archivos (si falla por archivos de otro lote en curso, ignóralo y dilo).
>
> - Contraste: texto (<text>) turquesa usa #0C706E (5,2:1), no #0F7C7A; ámbar #8A5A00.
> - NO abras ventanas de navegador visibles: renderiza SVG solo en headless (`google-chrome --headless=new --disable-gpu --no-sandbox --screenshot=... file:///...svg` o cairosvg) y mira el PNG con Read.
> - Lee también docs/nudito/revision-lote-26.md a -33.md (defectos reales hallados por revisores en esas tandas) y evítalos: p. ej. imágenes/alt/descripciones que adelantan la respuesta, narración que dice algo que el dibujo no muestra, opciones de longitud dispar, pistas que entregan la operación, ambigüedad oral de listas de números, momentos sin recurso que dicen «mira», SVG con elementos tapados.
> - Antes de entregar ejecuta el lint mecánico: `pnpm exec tsx scripts/nudito-lint-clase-guiada.ts mat.p2.grupos-misma-cantidad mat.p4.el-litro mat.p5.interpretar-representaciones mat.p6.grafico-lineas` y corrige TODOS los errores que reporte (los avisos revísalos y corrige los razonables). Esto evita defectos de opciones, narración y SVG que antes encontraban los revisores.
> ENTREGA: docs/nudito/informe-editorial-primaria-lote-52.md (tabla clave→archivo→momentos→recursos, decisiones, verificaciones, riesgos, errores de ejercicios existentes) y respuesta de MÁXIMO 6 líneas. No apruebes tu propio lote.

## Decisiones

- Se prepararon cuatro clases v1 de diez momentos y cuatro SVG por clave.
- Las respuestas correctas de las comprobaciones se distribuyeron como `b`, `b`, `a`, `c`.
- Se conservaron íntegros ejercicios, ids, respuestas y dificultad; los defectos preexistentes quedaron solo documentados.

## Cambios realizados

- Cuatro campos `claseGuiada` en los archivos indicados por el estado editorial.
- Dieciséis SVG nuevos en `public/nudito/diagramas/matematica/`.
- Informe `docs/nudito/informe-editorial-primaria-lote-52.md`.

## Validación

- Lint dirigido: cero errores y cero avisos propios; dos observaciones de ejercicios preexistentes.
- Banco válido: 2 238 fichas y 27 034 ejercicios.
- Typecheck correcto.
- `git diff --check` dirigido correcto; SVG rasterizados e inspeccionados en Chrome headless.

## Pendientes y preguntas abiertas

- Revisión editorial independiente y recorrido completo de audio, móvil y movimiento reducido.
- Corregir en otro encargo el error matemático preexistente de `mat.p4.el-litro` `e12` y los riesgos de accesibilidad/longitud registrados en el informe.
