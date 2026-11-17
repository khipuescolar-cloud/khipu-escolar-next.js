# Informe editorial · Primaria lote 13 (Ciencia y Tecnología 4.º)

Fecha: 2026-11-16. Autor: agente Claude (Sonnet). Estado: **escrito y validado técnicamente; pendiente de revisión independiente** (no se declara aprobado).

## Alcance

| Clave | Archivo del banco | Momentos | Recursos | Respuesta de la comprobación |
|---|---|---:|---|---|
| `cyt.p4.adaptaciones` | `adaptaciones.json` | 10 | 2 WebP + 1 SVG | b |
| `cyt.p4.cadena-alimenticia` | `roles-en-el-habitat.json` | 10 | 2 WebP + 1 SVG | c |
| `cyt.p4.cambios-reversibles` | `cambios-de-la-materia.json` | 10 | 2 WebP + 1 SVG | a |
| `cyt.p4.equilibrio-fuerzas` | `fuerzas-y-equilibrio.json` | 10 | 2 WebP + 1 SVG | b |
| `cyt.p4.sistemas-funciones-vitales` | `nutricion-y-alimentacion.json` | 11 | 2 WebP + 1 SVG | c |
| `cyt.p4.zonas-climaticas` | `tierra-y-clima.json` | 10 | 1 WebP + 2 SVG | a |
| `cyt.p4.formas-energia` | `energia-y-sus-formas.json` | 10 | 2 WebP + 1 SVG | b |

Solo se reemplazó el campo `claseGuiada` de cada clave (la de `formas-energia` era un borrador de la muestra). No se tocaron ids, respuestas, dificultad, estado de refuerzo, huellas, BD, specs ni componentes.

Estructura común: idea inicial sin recurso; situación visual; ejemplo 1 (guiado, 2 momentos); ejemplo 2 (razonado, 2 momentos); «Error frecuente» como ejemplo titulado; tres pasos; comprobación nueva con una sola respuesta correcta y distractores plausibles de longitud parecida. Los pasos usan un esquema SVG de método (sin las respuestas de los ejemplos) o ningún recurso, y los momentos sin recurso no aluden a imágenes.

## Recursos y procedencia

Ilustraciones: Z-Image Turbo (Apache-2.0) vía ComfyUI local (`~/comfyui-khipu/gen.py`, 1200×896, WebP). Se inspeccionó cada una con Read antes de integrarla; todas sin texto. Ruta: `public/nudito/ilustraciones/ciencia-tecnologia/primaria-4/<id>-zimage-v1.webp`.

| id | Prompt (resumen, en inglés) | Semilla |
|---|---|---:|
| adaptaciones-vicuna-puna | vicuña pastando en pradera andina, montañas nevadas | 11 |
| adaptaciones-tucan-selva | tucán con pico grande en rama de árbol frutal amazónico, frutas en el extremo de ramas finas | 11 |
| cadena-puna-habitat | pradera de puna con pasto, vicuña en primer plano y puma sobre una roca lejana, **sin personas** | 23 |
| cadena-selva-hojarasca | suelo de selva con hojas caídas, tronco en descomposición y hongos pequeños | 11 |
| cambios-mantequilla-sarten | mantequilla medio derretida en una sartén y niña mirando | 11 |
| cambios-masa-horno | panadero con bandeja de masa cruda junto a horno de ladrillo | 11 |
| equilibrio-carrito-ninos | dos niños empujando un carrito de madera desde lados opuestos | 11 |
| equilibrio-tira-afloja | tira y afloja con cinta roja en el centro (pedido 3 contra 1; salió 2 contra 1 y se ajustó el texto) | 11 |
| sistemas-patio-recreo | recreo: niña con plátano, niño corriendo, gallina con pollitos junto al huerto | 11 |
| sistemas-pelota-atrapar | niño de perfil atrapando una pelota | 11 |
| zonas-rio-tropical | niños con ropa ligera y sombreros junto a un río tropical con palmeras | 11 |
| energia-sala-casa | sala con lámpara encendida, radio, ventilador y niña haciendo tarea | 11 |
| energia-cocina-gas | hornilla a gas con llama azul bajo una olla con agua que humea | 11 |

