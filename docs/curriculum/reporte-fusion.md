# Reporte de fusión editorial (dry-run)

Origen: paquete KHIPU-CURRICULUM v0.1. Decisiones editoriales versionadas en data/curriculum/mapeo-fusion.json. No se copian candidatos ni se modifica el banco.

Criterio: se conserva la clave de un tema equivalente; un título amplio puede quedar cubierto por varios temas del mismo grado o un grado vecino. Las dudas de alcance o grado se señalan como conflicto. Las claves propuestas derivan del stable_code. Todos los candidatos siguen como borrador pendiente de validación pedagógica y legal.

Banco leído: 33 temarios, 3839 entradas de tema. Candidatos: 1145.

## Totales

| Emparejados | Cubiertos | Nuevos | Conflictos | Inventario |
|---:|---:|---:|---:|---:|
| 138 | 297 | 14 | 214 | 482 |

Segunda corrida simulada después de incorporar únicamente las claves nuevas: 0 altas.

## Por área

| Área | Emparejados | Cubiertos | Nuevos | Conflictos | Inventario | Total |
|---|---:|---:|---:|---:|---:|---:|
| arte-cultura | 0 | 0 | 0 | 0 | 55 | 55 |
| castellano-segunda-lengua | 0 | 0 | 0 | 0 | 44 | 44 |
| ciencia-tecnologia | 21 | 88 | 3 | 78 | 0 | 190 |
| ciencias-sociales | 0 | 0 | 0 | 0 | 60 | 60 |
| comunicacion | 57 | 89 | 7 | 70 | 0 | 223 |
| dpcc | 0 | 0 | 0 | 0 | 41 | 41 |
| educacion-fisica | 0 | 0 | 0 | 0 | 55 | 55 |
| educacion-religiosa | 0 | 0 | 0 | 0 | 44 | 44 |
| ept | 0 | 0 | 0 | 0 | 30 | 30 |
| ingles | 0 | 0 | 0 | 0 | 66 | 66 |
| matematica | 60 | 120 | 4 | 66 | 0 | 250 |
| personal-social | 0 | 0 | 0 | 0 | 87 | 87 |

## Por grado

| Grado | Emparejados | Cubiertos | Nuevos | Conflictos | Inventario | Total |
|---|---:|---:|---:|---:|---:|---:|
| P1 | 25 | 27 | 0 | 7 | 38 | 97 |
| P2 | 19 | 19 | 0 | 21 | 38 | 97 |
| P3 | 12 | 22 | 1 | 24 | 38 | 97 |
| P4 | 9 | 34 | 2 | 18 | 38 | 101 |
| P5 | 8 | 25 | 2 | 23 | 40 | 98 |
| P6 | 12 | 26 | 2 | 17 | 39 | 96 |
| S1 | 15 | 32 | 0 | 16 | 50 | 113 |
| S2 | 12 | 28 | 0 | 19 | 50 | 109 |
| S3 | 10 | 28 | 0 | 24 | 50 | 112 |
| S4 | 8 | 28 | 0 | 25 | 50 | 111 |
| S5 | 8 | 28 | 7 | 20 | 51 | 114 |

## Ejemplos por área

### matematica

| Código | Título | Decisión | Clave(s) | Motivo |
|---|---|---|---|---|
| KH-P1-MAT-ALG-001 | Patrones de repetición | emparejado | mat.p1.patrones-repeticion | Equivale a un tema del mismo grado. |
| KH-P1-MAT-ALG-002 | Igualdades sencillas | emparejado | mat.p1.igualdades | Misma habilidad en un tema del grado. |
| KH-P1-MAT-ALG-003 | Secuencias de figuras | cubierto | mat.p1.patrones-colores-formas, mat.p1.patrones-repeticion | El banco desglosa este contenido en los temas indicados. |
| KH-P1-MAT-ARI-001 | Conteo hasta 20 | cubierto | mat.p1.contar-hasta-10, mat.p1.contar-hasta-50 | El banco desglosa este contenido en los temas indicados. |
| KH-S5-MAT-ALG-005 | Composición de funciones | nuevo | mat.s5.kh-alg-005 | No hay tema matemático equivalente en S5; la propuesta requiere revisión editorial. |
| KH-S5-MAT-GEO-002 | Vectores introductorios | nuevo | mat.s5.kh-geo-002 | No hay tema matemático equivalente en S5; la propuesta requiere revisión editorial. |
| KH-P1-MAT-ARI-002 | Conteo hasta 100 | conflicto | — | Contenido similar en grado vecino; validar progresión. |
| KH-P1-MAT-GEO-002 | Posiciones espaciales | conflicto | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |

### comunicacion

| Código | Título | Decisión | Clave(s) | Motivo |
|---|---|---|---|---|
| KH-P1-COM-ESC-001 | Escritura del nombre | emparejado | com.p1.escribir-mi-nombre | Misma habilidad en un tema del grado. |
| KH-P1-COM-ESC-003 | Escritura de oraciones | emparejado | com.p1.escribo-oraciones | Misma habilidad en un tema del grado. |
| KH-P1-COM-ESC-002 | Escritura de palabras | cubierto | com.p1.separar-palabras, com.p1.formar-palabras-con-silabas | El banco desarrolla el contenido en varios temas. |
| KH-P1-COM-LEC-001 | Reconocimiento de letras | cubierto | com.p1.el-abecedario, com.p1.las-vocales | El banco desglosa este contenido en los temas indicados. |
| KH-P3-COM-RVB-001 | Analogías simples | nuevo | com.p3.kh-rvb-001 | El banco del grado no contiene este contenido ni un desglose equivalente. |
| KH-P4-COM-RVB-001 | Analogías | nuevo | com.p4.kh-rvb-001 | El banco del grado no contiene este contenido ni un desglose equivalente. |
| KH-P2-COM-ESC-001 | Párrafos breves | conflicto | — | El párrafo se desarrolla explícitamente en P3; validar grado. |
| KH-P2-COM-ESC-003 | Notas y avisos | conflicto | — | Escribir una nota aparece en P1; los avisos se desarrollan en P4. Revisar progresión de grado. |

### ciencia-tecnologia

| Código | Título | Decisión | Clave(s) | Motivo |
|---|---|---|---|---|
| KH-P1-CYT-BIO-001 | Partes del cuerpo | emparejado | cyt.p1.partes-del-cuerpo | Equivale a un tema del mismo grado. |
| KH-P1-CYT-BIO-002 | Cinco sentidos | emparejado | cyt.p1.los-cinco-sentidos | Equivale a un tema del mismo grado. |
| KH-P1-CYT-BIO-003 | Animales del entorno | cubierto | cyt.p1.animales-tierra-agua-aire, cyt.p1.animales-domesticos-silvestres, cyt.p1.respeto-animales-silvestres, cyt.p1.animales-frio-calor | El banco desarrolla el contenido en varios temas. |
| KH-P1-CYT-BIO-004 | Plantas del entorno | cubierto | cyt.p1.cuidado-de-las-plantas, cyt.p1.plantas-de-mi-comunidad, cyt.p1.que-necesita-una-planta | El banco desarrolla el contenido en varios temas. |
| KH-S5-CYT-BIO-003 | Salud pública | nuevo | cyt.s5.kh-bio-003 | El banco de S5 no desarrolla este contenido; requiere propuesta editorial. |
| KH-S5-CYT-QUI-002 | Equilibrio químico introductorio | nuevo | cyt.s5.kh-qui-002 | El banco de S5 no desarrolla este contenido; requiere propuesta editorial. |
| KH-P1-CYT-FIS-001 | Luz y sombra | conflicto | — | La sombra y fuentes de luz se estudian en P2; validar grado. |
| KH-P1-CYT-FIS-002 | Movimiento de objetos | conflicto | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |


## Emparejado

| Código | Título | Área | Grado | Disciplina | Clave(s) | Motivo |
|---|---|---|---|---|---|---|
| KH-P1-COM-ESC-001 | Escritura del nombre | comunicacion | P1 | escritura | com.p1.escribir-mi-nombre | Misma habilidad en un tema del grado. |
| KH-P1-COM-ESC-003 | Escritura de oraciones | comunicacion | P1 | escritura | com.p1.escribo-oraciones | Misma habilidad en un tema del grado. |
| KH-P1-COM-GRA-001 | Mayúscula inicial | comunicacion | P1 | lenguaje | com.p1.mayuscula-al-inicio | Misma habilidad en un tema del grado. |
| KH-P1-COM-GRA-002 | Punto final | comunicacion | P1 | lenguaje | com.p1.punto-al-final | Equivale a un tema del mismo grado. |
| KH-P1-COM-LEC-005 | Lectura de oraciones | comunicacion | P1 | comprension-lectora | com.p1.leer-oraciones-cortas | Un tema del mismo grado cubre la misma habilidad. |
| KH-P1-COM-LIT-003 | Adivinanzas | comunicacion | P1 | literatura | com.p1.adivinanzas | Misma habilidad en un tema del grado. |
| KH-P1-COM-ORA-003 | Expresión de experiencias | comunicacion | P1 | oralidad | com.p1.contar-una-experiencia | Misma habilidad en un tema del grado. |
| KH-P1-COM-ORA-004 | Turnos de palabra | comunicacion | P1 | oralidad | com.p1.normas-para-conversar | Misma habilidad en un tema del grado. |
| KH-P1-COM-RVB-001 | Asociación de palabras | comunicacion | P1 | razonamiento-verbal | com.p1.agrupar-palabras | Misma habilidad en un tema del grado. |
| KH-P1-COM-RVB-002 | Categorías semánticas | comunicacion | P1 | razonamiento-verbal | com.p1.agrupar-palabras | Misma habilidad en un tema del grado. |
| KH-P1-CYT-BIO-001 | Partes del cuerpo | ciencia-tecnologia | P1 | biologia | cyt.p1.partes-del-cuerpo | Equivale a un tema del mismo grado. |
| KH-P1-CYT-BIO-002 | Cinco sentidos | ciencia-tecnologia | P1 | biologia | cyt.p1.los-cinco-sentidos | Equivale a un tema del mismo grado. |
| KH-P1-CYT-BIO-005 | Hábitos de higiene | ciencia-tecnologia | P1 | biologia | cyt.p1.higiene-personal | Un tema del mismo grado cubre la misma habilidad. |
| KH-P1-CYT-TIE-003 | Cuidado de plantas | ciencia-tecnologia | P1 | tierra-universo | cyt.p1.cuidado-de-las-plantas | Equivale a un tema del mismo grado. |
| KH-P1-MAT-ALG-001 | Patrones de repetición | matematica | P1 | algebra | mat.p1.patrones-repeticion | Equivale a un tema del mismo grado. |
| KH-P1-MAT-ALG-002 | Igualdades sencillas | matematica | P1 | algebra | mat.p1.igualdades | Misma habilidad en un tema del grado. |
| KH-P1-MAT-ARI-003 | Correspondencia uno a uno | matematica | P1 | aritmetica | mat.p1.correspondencia-uno-a-uno | Equivale a un tema del mismo grado. |
| KH-P1-MAT-ARI-006 | Descomposición de números | matematica | P1 | aritmetica | mat.p1.descomponer-hasta-10 | Misma habilidad en un tema del grado. |
| KH-P1-MAT-ARI-007 | Adición sin canje | matematica | P1 | aritmetica | mat.p1.suma-columna-sin-canje | Misma habilidad en un tema del grado. |
| KH-P1-MAT-ARI-008 | Sustracción sin canje | matematica | P1 | aritmetica | mat.p1.resta-columna-sin-canje | Misma habilidad en un tema del grado. |
| KH-P1-MAT-ARI-009 | Problemas de juntar | matematica | P1 | aritmetica | mat.p1.problemas-juntar | Equivale a un tema del mismo grado. |
| KH-P1-MAT-ARI-010 | Problemas de quitar | matematica | P1 | aritmetica | mat.p1.problemas-quitar | Equivale a un tema del mismo grado. |
| KH-P1-MAT-EST-003 | Clasificación de objetos | matematica | P1 | estadistica | mat.p1.clasificar-por-forma | Misma habilidad en un tema del grado. |
| KH-P1-MAT-GEO-005 | Comparación de longitudes | matematica | P1 | geometria | mat.p1.comparar-longitudes | Un tema del mismo grado cubre la misma habilidad. |
| KH-P1-MAT-RMA-002 | Problemas con dibujos | matematica | P1 | aritmetica | mat.p1.problemas-con-dibujos | Equivale a un tema del mismo grado. |
| KH-P2-COM-GRA-001 | Sustantivos | comunicacion | P2 | lenguaje | com.p2.sustantivos-comunes-y-propios | Misma habilidad en un tema del grado. |
| KH-P2-COM-GRA-002 | Adjetivos | comunicacion | P2 | lenguaje | com.p2.adjetivos | Equivale a un tema del mismo grado. |
| KH-P2-COM-LEC-002 | Secuencia de acontecimientos | comunicacion | P2 | comprension-lectora | com.p2.secuencia-de-hechos | Un tema del mismo grado cubre la misma habilidad. |
| KH-P2-COM-LEC-004 | Identificación de personajes | comunicacion | P2 | comprension-lectora | com.p2.como-son-los-personajes | Misma habilidad en un tema del grado. |
| KH-P2-COM-LEC-005 | Inferencias simples | comunicacion | P2 | comprension-lectora | com.p2.predecir-el-final | Misma habilidad en un tema del grado. |
| KH-P2-COM-LIT-001 | Fábulas | comunicacion | P2 | literatura | com.p2.leer-una-fabula | Misma habilidad en un tema del grado. |
| KH-P2-COM-RVB-001 | Sinónimos | comunicacion | P2 | razonamiento-verbal | com.p2.sinonimos | Equivale a un tema del mismo grado. |
| KH-P2-COM-RVB-002 | Antónimos | comunicacion | P2 | razonamiento-verbal | com.p2.antonimos | Equivale a un tema del mismo grado. |
| KH-P2-COM-RVB-003 | Familias de palabras | comunicacion | P2 | razonamiento-verbal | com.p2.familia-de-palabras | Un tema del mismo grado cubre la misma habilidad. |
| KH-P2-CYT-BIO-001 | Ciclo de vida de plantas | ciencia-tecnologia | P2 | biologia | cyt.p2.ciclo-de-vida-planta | Un tema del mismo grado cubre la misma habilidad. |
| KH-P2-CYT-TEC-002 | Evaluación de un objeto sencillo | ciencia-tecnologia | P2 | tecnologia | cyt.p2.probar-si-funciona | Misma habilidad en un tema del grado. |
| KH-P2-MAT-ALG-001 | Patrones aditivos | matematica | P2 | algebra | mat.p2.patrones-aditivos | Equivale a un tema del mismo grado. |
| KH-P2-MAT-ARI-002 | Valor posicional | matematica | P2 | aritmetica | mat.p2.valor-posicional | Equivale a un tema del mismo grado. |
| KH-P2-MAT-ARI-004 | Ordenación numérica | matematica | P2 | aritmetica | mat.p2.ordenar-dos-cifras | Misma habilidad en un tema del grado. |
| KH-P2-MAT-ARI-005 | Adición con canje | matematica | P2 | aritmetica | mat.p2.suma-con-canje | Misma habilidad en un tema del grado. |
| KH-P2-MAT-ARI-006 | Sustracción con canje | matematica | P2 | aritmetica | mat.p2.resta-con-canje | Misma habilidad en un tema del grado. |
| KH-P2-MAT-ARI-009 | Repartos iguales | matematica | P2 | aritmetica | mat.p2.repartir-para-igualar | Misma habilidad en un tema del grado. |
| KH-P2-MAT-GEO-001 | Figuras planas | matematica | P2 | geometria | mat.p2.figuras-planas | Equivale a un tema del mismo grado. |
| KH-P2-MAT-GEO-004 | Calendario | matematica | P2 | geometria | mat.p2.calendario | Misma habilidad en un tema del grado. |
| KH-P3-COM-ESC-002 | Cartas y mensajes | comunicacion | P3 | escritura | com.p3.leer-una-carta | Misma habilidad en un tema del grado. |
| KH-P3-COM-GRA-002 | Tiempos verbales básicos | comunicacion | P3 | lenguaje | com.p3.tiempos-del-verbo | Misma habilidad en un tema del grado. |
| KH-P3-COM-LEC-003 | Textos informativos | comunicacion | P3 | comprension-lectora | com.p3.leer-texto-informativo | Un tema del mismo grado cubre la misma habilidad. |
| KH-P3-COM-LIT-002 | Leyendas | comunicacion | P3 | literatura | com.p3.leer-una-leyenda | Misma habilidad en un tema del grado. |
| KH-P3-COM-ORA-001 | Narración oral | comunicacion | P3 | oralidad | com.p3.narrar-con-orden-y-conectores | Misma habilidad en un tema del grado. |
| KH-P3-COM-ORA-002 | Exposición organizada | comunicacion | P3 | oralidad | com.p3.exposicion-breve | Misma habilidad en un tema del grado. |
| KH-P3-CYT-TEC-002 | Selección de materiales | ciencia-tecnologia | P3 | tecnologia | cyt.p3.seleccionar-materiales-por-propiedades | Un tema del mismo grado cubre la misma habilidad. |
| KH-P3-MAT-ALG-001 | Patrones numéricos | matematica | P3 | algebra | mat.p3.patrones-numericos | Misma habilidad en un tema del grado. |
| KH-P3-MAT-ARI-003 | Valor posicional | matematica | P3 | aritmetica | mat.p3.valor-posicional | Misma habilidad en un tema del grado. |
| KH-P3-MAT-ARI-008 | Fracciones como partes de un todo | matematica | P3 | aritmetica | mat.p3.fracciones-parte-todo | Misma habilidad en un tema del grado. |
| KH-P3-MAT-ARI-010 | Problemas multiplicativos | matematica | P3 | aritmetica | mat.p3.problemas-dos-etapas-mixtas | Un tema del mismo grado cubre la misma habilidad. |
| KH-P3-MAT-GEO-002 | Perímetro | matematica | P3 | geometria | mat.p3.perimetro-inicial | Misma habilidad en un tema del grado. |
| KH-P4-COM-ESC-002 | Textos instructivos | comunicacion | P4 | escritura | com.p4.texto-instructivo | Misma habilidad en un tema del grado. |
| KH-P4-COM-GRA-003 | Conectores | comunicacion | P4 | lenguaje | com.p4.conectores-basicos | Misma habilidad en un tema del grado. |
| KH-P4-CYT-FIS-001 | Formas de energía | ciencia-tecnologia | P4 | fisica | cyt.p4.formas-energia | Equivale a un tema del mismo grado. |
| KH-P4-CYT-TEC-001 | Evaluación de prototipos | ciencia-tecnologia | P4 | tecnologia | cyt.p4.prueba-de-funcionamiento | Un tema del mismo grado cubre la misma habilidad. |
| KH-P4-CYT-TIE-001 | Recursos naturales | ciencia-tecnologia | P4 | tierra-universo | cyt.p4.fuentes-renovables-no-renovables | Misma habilidad en un tema del grado. |
| KH-P4-MAT-ALG-001 | Patrones multiplicativos | matematica | P4 | algebra | mat.p4.patrones-multiplicativos | Equivale a un tema del mismo grado. |
| KH-P4-MAT-ALG-003 | Relaciones de cambio | matematica | P4 | algebra | mat.p4.justificar-relacion-cambio | Un tema del mismo grado cubre la misma habilidad. |
| KH-P4-MAT-ARI-006 | Fracciones equivalentes | matematica | P4 | aritmetica | mat.p4.fracciones-equivalentes | Equivale a un tema del mismo grado. |
| KH-P4-MAT-RMA-001 | Problemas de varias operaciones | matematica | P4 | aritmetica | mat.p4.problemas-cuatro-operaciones | Un tema del mismo grado cubre la misma habilidad. |
| KH-P5-COM-LEC-002 | Inferencias complejas | comunicacion | P5 | comprension-lectora | com.p5.inferencias | Misma habilidad en un tema del grado. |
| KH-P5-COM-LEC-004 | Lectura de gráficos | comunicacion | P5 | comprension-lectora | com.p5.lectura-de-graficos-de-barras | Misma habilidad en un tema del grado. |
| KH-P5-MAT-ALG-002 | Ecuaciones sencillas | matematica | P5 | algebra | mat.p5.ecuaciones-simples | Un tema del mismo grado cubre la misma habilidad. |
| KH-P5-MAT-ARI-002 | Fracciones y decimales | matematica | P5 | aritmetica | mat.p5.fracciones-decimales | Equivale a un tema del mismo grado. |
| KH-P5-MAT-ARI-003 | Multiplicación de fracciones | matematica | P5 | aritmetica | mat.p5.multiplicacion-fracciones | Equivale a un tema del mismo grado. |
| KH-P5-MAT-ARI-007 | Problemas de proporcionalidad | matematica | P5 | aritmetica | mat.p5.problemas-proporcionalidad | Equivale a un tema del mismo grado. |
| KH-P5-MAT-ARI-008 | Operaciones combinadas | matematica | P5 | aritmetica | mat.p5.operaciones-combinadas | Equivale a un tema del mismo grado. |
| KH-P5-MAT-EST-001 | Media aritmética | matematica | P5 | estadistica | mat.p5.media-aritmetica | Equivale a un tema del mismo grado. |
| KH-P6-COM-ESC-004 | Citación inicial | comunicacion | P6 | escritura | com.p6.citas-y-parafrasis | Misma habilidad en un tema del grado. |
| KH-P6-COM-GRA-001 | Oraciones compuestas introductorias | comunicacion | P6 | lenguaje | com.p6.oracion-simple-y-compuesta | Misma habilidad en un tema del grado. |
| KH-P6-CYT-BIO-002 | Salud y prevención | ciencia-tecnologia | P6 | biologia | cyt.p6.prevencion-de-contagios | Un tema del mismo grado cubre la misma habilidad. |
| KH-P6-CYT-BIO-003 | Herencia introductoria | ciencia-tecnologia | P6 | biologia | cyt.p6.herencia-genes | Misma habilidad en un tema del grado. |
| KH-P6-CYT-TEC-002 | Evaluación del impacto | ciencia-tecnologia | P6 | tecnologia | cyt.p6.impactos-de-la-solucion | Misma habilidad en un tema del grado. |
| KH-P6-CYT-TIE-001 | Sistema solar | ciencia-tecnologia | P6 | tierra-universo | cyt.p6.sistema-solar | Equivale a un tema del mismo grado. |
| KH-P6-CYT-TIE-004 | Cambio climático | ciencia-tecnologia | P6 | tierra-universo | cyt.p6.efecto-invernadero-cambio-climatico | Un tema del mismo grado cubre la misma habilidad. |
| KH-P6-MAT-ARI-002 | Operaciones con decimales | matematica | P6 | aritmetica | mat.p6.operaciones-decimales | Equivale a un tema del mismo grado. |
| KH-P6-MAT-ARI-003 | Porcentajes | matematica | P6 | aritmetica | mat.p6.porcentajes | Equivale a un tema del mismo grado. |
| KH-P6-MAT-ARI-006 | Problemas financieros cotidianos | matematica | P6 | aritmetica | mat.p6.soles-y-centimos | Misma habilidad en un tema del grado. |
| KH-P6-MAT-EST-003 | Lectura crítica de gráficos | matematica | P6 | estadistica | mat.p6.graficos-en-medios | Un tema del mismo grado cubre la misma habilidad. |
| KH-P6-MAT-GEO-002 | Circunferencia y círculo | matematica | P6 | geometria | mat.p6.circunferencia-circulo | Equivale a un tema del mismo grado. |
| KH-S1-COM-ESC-004 | Textos explicativos | comunicacion | S1 | escritura | com.s1.escribo-un-texto-expositivo | Misma habilidad en un tema del grado. |
| KH-S1-COM-LEC-004 | Lectura de textos discontinuos | comunicacion | S1 | comprension-lectora | com.s1.textos-continuos-discontinuos-y-mixtos | Un tema del mismo grado cubre la misma habilidad. |
| KH-S1-COM-LIT-001 | Géneros literarios | comunicacion | S1 | literatura | com.s1.generos-literarios | Equivale a un tema del mismo grado. |
| KH-S1-COM-LIT-002 | Mitos y leyendas | comunicacion | S1 | literatura | com.s1.mito-y-leyenda-peruanos | Un tema del mismo grado cubre la misma habilidad. |
| KH-S1-COM-LIT-003 | Cuento literario | comunicacion | S1 | literatura | com.s1.estructura-del-cuento-literario | Un tema del mismo grado cubre la misma habilidad. |
| KH-S1-COM-ORA-001 | Exposición oral | comunicacion | S1 | oralidad | com.s1.planificar-una-exposicion | Un tema del mismo grado cubre la misma habilidad. |
| KH-S1-COM-RVB-002 | Relaciones de sinonimia | comunicacion | S1 | razonamiento-verbal | com.s1.sinonimia-y-antonimia-contextual | Misma habilidad en un tema del grado. |
| KH-S1-COM-RVB-003 | Término excluido | comunicacion | S1 | razonamiento-verbal | com.s1.termino-excluido | Equivale a un tema del mismo grado. |
| KH-S1-CYT-QUI-003 | Cambios físicos y químicos | ciencia-tecnologia | S1 | quimica | cyt.s1.cambios-fisicos-quimicos | Equivale a un tema del mismo grado. |
| KH-S1-MAT-ALG-002 | Reducción de términos semejantes | matematica | S1 | algebra | mat.s1.terminos-semejantes | Equivale a un tema del mismo grado. |
| KH-S1-MAT-ALG-003 | Ecuaciones lineales | matematica | S1 | algebra | mat.s1.ecuaciones-lineales | Equivale a un tema del mismo grado. |
| KH-S1-MAT-ARI-001 | Números enteros | matematica | S1 | aritmetica | mat.s1.numeros-enteros | Equivale a un tema del mismo grado. |
| KH-S1-MAT-ARI-005 | Razones y proporciones | matematica | S1 | aritmetica | mat.s1.razon-aritmetica-geometrica | Un tema del mismo grado cubre la misma habilidad. |
| KH-S1-MAT-EST-001 | Tablas de frecuencia | matematica | S1 | estadistica | mat.s1.tabla-frecuencias-s1 | Un tema del mismo grado cubre la misma habilidad. |
| KH-S1-MAT-GEO-002 | Perímetros y áreas | matematica | S1 | geometria | mat.s1.perimetro-area-poligonos | Un tema del mismo grado cubre la misma habilidad. |
| KH-S2-COM-ESC-002 | Artículos de opinión | comunicacion | S2 | escritura | com.s2.articulo-de-opinion | Misma habilidad en un tema del grado. |
| KH-S2-COM-GRA-004 | Concordancia | comunicacion | S2 | lenguaje | com.s2.corregir-errores-de-concordancia | Misma habilidad en un tema del grado. |
| KH-S2-COM-LIT-003 | Análisis de personajes | comunicacion | S2 | literatura | com.s2.evolucion-de-los-personajes | Misma habilidad en un tema del grado. |
| KH-S2-COM-ORA-002 | Exposición sustentada | comunicacion | S2 | oralidad | com.s2.exposicion-con-fuentes-citadas | Misma habilidad en un tema del grado. |
| KH-S2-COM-RVB-002 | Analogías complejas | comunicacion | S2 | razonamiento-verbal | com.s2.analogias-verbales | Un tema del mismo grado cubre la misma habilidad. |
| KH-S2-CYT-IND-002 | Diseño de experiencias | ciencia-tecnologia | S2 | indagacion | cyt.s2.diseno-con-control-de-variables | Misma habilidad en un tema del grado. |
| KH-S2-CYT-TIE-001 | Ciclos biogeoquímicos | ciencia-tecnologia | S2 | tierra-universo | cyt.s2.ciclos-biogeoquimicos | Equivale a un tema del mismo grado. |
| KH-S2-MAT-ALG-002 | Productos algebraicos | matematica | S2 | algebra | mat.s2.multiplicacion-polinomios | Misma habilidad en un tema del grado. |
| KH-S2-MAT-ALG-004 | Funciones lineales | matematica | S2 | algebra | mat.s2.lineal-vs-afin | Un tema del mismo grado cubre la misma habilidad. |
| KH-S2-MAT-ARI-004 | Potencias y raíces | matematica | S2 | aritmetica | mat.s2.potencias-raices | Equivale a un tema del mismo grado. |
| KH-S2-MAT-EST-001 | Media mediana y moda | matematica | S2 | estadistica | mat.s2.mtc-tabla-frecuencias | Un tema del mismo grado cubre la misma habilidad. |
| KH-S2-MAT-GEO-003 | Áreas de figuras compuestas | matematica | S2 | geometria | mat.s2.area-figuras-compuestas | Un tema del mismo grado cubre la misma habilidad. |
| KH-S3-COM-ESC-002 | Informes académicos | comunicacion | S3 | escritura | com.s3.informe-de-investigacion-escolar | Misma habilidad en un tema del grado. |
| KH-S3-COM-ESC-003 | Referencias bibliográficas iniciales | comunicacion | S3 | escritura | com.s3.referencias-con-normas-apa | Misma habilidad en un tema del grado. |
| KH-S3-COM-GRA-001 | Oración compuesta | comunicacion | S3 | lenguaje | com.s3.oracion-compuesta-coordinada | Un tema del mismo grado cubre la misma habilidad. |
| KH-S3-COM-GRA-004 | Uso de conectores | comunicacion | S3 | lenguaje | com.s3.conectores-concesivos-y-condicionales | Misma habilidad en un tema del grado. |
| KH-S3-COM-LEC-002 | Evaluación de fuentes | comunicacion | S3 | comprension-lectora | com.s3.validez-de-la-informacion-escrita | Misma habilidad en un tema del grado. |
| KH-S3-COM-RVB-001 | Inferencias | comunicacion | S3 | razonamiento-verbal | com.s3.inferencias-con-informacion-de-detalle | Misma habilidad en un tema del grado. |
| KH-S3-MAT-ALG-001 | Productos notables | matematica | S3 | algebra | mat.s3.productos-notables-areas | Misma habilidad en un tema del grado. |
| KH-S3-MAT-ARI-003 | Notación científica | matematica | S3 | aritmetica | mat.s3.notacion-cientifica | Equivale a un tema del mismo grado. |
| KH-S3-MAT-ARI-004 | Interés simple | matematica | S3 | aritmetica | mat.s3.interes-simple | Equivale a un tema del mismo grado. |
| KH-S3-MAT-GEO-001 | Semejanza | matematica | S3 | geometria | mat.s3.semejanza-razones | Misma habilidad en un tema del grado. |
| KH-S4-COM-ESC-002 | Textos persuasivos | comunicacion | S4 | escritura | com.s4.texto-persuasivo-con-ethos-pathos-y-logos | Misma habilidad en un tema del grado. |
| KH-S4-COM-LEC-002 | Lectura intertextual | comunicacion | S4 | comprension-lectora | com.s4.intertextualidad-alusion-y-parodia | Misma habilidad en un tema del grado. |
| KH-S4-CYT-BIO-003 | Homeostasis | ciencia-tecnologia | S4 | biologia | cyt.s4.homeostasis-retroalimentacion | Misma habilidad en un tema del grado. |
| KH-S4-CYT-IND-003 | Explicación científica | ciencia-tecnologia | S4 | indagacion | cyt.s4.argumentar-con-evidencia | Misma habilidad en un tema del grado. |
| KH-S4-MAT-ALG-004 | Expresiones racionales | matematica | S4 | algebra | mat.s4.fracciones-algebraicas | Misma habilidad en un tema del grado. |
| KH-S4-MAT-ARI-002 | Interés compuesto | matematica | S4 | aritmetica | mat.s4.interes-compuesto | Equivale a un tema del mismo grado. |
| KH-S4-MAT-EST-001 | Probabilidad condicional introductoria | matematica | S4 | estadistica | mat.s4.probabilidad-condicional | Un tema del mismo grado cubre la misma habilidad. |
| KH-S4-MAT-TRI-001 | Razones trigonométricas | matematica | S4 | trigonometria | mat.s4.razones-angulos-no-notables | Un tema del mismo grado cubre la misma habilidad. |
| KH-S5-COM-ESC-001 | Ensayo argumentativo | comunicacion | S5 | escritura | com.s5.ensayo-academico-argumentativo | Un tema del mismo grado cubre la misma habilidad. |
| KH-S5-COM-LEC-004 | Evaluación de información | comunicacion | S5 | comprension-lectora | com.s5.infodemia-y-verificacion | Misma habilidad en un tema del grado. |
| KH-S5-COM-LIT-001 | Literatura peruana contemporánea | comunicacion | S5 | literatura | com.s5.narrativa-peruana-contemporanea | Un tema del mismo grado cubre la misma habilidad. |
| KH-S5-COM-LIT-002 | Literatura universal comparada | comunicacion | S5 | literatura | com.s5.comparar-literatura-peruana-y-universal | Misma habilidad en un tema del grado. |
| KH-S5-COM-ORA-002 | Debate con evidencias | comunicacion | S5 | oralidad | com.s5.debate-academico-con-evidencias | Un tema del mismo grado cubre la misma habilidad. |
| KH-S5-CYT-FIS-003 | Física contemporánea introductoria | ciencia-tecnologia | S5 | fisica | cyt.s5.relatividad-y-cuantica | Misma habilidad en un tema del grado. |
| KH-S5-MAT-ALG-003 | Sistemas no lineales introductorios | matematica | S5 | algebra | mat.s5.sistemas-lineal-cuadratica | Misma habilidad en un tema del grado. |
| KH-S5-MAT-EST-001 | Probabilidad compuesta | matematica | S5 | estadistica | mat.s5.comparar-sucesos-compuestos | Un tema del mismo grado cubre la misma habilidad. |

