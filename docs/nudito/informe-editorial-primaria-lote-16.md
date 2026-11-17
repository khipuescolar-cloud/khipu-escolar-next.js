# Informe editorial · Lote 16 (Ciencia y Tecnología, 6.º de primaria)

Fecha: 2026-11-16. Estado: **escrito y validado técnicamente; pendiente de revisión independiente**. No se declara aprobado, no se tocaron huellas, BD, estado-refuerzo-primaria.json ni specs.

## Claves, momentos y recursos

Archivos en `src/lib/nudito/conocimiento/banco/ciencia-tecnologia/primaria-6/fichas/` (solo se reemplazó el campo `claseGuiada` de cada clave). Recursos en `public/nudito/ilustraciones/ciencia-tecnologia/primaria-6/`.

| Clave | Archivo | Momentos | Recursos (generado / SVG) | Respuesta |
|---|---|---|---|---|
| cyt.p6.biodiversidad | biodiversidad-y-estabilidad.json | 11 | selva-polinizadores, chacra-papas (2 Z-Image) + respaldos (SVG) | b |
| cyt.p6.cambios-materiales | cambios-quimicos.json | 11 | cocina-mesa (Z-Image) + modelo-particulas, manzana-mitades (2 SVG) | c |
| cyt.p6.estados-materia | estructura-de-la-materia.json | 11 | mesa-objetos (Z-Image) + jugo-jarra-vaso, particulas (2 SVG) | a |
| cyt.p6.relieve-terrestre | dinamica-interna-de-la-tierra.json | 11 | andes-canon, dunas-ica (2 Z-Image) + placas-andes (SVG) | b |
| cyt.p6.reproduccion-diversidad | reproduccion-humana-y-diversidad.json | 11 | llamas (Z-Image) + union-celulas, papa (2 SVG) | c |
| cyt.p6.unicelulares-pluricelulares | organismos-y-celulas-especializadas.json | 10 | suelo-selva (Z-Image) + ameba, tejidos-cuy (2 SVG) | a |
| cyt.p6.temperatura-particulas | calor-y-temperatura.json | 11 | te-jarra (Z-Image) + vasos-termometros, modelo-particulas (2 SVG) | c |

Estructura de cada clase: idea sin imagen, situación visual, modelo o esquema, dos ejemplos (observa + razona), error frecuente como ejemplo, tres pasos, comprobación nueva con una sola respuesta correcta. Los ejercicios, ids, respuestas y dificultad no se modificaron.

## Ilustraciones generadas (Z-Image Turbo vía ComfyUI local)

Procedencia: Z-Image Turbo (Apache-2.0), ejecutado localmente con ComfyUI en `~/comfyui-khipu` (`gen.py`, 1200×896, WebP). Estilo añadido por el script: ilustración escolar cálida, sin texto. Todas inspeccionadas con Read antes de integrar.

| Archivo (`-zimage-v1.webp`) | Semilla | Prompt (resumen) | Observaciones |
|---|---|---|---|
| biodiversidad-selva-polinizadores | 11 | Amazon rainforest edge, flowering branch, bee, hummingbird and butterfly on different flowers | Salió sin mariposa; la narración y la descripción mencionan solo abeja y colibrí |
| biodiversidad-chacra-papas | 12 | Andean farmer woman kneeling beside a woven blanket covered with many potato varieties, terraces in Puno | Aparecen además tres niños; descritos |
| cambios-cocina-mesa | 13 | Sunny Peruvian kitchen table with butter, freshly cut apple half, dough ball and rolling pin | Correcta |
| estados-mesa-objetos | 14 | Wooden table with a river stone, jug of orange juice with empty glass, red balloon | Salieron dos piedras; la narración dice «dos piedras» |
| relieve-andes-canon | 15 | Peruvian Andes, snow-capped mountains, deep canyon with river, terraces | Resultó un valle profundo con niños en un sendero; la narración dice «valle» |
| relieve-dunas-ica | 16 | Ica desert dunes with wind ripples, lone huarango tree | Estilo algo más fotográfico; aceptable |
| reproduccion-llamas | 17 | Two adult llamas (white, brown) and three crias of different colors | Salieron dos crías (marrón y blanca manchada); la narración dice «dos crías» |
| unicelulares-suelo-selva | 18 | Rainforest floor after rain: ant on leaf, mushroom, puddle | Salieron dos setas; narración ajustada |
| temperatura-te-jarra | 19 | Peruvian kitchen table with hot tea cup with steam, glass jug of cool water, clear glass | Aparece un libro abierto con dibujos de niños (no pedido); descrito en la descripción |

