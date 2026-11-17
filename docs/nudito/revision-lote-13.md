# Revisión lote 13 (Ciencia y Tecnología 4.º, 7 claves)

| Clave | Veredicto |
|---|---|
| cyt.p4.adaptaciones | APROBADA |
| cyt.p4.cadena-alimenticia | APROBADA |
| cyt.p4.cambios-reversibles | APROBADA |
| cyt.p4.equilibrio-fuerzas | APROBADA |
| cyt.p4.sistemas-funciones-vitales | APROBADA |
| cyt.p4.zonas-climaticas | APROBADA |
| cyt.p4.formas-energia | APROBADA |

Defectos (todos menores, no bloquean):
- zonas svg `zonas-y-rayos`: la punta del rayo superior (y~619) pisa el borde de la franja polar y el rótulo «Zona polar» solo marca la banda superior. Menor.
- zonas `paso-3`: la frase «en las montañas altas hace más frío por la altura, pero la zona se decide por la ubicación respecto al ecuador» es correcta y adecuada a 4.º (aclara sin desviar).
- cambios `situacion-mantequilla`: la mantequilla con fuego bajo como cambio reversible es una simplificación aceptable de primaria (fusión/solidificación del mismo material); no induce a error mientras no se lleve a fuego fuerte.
- energía `ejemplo-2-observa` (sala-casa): el cable del ventilador se ve pero sale del cuadro, sin enchufe visible; menor.
- energía `ejemplo-1-observa` (cocina-gas): hay una mujer removiendo la olla que la narración no menciona; inocuo.
- cadena `paso-3`: «los hongos transforman restos en nutrientes para el suelo»; el SVG solo muestra restos→hongos, no los nutrientes. Menor.
- `public/nudito/diagramas/ciencia-tecnologia/formas-energia.svg` queda huérfano (solo lo cita refuerzo-preview-temporal/datos.json); no afecta a la clave.

Ilustraciones Z-Image (13 abiertas): sin texto, fieles a alt/descripcion, anatomía plausible (vicuña, tucán, puma, niños), aptas.
Ciencia: sin errores. Una sola respuesta correcta por comprobación; letras b,c,a,b,c,a,b; longitudes parejas.
Recursos: sin refs rotas ni recursos sin usar, idea inicial sin imagen, ≥3 recursos por clave, sin revelaciones previas al razonamiento. SVG a 360 px legibles.

Técnica: validar-banco OK (2238 fichas, 27034 ejercicios), typecheck OK. Ejercicios intactos vs HEAD en 6 claves; energia-y-sus-formas.json perdió un ejercicio del borrador previo (olla en el fogón) y `revisado: null`, aceptado.
Sin comprobar: audio, UI real, lector de pantalla; SVG renderizados con sharp, no navegador; informe editorial no leído.