## Cubierto

| Código | Título | Área | Grado | Disciplina | Clave(s) | Motivo |
|---|---|---|---|---|---|---|
| KH-P1-COM-ESC-002 | Escritura de palabras | comunicacion | P1 | escritura | com.p1.separar-palabras, com.p1.formar-palabras-con-silabas | El banco desarrolla el contenido en varios temas. |
| KH-P1-COM-LEC-001 | Reconocimiento de letras | comunicacion | P1 | comprension-lectora | com.p1.el-abecedario, com.p1.las-vocales | El banco desglosa este contenido en los temas indicados. |
| KH-P1-COM-LEC-002 | Correspondencia sonido grafía | comunicacion | P1 | comprension-lectora | com.p1.sonido-inicial, com.p1.las-vocales | El banco desglosa este contenido en los temas indicados. |
| KH-P1-COM-LEC-003 | Lectura de sílabas | comunicacion | P1 | comprension-lectora | com.p1.formar-palabras-con-silabas, com.p1.contar-silabas | El banco desglosa este contenido en los temas indicados. |
| KH-P1-COM-LEC-004 | Lectura de palabras | comunicacion | P1 | comprension-lectora | com.p1.leer-palabras-con-imagenes, com.p1.leer-nombres-y-carteles | El banco desarrolla el contenido en varios temas. |
| KH-P1-COM-LEC-006 | Comprensión de cuentos breves | comunicacion | P1 | comprension-lectora | com.p1.leer-un-cuento, com.p1.personajes | El banco desglosa este contenido en los temas indicados. |
| KH-P1-COM-LIT-001 | Cuentos infantiles | comunicacion | P1 | literatura | com.p1.leer-un-cuento, com.p1.renarrar-un-cuento | El banco desglosa este contenido en los temas indicados. |
| KH-P1-COM-LIT-002 | Rimas | comunicacion | P1 | literatura | com.p1.rimas-y-trabalenguas, com.p1.palabras-que-riman | El banco desglosa este contenido en los temas indicados. |
| KH-P1-COM-ORA-001 | Presentación personal | comunicacion | P1 | oralidad | com.p1.presentarme, com.p1.mi-ficha-personal | El banco desglosa este contenido en los temas indicados. |
| KH-P1-COM-ORA-002 | Escucha y conversación | comunicacion | P1 | oralidad | com.p1.normas-para-conversar, com.p1.de-que-trata-lo-que-escucho | El banco desglosa este contenido en los temas indicados. |
| KH-P1-CYT-BIO-003 | Animales del entorno | ciencia-tecnologia | P1 | biologia | cyt.p1.animales-tierra-agua-aire, cyt.p1.animales-domesticos-silvestres, cyt.p1.respeto-animales-silvestres, cyt.p1.animales-frio-calor | El banco desarrolla el contenido en varios temas. |
| KH-P1-CYT-BIO-004 | Plantas del entorno | ciencia-tecnologia | P1 | biologia | cyt.p1.cuidado-de-las-plantas, cyt.p1.plantas-de-mi-comunidad, cyt.p1.que-necesita-una-planta | El banco desarrolla el contenido en varios temas. |
| KH-P1-CYT-IND-001 | Observación y preguntas | ciencia-tecnologia | P1 | indagacion | cyt.p1.preguntas-sobre-lo-que-observo, cyt.p1.usar-sentidos-para-observar | El banco desglosa este contenido en los temas indicados. |
| KH-P1-CYT-IND-002 | Registro mediante dibujos | ciencia-tecnologia | P1 | indagacion | cyt.p1.cuadro-de-observaciones, cyt.p1.dibujar-mi-solucion | El banco desglosa este contenido en los temas indicados. |
| KH-P1-CYT-IND-003 | Comparación de objetos | ciencia-tecnologia | P1 | indagacion | cyt.p1.clasificar-objetos, cyt.p1.pesados-y-livianos | El banco desglosa este contenido en los temas indicados. |
| KH-P1-CYT-TEC-001 | Construcción de objetos sencillos | ciencia-tecnologia | P1 | tecnologia | cyt.p1.pasos-para-construir, cyt.p1.dibujar-mi-solucion | El banco desglosa este contenido en los temas indicados. |
| KH-P1-CYT-TEC-002 | Uso seguro de herramientas | ciencia-tecnologia | P1 | tecnologia | cyt.p1.uso-seguro-de-objetos, cyt.p1.tijeras-y-herramientas-con-cuidado | El banco desarrolla el contenido en varios temas. |
| KH-P1-CYT-TIE-002 | Uso del agua | ciencia-tecnologia | P1 | tierra-universo | cyt.p1.usos-del-agua, cyt.p1.cuidar-el-agua | El banco desarrolla el contenido en varios temas. |
| KH-P1-MAT-ALG-003 | Secuencias de figuras | matematica | P1 | algebra | mat.p1.patrones-colores-formas, mat.p1.patrones-repeticion | El banco desglosa este contenido en los temas indicados. |
| KH-P1-MAT-ARI-001 | Conteo hasta 20 | matematica | P1 | aritmetica | mat.p1.contar-hasta-10, mat.p1.contar-hasta-50 | El banco desglosa este contenido en los temas indicados. |
| KH-P1-MAT-ARI-004 | Comparación de cantidades | matematica | P1 | aritmetica | mat.p1.comparar-hasta-20, mat.p1.estimar-cantidades | El banco desglosa este contenido en los temas indicados. |
| KH-P1-MAT-ARI-005 | Orden de números | matematica | P1 | aritmetica | mat.p1.comparar-hasta-20, mat.p1.comparar-hasta-50 | El banco desarrolla el contenido en varios temas. |
| KH-P1-MAT-EST-001 | Tablas de conteo | matematica | P1 | estadistica | mat.p1.tabla-de-conteo, mat.p1.leer-tabla-conteo | El banco desarrolla el contenido en varios temas. |
| KH-P1-MAT-EST-002 | Pictogramas simples | matematica | P1 | estadistica | mat.p1.pictograma-horizontal, mat.p1.leer-pictograma | El banco desglosa este contenido en los temas indicados. |
| KH-P1-MAT-GEO-001 | Figuras geométricas básicas | matematica | P1 | geometria | mat.p1.figuras-planas, mat.p1.cubo-esfera-cilindro | El banco desglosa este contenido en los temas indicados. |
| KH-P1-MAT-GEO-003 | Recorridos y trayectorias | matematica | P1 | geometria | mat.p1.recorridos-con-el-cuerpo, mat.p1.dibujar-recorrido | El banco desglosa este contenido en los temas indicados. |
| KH-P1-MAT-RMA-001 | Secuencias lógicas | matematica | P1 | aritmetica | mat.p1.patrones-repeticion, mat.p1.continuar-patron | El banco desglosa este contenido en los temas indicados. |
| KH-P2-COM-ESC-002 | Descripciones | comunicacion | P2 | escritura | com.p2.describir-con-detalle, com.p2.escribir-una-descripcion | El banco desglosa este contenido en los temas indicados. |
| KH-P2-COM-LEC-003 | Textos instructivos | comunicacion | P2 | comprension-lectora | com.p2.dar-instrucciones, com.p2.leer-receta-e-instructivo | El banco desglosa este contenido en los temas indicados. |
| KH-P2-COM-LIT-003 | Poemas infantiles | comunicacion | P2 | literatura | com.p2.leer-un-poema, com.p2.escribir-un-poema | El banco desglosa este contenido en los temas indicados. |
| KH-P2-COM-ORA-001 | Relato de experiencias | comunicacion | P2 | oralidad | com.p2.contar-una-anecdota, com.p2.escribir-una-anecdota | El banco desglosa este contenido en los temas indicados. |
| KH-P2-CYT-FIS-001 | Propiedades de materiales | ciencia-tecnologia | P2 | fisica | cyt.p2.materiales-segun-propiedades, cyt.p2.materiales-impermeables | El banco desglosa este contenido en los temas indicados. |
| KH-P2-CYT-FIS-003 | Fuentes de luz | ciencia-tecnologia | P2 | fisica | cyt.p2.cambios-luz-calor, cyt.p2.sombras-durante-el-dia | El banco desglosa este contenido en los temas indicados. |
| KH-P2-CYT-IND-002 | Comparación de observaciones | ciencia-tecnologia | P2 | indagacion | cyt.p2.comparar-respuesta-con-datos, cyt.p2.registrar-datos-en-tabla | El banco desglosa este contenido en los temas indicados. |
| KH-P2-CYT-IND-003 | Registro de resultados | ciencia-tecnologia | P2 | indagacion | cyt.p2.registrar-datos-en-tabla, cyt.p2.comunicar-lo-que-encontre | El banco desglosa este contenido en los temas indicados. |
| KH-P2-CYT-TEC-001 | Soluciones con materiales reutilizados | ciencia-tecnologia | P2 | tecnologia | cyt.p2.papel-reciclado, cyt.p2.elegir-material-segun-uso | El banco desglosa este contenido en los temas indicados. |
| KH-P2-CYT-TIE-002 | Residuos y reciclaje | ciencia-tecnologia | P2 | tierra-universo | cyt.p2.papel-reciclado, cyt.p2.compost-y-abono | El banco desglosa este contenido en los temas indicados. |
| KH-P2-MAT-ALG-003 | Igualdades con incógnitas sencillas | matematica | P2 | algebra | mat.p2.igualdades-sumas-restas, mat.p2.numero-que-falta-igualdad | El banco desglosa este contenido en los temas indicados. |
| KH-P2-MAT-ARI-003 | Comparación de números | matematica | P2 | aritmetica | mat.p2.comparar-dos-cifras, mat.p2.afirmaciones-comparacion | El banco desarrolla el contenido en varios temas. |
| KH-P2-MAT-ARI-010 | Problemas aditivos | matematica | P2 | aritmetica | mat.p2.problemas-agregar-quitar, mat.p2.problemas-juntar-separar | El banco desglosa este contenido en los temas indicados. |
| KH-P2-MAT-EST-001 | Tablas de frecuencia simples | matematica | P2 | estadistica | mat.p2.tabla-de-conteo, mat.p2.leer-tabla-conteo | El banco desglosa este contenido en los temas indicados. |
| KH-P2-MAT-EST-002 | Gráficos de barras | matematica | P2 | estadistica | mat.p2.leer-barras, mat.p2.barras-verticales | El banco desarrolla el contenido en varios temas. |
| KH-P2-MAT-EST-003 | Interpretación de datos | matematica | P2 | estadistica | mat.p2.datos-cualitativos, mat.p2.decisiones-con-datos | El banco desglosa este contenido en los temas indicados. |
| KH-P2-MAT-GEO-002 | Cuerpos geométricos | matematica | P2 | geometria | mat.p2.cuerpos-del-entorno, mat.p2.construir-con-cuerpos | El banco desarrolla el contenido en varios temas. |
| KH-P2-MAT-GEO-003 | Medición de longitudes | matematica | P2 | geometria | mat.p2.medir-longitudes, mat.p2.distintas-unidades-distinta-medida | El banco desglosa este contenido en los temas indicados. |
| KH-P2-MAT-RMA-001 | Problemas de dos pasos | matematica | P2 | aritmetica | mat.p2.problemas-dos-acciones, mat.p2.problemas-avanzar-retroceder | El banco desarrolla el contenido en varios temas. |
| KH-P3-COM-ESC-003 | Descripciones ordenadas | comunicacion | P3 | escritura | com.p3.leer-texto-descriptivo, com.p3.escribir-una-descripcion | El banco desglosa este contenido en los temas indicados. |
| KH-P3-COM-GRA-001 | Verbo | comunicacion | P3 | lenguaje | com.p3.tiempos-del-verbo, com.p3.concordancia-sujeto-verbo | El banco desglosa este contenido en los temas indicados. |
| KH-P3-COM-GRA-003 | Concordancia | comunicacion | P3 | lenguaje | com.p3.concordancia-sujeto-verbo, com.p3.adjetivo-y-concordancia | El banco desglosa este contenido en los temas indicados. |
| KH-P3-COM-GRA-004 | Puntuación | comunicacion | P3 | lenguaje | com.p3.punto-aparte, com.p3.signos-de-interrogacion-y-admiracion | El banco desglosa este contenido en los temas indicados. |
| KH-P3-COM-LEC-001 | Inferencias sencillas | comunicacion | P3 | comprension-lectora | com.p3.predecir-por-indicios, com.p3.inferir-personajes | El banco desglosa este contenido en los temas indicados. |
| KH-P3-COM-LIT-003 | Cuentos tradicionales | comunicacion | P3 | literatura | com.p3.leer-un-cuento, com.p3.leer-una-leyenda | El banco desglosa este contenido en los temas indicados. |
| KH-P3-CYT-BIO-001 | Sistemas del cuerpo humano | ciencia-tecnologia | P3 | biologia | cyt.p3.huesos-y-musculos, cyt.p3.sistema-digestivo, cyt.p3.sistema-respiratorio | El banco desarrolla el contenido en varios temas. |
| KH-P3-CYT-BIO-002 | Clasificación de seres vivos | ciencia-tecnologia | P3 | biologia | cyt.p3.agrupar-seres-vivos, cyt.p3.especies-semejanzas | El banco desglosa este contenido en los temas indicados. |
| KH-P3-CYT-FIS-001 | Fuerza y movimiento | ciencia-tecnologia | P3 | fisica | cyt.p3.fuerzas-movimiento, cyt.p3.fuerzas-que-cambian-direccion | El banco desarrolla el contenido en varios temas. |
| KH-P3-CYT-IND-002 | Registro de experimentos | ciencia-tecnologia | P3 | indagacion | cyt.p3.registrar-datos-en-tabla, cyt.p3.plan-de-indagacion | El banco desglosa este contenido en los temas indicados. |
| KH-P3-CYT-TEC-001 | Diseño de prototipos simples | ciencia-tecnologia | P3 | tecnologia | cyt.p3.secuencia-de-implementacion, cyt.p3.boceto-con-partes-y-medidas | El banco desglosa este contenido en los temas indicados. |
| KH-P3-MAT-ALG-002 | Igualdades con incógnitas | matematica | P3 | algebra | mat.p3.valor-desconocido-producto, mat.p3.igualdad-aditiva, mat.p3.igualdad-multiplicaciones, mat.p3.igualdades-valor-desconocido | El banco desarrolla el contenido en varios temas. |
| KH-P3-MAT-ALG-003 | Relaciones de equivalencia | matematica | P3 | algebra | mat.p3.significado-signo-igual, mat.p3.colecciones-equivalentes | El banco desglosa este contenido en los temas indicados. |
| KH-P3-MAT-ARI-004 | Multiplicación por una cifra | matematica | P3 | aritmetica | mat.p3.multiplicacion, mat.p3.arreglos-rectangulares, mat.p3.tablas-2-5-10 | El banco desglosa este contenido en los temas indicados. |
| KH-P3-MAT-ARI-006 | División exacta | matematica | P3 | aritmetica | mat.p3.division, mat.p3.hechos-division, mat.p3.inversa-multiplicacion-division | El banco desarrolla el contenido en varios temas. |
| KH-P3-MAT-EST-001 | Gráficos de barras | matematica | P3 | estadistica | mat.p3.barras-horizontales, mat.p3.barras-escala | El banco desarrolla el contenido en varios temas. |
| KH-P3-MAT-EST-002 | Interpretación de datos | matematica | P3 | estadistica | mat.p3.leer-tabla-frecuencia, mat.p3.conclusiones-datos | El banco desglosa este contenido en los temas indicados. |
| KH-P3-MAT-EST-003 | Encuestas simples | matematica | P3 | estadistica | mat.p3.pregunta-encuesta, mat.p3.encuesta-entrevista | El banco desglosa este contenido en los temas indicados. |
| KH-P3-MAT-GEO-001 | Polígonos | matematica | P3 | geometria | mat.p3.lados-vertices, mat.p3.triangulos, mat.p3.cuadrilateros | El banco desglosa este contenido en los temas indicados. |
| KH-P3-MAT-GEO-003 | Unidades de longitud | matematica | P3 | geometria | mat.p3.medidas-no-convencionales, mat.p3.misma-longitud-distintas-unidades | El banco desarrolla el contenido en varios temas. |
| KH-P3-MAT-GEO-004 | Unidades de masa | matematica | P3 | geometria | mat.p3.masa-kilogramo, mat.p3.balanza-masa | El banco desglosa este contenido en los temas indicados. |
| KH-P3-MAT-RMA-002 | Estrategias de cálculo | matematica | P3 | aritmetica | mat.p3.calculo-mental-descomposicion, mat.p3.estimar-sumas-restas | El banco desglosa este contenido en los temas indicados. |
| KH-P4-COM-ESC-001 | Párrafos cohesionados | comunicacion | P4 | escritura | com.p4.parrafo-introduccion-y-cierre, com.p4.conectores-basicos | El banco desglosa este contenido en los temas indicados. |
| KH-P4-COM-ESC-003 | Resúmenes | comunicacion | P4 | escritura | com.p4.parafrasear-un-parrafo, com.p4.clasificar-y-sintetizar | El banco desglosa este contenido en los temas indicados. |
| KH-P4-COM-GRA-001 | Clases de palabras | comunicacion | P4 | lenguaje | com.p4.sustantivos-concretos-abstractos, com.p4.adjetivos-gentilicios, com.p4.el-adverbio | El banco desglosa este contenido en los temas indicados. |
| KH-P4-COM-GRA-002 | Acentuación inicial | comunicacion | P4 | lenguaje | com.p4.clasificacion-por-silaba-tonica, com.p4.monosilabos-sin-tilde | El banco desglosa este contenido en los temas indicados. |
| KH-P4-COM-GRA-004 | Oración simple | comunicacion | P4 | lenguaje | com.p4.nucleo-del-sujeto-y-predicado, com.p4.sujeto-simple-y-compuesto | El banco desglosa este contenido en los temas indicados. |
| KH-P4-COM-LEC-001 | Inferencias textuales | comunicacion | P4 | comprension-lectora | com.p4.intencion-y-finalidad, com.p4.sentimientos-de-personajes | El banco desglosa este contenido en los temas indicados. |
| KH-P4-COM-LEC-002 | Textos expositivos | comunicacion | P4 | comprension-lectora | com.p4.texto-expositivo-simple, com.p4.texto-expositivo-comparacion | El banco desglosa este contenido en los temas indicados. |
| KH-P4-COM-LEC-003 | Hechos y opiniones | comunicacion | P4 | comprension-lectora | com.p4.opinion-apoyada-en-el-texto, com.p4.noticia | El banco desglosa este contenido en los temas indicados. |
| KH-P4-COM-LEC-004 | Idea principal | comunicacion | P4 | comprension-lectora | com.p4.tema-y-subtema, com.p4.subrayar-palabras-clave | El banco desglosa este contenido en los temas indicados. |
| KH-P4-COM-LEC-005 | Comparación de textos | comunicacion | P4 | comprension-lectora | com.p4.comparar-versiones-de-un-relato, com.p4.texto-expositivo-comparacion | El banco desglosa este contenido en los temas indicados. |
| KH-P4-COM-LIT-001 | Poesía | comunicacion | P4 | literatura | com.p4.rima-consonante-y-asonante, com.p4.escribo-un-poema-con-comparaciones | El banco desglosa este contenido en los temas indicados. |
| KH-P4-COM-LIT-002 | Narrativa | comunicacion | P4 | literatura | com.p4.el-cuento-maravilloso, com.p4.escribo-un-cuento-maravilloso | El banco desglosa este contenido en los temas indicados. |
| KH-P4-COM-LIT-003 | Recursos expresivos | comunicacion | P4 | literatura | com.p4.refranes-y-expresiones-escritas, com.p4.juegos-de-palabras-ritmo | El banco desglosa este contenido en los temas indicados. |
| KH-P4-COM-ORA-001 | Debate guiado | comunicacion | P4 | oralidad | com.p4.asamblea-y-acuerdos, com.p4.mesa-redonda-soluciones | El banco desglosa este contenido en los temas indicados. |
| KH-P4-COM-ORA-002 | Exposición informativa | comunicacion | P4 | oralidad | com.p4.guion-para-exponer, com.p4.texto-expositivo-simple | El banco desglosa este contenido en los temas indicados. |
| KH-P4-COM-ORA-003 | Escucha argumentada | comunicacion | P4 | oralidad | com.p4.comentarios-ante-opiniones-distintas, com.p4.opinar-sobre-lo-escuchado | El banco desglosa este contenido en los temas indicados. |
| KH-P4-CYT-BIO-001 | Sistema digestivo | ciencia-tecnologia | P4 | biologia | cyt.p4.digestion-estomago-intestino, cyt.p4.cuidado-sistema-digestivo, cyt.p4.organos-sistema-digestivo, cyt.p4.higado-pancreas | El banco desarrolla el contenido en varios temas. |
| KH-P4-CYT-BIO-002 | Sistema respiratorio | ciencia-tecnologia | P4 | biologia | cyt.p4.vias-respiratorias, cyt.p4.sistemas-funciones-vitales | El banco desarrolla el contenido en varios temas. |
| KH-P4-CYT-FIS-002 | Máquinas simples | ciencia-tecnologia | P4 | fisica | cyt.p4.la-palanca, cyt.p4.polea-plano-inclinado | El banco desglosa este contenido en los temas indicados. |
| KH-P4-CYT-FIS-003 | Electricidad intuitiva | ciencia-tecnologia | P4 | fisica | cyt.p4.energia-electrica, cyt.p4.circuito-electrico-simple | El banco desglosa este contenido en los temas indicados. |
| KH-P4-CYT-IND-001 | Hipótesis y procedimientos | ciencia-tecnologia | P4 | indagacion | cyt.p4.explicacion-inicial, cyt.p4.redactar-conclusiones | El banco desglosa este contenido en los temas indicados. |
| KH-P4-CYT-IND-003 | Comunicación de resultados | ciencia-tecnologia | P4 | indagacion | cyt.p4.redactar-conclusiones, cyt.p4.comunicar-indagacion | El banco desglosa este contenido en los temas indicados. |
| KH-P4-CYT-TEC-002 | Propuestas de mejora | ciencia-tecnologia | P4 | tecnologia | cyt.p4.logros-dificultades-mejoras, cyt.p4.requerimientos-y-recursos | El banco desglosa este contenido en los temas indicados. |
| KH-P4-MAT-ALG-004 | Secuencias numéricas | matematica | P4 | algebra | mat.p4.patrones-tabla-numerica, mat.p4.patrones-aditivos-10000 | El banco desglosa este contenido en los temas indicados. |
| KH-P4-MAT-ARI-001 | Números naturales grandes | matematica | P4 | aritmetica | mat.p4.representar-cuatro-cifras, mat.p4.comparar-cuatro-cifras, mat.p4.ordenar-hasta-10000 | El banco desglosa este contenido en los temas indicados. |
| KH-P4-MAT-ARI-003 | Divisibilidad inicial | matematica | P4 | aritmetica | mat.p4.division-exacta-inexacta, mat.p4.comprobar-division, mat.p4.division-una-cifra, mat.p4.problemas-division-residuo | El banco desarrolla el contenido en varios temas. |
| KH-P4-MAT-ARI-007 | Adición de fracciones | matematica | P4 | aritmetica | mat.p4.suma-fracciones-homogeneas, mat.p4.suma-resta-fracciones-equivalentes | El banco desglosa este contenido en los temas indicados. |
| KH-P4-MAT-ARI-008 | Sustracción de fracciones | matematica | P4 | aritmetica | mat.p4.resta-fracciones-homogeneas, mat.p4.suma-resta-fracciones-equivalentes | El banco desglosa este contenido en los temas indicados. |
| KH-P4-MAT-ARI-011 | Problemas con fracciones | matematica | P4 | aritmetica | mat.p4.problemas-suma-resta-fracciones, mat.p4.comparar-fracciones, mat.p4.leer-escribir-fracciones | El banco desarrolla el contenido en varios temas. |
| KH-P4-MAT-EST-001 | Tablas de datos | matematica | P4 | estadistica | mat.p4.tabla-frecuencias-4, mat.p4.leer-doble-entrada | El banco desglosa este contenido en los temas indicados. |
| KH-P4-MAT-EST-002 | Gráficos estadísticos | matematica | P4 | estadistica | mat.p4.leer-barras-escala, mat.p4.conclusiones-graficos | El banco desglosa este contenido en los temas indicados. |
| KH-P4-MAT-EST-003 | Probabilidad intuitiva | matematica | P4 | estadistica | mat.p4.predecir-suceso-probable, mat.p4.seguro-mas-menos-probable | El banco desglosa este contenido en los temas indicados. |
| KH-P4-MAT-GEO-001 | Ángulos | matematica | P4 | geometria | mat.p4.comparar-angulos-recto, mat.p4.angulo-recto | El banco desarrolla el contenido en varios temas. |
| KH-P4-MAT-GEO-004 | Perímetro | matematica | P4 | geometria | mat.p4.mismo-perimetro, mat.p4.perimetro-poligonos | El banco desarrolla el contenido en varios temas. |
| KH-P5-COM-ESC-003 | Organización de ideas | comunicacion | P5 | escritura | com.p5.idea-principal, com.p5.sintesis-en-organizadores | El banco desglosa este contenido en los temas indicados. |
| KH-P5-COM-ESC-004 | Revisión de borradores | comunicacion | P5 | escritura | com.p5.revisar-hilo-tematico, com.p5.revisar-vocabulario | El banco desglosa este contenido en los temas indicados. |
| KH-P5-COM-GRA-003 | Acentuación | comunicacion | P5 | lenguaje | com.p5.tildes-agudas-graves-esdrujulas, com.p5.tilde-sobresdrujulas | El banco desglosa este contenido en los temas indicados. |
| KH-P5-COM-LEC-001 | Textos argumentativos iniciales | comunicacion | P5 | comprension-lectora | com.p5.texto-de-opinion, com.p5.escribo-un-texto-de-opinion | El banco desglosa este contenido en los temas indicados. |
| KH-P5-COM-LIT-003 | Poesía | comunicacion | P5 | literatura | com.p5.poesia-verso-libre, com.p5.medida-de-los-versos | El banco desglosa este contenido en los temas indicados. |
| KH-P5-COM-ORA-002 | Discusión respetuosa | comunicacion | P5 | oralidad | com.p5.argumentos-en-una-discusion, com.p5.el-dialogo-para-acuerdos | El banco desglosa este contenido en los temas indicados. |
| KH-P5-COM-ORA-003 | Escucha crítica | comunicacion | P5 | oralidad | com.p5.conclusiones-de-lo-escuchado, com.p5.justificar-opinion-oral | El banco desglosa este contenido en los temas indicados. |
| KH-P5-CYT-BIO-001 | Célula y organización | ciencia-tecnologia | P5 | biologia | cyt.p5.funciones-basicas-celula, cyt.p5.celula-animal-vegetal, cyt.p5.formas-tamanos-celulas, cyt.p5.la-celula | El banco desarrolla el contenido en varios temas. |
| KH-P5-CYT-BIO-003 | Reproducción de plantas | ciencia-tecnologia | P5 | biologia | cyt.p5.reproduccion-vegetativa, cyt.p5.la-flor | El banco desglosa este contenido en los temas indicados. |
| KH-P5-CYT-BIO-004 | Relaciones ecológicas | ciencia-tecnologia | P5 | biologia | cyt.p5.ecosistemas, cyt.p5.comensalismo | El banco desglosa este contenido en los temas indicados. |
| KH-P5-CYT-IND-001 | Diseño experimental | ciencia-tecnologia | P5 | indagacion | cyt.p5.variables-experimento, cyt.p5.prueba-comparativa | El banco desglosa este contenido en los temas indicados. |
| KH-P5-CYT-IND-002 | Interpretación de resultados | ciencia-tecnologia | P5 | indagacion | cyt.p5.datos-cualitativos-cuantitativos, cyt.p5.evaluar-procedimiento | El banco desglosa este contenido en los temas indicados. |
| KH-P5-CYT-IND-003 | Comunicación científica | ciencia-tecnologia | P5 | indagacion | cyt.p5.resumen-informacion-cientifica, cyt.p5.fuentes-libros-revistas | El banco desglosa este contenido en los temas indicados. |
| KH-P5-CYT-TEC-001 | Prototipos para problemas ambientales | ciencia-tecnologia | P5 | tecnologia | cyt.p5.impacto-ambiental-tecnologia, cyt.p5.alternativas-sostenibles | El banco desglosa este contenido en los temas indicados. |
| KH-P5-CYT-TEC-002 | Mejora de soluciones | ciencia-tecnologia | P5 | tecnologia | cyt.p5.elegir-alternativa, cyt.p5.beneficios-inconvenientes | El banco desglosa este contenido en los temas indicados. |
| KH-P5-CYT-TIE-001 | Biodiversidad peruana | ciencia-tecnologia | P5 | tierra-universo | cyt.p5.mar-peruano, cyt.p5.lago-titicaca, cyt.p5.bosque-amazonico | El banco desglosa este contenido en los temas indicados. |
| KH-P5-CYT-TIE-003 | Recursos hídricos | ciencia-tecnologia | P5 | tierra-universo | cyt.p5.agua-dulce-salada, cyt.p5.contaminacion-del-agua | El banco desglosa este contenido en los temas indicados. |
| KH-P5-MAT-ALG-003 | Patrones de crecimiento | matematica | P5 | algebra | mat.p5.patrones-graficos-5, mat.p5.patrones-regla-formacion | El banco desglosa este contenido en los temas indicados. |
| KH-P5-MAT-ARI-001 | Números naturales y operaciones | matematica | P5 | aritmetica | mat.p5.problemas-varias-etapas, mat.p5.leer-escribir-decimales, mat.p5.relacion-cuatro-operaciones | El banco desarrolla el contenido en varios temas. |
| KH-P5-MAT-ARI-006 | Razones y proporciones | matematica | P5 | aritmetica | mat.p5.proporcionalidad-tablas, mat.p5.proporcional-o-no, mat.p5.problemas-proporcionalidad, mat.p5.proporcionalidad-cambio-constante | El banco desarrolla el contenido en varios temas. |
| KH-P5-MAT-EST-003 | Probabilidad básica | matematica | P5 | estadistica | mat.p5.comparar-posibilidades, mat.p5.diagrama-arbol | El banco desglosa este contenido en los temas indicados. |
| KH-P5-MAT-EST-004 | Recolección de datos | matematica | P5 | estadistica | mat.p5.planificar-encuesta, mat.p5.decisiones-con-datos | El banco desglosa este contenido en los temas indicados. |
| KH-P5-MAT-GEO-001 | Área de polígonos | matematica | P5 | geometria | mat.p5.area-rectangulos, mat.p5.area-perimetro-relacion, mat.p5.area-figuras-compuestas | El banco desarrolla el contenido en varios temas. |
| KH-P5-MAT-RMA-001 | Problemas de estrategia múltiple | matematica | P5 | aritmetica | mat.p5.problemas-cuatro-operaciones-5, mat.p5.problemas-varias-etapas | El banco desglosa este contenido en los temas indicados. |
| KH-P5-MAT-RMA-002 | Razonamiento numérico | matematica | P5 | aritmetica | mat.p5.propiedades-calculo-mental, mat.p5.relacion-cuatro-operaciones | El banco desglosa este contenido en los temas indicados. |
| KH-P6-COM-ESC-003 | Revisión y edición | comunicacion | P6 | escritura | com.p6.revisar-con-rubrica, com.p6.corregir-entre-pares | El banco desglosa este contenido en los temas indicados. |
| KH-P6-COM-GRA-002 | Cohesión textual | comunicacion | P6 | lenguaje | com.p6.cohesion-en-textos-largos, com.p6.conectores-de-causa-y-contraste | El banco desglosa este contenido en los temas indicados. |
| KH-P6-COM-GRA-003 | Normas ortográficas | comunicacion | P6 | lenguaje | com.p6.tilde-diacritica, com.p6.tilde-en-hiatos | El banco desglosa este contenido en los temas indicados. |
| KH-P6-COM-LEC-002 | Lectura crítica | comunicacion | P6 | comprension-lectora | com.p6.fiabilidad-de-fuentes, com.p6.noticias-falsas | El banco desglosa este contenido en los temas indicados. |
| KH-P6-COM-LEC-003 | Textos discontinuos | comunicacion | P6 | comprension-lectora | com.p6.diagramas-y-cuadros-comparativos, com.p6.la-infografia-cientifica | El banco desglosa este contenido en los temas indicados. |
| KH-P6-COM-LIT-001 | Recursos literarios | comunicacion | P6 | literatura | com.p6.figuras-literarias, com.p6.la-metafora | El banco desglosa este contenido en los temas indicados. |
| KH-P6-COM-LIT-003 | Narrativa breve | comunicacion | P6 | literatura | com.p6.cuento-de-suspenso, com.p6.escribo-un-cuento-de-suspenso | El banco desglosa este contenido en los temas indicados. |
| KH-P6-COM-ORA-003 | Escucha y réplica | comunicacion | P6 | oralidad | com.p6.puntos-de-vista-en-un-debate, com.p6.el-debate | El banco desglosa este contenido en los temas indicados. |
| KH-P6-COM-RVB-002 | Relaciones lógicas | comunicacion | P6 | razonamiento-verbal | com.p6.conectores-de-causa-y-contraste, com.p6.la-conjuncion | El banco desglosa este contenido en los temas indicados. |
| KH-P6-CYT-BIO-001 | Reproducción humana desde la ciencia | ciencia-tecnologia | P6 | biologia | cyt.p6.fecundacion-embarazo, cyt.p6.sistema-reproductor-femenino, cyt.p6.sistema-reproductor-masculino | El banco desglosa este contenido en los temas indicados. |
| KH-P6-CYT-IND-001 | Experimentos controlados | ciencia-tecnologia | P6 | indagacion | cyt.p6.controlar-variables, cyt.p6.identificar-tipos-de-variables | El banco desglosa este contenido en los temas indicados. |
| KH-P6-CYT-IND-002 | Comunicación científica | ciencia-tecnologia | P6 | indagacion | cyt.p6.fuentes-cientificas-confiables, cyt.p6.evidencia-y-opinion | El banco desglosa este contenido en los temas indicados. |
| KH-P6-CYT-IND-003 | Análisis de resultados | ciencia-tecnologia | P6 | indagacion | cyt.p6.proporcionalidad-en-datos, cyt.p6.fuentes-de-error | El banco desglosa este contenido en los temas indicados. |
| KH-P6-CYT-TEC-001 | Diseño y mejora de soluciones | ciencia-tecnologia | P6 | tecnologia | cyt.p6.presupuesto-prototipo, cyt.p6.impactos-de-la-solucion | El banco desglosa este contenido en los temas indicados. |
| KH-P6-MAT-ALG-002 | Ecuaciones | matematica | P6 | algebra | mat.p6.ecuaciones-cuatro-operaciones, mat.p6.plantear-ecuaciones | El banco desarrolla el contenido en varios temas. |
| KH-P6-MAT-ALG-003 | Relaciones entre magnitudes | matematica | P6 | algebra | mat.p6.magnitudes-directamente-proporcionales, mat.p6.razon-entre-cantidades | El banco desglosa este contenido en los temas indicados. |
| KH-P6-MAT-ALG-004 | Patrones funcionales | matematica | P6 | algebra | mat.p6.patrones-multiplicativos, mat.p6.patrones-aditivos | El banco desglosa este contenido en los temas indicados. |
| KH-P6-MAT-ARI-001 | Operaciones con fracciones | matematica | P6 | aritmetica | mat.p6.suma-resta-homogeneas, mat.p6.amplificar-simplificar, mat.p6.comparar-ordenar-fracciones, mat.p6.multiplicacion-fracciones | El banco desarrolla el contenido en varios temas. |
| KH-P6-MAT-ARI-004 | Razones y proporciones | matematica | P6 | aritmetica | mat.p6.razon-entre-cantidades, mat.p6.proporcionalidad-directa, mat.p6.magnitudes-directamente-proporcionales | El banco desarrolla el contenido en varios temas. |
| KH-P6-MAT-ARI-007 | Múltiplos y divisores | matematica | P6 | aritmetica | mat.p6.divisores, mat.p6.multiplos, mat.p6.criterios-divisibilidad, mat.p6.mcd | El banco desarrolla el contenido en varios temas. |
| KH-P6-MAT-EST-001 | Medidas de tendencia central | matematica | P6 | estadistica | mat.p6.media-reparto-equitativo, mat.p6.moda | El banco desglosa este contenido en los temas indicados. |
| KH-P6-MAT-EST-002 | Probabilidad simple | matematica | P6 | estadistica | mat.p6.probabilidad-fraccion, mat.p6.decisiones-con-probabilidad, mat.p6.mas-menos-probable | El banco desarrolla el contenido en varios temas. |
| KH-P6-MAT-GEO-001 | Área y volumen | matematica | P6 | geometria | mat.p6.area-rectangulo-cuadrado, mat.p6.volumen-prisma-rectangular, mat.p6.volumen-cubos-unidad | El banco desglosa este contenido en los temas indicados. |
| KH-P6-MAT-GEO-005 | Plano cartesiano | matematica | P6 | geometria | mat.p6.plano-cartesiano-coordenadas, mat.p6.ampliacion-reduccion | El banco desarrolla el contenido en varios temas. |
| KH-P6-MAT-RMA-001 | Problemas de razonamiento multietapa | matematica | P6 | aritmetica | mat.p6.problemas-varias-etapas, mat.p6.estrategias-heuristicas | El banco desglosa este contenido en los temas indicados. |
| KH-P6-MAT-RMA-002 | Estrategias lógicas | matematica | P6 | aritmetica | mat.p6.estrategias-heuristicas, mat.p6.decisiones-con-probabilidad | El banco desglosa este contenido en los temas indicados. |
| KH-S1-COM-ESC-001 | Textos narrativos | comunicacion | S1 | escritura | com.s1.estructura-del-cuento-literario, com.s1.tipologias-textuales | El banco desglosa este contenido en los temas indicados. |
| KH-S1-COM-ESC-003 | Resúmenes | comunicacion | S1 | escritura | com.s1.el-resumen, com.s1.cuadro-sinoptico | El banco desglosa este contenido en los temas indicados. |
| KH-S1-COM-GRA-001 | Categorías gramaticales | comunicacion | S1 | lenguaje | com.s1.preposicion-y-conjuncion, com.s1.el-adverbio | El banco desglosa este contenido en los temas indicados. |
| KH-S1-COM-GRA-003 | Acentuación | comunicacion | S1 | lenguaje | com.s1.reglas-generales-de-tildacion-en-secundaria, com.s1.tilde-diacritica | El banco desglosa este contenido en los temas indicados. |
| KH-S1-COM-GRA-004 | Puntuación | comunicacion | S1 | lenguaje | com.s1.clases-de-punto, com.s1.coma-enumerativa-y-vocativa | El banco desglosa este contenido en los temas indicados. |
| KH-S1-COM-LEC-001 | Estructura textual | comunicacion | S1 | comprension-lectora | com.s1.estructura-del-texto-expositivo, com.s1.tipologias-textuales, com.s1.informacion-y-datos | El banco desarrolla el contenido en varios temas. |
| KH-S1-COM-LEC-002 | Inferencias | comunicacion | S1 | comprension-lectora | com.s1.conclusiones-de-lectura, com.s1.inferir-el-significado-por-contexto | El banco desglosa este contenido en los temas indicados. |
| KH-S1-COM-ORA-002 | Escucha crítica | comunicacion | S1 | oralidad | com.s1.opinar-sobre-lo-escuchado, com.s1.contrastar-lo-escuchado-con-fuentes | El banco desglosa este contenido en los temas indicados. |
| KH-S1-CYT-BIO-001 | Célula | ciencia-tecnologia | S1 | biologia | cyt.s1.celula-procariota-y-eucariota, cyt.s1.biomoleculas-celula | El banco desarrolla el contenido en varios temas. |
| KH-S1-CYT-BIO-003 | Ecosistemas | ciencia-tecnologia | S1 | biologia | cyt.s1.sostenibilidad-del-ecosistema, cyt.s1.factores-bioticos-y-abioticos | El banco desarrolla el contenido en varios temas. |
| KH-S1-CYT-BIO-004 | Diversidad biológica | ciencia-tecnologia | S1 | biologia | cyt.s1.climas-y-biodiversidad, cyt.s1.ancestro-comun-arbol-de-la-vida | El banco desglosa este contenido en los temas indicados. |
| KH-S1-CYT-FIS-004 | Magnitudes físicas | ciencia-tecnologia | S1 | fisica | cyt.s1.magnitudes-y-unidades-si, cyt.s1.masa-y-peso | El banco desglosa este contenido en los temas indicados. |
| KH-S1-CYT-IND-001 | Método de indagación | ciencia-tecnologia | S1 | indagacion | cyt.s1.procedimiento-experimental, cyt.s1.redactar-conclusiones | El banco desglosa este contenido en los temas indicados. |
| KH-S1-CYT-IND-003 | Registro de evidencia | ciencia-tecnologia | S1 | indagacion | cyt.s1.datos-cualitativos-y-cuantitativos, cyt.s1.exposicion-de-la-indagacion | El banco desglosa este contenido en los temas indicados. |
| KH-S1-CYT-QUI-002 | Mezclas y separación | ciencia-tecnologia | S1 | quimica | cyt.s1.separacion-de-mezclas-heterogeneas, cyt.s1.mezclas-homogeneas-y-heterogeneas | El banco desarrolla el contenido en varios temas. |
| KH-S1-CYT-TEC-001 | Diseño tecnológico | ciencia-tecnologia | S1 | tecnologia | cyt.s1.problema-tecnologico-y-causas, cyt.s1.requerimientos-y-recursos | El banco desglosa este contenido en los temas indicados. |
| KH-S1-CYT-TEC-002 | Evaluación de materiales | ciencia-tecnologia | S1 | tecnologia | cyt.s1.materiales-e-impacto-ambiental, cyt.s1.propiedades-especificas-de-la-materia | El banco desglosa este contenido en los temas indicados. |
| KH-S1-CYT-TIE-001 | Tierra y universo | ciencia-tecnologia | S1 | tierra-universo | cyt.s1.tierra-planeta-habitable, cyt.s1.origen-del-universo | El banco desarrolla el contenido en varios temas. |
| KH-S1-MAT-ALG-001 | Expresiones algebraicas | matematica | S1 | algebra | mat.s1.valor-numerico, mat.s1.terminos-algebraicos | El banco desarrolla el contenido en varios temas. |
| KH-S1-MAT-ALG-004 | Patrones y sucesiones | matematica | S1 | algebra | mat.s1.progresiones-aritmeticas, mat.s1.numero-terminos-progresion | El banco desglosa este contenido en los temas indicados. |
| KH-S1-MAT-ALG-005 | Relaciones entre variables | matematica | S1 | algebra | mat.s1.relacion-funcion, mat.s1.pares-ordenados-graficos | El banco desglosa este contenido en los temas indicados. |
| KH-S1-MAT-ARI-002 | Operaciones con enteros | matematica | S1 | aritmetica | mat.s1.propiedades-operaciones-enteros, mat.s1.operaciones-combinadas-enteros | El banco desarrolla el contenido en varios temas. |
| KH-S1-MAT-ARI-004 | Fracciones y decimales | matematica | S1 | aritmetica | mat.s1.fracciones-decimales-porcentajes, mat.s1.orden-fracciones-decimales, mat.s1.fraccion-como-medida, mat.s1.fraccion-irreductible | El banco desarrolla el contenido en varios temas. |
| KH-S1-MAT-ARI-006 | Porcentajes | matematica | S1 | aritmetica | mat.s1.porcentaje-de-cantidad, mat.s1.fracciones-decimales-porcentajes, mat.s1.aumento-porcentual | El banco desarrolla el contenido en varios temas. |
| KH-S1-MAT-ARI-007 | Potencias enteras | matematica | S1 | aritmetica | mat.s1.potencias, mat.s1.potenciacion-enteros, mat.s1.operaciones-potencias-raices | El banco desarrolla el contenido en varios temas. |
| KH-S1-MAT-EST-002 | Gráficos estadísticos | matematica | S1 | estadistica | mat.s1.grafico-barras, mat.s1.interpretar-tablas-graficos | El banco desglosa este contenido en los temas indicados. |
| KH-S1-MAT-EST-003 | Media y mediana | matematica | S1 | estadistica | mat.s1.media-datos-no-agrupados, mat.s1.mediana | El banco desglosa este contenido en los temas indicados. |
| KH-S1-MAT-EST-004 | Probabilidad simple | matematica | S1 | estadistica | mat.s1.regla-laplace, mat.s1.probabilidad-frecuencial, mat.s1.probabilidad-decimal-porcentaje | El banco desarrolla el contenido en varios temas. |
| KH-S1-MAT-GEO-001 | Ángulos y polígonos | matematica | S1 | geometria | mat.s1.poligonos-elementos, mat.s1.angulos-complementarios-suplementarios | El banco desarrolla el contenido en varios temas. |
| KH-S1-MAT-GEO-003 | Plano cartesiano | matematica | S1 | geometria | mat.s1.plano-cartesiano-cuadrantes, mat.s1.pares-ordenados-graficos | El banco desglosa este contenido en los temas indicados. |
| KH-S1-MAT-GEO-004 | Transformaciones geométricas | matematica | S1 | geometria | mat.s1.traslacion, mat.s1.rotacion | El banco desglosa este contenido en los temas indicados. |
| KH-S1-MAT-RMA-003 | Estrategias de problemas | matematica | S1 | aritmetica | mat.s1.plantear-ecuaciones, mat.s1.problemas-edades | El banco desglosa este contenido en los temas indicados. |
| KH-S2-COM-ESC-001 | Textos expositivos | comunicacion | S2 | escritura | com.s2.texto-expositivo-comparativo, com.s2.texto-expositivo-problema-solucion | El banco desglosa este contenido en los temas indicados. |
| KH-S2-COM-ESC-003 | Organización argumentativa | comunicacion | S2 | escritura | com.s2.desarrollar-un-argumento, com.s2.coevaluacion-de-textos | El banco desarrolla el contenido en varios temas. |
| KH-S2-COM-GRA-002 | Conectores | comunicacion | S2 | lenguaje | com.s2.conectores-de-simultaneidad-y-tiempo, com.s2.conectores-de-causa-y-de-adicion | El banco desglosa este contenido en los temas indicados. |
| KH-S2-COM-GRA-003 | Puntuación avanzada | comunicacion | S2 | lenguaje | com.s2.punto-y-coma, com.s2.coma-con-conectores | El banco desglosa este contenido en los temas indicados. |
| KH-S2-COM-LEC-001 | Lectura crítica | comunicacion | S2 | comprension-lectora | com.s2.valoro-el-texto, com.s2.creencias-y-valores-en-los-textos | El banco desglosa este contenido en los temas indicados. |
| KH-S2-COM-LEC-004 | Análisis de fuentes | comunicacion | S2 | comprension-lectora | com.s2.confiabilidad-de-la-informacion-en-medios, com.s2.tomar-notas-y-fichas-de-lectura | El banco desglosa este contenido en los temas indicados. |
| KH-S2-COM-LIT-002 | Poesía | comunicacion | S2 | literatura | com.s2.poema-con-simil-y-rima, com.s2.anafora-y-aliteracion | El banco desglosa este contenido en los temas indicados. |
| KH-S2-COM-ORA-003 | Escucha de argumentos | comunicacion | S2 | oralidad | com.s2.evaluar-un-debate, com.s2.desarrollar-un-argumento | El banco desglosa este contenido en los temas indicados. |
| KH-S2-CYT-BIO-001 | Nutrición y sistemas humanos | ciencia-tecnologia | S2 | biologia | cyt.s2.nutricion-autotrofa-heterotrofa, cyt.s2.sistema-digestivo-humano | El banco desglosa este contenido en los temas indicados. |
| KH-S2-CYT-BIO-002 | Reproducción y salud | ciencia-tecnologia | S2 | biologia | cyt.s2.reproduccion-sexual-y-gametos, cyt.s2.reproduccion-asexual-pluricelulares | El banco desglosa este contenido en los temas indicados. |
| KH-S2-CYT-FIS-001 | Velocidad y aceleración | ciencia-tecnologia | S2 | fisica | cyt.s2.velocidad-movimiento, cyt.s2.desplazamiento-y-velocidad, cyt.s2.velocidad-media-de-un-viaje | El banco desarrolla el contenido en varios temas. |
| KH-S2-CYT-FIS-003 | Trabajo y energía | ciencia-tecnologia | S2 | fisica | cyt.s2.energia-cinetica, cyt.s2.energia-potencial, cyt.s2.transformaciones-de-energia | El banco desarrolla el contenido en varios temas. |
| KH-S2-CYT-FIS-004 | Gráficos de movimiento | ciencia-tecnologia | S2 | fisica | cyt.s2.grafica-posicion-tiempo-mru, cyt.s2.tendencias-en-graficas | El banco desglosa este contenido en los temas indicados. |
| KH-S2-CYT-IND-001 | Hipótesis y medición | ciencia-tecnologia | S2 | indagacion | cyt.s2.hipotesis-aceptada-o-rechazada, cyt.s2.identificar-variables-intervinientes | El banco desglosa este contenido en los temas indicados. |
| KH-S2-CYT-IND-003 | Análisis de evidencia | ciencia-tecnologia | S2 | indagacion | cyt.s2.informe-de-laboratorio, cyt.s2.tendencias-en-graficas | El banco desglosa este contenido en los temas indicados. |
| KH-S2-CYT-TEC-001 | Prototipos funcionales | ciencia-tecnologia | S2 | tecnologia | cyt.s2.secuencia-de-construccion, cyt.s2.ficha-tecnica-de-la-solucion | El banco desglosa este contenido en los temas indicados. |
| KH-S2-MAT-ALG-001 | Polinomios introductorios | matematica | S2 | algebra | mat.s2.monomios-polinomios, mat.s2.multiplicacion-polinomios, mat.s2.adicion-sustraccion-polinomios | El banco desarrolla el contenido en varios temas. |
| KH-S2-MAT-ALG-003 | Ecuaciones lineales | matematica | S2 | algebra | mat.s2.ecuaciones-inecuaciones, mat.s2.ecuaciones-coeficientes-decimales | El banco desarrolla el contenido en varios temas. |
| KH-S2-MAT-ALG-005 | Representación gráfica | matematica | S2 | algebra | mat.s2.grafica-proporcionalidad-inversa, mat.s2.leer-histogramas | El banco desglosa este contenido en los temas indicados. |
| KH-S2-MAT-ARI-001 | Operaciones con racionales | matematica | S2 | aritmetica | mat.s2.numeros-racionales, mat.s2.operaciones-combinadas-racionales | El banco desglosa este contenido en los temas indicados. |
| KH-S2-MAT-ARI-002 | Proporcionalidad | matematica | S2 | aritmetica | mat.s2.grafica-proporcionalidad-inversa, mat.s2.constante-proporcionalidad-racional | El banco desarrolla el contenido en varios temas. |
| KH-S2-MAT-ARI-005 | Estimación y aproximación | matematica | S2 | aritmetica | mat.s2.raiz-aproximada, mat.s2.estimacion-racionales | El banco desarrolla el contenido en varios temas. |
| KH-S2-MAT-EST-002 | Probabilidad | matematica | S2 | estadistica | mat.s2.seguro-probable-imposible, mat.s2.suceso-contrario | El banco desarrolla el contenido en varios temas. |
| KH-S2-MAT-EST-004 | Análisis de datos | matematica | S2 | estadistica | mat.s2.recojo-medicion, mat.s2.leer-histogramas | El banco desglosa este contenido en los temas indicados. |
| KH-S2-MAT-GEO-001 | Triángulos | matematica | S2 | geometria | mat.s2.isosceles-equilatero-propiedades, mat.s2.lineas-notables-triangulo, mat.s2.criterios-semejanza, mat.s2.criterios-congruencia | El banco desarrolla el contenido en varios temas. |
| KH-S2-MAT-GEO-002 | Congruencia | matematica | S2 | geometria | mat.s2.criterios-congruencia, mat.s2.justificar-congruencia | El banco desarrolla el contenido en varios temas. |
| KH-S2-MAT-GEO-004 | Transformaciones | matematica | S2 | geometria | mat.s2.distinguir-transformaciones, mat.s2.composicion-transformaciones | El banco desarrolla el contenido en varios temas. |
| KH-S2-MAT-GEO-005 | Escala y semejanza | matematica | S2 | geometria | mat.s2.criterios-semejanza, mat.s2.razon-semejanza-areas | El banco desarrolla el contenido en varios temas. |
| KH-S3-COM-ESC-001 | Ensayo argumentativo | comunicacion | S3 | escritura | com.s3.el-ensayo, com.s3.escribir-un-ensayo-breve | El banco desglosa este contenido en los temas indicados. |
| KH-S3-COM-GRA-002 | Subordinación introductoria | comunicacion | S3 | lenguaje | com.s3.subordinadas-sustantivas, com.s3.subordinadas-adverbiales | El banco desarrolla el contenido en varios temas. |
| KH-S3-COM-GRA-003 | Cohesión | comunicacion | S3 | lenguaje | com.s3.conectores-concesivos-y-condicionales, com.s3.revisar-marcadores-y-referentes | El banco desglosa este contenido en los temas indicados. |
| KH-S3-COM-LIT-001 | Literatura peruana | comunicacion | S3 | literatura | com.s3.relato-indigenista-y-regional, com.s3.la-tradicion-de-ricardo-palma | El banco desglosa este contenido en los temas indicados. |
| KH-S3-COM-ORA-001 | Debate formal | comunicacion | S3 | oralidad | com.s3.contraargumentar-en-un-debate, com.s3.contraargumento-y-refutacion | El banco desglosa este contenido en los temas indicados. |
| KH-S3-COM-ORA-002 | Presentaciones persuasivas | comunicacion | S3 | oralidad | com.s3.recursos-de-la-voz-para-persuadir, com.s3.estrategias-persuasivas-en-la-publicidad | El banco desglosa este contenido en los temas indicados. |
| KH-S3-COM-RVB-003 | Análisis de argumentos | comunicacion | S3 | razonamiento-verbal | com.s3.argumentos-de-causa-analogia-y-generalizacion, com.s3.contraargumento-y-refutacion | El banco desglosa este contenido en los temas indicados. |
| KH-S3-CYT-BIO-001 | Genética introductoria | ciencia-tecnologia | S3 | biologia | cyt.s3.genes-en-los-cromosomas, cyt.s3.genes-alelos-genotipo-fenotipo | El banco desglosa este contenido en los temas indicados. |
| KH-S3-CYT-BIO-004 | Herencia y variación | ciencia-tecnologia | S3 | biologia | cyt.s3.genes-alelos-genotipo-fenotipo, cyt.s3.cuadro-de-punnett | El banco desglosa este contenido en los temas indicados. |
| KH-S3-CYT-IND-001 | Diseño experimental controlado | ciencia-tecnologia | S3 | indagacion | cyt.s3.control-durante-el-experimento, cyt.s3.fundamentar-el-procedimiento | El banco desglosa este contenido en los temas indicados. |
| KH-S3-CYT-IND-002 | Variables y mediciones | ciencia-tecnologia | S3 | indagacion | cyt.s3.control-durante-el-experimento, cyt.s3.eleccion-de-instrumentos | El banco desglosa este contenido en los temas indicados. |
| KH-S3-CYT-QUI-003 | Enlaces químicos | ciencia-tecnologia | S3 | quimica | cyt.s3.enlace-ionico, cyt.s3.enlace-covalente | El banco desarrolla el contenido en varios temas. |
| KH-S3-CYT-QUI-004 | Compuestos químicos | ciencia-tecnologia | S3 | quimica | cyt.s3.inorganicos-en-la-vida-diaria, cyt.s3.hidroxidos | El banco desglosa este contenido en los temas indicados. |
| KH-S3-CYT-TEC-001 | Evaluación de soluciones tecnológicas | ciencia-tecnologia | S3 | tecnologia | cyt.s3.impacto-social-de-la-solucion, cyt.s3.pruebas-repetitivas-registro | El banco desglosa este contenido en los temas indicados. |
| KH-S3-CYT-TEC-002 | Mejora de prototipos | ciencia-tecnologia | S3 | tecnologia | cyt.s3.plan-de-pruebas, cyt.s3.pruebas-repetitivas-registro | El banco desglosa este contenido en los temas indicados. |
| KH-S3-MAT-ALG-002 | Factorización | matematica | S3 | algebra | mat.s3.factor-comun, mat.s3.factorizar-diferencia-cuadrados, mat.s3.factorizar-trinomio-cuadrado | El banco desarrolla el contenido en varios temas. |
| KH-S3-MAT-ALG-003 | Ecuaciones cuadráticas | matematica | S3 | algebra | mat.s3.ecuacion-ax2-c, mat.s3.factorizar-trinomio-cuadrado, mat.s3.binomio-cuadrado, mat.s3.factorizar-diferencia-cuadrados | El banco desarrolla el contenido en varios temas. |
| KH-S3-MAT-ALG-004 | Funciones y gráficas | matematica | S3 | algebra | mat.s3.lineal-vs-cuadratica, mat.s3.funcion-x2 | El banco desglosa este contenido en los temas indicados. |
| KH-S3-MAT-ALG-005 | Sistemas de ecuaciones | matematica | S3 | algebra | mat.s3.sistemas-equivalentes, mat.s3.plantear-sistemas | El banco desarrolla el contenido en varios temas. |
| KH-S3-MAT-ARI-006 | Operaciones con potencias | matematica | S3 | aritmetica | mat.s3.multiplicacion-division-cientifica, mat.s3.binomio-cuadrado | El banco desglosa este contenido en los temas indicados. |
| KH-S3-MAT-EST-001 | Medidas de dispersión | matematica | S3 | estadistica | mat.s3.varianza, mat.s3.desviacion-estandar | El banco desglosa este contenido en los temas indicados. |
| KH-S3-MAT-EST-002 | Probabilidad compuesta inicial | matematica | S3 | estadistica | mat.s3.regla-producto, mat.s3.propiedades-probabilidad | El banco desarrolla el contenido en varios temas. |
| KH-S3-MAT-EST-003 | Gráficos estadísticos | matematica | S3 | estadistica | mat.s3.graficos-comparativos, mat.s3.informes-estadisticos | El banco desglosa este contenido en los temas indicados. |
| KH-S3-MAT-GEO-002 | Teorema de Pitágoras | matematica | S3 | geometria | mat.s3.ternas-reciproco-pitagoras, mat.s3.resolver-triangulo-rectangulo | El banco desglosa este contenido en los temas indicados. |
| KH-S3-MAT-GEO-004 | Áreas y volúmenes | matematica | S3 | geometria | mat.s3.volumen-cilindro, mat.s3.solidos-compuestos-cilindro | El banco desglosa este contenido en los temas indicados. |
| KH-S3-MAT-RMA-001 | Problemas algebraicos | matematica | S3 | aritmetica | mat.s3.problemas-dos-incognitas, mat.s3.soluciones-enteras-inecuacion | El banco desglosa este contenido en los temas indicados. |
| KH-S3-MAT-TRI-001 | Razones trigonométricas introductorias | matematica | S3 | trigonometria | mat.s3.razones-trigonometricas, mat.s3.propiedades-razones-trigonometricas, mat.s3.razones-angulos-notables | El banco desarrolla el contenido en varios temas. |
| KH-S3-MAT-TRI-002 | Triángulos rectángulos | matematica | S3 | trigonometria | mat.s3.triangulos-notables, mat.s3.resolver-triangulo-rectangulo, mat.s3.relaciones-metricas-rectangulo | El banco desarrolla el contenido en varios temas. |
| KH-S4-COM-ESC-004 | Edición de textos | comunicacion | S4 | escritura | com.s4.reescribir-para-otro-destinatario, com.s4.transiciones-entre-parrafos | El banco desglosa este contenido en los temas indicados. |
| KH-S4-COM-LEC-001 | Análisis de discursos | comunicacion | S4 | comprension-lectora | com.s4.falacias-en-debates-y-discursos, com.s4.evaluar-la-eficacia-de-un-orador | El banco desglosa este contenido en los temas indicados. |
| KH-S4-COM-LIT-002 | Movimientos literarios | comunicacion | S4 | literatura | com.s4.el-modernismo-ruben-dario-y-marti, com.s4.del-modernismo-al-boom | El banco desglosa este contenido en los temas indicados. |
| KH-S4-COM-ORA-001 | Debate académico | comunicacion | S4 | oralidad | com.s4.moderar-un-debate-o-foro, com.s4.falacias-en-debates-y-discursos | El banco desglosa este contenido en los temas indicados. |
| KH-S4-COM-ORA-002 | Argumentación oral | comunicacion | S4 | oralidad | com.s4.falacias-en-debates-y-discursos, com.s4.evaluar-la-eficacia-de-un-orador | El banco desglosa este contenido en los temas indicados. |
| KH-S4-CYT-BIO-004 | Regulación biológica | ciencia-tecnologia | S4 | biologia | cyt.s4.homeostasis-retroalimentacion, cyt.s4.termorregulacion | El banco desglosa este contenido en los temas indicados. |
| KH-S4-CYT-IND-001 | Análisis de datos experimentales | ciencia-tecnologia | S4 | indagacion | cyt.s4.correlacion-y-causalidad, cyt.s4.graficos-de-dispersion | El banco desglosa este contenido en los temas indicados. |
| KH-S4-CYT-IND-002 | Diseño de experimentos | ciencia-tecnologia | S4 | indagacion | cyt.s4.grupo-control-experimental, cyt.s4.pruebas-repetitivas | El banco desglosa este contenido en los temas indicados. |
| KH-S4-CYT-QUI-001 | Reacciones químicas | ciencia-tecnologia | S4 | quimica | cyt.s4.reacciones-redox, cyt.s4.relaciones-mol-mol | El banco desglosa este contenido en los temas indicados. |
| KH-S4-CYT-QUI-002 | Estequiometría | ciencia-tecnologia | S4 | quimica | cyt.s4.relaciones-masa-masa, cyt.s4.estequiometria-volumen-molar | El banco desarrolla el contenido en varios temas. |
| KH-S4-CYT-QUI-003 | Soluciones | ciencia-tecnologia | S4 | quimica | cyt.s4.soluto-solvente-solubilidad, cyt.s4.dilucion-de-soluciones | El banco desglosa este contenido en los temas indicados. |
| KH-S4-CYT-QUI-004 | Concentraciones | ciencia-tecnologia | S4 | quimica | cyt.s4.partes-por-millon, cyt.s4.porcentaje-en-masa-y-volumen | El banco desarrolla el contenido en varios temas. |
| KH-S4-CYT-TEC-001 | Optimización de prototipos | ciencia-tecnologia | S4 | tecnologia | cyt.s4.verificacion-por-partes, cyt.s4.pruebas-repetitivas | El banco desglosa este contenido en los temas indicados. |
| KH-S4-CYT-TEC-002 | Validación de soluciones | ciencia-tecnologia | S4 | tecnologia | cyt.s4.validez-y-fiabilidad, cyt.s4.requerimientos-y-beneficios | El banco desglosa este contenido en los temas indicados. |
| KH-S4-CYT-TIE-002 | Riesgos ambientales | ciencia-tecnologia | S4 | tierra-universo | cyt.s4.mineria-y-mercurio, cyt.s4.degradacion-de-plasticos | El banco desglosa este contenido en los temas indicados. |
| KH-S4-CYT-TIE-003 | Gestión de recursos | ciencia-tecnologia | S4 | tierra-universo | cyt.s4.presupuesto-costos-tiempo, cyt.s4.requerimientos-y-beneficios | El banco desglosa este contenido en los temas indicados. |
| KH-S4-MAT-ALG-001 | Funciones cuadráticas | matematica | S4 | algebra | mat.s4.forma-factorizada, mat.s4.dominio-rango-cuadratica, mat.s4.modelar-funcion-cuadratica, mat.s4.segundas-diferencias | El banco desarrolla el contenido en varios temas. |
| KH-S4-MAT-ALG-002 | Sistemas de ecuaciones | matematica | S4 | algebra | mat.s4.sistemas-inecuaciones-una-variable, mat.s4.sistemas-coeficientes-racionales | El banco desarrolla el contenido en varios temas. |
| KH-S4-MAT-ALG-003 | Inecuaciones | matematica | S4 | algebra | mat.s4.inecuaciones-ambos-miembros, mat.s4.sistemas-inecuaciones-una-variable | El banco desarrolla el contenido en varios temas. |
| KH-S4-MAT-ALG-005 | Funciones polinómicas | matematica | S4 | algebra | mat.s4.forma-factorizada, mat.s4.modelar-funcion-cuadratica, mat.s4.division-ruffini | El banco desarrolla el contenido en varios temas. |
| KH-S4-MAT-ARI-003 | Operaciones con números reales | matematica | S4 | aritmetica | mat.s4.numeros-irracionales, mat.s4.multiplicar-dividir-radicales | El banco desglosa este contenido en los temas indicados. |
| KH-S4-MAT-ARI-004 | Modelación financiera | matematica | S4 | aritmetica | mat.s4.ofertas-credito-ahorro, mat.s4.depreciacion-compuesta | El banco desglosa este contenido en los temas indicados. |
| KH-S4-MAT-EST-002 | Análisis estadístico | matematica | S4 | estadistica | mat.s4.media-desviacion-hoja-calculo, mat.s4.desviacion-estandar-agrupados | El banco desglosa este contenido en los temas indicados. |
| KH-S4-MAT-EST-003 | Variabilidad de datos | matematica | S4 | estadistica | mat.s4.desviacion-estandar-agrupados, mat.s4.coeficiente-variacion | El banco desglosa este contenido en los temas indicados. |
| KH-S4-MAT-GEO-003 | Áreas y volúmenes | matematica | S4 | geometria | mat.s4.area-volumen-esfera, mat.s4.propiedades-homotecia, mat.s4.area-volumen-poliedros | El banco desarrolla el contenido en varios temas. |
| KH-S4-MAT-GEO-004 | Distancia entre puntos | matematica | S4 | geometria | mat.s4.distancia-punto-recta, mat.s4.distancias-inaccesibles | El banco desglosa este contenido en los temas indicados. |
| KH-S4-MAT-RMA-001 | Problemas integrados de modelación | matematica | S4 | aritmetica | mat.s4.evaluar-modelos-algebraicos, mat.s4.modelar-solidos-compuestos | El banco desglosa este contenido en los temas indicados. |
| KH-S4-MAT-RMA-002 | Estrategias algebraicas | matematica | S4 | aritmetica | mat.s4.cuadratica-por-factorizacion, mat.s4.completar-cuadrado | El banco desglosa este contenido en los temas indicados. |
| KH-S5-COM-ESC-002 | Informe de investigación | comunicacion | S5 | escritura | com.s5.esquema-de-la-monografia, com.s5.conclusiones-de-una-investigacion | El banco desglosa este contenido en los temas indicados. |
| KH-S5-COM-ESC-003 | Escritura académica | comunicacion | S5 | escritura | com.s5.generos-academicos, com.s5.ensayo-academico-argumentativo | El banco desglosa este contenido en los temas indicados. |
| KH-S5-COM-GRA-001 | Corrección lingüística | comunicacion | S5 | lenguaje | com.s5.palabras-baul-y-lenguaje-impreciso, com.s5.edicion-final-de-un-trabajo-academico | El banco desglosa este contenido en los temas indicados. |
| KH-S5-COM-GRA-003 | Cohesión y coherencia | comunicacion | S5 | lenguaje | com.s5.revisar-coherencia-de-un-texto-extenso, com.s5.nominalizacion | El banco desglosa este contenido en los temas indicados. |
| KH-S5-COM-LIT-003 | Análisis de obras | comunicacion | S5 | literatura | com.s5.multiples-interpretaciones-de-una-obra, com.s5.comparar-literatura-peruana-y-universal | El banco desglosa este contenido en los temas indicados. |
| KH-S5-COM-ORA-001 | Oratoria | comunicacion | S5 | oralidad | com.s5.discurso-de-graduacion, com.s5.sustentar-un-trabajo-de-investigacion | El banco desglosa este contenido en los temas indicados. |
| KH-S5-COM-ORA-003 | Entrevistas | comunicacion | S5 | oralidad | com.s5.la-entrevista-personal, com.s5.lenguaje-no-verbal-en-una-entrevista-personal | El banco desglosa este contenido en los temas indicados. |
| KH-S5-COM-ORA-004 | Presentaciones académicas | comunicacion | S5 | oralidad | com.s5.sustentar-un-trabajo-de-investigacion, com.s5.poster-academico | El banco desglosa este contenido en los temas indicados. |
| KH-S5-COM-RVB-001 | Argumentación y razonamiento verbal | comunicacion | S5 | razonamiento-verbal | com.s5.paradojas-y-matices-en-la-argumentacion, com.s5.razonamiento-deductivo-e-inductivo | El banco desglosa este contenido en los temas indicados. |
| KH-S5-CYT-BIO-001 | Biología molecular introductoria | ciencia-tecnologia | S5 | biologia | cyt.s5.universalidad-codigo-genetico, cyt.s5.enzimas-de-restriccion-adn-recombinante | El banco desglosa este contenido en los temas indicados. |
| KH-S5-CYT-BIO-004 | Genética y sociedad | ciencia-tecnologia | S5 | biologia | cyt.s5.diagnostico-consejo-genetico, cyt.s5.edicion-genetica-crispr | El banco desglosa este contenido en los temas indicados. |
| KH-S5-CYT-FIS-001 | Electricidad y magnetismo | ciencia-tecnologia | S5 | fisica | cyt.s5.fuerza-magnetica-conductor, cyt.s5.corriente-electrica, cyt.s5.ley-de-ohm | El banco desarrolla el contenido en varios temas. |
| KH-S5-CYT-FIS-002 | Ondas y óptica | ciencia-tecnologia | S5 | fisica | cyt.s5.ondas-electromagneticas-aplicaciones, cyt.s5.ondas-transversales-longitudinales, cyt.s5.ondas-estacionarias-resonancia | El banco desarrolla el contenido en varios temas. |
| KH-S5-CYT-FIS-004 | Circuitos eléctricos | ciencia-tecnologia | S5 | fisica | cyt.s5.corriente-electrica, cyt.s5.ley-de-ohm | El banco desglosa este contenido en los temas indicados. |
| KH-S5-CYT-IND-001 | Proyecto de investigación científica | ciencia-tecnologia | S5 | indagacion | cyt.s5.plan-de-indagacion-fundamentado, cyt.s5.informe-cientifico-escrito | El banco desglosa este contenido en los temas indicados. |
| KH-S5-CYT-TEC-001 | Proyecto tecnológico integral | ciencia-tecnologia | S5 | tecnologia | cyt.s5.proyecto-generador-electrico, cyt.s5.planos-tecnicos-con-cotas | El banco desglosa este contenido en los temas indicados. |
| KH-S5-CYT-TEC-002 | Evaluación del impacto de soluciones | ciencia-tecnologia | S5 | tecnologia | cyt.s5.fundamento-cientifico-solucion, cyt.s5.propuesta-de-mejora-fundamentada | El banco desglosa este contenido en los temas indicados. |
| KH-S5-CYT-TIE-001 | Sostenibilidad global | ciencia-tecnologia | S5 | tierra-universo | cyt.s5.desarrollo-sostenible, cyt.s5.huella-de-carbono | El banco desglosa este contenido en los temas indicados. |
| KH-S5-CYT-TIE-003 | Cambio climático | ciencia-tecnologia | S5 | tierra-universo | cyt.s5.acidificacion-de-oceanos, cyt.s5.fenomeno-el-nino | El banco desglosa este contenido en los temas indicados. |
| KH-S5-MAT-ALG-001 | Funciones exponenciales | matematica | S5 | algebra | mat.s5.funcion-exponencial, mat.s5.funcion-exponencial-natural, mat.s5.ecuaciones-exponenciales | El banco desarrolla el contenido en varios temas. |
| KH-S5-MAT-ALG-002 | Funciones logarítmicas | matematica | S5 | algebra | mat.s5.propiedades-logaritmos, mat.s5.logaritmo-como-exponente | El banco desarrolla el contenido en varios temas. |
| KH-S5-MAT-ALG-004 | Modelación funcional | matematica | S5 | algebra | mat.s5.modelos-exponenciales, mat.s5.ajustar-modelos-numericos | El banco desglosa este contenido en los temas indicados. |
| KH-S5-MAT-ARI-001 | Matemática financiera | matematica | S5 | aritmetica | mat.s5.capitalizacion-periodica, mat.s5.conveniencia-tasas | El banco desglosa este contenido en los temas indicados. |
| KH-S5-MAT-EST-002 | Inferencia estadística introductoria | matematica | S5 | estadistica | mat.s5.tamano-muestra, mat.s5.margen-de-error | El banco desglosa este contenido en los temas indicados. |
| KH-S5-MAT-EST-003 | Interpretación crítica de datos | matematica | S5 | estadistica | mat.s5.evaluar-estudios, mat.s5.informe-investigacion | El banco desglosa este contenido en los temas indicados. |
| KH-S5-MAT-EST-004 | Muestreo | matematica | S5 | estadistica | mat.s5.tamano-muestra, mat.s5.evaluar-estudios | El banco desglosa este contenido en los temas indicados. |
| KH-S5-MAT-GEO-001 | Geometría analítica avanzada | matematica | S5 | geometria | mat.s5.ecuacion-circunferencia, mat.s5.ecuacion-parabola | El banco desglosa curvas analíticas de este grado. |
| KH-S5-MAT-TRI-003 | Aplicaciones de trigonometría | matematica | S5 | trigonometria | mat.s5.area-triangulo-heron, mat.s5.rumbos-navegacion, mat.s5.razones-cualquier-angulo | El banco desarrolla el contenido en varios temas. |