Descartada: `cambios-manzana-oscura` (seed 21). El modelo no representó el oscurecimiento de la pulpa; se eliminó el WebP y se sustituyó por el SVG `cambios-manzana-mitades-svg-v1.svg`. No se generó ninguna otra imagen de reintento.

## SVG como código

Los 12 SVG (`*-svg-v1.svg`; viewBox 640×480, texto de 26 px, sin tspans) se generaron con un script Python local y se renderizaron con Chrome headless a 360 px para revisar solapes: biodiversidad-respaldos, cambios-modelo-particulas, cambios-manzana-mitades, estados-jugo-jarra-vaso, estados-particulas, relieve-placas-andes, reproduccion-union-celulas, reproduccion-papa, unicelulares-ameba, unicelulares-tejidos-cuy, temperatura-vasos-termometros, temperatura-modelo-particulas. Se corrigieron en revisión: recuentos desiguales de partículas antes y después, rótulo recortado y flechas flotantes en el corte de placas, trazos fuera del recipiente.

## Decisiones

- Los modelos (partículas, placas, unión de células) van en un momento `recurso` propio antes de los ejemplos y no ilustran la respuesta concreta de cada ejemplo; los ejemplos usan recursos que muestran lo observado.
- Rigor: placa de Nazca bajo la sudamericana; oxidación de la manzana y del hierro como cambios químicos; mantequilla derretida como cambio físico; el gas toma la forma del recipiente; papa de tubérculo como multiplicación a partir de una sola planta frente a semilla por unión de células reproductoras; temperatura como energía cinética promedio, sin hablar de partículas «quietas».
- La narración se ajustó a lo que muestra cada imagen final (cantidad de piedras, crías, setas, valle).
- Alt ≤ 200 caracteres y descripción escrita después de ver el recurso final. Comprobaciones con opciones de longitud parecida; letras: b, c, a, b, c, a, c.
- Los dos recursos antiguos de `temperatura-particulas` (diagrama SVG del borrador) dejaron de usarse en la clase; el archivo `public/nudito/diagramas/ciencia-tecnologia/temperatura-particulas.svg` no se tocó.

## Comandos y resultados

- `pnpm nudito:validar-banco`: banco válido, 2238 fichas activas y 27034 ejercicios.
- `pnpm typecheck`: sin errores. `git diff --check`: sin salida.
- Script propio: ids únicos, primer momento `idea` sin recurso, todo `recursoRef` resuelve y todo recurso se usa, archivos presentes, alt ≤ 200, sin «Atención:» ni «recuerda».
- Generación: `source ~/comfyui-khipu/venv/bin/activate && python ~/comfyui-khipu/gen.py --prompt "..." --out public/nudito/ilustraciones/ciencia-tecnologia/primaria-6/<id>-zimage-v1.webp --seed N` (una a la vez; cada imagen tardó 5-6 min por GPU compartida).

## Riesgos y pendientes

- No se hizo recorrido de navegador, audio ni movimiento reducido; falta revisión independiente factual, pedagógica y visual.
- Las narraciones no se escucharon con voz real; la descripción de cada recurso se añade a la narración del momento, por lo que conviene revisar que no suene repetitiva.
- `temperatura-te-jarra` incluye un libro con dibujos de niños ajeno al tema; si el revisor lo considera distractor, regenerar con otra semilla.
- El archivo `calor-y-temperatura.json` ya tenía cambios sin commitear del borrador de la muestra; solo se reemplazó su `claseGuiada`.

## Correcciones tras la revisión independiente

- biodiversidad: `ejemplo-selva-observa` ya no menciona especies que la imagen no muestra; `ejemplo-chacra-razona` y `error-individuos` distinguen variedades dentro de una especie de especies.
- cambios-materiales: dos partículas del recuadro «Después» del SVG `modelo` movidas hacia dentro; opciones de la comprobación igualadas (84/76/80).
- relieve-terrestre: SVG `placas` ahora rotula «Placa continental» (26 px) y la descripción lo recoge.
- Se reescribieron solo esas tres claves; las demás no se tocaron.
