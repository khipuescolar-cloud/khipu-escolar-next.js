# Revisión lote 16 (Ciencia y Tecnología 6.º, 7 claves)

| Clave | Veredicto |
|---|---|
| cyt.p6.biodiversidad | CAMBIOS (menor) |
| cyt.p6.cambios-materiales | CAMBIOS (menor) |
| cyt.p6.estados-materia | APROBADA |
| cyt.p6.relieve-terrestre | APROBADA |
| cyt.p6.reproduccion-diversidad | APROBADA |
| cyt.p6.unicelulares-pluricelulares | APROBADA |
| cyt.p6.temperatura-particulas | APROBADA |

Defectos:
- biodiversidad `ejemplo-chacra-razona` / `error-individuos`: el ejemplo de la chacra es diversidad de VARIEDADES de una misma especie (papa), pero `error-individuos` y `paso-1` concluyen «lo que da estabilidad es la variedad de especies». Imprecisión científica: decir en `ejemplo-chacra-razona` «muchas variedades (diversidad dentro de una misma especie)» o en `error-individuos` «variedad de especies y de variedades».
- biodiversidad `ejemplo-selva-observa` (ref selva): narra «otras especies de abejas e insectos»; la ilustración solo muestra una abeja y un colibrí. Menor: decir «el colibrí y otras especies siguen visitando flores».
- cambios svg `modelo` (panel abajo-derecha de la fila de arriba, «Después»): partículas en (410,175) y (588,95), r=10, tocan los bordes izquierdo y derecho del recuadro (x=400 y 600). Moverlas hacia dentro (p. ej. x=425 y x=575).
- cambios `comprobacion`: correcta (c) la más larga (87 vs 79/74): menor, acortar o igualar.
- relieve svg `placas`: la narración habla de «placa continental» y el dibujo solo rotula «Placa oceánica»; menor (rotular).
- temperatura `te-jarra`: el libro abierto con dibujos de niños no distrae en exceso ni es inadecuado (apto, sin letras legibles); aceptable.

Ilustraciones Z-Image (9 abiertas): fieles a alt/descripcion, sin texto, anatomía plausible (llamas, colibrí, hormiga), aptas. Dos piedras, dos crías, dos setas, un valle: coinciden.
Ciencia: sin errores en cambios físico/químico, estados y partículas, subducción Nazca/Sudamericana, reproducción sexual/asexual de papa, unicelular/pluricelular, temperatura y rapidez de partículas. Una sola respuesta correcta en todas las comprobaciones; letras b,c,a,b,c,a,c.
Recursos: sin refs rotas ni recursos sin usar, idea sin imagen, ≥3 recursos por clave, sin revelaciones previas al razonamiento. SVG a 360 px legibles, sin solapes de texto; salvo lo anotado.

Técnica: validar-banco OK (2238 fichas), typecheck OK. Ejercicios intactos vs HEAD en 6 claves; calor-y-temperatura.json difiere además en `ejercicios`, `ejemplos` y `fuentes` (borrador previo de la muestra, aceptado, no es de este lote).
Sin comprobar: audio, UI real, lector de pantalla; SVG renderizados con sharp, no navegador; informe editorial no leído.