## Nuevo

| Código | Título | Área | Grado | Disciplina | Clave(s) | Motivo |
|---|---|---|---|---|---|---|
| KH-P3-COM-RVB-001 | Analogías simples | comunicacion | P3 | razonamiento-verbal | com.p3.kh-rvb-001 | El banco del grado no contiene este contenido ni un desglose equivalente. |
| KH-P4-COM-RVB-001 | Analogías | comunicacion | P4 | razonamiento-verbal | com.p4.kh-rvb-001 | El banco del grado no contiene este contenido ni un desglose equivalente. |
| KH-P4-COM-RVB-003 | Términos excluidos | comunicacion | P4 | razonamiento-verbal | com.p4.kh-rvb-003 | El banco del grado no contiene este contenido ni un desglose equivalente. |
| KH-P5-COM-ESC-001 | Ensayo breve | comunicacion | P5 | escritura | com.p5.kh-esc-001 | El banco del grado no contiene este contenido ni un desglose equivalente. |
| KH-P5-COM-RVB-001 | Analogías | comunicacion | P5 | razonamiento-verbal | com.p5.kh-rvb-001 | El banco del grado no contiene este contenido ni un desglose equivalente. |
| KH-P6-COM-ESC-001 | Ensayos breves | comunicacion | P6 | escritura | com.p6.kh-esc-001 | El banco del grado no contiene este contenido ni un desglose equivalente. |
| KH-P6-COM-LIT-002 | Literatura peruana introductoria | comunicacion | P6 | literatura | com.p6.kh-lit-002 | El banco del grado no contiene este contenido ni un desglose equivalente. |
| KH-S5-CYT-BIO-003 | Salud pública | ciencia-tecnologia | S5 | biologia | cyt.s5.kh-bio-003 | El banco de S5 no desarrolla este contenido; requiere propuesta editorial. |
| KH-S5-CYT-QUI-002 | Equilibrio químico introductorio | ciencia-tecnologia | S5 | quimica | cyt.s5.kh-qui-002 | El banco de S5 no desarrolla este contenido; requiere propuesta editorial. |
| KH-S5-CYT-QUI-003 | Química ambiental | ciencia-tecnologia | S5 | quimica | cyt.s5.kh-qui-003 | El banco de S5 no desarrolla este contenido; requiere propuesta editorial. |
| KH-S5-MAT-ALG-005 | Composición de funciones | matematica | S5 | algebra | mat.s5.kh-alg-005 | No hay tema matemático equivalente en S5; la propuesta requiere revisión editorial. |
| KH-S5-MAT-GEO-002 | Vectores introductorios | matematica | S5 | geometria | mat.s5.kh-geo-002 | No hay tema matemático equivalente en S5; la propuesta requiere revisión editorial. |
| KH-S5-MAT-GEO-004 | Ecuaciones de la recta | matematica | S5 | geometria | mat.s5.kh-geo-004 | No hay tema matemático equivalente en S5; la propuesta requiere revisión editorial. |
| KH-S5-MAT-TRI-004 | Gráficas trigonométricas | matematica | S5 | trigonometria | mat.s5.kh-tri-004 | No hay tema matemático equivalente en S5; la propuesta requiere revisión editorial. |