Se descartó `cadena-puna-habitat` seed 11 (aparecían dos niños no pedidos cerca del puma); se regeneró con seed 23 y «no people». El archivo final es el de seed 23.

SVG propios (viewBox 640×480, texto ≥26 px, renderizados a 640 px y revisados; corregidos solapes de etiquetas y flechas), en `public/nudito/diagramas/ciencia-tecnologia/`: `adaptaciones-metodo.svg`, `cadena-roles.svg`, `cambios-metodo.svg`, `equilibrio-fuerzas.svg`, `sistemas-funciones.svg`, `zonas-mapa-ubicaciones.svg`, `zonas-rayos-y-zonas.svg`, `energia-efectos.svg`.

Alt (≤200 caracteres) y descripción se escribieron después de ver el recurso final.

## Decisiones

- Los ejemplos eligen casos distintos de los de la ficha (vicuña y tucán, pasto-vicuña-puma y hojarasca, mantequilla y pan, carrito y tira y afloja, plátano y pelota, Pucallpa y Madrid, hornilla de gas y ventilador).
- `zonas-climaticas`: la ubicación se razona con un esquema de globo sin zonas (situación y ejemplos) y solo después se muestra el esquema con franjas y rayos (pasos). Se aclara que la zona depende de la ubicación respecto al ecuador y no de la altura. Madrid y Buenos Aires se ubican por hemisferio y lejanía, sin dar coordenadas.
- `cadena-alimenticia`: los pasos usan una cadena distinta (hierba, saltamontes, rana) para no mostrar la conclusión de los ejemplos; se enseña que la flecha va del comido al que come y que los descomponedores devuelven nutrientes que las plantas absorben.
- `cambios-reversibles`: el error frecuente es el azúcar disuelto; la comprobación usa agua-vapor (reversible), con distractores sobre «desaparece» y «sustancia nueva».
- `equilibrio-fuerzas`: el texto se ajustó a lo que muestra cada imagen (un niño y una niña; dos contra uno). Se evitó fricción en la comprobación usando un carrito de mercado con ruedas.
- `formas-energia`: la clase pasa de la linterna al gas (química a térmica y luminosa) y al ventilador (eléctrica a movimiento); el error frecuente aborda la pila.
- `sistemas-funciones-vitales`: 11 momentos; la reproducción se trata en un momento propio de tipo recurso con la gallina y sus pollitos.
- Letras de la comprobación: b, c, a, b, c, a, b.

## Comandos y validación

- Servidor ComfyUI ya activo en 127.0.0.1:8188 (cola compartida con otros agentes; se generó de una en una).
- `pnpm nudito:validar-banco`: 2 238 fichas activas y 27 034 ejercicios válidos.
- `pnpm typecheck`: sin errores.
- `git diff --check`: sin avisos.
- Script propio: ids de momentos y recursos únicos, idea sin recurso, `recursoRef` sin roturas ni recursos sin usar, alt ≤200, archivos existentes, momentos sin recurso sin alusiones a imágenes, un solo tipo `idea` inicial.
- No se ejecutaron navegador, audio ni pruebas de UI.

## Riesgos y pendientes para la revisión independiente

- Revisar que cada narración corresponda a la imagen (en especial vicuñas, tira y afloja 2 contra 1, ventilador girando y radio sin sonido visible).
- `cambios-reversibles`: la mantequilla vuelve a solidificar con calentamiento suave; se mantiene como ejemplo reversible de primaria.
- `zonas-climaticas`: confirmar el nivel de la frase sobre altura y zona.
- Los nombres `equilibrio-fuerzas.svg`, `sistemas-funciones.svg`, etc. son nuevos en la carpeta compartida; no se encontraron referencias previas, pero otros lotes escriben ahí.
- Las ilustraciones son ficción escolar: la vicuña y el puma son representaciones estilizadas, no fotografías.