## Conflicto

| Código | Título | Área | Grado | Disciplina | Clave(s) | Motivo |
|---|---|---|---|---|---|---|
| KH-P1-CYT-FIS-001 | Luz y sombra | ciencia-tecnologia | P1 | fisica | — | La sombra y fuentes de luz se estudian en P2; validar grado. |
| KH-P1-CYT-FIS-002 | Movimiento de objetos | ciencia-tecnologia | P1 | fisica | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P1-CYT-FIS-003 | Materiales del entorno | ciencia-tecnologia | P1 | fisica | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P1-CYT-TIE-001 | Día y noche | ciencia-tecnologia | P1 | tierra-universo | — | El ciclo día-noche no aparece en P1; validar progresión. |
| KH-P1-MAT-ARI-002 | Conteo hasta 100 | matematica | P1 | aritmetica | — | Contenido similar en grado vecino; validar progresión. |
| KH-P1-MAT-GEO-002 | Posiciones espaciales | matematica | P1 | geometria | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P1-MAT-GEO-004 | Medición no convencional | matematica | P1 | geometria | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P2-COM-ESC-001 | Párrafos breves | comunicacion | P2 | escritura | — | El párrafo se desarrolla explícitamente en P3; validar grado. |
| KH-P2-COM-ESC-003 | Notas y avisos | comunicacion | P2 | escritura | — | Escribir una nota aparece en P1; los avisos se desarrollan en P4. Revisar progresión de grado. |
| KH-P2-COM-GRA-003 | Signos de interrogación | comunicacion | P2 | lenguaje | — | Los signos de interrogación se desarrollan en P3; validar grado. |
| KH-P2-COM-GRA-004 | Signos de exclamación | comunicacion | P2 | lenguaje | — | Los signos de admiración se desarrollan en P3; validar grado. |
| KH-P2-COM-LEC-001 | Idea principal | comunicacion | P2 | comprension-lectora | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P2-COM-LIT-002 | Leyendas | comunicacion | P2 | literatura | — | La leyenda se desarrolla en P3; validar grado. |
| KH-P2-COM-ORA-002 | Exposición breve | comunicacion | P2 | oralidad | — | Contenido similar en grado vecino; validar progresión. |
| KH-P2-COM-ORA-003 | Escucha activa | comunicacion | P2 | oralidad | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P2-CYT-BIO-002 | Hábitats de animales | ciencia-tecnologia | P2 | biologia | — | La selección de suelo y animales diurnos no cubre el concepto de hábitat completo. |
| KH-P2-CYT-BIO-003 | Hábitos saludables | ciencia-tecnologia | P2 | biologia | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P2-CYT-BIO-004 | Partes de una planta | ciencia-tecnologia | P2 | biologia | — | Los temas seleccionados tratan ciclo de vida o adaptación, no partes de la planta. |
| KH-P2-CYT-FIS-002 | Movimiento de objetos | ciencia-tecnologia | P2 | fisica | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P2-CYT-IND-001 | Predicciones | ciencia-tecnologia | P2 | indagacion | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P2-CYT-TIE-001 | Clima cotidiano | ciencia-tecnologia | P2 | tierra-universo | — | El clima se desarrolla en P3; validar grado. |
| KH-P2-CYT-TIE-003 | Uso responsable del agua | ciencia-tecnologia | P2 | tierra-universo | — | Contenido similar en grado vecino; validar progresión. |
| KH-P2-MAT-ALG-002 | Equivalencias numéricas | matematica | P2 | algebra | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P2-MAT-ARI-001 | Números hasta mil | matematica | P2 | aritmetica | — | El banco P2 llega a 100; la centena y 1000 se desarrollan en P3. |
| KH-P2-MAT-ARI-007 | Multiplicación como suma reiterada | matematica | P2 | aritmetica | — | Contenido similar en grado vecino; validar progresión. |
| KH-P2-MAT-ARI-008 | Tablas de multiplicación iniciales | matematica | P2 | aritmetica | — | Contenido similar en grado vecino; validar progresión. |
| KH-P2-MAT-GEO-005 | Lectura de reloj | matematica | P2 | geometria | — | Contenido similar en grado vecino; validar progresión. |
| KH-P2-MAT-RMA-002 | Secuencias lógicas | matematica | P2 | aritmetica | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P3-COM-ESC-001 | Textos narrativos | comunicacion | P3 | escritura | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P3-COM-LEC-002 | Idea principal y detalles | comunicacion | P3 | comprension-lectora | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P3-COM-LEC-004 | Textos narrativos | comunicacion | P3 | comprension-lectora | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P3-COM-LEC-005 | Resumen de lectura | comunicacion | P3 | comprension-lectora | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P3-COM-LIT-001 | Mitos | comunicacion | P3 | literatura | — | Contenido similar en grado vecino; validar progresión. |
| KH-P3-COM-ORA-003 | Escucha crítica inicial | comunicacion | P3 | oralidad | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P3-COM-RVB-002 | Series de palabras | comunicacion | P3 | razonamiento-verbal | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P3-COM-RVB-003 | Palabras polisémicas | comunicacion | P3 | razonamiento-verbal | — | La polisemia se desarrolla explícitamente en P5; validar grado. |
| KH-P3-CYT-BIO-003 | Alimentación saludable | ciencia-tecnologia | P3 | biologia | — | Contenido similar en grado vecino; validar progresión. |
| KH-P3-CYT-BIO-004 | Relaciones entre organismos | ciencia-tecnologia | P3 | biologia | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P3-CYT-FIS-002 | Calor y temperatura inicial | ciencia-tecnologia | P3 | fisica | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P3-CYT-FIS-003 | Cambios de estado | ciencia-tecnologia | P3 | fisica | — | Los cambios de estado se desarrollan en grados posteriores; no equivalen a deformación. |
| KH-P3-CYT-IND-001 | Variables observables | ciencia-tecnologia | P3 | indagacion | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P3-CYT-IND-003 | Comparación de resultados | ciencia-tecnologia | P3 | indagacion | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P3-CYT-TIE-001 | Ciclo del agua | ciencia-tecnologia | P3 | tierra-universo | — | El tema no coincide con fuerzas del agua; validar grado. |
| KH-P3-CYT-TIE-002 | Ecosistemas locales | ciencia-tecnologia | P3 | tierra-universo | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P3-CYT-TIE-003 | Contaminación | ciencia-tecnologia | P3 | tierra-universo | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P3-MAT-ARI-001 | Números de cuatro cifras | matematica | P3 | aritmetica | — | El banco desarrolla cuatro cifras en P4, no en P3. |
| KH-P3-MAT-ARI-002 | Números de cinco cifras | matematica | P3 | aritmetica | — | El banco P3 solo llega a tres cifras; validar progresión de grado. |
| KH-P3-MAT-ARI-005 | Multiplicación por dos cifras | matematica | P3 | aritmetica | — | El algoritmo de dos cifras está en mat.p4.multiplicacion-dos-cifras; validar grado. |
| KH-P3-MAT-ARI-007 | División inexacta | matematica | P3 | aritmetica | — | La división con residuo se desarrolla en mat.p4.problemas-division-residuo; validar grado. |
| KH-P3-MAT-ARI-009 | Fracciones en la recta numérica | matematica | P3 | aritmetica | — | La representación de fracciones en la recta figura en P5; no equivale a la recta de naturales de P3. |
| KH-P3-MAT-GEO-005 | Ángulos intuitivos | matematica | P3 | geometria | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P3-MAT-RMA-001 | Problemas con información relevante | matematica | P3 | aritmetica | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P4-COM-ESC-004 | Cartas formales iniciales | comunicacion | P4 | escritura | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P4-COM-RVB-002 | Relaciones semánticas | comunicacion | P4 | razonamiento-verbal | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P4-CYT-BIO-003 | Relaciones alimentarias | ciencia-tecnologia | P4 | biologia | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P4-CYT-BIO-004 | Biodiversidad local | ciencia-tecnologia | P4 | biologia | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P4-CYT-IND-002 | Tablas de observación | ciencia-tecnologia | P4 | indagacion | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P4-CYT-TIE-002 | Contaminación ambiental | ciencia-tecnologia | P4 | tierra-universo | — | Un ejemplo de residuos electrónicos no cubre toda la contaminación ambiental. |
| KH-P4-CYT-TIE-003 | Cuidado de ecosistemas | ciencia-tecnologia | P4 | tierra-universo | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P4-MAT-ALG-002 | Ecuaciones sencillas | matematica | P4 | algebra | — | Contenido similar en grado vecino; validar progresión. |
| KH-P4-MAT-ARI-002 | Operaciones combinadas | matematica | P4 | aritmetica | — | Contenido similar en grado vecino; validar progresión. |
| KH-P4-MAT-ARI-004 | Múltiplos | matematica | P4 | aritmetica | — | Los temas indicados de P4 tratan multiplicación, no el concepto de múltiplo; revisar grado. |
| KH-P4-MAT-ARI-005 | Divisores | matematica | P4 | aritmetica | — | Los temas indicados de P4 tratan división, no el concepto de divisor; revisar grado. |
| KH-P4-MAT-ARI-009 | Números decimales | matematica | P4 | aritmetica | — | Contenido similar en grado vecino; validar progresión. |
| KH-P4-MAT-ARI-010 | Comparación de decimales | matematica | P4 | aritmetica | — | P4 no incluye comparación explícita de decimales; no equivalen fracciones ni números naturales. |
| KH-P4-MAT-GEO-002 | Triángulos | matematica | P4 | geometria | — | Los triángulos se presentan explícitamente en P3; P4 clasifica polígonos en general. |
| KH-P4-MAT-GEO-003 | Cuadriláteros | matematica | P4 | geometria | — | Los cuadriláteros se presentan explícitamente en P3; P4 aborda polígonos en general. |
| KH-P4-MAT-GEO-005 | Área de rectángulos | matematica | P4 | geometria | — | Contenido similar en grado vecino; validar progresión. |
| KH-P4-MAT-GEO-006 | Plano cartesiano inicial | matematica | P4 | geometria | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P4-MAT-RMA-002 | Razonamiento espacial | matematica | P4 | aritmetica | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P5-COM-ESC-002 | Textos de opinión | comunicacion | P5 | escritura | — | Equivalencia con otra disciplina; revisar asignación. |
| KH-P5-COM-GRA-001 | Oración simple | comunicacion | P5 | lenguaje | — | Contenido similar en grado vecino; validar progresión. |
| KH-P5-COM-GRA-002 | Conectores lógicos | comunicacion | P5 | lenguaje | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P5-COM-GRA-004 | Concordancia | comunicacion | P5 | lenguaje | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P5-COM-LEC-003 | Evaluación de fuentes | comunicacion | P5 | comprension-lectora | — | Cobertura parcial o relación dudosa; revisar contra el banco del grado. |
| KH-P5-COM-LIT-001 | Géneros literarios | comunicacion | P5 | literatura | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P5-COM-LIT-002 | Narrativa peruana | comunicacion | P5 | literatura | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P5-COM-ORA-001 | Exposición argumentada | comunicacion | P5 | oralidad | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P5-COM-RVB-002 | Series verbales | comunicacion | P5 | razonamiento-verbal | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P5-COM-RVB-003 | Campos semánticos | comunicacion | P5 | razonamiento-verbal | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P5-CYT-BIO-002 | Sistemas humanos | ciencia-tecnologia | P5 | biologia | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P5-CYT-FIS-001 | Energía y transformaciones | ciencia-tecnologia | P5 | fisica | — | Contenido similar en grado vecino; validar progresión. |
| KH-P5-CYT-FIS-002 | Circuitos eléctricos simples | ciencia-tecnologia | P5 | fisica | — | Contenido similar en grado vecino; validar progresión. |
| KH-P5-CYT-FIS-003 | Fuerza y trabajo inicial | ciencia-tecnologia | P5 | fisica | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P5-CYT-TIE-002 | Cambio climático inicial | ciencia-tecnologia | P5 | tierra-universo | — | Contenido similar en grado vecino; validar progresión. |
| KH-P5-MAT-ALG-001 | Expresiones con variables | matematica | P5 | algebra | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P5-MAT-ALG-004 | Relaciones funcionales iniciales | matematica | P5 | algebra | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P5-MAT-ARI-004 | División de fracciones | matematica | P5 | aritmetica | — | P5 no contiene división de fracciones; fracción por natural es otra operación. |
| KH-P5-MAT-ARI-005 | Porcentajes iniciales | matematica | P5 | aritmetica | — | Contenido similar en grado vecino; validar progresión. |
| KH-P5-MAT-EST-002 | Gráficos comparativos | matematica | P5 | estadistica | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P5-MAT-GEO-002 | Volumen de prismas | matematica | P5 | geometria | — | Los temas de P5 describen prismas y capacidad; el volumen se desarrolla en P6. |
| KH-P5-MAT-GEO-003 | Ángulos y coordenadas | matematica | P5 | geometria | — | P5 cubre ángulos, pero no se confirmó el componente de coordenadas. |
| KH-P5-MAT-GEO-004 | Circunferencia intuitiva | matematica | P5 | geometria | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P6-COM-ESC-002 | Informes | comunicacion | P6 | escritura | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P6-COM-LEC-001 | Análisis de textos argumentativos | comunicacion | P6 | comprension-lectora | — | Cobertura parcial o relación dudosa; revisar contra el banco del grado. |
| KH-P6-COM-LEC-004 | Evaluación de fuentes | comunicacion | P6 | comprension-lectora | — | Cobertura parcial o relación dudosa; revisar contra el banco del grado. |
| KH-P6-COM-ORA-001 | Debates | comunicacion | P6 | oralidad | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P6-COM-ORA-002 | Exposiciones con evidencias | comunicacion | P6 | oralidad | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P6-COM-RVB-001 | Inferencias verbales | comunicacion | P6 | razonamiento-verbal | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P6-CYT-BIO-004 | Sistemas humanos | ciencia-tecnologia | P6 | biologia | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P6-CYT-FIS-001 | Electricidad | ciencia-tecnologia | P6 | fisica | — | Circuitos en serie y paralelo son solo una parte del tema amplio; revisar alcance. |
| KH-P6-CYT-FIS-002 | Fuerza y máquinas | ciencia-tecnologia | P6 | fisica | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P6-CYT-FIS-003 | Transformaciones de energía | ciencia-tecnologia | P6 | fisica | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P6-CYT-TIE-002 | Riesgos naturales | ciencia-tecnologia | P6 | tierra-universo | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P6-CYT-TIE-003 | Sostenibilidad | ciencia-tecnologia | P6 | tierra-universo | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P6-MAT-ALG-001 | Expresiones algebraicas iniciales | matematica | P6 | algebra | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P6-MAT-ARI-005 | Números enteros introductorios | matematica | P6 | aritmetica | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P6-MAT-EST-004 | Tablas de frecuencia | matematica | P6 | estadistica | — | Contenido similar en grado vecino; validar progresión. |
| KH-P6-MAT-GEO-003 | Transformaciones geométricas | matematica | P6 | geometria | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-P6-MAT-GEO-004 | Escalas | matematica | P6 | geometria | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S1-COM-ESC-002 | Párrafos cohesionados | comunicacion | S1 | escritura | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S1-COM-GRA-002 | Oración simple | comunicacion | S1 | lenguaje | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S1-COM-LEC-003 | Textos informativos | comunicacion | S1 | comprension-lectora | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S1-COM-ORA-003 | Conversaciones argumentadas | comunicacion | S1 | oralidad | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S1-COM-RVB-001 | Analogías verbales | comunicacion | S1 | razonamiento-verbal | — | Contenido similar en grado vecino; validar progresión. |
| KH-S1-CYT-BIO-002 | Clasificación de seres vivos | ciencia-tecnologia | S1 | biologia | — | Célula y ancestro común no equivalen a criterios de clasificación de seres vivos. |
| KH-S1-CYT-FIS-001 | Movimiento | ciencia-tecnologia | S1 | fisica | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S1-CYT-FIS-002 | Fuerza | ciencia-tecnologia | S1 | fisica | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S1-CYT-FIS-003 | Energía | ciencia-tecnologia | S1 | fisica | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S1-CYT-IND-002 | Variables experimentales | ciencia-tecnologia | S1 | indagacion | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S1-CYT-QUI-001 | Materia y propiedades | ciencia-tecnologia | S1 | quimica | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S1-CYT-TIE-002 | Ambiente | ciencia-tecnologia | S1 | tierra-universo | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S1-CYT-TIE-003 | Ciclos naturales | ciencia-tecnologia | S1 | tierra-universo | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S1-MAT-ARI-003 | Números racionales | matematica | S1 | aritmetica | — | La división y recta de enteros no cubren la definición de racionales en S1. |
| KH-S1-MAT-RMA-001 | Razonamiento lógico | matematica | S1 | aritmetica | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S1-MAT-RMA-002 | Razonamiento numérico | matematica | S1 | aritmetica | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S2-COM-GRA-001 | Sintaxis básica | comunicacion | S2 | lenguaje | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S2-COM-LEC-002 | Argumentos y evidencias | comunicacion | S2 | comprension-lectora | — | Cobertura parcial o relación dudosa; revisar contra el banco del grado. |
| KH-S2-COM-LEC-003 | Textos discontinuos | comunicacion | S2 | comprension-lectora | — | Contenido similar en grado vecino; validar progresión. |
| KH-S2-COM-LIT-001 | Narrativa hispanoamericana | comunicacion | S2 | literatura | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S2-COM-ORA-001 | Debate argumentativo | comunicacion | S2 | oralidad | — | Cobertura parcial o relación dudosa; revisar contra el banco del grado. |
| KH-S2-COM-RVB-001 | Relaciones semánticas | comunicacion | S2 | razonamiento-verbal | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S2-CYT-BIO-003 | Biodiversidad | ciencia-tecnologia | S2 | biologia | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S2-CYT-BIO-004 | Relaciones ecológicas | ciencia-tecnologia | S2 | biologia | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S2-CYT-FIS-002 | Fuerzas | ciencia-tecnologia | S2 | fisica | — | Contenido similar en grado vecino; validar progresión. |
| KH-S2-CYT-QUI-001 | Átomos y moléculas | ciencia-tecnologia | S2 | quimica | — | Configuración electrónica no cubre moléculas en el mismo grado. |
| KH-S2-CYT-QUI-002 | Cambios físicos y químicos | ciencia-tecnologia | S2 | quimica | — | Contenido similar en grado vecino; validar progresión. |
| KH-S2-CYT-QUI-003 | Sustancias y mezclas | ciencia-tecnologia | S2 | quimica | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S2-CYT-TEC-002 | Pruebas de soluciones | ciencia-tecnologia | S2 | tecnologia | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S2-CYT-TIE-002 | Recursos naturales | ciencia-tecnologia | S2 | tierra-universo | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S2-CYT-TIE-003 | Impacto ambiental | ciencia-tecnologia | S2 | tierra-universo | — | Deforestación y carbono es un caso; no cubre todo el impacto ambiental. |
| KH-S2-MAT-ARI-003 | Porcentajes compuestos | matematica | S2 | aritmetica | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S2-MAT-EST-003 | Gráficos comparativos | matematica | S2 | estadistica | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S2-MAT-RMA-001 | Problemas de patrones | matematica | S2 | aritmetica | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S2-MAT-RMA-002 | Estrategias de resolución | matematica | S2 | aritmetica | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S3-COM-LEC-001 | Análisis argumentativo | comunicacion | S3 | comprension-lectora | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S3-COM-LEC-003 | Interpretación literaria | comunicacion | S3 | comprension-lectora | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S3-COM-LEC-004 | Análisis comparativo | comunicacion | S3 | comprension-lectora | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S3-COM-LIT-002 | Movimientos literarios introductorios | comunicacion | S3 | literatura | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S3-COM-LIT-003 | Recursos estilísticos | comunicacion | S3 | literatura | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S3-COM-ORA-003 | Escucha de argumentos | comunicacion | S3 | oralidad | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S3-COM-RVB-002 | Analogías complejas | comunicacion | S3 | razonamiento-verbal | — | Contenido similar en grado vecino; validar progresión. |
| KH-S3-CYT-BIO-002 | Evolución y biodiversidad | ciencia-tecnologia | S3 | biologia | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S3-CYT-BIO-003 | Sistemas de regulación | ciencia-tecnologia | S3 | biologia | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S3-CYT-FIS-001 | Cinemática | ciencia-tecnologia | S3 | fisica | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S3-CYT-FIS-002 | Dinámica | ciencia-tecnologia | S3 | fisica | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S3-CYT-FIS-003 | Conservación de energía | ciencia-tecnologia | S3 | fisica | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S3-CYT-FIS-004 | Gráficos de movimiento | ciencia-tecnologia | S3 | fisica | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S3-CYT-IND-003 | Comunicación de resultados | ciencia-tecnologia | S3 | indagacion | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S3-CYT-QUI-001 | Estructura atómica | ciencia-tecnologia | S3 | quimica | — | Lewis e isótopos no cubren toda la estructura atómica del candidato. |
| KH-S3-CYT-QUI-002 | Tabla periódica | ciencia-tecnologia | S3 | quimica | — | Contenido similar en grado vecino; validar progresión. |
| KH-S3-CYT-TIE-001 | Impacto ambiental | ciencia-tecnologia | S3 | tierra-universo | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S3-CYT-TIE-002 | Cambio climático | ciencia-tecnologia | S3 | tierra-universo | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S3-CYT-TIE-003 | Sostenibilidad | ciencia-tecnologia | S3 | tierra-universo | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S3-MAT-ARI-001 | Números reales | matematica | S3 | aritmetica | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S3-MAT-ARI-002 | Radicales | matematica | S3 | aritmetica | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S3-MAT-ARI-005 | Interés compuesto introductorio | matematica | S3 | aritmetica | — | La clave de interés simple no equivale; el interés compuesto aparece en S4. |
| KH-S3-MAT-GEO-003 | Geometría del espacio | matematica | S3 | geometria | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S3-MAT-RMA-002 | Razonamiento lógico | matematica | S3 | aritmetica | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S4-COM-ESC-001 | Ensayo académico | comunicacion | S4 | escritura | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S4-COM-ESC-003 | Investigación documental | comunicacion | S4 | escritura | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S4-COM-GRA-001 | Sintaxis compleja | comunicacion | S4 | lenguaje | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S4-COM-GRA-002 | Coherencia y cohesión | comunicacion | S4 | lenguaje | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S4-COM-GRA-003 | Corrección de estilo | comunicacion | S4 | lenguaje | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S4-COM-LEC-003 | Evaluación crítica | comunicacion | S4 | comprension-lectora | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S4-COM-LEC-004 | Interpretación de textos complejos | comunicacion | S4 | comprension-lectora | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S4-COM-LIT-001 | Literatura universal | comunicacion | S4 | literatura | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S4-COM-LIT-003 | Análisis de obras | comunicacion | S4 | literatura | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S4-COM-ORA-003 | Presentación persuasiva | comunicacion | S4 | oralidad | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S4-COM-RVB-001 | Comprensión crítica | comunicacion | S4 | razonamiento-verbal | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S4-COM-RVB-002 | Relaciones lógicas | comunicacion | S4 | razonamiento-verbal | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S4-CYT-BIO-001 | Genética mendeliana | ciencia-tecnologia | S4 | biologia | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S4-CYT-BIO-002 | Biotecnología introductoria | ciencia-tecnologia | S4 | biologia | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S4-CYT-FIS-001 | Leyes de Newton | ciencia-tecnologia | S4 | fisica | — | Contenido similar en grado vecino; validar progresión. |
| KH-S4-CYT-FIS-002 | Trabajo potencia y energía | ciencia-tecnologia | S4 | fisica | — | Contenido similar en grado vecino; validar progresión. |
| KH-S4-CYT-FIS-003 | Ondas | ciencia-tecnologia | S4 | fisica | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S4-CYT-FIS-004 | Movimiento circular inicial | ciencia-tecnologia | S4 | fisica | — | Contenido similar en grado vecino; validar progresión. |
| KH-S4-CYT-TIE-001 | Sostenibilidad | ciencia-tecnologia | S4 | tierra-universo | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S4-MAT-ARI-001 | Proporcionalidad avanzada | matematica | S4 | aritmetica | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S4-MAT-GEO-001 | Geometría analítica | matematica | S4 | geometria | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S4-MAT-GEO-002 | Circunferencia | matematica | S4 | geometria | — | Los temas propuestos tratan cuerpos redondos; la circunferencia se desarrolla en otro grado. |
| KH-S4-MAT-TRI-002 | Identidades fundamentales | matematica | S4 | trigonometria | — | Las identidades trigonométricas fundamentales aparecen en S5, no en S4. |
| KH-S4-MAT-TRI-003 | Resolución de triángulos | matematica | S4 | trigonometria | — | Contenido similar en grado vecino; validar progresión. |
| KH-S4-MAT-TRI-004 | Ángulos notables | matematica | S4 | trigonometria | — | El banco S4 aborda ángulos no notables; los notables aparecen en S3. |
| KH-S5-COM-ESC-004 | Citación de fuentes | comunicacion | S5 | escritura | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S5-COM-GRA-002 | Estilo y precisión | comunicacion | S5 | lenguaje | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S5-COM-LEC-001 | Lectura crítica avanzada | comunicacion | S5 | comprension-lectora | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S5-COM-LEC-002 | Análisis de discursos | comunicacion | S5 | comprension-lectora | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S5-COM-LEC-003 | Interpretación de textos complejos | comunicacion | S5 | comprension-lectora | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S5-COM-RVB-002 | Inferencias complejas | comunicacion | S5 | razonamiento-verbal | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S5-CYT-BIO-002 | Evolución | ciencia-tecnologia | S5 | biologia | — | Contenido similar en grado vecino; validar progresión. |
| KH-S5-CYT-IND-002 | Análisis de resultados | ciencia-tecnologia | S5 | indagacion | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S5-CYT-IND-003 | Comunicación de evidencias | ciencia-tecnologia | S5 | indagacion | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S5-CYT-QUI-001 | Química orgánica introductoria | ciencia-tecnologia | S5 | quimica | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S5-CYT-QUI-004 | Reacciones químicas | ciencia-tecnologia | S5 | quimica | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S5-CYT-TIE-002 | Gestión de riesgos | ciencia-tecnologia | S5 | tierra-universo | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S5-MAT-ARI-002 | Modelación proporcional | matematica | S5 | aritmetica | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S5-MAT-ARI-003 | Números reales y aplicaciones | matematica | S5 | aritmetica | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S5-MAT-ARI-004 | Porcentajes compuestos | matematica | S5 | aritmetica | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S5-MAT-GEO-003 | Problemas espaciales | matematica | S5 | geometria | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S5-MAT-RMA-001 | Resolución de problemas integrados | matematica | S5 | aritmetica | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S5-MAT-RMA-002 | Razonamiento lógico avanzado | matematica | S5 | aritmetica | — | Cobertura o equivalencia no concluyente; revisión pedagógica. |
| KH-S5-MAT-TRI-001 | Funciones trigonométricas | matematica | S5 | trigonometria | — | Razones e identidades no desarrollan por sí solas las funciones trigonométricas. |
| KH-S5-MAT-TRI-002 | Ecuaciones trigonométricas | matematica | S5 | trigonometria | — | Cobertura parcial o relación dudosa; revisar contra el banco del grado. |

## Inventario

| Código | Título | Área | Grado | Disciplina | Clave(s) | Motivo |
|---|---|---|---|---|---|---|
| KH-P1-AYC-GEN-001 | Colores primarios | arte-cultura | P1 | — | — | — |
| KH-P1-AYC-GEN-002 | Dibujo de observación | arte-cultura | P1 | — | — | — |
| KH-P1-AYC-GEN-003 | Ritmo y movimiento | arte-cultura | P1 | — | — | — |
| KH-P1-AYC-GEN-004 | Expresión con materiales | arte-cultura | P1 | — | — | — |
| KH-P1-AYC-GEN-005 | Canciones infantiles | arte-cultura | P1 | — | — | — |
| KH-P1-CSL-GEN-001 | Vocabulario cotidiano | castellano-segunda-lengua | P1 | — | — | — |
| KH-P1-CSL-GEN-002 | Saludos | castellano-segunda-lengua | P1 | — | — | — |
| KH-P1-CSL-GEN-003 | Presentaciones orales | castellano-segunda-lengua | P1 | — | — | — |
| KH-P1-CSL-GEN-004 | Comprensión de instrucciones | castellano-segunda-lengua | P1 | — | — | — |
| KH-P1-EFI-GEN-001 | Esquema corporal | educacion-fisica | P1 | — | — | — |
| KH-P1-EFI-GEN-002 | Equilibrio estático | educacion-fisica | P1 | — | — | — |
| KH-P1-EFI-GEN-003 | Desplazamientos | educacion-fisica | P1 | — | — | — |
| KH-P1-EFI-GEN-004 | Juegos cooperativos | educacion-fisica | P1 | — | — | — |
| KH-P1-EFI-GEN-005 | Hábitos de higiene | educacion-fisica | P1 | — | — | — |
| KH-P1-ENG-GEN-001 | Greetings | ingles | P1 | — | — | — |
| KH-P1-ENG-GEN-002 | Numbers and colors | ingles | P1 | — | — | — |
| KH-P1-ENG-GEN-003 | Family members | ingles | P1 | — | — | — |
| KH-P1-ENG-GEN-004 | Classroom objects | ingles | P1 | — | — | — |
| KH-P1-ENG-GEN-005 | Simple instructions | ingles | P1 | — | — | — |
| KH-P1-ENG-GEN-006 | Basic introductions | ingles | P1 | — | — | — |
| KH-P1-PS-CIV-001 | Normas de convivencia | personal-social | P1 | — | — | — |
| KH-P1-PS-CIV-002 | Derechos de la niñez | personal-social | P1 | — | — | — |
| KH-P1-PS-CIV-003 | Responsabilidades en casa | personal-social | P1 | — | — | — |
| KH-P1-PS-ECO-001 | Necesidades básicas | personal-social | P1 | — | — | — |
| KH-P1-PS-ECO-002 | Ahorro cotidiano | personal-social | P1 | — | — | — |
| KH-P1-PS-GEO-001 | Mi escuela | personal-social | P1 | — | — | — |
| KH-P1-PS-GEO-002 | Mi comunidad | personal-social | P1 | — | — | — |
| KH-P1-PS-GEO-003 | Lugares de referencia | personal-social | P1 | — | — | — |
| KH-P1-PS-HIS-001 | Historia personal | personal-social | P1 | — | — | — |
| KH-P1-PS-HIS-002 | Cambios con el tiempo | personal-social | P1 | — | — | — |
| KH-P1-PS-IDE-001 | Identidad personal | personal-social | P1 | — | — | — |
| KH-P1-PS-IDE-002 | Emociones | personal-social | P1 | — | — | — |
| KH-P1-PS-IDE-003 | Familia | personal-social | P1 | — | — | — |
| KH-P1-PS-IDE-004 | Autocuidado | personal-social | P1 | — | — | — |
| KH-P1-REL-GEN-001 | Respeto a los demás | educacion-religiosa | P1 | — | — | — |
| KH-P1-REL-GEN-002 | Solidaridad | educacion-religiosa | P1 | — | — | — |
| KH-P1-REL-GEN-003 | Celebraciones religiosas y familiares | educacion-religiosa | P1 | — | — | — |
| KH-P1-REL-GEN-004 | Cuidado de la creación | educacion-religiosa | P1 | — | — | — |
| KH-P2-AYC-GEN-001 | Formas y texturas | arte-cultura | P2 | — | — | — |
| KH-P2-AYC-GEN-002 | Collage | arte-cultura | P2 | — | — | — |
| KH-P2-AYC-GEN-003 | Canciones infantiles | arte-cultura | P2 | — | — | — |
| KH-P2-AYC-GEN-004 | Dramatización | arte-cultura | P2 | — | — | — |
| KH-P2-AYC-GEN-005 | Modelado artístico | arte-cultura | P2 | — | — | — |
| KH-P2-CSL-GEN-001 | Conversaciones cotidianas | castellano-segunda-lengua | P2 | — | — | — |
| KH-P2-CSL-GEN-002 | Lectura de textos breves | castellano-segunda-lengua | P2 | — | — | — |
| KH-P2-CSL-GEN-003 | Escritura de oraciones | castellano-segunda-lengua | P2 | — | — | — |
| KH-P2-CSL-GEN-004 | Vocabulario de la comunidad | castellano-segunda-lengua | P2 | — | — | — |
| KH-P2-EFI-GEN-001 | Coordinación motriz | educacion-fisica | P2 | — | — | — |
| KH-P2-EFI-GEN-002 | Lanzamientos y recepciones | educacion-fisica | P2 | — | — | — |
| KH-P2-EFI-GEN-003 | Juegos con reglas | educacion-fisica | P2 | — | — | — |
| KH-P2-EFI-GEN-004 | Higiene corporal | educacion-fisica | P2 | — | — | — |
| KH-P2-EFI-GEN-005 | Ritmo motor | educacion-fisica | P2 | — | — | — |
| KH-P2-ENG-GEN-001 | Daily routines | ingles | P2 | — | — | — |
| KH-P2-ENG-GEN-002 | Body parts | ingles | P2 | — | — | — |
| KH-P2-ENG-GEN-003 | Animals | ingles | P2 | — | — | — |
| KH-P2-ENG-GEN-004 | Days of the week | ingles | P2 | — | — | — |
| KH-P2-ENG-GEN-005 | Simple questions | ingles | P2 | — | — | — |
| KH-P2-ENG-GEN-006 | Describing people | ingles | P2 | — | — | — |
| KH-P2-PS-CIV-001 | Acuerdos de aula | personal-social | P2 | — | — | — |
| KH-P2-PS-CIV-002 | Participación escolar | personal-social | P2 | — | — | — |
| KH-P2-PS-CIV-003 | Derechos y deberes | personal-social | P2 | — | — | — |
| KH-P2-PS-ECO-001 | Necesidades y deseos | personal-social | P2 | — | — | — |
| KH-P2-PS-ECO-002 | Uso del dinero | personal-social | P2 | — | — | — |
| KH-P2-PS-GEO-001 | Orientación en la comunidad | personal-social | P2 | — | — | — |
| KH-P2-PS-GEO-002 | Servicios comunitarios | personal-social | P2 | — | — | — |
| KH-P2-PS-GEO-003 | Croquis sencillos | personal-social | P2 | — | — | — |
| KH-P2-PS-HIS-001 | Pasado y presente familiar | personal-social | P2 | — | — | — |
| KH-P2-PS-HIS-002 | Tradiciones locales | personal-social | P2 | — | — | — |
| KH-P2-PS-HIS-003 | Cambios en la comunidad | personal-social | P2 | — | — | — |
| KH-P2-PS-IDE-001 | Autoestima | personal-social | P2 | — | — | — |
| KH-P2-PS-IDE-002 | Manejo de emociones | personal-social | P2 | — | — | — |
| KH-P2-PS-IDE-003 | Identidad familiar | personal-social | P2 | — | — | — |
| KH-P2-REL-GEN-001 | Empatía | educacion-religiosa | P2 | — | — | — |
| KH-P2-REL-GEN-002 | Acciones solidarias | educacion-religiosa | P2 | — | — | — |
| KH-P2-REL-GEN-003 | Tradiciones religiosas | educacion-religiosa | P2 | — | — | — |
| KH-P2-REL-GEN-004 | Respeto a los demás | educacion-religiosa | P2 | — | — | — |
| KH-P3-AYC-GEN-001 | Colores secundarios | arte-cultura | P3 | — | — | — |
| KH-P3-AYC-GEN-002 | Composición visual | arte-cultura | P3 | — | — | — |
| KH-P3-AYC-GEN-003 | Instrumentos musicales | arte-cultura | P3 | — | — | — |
| KH-P3-AYC-GEN-004 | Teatro de personajes | arte-cultura | P3 | — | — | — |
| KH-P3-AYC-GEN-005 | Patrimonio local | arte-cultura | P3 | — | — | — |
| KH-P3-CSL-GEN-001 | Narración de experiencias | castellano-segunda-lengua | P3 | — | — | — |
| KH-P3-CSL-GEN-002 | Comprensión de párrafos | castellano-segunda-lengua | P3 | — | — | — |
| KH-P3-CSL-GEN-003 | Escritura guiada | castellano-segunda-lengua | P3 | — | — | — |
| KH-P3-CSL-GEN-004 | Vocabulario escolar | castellano-segunda-lengua | P3 | — | — | — |
| KH-P3-EFI-GEN-001 | Coordinación dinámica | educacion-fisica | P3 | — | — | — |
| KH-P3-EFI-GEN-002 | Juegos predeportivos | educacion-fisica | P3 | — | — | — |
| KH-P3-EFI-GEN-003 | Resistencia lúdica | educacion-fisica | P3 | — | — | — |
| KH-P3-EFI-GEN-004 | Trabajo en equipo | educacion-fisica | P3 | — | — | — |
| KH-P3-EFI-GEN-005 | Autocuidado | educacion-fisica | P3 | — | — | — |
| KH-P3-ENG-GEN-001 | School subjects | ingles | P3 | — | — | — |
| KH-P3-ENG-GEN-002 | Food and drinks | ingles | P3 | — | — | — |
| KH-P3-ENG-GEN-003 | Likes and dislikes | ingles | P3 | — | — | — |
| KH-P3-ENG-GEN-004 | Present simple introduction | ingles | P3 | — | — | — |
| KH-P3-ENG-GEN-005 | Short descriptions | ingles | P3 | — | — | — |
| KH-P3-ENG-GEN-006 | Telling the time | ingles | P3 | — | — | — |
| KH-P3-PS-CIV-001 | Normas democráticas | personal-social | P3 | — | — | — |
| KH-P3-PS-CIV-002 | Resolución de conflictos | personal-social | P3 | — | — | — |
| KH-P3-PS-CIV-003 | Participación escolar | personal-social | P3 | — | — | — |
| KH-P3-PS-ECO-001 | Bienes y servicios | personal-social | P3 | — | — | — |
| KH-P3-PS-ECO-002 | Consumo responsable | personal-social | P3 | — | — | — |
| KH-P3-PS-GEO-001 | Regiones naturales | personal-social | P3 | — | — | — |
| KH-P3-PS-GEO-002 | Mapas básicos | personal-social | P3 | — | — | — |
| KH-P3-PS-GEO-003 | Elementos del paisaje | personal-social | P3 | — | — | — |
| KH-P3-PS-HIS-001 | Fuentes históricas | personal-social | P3 | — | — | — |
| KH-P3-PS-HIS-002 | Primeras sociedades del Perú | personal-social | P3 | — | — | — |
| KH-P3-PS-HIS-003 | Líneas del tiempo | personal-social | P3 | — | — | — |
| KH-P3-PS-IDE-001 | Autoconocimiento | personal-social | P3 | — | — | — |
| KH-P3-PS-IDE-002 | Respeto a la diversidad | personal-social | P3 | — | — | — |
| KH-P3-PS-IDE-003 | Identidad cultural | personal-social | P3 | — | — | — |
| KH-P3-REL-GEN-001 | Dignidad humana | educacion-religiosa | P3 | — | — | — |
| KH-P3-REL-GEN-002 | Servicio a la comunidad | educacion-religiosa | P3 | — | — | — |
| KH-P3-REL-GEN-003 | Relatos religiosos | educacion-religiosa | P3 | — | — | — |
| KH-P3-REL-GEN-004 | Convivencia pacífica | educacion-religiosa | P3 | — | — | — |
| KH-P4-AYC-GEN-001 | Perspectiva inicial | arte-cultura | P4 | — | — | — |
| KH-P4-AYC-GEN-002 | Patrimonio artístico local | arte-cultura | P4 | — | — | — |
| KH-P4-AYC-GEN-003 | Ritmos peruanos | arte-cultura | P4 | — | — | — |
| KH-P4-AYC-GEN-004 | Creación escénica | arte-cultura | P4 | — | — | — |
| KH-P4-AYC-GEN-005 | Composición visual | arte-cultura | P4 | — | — | — |
| KH-P4-CSL-GEN-001 | Exposición breve | castellano-segunda-lengua | P4 | — | — | — |
| KH-P4-CSL-GEN-002 | Lectura informativa | castellano-segunda-lengua | P4 | — | — | — |
| KH-P4-CSL-GEN-003 | Producción de párrafos | castellano-segunda-lengua | P4 | — | — | — |
| KH-P4-CSL-GEN-004 | Vocabulario académico inicial | castellano-segunda-lengua | P4 | — | — | — |
| KH-P4-EFI-GEN-001 | Habilidades deportivas básicas | educacion-fisica | P4 | — | — | — |
| KH-P4-EFI-GEN-002 | Orientación espacial | educacion-fisica | P4 | — | — | — |
| KH-P4-EFI-GEN-003 | Capacidades físicas | educacion-fisica | P4 | — | — | — |
| KH-P4-EFI-GEN-004 | Juegos estratégicos | educacion-fisica | P4 | — | — | — |
| KH-P4-EFI-GEN-005 | Cooperación | educacion-fisica | P4 | — | — | — |
| KH-P4-ENG-GEN-001 | Daily activities | ingles | P4 | — | — | — |
| KH-P4-ENG-GEN-002 | Present simple | ingles | P4 | — | — | — |
| KH-P4-ENG-GEN-003 | Places in town | ingles | P4 | — | — | — |
| KH-P4-ENG-GEN-004 | Time expressions | ingles | P4 | — | — | — |
| KH-P4-ENG-GEN-005 | Reading short messages | ingles | P4 | — | — | — |
| KH-P4-ENG-GEN-006 | Making invitations | ingles | P4 | — | — | — |
| KH-P4-PS-CIV-001 | Derechos de la niñez | personal-social | P4 | — | — | — |
| KH-P4-PS-CIV-002 | Participación ciudadana | personal-social | P4 | — | — | — |
| KH-P4-PS-CIV-003 | Acuerdos comunitarios | personal-social | P4 | — | — | — |
| KH-P4-PS-ECO-001 | Ahorro y consumo responsable | personal-social | P4 | — | — | — |
| KH-P4-PS-ECO-002 | Actividades económicas | personal-social | P4 | — | — | — |
| KH-P4-PS-GEO-001 | Relieve del Perú | personal-social | P4 | — | — | — |
| KH-P4-PS-GEO-002 | Regiones y recursos | personal-social | P4 | — | — | — |
| KH-P4-PS-GEO-003 | Lectura de mapas | personal-social | P4 | — | — | — |
| KH-P4-PS-HIS-001 | Culturas prehispánicas | personal-social | P4 | — | — | — |
| KH-P4-PS-HIS-002 | Línea de tiempo histórica | personal-social | P4 | — | — | — |
| KH-P4-PS-HIS-003 | Fuentes históricas | personal-social | P4 | — | — | — |
| KH-P4-PS-IDE-001 | Cambios personales | personal-social | P4 | — | — | — |
| KH-P4-PS-IDE-002 | Identidad cultural | personal-social | P4 | — | — | — |
| KH-P4-PS-IDE-003 | Autorregulación | personal-social | P4 | — | — | — |
| KH-P4-REL-GEN-001 | Convivencia y respeto | educacion-religiosa | P4 | — | — | — |
| KH-P4-REL-GEN-002 | Tradiciones religiosas del Perú | educacion-religiosa | P4 | — | — | — |
| KH-P4-REL-GEN-003 | Compromiso comunitario | educacion-religiosa | P4 | — | — | — |
| KH-P4-REL-GEN-004 | Solidaridad | educacion-religiosa | P4 | — | — | — |
| KH-P5-AYC-GEN-001 | Arte prehispánico | arte-cultura | P5 | — | — | — |
| KH-P5-AYC-GEN-002 | Composición y proporción | arte-cultura | P5 | — | — | — |
| KH-P5-AYC-GEN-003 | Música tradicional | arte-cultura | P5 | — | — | — |
| KH-P5-AYC-GEN-004 | Proyecto artístico colectivo | arte-cultura | P5 | — | — | — |
| KH-P5-AYC-GEN-005 | Análisis de obras | arte-cultura | P5 | — | — | — |
| KH-P5-CSL-GEN-001 | Comprensión inferencial | castellano-segunda-lengua | P5 | — | — | — |
| KH-P5-CSL-GEN-002 | Textos descriptivos | castellano-segunda-lengua | P5 | — | — | — |
| KH-P5-CSL-GEN-003 | Presentaciones organizadas | castellano-segunda-lengua | P5 | — | — | — |
| KH-P5-CSL-GEN-004 | Producción escrita autónoma | castellano-segunda-lengua | P5 | — | — | — |
| KH-P5-EFI-GEN-001 | Deportes colectivos | educacion-fisica | P5 | — | — | — |
| KH-P5-EFI-GEN-002 | Coordinación avanzada | educacion-fisica | P5 | — | — | — |
| KH-P5-EFI-GEN-003 | Hábitos saludables | educacion-fisica | P5 | — | — | — |
| KH-P5-EFI-GEN-004 | Cooperación | educacion-fisica | P5 | — | — | — |
| KH-P5-EFI-GEN-005 | Juego limpio | educacion-fisica | P5 | — | — | — |
| KH-P5-ENG-GEN-001 | Present continuous | ingles | P5 | — | — | — |
| KH-P5-ENG-GEN-002 | Past simple introduction | ingles | P5 | — | — | — |
| KH-P5-ENG-GEN-003 | Comparatives | ingles | P5 | — | — | — |
| KH-P5-ENG-GEN-004 | Descriptions of places | ingles | P5 | — | — | — |
| KH-P5-ENG-GEN-005 | Short narratives | ingles | P5 | — | — | — |
| KH-P5-ENG-GEN-006 | Giving directions | ingles | P5 | — | — | — |
| KH-P5-PS-CIV-001 | Democracia escolar | personal-social | P5 | — | — | — |
| KH-P5-PS-CIV-002 | Derechos humanos | personal-social | P5 | — | — | — |
| KH-P5-PS-CIV-003 | Resolución de conflictos | personal-social | P5 | — | — | — |
| KH-P5-PS-ECO-001 | Presupuesto personal | personal-social | P5 | — | — | — |
| KH-P5-PS-ECO-002 | Actividades económicas | personal-social | P5 | — | — | — |
| KH-P5-PS-ECO-003 | Ahorro | personal-social | P5 | — | — | — |
| KH-P5-PS-GEO-001 | Cuencas del Perú | personal-social | P5 | — | — | — |
| KH-P5-PS-GEO-002 | Recursos del Perú | personal-social | P5 | — | — | — |
| KH-P5-PS-GEO-003 | Problemas ambientales | personal-social | P5 | — | — | — |
| KH-P5-PS-HIS-001 | Tahuantinsuyo | personal-social | P5 | — | — | — |
| KH-P5-PS-HIS-002 | Encuentro de sociedades | personal-social | P5 | — | — | — |
| KH-P5-PS-HIS-003 | Fuentes históricas | personal-social | P5 | — | — | — |
| KH-P5-PS-HIS-004 | Cronología histórica | personal-social | P5 | — | — | — |
| KH-P5-PS-IDE-001 | Identidad y pertenencia | personal-social | P5 | — | — | — |
| KH-P5-PS-IDE-002 | Diversidad cultural | personal-social | P5 | — | — | — |
| KH-P5-PS-IDE-003 | Cambios personales | personal-social | P5 | — | — | — |
| KH-P5-REL-GEN-001 | Libertad y responsabilidad | educacion-religiosa | P5 | — | — | — |
| KH-P5-REL-GEN-002 | Diálogo interreligioso | educacion-religiosa | P5 | — | — | — |
| KH-P5-REL-GEN-003 | Solidaridad organizada | educacion-religiosa | P5 | — | — | — |
| KH-P5-REL-GEN-004 | Compromiso ético | educacion-religiosa | P5 | — | — | — |
| KH-P6-AYC-GEN-001 | Patrimonio cultural peruano | arte-cultura | P6 | — | — | — |
| KH-P6-AYC-GEN-002 | Análisis de obras | arte-cultura | P6 | — | — | — |
| KH-P6-AYC-GEN-003 | Creación audiovisual inicial | arte-cultura | P6 | — | — | — |
| KH-P6-AYC-GEN-004 | Proyecto artístico | arte-cultura | P6 | — | — | — |
| KH-P6-AYC-GEN-005 | Música y sociedad | arte-cultura | P6 | — | — | — |
| KH-P6-CSL-GEN-001 | Textos argumentativos breves | castellano-segunda-lengua | P6 | — | — | — |
| KH-P6-CSL-GEN-002 | Comunicación formal | castellano-segunda-lengua | P6 | — | — | — |
| KH-P6-CSL-GEN-003 | Escritura autónoma | castellano-segunda-lengua | P6 | — | — | — |
| KH-P6-CSL-GEN-004 | Presentación oral | castellano-segunda-lengua | P6 | — | — | — |
| KH-P6-EFI-GEN-001 | Condición física | educacion-fisica | P6 | — | — | — |
| KH-P6-EFI-GEN-002 | Deportes y estrategia | educacion-fisica | P6 | — | — | — |
| KH-P6-EFI-GEN-003 | Autocuidado | educacion-fisica | P6 | — | — | — |
| KH-P6-EFI-GEN-004 | Convivencia deportiva | educacion-fisica | P6 | — | — | — |
| KH-P6-EFI-GEN-005 | Evaluación personal | educacion-fisica | P6 | — | — | — |
| KH-P6-ENG-GEN-001 | Past simple | ingles | P6 | — | — | — |
| KH-P6-ENG-GEN-002 | Future plans | ingles | P6 | — | — | — |
| KH-P6-ENG-GEN-003 | Modal verbs introduction | ingles | P6 | — | — | — |
| KH-P6-ENG-GEN-004 | Reading short stories | ingles | P6 | — | — | — |
| KH-P6-ENG-GEN-005 | Writing short paragraphs | ingles | P6 | — | — | — |
| KH-P6-ENG-GEN-006 | Interviews | ingles | P6 | — | — | — |
| KH-P6-PS-CIV-001 | Instituciones democráticas | personal-social | P6 | — | — | — |
| KH-P6-PS-CIV-002 | Constitución introductoria | personal-social | P6 | — | — | — |
| KH-P6-PS-CIV-003 | Participación y ciudadanía | personal-social | P6 | — | — | — |
| KH-P6-PS-ECO-001 | Impuestos introductorios | personal-social | P6 | — | — | — |
| KH-P6-PS-ECO-002 | Consumo responsable | personal-social | P6 | — | — | — |
| KH-P6-PS-ECO-003 | Sistema financiero inicial | personal-social | P6 | — | — | — |
| KH-P6-PS-GEO-001 | Organización territorial | personal-social | P6 | — | — | — |
| KH-P6-PS-GEO-002 | Problemas ambientales | personal-social | P6 | — | — | — |
| KH-P6-PS-GEO-003 | Gestión de riesgos | personal-social | P6 | — | — | — |
| KH-P6-PS-HIS-001 | Virreinato | personal-social | P6 | — | — | — |
| KH-P6-PS-HIS-002 | Independencia del Perú | personal-social | P6 | — | — | — |
| KH-P6-PS-HIS-003 | República inicial | personal-social | P6 | — | — | — |
| KH-P6-PS-IDE-001 | Proyecto personal | personal-social | P6 | — | — | — |
| KH-P6-PS-IDE-002 | Diversidad e inclusión | personal-social | P6 | — | — | — |
| KH-P6-PS-IDE-003 | Autonomía | personal-social | P6 | — | — | — |
| KH-P6-REL-GEN-001 | Decisiones éticas | educacion-religiosa | P6 | — | — | — |
| KH-P6-REL-GEN-002 | Respeto a creencias | educacion-religiosa | P6 | — | — | — |
| KH-P6-REL-GEN-003 | Proyecto de vida y servicio | educacion-religiosa | P6 | — | — | — |
| KH-P6-REL-GEN-004 | Diálogo y convivencia | educacion-religiosa | P6 | — | — | — |
| KH-S1-AYC-GEN-001 | Elementos visuales | arte-cultura | S1 | — | — | — |
| KH-S1-AYC-GEN-002 | Música y ritmo | arte-cultura | S1 | — | — | — |
| KH-S1-AYC-GEN-003 | Teatro | arte-cultura | S1 | — | — | — |
| KH-S1-AYC-GEN-004 | Apreciación cultural | arte-cultura | S1 | — | — | — |
| KH-S1-AYC-GEN-005 | Creación artística | arte-cultura | S1 | — | — | — |
| KH-S1-CCS-ECO-001 | Necesidades y recursos | ciencias-sociales | S1 | — | — | — |
| KH-S1-CCS-ECO-002 | Agentes económicos | ciencias-sociales | S1 | — | — | — |
| KH-S1-CCS-ECO-003 | Ahorro | ciencias-sociales | S1 | — | — | — |
| KH-S1-CCS-ECO-004 | Actividades económicas | ciencias-sociales | S1 | — | — | — |
| KH-S1-CCS-GEO-001 | Representación cartográfica | ciencias-sociales | S1 | — | — | — |
| KH-S1-CCS-GEO-002 | Espacio geográfico | ciencias-sociales | S1 | — | — | — |
| KH-S1-CCS-GEO-003 | Ambientes del Perú | ciencias-sociales | S1 | — | — | — |
| KH-S1-CCS-GEO-004 | Población | ciencias-sociales | S1 | — | — | — |
| KH-S1-CCS-HIS-001 | Primeras civilizaciones | ciencias-sociales | S1 | — | — | — |
| KH-S1-CCS-HIS-002 | Civilizaciones antiguas | ciencias-sociales | S1 | — | — | — |
| KH-S1-CCS-HIS-003 | Sociedades andinas tempranas | ciencias-sociales | S1 | — | — | — |
| KH-S1-CCS-HIS-004 | Fuentes históricas | ciencias-sociales | S1 | — | — | — |
| KH-S1-CSL-GEN-001 | Comprensión oral académica | castellano-segunda-lengua | S1 | — | — | — |
| KH-S1-CSL-GEN-002 | Lectura guiada | castellano-segunda-lengua | S1 | — | — | — |
| KH-S1-CSL-GEN-003 | Producción de textos breves | castellano-segunda-lengua | S1 | — | — | — |
| KH-S1-CSL-GEN-004 | Vocabulario académico | castellano-segunda-lengua | S1 | — | — | — |
| KH-S1-DPC-CIV-001 | Normas y convivencia | dpcc | S1 | — | — | — |
| KH-S1-DPC-CIV-002 | Derechos y deberes | dpcc | S1 | — | — | — |
| KH-S1-DPC-CIV-003 | Resolución pacífica de conflictos | dpcc | S1 | — | — | — |
| KH-S1-DPC-CIV-004 | Participación escolar | dpcc | S1 | — | — | — |
| KH-S1-DPC-IDE-001 | Identidad adolescente | dpcc | S1 | — | — | — |
| KH-S1-DPC-IDE-002 | Autoconocimiento | dpcc | S1 | — | — | — |
| KH-S1-DPC-IDE-003 | Emociones | dpcc | S1 | — | — | — |
| KH-S1-DPC-IDE-004 | Cambios personales | dpcc | S1 | — | — | — |
| KH-S1-EFI-GEN-001 | Capacidades físicas | educacion-fisica | S1 | — | — | — |
| KH-S1-EFI-GEN-002 | Coordinación | educacion-fisica | S1 | — | — | — |
| KH-S1-EFI-GEN-003 | Deportes colectivos | educacion-fisica | S1 | — | — | — |
| KH-S1-EFI-GEN-004 | Salud corporal | educacion-fisica | S1 | — | — | — |
| KH-S1-EFI-GEN-005 | Convivencia deportiva | educacion-fisica | S1 | — | — | — |
| KH-S1-ENG-GEN-001 | Present simple | ingles | S1 | — | — | — |
| KH-S1-ENG-GEN-002 | Present continuous | ingles | S1 | — | — | — |
| KH-S1-ENG-GEN-003 | Personal information | ingles | S1 | — | — | — |
| KH-S1-ENG-GEN-004 | Daily routines | ingles | S1 | — | — | — |
| KH-S1-ENG-GEN-005 | Reading descriptions | ingles | S1 | — | — | — |
| KH-S1-ENG-GEN-006 | Writing paragraphs | ingles | S1 | — | — | — |
| KH-S1-EPT-GEN-001 | Identificación de necesidades | ept | S1 | — | — | — |
| KH-S1-EPT-GEN-002 | Ideas de solución | ept | S1 | — | — | — |
| KH-S1-EPT-GEN-003 | Trabajo colaborativo | ept | S1 | — | — | — |
| KH-S1-EPT-GEN-004 | Prototipo inicial | ept | S1 | — | — | — |
| KH-S1-EPT-GEN-005 | Presentación de proyectos | ept | S1 | — | — | — |
| KH-S1-EPT-GEN-006 | Evaluación de necesidades | ept | S1 | — | — | — |
| KH-S1-REL-GEN-001 | Identidad y espiritualidad | educacion-religiosa | S1 | — | — | — |
| KH-S1-REL-GEN-002 | Dignidad de la persona | educacion-religiosa | S1 | — | — | — |
| KH-S1-REL-GEN-003 | Diálogo respetuoso | educacion-religiosa | S1 | — | — | — |
| KH-S1-REL-GEN-004 | Acción solidaria | educacion-religiosa | S1 | — | — | — |
| KH-S2-AYC-GEN-001 | Lenguaje audiovisual | arte-cultura | S2 | — | — | — |
| KH-S2-AYC-GEN-002 | Patrimonio artístico | arte-cultura | S2 | — | — | — |
| KH-S2-AYC-GEN-003 | Creación musical | arte-cultura | S2 | — | — | — |
| KH-S2-AYC-GEN-004 | Representación teatral | arte-cultura | S2 | — | — | — |
| KH-S2-AYC-GEN-005 | Crítica artística | arte-cultura | S2 | — | — | — |
| KH-S2-CCS-ECO-001 | Mercados | ciencias-sociales | S2 | — | — | — |
| KH-S2-CCS-ECO-002 | Oferta y demanda introductoria | ciencias-sociales | S2 | — | — | — |
| KH-S2-CCS-ECO-003 | Decisiones económicas | ciencias-sociales | S2 | — | — | — |
| KH-S2-CCS-ECO-004 | Sistema financiero inicial | ciencias-sociales | S2 | — | — | — |
| KH-S2-CCS-GEO-001 | Climas | ciencias-sociales | S2 | — | — | — |
| KH-S2-CCS-GEO-002 | Población y migración | ciencias-sociales | S2 | — | — | — |
| KH-S2-CCS-GEO-003 | Gestión del territorio | ciencias-sociales | S2 | — | — | — |
| KH-S2-CCS-GEO-004 | Problemas ambientales | ciencias-sociales | S2 | — | — | — |
| KH-S2-CCS-HIS-001 | Sociedades medievales | ciencias-sociales | S2 | — | — | — |
| KH-S2-CCS-HIS-002 | Sociedades andinas | ciencias-sociales | S2 | — | — | — |
| KH-S2-CCS-HIS-003 | Expansiones e intercambios históricos | ciencias-sociales | S2 | — | — | — |
| KH-S2-CCS-HIS-004 | Interpretación de fuentes | ciencias-sociales | S2 | — | — | — |
| KH-S2-CSL-GEN-001 | Exposición académica | castellano-segunda-lengua | S2 | — | — | — |
| KH-S2-CSL-GEN-002 | Lectura inferencial | castellano-segunda-lengua | S2 | — | — | — |
| KH-S2-CSL-GEN-003 | Textos explicativos | castellano-segunda-lengua | S2 | — | — | — |
| KH-S2-CSL-GEN-004 | Discusión guiada | castellano-segunda-lengua | S2 | — | — | — |
| KH-S2-DPC-CIV-001 | Participación democrática | dpcc | S2 | — | — | — |
| KH-S2-DPC-CIV-002 | Derechos humanos | dpcc | S2 | — | — | — |
| KH-S2-DPC-CIV-003 | Diversidad cultural | dpcc | S2 | — | — | — |
| KH-S2-DPC-CIV-004 | Prevención de violencia | dpcc | S2 | — | — | — |
| KH-S2-DPC-IDE-001 | Autoestima y autonomía | dpcc | S2 | — | — | — |
| KH-S2-DPC-IDE-002 | Relaciones saludables | dpcc | S2 | — | — | — |
| KH-S2-DPC-IDE-003 | Manejo de conflictos | dpcc | S2 | — | — | — |
| KH-S2-DPC-IDE-004 | Identidad cultural | dpcc | S2 | — | — | — |
| KH-S2-EFI-GEN-001 | Resistencia y fuerza | educacion-fisica | S2 | — | — | — |
| KH-S2-EFI-GEN-002 | Estrategias deportivas | educacion-fisica | S2 | — | — | — |
| KH-S2-EFI-GEN-003 | Alimentación saludable | educacion-fisica | S2 | — | — | — |
| KH-S2-EFI-GEN-004 | Juego limpio | educacion-fisica | S2 | — | — | — |
| KH-S2-EFI-GEN-005 | Autocuidado | educacion-fisica | S2 | — | — | — |
| KH-S2-ENG-GEN-001 | Past simple | ingles | S2 | — | — | — |
| KH-S2-ENG-GEN-002 | Past continuous introduction | ingles | S2 | — | — | — |
| KH-S2-ENG-GEN-003 | Comparatives | ingles | S2 | — | — | — |
| KH-S2-ENG-GEN-004 | Narrative texts | ingles | S2 | — | — | — |
| KH-S2-ENG-GEN-005 | Giving opinions | ingles | S2 | — | — | — |
| KH-S2-ENG-GEN-006 | Writing stories | ingles | S2 | — | — | — |
| KH-S2-EPT-GEN-001 | Investigación de usuarios | ept | S2 | — | — | — |
| KH-S2-EPT-GEN-002 | Propuesta de valor | ept | S2 | — | — | — |
| KH-S2-EPT-GEN-003 | Diseño de prototipos | ept | S2 | — | — | — |
| KH-S2-EPT-GEN-004 | Costos iniciales | ept | S2 | — | — | — |
| KH-S2-EPT-GEN-005 | Evaluación de soluciones | ept | S2 | — | — | — |
| KH-S2-EPT-GEN-006 | Presentación de proyectos | ept | S2 | — | — | — |
| KH-S2-REL-GEN-001 | Conciencia ética | educacion-religiosa | S2 | — | — | — |
| KH-S2-REL-GEN-002 | Tradiciones religiosas | educacion-religiosa | S2 | — | — | — |
| KH-S2-REL-GEN-003 | Servicio y comunidad | educacion-religiosa | S2 | — | — | — |
| KH-S2-REL-GEN-004 | Diálogo intercultural | educacion-religiosa | S2 | — | — | — |
| KH-S3-AYC-GEN-001 | Historia del arte | arte-cultura | S3 | — | — | — |
| KH-S3-AYC-GEN-002 | Fotografía | arte-cultura | S3 | — | — | — |
| KH-S3-AYC-GEN-003 | Creación audiovisual | arte-cultura | S3 | — | — | — |
| KH-S3-AYC-GEN-004 | Crítica artística | arte-cultura | S3 | — | — | — |
| KH-S3-AYC-GEN-005 | Proyecto artístico | arte-cultura | S3 | — | — | — |
| KH-S3-CCS-ECO-001 | Sistema financiero | ciencias-sociales | S3 | — | — | — |
| KH-S3-CCS-ECO-002 | Inflación introductoria | ciencias-sociales | S3 | — | — | — |
| KH-S3-CCS-ECO-003 | Consumo y ahorro | ciencias-sociales | S3 | — | — | — |
| KH-S3-CCS-ECO-004 | Decisiones económicas | ciencias-sociales | S3 | — | — | — |
| KH-S3-CCS-GEO-001 | Dinámicas poblacionales | ciencias-sociales | S3 | — | — | — |
| KH-S3-CCS-GEO-002 | Problemas ambientales | ciencias-sociales | S3 | — | — | — |
| KH-S3-CCS-GEO-003 | Gestión de riesgos | ciencias-sociales | S3 | — | — | — |
| KH-S3-CCS-GEO-004 | Territorio y sociedad | ciencias-sociales | S3 | — | — | — |
| KH-S3-CCS-HIS-001 | Expansión europea | ciencias-sociales | S3 | — | — | — |
| KH-S3-CCS-HIS-002 | Conquista y colonización | ciencias-sociales | S3 | — | — | — |
| KH-S3-CCS-HIS-003 | Virreinato peruano | ciencias-sociales | S3 | — | — | — |
| KH-S3-CCS-HIS-004 | Cambios históricos | ciencias-sociales | S3 | — | — | — |
| KH-S3-CSL-GEN-001 | Textos argumentativos | castellano-segunda-lengua | S3 | — | — | — |
| KH-S3-CSL-GEN-002 | Debates guiados | castellano-segunda-lengua | S3 | — | — | — |
| KH-S3-CSL-GEN-003 | Escritura académica | castellano-segunda-lengua | S3 | — | — | — |
| KH-S3-CSL-GEN-004 | Lectura crítica | castellano-segunda-lengua | S3 | — | — | — |
| KH-S3-DPC-CIV-001 | Estado de derecho | dpcc | S3 | — | — | — |
| KH-S3-DPC-CIV-002 | Participación ciudadana | dpcc | S3 | — | — | — |
| KH-S3-DPC-CIV-003 | Convivencia democrática | dpcc | S3 | — | — | — |
| KH-S3-DPC-CIV-004 | Derechos fundamentales | dpcc | S3 | — | — | — |
| KH-S3-DPC-IDE-001 | Identidad y autonomía | dpcc | S3 | — | — | — |
| KH-S3-DPC-IDE-002 | Afectividad | dpcc | S3 | — | — | — |
| KH-S3-DPC-IDE-003 | Decisiones responsables | dpcc | S3 | — | — | — |
| KH-S3-DPC-IDE-004 | Proyecto personal | dpcc | S3 | — | — | — |
| KH-S3-EFI-GEN-001 | Entrenamiento físico | educacion-fisica | S3 | — | — | — |
| KH-S3-EFI-GEN-002 | Táctica deportiva | educacion-fisica | S3 | — | — | — |
| KH-S3-EFI-GEN-003 | Prevención de lesiones | educacion-fisica | S3 | — | — | — |
| KH-S3-EFI-GEN-004 | Actividad física y bienestar | educacion-fisica | S3 | — | — | — |
| KH-S3-EFI-GEN-005 | Trabajo en equipo | educacion-fisica | S3 | — | — | — |
| KH-S3-ENG-GEN-001 | Present perfect introduction | ingles | S3 | — | — | — |
| KH-S3-ENG-GEN-002 | Future forms | ingles | S3 | — | — | — |
| KH-S3-ENG-GEN-003 | Conditionals introduction | ingles | S3 | — | — | — |
| KH-S3-ENG-GEN-004 | Reading articles | ingles | S3 | — | — | — |
| KH-S3-ENG-GEN-005 | Opinion writing | ingles | S3 | — | — | — |
| KH-S3-ENG-GEN-006 | Oral presentations | ingles | S3 | — | — | — |
| KH-S3-EPT-GEN-001 | Modelo de negocio | ept | S3 | — | — | — |
| KH-S3-EPT-GEN-002 | Investigación de mercado | ept | S3 | — | — | — |
| KH-S3-EPT-GEN-003 | Presupuesto | ept | S3 | — | — | — |
| KH-S3-EPT-GEN-004 | Marketing básico | ept | S3 | — | — | — |
| KH-S3-EPT-GEN-005 | Validación de prototipos | ept | S3 | — | — | — |
| KH-S3-EPT-GEN-006 | Trabajo colaborativo | ept | S3 | — | — | — |
| KH-S3-REL-GEN-001 | Libertad y responsabilidad | educacion-religiosa | S3 | — | — | — |
| KH-S3-REL-GEN-002 | Ética social | educacion-religiosa | S3 | — | — | — |
| KH-S3-REL-GEN-003 | Diálogo entre creencias | educacion-religiosa | S3 | — | — | — |
| KH-S3-REL-GEN-004 | Servicio comunitario | educacion-religiosa | S3 | — | — | — |
| KH-S4-AYC-GEN-001 | Arte contemporáneo | arte-cultura | S4 | — | — | — |
| KH-S4-AYC-GEN-002 | Producción multimedia | arte-cultura | S4 | — | — | — |
| KH-S4-AYC-GEN-003 | Gestión de proyectos artísticos | arte-cultura | S4 | — | — | — |
| KH-S4-AYC-GEN-004 | Análisis cultural | arte-cultura | S4 | — | — | — |
| KH-S4-AYC-GEN-005 | Creación colectiva | arte-cultura | S4 | — | — | — |
| KH-S4-CCS-ECO-001 | Política económica introductoria | ciencias-sociales | S4 | — | — | — |
| KH-S4-CCS-ECO-002 | Tributación | ciencias-sociales | S4 | — | — | — |
| KH-S4-CCS-ECO-003 | Comercio internacional | ciencias-sociales | S4 | — | — | — |
| KH-S4-CCS-ECO-004 | Finanzas personales | ciencias-sociales | S4 | — | — | — |
| KH-S4-CCS-GEO-001 | Ordenamiento territorial | ciencias-sociales | S4 | — | — | — |
| KH-S4-CCS-GEO-002 | Conflictos socioambientales | ciencias-sociales | S4 | — | — | — |
| KH-S4-CCS-GEO-003 | Recursos estratégicos | ciencias-sociales | S4 | — | — | — |
| KH-S4-CCS-GEO-004 | Dinámica territorial | ciencias-sociales | S4 | — | — | — |
| KH-S4-CCS-HIS-001 | Independencia del Perú | ciencias-sociales | S4 | — | — | — |
| KH-S4-CCS-HIS-002 | Formación republicana | ciencias-sociales | S4 | — | — | — |
| KH-S4-CCS-HIS-003 | Transformaciones del siglo XIX | ciencias-sociales | S4 | — | — | — |
| KH-S4-CCS-HIS-004 | Conflictos y cambios | ciencias-sociales | S4 | — | — | — |
| KH-S4-CSL-GEN-001 | Lectura crítica | castellano-segunda-lengua | S4 | — | — | — |
| KH-S4-CSL-GEN-002 | Ensayos guiados | castellano-segunda-lengua | S4 | — | — | — |
| KH-S4-CSL-GEN-003 | Presentaciones formales | castellano-segunda-lengua | S4 | — | — | — |
| KH-S4-CSL-GEN-004 | Debates académicos | castellano-segunda-lengua | S4 | — | — | — |
| KH-S4-DPC-CIV-001 | Instituciones del Estado | dpcc | S4 | — | — | — |
| KH-S4-DPC-CIV-002 | Democracia y representación | dpcc | S4 | — | — | — |
| KH-S4-DPC-CIV-003 | Participación política responsable | dpcc | S4 | — | — | — |
| KH-S4-DPC-CIV-004 | Derechos y deberes | dpcc | S4 | — | — | — |
| KH-S4-DPC-IDE-001 | Proyecto de vida | dpcc | S4 | — | — | — |
| KH-S4-DPC-IDE-002 | Relaciones responsables | dpcc | S4 | — | — | — |
| KH-S4-DPC-IDE-003 | Ética personal | dpcc | S4 | — | — | — |
| KH-S4-DPC-IDE-004 | Toma de decisiones | dpcc | S4 | — | — | — |
| KH-S4-EFI-GEN-001 | Plan de entrenamiento | educacion-fisica | S4 | — | — | — |
| KH-S4-EFI-GEN-002 | Deportes especializados | educacion-fisica | S4 | — | — | — |
| KH-S4-EFI-GEN-003 | Nutrición y rendimiento | educacion-fisica | S4 | — | — | — |
| KH-S4-EFI-GEN-004 | Liderazgo deportivo | educacion-fisica | S4 | — | — | — |
| KH-S4-EFI-GEN-005 | Salud física | educacion-fisica | S4 | — | — | — |
| KH-S4-ENG-GEN-001 | Present perfect | ingles | S4 | — | — | — |
| KH-S4-ENG-GEN-002 | Passive voice introduction | ingles | S4 | — | — | — |
| KH-S4-ENG-GEN-003 | Reported speech introduction | ingles | S4 | — | — | — |
| KH-S4-ENG-GEN-004 | Argumentative reading | ingles | S4 | — | — | — |
| KH-S4-ENG-GEN-005 | Formal writing | ingles | S4 | — | — | — |
| KH-S4-ENG-GEN-006 | Debate | ingles | S4 | — | — | — |
| KH-S4-EPT-GEN-001 | Plan de negocios | ept | S4 | — | — | — |
| KH-S4-EPT-GEN-002 | Estrategia comercial | ept | S4 | — | — | — |
| KH-S4-EPT-GEN-003 | Costos y precios | ept | S4 | — | — | — |
| KH-S4-EPT-GEN-004 | Flujo de caja inicial | ept | S4 | — | — | — |
| KH-S4-EPT-GEN-005 | Gestión de equipos | ept | S4 | — | — | — |
| KH-S4-EPT-GEN-006 | Prototipado avanzado | ept | S4 | — | — | — |
| KH-S4-REL-GEN-001 | Dilemas éticos | educacion-religiosa | S4 | — | — | — |
| KH-S4-REL-GEN-002 | Responsabilidad social | educacion-religiosa | S4 | — | — | — |
| KH-S4-REL-GEN-003 | Compromiso con la comunidad | educacion-religiosa | S4 | — | — | — |
| KH-S4-REL-GEN-004 | Diálogo y tolerancia | educacion-religiosa | S4 | — | — | — |
| KH-S5-AYC-GEN-001 | Proyecto artístico final | arte-cultura | S5 | — | — | — |
| KH-S5-AYC-GEN-002 | Curaduría básica | arte-cultura | S5 | — | — | — |
| KH-S5-AYC-GEN-003 | Crítica cultural | arte-cultura | S5 | — | — | — |
| KH-S5-AYC-GEN-004 | Presentación de portafolio | arte-cultura | S5 | — | — | — |
| KH-S5-AYC-GEN-005 | Arte y sociedad | arte-cultura | S5 | — | — | — |
| KH-S5-CCS-ECO-001 | Economía peruana | ciencias-sociales | S5 | — | — | — |
| KH-S5-CCS-ECO-002 | Sistema financiero | ciencias-sociales | S5 | — | — | — |
| KH-S5-CCS-ECO-003 | Decisiones económicas informadas | ciencias-sociales | S5 | — | — | — |
| KH-S5-CCS-ECO-004 | Mercados internacionales | ciencias-sociales | S5 | — | — | — |
| KH-S5-CCS-GEO-001 | Geopolítica | ciencias-sociales | S5 | — | — | — |
| KH-S5-CCS-GEO-002 | Desarrollo sostenible | ciencias-sociales | S5 | — | — | — |
| KH-S5-CCS-GEO-003 | Dinámicas territoriales | ciencias-sociales | S5 | — | — | — |
| KH-S5-CCS-GEO-004 | Riesgos ambientales | ciencias-sociales | S5 | — | — | — |
| KH-S5-CCS-HIS-001 | Historia peruana contemporánea | ciencias-sociales | S5 | — | — | — |
| KH-S5-CCS-HIS-002 | Conflictos del siglo XX | ciencias-sociales | S5 | — | — | — |
| KH-S5-CCS-HIS-003 | Globalización y mundo actual | ciencias-sociales | S5 | — | — | — |
| KH-S5-CCS-HIS-004 | Historia reciente del Perú | ciencias-sociales | S5 | — | — | — |
| KH-S5-CSL-GEN-001 | Comunicación académica avanzada | castellano-segunda-lengua | S5 | — | — | — |
| KH-S5-CSL-GEN-002 | Análisis crítico | castellano-segunda-lengua | S5 | — | — | — |
| KH-S5-CSL-GEN-003 | Producción textual autónoma | castellano-segunda-lengua | S5 | — | — | — |
| KH-S5-CSL-GEN-004 | Discusión de ideas | castellano-segunda-lengua | S5 | — | — | — |
| KH-S5-DPC-CIV-001 | Ciudadanía activa | dpcc | S5 | — | — | — |
| KH-S5-DPC-CIV-002 | Derechos fundamentales | dpcc | S5 | — | — | — |
| KH-S5-DPC-CIV-003 | Participación democrática | dpcc | S5 | — | — | — |
| KH-S5-DPC-CIV-004 | Ética pública | dpcc | S5 | — | — | — |
| KH-S5-DPC-CIV-005 | Cultura de paz | dpcc | S5 | — | — | — |
| KH-S5-DPC-IDE-001 | Proyecto de vida | dpcc | S5 | — | — | — |
| KH-S5-DPC-IDE-002 | Autonomía y responsabilidad | dpcc | S5 | — | — | — |
| KH-S5-DPC-IDE-003 | Bienestar personal | dpcc | S5 | — | — | — |
| KH-S5-DPC-IDE-004 | Ética personal | dpcc | S5 | — | — | — |
| KH-S5-EFI-GEN-001 | Plan personal de actividad física | educacion-fisica | S5 | — | — | — |
| KH-S5-EFI-GEN-002 | Prevención de riesgos | educacion-fisica | S5 | — | — | — |
| KH-S5-EFI-GEN-003 | Liderazgo deportivo | educacion-fisica | S5 | — | — | — |
| KH-S5-EFI-GEN-004 | Vida activa | educacion-fisica | S5 | — | — | — |
| KH-S5-EFI-GEN-005 | Evaluación de capacidades físicas | educacion-fisica | S5 | — | — | — |
| KH-S5-ENG-GEN-001 | Advanced reading comprehension | ingles | S5 | — | — | — |
| KH-S5-ENG-GEN-002 | Complex conditionals | ingles | S5 | — | — | — |
| KH-S5-ENG-GEN-003 | Reported speech | ingles | S5 | — | — | — |
| KH-S5-ENG-GEN-004 | Academic presentations | ingles | S5 | — | — | — |
| KH-S5-ENG-GEN-005 | Argumentative essays | ingles | S5 | — | — | — |
| KH-S5-ENG-GEN-006 | Formal communication | ingles | S5 | — | — | — |
| KH-S5-EPT-GEN-001 | Emprendimiento integral | ept | S5 | — | — | — |
| KH-S5-EPT-GEN-002 | Viabilidad económica | ept | S5 | — | — | — |
| KH-S5-EPT-GEN-003 | Marketing digital | ept | S5 | — | — | — |
| KH-S5-EPT-GEN-004 | Presentación a inversionistas simulada | ept | S5 | — | — | — |
| KH-S5-EPT-GEN-005 | Evaluación del impacto social | ept | S5 | — | — | — |
| KH-S5-EPT-GEN-006 | Evaluación de proyectos | ept | S5 | — | — | — |
| KH-S5-REL-GEN-001 | Proyecto de vida y trascendencia | educacion-religiosa | S5 | — | — | — |
| KH-S5-REL-GEN-002 | Diálogo interreligioso | educacion-religiosa | S5 | — | — | — |
| KH-S5-REL-GEN-003 | Compromiso ético | educacion-religiosa | S5 | — | — | — |
| KH-S5-REL-GEN-004 | Servicio comunitario | educacion-religiosa | S5 | — | — | — |
