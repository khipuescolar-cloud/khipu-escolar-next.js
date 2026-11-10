# Reporte de fusión editorial (dry-run)

Origen: paquete KHIPU-CURRICULUM v0.1, metadatos originales con licencia pendiente de revisión. No se copian ni aplican datos al banco.

Método: misma área y grado; nombre normalizado idéntico o similitud de bigramas ≥ 0,90 con margen ≥ 0,12 para emparejar. Similitud ≥ 0,62 se remite a revisión. El resto recibe una clave propuesta derivada de stable_code. Los emparejamientos conservan la clave actual. RMA se clasifica en aritmética para esta previsualización. Para áreas sin banco Nudito solo hay inventario.

Banco leído: 33 temarios, 3839 entradas de tema. Candidatos: 1145.

## Totales

| Emparejados | Nuevos | Conflictos | Inventario |
|---:|---:|---:|---:|
| 13 | 582 | 68 | 482 |

Segunda corrida simulada después de incorporar únicamente las claves nuevas: 0 altas.

## Por área

| Área | Emparejados | Nuevos | Conflictos | Inventario | Total |
|---|---:|---:|---:|---:|---:|
| arte-cultura | 0 | 0 | 0 | 55 | 55 |
| castellano-segunda-lengua | 0 | 0 | 0 | 44 | 44 |
| ciencia-tecnologia | 2 | 179 | 9 | 0 | 190 |
| ciencias-sociales | 0 | 0 | 0 | 60 | 60 |
| comunicacion | 4 | 206 | 13 | 0 | 223 |
| dpcc | 0 | 0 | 0 | 41 | 41 |
| educacion-fisica | 0 | 0 | 0 | 55 | 55 |
| educacion-religiosa | 0 | 0 | 0 | 44 | 44 |
| ept | 0 | 0 | 0 | 30 | 30 |
| ingles | 0 | 0 | 0 | 66 | 66 |
| matematica | 7 | 197 | 46 | 0 | 250 |
| personal-social | 0 | 0 | 0 | 87 | 87 |

## Por grado

| Grado | Emparejados | Nuevos | Conflictos | Inventario | Total |
|---|---:|---:|---:|---:|---:|
| P1 | 3 | 49 | 7 | 38 | 97 |
| P2 | 3 | 51 | 5 | 38 | 97 |
| P3 | 0 | 49 | 10 | 38 | 97 |
| P4 | 1 | 53 | 9 | 38 | 101 |
| P5 | 1 | 51 | 6 | 40 | 98 |
| P6 | 0 | 53 | 4 | 39 | 96 |
| S1 | 2 | 50 | 11 | 50 | 113 |
| S2 | 1 | 54 | 4 | 50 | 109 |
| S3 | 1 | 56 | 5 | 50 | 112 |
| S4 | 1 | 56 | 4 | 50 | 111 |
| S5 | 0 | 60 | 3 | 51 | 114 |

## Emparejado

| Código | Título | Área | Grado | Disciplina | Clave | Similitud | Motivo |
|---|---|---|---|---|---|---:|---|
| KH-P1-MAT-ALG-001 | Patrones de repetición | matematica | P1 | algebra | mat.p1.patrones-repeticion | 1.000 | — |
| KH-P1-MAT-ARI-003 | Correspondencia uno a uno | matematica | P1 | aritmetica | mat.p1.correspondencia-uno-a-uno | 1.000 | — |
| KH-P1-MAT-ARI-010 | Problemas de quitar | matematica | P1 | aritmetica | mat.p1.problemas-quitar | 1.000 | — |
| KH-P2-COM-RVB-001 | Sinónimos | comunicacion | P2 | razonamiento-verbal | com.p2.sinonimos | 1.000 | — |
| KH-P2-COM-RVB-002 | Antónimos | comunicacion | P2 | razonamiento-verbal | com.p2.antonimos | 1.000 | — |
| KH-P2-COM-RVB-003 | Familias de palabras | comunicacion | P2 | razonamiento-verbal | com.p2.familia-de-palabras | 0.919 | — |
| KH-P4-CYT-FIS-001 | Formas de energía | ciencia-tecnologia | P4 | fisica | cyt.p4.formas-energia | 1.000 | — |
| KH-P5-MAT-EST-001 | Media aritmética | matematica | P5 | estadistica | mat.p5.media-aritmetica | 0.909 | — |
| KH-S1-COM-RVB-003 | Término excluido | comunicacion | S1 | razonamiento-verbal | com.s1.termino-excluido | 1.000 | — |
| KH-S1-MAT-ALG-002 | Reducción de términos semejantes | matematica | S1 | algebra | mat.s1.terminos-semejantes | 1.000 | — |
| KH-S2-CYT-TIE-001 | Ciclos biogeoquímicos | ciencia-tecnologia | S2 | tierra-universo | cyt.s2.ciclos-biogeoquimicos | 1.000 | — |
| KH-S3-MAT-ARI-004 | Interés simple | matematica | S3 | aritmetica | mat.s3.interes-simple | 1.000 | — |
| KH-S4-MAT-ARI-002 | Interés compuesto | matematica | S4 | aritmetica | mat.s4.interes-compuesto | 1.000 | — |

## Nuevo

| Código | Título | Área | Grado | Disciplina | Clave | Similitud | Motivo |
|---|---|---|---|---|---|---:|---|
| KH-P1-COM-ESC-001 | Escritura del nombre | comunicacion | P1 | escritura | com.p1.kh-esc-001 | — | — |
| KH-P1-COM-ESC-002 | Escritura de palabras | comunicacion | P1 | escritura | com.p1.kh-esc-002 | — | — |
| KH-P1-COM-ESC-003 | Escritura de oraciones | comunicacion | P1 | escritura | com.p1.kh-esc-003 | — | — |
| KH-P1-COM-GRA-001 | Mayúscula inicial | comunicacion | P1 | lenguaje | com.p1.kh-gra-001 | — | — |
| KH-P1-COM-GRA-002 | Punto final | comunicacion | P1 | lenguaje | com.p1.kh-gra-002 | — | — |
| KH-P1-COM-LEC-001 | Reconocimiento de letras | comunicacion | P1 | comprension-lectora | com.p1.kh-lec-001 | — | — |
| KH-P1-COM-LEC-002 | Correspondencia sonido grafía | comunicacion | P1 | comprension-lectora | com.p1.kh-lec-002 | — | — |
| KH-P1-COM-LEC-003 | Lectura de sílabas | comunicacion | P1 | comprension-lectora | com.p1.kh-lec-003 | — | — |
| KH-P1-COM-LEC-004 | Lectura de palabras | comunicacion | P1 | comprension-lectora | com.p1.kh-lec-004 | — | — |
| KH-P1-COM-LEC-005 | Lectura de oraciones | comunicacion | P1 | comprension-lectora | com.p1.kh-lec-005 | — | — |
| KH-P1-COM-LEC-006 | Comprensión de cuentos breves | comunicacion | P1 | comprension-lectora | com.p1.kh-lec-006 | — | — |
| KH-P1-COM-LIT-001 | Cuentos infantiles | comunicacion | P1 | literatura | com.p1.kh-lit-001 | — | — |
| KH-P1-COM-LIT-002 | Rimas | comunicacion | P1 | literatura | com.p1.kh-lit-002 | — | — |
| KH-P1-COM-LIT-003 | Adivinanzas | comunicacion | P1 | literatura | com.p1.kh-lit-003 | — | — |
| KH-P1-COM-ORA-001 | Presentación personal | comunicacion | P1 | oralidad | com.p1.kh-ora-001 | — | — |
| KH-P1-COM-ORA-002 | Escucha y conversación | comunicacion | P1 | oralidad | com.p1.kh-ora-002 | — | — |
| KH-P1-COM-ORA-003 | Expresión de experiencias | comunicacion | P1 | oralidad | com.p1.kh-ora-003 | — | — |
| KH-P1-COM-ORA-004 | Turnos de palabra | comunicacion | P1 | oralidad | com.p1.kh-ora-004 | — | — |
| KH-P1-COM-RVB-001 | Asociación de palabras | comunicacion | P1 | razonamiento-verbal | com.p1.kh-rvb-001 | — | — |
| KH-P1-COM-RVB-002 | Categorías semánticas | comunicacion | P1 | razonamiento-verbal | com.p1.kh-rvb-002 | — | — |
| KH-P1-CYT-BIO-001 | Partes del cuerpo | ciencia-tecnologia | P1 | biologia | cyt.p1.kh-bio-001 | — | — |
| KH-P1-CYT-BIO-002 | Cinco sentidos | ciencia-tecnologia | P1 | biologia | cyt.p1.kh-bio-002 | — | — |
| KH-P1-CYT-BIO-003 | Animales del entorno | ciencia-tecnologia | P1 | biologia | cyt.p1.kh-bio-003 | — | — |
| KH-P1-CYT-BIO-004 | Plantas del entorno | ciencia-tecnologia | P1 | biologia | cyt.p1.kh-bio-004 | — | — |
| KH-P1-CYT-BIO-005 | Hábitos de higiene | ciencia-tecnologia | P1 | biologia | cyt.p1.kh-bio-005 | — | — |
| KH-P1-CYT-FIS-001 | Luz y sombra | ciencia-tecnologia | P1 | fisica | cyt.p1.kh-fis-001 | — | — |
| KH-P1-CYT-FIS-002 | Movimiento de objetos | ciencia-tecnologia | P1 | fisica | cyt.p1.kh-fis-002 | — | — |
| KH-P1-CYT-FIS-003 | Materiales del entorno | ciencia-tecnologia | P1 | fisica | cyt.p1.kh-fis-003 | — | — |
| KH-P1-CYT-IND-001 | Observación y preguntas | ciencia-tecnologia | P1 | indagacion | cyt.p1.kh-ind-001 | — | — |
| KH-P1-CYT-IND-002 | Registro mediante dibujos | ciencia-tecnologia | P1 | indagacion | cyt.p1.kh-ind-002 | — | — |
| KH-P1-CYT-IND-003 | Comparación de objetos | ciencia-tecnologia | P1 | indagacion | cyt.p1.kh-ind-003 | — | — |
| KH-P1-CYT-TEC-001 | Construcción de objetos sencillos | ciencia-tecnologia | P1 | tecnologia | cyt.p1.kh-tec-001 | — | — |
| KH-P1-CYT-TEC-002 | Uso seguro de herramientas | ciencia-tecnologia | P1 | tecnologia | cyt.p1.kh-tec-002 | — | — |
| KH-P1-CYT-TIE-001 | Día y noche | ciencia-tecnologia | P1 | tierra-universo | cyt.p1.kh-tie-001 | — | — |
| KH-P1-CYT-TIE-002 | Uso del agua | ciencia-tecnologia | P1 | tierra-universo | cyt.p1.kh-tie-002 | — | — |
| KH-P1-MAT-ALG-002 | Igualdades sencillas | matematica | P1 | algebra | mat.p1.kh-alg-002 | — | — |
| KH-P1-MAT-ALG-003 | Secuencias de figuras | matematica | P1 | algebra | mat.p1.kh-alg-003 | — | — |
| KH-P1-MAT-ARI-001 | Conteo hasta 20 | matematica | P1 | aritmetica | mat.p1.kh-ari-001 | — | — |
| KH-P1-MAT-ARI-005 | Orden de números | matematica | P1 | aritmetica | mat.p1.kh-ari-005 | — | — |
| KH-P1-MAT-ARI-007 | Adición sin canje | matematica | P1 | aritmetica | mat.p1.kh-ari-007 | — | — |
| KH-P1-MAT-ARI-008 | Sustracción sin canje | matematica | P1 | aritmetica | mat.p1.kh-ari-008 | — | — |
| KH-P1-MAT-EST-001 | Tablas de conteo | matematica | P1 | estadistica | mat.p1.kh-est-001 | — | — |
| KH-P1-MAT-EST-003 | Clasificación de objetos | matematica | P1 | estadistica | mat.p1.kh-est-003 | — | — |
| KH-P1-MAT-GEO-001 | Figuras geométricas básicas | matematica | P1 | geometria | mat.p1.kh-geo-001 | — | — |
| KH-P1-MAT-GEO-002 | Posiciones espaciales | matematica | P1 | geometria | mat.p1.kh-geo-002 | — | — |
| KH-P1-MAT-GEO-003 | Recorridos y trayectorias | matematica | P1 | geometria | mat.p1.kh-geo-003 | — | — |
| KH-P1-MAT-GEO-004 | Medición no convencional | matematica | P1 | geometria | mat.p1.kh-geo-004 | — | — |
| KH-P1-MAT-GEO-005 | Comparación de longitudes | matematica | P1 | geometria | mat.p1.kh-geo-005 | — | — |
| KH-P1-MAT-RMA-001 | Secuencias lógicas | matematica | P1 | aritmetica | mat.p1.kh-rma-001 | — | — |
| KH-P2-COM-ESC-001 | Párrafos breves | comunicacion | P2 | escritura | com.p2.kh-esc-001 | — | — |
| KH-P2-COM-ESC-003 | Notas y avisos | comunicacion | P2 | escritura | com.p2.kh-esc-003 | — | — |
| KH-P2-COM-GRA-001 | Sustantivos | comunicacion | P2 | lenguaje | com.p2.kh-gra-001 | — | — |
| KH-P2-COM-GRA-002 | Adjetivos | comunicacion | P2 | lenguaje | com.p2.kh-gra-002 | — | — |
| KH-P2-COM-GRA-003 | Signos de interrogación | comunicacion | P2 | lenguaje | com.p2.kh-gra-003 | — | — |
| KH-P2-COM-GRA-004 | Signos de exclamación | comunicacion | P2 | lenguaje | com.p2.kh-gra-004 | — | — |
| KH-P2-COM-LEC-001 | Idea principal | comunicacion | P2 | comprension-lectora | com.p2.kh-lec-001 | — | — |
| KH-P2-COM-LEC-002 | Secuencia de acontecimientos | comunicacion | P2 | comprension-lectora | com.p2.kh-lec-002 | — | — |
| KH-P2-COM-LEC-003 | Textos instructivos | comunicacion | P2 | comprension-lectora | com.p2.kh-lec-003 | — | — |
| KH-P2-COM-LEC-004 | Identificación de personajes | comunicacion | P2 | comprension-lectora | com.p2.kh-lec-004 | — | — |
| KH-P2-COM-LEC-005 | Inferencias simples | comunicacion | P2 | comprension-lectora | com.p2.kh-lec-005 | — | — |
| KH-P2-COM-LIT-001 | Fábulas | comunicacion | P2 | literatura | com.p2.kh-lit-001 | — | — |
| KH-P2-COM-LIT-002 | Leyendas | comunicacion | P2 | literatura | com.p2.kh-lit-002 | — | — |
| KH-P2-COM-LIT-003 | Poemas infantiles | comunicacion | P2 | literatura | com.p2.kh-lit-003 | — | — |
| KH-P2-COM-ORA-001 | Relato de experiencias | comunicacion | P2 | oralidad | com.p2.kh-ora-001 | — | — |
| KH-P2-COM-ORA-002 | Exposición breve | comunicacion | P2 | oralidad | com.p2.kh-ora-002 | — | — |
| KH-P2-COM-ORA-003 | Escucha activa | comunicacion | P2 | oralidad | com.p2.kh-ora-003 | — | — |
| KH-P2-CYT-BIO-002 | Hábitats de animales | ciencia-tecnologia | P2 | biologia | cyt.p2.kh-bio-002 | — | — |
| KH-P2-CYT-BIO-003 | Hábitos saludables | ciencia-tecnologia | P2 | biologia | cyt.p2.kh-bio-003 | — | — |
| KH-P2-CYT-BIO-004 | Partes de una planta | ciencia-tecnologia | P2 | biologia | cyt.p2.kh-bio-004 | — | — |
| KH-P2-CYT-FIS-001 | Propiedades de materiales | ciencia-tecnologia | P2 | fisica | cyt.p2.kh-fis-001 | — | — |
| KH-P2-CYT-FIS-003 | Fuentes de luz | ciencia-tecnologia | P2 | fisica | cyt.p2.kh-fis-003 | — | — |
| KH-P2-CYT-IND-001 | Predicciones | ciencia-tecnologia | P2 | indagacion | cyt.p2.kh-ind-001 | — | — |
| KH-P2-CYT-IND-002 | Comparación de observaciones | ciencia-tecnologia | P2 | indagacion | cyt.p2.kh-ind-002 | — | — |
| KH-P2-CYT-IND-003 | Registro de resultados | ciencia-tecnologia | P2 | indagacion | cyt.p2.kh-ind-003 | — | — |
| KH-P2-CYT-TEC-001 | Soluciones con materiales reutilizados | ciencia-tecnologia | P2 | tecnologia | cyt.p2.kh-tec-001 | — | — |
| KH-P2-CYT-TEC-002 | Evaluación de un objeto sencillo | ciencia-tecnologia | P2 | tecnologia | cyt.p2.kh-tec-002 | — | — |
| KH-P2-CYT-TIE-001 | Clima cotidiano | ciencia-tecnologia | P2 | tierra-universo | cyt.p2.kh-tie-001 | — | — |
| KH-P2-CYT-TIE-002 | Residuos y reciclaje | ciencia-tecnologia | P2 | tierra-universo | cyt.p2.kh-tie-002 | — | — |
| KH-P2-CYT-TIE-003 | Uso responsable del agua | ciencia-tecnologia | P2 | tierra-universo | cyt.p2.kh-tie-003 | — | — |
| KH-P2-MAT-ALG-001 | Patrones aditivos | matematica | P2 | algebra | mat.p2.kh-alg-001 | — | — |
| KH-P2-MAT-ALG-002 | Equivalencias numéricas | matematica | P2 | algebra | mat.p2.kh-alg-002 | — | — |
| KH-P2-MAT-ALG-003 | Igualdades con incógnitas sencillas | matematica | P2 | algebra | mat.p2.kh-alg-003 | — | — |
| KH-P2-MAT-ARI-001 | Números hasta mil | matematica | P2 | aritmetica | mat.p2.kh-ari-001 | — | — |
| KH-P2-MAT-ARI-002 | Valor posicional | matematica | P2 | aritmetica | mat.p2.kh-ari-002 | — | — |
| KH-P2-MAT-ARI-004 | Ordenación numérica | matematica | P2 | aritmetica | mat.p2.kh-ari-004 | — | — |
| KH-P2-MAT-ARI-005 | Adición con canje | matematica | P2 | aritmetica | mat.p2.kh-ari-005 | — | — |
| KH-P2-MAT-ARI-006 | Sustracción con canje | matematica | P2 | aritmetica | mat.p2.kh-ari-006 | — | — |
| KH-P2-MAT-ARI-007 | Multiplicación como suma reiterada | matematica | P2 | aritmetica | mat.p2.kh-ari-007 | — | — |
| KH-P2-MAT-ARI-008 | Tablas de multiplicación iniciales | matematica | P2 | aritmetica | mat.p2.kh-ari-008 | — | — |
| KH-P2-MAT-ARI-009 | Repartos iguales | matematica | P2 | aritmetica | mat.p2.kh-ari-009 | — | — |
| KH-P2-MAT-ARI-010 | Problemas aditivos | matematica | P2 | aritmetica | mat.p2.kh-ari-010 | — | — |
| KH-P2-MAT-EST-001 | Tablas de frecuencia simples | matematica | P2 | estadistica | mat.p2.kh-est-001 | — | — |
| KH-P2-MAT-EST-002 | Gráficos de barras | matematica | P2 | estadistica | mat.p2.kh-est-002 | — | — |
| KH-P2-MAT-EST-003 | Interpretación de datos | matematica | P2 | estadistica | mat.p2.kh-est-003 | — | — |
| KH-P2-MAT-GEO-001 | Figuras planas | matematica | P2 | geometria | mat.p2.kh-geo-001 | — | — |
| KH-P2-MAT-GEO-003 | Medición de longitudes | matematica | P2 | geometria | mat.p2.kh-geo-003 | — | — |
| KH-P2-MAT-GEO-004 | Calendario | matematica | P2 | geometria | mat.p2.kh-geo-004 | — | — |
| KH-P2-MAT-GEO-005 | Lectura de reloj | matematica | P2 | geometria | mat.p2.kh-geo-005 | — | — |
| KH-P2-MAT-RMA-001 | Problemas de dos pasos | matematica | P2 | aritmetica | mat.p2.kh-rma-001 | — | — |
| KH-P2-MAT-RMA-002 | Secuencias lógicas | matematica | P2 | aritmetica | mat.p2.kh-rma-002 | — | — |
| KH-P3-COM-ESC-001 | Textos narrativos | comunicacion | P3 | escritura | com.p3.kh-esc-001 | — | — |
| KH-P3-COM-ESC-002 | Cartas y mensajes | comunicacion | P3 | escritura | com.p3.kh-esc-002 | — | — |
| KH-P3-COM-ESC-003 | Descripciones ordenadas | comunicacion | P3 | escritura | com.p3.kh-esc-003 | — | — |
| KH-P3-COM-GRA-001 | Verbo | comunicacion | P3 | lenguaje | com.p3.kh-gra-001 | — | — |
| KH-P3-COM-GRA-002 | Tiempos verbales básicos | comunicacion | P3 | lenguaje | com.p3.kh-gra-002 | — | — |
| KH-P3-COM-GRA-004 | Puntuación | comunicacion | P3 | lenguaje | com.p3.kh-gra-004 | — | — |
| KH-P3-COM-LEC-001 | Inferencias sencillas | comunicacion | P3 | comprension-lectora | com.p3.kh-lec-001 | — | — |
| KH-P3-COM-LEC-002 | Idea principal y detalles | comunicacion | P3 | comprension-lectora | com.p3.kh-lec-002 | — | — |
| KH-P3-COM-LEC-004 | Textos narrativos | comunicacion | P3 | comprension-lectora | com.p3.kh-lec-004 | — | — |
| KH-P3-COM-LEC-005 | Resumen de lectura | comunicacion | P3 | comprension-lectora | com.p3.kh-lec-005 | — | — |
| KH-P3-COM-LIT-001 | Mitos | comunicacion | P3 | literatura | com.p3.kh-lit-001 | — | — |
| KH-P3-COM-LIT-003 | Cuentos tradicionales | comunicacion | P3 | literatura | com.p3.kh-lit-003 | — | — |
| KH-P3-COM-ORA-001 | Narración oral | comunicacion | P3 | oralidad | com.p3.kh-ora-001 | — | — |
| KH-P3-COM-ORA-002 | Exposición organizada | comunicacion | P3 | oralidad | com.p3.kh-ora-002 | — | — |
| KH-P3-COM-ORA-003 | Escucha crítica inicial | comunicacion | P3 | oralidad | com.p3.kh-ora-003 | — | — |
| KH-P3-COM-RVB-001 | Analogías simples | comunicacion | P3 | razonamiento-verbal | com.p3.kh-rvb-001 | — | — |
| KH-P3-COM-RVB-002 | Series de palabras | comunicacion | P3 | razonamiento-verbal | com.p3.kh-rvb-002 | — | — |
| KH-P3-COM-RVB-003 | Palabras polisémicas | comunicacion | P3 | razonamiento-verbal | com.p3.kh-rvb-003 | — | — |
| KH-P3-CYT-BIO-001 | Sistemas del cuerpo humano | ciencia-tecnologia | P3 | biologia | cyt.p3.kh-bio-001 | — | — |
| KH-P3-CYT-BIO-002 | Clasificación de seres vivos | ciencia-tecnologia | P3 | biologia | cyt.p3.kh-bio-002 | — | — |
| KH-P3-CYT-BIO-003 | Alimentación saludable | ciencia-tecnologia | P3 | biologia | cyt.p3.kh-bio-003 | — | — |
| KH-P3-CYT-BIO-004 | Relaciones entre organismos | ciencia-tecnologia | P3 | biologia | cyt.p3.kh-bio-004 | — | — |
| KH-P3-CYT-FIS-001 | Fuerza y movimiento | ciencia-tecnologia | P3 | fisica | cyt.p3.kh-fis-001 | — | — |
| KH-P3-CYT-FIS-002 | Calor y temperatura inicial | ciencia-tecnologia | P3 | fisica | cyt.p3.kh-fis-002 | — | — |
| KH-P3-CYT-FIS-003 | Cambios de estado | ciencia-tecnologia | P3 | fisica | cyt.p3.kh-fis-003 | — | — |
| KH-P3-CYT-IND-001 | Variables observables | ciencia-tecnologia | P3 | indagacion | cyt.p3.kh-ind-001 | — | — |
| KH-P3-CYT-IND-002 | Registro de experimentos | ciencia-tecnologia | P3 | indagacion | cyt.p3.kh-ind-002 | — | — |
| KH-P3-CYT-IND-003 | Comparación de resultados | ciencia-tecnologia | P3 | indagacion | cyt.p3.kh-ind-003 | — | — |
| KH-P3-CYT-TEC-001 | Diseño de prototipos simples | ciencia-tecnologia | P3 | tecnologia | cyt.p3.kh-tec-001 | — | — |
| KH-P3-CYT-TEC-002 | Selección de materiales | ciencia-tecnologia | P3 | tecnologia | cyt.p3.kh-tec-002 | — | — |
| KH-P3-CYT-TIE-001 | Ciclo del agua | ciencia-tecnologia | P3 | tierra-universo | cyt.p3.kh-tie-001 | — | — |
| KH-P3-CYT-TIE-002 | Ecosistemas locales | ciencia-tecnologia | P3 | tierra-universo | cyt.p3.kh-tie-002 | — | — |
| KH-P3-CYT-TIE-003 | Contaminación | ciencia-tecnologia | P3 | tierra-universo | cyt.p3.kh-tie-003 | — | — |
| KH-P3-MAT-ALG-001 | Patrones numéricos | matematica | P3 | algebra | mat.p3.kh-alg-001 | — | — |
| KH-P3-MAT-ALG-003 | Relaciones de equivalencia | matematica | P3 | algebra | mat.p3.kh-alg-003 | — | — |
| KH-P3-MAT-ARI-003 | Valor posicional | matematica | P3 | aritmetica | mat.p3.kh-ari-003 | — | — |
| KH-P3-MAT-ARI-004 | Multiplicación por una cifra | matematica | P3 | aritmetica | mat.p3.kh-ari-004 | — | — |
| KH-P3-MAT-ARI-005 | Multiplicación por dos cifras | matematica | P3 | aritmetica | mat.p3.kh-ari-005 | — | — |
| KH-P3-MAT-ARI-007 | División inexacta | matematica | P3 | aritmetica | mat.p3.kh-ari-007 | — | — |
| KH-P3-MAT-ARI-008 | Fracciones como partes de un todo | matematica | P3 | aritmetica | mat.p3.kh-ari-008 | — | — |
| KH-P3-MAT-ARI-009 | Fracciones en la recta numérica | matematica | P3 | aritmetica | mat.p3.kh-ari-009 | — | — |
| KH-P3-MAT-EST-002 | Interpretación de datos | matematica | P3 | estadistica | mat.p3.kh-est-002 | — | — |
| KH-P3-MAT-EST-003 | Encuestas simples | matematica | P3 | estadistica | mat.p3.kh-est-003 | — | — |
| KH-P3-MAT-GEO-001 | Polígonos | matematica | P3 | geometria | mat.p3.kh-geo-001 | — | — |
| KH-P3-MAT-GEO-002 | Perímetro | matematica | P3 | geometria | mat.p3.kh-geo-002 | — | — |
| KH-P3-MAT-GEO-004 | Unidades de masa | matematica | P3 | geometria | mat.p3.kh-geo-004 | — | — |
| KH-P3-MAT-GEO-005 | Ángulos intuitivos | matematica | P3 | geometria | mat.p3.kh-geo-005 | — | — |
| KH-P3-MAT-RMA-001 | Problemas con información relevante | matematica | P3 | aritmetica | mat.p3.kh-rma-001 | — | — |
| KH-P3-MAT-RMA-002 | Estrategias de cálculo | matematica | P3 | aritmetica | mat.p3.kh-rma-002 | — | — |
| KH-P4-COM-ESC-001 | Párrafos cohesionados | comunicacion | P4 | escritura | com.p4.kh-esc-001 | — | — |
| KH-P4-COM-ESC-002 | Textos instructivos | comunicacion | P4 | escritura | com.p4.kh-esc-002 | — | — |
| KH-P4-COM-ESC-003 | Resúmenes | comunicacion | P4 | escritura | com.p4.kh-esc-003 | — | — |
| KH-P4-COM-ESC-004 | Cartas formales iniciales | comunicacion | P4 | escritura | com.p4.kh-esc-004 | — | — |
| KH-P4-COM-GRA-001 | Clases de palabras | comunicacion | P4 | lenguaje | com.p4.kh-gra-001 | — | — |
| KH-P4-COM-GRA-002 | Acentuación inicial | comunicacion | P4 | lenguaje | com.p4.kh-gra-002 | — | — |
| KH-P4-COM-GRA-003 | Conectores | comunicacion | P4 | lenguaje | com.p4.kh-gra-003 | — | — |
| KH-P4-COM-GRA-004 | Oración simple | comunicacion | P4 | lenguaje | com.p4.kh-gra-004 | — | — |
| KH-P4-COM-LEC-001 | Inferencias textuales | comunicacion | P4 | comprension-lectora | com.p4.kh-lec-001 | — | — |
| KH-P4-COM-LEC-002 | Textos expositivos | comunicacion | P4 | comprension-lectora | com.p4.kh-lec-002 | — | — |
| KH-P4-COM-LEC-003 | Hechos y opiniones | comunicacion | P4 | comprension-lectora | com.p4.kh-lec-003 | — | — |
| KH-P4-COM-LEC-004 | Idea principal | comunicacion | P4 | comprension-lectora | com.p4.kh-lec-004 | — | — |
| KH-P4-COM-LIT-001 | Poesía | comunicacion | P4 | literatura | com.p4.kh-lit-001 | — | — |
| KH-P4-COM-LIT-002 | Narrativa | comunicacion | P4 | literatura | com.p4.kh-lit-002 | — | — |
| KH-P4-COM-LIT-003 | Recursos expresivos | comunicacion | P4 | literatura | com.p4.kh-lit-003 | — | — |
| KH-P4-COM-ORA-001 | Debate guiado | comunicacion | P4 | oralidad | com.p4.kh-ora-001 | — | — |
| KH-P4-COM-ORA-002 | Exposición informativa | comunicacion | P4 | oralidad | com.p4.kh-ora-002 | — | — |
| KH-P4-COM-ORA-003 | Escucha argumentada | comunicacion | P4 | oralidad | com.p4.kh-ora-003 | — | — |
| KH-P4-COM-RVB-001 | Analogías | comunicacion | P4 | razonamiento-verbal | com.p4.kh-rvb-001 | — | — |
| KH-P4-COM-RVB-002 | Relaciones semánticas | comunicacion | P4 | razonamiento-verbal | com.p4.kh-rvb-002 | — | — |
| KH-P4-COM-RVB-003 | Términos excluidos | comunicacion | P4 | razonamiento-verbal | com.p4.kh-rvb-003 | — | — |
| KH-P4-CYT-BIO-001 | Sistema digestivo | ciencia-tecnologia | P4 | biologia | cyt.p4.kh-bio-001 | — | — |
| KH-P4-CYT-BIO-002 | Sistema respiratorio | ciencia-tecnologia | P4 | biologia | cyt.p4.kh-bio-002 | — | — |
| KH-P4-CYT-BIO-003 | Relaciones alimentarias | ciencia-tecnologia | P4 | biologia | cyt.p4.kh-bio-003 | — | — |
| KH-P4-CYT-BIO-004 | Biodiversidad local | ciencia-tecnologia | P4 | biologia | cyt.p4.kh-bio-004 | — | — |
| KH-P4-CYT-FIS-002 | Máquinas simples | ciencia-tecnologia | P4 | fisica | cyt.p4.kh-fis-002 | — | — |
| KH-P4-CYT-FIS-003 | Electricidad intuitiva | ciencia-tecnologia | P4 | fisica | cyt.p4.kh-fis-003 | — | — |
| KH-P4-CYT-IND-001 | Hipótesis y procedimientos | ciencia-tecnologia | P4 | indagacion | cyt.p4.kh-ind-001 | — | — |
| KH-P4-CYT-IND-002 | Tablas de observación | ciencia-tecnologia | P4 | indagacion | cyt.p4.kh-ind-002 | — | — |
| KH-P4-CYT-IND-003 | Comunicación de resultados | ciencia-tecnologia | P4 | indagacion | cyt.p4.kh-ind-003 | — | — |
| KH-P4-CYT-TEC-001 | Evaluación de prototipos | ciencia-tecnologia | P4 | tecnologia | cyt.p4.kh-tec-001 | — | — |
| KH-P4-CYT-TEC-002 | Propuestas de mejora | ciencia-tecnologia | P4 | tecnologia | cyt.p4.kh-tec-002 | — | — |
| KH-P4-CYT-TIE-001 | Recursos naturales | ciencia-tecnologia | P4 | tierra-universo | cyt.p4.kh-tie-001 | — | — |
| KH-P4-CYT-TIE-002 | Contaminación ambiental | ciencia-tecnologia | P4 | tierra-universo | cyt.p4.kh-tie-002 | — | — |
| KH-P4-CYT-TIE-003 | Cuidado de ecosistemas | ciencia-tecnologia | P4 | tierra-universo | cyt.p4.kh-tie-003 | — | — |
| KH-P4-MAT-ALG-002 | Ecuaciones sencillas | matematica | P4 | algebra | mat.p4.kh-alg-002 | — | — |
| KH-P4-MAT-ALG-004 | Secuencias numéricas | matematica | P4 | algebra | mat.p4.kh-alg-004 | — | — |
| KH-P4-MAT-ARI-001 | Números naturales grandes | matematica | P4 | aritmetica | mat.p4.kh-ari-001 | — | — |
| KH-P4-MAT-ARI-002 | Operaciones combinadas | matematica | P4 | aritmetica | mat.p4.kh-ari-002 | — | — |
| KH-P4-MAT-ARI-003 | Divisibilidad inicial | matematica | P4 | aritmetica | mat.p4.kh-ari-003 | — | — |
| KH-P4-MAT-ARI-004 | Múltiplos | matematica | P4 | aritmetica | mat.p4.kh-ari-004 | — | — |
| KH-P4-MAT-ARI-005 | Divisores | matematica | P4 | aritmetica | mat.p4.kh-ari-005 | — | — |
| KH-P4-MAT-ARI-009 | Números decimales | matematica | P4 | aritmetica | mat.p4.kh-ari-009 | — | — |
| KH-P4-MAT-EST-001 | Tablas de datos | matematica | P4 | estadistica | mat.p4.kh-est-001 | — | — |
| KH-P4-MAT-EST-002 | Gráficos estadísticos | matematica | P4 | estadistica | mat.p4.kh-est-002 | — | — |
| KH-P4-MAT-EST-003 | Probabilidad intuitiva | matematica | P4 | estadistica | mat.p4.kh-est-003 | — | — |
| KH-P4-MAT-GEO-001 | Ángulos | matematica | P4 | geometria | mat.p4.kh-geo-001 | — | — |
| KH-P4-MAT-GEO-002 | Triángulos | matematica | P4 | geometria | mat.p4.kh-geo-002 | — | — |
| KH-P4-MAT-GEO-003 | Cuadriláteros | matematica | P4 | geometria | mat.p4.kh-geo-003 | — | — |
| KH-P4-MAT-GEO-004 | Perímetro | matematica | P4 | geometria | mat.p4.kh-geo-004 | — | — |
| KH-P4-MAT-GEO-005 | Área de rectángulos | matematica | P4 | geometria | mat.p4.kh-geo-005 | — | — |
| KH-P4-MAT-GEO-006 | Plano cartesiano inicial | matematica | P4 | geometria | mat.p4.kh-geo-006 | — | — |
| KH-P4-MAT-RMA-002 | Razonamiento espacial | matematica | P4 | aritmetica | mat.p4.kh-rma-002 | — | — |
| KH-P5-COM-ESC-001 | Ensayo breve | comunicacion | P5 | escritura | com.p5.kh-esc-001 | — | — |
| KH-P5-COM-ESC-003 | Organización de ideas | comunicacion | P5 | escritura | com.p5.kh-esc-003 | — | — |
| KH-P5-COM-ESC-004 | Revisión de borradores | comunicacion | P5 | escritura | com.p5.kh-esc-004 | — | — |
| KH-P5-COM-GRA-001 | Oración simple | comunicacion | P5 | lenguaje | com.p5.kh-gra-001 | — | — |
| KH-P5-COM-GRA-002 | Conectores lógicos | comunicacion | P5 | lenguaje | com.p5.kh-gra-002 | — | — |
| KH-P5-COM-GRA-003 | Acentuación | comunicacion | P5 | lenguaje | com.p5.kh-gra-003 | — | — |
| KH-P5-COM-GRA-004 | Concordancia | comunicacion | P5 | lenguaje | com.p5.kh-gra-004 | — | — |
| KH-P5-COM-LEC-001 | Textos argumentativos iniciales | comunicacion | P5 | comprension-lectora | com.p5.kh-lec-001 | — | — |
| KH-P5-COM-LEC-002 | Inferencias complejas | comunicacion | P5 | comprension-lectora | com.p5.kh-lec-002 | — | — |
| KH-P5-COM-LEC-003 | Evaluación de fuentes | comunicacion | P5 | comprension-lectora | com.p5.kh-lec-003 | — | — |
| KH-P5-COM-LEC-004 | Lectura de gráficos | comunicacion | P5 | comprension-lectora | com.p5.kh-lec-004 | — | — |
| KH-P5-COM-LIT-001 | Géneros literarios | comunicacion | P5 | literatura | com.p5.kh-lit-001 | — | — |
| KH-P5-COM-LIT-002 | Narrativa peruana | comunicacion | P5 | literatura | com.p5.kh-lit-002 | — | — |
| KH-P5-COM-LIT-003 | Poesía | comunicacion | P5 | literatura | com.p5.kh-lit-003 | — | — |
| KH-P5-COM-ORA-001 | Exposición argumentada | comunicacion | P5 | oralidad | com.p5.kh-ora-001 | — | — |
| KH-P5-COM-ORA-002 | Discusión respetuosa | comunicacion | P5 | oralidad | com.p5.kh-ora-002 | — | — |
| KH-P5-COM-ORA-003 | Escucha crítica | comunicacion | P5 | oralidad | com.p5.kh-ora-003 | — | — |
| KH-P5-COM-RVB-001 | Analogías | comunicacion | P5 | razonamiento-verbal | com.p5.kh-rvb-001 | — | — |
| KH-P5-COM-RVB-002 | Series verbales | comunicacion | P5 | razonamiento-verbal | com.p5.kh-rvb-002 | — | — |
| KH-P5-COM-RVB-003 | Campos semánticos | comunicacion | P5 | razonamiento-verbal | com.p5.kh-rvb-003 | — | — |
| KH-P5-CYT-BIO-001 | Célula y organización | ciencia-tecnologia | P5 | biologia | cyt.p5.kh-bio-001 | — | — |
| KH-P5-CYT-BIO-002 | Sistemas humanos | ciencia-tecnologia | P5 | biologia | cyt.p5.kh-bio-002 | — | — |
| KH-P5-CYT-BIO-004 | Relaciones ecológicas | ciencia-tecnologia | P5 | biologia | cyt.p5.kh-bio-004 | — | — |
| KH-P5-CYT-FIS-001 | Energía y transformaciones | ciencia-tecnologia | P5 | fisica | cyt.p5.kh-fis-001 | — | — |
| KH-P5-CYT-FIS-002 | Circuitos eléctricos simples | ciencia-tecnologia | P5 | fisica | cyt.p5.kh-fis-002 | — | — |
| KH-P5-CYT-FIS-003 | Fuerza y trabajo inicial | ciencia-tecnologia | P5 | fisica | cyt.p5.kh-fis-003 | — | — |
| KH-P5-CYT-IND-001 | Diseño experimental | ciencia-tecnologia | P5 | indagacion | cyt.p5.kh-ind-001 | — | — |
| KH-P5-CYT-IND-002 | Interpretación de resultados | ciencia-tecnologia | P5 | indagacion | cyt.p5.kh-ind-002 | — | — |
| KH-P5-CYT-IND-003 | Comunicación científica | ciencia-tecnologia | P5 | indagacion | cyt.p5.kh-ind-003 | — | — |
| KH-P5-CYT-TEC-001 | Prototipos para problemas ambientales | ciencia-tecnologia | P5 | tecnologia | cyt.p5.kh-tec-001 | — | — |
| KH-P5-CYT-TEC-002 | Mejora de soluciones | ciencia-tecnologia | P5 | tecnologia | cyt.p5.kh-tec-002 | — | — |
| KH-P5-CYT-TIE-001 | Biodiversidad peruana | ciencia-tecnologia | P5 | tierra-universo | cyt.p5.kh-tie-001 | — | — |
| KH-P5-CYT-TIE-002 | Cambio climático inicial | ciencia-tecnologia | P5 | tierra-universo | cyt.p5.kh-tie-002 | — | — |
| KH-P5-CYT-TIE-003 | Recursos hídricos | ciencia-tecnologia | P5 | tierra-universo | cyt.p5.kh-tie-003 | — | — |
| KH-P5-MAT-ALG-001 | Expresiones con variables | matematica | P5 | algebra | mat.p5.kh-alg-001 | — | — |
| KH-P5-MAT-ALG-002 | Ecuaciones sencillas | matematica | P5 | algebra | mat.p5.kh-alg-002 | — | — |
| KH-P5-MAT-ALG-003 | Patrones de crecimiento | matematica | P5 | algebra | mat.p5.kh-alg-003 | — | — |
| KH-P5-MAT-ALG-004 | Relaciones funcionales iniciales | matematica | P5 | algebra | mat.p5.kh-alg-004 | — | — |
| KH-P5-MAT-ARI-001 | Números naturales y operaciones | matematica | P5 | aritmetica | mat.p5.kh-ari-001 | — | — |
| KH-P5-MAT-ARI-004 | División de fracciones | matematica | P5 | aritmetica | mat.p5.kh-ari-004 | — | — |
| KH-P5-MAT-ARI-005 | Porcentajes iniciales | matematica | P5 | aritmetica | mat.p5.kh-ari-005 | — | — |
| KH-P5-MAT-ARI-006 | Razones y proporciones | matematica | P5 | aritmetica | mat.p5.kh-ari-006 | — | — |
| KH-P5-MAT-EST-002 | Gráficos comparativos | matematica | P5 | estadistica | mat.p5.kh-est-002 | — | — |
| KH-P5-MAT-EST-003 | Probabilidad básica | matematica | P5 | estadistica | mat.p5.kh-est-003 | — | — |
| KH-P5-MAT-EST-004 | Recolección de datos | matematica | P5 | estadistica | mat.p5.kh-est-004 | — | — |
| KH-P5-MAT-GEO-001 | Área de polígonos | matematica | P5 | geometria | mat.p5.kh-geo-001 | — | — |
| KH-P5-MAT-GEO-002 | Volumen de prismas | matematica | P5 | geometria | mat.p5.kh-geo-002 | — | — |
| KH-P5-MAT-GEO-003 | Ángulos y coordenadas | matematica | P5 | geometria | mat.p5.kh-geo-003 | — | — |
| KH-P5-MAT-GEO-004 | Circunferencia intuitiva | matematica | P5 | geometria | mat.p5.kh-geo-004 | — | — |
| KH-P5-MAT-RMA-001 | Problemas de estrategia múltiple | matematica | P5 | aritmetica | mat.p5.kh-rma-001 | — | — |
| KH-P5-MAT-RMA-002 | Razonamiento numérico | matematica | P5 | aritmetica | mat.p5.kh-rma-002 | — | — |
| KH-P6-COM-ESC-001 | Ensayos breves | comunicacion | P6 | escritura | com.p6.kh-esc-001 | — | — |
| KH-P6-COM-ESC-002 | Informes | comunicacion | P6 | escritura | com.p6.kh-esc-002 | — | — |
| KH-P6-COM-ESC-003 | Revisión y edición | comunicacion | P6 | escritura | com.p6.kh-esc-003 | — | — |
| KH-P6-COM-ESC-004 | Citación inicial | comunicacion | P6 | escritura | com.p6.kh-esc-004 | — | — |
| KH-P6-COM-GRA-001 | Oraciones compuestas introductorias | comunicacion | P6 | lenguaje | com.p6.kh-gra-001 | — | — |
| KH-P6-COM-GRA-002 | Cohesión textual | comunicacion | P6 | lenguaje | com.p6.kh-gra-002 | — | — |
| KH-P6-COM-GRA-003 | Normas ortográficas | comunicacion | P6 | lenguaje | com.p6.kh-gra-003 | — | — |
| KH-P6-COM-LEC-001 | Análisis de textos argumentativos | comunicacion | P6 | comprension-lectora | com.p6.kh-lec-001 | — | — |
| KH-P6-COM-LEC-002 | Lectura crítica | comunicacion | P6 | comprension-lectora | com.p6.kh-lec-002 | — | — |
| KH-P6-COM-LEC-003 | Textos discontinuos | comunicacion | P6 | comprension-lectora | com.p6.kh-lec-003 | — | — |
| KH-P6-COM-LEC-004 | Evaluación de fuentes | comunicacion | P6 | comprension-lectora | com.p6.kh-lec-004 | — | — |
| KH-P6-COM-LIT-001 | Recursos literarios | comunicacion | P6 | literatura | com.p6.kh-lit-001 | — | — |
| KH-P6-COM-LIT-002 | Literatura peruana introductoria | comunicacion | P6 | literatura | com.p6.kh-lit-002 | — | — |
| KH-P6-COM-LIT-003 | Narrativa breve | comunicacion | P6 | literatura | com.p6.kh-lit-003 | — | — |
| KH-P6-COM-ORA-001 | Debates | comunicacion | P6 | oralidad | com.p6.kh-ora-001 | — | — |
| KH-P6-COM-ORA-002 | Exposiciones con evidencias | comunicacion | P6 | oralidad | com.p6.kh-ora-002 | — | — |
| KH-P6-COM-ORA-003 | Escucha y réplica | comunicacion | P6 | oralidad | com.p6.kh-ora-003 | — | — |
| KH-P6-COM-RVB-001 | Inferencias verbales | comunicacion | P6 | razonamiento-verbal | com.p6.kh-rvb-001 | — | — |
| KH-P6-COM-RVB-002 | Relaciones lógicas | comunicacion | P6 | razonamiento-verbal | com.p6.kh-rvb-002 | — | — |
| KH-P6-CYT-BIO-001 | Reproducción humana desde la ciencia | ciencia-tecnologia | P6 | biologia | cyt.p6.kh-bio-001 | — | — |
| KH-P6-CYT-BIO-002 | Salud y prevención | ciencia-tecnologia | P6 | biologia | cyt.p6.kh-bio-002 | — | — |
| KH-P6-CYT-BIO-003 | Herencia introductoria | ciencia-tecnologia | P6 | biologia | cyt.p6.kh-bio-003 | — | — |
| KH-P6-CYT-BIO-004 | Sistemas humanos | ciencia-tecnologia | P6 | biologia | cyt.p6.kh-bio-004 | — | — |
| KH-P6-CYT-FIS-001 | Electricidad | ciencia-tecnologia | P6 | fisica | cyt.p6.kh-fis-001 | — | — |
| KH-P6-CYT-FIS-002 | Fuerza y máquinas | ciencia-tecnologia | P6 | fisica | cyt.p6.kh-fis-002 | — | — |
| KH-P6-CYT-FIS-003 | Transformaciones de energía | ciencia-tecnologia | P6 | fisica | cyt.p6.kh-fis-003 | — | — |
| KH-P6-CYT-IND-001 | Experimentos controlados | ciencia-tecnologia | P6 | indagacion | cyt.p6.kh-ind-001 | — | — |
| KH-P6-CYT-IND-002 | Comunicación científica | ciencia-tecnologia | P6 | indagacion | cyt.p6.kh-ind-002 | — | — |
| KH-P6-CYT-IND-003 | Análisis de resultados | ciencia-tecnologia | P6 | indagacion | cyt.p6.kh-ind-003 | — | — |
| KH-P6-CYT-TEC-001 | Diseño y mejora de soluciones | ciencia-tecnologia | P6 | tecnologia | cyt.p6.kh-tec-001 | — | — |
| KH-P6-CYT-TEC-002 | Evaluación del impacto | ciencia-tecnologia | P6 | tecnologia | cyt.p6.kh-tec-002 | — | — |
| KH-P6-CYT-TIE-002 | Riesgos naturales | ciencia-tecnologia | P6 | tierra-universo | cyt.p6.kh-tie-002 | — | — |
| KH-P6-CYT-TIE-003 | Sostenibilidad | ciencia-tecnologia | P6 | tierra-universo | cyt.p6.kh-tie-003 | — | — |
| KH-P6-CYT-TIE-004 | Cambio climático | ciencia-tecnologia | P6 | tierra-universo | cyt.p6.kh-tie-004 | — | — |
| KH-P6-MAT-ALG-001 | Expresiones algebraicas iniciales | matematica | P6 | algebra | mat.p6.kh-alg-001 | — | — |
| KH-P6-MAT-ALG-002 | Ecuaciones | matematica | P6 | algebra | mat.p6.kh-alg-002 | — | — |
| KH-P6-MAT-ALG-003 | Relaciones entre magnitudes | matematica | P6 | algebra | mat.p6.kh-alg-003 | — | — |
| KH-P6-MAT-ALG-004 | Patrones funcionales | matematica | P6 | algebra | mat.p6.kh-alg-004 | — | — |
| KH-P6-MAT-ARI-003 | Porcentajes | matematica | P6 | aritmetica | mat.p6.kh-ari-003 | — | — |
| KH-P6-MAT-ARI-004 | Razones y proporciones | matematica | P6 | aritmetica | mat.p6.kh-ari-004 | — | — |
| KH-P6-MAT-ARI-005 | Números enteros introductorios | matematica | P6 | aritmetica | mat.p6.kh-ari-005 | — | — |
| KH-P6-MAT-ARI-006 | Problemas financieros cotidianos | matematica | P6 | aritmetica | mat.p6.kh-ari-006 | — | — |
| KH-P6-MAT-ARI-007 | Múltiplos y divisores | matematica | P6 | aritmetica | mat.p6.kh-ari-007 | — | — |
| KH-P6-MAT-EST-001 | Medidas de tendencia central | matematica | P6 | estadistica | mat.p6.kh-est-001 | — | — |
| KH-P6-MAT-EST-002 | Probabilidad simple | matematica | P6 | estadistica | mat.p6.kh-est-002 | — | — |
| KH-P6-MAT-EST-003 | Lectura crítica de gráficos | matematica | P6 | estadistica | mat.p6.kh-est-003 | — | — |
| KH-P6-MAT-EST-004 | Tablas de frecuencia | matematica | P6 | estadistica | mat.p6.kh-est-004 | — | — |
| KH-P6-MAT-GEO-001 | Área y volumen | matematica | P6 | geometria | mat.p6.kh-geo-001 | — | — |
| KH-P6-MAT-GEO-003 | Transformaciones geométricas | matematica | P6 | geometria | mat.p6.kh-geo-003 | — | — |
| KH-P6-MAT-GEO-004 | Escalas | matematica | P6 | geometria | mat.p6.kh-geo-004 | — | — |
| KH-P6-MAT-GEO-005 | Plano cartesiano | matematica | P6 | geometria | mat.p6.kh-geo-005 | — | — |
| KH-P6-MAT-RMA-001 | Problemas de razonamiento multietapa | matematica | P6 | aritmetica | mat.p6.kh-rma-001 | — | — |
| KH-P6-MAT-RMA-002 | Estrategias lógicas | matematica | P6 | aritmetica | mat.p6.kh-rma-002 | — | — |
| KH-S1-COM-ESC-001 | Textos narrativos | comunicacion | S1 | escritura | com.s1.kh-esc-001 | — | — |
| KH-S1-COM-ESC-002 | Párrafos cohesionados | comunicacion | S1 | escritura | com.s1.kh-esc-002 | — | — |
| KH-S1-COM-ESC-003 | Resúmenes | comunicacion | S1 | escritura | com.s1.kh-esc-003 | — | — |
| KH-S1-COM-ESC-004 | Textos explicativos | comunicacion | S1 | escritura | com.s1.kh-esc-004 | — | — |
| KH-S1-COM-GRA-001 | Categorías gramaticales | comunicacion | S1 | lenguaje | com.s1.kh-gra-001 | — | — |
| KH-S1-COM-GRA-002 | Oración simple | comunicacion | S1 | lenguaje | com.s1.kh-gra-002 | — | — |
| KH-S1-COM-GRA-003 | Acentuación | comunicacion | S1 | lenguaje | com.s1.kh-gra-003 | — | — |
| KH-S1-COM-GRA-004 | Puntuación | comunicacion | S1 | lenguaje | com.s1.kh-gra-004 | — | — |
| KH-S1-COM-LEC-001 | Estructura textual | comunicacion | S1 | comprension-lectora | com.s1.kh-lec-001 | — | — |
| KH-S1-COM-LEC-002 | Inferencias | comunicacion | S1 | comprension-lectora | com.s1.kh-lec-002 | — | — |
| KH-S1-COM-LEC-003 | Textos informativos | comunicacion | S1 | comprension-lectora | com.s1.kh-lec-003 | — | — |
| KH-S1-COM-LEC-004 | Lectura de textos discontinuos | comunicacion | S1 | comprension-lectora | com.s1.kh-lec-004 | — | — |
| KH-S1-COM-LIT-001 | Géneros literarios | comunicacion | S1 | literatura | com.s1.kh-lit-001 | — | — |
| KH-S1-COM-LIT-003 | Cuento literario | comunicacion | S1 | literatura | com.s1.kh-lit-003 | — | — |
| KH-S1-COM-ORA-002 | Escucha crítica | comunicacion | S1 | oralidad | com.s1.kh-ora-002 | — | — |
| KH-S1-COM-ORA-003 | Conversaciones argumentadas | comunicacion | S1 | oralidad | com.s1.kh-ora-003 | — | — |
| KH-S1-COM-RVB-001 | Analogías verbales | comunicacion | S1 | razonamiento-verbal | com.s1.kh-rvb-001 | — | — |
| KH-S1-COM-RVB-002 | Relaciones de sinonimia | comunicacion | S1 | razonamiento-verbal | com.s1.kh-rvb-002 | — | — |
| KH-S1-CYT-BIO-001 | Célula | ciencia-tecnologia | S1 | biologia | cyt.s1.kh-bio-001 | — | — |
| KH-S1-CYT-BIO-002 | Clasificación de seres vivos | ciencia-tecnologia | S1 | biologia | cyt.s1.kh-bio-002 | — | — |
| KH-S1-CYT-BIO-003 | Ecosistemas | ciencia-tecnologia | S1 | biologia | cyt.s1.kh-bio-003 | — | — |
| KH-S1-CYT-BIO-004 | Diversidad biológica | ciencia-tecnologia | S1 | biologia | cyt.s1.kh-bio-004 | — | — |
| KH-S1-CYT-FIS-002 | Fuerza | ciencia-tecnologia | S1 | fisica | cyt.s1.kh-fis-002 | — | — |
| KH-S1-CYT-FIS-003 | Energía | ciencia-tecnologia | S1 | fisica | cyt.s1.kh-fis-003 | — | — |
| KH-S1-CYT-FIS-004 | Magnitudes físicas | ciencia-tecnologia | S1 | fisica | cyt.s1.kh-fis-004 | — | — |
| KH-S1-CYT-IND-001 | Método de indagación | ciencia-tecnologia | S1 | indagacion | cyt.s1.kh-ind-001 | — | — |
| KH-S1-CYT-IND-002 | Variables experimentales | ciencia-tecnologia | S1 | indagacion | cyt.s1.kh-ind-002 | — | — |
| KH-S1-CYT-IND-003 | Registro de evidencia | ciencia-tecnologia | S1 | indagacion | cyt.s1.kh-ind-003 | — | — |
| KH-S1-CYT-QUI-001 | Materia y propiedades | ciencia-tecnologia | S1 | quimica | cyt.s1.kh-qui-001 | — | — |
| KH-S1-CYT-QUI-002 | Mezclas y separación | ciencia-tecnologia | S1 | quimica | cyt.s1.kh-qui-002 | — | — |
| KH-S1-CYT-TEC-001 | Diseño tecnológico | ciencia-tecnologia | S1 | tecnologia | cyt.s1.kh-tec-001 | — | — |
| KH-S1-CYT-TEC-002 | Evaluación de materiales | ciencia-tecnologia | S1 | tecnologia | cyt.s1.kh-tec-002 | — | — |
| KH-S1-CYT-TIE-001 | Tierra y universo | ciencia-tecnologia | S1 | tierra-universo | cyt.s1.kh-tie-001 | — | — |
| KH-S1-CYT-TIE-002 | Ambiente | ciencia-tecnologia | S1 | tierra-universo | cyt.s1.kh-tie-002 | — | — |
| KH-S1-CYT-TIE-003 | Ciclos naturales | ciencia-tecnologia | S1 | tierra-universo | cyt.s1.kh-tie-003 | — | — |
| KH-S1-MAT-ALG-001 | Expresiones algebraicas | matematica | S1 | algebra | mat.s1.kh-alg-001 | — | — |
| KH-S1-MAT-ALG-004 | Patrones y sucesiones | matematica | S1 | algebra | mat.s1.kh-alg-004 | — | — |
| KH-S1-MAT-ALG-005 | Relaciones entre variables | matematica | S1 | algebra | mat.s1.kh-alg-005 | — | — |
| KH-S1-MAT-ARI-003 | Números racionales | matematica | S1 | aritmetica | mat.s1.kh-ari-003 | — | — |
| KH-S1-MAT-ARI-005 | Razones y proporciones | matematica | S1 | aritmetica | mat.s1.kh-ari-005 | — | — |
| KH-S1-MAT-ARI-006 | Porcentajes | matematica | S1 | aritmetica | mat.s1.kh-ari-006 | — | — |
| KH-S1-MAT-EST-002 | Gráficos estadísticos | matematica | S1 | estadistica | mat.s1.kh-est-002 | — | — |
| KH-S1-MAT-EST-003 | Media y mediana | matematica | S1 | estadistica | mat.s1.kh-est-003 | — | — |
| KH-S1-MAT-EST-004 | Probabilidad simple | matematica | S1 | estadistica | mat.s1.kh-est-004 | — | — |
| KH-S1-MAT-GEO-001 | Ángulos y polígonos | matematica | S1 | geometria | mat.s1.kh-geo-001 | — | — |
| KH-S1-MAT-GEO-002 | Perímetros y áreas | matematica | S1 | geometria | mat.s1.kh-geo-002 | — | — |
| KH-S1-MAT-GEO-003 | Plano cartesiano | matematica | S1 | geometria | mat.s1.kh-geo-003 | — | — |
| KH-S1-MAT-GEO-004 | Transformaciones geométricas | matematica | S1 | geometria | mat.s1.kh-geo-004 | — | — |
| KH-S1-MAT-RMA-001 | Razonamiento lógico | matematica | S1 | aritmetica | mat.s1.kh-rma-001 | — | — |
| KH-S1-MAT-RMA-002 | Razonamiento numérico | matematica | S1 | aritmetica | mat.s1.kh-rma-002 | — | — |
| KH-S2-COM-ESC-001 | Textos expositivos | comunicacion | S2 | escritura | com.s2.kh-esc-001 | — | — |
| KH-S2-COM-ESC-003 | Organización argumentativa | comunicacion | S2 | escritura | com.s2.kh-esc-003 | — | — |
| KH-S2-COM-GRA-001 | Sintaxis básica | comunicacion | S2 | lenguaje | com.s2.kh-gra-001 | — | — |
| KH-S2-COM-GRA-002 | Conectores | comunicacion | S2 | lenguaje | com.s2.kh-gra-002 | — | — |
| KH-S2-COM-GRA-003 | Puntuación avanzada | comunicacion | S2 | lenguaje | com.s2.kh-gra-003 | — | — |
| KH-S2-COM-GRA-004 | Concordancia | comunicacion | S2 | lenguaje | com.s2.kh-gra-004 | — | — |
| KH-S2-COM-LEC-001 | Lectura crítica | comunicacion | S2 | comprension-lectora | com.s2.kh-lec-001 | — | — |
| KH-S2-COM-LEC-002 | Argumentos y evidencias | comunicacion | S2 | comprension-lectora | com.s2.kh-lec-002 | — | — |
| KH-S2-COM-LEC-003 | Textos discontinuos | comunicacion | S2 | comprension-lectora | com.s2.kh-lec-003 | — | — |
| KH-S2-COM-LEC-004 | Análisis de fuentes | comunicacion | S2 | comprension-lectora | com.s2.kh-lec-004 | — | — |
| KH-S2-COM-LIT-001 | Narrativa hispanoamericana | comunicacion | S2 | literatura | com.s2.kh-lit-001 | — | — |
| KH-S2-COM-LIT-002 | Poesía | comunicacion | S2 | literatura | com.s2.kh-lit-002 | — | — |
| KH-S2-COM-LIT-003 | Análisis de personajes | comunicacion | S2 | literatura | com.s2.kh-lit-003 | — | — |
| KH-S2-COM-ORA-001 | Debate argumentativo | comunicacion | S2 | oralidad | com.s2.kh-ora-001 | — | — |
| KH-S2-COM-ORA-002 | Exposición sustentada | comunicacion | S2 | oralidad | com.s2.kh-ora-002 | — | — |
| KH-S2-COM-ORA-003 | Escucha de argumentos | comunicacion | S2 | oralidad | com.s2.kh-ora-003 | — | — |
| KH-S2-COM-RVB-001 | Relaciones semánticas | comunicacion | S2 | razonamiento-verbal | com.s2.kh-rvb-001 | — | — |
| KH-S2-COM-RVB-002 | Analogías complejas | comunicacion | S2 | razonamiento-verbal | com.s2.kh-rvb-002 | — | — |
| KH-S2-CYT-BIO-001 | Nutrición y sistemas humanos | ciencia-tecnologia | S2 | biologia | cyt.s2.kh-bio-001 | — | — |
| KH-S2-CYT-BIO-002 | Reproducción y salud | ciencia-tecnologia | S2 | biologia | cyt.s2.kh-bio-002 | — | — |
| KH-S2-CYT-BIO-003 | Biodiversidad | ciencia-tecnologia | S2 | biologia | cyt.s2.kh-bio-003 | — | — |
| KH-S2-CYT-BIO-004 | Relaciones ecológicas | ciencia-tecnologia | S2 | biologia | cyt.s2.kh-bio-004 | — | — |
| KH-S2-CYT-FIS-001 | Velocidad y aceleración | ciencia-tecnologia | S2 | fisica | cyt.s2.kh-fis-001 | — | — |
| KH-S2-CYT-FIS-002 | Fuerzas | ciencia-tecnologia | S2 | fisica | cyt.s2.kh-fis-002 | — | — |
| KH-S2-CYT-FIS-003 | Trabajo y energía | ciencia-tecnologia | S2 | fisica | cyt.s2.kh-fis-003 | — | — |
| KH-S2-CYT-FIS-004 | Gráficos de movimiento | ciencia-tecnologia | S2 | fisica | cyt.s2.kh-fis-004 | — | — |
| KH-S2-CYT-IND-001 | Hipótesis y medición | ciencia-tecnologia | S2 | indagacion | cyt.s2.kh-ind-001 | — | — |
| KH-S2-CYT-IND-002 | Diseño de experiencias | ciencia-tecnologia | S2 | indagacion | cyt.s2.kh-ind-002 | — | — |
| KH-S2-CYT-IND-003 | Análisis de evidencia | ciencia-tecnologia | S2 | indagacion | cyt.s2.kh-ind-003 | — | — |
| KH-S2-CYT-QUI-001 | Átomos y moléculas | ciencia-tecnologia | S2 | quimica | cyt.s2.kh-qui-001 | — | — |
| KH-S2-CYT-QUI-002 | Cambios físicos y químicos | ciencia-tecnologia | S2 | quimica | cyt.s2.kh-qui-002 | — | — |
| KH-S2-CYT-QUI-003 | Sustancias y mezclas | ciencia-tecnologia | S2 | quimica | cyt.s2.kh-qui-003 | — | — |
| KH-S2-CYT-TEC-001 | Prototipos funcionales | ciencia-tecnologia | S2 | tecnologia | cyt.s2.kh-tec-001 | — | — |
| KH-S2-CYT-TEC-002 | Pruebas de soluciones | ciencia-tecnologia | S2 | tecnologia | cyt.s2.kh-tec-002 | — | — |
| KH-S2-CYT-TIE-002 | Recursos naturales | ciencia-tecnologia | S2 | tierra-universo | cyt.s2.kh-tie-002 | — | — |
| KH-S2-CYT-TIE-003 | Impacto ambiental | ciencia-tecnologia | S2 | tierra-universo | cyt.s2.kh-tie-003 | — | — |
| KH-S2-MAT-ALG-001 | Polinomios introductorios | matematica | S2 | algebra | mat.s2.kh-alg-001 | — | — |
| KH-S2-MAT-ALG-002 | Productos algebraicos | matematica | S2 | algebra | mat.s2.kh-alg-002 | — | — |
| KH-S2-MAT-ALG-003 | Ecuaciones lineales | matematica | S2 | algebra | mat.s2.kh-alg-003 | — | — |
| KH-S2-MAT-ALG-004 | Funciones lineales | matematica | S2 | algebra | mat.s2.kh-alg-004 | — | — |
| KH-S2-MAT-ALG-005 | Representación gráfica | matematica | S2 | algebra | mat.s2.kh-alg-005 | — | — |
| KH-S2-MAT-ARI-002 | Proporcionalidad | matematica | S2 | aritmetica | mat.s2.kh-ari-002 | — | — |
| KH-S2-MAT-ARI-003 | Porcentajes compuestos | matematica | S2 | aritmetica | mat.s2.kh-ari-003 | — | — |
| KH-S2-MAT-ARI-004 | Potencias y raíces | matematica | S2 | aritmetica | mat.s2.kh-ari-004 | — | — |
| KH-S2-MAT-EST-001 | Media mediana y moda | matematica | S2 | estadistica | mat.s2.kh-est-001 | — | — |
| KH-S2-MAT-EST-002 | Probabilidad | matematica | S2 | estadistica | mat.s2.kh-est-002 | — | — |
| KH-S2-MAT-EST-003 | Gráficos comparativos | matematica | S2 | estadistica | mat.s2.kh-est-003 | — | — |
| KH-S2-MAT-EST-004 | Análisis de datos | matematica | S2 | estadistica | mat.s2.kh-est-004 | — | — |
| KH-S2-MAT-GEO-001 | Triángulos | matematica | S2 | geometria | mat.s2.kh-geo-001 | — | — |
| KH-S2-MAT-GEO-002 | Congruencia | matematica | S2 | geometria | mat.s2.kh-geo-002 | — | — |
| KH-S2-MAT-GEO-004 | Transformaciones | matematica | S2 | geometria | mat.s2.kh-geo-004 | — | — |
| KH-S2-MAT-GEO-005 | Escala y semejanza | matematica | S2 | geometria | mat.s2.kh-geo-005 | — | — |
| KH-S2-MAT-RMA-001 | Problemas de patrones | matematica | S2 | aritmetica | mat.s2.kh-rma-001 | — | — |
| KH-S2-MAT-RMA-002 | Estrategias de resolución | matematica | S2 | aritmetica | mat.s2.kh-rma-002 | — | — |
| KH-S3-COM-ESC-001 | Ensayo argumentativo | comunicacion | S3 | escritura | com.s3.kh-esc-001 | — | — |
| KH-S3-COM-ESC-002 | Informes académicos | comunicacion | S3 | escritura | com.s3.kh-esc-002 | — | — |
| KH-S3-COM-ESC-003 | Referencias bibliográficas iniciales | comunicacion | S3 | escritura | com.s3.kh-esc-003 | — | — |
| KH-S3-COM-GRA-002 | Subordinación introductoria | comunicacion | S3 | lenguaje | com.s3.kh-gra-002 | — | — |
| KH-S3-COM-GRA-003 | Cohesión | comunicacion | S3 | lenguaje | com.s3.kh-gra-003 | — | — |
| KH-S3-COM-GRA-004 | Uso de conectores | comunicacion | S3 | lenguaje | com.s3.kh-gra-004 | — | — |
| KH-S3-COM-LEC-002 | Evaluación de fuentes | comunicacion | S3 | comprension-lectora | com.s3.kh-lec-002 | — | — |
| KH-S3-COM-LEC-003 | Interpretación literaria | comunicacion | S3 | comprension-lectora | com.s3.kh-lec-003 | — | — |
| KH-S3-COM-LEC-004 | Análisis comparativo | comunicacion | S3 | comprension-lectora | com.s3.kh-lec-004 | — | — |
| KH-S3-COM-LIT-001 | Literatura peruana | comunicacion | S3 | literatura | com.s3.kh-lit-001 | — | — |
| KH-S3-COM-LIT-002 | Movimientos literarios introductorios | comunicacion | S3 | literatura | com.s3.kh-lit-002 | — | — |
| KH-S3-COM-LIT-003 | Recursos estilísticos | comunicacion | S3 | literatura | com.s3.kh-lit-003 | — | — |
| KH-S3-COM-ORA-001 | Debate formal | comunicacion | S3 | oralidad | com.s3.kh-ora-001 | — | — |
| KH-S3-COM-ORA-002 | Presentaciones persuasivas | comunicacion | S3 | oralidad | com.s3.kh-ora-002 | — | — |
| KH-S3-COM-ORA-003 | Escucha de argumentos | comunicacion | S3 | oralidad | com.s3.kh-ora-003 | — | — |
| KH-S3-COM-RVB-001 | Inferencias | comunicacion | S3 | razonamiento-verbal | com.s3.kh-rvb-001 | — | — |
| KH-S3-COM-RVB-002 | Analogías complejas | comunicacion | S3 | razonamiento-verbal | com.s3.kh-rvb-002 | — | — |
| KH-S3-COM-RVB-003 | Análisis de argumentos | comunicacion | S3 | razonamiento-verbal | com.s3.kh-rvb-003 | — | — |
| KH-S3-CYT-BIO-001 | Genética introductoria | ciencia-tecnologia | S3 | biologia | cyt.s3.kh-bio-001 | — | — |
| KH-S3-CYT-BIO-002 | Evolución y biodiversidad | ciencia-tecnologia | S3 | biologia | cyt.s3.kh-bio-002 | — | — |
| KH-S3-CYT-BIO-003 | Sistemas de regulación | ciencia-tecnologia | S3 | biologia | cyt.s3.kh-bio-003 | — | — |
| KH-S3-CYT-BIO-004 | Herencia y variación | ciencia-tecnologia | S3 | biologia | cyt.s3.kh-bio-004 | — | — |
| KH-S3-CYT-FIS-001 | Cinemática | ciencia-tecnologia | S3 | fisica | cyt.s3.kh-fis-001 | — | — |
| KH-S3-CYT-FIS-002 | Dinámica | ciencia-tecnologia | S3 | fisica | cyt.s3.kh-fis-002 | — | — |
| KH-S3-CYT-FIS-003 | Conservación de energía | ciencia-tecnologia | S3 | fisica | cyt.s3.kh-fis-003 | — | — |
| KH-S3-CYT-FIS-004 | Gráficos de movimiento | ciencia-tecnologia | S3 | fisica | cyt.s3.kh-fis-004 | — | — |
| KH-S3-CYT-IND-001 | Diseño experimental controlado | ciencia-tecnologia | S3 | indagacion | cyt.s3.kh-ind-001 | — | — |
| KH-S3-CYT-IND-002 | Variables y mediciones | ciencia-tecnologia | S3 | indagacion | cyt.s3.kh-ind-002 | — | — |
| KH-S3-CYT-IND-003 | Comunicación de resultados | ciencia-tecnologia | S3 | indagacion | cyt.s3.kh-ind-003 | — | — |
| KH-S3-CYT-QUI-001 | Estructura atómica | ciencia-tecnologia | S3 | quimica | cyt.s3.kh-qui-001 | — | — |
| KH-S3-CYT-QUI-002 | Tabla periódica | ciencia-tecnologia | S3 | quimica | cyt.s3.kh-qui-002 | — | — |
| KH-S3-CYT-QUI-003 | Enlaces químicos | ciencia-tecnologia | S3 | quimica | cyt.s3.kh-qui-003 | — | — |
| KH-S3-CYT-QUI-004 | Compuestos químicos | ciencia-tecnologia | S3 | quimica | cyt.s3.kh-qui-004 | — | — |
| KH-S3-CYT-TEC-001 | Evaluación de soluciones tecnológicas | ciencia-tecnologia | S3 | tecnologia | cyt.s3.kh-tec-001 | — | — |
| KH-S3-CYT-TEC-002 | Mejora de prototipos | ciencia-tecnologia | S3 | tecnologia | cyt.s3.kh-tec-002 | — | — |
| KH-S3-CYT-TIE-001 | Impacto ambiental | ciencia-tecnologia | S3 | tierra-universo | cyt.s3.kh-tie-001 | — | — |
| KH-S3-CYT-TIE-002 | Cambio climático | ciencia-tecnologia | S3 | tierra-universo | cyt.s3.kh-tie-002 | — | — |
| KH-S3-CYT-TIE-003 | Sostenibilidad | ciencia-tecnologia | S3 | tierra-universo | cyt.s3.kh-tie-003 | — | — |
| KH-S3-MAT-ALG-001 | Productos notables | matematica | S3 | algebra | mat.s3.kh-alg-001 | — | — |
| KH-S3-MAT-ALG-002 | Factorización | matematica | S3 | algebra | mat.s3.kh-alg-002 | — | — |
| KH-S3-MAT-ALG-003 | Ecuaciones cuadráticas | matematica | S3 | algebra | mat.s3.kh-alg-003 | — | — |
| KH-S3-MAT-ALG-004 | Funciones y gráficas | matematica | S3 | algebra | mat.s3.kh-alg-004 | — | — |
| KH-S3-MAT-ARI-001 | Números reales | matematica | S3 | aritmetica | mat.s3.kh-ari-001 | — | — |
| KH-S3-MAT-ARI-002 | Radicales | matematica | S3 | aritmetica | mat.s3.kh-ari-002 | — | — |
| KH-S3-MAT-ARI-003 | Notación científica | matematica | S3 | aritmetica | mat.s3.kh-ari-003 | — | — |
| KH-S3-MAT-ARI-005 | Interés compuesto introductorio | matematica | S3 | aritmetica | mat.s3.kh-ari-005 | — | — |
| KH-S3-MAT-ARI-006 | Operaciones con potencias | matematica | S3 | aritmetica | mat.s3.kh-ari-006 | — | — |
| KH-S3-MAT-EST-001 | Medidas de dispersión | matematica | S3 | estadistica | mat.s3.kh-est-001 | — | — |
| KH-S3-MAT-EST-002 | Probabilidad compuesta inicial | matematica | S3 | estadistica | mat.s3.kh-est-002 | — | — |
| KH-S3-MAT-EST-003 | Gráficos estadísticos | matematica | S3 | estadistica | mat.s3.kh-est-003 | — | — |
| KH-S3-MAT-GEO-001 | Semejanza | matematica | S3 | geometria | mat.s3.kh-geo-001 | — | — |
| KH-S3-MAT-GEO-002 | Teorema de Pitágoras | matematica | S3 | geometria | mat.s3.kh-geo-002 | — | — |
| KH-S3-MAT-GEO-003 | Geometría del espacio | matematica | S3 | geometria | mat.s3.kh-geo-003 | — | — |
| KH-S3-MAT-GEO-004 | Áreas y volúmenes | matematica | S3 | geometria | mat.s3.kh-geo-004 | — | — |
| KH-S3-MAT-RMA-001 | Problemas algebraicos | matematica | S3 | aritmetica | mat.s3.kh-rma-001 | — | — |
| KH-S3-MAT-RMA-002 | Razonamiento lógico | matematica | S3 | aritmetica | mat.s3.kh-rma-002 | — | — |
| KH-S4-COM-ESC-001 | Ensayo académico | comunicacion | S4 | escritura | com.s4.kh-esc-001 | — | — |
| KH-S4-COM-ESC-002 | Textos persuasivos | comunicacion | S4 | escritura | com.s4.kh-esc-002 | — | — |
| KH-S4-COM-ESC-003 | Investigación documental | comunicacion | S4 | escritura | com.s4.kh-esc-003 | — | — |
| KH-S4-COM-ESC-004 | Edición de textos | comunicacion | S4 | escritura | com.s4.kh-esc-004 | — | — |
| KH-S4-COM-GRA-001 | Sintaxis compleja | comunicacion | S4 | lenguaje | com.s4.kh-gra-001 | — | — |
| KH-S4-COM-GRA-002 | Coherencia y cohesión | comunicacion | S4 | lenguaje | com.s4.kh-gra-002 | — | — |
| KH-S4-COM-GRA-003 | Corrección de estilo | comunicacion | S4 | lenguaje | com.s4.kh-gra-003 | — | — |
| KH-S4-COM-LEC-001 | Análisis de discursos | comunicacion | S4 | comprension-lectora | com.s4.kh-lec-001 | — | — |
| KH-S4-COM-LEC-002 | Lectura intertextual | comunicacion | S4 | comprension-lectora | com.s4.kh-lec-002 | — | — |
| KH-S4-COM-LEC-003 | Evaluación crítica | comunicacion | S4 | comprension-lectora | com.s4.kh-lec-003 | — | — |
| KH-S4-COM-LEC-004 | Interpretación de textos complejos | comunicacion | S4 | comprension-lectora | com.s4.kh-lec-004 | — | — |
| KH-S4-COM-LIT-001 | Literatura universal | comunicacion | S4 | literatura | com.s4.kh-lit-001 | — | — |
| KH-S4-COM-LIT-002 | Movimientos literarios | comunicacion | S4 | literatura | com.s4.kh-lit-002 | — | — |
| KH-S4-COM-LIT-003 | Análisis de obras | comunicacion | S4 | literatura | com.s4.kh-lit-003 | — | — |
| KH-S4-COM-ORA-001 | Debate académico | comunicacion | S4 | oralidad | com.s4.kh-ora-001 | — | — |
| KH-S4-COM-ORA-002 | Argumentación oral | comunicacion | S4 | oralidad | com.s4.kh-ora-002 | — | — |
| KH-S4-COM-ORA-003 | Presentación persuasiva | comunicacion | S4 | oralidad | com.s4.kh-ora-003 | — | — |
| KH-S4-COM-RVB-001 | Comprensión crítica | comunicacion | S4 | razonamiento-verbal | com.s4.kh-rvb-001 | — | — |
| KH-S4-COM-RVB-002 | Relaciones lógicas | comunicacion | S4 | razonamiento-verbal | com.s4.kh-rvb-002 | — | — |
| KH-S4-CYT-BIO-001 | Genética mendeliana | ciencia-tecnologia | S4 | biologia | cyt.s4.kh-bio-001 | — | — |
| KH-S4-CYT-BIO-002 | Biotecnología introductoria | ciencia-tecnologia | S4 | biologia | cyt.s4.kh-bio-002 | — | — |
| KH-S4-CYT-BIO-003 | Homeostasis | ciencia-tecnologia | S4 | biologia | cyt.s4.kh-bio-003 | — | — |
| KH-S4-CYT-BIO-004 | Regulación biológica | ciencia-tecnologia | S4 | biologia | cyt.s4.kh-bio-004 | — | — |
| KH-S4-CYT-FIS-001 | Leyes de Newton | ciencia-tecnologia | S4 | fisica | cyt.s4.kh-fis-001 | — | — |
| KH-S4-CYT-FIS-002 | Trabajo potencia y energía | ciencia-tecnologia | S4 | fisica | cyt.s4.kh-fis-002 | — | — |
| KH-S4-CYT-FIS-003 | Ondas | ciencia-tecnologia | S4 | fisica | cyt.s4.kh-fis-003 | — | — |
| KH-S4-CYT-FIS-004 | Movimiento circular inicial | ciencia-tecnologia | S4 | fisica | cyt.s4.kh-fis-004 | — | — |
| KH-S4-CYT-IND-002 | Diseño de experimentos | ciencia-tecnologia | S4 | indagacion | cyt.s4.kh-ind-002 | — | — |
| KH-S4-CYT-IND-003 | Explicación científica | ciencia-tecnologia | S4 | indagacion | cyt.s4.kh-ind-003 | — | — |
| KH-S4-CYT-QUI-001 | Reacciones químicas | ciencia-tecnologia | S4 | quimica | cyt.s4.kh-qui-001 | — | — |
| KH-S4-CYT-QUI-002 | Estequiometría | ciencia-tecnologia | S4 | quimica | cyt.s4.kh-qui-002 | — | — |
| KH-S4-CYT-QUI-003 | Soluciones | ciencia-tecnologia | S4 | quimica | cyt.s4.kh-qui-003 | — | — |
| KH-S4-CYT-QUI-004 | Concentraciones | ciencia-tecnologia | S4 | quimica | cyt.s4.kh-qui-004 | — | — |
| KH-S4-CYT-TEC-001 | Optimización de prototipos | ciencia-tecnologia | S4 | tecnologia | cyt.s4.kh-tec-001 | — | — |
| KH-S4-CYT-TIE-001 | Sostenibilidad | ciencia-tecnologia | S4 | tierra-universo | cyt.s4.kh-tie-001 | — | — |
| KH-S4-CYT-TIE-002 | Riesgos ambientales | ciencia-tecnologia | S4 | tierra-universo | cyt.s4.kh-tie-002 | — | — |
| KH-S4-CYT-TIE-003 | Gestión de recursos | ciencia-tecnologia | S4 | tierra-universo | cyt.s4.kh-tie-003 | — | — |
| KH-S4-MAT-ALG-002 | Sistemas de ecuaciones | matematica | S4 | algebra | mat.s4.kh-alg-002 | — | — |
| KH-S4-MAT-ALG-003 | Inecuaciones | matematica | S4 | algebra | mat.s4.kh-alg-003 | — | — |
| KH-S4-MAT-ALG-004 | Expresiones racionales | matematica | S4 | algebra | mat.s4.kh-alg-004 | — | — |
| KH-S4-MAT-ALG-005 | Funciones polinómicas | matematica | S4 | algebra | mat.s4.kh-alg-005 | — | — |
| KH-S4-MAT-ARI-001 | Proporcionalidad avanzada | matematica | S4 | aritmetica | mat.s4.kh-ari-001 | — | — |
| KH-S4-MAT-ARI-003 | Operaciones con números reales | matematica | S4 | aritmetica | mat.s4.kh-ari-003 | — | — |
| KH-S4-MAT-ARI-004 | Modelación financiera | matematica | S4 | aritmetica | mat.s4.kh-ari-004 | — | — |
| KH-S4-MAT-EST-002 | Análisis estadístico | matematica | S4 | estadistica | mat.s4.kh-est-002 | — | — |
| KH-S4-MAT-EST-003 | Variabilidad de datos | matematica | S4 | estadistica | mat.s4.kh-est-003 | — | — |
| KH-S4-MAT-GEO-001 | Geometría analítica | matematica | S4 | geometria | mat.s4.kh-geo-001 | — | — |
| KH-S4-MAT-GEO-002 | Circunferencia | matematica | S4 | geometria | mat.s4.kh-geo-002 | — | — |
| KH-S4-MAT-GEO-003 | Áreas y volúmenes | matematica | S4 | geometria | mat.s4.kh-geo-003 | — | — |
| KH-S4-MAT-GEO-004 | Distancia entre puntos | matematica | S4 | geometria | mat.s4.kh-geo-004 | — | — |
| KH-S4-MAT-RMA-001 | Problemas integrados de modelación | matematica | S4 | aritmetica | mat.s4.kh-rma-001 | — | — |
| KH-S4-MAT-RMA-002 | Estrategias algebraicas | matematica | S4 | aritmetica | mat.s4.kh-rma-002 | — | — |
| KH-S4-MAT-TRI-001 | Razones trigonométricas | matematica | S4 | trigonometria | mat.s4.kh-tri-001 | — | — |
| KH-S4-MAT-TRI-002 | Identidades fundamentales | matematica | S4 | trigonometria | mat.s4.kh-tri-002 | — | — |
| KH-S4-MAT-TRI-003 | Resolución de triángulos | matematica | S4 | trigonometria | mat.s4.kh-tri-003 | — | — |
| KH-S4-MAT-TRI-004 | Ángulos notables | matematica | S4 | trigonometria | mat.s4.kh-tri-004 | — | — |
| KH-S5-COM-ESC-002 | Informe de investigación | comunicacion | S5 | escritura | com.s5.kh-esc-002 | — | — |
| KH-S5-COM-ESC-003 | Escritura académica | comunicacion | S5 | escritura | com.s5.kh-esc-003 | — | — |
| KH-S5-COM-ESC-004 | Citación de fuentes | comunicacion | S5 | escritura | com.s5.kh-esc-004 | — | — |
| KH-S5-COM-GRA-001 | Corrección lingüística | comunicacion | S5 | lenguaje | com.s5.kh-gra-001 | — | — |
| KH-S5-COM-GRA-002 | Estilo y precisión | comunicacion | S5 | lenguaje | com.s5.kh-gra-002 | — | — |
| KH-S5-COM-GRA-003 | Cohesión y coherencia | comunicacion | S5 | lenguaje | com.s5.kh-gra-003 | — | — |
| KH-S5-COM-LEC-001 | Lectura crítica avanzada | comunicacion | S5 | comprension-lectora | com.s5.kh-lec-001 | — | — |
| KH-S5-COM-LEC-002 | Análisis de discursos | comunicacion | S5 | comprension-lectora | com.s5.kh-lec-002 | — | — |
| KH-S5-COM-LEC-003 | Interpretación de textos complejos | comunicacion | S5 | comprension-lectora | com.s5.kh-lec-003 | — | — |
| KH-S5-COM-LEC-004 | Evaluación de información | comunicacion | S5 | comprension-lectora | com.s5.kh-lec-004 | — | — |
| KH-S5-COM-LIT-001 | Literatura peruana contemporánea | comunicacion | S5 | literatura | com.s5.kh-lit-001 | — | — |
| KH-S5-COM-LIT-002 | Literatura universal comparada | comunicacion | S5 | literatura | com.s5.kh-lit-002 | — | — |
| KH-S5-COM-LIT-003 | Análisis de obras | comunicacion | S5 | literatura | com.s5.kh-lit-003 | — | — |
| KH-S5-COM-ORA-001 | Oratoria | comunicacion | S5 | oralidad | com.s5.kh-ora-001 | — | — |
| KH-S5-COM-ORA-003 | Entrevistas | comunicacion | S5 | oralidad | com.s5.kh-ora-003 | — | — |
| KH-S5-COM-ORA-004 | Presentaciones académicas | comunicacion | S5 | oralidad | com.s5.kh-ora-004 | — | — |
| KH-S5-COM-RVB-001 | Argumentación y razonamiento verbal | comunicacion | S5 | razonamiento-verbal | com.s5.kh-rvb-001 | — | — |
| KH-S5-COM-RVB-002 | Inferencias complejas | comunicacion | S5 | razonamiento-verbal | com.s5.kh-rvb-002 | — | — |
| KH-S5-CYT-BIO-001 | Biología molecular introductoria | ciencia-tecnologia | S5 | biologia | cyt.s5.kh-bio-001 | — | — |
| KH-S5-CYT-BIO-002 | Evolución | ciencia-tecnologia | S5 | biologia | cyt.s5.kh-bio-002 | — | — |
| KH-S5-CYT-BIO-003 | Salud pública | ciencia-tecnologia | S5 | biologia | cyt.s5.kh-bio-003 | — | — |
| KH-S5-CYT-BIO-004 | Genética y sociedad | ciencia-tecnologia | S5 | biologia | cyt.s5.kh-bio-004 | — | — |
| KH-S5-CYT-FIS-001 | Electricidad y magnetismo | ciencia-tecnologia | S5 | fisica | cyt.s5.kh-fis-001 | — | — |
| KH-S5-CYT-FIS-002 | Ondas y óptica | ciencia-tecnologia | S5 | fisica | cyt.s5.kh-fis-002 | — | — |
| KH-S5-CYT-FIS-003 | Física contemporánea introductoria | ciencia-tecnologia | S5 | fisica | cyt.s5.kh-fis-003 | — | — |
| KH-S5-CYT-FIS-004 | Circuitos eléctricos | ciencia-tecnologia | S5 | fisica | cyt.s5.kh-fis-004 | — | — |
| KH-S5-CYT-IND-001 | Proyecto de investigación científica | ciencia-tecnologia | S5 | indagacion | cyt.s5.kh-ind-001 | — | — |
| KH-S5-CYT-IND-002 | Análisis de resultados | ciencia-tecnologia | S5 | indagacion | cyt.s5.kh-ind-002 | — | — |
| KH-S5-CYT-IND-003 | Comunicación de evidencias | ciencia-tecnologia | S5 | indagacion | cyt.s5.kh-ind-003 | — | — |
| KH-S5-CYT-QUI-001 | Química orgánica introductoria | ciencia-tecnologia | S5 | quimica | cyt.s5.kh-qui-001 | — | — |
| KH-S5-CYT-QUI-002 | Equilibrio químico introductorio | ciencia-tecnologia | S5 | quimica | cyt.s5.kh-qui-002 | — | — |
| KH-S5-CYT-QUI-003 | Química ambiental | ciencia-tecnologia | S5 | quimica | cyt.s5.kh-qui-003 | — | — |
| KH-S5-CYT-QUI-004 | Reacciones químicas | ciencia-tecnologia | S5 | quimica | cyt.s5.kh-qui-004 | — | — |
| KH-S5-CYT-TEC-001 | Proyecto tecnológico integral | ciencia-tecnologia | S5 | tecnologia | cyt.s5.kh-tec-001 | — | — |
| KH-S5-CYT-TEC-002 | Evaluación del impacto de soluciones | ciencia-tecnologia | S5 | tecnologia | cyt.s5.kh-tec-002 | — | — |
| KH-S5-CYT-TIE-001 | Sostenibilidad global | ciencia-tecnologia | S5 | tierra-universo | cyt.s5.kh-tie-001 | — | — |
| KH-S5-CYT-TIE-002 | Gestión de riesgos | ciencia-tecnologia | S5 | tierra-universo | cyt.s5.kh-tie-002 | — | — |
| KH-S5-CYT-TIE-003 | Cambio climático | ciencia-tecnologia | S5 | tierra-universo | cyt.s5.kh-tie-003 | — | — |
| KH-S5-MAT-ALG-002 | Funciones logarítmicas | matematica | S5 | algebra | mat.s5.kh-alg-002 | — | — |
| KH-S5-MAT-ALG-003 | Sistemas no lineales introductorios | matematica | S5 | algebra | mat.s5.kh-alg-003 | — | — |
| KH-S5-MAT-ALG-004 | Modelación funcional | matematica | S5 | algebra | mat.s5.kh-alg-004 | — | — |
| KH-S5-MAT-ALG-005 | Composición de funciones | matematica | S5 | algebra | mat.s5.kh-alg-005 | — | — |
| KH-S5-MAT-ARI-001 | Matemática financiera | matematica | S5 | aritmetica | mat.s5.kh-ari-001 | — | — |
| KH-S5-MAT-ARI-002 | Modelación proporcional | matematica | S5 | aritmetica | mat.s5.kh-ari-002 | — | — |
| KH-S5-MAT-ARI-003 | Números reales y aplicaciones | matematica | S5 | aritmetica | mat.s5.kh-ari-003 | — | — |
| KH-S5-MAT-ARI-004 | Porcentajes compuestos | matematica | S5 | aritmetica | mat.s5.kh-ari-004 | — | — |
| KH-S5-MAT-EST-001 | Probabilidad compuesta | matematica | S5 | estadistica | mat.s5.kh-est-001 | — | — |
| KH-S5-MAT-EST-002 | Inferencia estadística introductoria | matematica | S5 | estadistica | mat.s5.kh-est-002 | — | — |
| KH-S5-MAT-EST-003 | Interpretación crítica de datos | matematica | S5 | estadistica | mat.s5.kh-est-003 | — | — |
| KH-S5-MAT-EST-004 | Muestreo | matematica | S5 | estadistica | mat.s5.kh-est-004 | — | — |
| KH-S5-MAT-GEO-001 | Geometría analítica avanzada | matematica | S5 | geometria | mat.s5.kh-geo-001 | — | — |
| KH-S5-MAT-GEO-002 | Vectores introductorios | matematica | S5 | geometria | mat.s5.kh-geo-002 | — | — |
| KH-S5-MAT-GEO-003 | Problemas espaciales | matematica | S5 | geometria | mat.s5.kh-geo-003 | — | — |
| KH-S5-MAT-GEO-004 | Ecuaciones de la recta | matematica | S5 | geometria | mat.s5.kh-geo-004 | — | — |
| KH-S5-MAT-RMA-001 | Resolución de problemas integrados | matematica | S5 | aritmetica | mat.s5.kh-rma-001 | — | — |
| KH-S5-MAT-RMA-002 | Razonamiento lógico avanzado | matematica | S5 | aritmetica | mat.s5.kh-rma-002 | — | — |
| KH-S5-MAT-TRI-001 | Funciones trigonométricas | matematica | S5 | trigonometria | mat.s5.kh-tri-001 | — | — |
| KH-S5-MAT-TRI-002 | Ecuaciones trigonométricas | matematica | S5 | trigonometria | mat.s5.kh-tri-002 | — | — |
| KH-S5-MAT-TRI-003 | Aplicaciones de trigonometría | matematica | S5 | trigonometria | mat.s5.kh-tri-003 | — | — |
| KH-S5-MAT-TRI-004 | Gráficas trigonométricas | matematica | S5 | trigonometria | mat.s5.kh-tri-004 | — | — |

## Conflicto

| Código | Título | Área | Grado | Disciplina | Clave | Similitud | Motivo |
|---|---|---|---|---|---|---:|---|
| KH-P1-CYT-TIE-003 | Cuidado de plantas | ciencia-tecnologia | P1 | tierra-universo | — | 0.895 | Posible coincidencia: cyt.p1.cuidado-de-las-plantas |
| KH-P1-MAT-ARI-002 | Conteo hasta 100 | matematica | P1 | aritmetica | — | 0.636 | Posible coincidencia: mat.p1.contar-hasta-10 |
| KH-P1-MAT-ARI-004 | Comparación de cantidades | matematica | P1 | aritmetica | — | 0.643 | Posible coincidencia: mat.p1.estimar-cantidades |
| KH-P1-MAT-ARI-006 | Descomposición de números | matematica | P1 | aritmetica | — | 0.630 | Posible coincidencia: mat.p1.comparar-hasta-50 |
| KH-P1-MAT-ARI-009 | Problemas de juntar | matematica | P1 | aritmetica | — | 0.778 | Posible coincidencia: mat.p1.problemas-quitar |
| KH-P1-MAT-EST-002 | Pictogramas simples | matematica | P1 | estadistica | — | 0.634 | Posible coincidencia: mat.p1.pictograma-horizontal |
| KH-P1-MAT-RMA-002 | Problemas con dibujos | matematica | P1 | aritmetica | — | 0.667 | Posible coincidencia: mat.p1.problemas-con-dibujos |
| KH-P2-COM-ESC-002 | Descripciones | comunicacion | P2 | escritura | — | 0.629 | Posible coincidencia: com.p2.escribir-una-descripcion |
| KH-P2-CYT-BIO-001 | Ciclo de vida de plantas | ciencia-tecnologia | P2 | biologia | — | 0.898 | Posible coincidencia: cyt.p2.ciclo-de-vida-planta |
| KH-P2-CYT-FIS-002 | Movimiento de objetos | ciencia-tecnologia | P2 | fisica | — | 0.667 | Posible coincidencia: cyt.p2.el-viento-mueve-objetos |
| KH-P2-MAT-ARI-003 | Comparación de números | matematica | P2 | aritmetica | — | 0.750 | Posible coincidencia: mat.p2.comparar-dos-cifras |
| KH-P2-MAT-GEO-002 | Cuerpos geométricos | matematica | P2 | geometria | — | 0.621 | Posible coincidencia: mat.p2.construir-con-cuerpos |
| KH-P3-COM-GRA-003 | Concordancia | comunicacion | P3 | lenguaje | — | 0.667 | Posible coincidencia: com.p3.revisar-gramatica |
| KH-P3-COM-LEC-003 | Textos informativos | comunicacion | P3 | comprension-lectora | — | 0.811 | Posible coincidencia: com.p3.leer-texto-informativo |
| KH-P3-COM-LIT-002 | Leyendas | comunicacion | P3 | literatura | — | 0.750 | Posible coincidencia: com.p3.leer-una-leyenda |
| KH-P3-MAT-ALG-002 | Igualdades con incógnitas | matematica | P3 | algebra | — | 0.727 | Posible coincidencia: mat.p3.igualdad-restas |
| KH-P3-MAT-ARI-001 | Números de cuatro cifras | matematica | P3 | aritmetica | — | 0.727 | Posible coincidencia: mat.p3.cero-posicional |
| KH-P3-MAT-ARI-002 | Números de cinco cifras | matematica | P3 | aritmetica | — | 0.667 | Posible coincidencia: mat.p3.cero-posicional |
| KH-P3-MAT-ARI-006 | División exacta | matematica | P3 | aritmetica | — | 0.634 | Posible coincidencia: mat.p3.hechos-division |
| KH-P3-MAT-ARI-010 | Problemas multiplicativos | matematica | P3 | aritmetica | — | 0.658 | Posible coincidencia: mat.p3.problemas-dos-etapas-mixtas |
| KH-P3-MAT-EST-001 | Gráficos de barras | matematica | P3 | estadistica | — | 0.696 | Posible coincidencia: mat.p3.barras-horizontales |
| KH-P3-MAT-GEO-003 | Unidades de longitud | matematica | P3 | geometria | — | 0.654 | Posible coincidencia: mat.p3.misma-longitud-distintas-unidades |
| KH-P4-COM-LEC-005 | Comparación de textos | comunicacion | P4 | comprension-lectora | — | 0.720 | Posible coincidencia: com.p4.texto-expositivo-comparacion |
| KH-P4-MAT-ALG-001 | Patrones multiplicativos | matematica | P4 | algebra | — | 0.754 | Posible coincidencia: mat.p4.patrones-multiplicativos |
| KH-P4-MAT-ALG-003 | Relaciones de cambio | matematica | P4 | algebra | — | 0.717 | Posible coincidencia: mat.p4.justificar-relacion-cambio |
| KH-P4-MAT-ARI-006 | Fracciones equivalentes | matematica | P4 | aritmetica | — | 0.677 | Posible coincidencia: mat.p4.fracciones-equivalentes |
| KH-P4-MAT-ARI-007 | Adición de fracciones | matematica | P4 | aritmetica | — | 0.783 | Posible coincidencia: mat.p4.amplificar-fracciones |
| KH-P4-MAT-ARI-008 | Sustracción de fracciones | matematica | P4 | aritmetica | — | 0.792 | Posible coincidencia: mat.p4.comparar-fracciones |
| KH-P4-MAT-ARI-010 | Comparación de decimales | matematica | P4 | aritmetica | — | 0.681 | Posible coincidencia: mat.p4.comparar-fracciones |
| KH-P4-MAT-ARI-011 | Problemas con fracciones | matematica | P4 | aritmetica | — | 0.657 | Posible coincidencia: mat.p4.problemas-suma-resta-fracciones |
| KH-P4-MAT-RMA-001 | Problemas de varias operaciones | matematica | P4 | aritmetica | — | 0.633 | Posible coincidencia: mat.p4.problemas-cuatro-operaciones |
| KH-P5-COM-ESC-002 | Textos de opinión | comunicacion | P5 | escritura | — | 0.824 | Posible coincidencia: com.p5.texto-de-opinion |
| KH-P5-CYT-BIO-003 | Reproducción de plantas | ciencia-tecnologia | P5 | biologia | — | 0.698 | Posible coincidencia: cyt.p5.reproduccion-seres-vivos |
| KH-P5-MAT-ARI-002 | Fracciones y decimales | matematica | P5 | aritmetica | — | 0.700 | Posible coincidencia: mat.p5.fracciones-decimales |
| KH-P5-MAT-ARI-003 | Multiplicación de fracciones | matematica | P5 | aritmetica | — | 0.701 | Posible coincidencia: mat.p5.multiplicacion-fracciones |
| KH-P5-MAT-ARI-007 | Problemas de proporcionalidad | matematica | P5 | aritmetica | — | 0.830 | Posible coincidencia: mat.p5.proporcionalidad-tablas |
| KH-P5-MAT-ARI-008 | Operaciones combinadas | matematica | P5 | aritmetica | — | 0.737 | Posible coincidencia: mat.p5.operaciones-con-parentesis |
| KH-P6-CYT-TIE-001 | Sistema solar | ciencia-tecnologia | P6 | tierra-universo | — | 0.889 | Posible coincidencia: cyt.p6.sistema-solar |
| KH-P6-MAT-ARI-001 | Operaciones con fracciones | matematica | P6 | aritmetica | — | 0.689 | Posible coincidencia: mat.p6.ecuaciones-cuatro-operaciones |
| KH-P6-MAT-ARI-002 | Operaciones con decimales | matematica | P6 | aritmetica | — | 0.677 | Posible coincidencia: mat.p6.fraccion-decimal-conversion |
| KH-P6-MAT-GEO-002 | Circunferencia y círculo | matematica | P6 | geometria | — | 0.657 | Posible coincidencia: mat.p6.circunferencia-circulo |
| KH-S1-COM-LIT-002 | Mitos y leyendas | comunicacion | S1 | literatura | — | 0.769 | Posible coincidencia: com.s1.mito-y-leyenda-peruanos |
| KH-S1-COM-ORA-001 | Exposición oral | comunicacion | S1 | oralidad | — | 0.651 | Posible coincidencia: com.s1.planificar-una-exposicion |
| KH-S1-CYT-FIS-001 | Movimiento | ciencia-tecnologia | S1 | fisica | — | 0.643 | Posible coincidencia: cyt.s1.movimiento-fuerzas |
| KH-S1-CYT-QUI-003 | Cambios físicos y químicos | ciencia-tecnologia | S1 | quimica | — | 0.781 | Posible coincidencia: cyt.s1.cambios-fisicos-quimicos |
| KH-S1-MAT-ALG-003 | Ecuaciones lineales | matematica | S1 | algebra | — | 0.750 | Posible coincidencia: mat.s1.inecuaciones-lineales |
| KH-S1-MAT-ARI-001 | Números enteros | matematica | S1 | aritmetica | — | 0.718 | Posible coincidencia: mat.s1.adicion-enteros |
| KH-S1-MAT-ARI-002 | Operaciones con enteros | matematica | S1 | aritmetica | — | 0.800 | Posible coincidencia: mat.s1.operaciones-combinadas-enteros |
| KH-S1-MAT-ARI-004 | Fracciones y decimales | matematica | S1 | aritmetica | — | 0.667 | Posible coincidencia: mat.s1.orden-fracciones-decimales |
| KH-S1-MAT-ARI-007 | Potencias enteras | matematica | S1 | aritmetica | — | 0.651 | Posible coincidencia: mat.s1.potenciacion-enteros |
| KH-S1-MAT-EST-001 | Tablas de frecuencia | matematica | S1 | estadistica | — | 0.633 | Posible coincidencia: mat.s1.tabla-frecuencias-s1 |
| KH-S1-MAT-RMA-003 | Estrategias de problemas | matematica | S1 | aritmetica | — | 0.634 | Posible coincidencia: mat.s1.problemas-edades |
| KH-S2-COM-ESC-002 | Artículos de opinión | comunicacion | S2 | escritura | — | 0.850 | Posible coincidencia: com.s2.articulo-de-opinion |
| KH-S2-MAT-ARI-001 | Operaciones con racionales | matematica | S2 | aritmetica | — | 0.862 | Posible coincidencia: mat.s2.numeros-racionales |
| KH-S2-MAT-ARI-005 | Estimación y aproximación | matematica | S2 | aritmetica | — | 0.633 | Posible coincidencia: mat.s2.raiz-aproximada |
| KH-S2-MAT-GEO-003 | Áreas de figuras compuestas | matematica | S2 | geometria | — | 0.685 | Posible coincidencia: mat.s2.area-figuras-compuestas |
| KH-S3-COM-GRA-001 | Oración compuesta | comunicacion | S3 | lenguaje | — | 0.744 | Posible coincidencia: com.s3.oracion-compuesta-coordinada |
| KH-S3-COM-LEC-001 | Análisis argumentativo | comunicacion | S3 | comprension-lectora | — | 0.651 | Posible coincidencia: com.s3.falacias |
| KH-S3-MAT-ALG-005 | Sistemas de ecuaciones | matematica | S3 | algebra | — | 0.764 | Posible coincidencia: mat.s3.sistemas-equivalentes |
| KH-S3-MAT-TRI-001 | Razones trigonométricas introductorias | matematica | S3 | trigonometria | — | 0.641 | Posible coincidencia: mat.s3.propiedades-razones-trigonometricas |
| KH-S3-MAT-TRI-002 | Triángulos rectángulos | matematica | S3 | trigonometria | — | 0.824 | Posible coincidencia: mat.s3.triangulos-notables |
| KH-S4-CYT-IND-001 | Análisis de datos experimentales | ciencia-tecnologia | S4 | indagacion | — | 0.684 | Posible coincidencia: cyt.s4.graficos-de-dispersion |
| KH-S4-CYT-TEC-002 | Validación de soluciones | ciencia-tecnologia | S4 | tecnologia | — | 0.773 | Posible coincidencia: cyt.s4.dilucion-de-soluciones |
| KH-S4-MAT-ALG-001 | Funciones cuadráticas | matematica | S4 | algebra | — | 0.679 | Posible coincidencia: mat.s4.cuadratica-incompleta |
| KH-S4-MAT-EST-001 | Probabilidad condicional introductoria | matematica | S4 | estadistica | — | 0.767 | Posible coincidencia: mat.s4.probabilidad-condicional |
| KH-S5-COM-ESC-001 | Ensayo argumentativo | comunicacion | S5 | escritura | — | 0.633 | Posible coincidencia: com.s5.ensayo-academico-argumentativo |
| KH-S5-COM-ORA-002 | Debate con evidencias | comunicacion | S5 | oralidad | — | 0.800 | Posible coincidencia: com.s5.debate-academico-con-evidencias |
| KH-S5-MAT-ALG-001 | Funciones exponenciales | matematica | S5 | algebra | — | 0.708 | Posible coincidencia: mat.s5.funcion-exponencial |

## Inventario

| Código | Título | Área | Grado | Disciplina | Clave | Similitud | Motivo |
|---|---|---|---|---|---|---:|---|
| KH-P1-AYC-GEN-001 | Colores primarios | arte-cultura | P1 | — | — | — | — |
| KH-P1-AYC-GEN-002 | Dibujo de observación | arte-cultura | P1 | — | — | — | — |
| KH-P1-AYC-GEN-003 | Ritmo y movimiento | arte-cultura | P1 | — | — | — | — |
| KH-P1-AYC-GEN-004 | Expresión con materiales | arte-cultura | P1 | — | — | — | — |
| KH-P1-AYC-GEN-005 | Canciones infantiles | arte-cultura | P1 | — | — | — | — |
| KH-P1-CSL-GEN-001 | Vocabulario cotidiano | castellano-segunda-lengua | P1 | — | — | — | — |
| KH-P1-CSL-GEN-002 | Saludos | castellano-segunda-lengua | P1 | — | — | — | — |
| KH-P1-CSL-GEN-003 | Presentaciones orales | castellano-segunda-lengua | P1 | — | — | — | — |
| KH-P1-CSL-GEN-004 | Comprensión de instrucciones | castellano-segunda-lengua | P1 | — | — | — | — |
| KH-P1-EFI-GEN-001 | Esquema corporal | educacion-fisica | P1 | — | — | — | — |
| KH-P1-EFI-GEN-002 | Equilibrio estático | educacion-fisica | P1 | — | — | — | — |
| KH-P1-EFI-GEN-003 | Desplazamientos | educacion-fisica | P1 | — | — | — | — |
| KH-P1-EFI-GEN-004 | Juegos cooperativos | educacion-fisica | P1 | — | — | — | — |
| KH-P1-EFI-GEN-005 | Hábitos de higiene | educacion-fisica | P1 | — | — | — | — |
| KH-P1-ENG-GEN-001 | Greetings | ingles | P1 | — | — | — | — |
| KH-P1-ENG-GEN-002 | Numbers and colors | ingles | P1 | — | — | — | — |
| KH-P1-ENG-GEN-003 | Family members | ingles | P1 | — | — | — | — |
| KH-P1-ENG-GEN-004 | Classroom objects | ingles | P1 | — | — | — | — |
| KH-P1-ENG-GEN-005 | Simple instructions | ingles | P1 | — | — | — | — |
| KH-P1-ENG-GEN-006 | Basic introductions | ingles | P1 | — | — | — | — |
| KH-P1-PS-CIV-001 | Normas de convivencia | personal-social | P1 | — | — | — | — |
| KH-P1-PS-CIV-002 | Derechos de la niñez | personal-social | P1 | — | — | — | — |
| KH-P1-PS-CIV-003 | Responsabilidades en casa | personal-social | P1 | — | — | — | — |
| KH-P1-PS-ECO-001 | Necesidades básicas | personal-social | P1 | — | — | — | — |
| KH-P1-PS-ECO-002 | Ahorro cotidiano | personal-social | P1 | — | — | — | — |
| KH-P1-PS-GEO-001 | Mi escuela | personal-social | P1 | — | — | — | — |
| KH-P1-PS-GEO-002 | Mi comunidad | personal-social | P1 | — | — | — | — |
| KH-P1-PS-GEO-003 | Lugares de referencia | personal-social | P1 | — | — | — | — |
| KH-P1-PS-HIS-001 | Historia personal | personal-social | P1 | — | — | — | — |
| KH-P1-PS-HIS-002 | Cambios con el tiempo | personal-social | P1 | — | — | — | — |
| KH-P1-PS-IDE-001 | Identidad personal | personal-social | P1 | — | — | — | — |
| KH-P1-PS-IDE-002 | Emociones | personal-social | P1 | — | — | — | — |
| KH-P1-PS-IDE-003 | Familia | personal-social | P1 | — | — | — | — |
| KH-P1-PS-IDE-004 | Autocuidado | personal-social | P1 | — | — | — | — |
| KH-P1-REL-GEN-001 | Respeto a los demás | educacion-religiosa | P1 | — | — | — | — |
| KH-P1-REL-GEN-002 | Solidaridad | educacion-religiosa | P1 | — | — | — | — |
| KH-P1-REL-GEN-003 | Celebraciones religiosas y familiares | educacion-religiosa | P1 | — | — | — | — |
| KH-P1-REL-GEN-004 | Cuidado de la creación | educacion-religiosa | P1 | — | — | — | — |
| KH-P2-AYC-GEN-001 | Formas y texturas | arte-cultura | P2 | — | — | — | — |
| KH-P2-AYC-GEN-002 | Collage | arte-cultura | P2 | — | — | — | — |
| KH-P2-AYC-GEN-003 | Canciones infantiles | arte-cultura | P2 | — | — | — | — |
| KH-P2-AYC-GEN-004 | Dramatización | arte-cultura | P2 | — | — | — | — |
| KH-P2-AYC-GEN-005 | Modelado artístico | arte-cultura | P2 | — | — | — | — |
| KH-P2-CSL-GEN-001 | Conversaciones cotidianas | castellano-segunda-lengua | P2 | — | — | — | — |
| KH-P2-CSL-GEN-002 | Lectura de textos breves | castellano-segunda-lengua | P2 | — | — | — | — |
| KH-P2-CSL-GEN-003 | Escritura de oraciones | castellano-segunda-lengua | P2 | — | — | — | — |
| KH-P2-CSL-GEN-004 | Vocabulario de la comunidad | castellano-segunda-lengua | P2 | — | — | — | — |
| KH-P2-EFI-GEN-001 | Coordinación motriz | educacion-fisica | P2 | — | — | — | — |
| KH-P2-EFI-GEN-002 | Lanzamientos y recepciones | educacion-fisica | P2 | — | — | — | — |
| KH-P2-EFI-GEN-003 | Juegos con reglas | educacion-fisica | P2 | — | — | — | — |
| KH-P2-EFI-GEN-004 | Higiene corporal | educacion-fisica | P2 | — | — | — | — |
| KH-P2-EFI-GEN-005 | Ritmo motor | educacion-fisica | P2 | — | — | — | — |
| KH-P2-ENG-GEN-001 | Daily routines | ingles | P2 | — | — | — | — |
| KH-P2-ENG-GEN-002 | Body parts | ingles | P2 | — | — | — | — |
| KH-P2-ENG-GEN-003 | Animals | ingles | P2 | — | — | — | — |
| KH-P2-ENG-GEN-004 | Days of the week | ingles | P2 | — | — | — | — |
| KH-P2-ENG-GEN-005 | Simple questions | ingles | P2 | — | — | — | — |
| KH-P2-ENG-GEN-006 | Describing people | ingles | P2 | — | — | — | — |
| KH-P2-PS-CIV-001 | Acuerdos de aula | personal-social | P2 | — | — | — | — |
| KH-P2-PS-CIV-002 | Participación escolar | personal-social | P2 | — | — | — | — |
| KH-P2-PS-CIV-003 | Derechos y deberes | personal-social | P2 | — | — | — | — |
| KH-P2-PS-ECO-001 | Necesidades y deseos | personal-social | P2 | — | — | — | — |
| KH-P2-PS-ECO-002 | Uso del dinero | personal-social | P2 | — | — | — | — |
| KH-P2-PS-GEO-001 | Orientación en la comunidad | personal-social | P2 | — | — | — | — |
| KH-P2-PS-GEO-002 | Servicios comunitarios | personal-social | P2 | — | — | — | — |
| KH-P2-PS-GEO-003 | Croquis sencillos | personal-social | P2 | — | — | — | — |
| KH-P2-PS-HIS-001 | Pasado y presente familiar | personal-social | P2 | — | — | — | — |
| KH-P2-PS-HIS-002 | Tradiciones locales | personal-social | P2 | — | — | — | — |
| KH-P2-PS-HIS-003 | Cambios en la comunidad | personal-social | P2 | — | — | — | — |
| KH-P2-PS-IDE-001 | Autoestima | personal-social | P2 | — | — | — | — |
| KH-P2-PS-IDE-002 | Manejo de emociones | personal-social | P2 | — | — | — | — |
| KH-P2-PS-IDE-003 | Identidad familiar | personal-social | P2 | — | — | — | — |
| KH-P2-REL-GEN-001 | Empatía | educacion-religiosa | P2 | — | — | — | — |
| KH-P2-REL-GEN-002 | Acciones solidarias | educacion-religiosa | P2 | — | — | — | — |
| KH-P2-REL-GEN-003 | Tradiciones religiosas | educacion-religiosa | P2 | — | — | — | — |
| KH-P2-REL-GEN-004 | Respeto a los demás | educacion-religiosa | P2 | — | — | — | — |
| KH-P3-AYC-GEN-001 | Colores secundarios | arte-cultura | P3 | — | — | — | — |
| KH-P3-AYC-GEN-002 | Composición visual | arte-cultura | P3 | — | — | — | — |
| KH-P3-AYC-GEN-003 | Instrumentos musicales | arte-cultura | P3 | — | — | — | — |
| KH-P3-AYC-GEN-004 | Teatro de personajes | arte-cultura | P3 | — | — | — | — |
| KH-P3-AYC-GEN-005 | Patrimonio local | arte-cultura | P3 | — | — | — | — |
| KH-P3-CSL-GEN-001 | Narración de experiencias | castellano-segunda-lengua | P3 | — | — | — | — |
| KH-P3-CSL-GEN-002 | Comprensión de párrafos | castellano-segunda-lengua | P3 | — | — | — | — |
| KH-P3-CSL-GEN-003 | Escritura guiada | castellano-segunda-lengua | P3 | — | — | — | — |
| KH-P3-CSL-GEN-004 | Vocabulario escolar | castellano-segunda-lengua | P3 | — | — | — | — |
| KH-P3-EFI-GEN-001 | Coordinación dinámica | educacion-fisica | P3 | — | — | — | — |
| KH-P3-EFI-GEN-002 | Juegos predeportivos | educacion-fisica | P3 | — | — | — | — |
| KH-P3-EFI-GEN-003 | Resistencia lúdica | educacion-fisica | P3 | — | — | — | — |
| KH-P3-EFI-GEN-004 | Trabajo en equipo | educacion-fisica | P3 | — | — | — | — |
| KH-P3-EFI-GEN-005 | Autocuidado | educacion-fisica | P3 | — | — | — | — |
| KH-P3-ENG-GEN-001 | School subjects | ingles | P3 | — | — | — | — |
| KH-P3-ENG-GEN-002 | Food and drinks | ingles | P3 | — | — | — | — |
| KH-P3-ENG-GEN-003 | Likes and dislikes | ingles | P3 | — | — | — | — |
| KH-P3-ENG-GEN-004 | Present simple introduction | ingles | P3 | — | — | — | — |
| KH-P3-ENG-GEN-005 | Short descriptions | ingles | P3 | — | — | — | — |
| KH-P3-ENG-GEN-006 | Telling the time | ingles | P3 | — | — | — | — |
| KH-P3-PS-CIV-001 | Normas democráticas | personal-social | P3 | — | — | — | — |
| KH-P3-PS-CIV-002 | Resolución de conflictos | personal-social | P3 | — | — | — | — |
| KH-P3-PS-CIV-003 | Participación escolar | personal-social | P3 | — | — | — | — |
| KH-P3-PS-ECO-001 | Bienes y servicios | personal-social | P3 | — | — | — | — |
| KH-P3-PS-ECO-002 | Consumo responsable | personal-social | P3 | — | — | — | — |
| KH-P3-PS-GEO-001 | Regiones naturales | personal-social | P3 | — | — | — | — |
| KH-P3-PS-GEO-002 | Mapas básicos | personal-social | P3 | — | — | — | — |
| KH-P3-PS-GEO-003 | Elementos del paisaje | personal-social | P3 | — | — | — | — |
| KH-P3-PS-HIS-001 | Fuentes históricas | personal-social | P3 | — | — | — | — |
| KH-P3-PS-HIS-002 | Primeras sociedades del Perú | personal-social | P3 | — | — | — | — |
| KH-P3-PS-HIS-003 | Líneas del tiempo | personal-social | P3 | — | — | — | — |
| KH-P3-PS-IDE-001 | Autoconocimiento | personal-social | P3 | — | — | — | — |
| KH-P3-PS-IDE-002 | Respeto a la diversidad | personal-social | P3 | — | — | — | — |
| KH-P3-PS-IDE-003 | Identidad cultural | personal-social | P3 | — | — | — | — |
| KH-P3-REL-GEN-001 | Dignidad humana | educacion-religiosa | P3 | — | — | — | — |
| KH-P3-REL-GEN-002 | Servicio a la comunidad | educacion-religiosa | P3 | — | — | — | — |
| KH-P3-REL-GEN-003 | Relatos religiosos | educacion-religiosa | P3 | — | — | — | — |
| KH-P3-REL-GEN-004 | Convivencia pacífica | educacion-religiosa | P3 | — | — | — | — |
| KH-P4-AYC-GEN-001 | Perspectiva inicial | arte-cultura | P4 | — | — | — | — |
| KH-P4-AYC-GEN-002 | Patrimonio artístico local | arte-cultura | P4 | — | — | — | — |
| KH-P4-AYC-GEN-003 | Ritmos peruanos | arte-cultura | P4 | — | — | — | — |
| KH-P4-AYC-GEN-004 | Creación escénica | arte-cultura | P4 | — | — | — | — |
| KH-P4-AYC-GEN-005 | Composición visual | arte-cultura | P4 | — | — | — | — |
| KH-P4-CSL-GEN-001 | Exposición breve | castellano-segunda-lengua | P4 | — | — | — | — |
| KH-P4-CSL-GEN-002 | Lectura informativa | castellano-segunda-lengua | P4 | — | — | — | — |
| KH-P4-CSL-GEN-003 | Producción de párrafos | castellano-segunda-lengua | P4 | — | — | — | — |
| KH-P4-CSL-GEN-004 | Vocabulario académico inicial | castellano-segunda-lengua | P4 | — | — | — | — |
| KH-P4-EFI-GEN-001 | Habilidades deportivas básicas | educacion-fisica | P4 | — | — | — | — |
| KH-P4-EFI-GEN-002 | Orientación espacial | educacion-fisica | P4 | — | — | — | — |
| KH-P4-EFI-GEN-003 | Capacidades físicas | educacion-fisica | P4 | — | — | — | — |
| KH-P4-EFI-GEN-004 | Juegos estratégicos | educacion-fisica | P4 | — | — | — | — |
| KH-P4-EFI-GEN-005 | Cooperación | educacion-fisica | P4 | — | — | — | — |
| KH-P4-ENG-GEN-001 | Daily activities | ingles | P4 | — | — | — | — |
| KH-P4-ENG-GEN-002 | Present simple | ingles | P4 | — | — | — | — |
| KH-P4-ENG-GEN-003 | Places in town | ingles | P4 | — | — | — | — |
| KH-P4-ENG-GEN-004 | Time expressions | ingles | P4 | — | — | — | — |
| KH-P4-ENG-GEN-005 | Reading short messages | ingles | P4 | — | — | — | — |
| KH-P4-ENG-GEN-006 | Making invitations | ingles | P4 | — | — | — | — |
| KH-P4-PS-CIV-001 | Derechos de la niñez | personal-social | P4 | — | — | — | — |
| KH-P4-PS-CIV-002 | Participación ciudadana | personal-social | P4 | — | — | — | — |
| KH-P4-PS-CIV-003 | Acuerdos comunitarios | personal-social | P4 | — | — | — | — |
| KH-P4-PS-ECO-001 | Ahorro y consumo responsable | personal-social | P4 | — | — | — | — |
| KH-P4-PS-ECO-002 | Actividades económicas | personal-social | P4 | — | — | — | — |
| KH-P4-PS-GEO-001 | Relieve del Perú | personal-social | P4 | — | — | — | — |
| KH-P4-PS-GEO-002 | Regiones y recursos | personal-social | P4 | — | — | — | — |
| KH-P4-PS-GEO-003 | Lectura de mapas | personal-social | P4 | — | — | — | — |
| KH-P4-PS-HIS-001 | Culturas prehispánicas | personal-social | P4 | — | — | — | — |
| KH-P4-PS-HIS-002 | Línea de tiempo histórica | personal-social | P4 | — | — | — | — |
| KH-P4-PS-HIS-003 | Fuentes históricas | personal-social | P4 | — | — | — | — |
| KH-P4-PS-IDE-001 | Cambios personales | personal-social | P4 | — | — | — | — |
| KH-P4-PS-IDE-002 | Identidad cultural | personal-social | P4 | — | — | — | — |
| KH-P4-PS-IDE-003 | Autorregulación | personal-social | P4 | — | — | — | — |
| KH-P4-REL-GEN-001 | Convivencia y respeto | educacion-religiosa | P4 | — | — | — | — |
| KH-P4-REL-GEN-002 | Tradiciones religiosas del Perú | educacion-religiosa | P4 | — | — | — | — |
| KH-P4-REL-GEN-003 | Compromiso comunitario | educacion-religiosa | P4 | — | — | — | — |
| KH-P4-REL-GEN-004 | Solidaridad | educacion-religiosa | P4 | — | — | — | — |
| KH-P5-AYC-GEN-001 | Arte prehispánico | arte-cultura | P5 | — | — | — | — |
| KH-P5-AYC-GEN-002 | Composición y proporción | arte-cultura | P5 | — | — | — | — |
| KH-P5-AYC-GEN-003 | Música tradicional | arte-cultura | P5 | — | — | — | — |
| KH-P5-AYC-GEN-004 | Proyecto artístico colectivo | arte-cultura | P5 | — | — | — | — |
| KH-P5-AYC-GEN-005 | Análisis de obras | arte-cultura | P5 | — | — | — | — |
| KH-P5-CSL-GEN-001 | Comprensión inferencial | castellano-segunda-lengua | P5 | — | — | — | — |
| KH-P5-CSL-GEN-002 | Textos descriptivos | castellano-segunda-lengua | P5 | — | — | — | — |
| KH-P5-CSL-GEN-003 | Presentaciones organizadas | castellano-segunda-lengua | P5 | — | — | — | — |
| KH-P5-CSL-GEN-004 | Producción escrita autónoma | castellano-segunda-lengua | P5 | — | — | — | — |
| KH-P5-EFI-GEN-001 | Deportes colectivos | educacion-fisica | P5 | — | — | — | — |
| KH-P5-EFI-GEN-002 | Coordinación avanzada | educacion-fisica | P5 | — | — | — | — |
| KH-P5-EFI-GEN-003 | Hábitos saludables | educacion-fisica | P5 | — | — | — | — |
| KH-P5-EFI-GEN-004 | Cooperación | educacion-fisica | P5 | — | — | — | — |
| KH-P5-EFI-GEN-005 | Juego limpio | educacion-fisica | P5 | — | — | — | — |
| KH-P5-ENG-GEN-001 | Present continuous | ingles | P5 | — | — | — | — |
| KH-P5-ENG-GEN-002 | Past simple introduction | ingles | P5 | — | — | — | — |
| KH-P5-ENG-GEN-003 | Comparatives | ingles | P5 | — | — | — | — |
| KH-P5-ENG-GEN-004 | Descriptions of places | ingles | P5 | — | — | — | — |
| KH-P5-ENG-GEN-005 | Short narratives | ingles | P5 | — | — | — | — |
| KH-P5-ENG-GEN-006 | Giving directions | ingles | P5 | — | — | — | — |
| KH-P5-PS-CIV-001 | Democracia escolar | personal-social | P5 | — | — | — | — |
| KH-P5-PS-CIV-002 | Derechos humanos | personal-social | P5 | — | — | — | — |
| KH-P5-PS-CIV-003 | Resolución de conflictos | personal-social | P5 | — | — | — | — |
| KH-P5-PS-ECO-001 | Presupuesto personal | personal-social | P5 | — | — | — | — |
| KH-P5-PS-ECO-002 | Actividades económicas | personal-social | P5 | — | — | — | — |
| KH-P5-PS-ECO-003 | Ahorro | personal-social | P5 | — | — | — | — |
| KH-P5-PS-GEO-001 | Cuencas del Perú | personal-social | P5 | — | — | — | — |
| KH-P5-PS-GEO-002 | Recursos del Perú | personal-social | P5 | — | — | — | — |
| KH-P5-PS-GEO-003 | Problemas ambientales | personal-social | P5 | — | — | — | — |
| KH-P5-PS-HIS-001 | Tahuantinsuyo | personal-social | P5 | — | — | — | — |
| KH-P5-PS-HIS-002 | Encuentro de sociedades | personal-social | P5 | — | — | — | — |
| KH-P5-PS-HIS-003 | Fuentes históricas | personal-social | P5 | — | — | — | — |
| KH-P5-PS-HIS-004 | Cronología histórica | personal-social | P5 | — | — | — | — |
| KH-P5-PS-IDE-001 | Identidad y pertenencia | personal-social | P5 | — | — | — | — |
| KH-P5-PS-IDE-002 | Diversidad cultural | personal-social | P5 | — | — | — | — |
| KH-P5-PS-IDE-003 | Cambios personales | personal-social | P5 | — | — | — | — |
| KH-P5-REL-GEN-001 | Libertad y responsabilidad | educacion-religiosa | P5 | — | — | — | — |
| KH-P5-REL-GEN-002 | Diálogo interreligioso | educacion-religiosa | P5 | — | — | — | — |
| KH-P5-REL-GEN-003 | Solidaridad organizada | educacion-religiosa | P5 | — | — | — | — |
| KH-P5-REL-GEN-004 | Compromiso ético | educacion-religiosa | P5 | — | — | — | — |
| KH-P6-AYC-GEN-001 | Patrimonio cultural peruano | arte-cultura | P6 | — | — | — | — |
| KH-P6-AYC-GEN-002 | Análisis de obras | arte-cultura | P6 | — | — | — | — |
| KH-P6-AYC-GEN-003 | Creación audiovisual inicial | arte-cultura | P6 | — | — | — | — |
| KH-P6-AYC-GEN-004 | Proyecto artístico | arte-cultura | P6 | — | — | — | — |
| KH-P6-AYC-GEN-005 | Música y sociedad | arte-cultura | P6 | — | — | — | — |
| KH-P6-CSL-GEN-001 | Textos argumentativos breves | castellano-segunda-lengua | P6 | — | — | — | — |
| KH-P6-CSL-GEN-002 | Comunicación formal | castellano-segunda-lengua | P6 | — | — | — | — |
| KH-P6-CSL-GEN-003 | Escritura autónoma | castellano-segunda-lengua | P6 | — | — | — | — |
| KH-P6-CSL-GEN-004 | Presentación oral | castellano-segunda-lengua | P6 | — | — | — | — |
| KH-P6-EFI-GEN-001 | Condición física | educacion-fisica | P6 | — | — | — | — |
| KH-P6-EFI-GEN-002 | Deportes y estrategia | educacion-fisica | P6 | — | — | — | — |
| KH-P6-EFI-GEN-003 | Autocuidado | educacion-fisica | P6 | — | — | — | — |
| KH-P6-EFI-GEN-004 | Convivencia deportiva | educacion-fisica | P6 | — | — | — | — |
| KH-P6-EFI-GEN-005 | Evaluación personal | educacion-fisica | P6 | — | — | — | — |
| KH-P6-ENG-GEN-001 | Past simple | ingles | P6 | — | — | — | — |
| KH-P6-ENG-GEN-002 | Future plans | ingles | P6 | — | — | — | — |
| KH-P6-ENG-GEN-003 | Modal verbs introduction | ingles | P6 | — | — | — | — |
| KH-P6-ENG-GEN-004 | Reading short stories | ingles | P6 | — | — | — | — |
| KH-P6-ENG-GEN-005 | Writing short paragraphs | ingles | P6 | — | — | — | — |
| KH-P6-ENG-GEN-006 | Interviews | ingles | P6 | — | — | — | — |
| KH-P6-PS-CIV-001 | Instituciones democráticas | personal-social | P6 | — | — | — | — |
| KH-P6-PS-CIV-002 | Constitución introductoria | personal-social | P6 | — | — | — | — |
| KH-P6-PS-CIV-003 | Participación y ciudadanía | personal-social | P6 | — | — | — | — |
| KH-P6-PS-ECO-001 | Impuestos introductorios | personal-social | P6 | — | — | — | — |
| KH-P6-PS-ECO-002 | Consumo responsable | personal-social | P6 | — | — | — | — |
| KH-P6-PS-ECO-003 | Sistema financiero inicial | personal-social | P6 | — | — | — | — |
| KH-P6-PS-GEO-001 | Organización territorial | personal-social | P6 | — | — | — | — |
| KH-P6-PS-GEO-002 | Problemas ambientales | personal-social | P6 | — | — | — | — |
| KH-P6-PS-GEO-003 | Gestión de riesgos | personal-social | P6 | — | — | — | — |
| KH-P6-PS-HIS-001 | Virreinato | personal-social | P6 | — | — | — | — |
| KH-P6-PS-HIS-002 | Independencia del Perú | personal-social | P6 | — | — | — | — |
| KH-P6-PS-HIS-003 | República inicial | personal-social | P6 | — | — | — | — |
| KH-P6-PS-IDE-001 | Proyecto personal | personal-social | P6 | — | — | — | — |
| KH-P6-PS-IDE-002 | Diversidad e inclusión | personal-social | P6 | — | — | — | — |
| KH-P6-PS-IDE-003 | Autonomía | personal-social | P6 | — | — | — | — |
| KH-P6-REL-GEN-001 | Decisiones éticas | educacion-religiosa | P6 | — | — | — | — |
| KH-P6-REL-GEN-002 | Respeto a creencias | educacion-religiosa | P6 | — | — | — | — |
| KH-P6-REL-GEN-003 | Proyecto de vida y servicio | educacion-religiosa | P6 | — | — | — | — |
| KH-P6-REL-GEN-004 | Diálogo y convivencia | educacion-religiosa | P6 | — | — | — | — |
| KH-S1-AYC-GEN-001 | Elementos visuales | arte-cultura | S1 | — | — | — | — |
| KH-S1-AYC-GEN-002 | Música y ritmo | arte-cultura | S1 | — | — | — | — |
| KH-S1-AYC-GEN-003 | Teatro | arte-cultura | S1 | — | — | — | — |
| KH-S1-AYC-GEN-004 | Apreciación cultural | arte-cultura | S1 | — | — | — | — |
| KH-S1-AYC-GEN-005 | Creación artística | arte-cultura | S1 | — | — | — | — |
| KH-S1-CCS-ECO-001 | Necesidades y recursos | ciencias-sociales | S1 | — | — | — | — |
| KH-S1-CCS-ECO-002 | Agentes económicos | ciencias-sociales | S1 | — | — | — | — |
| KH-S1-CCS-ECO-003 | Ahorro | ciencias-sociales | S1 | — | — | — | — |
| KH-S1-CCS-ECO-004 | Actividades económicas | ciencias-sociales | S1 | — | — | — | — |
| KH-S1-CCS-GEO-001 | Representación cartográfica | ciencias-sociales | S1 | — | — | — | — |
| KH-S1-CCS-GEO-002 | Espacio geográfico | ciencias-sociales | S1 | — | — | — | — |
| KH-S1-CCS-GEO-003 | Ambientes del Perú | ciencias-sociales | S1 | — | — | — | — |
| KH-S1-CCS-GEO-004 | Población | ciencias-sociales | S1 | — | — | — | — |
| KH-S1-CCS-HIS-001 | Primeras civilizaciones | ciencias-sociales | S1 | — | — | — | — |
| KH-S1-CCS-HIS-002 | Civilizaciones antiguas | ciencias-sociales | S1 | — | — | — | — |
| KH-S1-CCS-HIS-003 | Sociedades andinas tempranas | ciencias-sociales | S1 | — | — | — | — |
| KH-S1-CCS-HIS-004 | Fuentes históricas | ciencias-sociales | S1 | — | — | — | — |
| KH-S1-CSL-GEN-001 | Comprensión oral académica | castellano-segunda-lengua | S1 | — | — | — | — |
| KH-S1-CSL-GEN-002 | Lectura guiada | castellano-segunda-lengua | S1 | — | — | — | — |
| KH-S1-CSL-GEN-003 | Producción de textos breves | castellano-segunda-lengua | S1 | — | — | — | — |
| KH-S1-CSL-GEN-004 | Vocabulario académico | castellano-segunda-lengua | S1 | — | — | — | — |
| KH-S1-DPC-CIV-001 | Normas y convivencia | dpcc | S1 | — | — | — | — |
| KH-S1-DPC-CIV-002 | Derechos y deberes | dpcc | S1 | — | — | — | — |
| KH-S1-DPC-CIV-003 | Resolución pacífica de conflictos | dpcc | S1 | — | — | — | — |
| KH-S1-DPC-CIV-004 | Participación escolar | dpcc | S1 | — | — | — | — |
| KH-S1-DPC-IDE-001 | Identidad adolescente | dpcc | S1 | — | — | — | — |
| KH-S1-DPC-IDE-002 | Autoconocimiento | dpcc | S1 | — | — | — | — |
| KH-S1-DPC-IDE-003 | Emociones | dpcc | S1 | — | — | — | — |
| KH-S1-DPC-IDE-004 | Cambios personales | dpcc | S1 | — | — | — | — |
| KH-S1-EFI-GEN-001 | Capacidades físicas | educacion-fisica | S1 | — | — | — | — |
| KH-S1-EFI-GEN-002 | Coordinación | educacion-fisica | S1 | — | — | — | — |
| KH-S1-EFI-GEN-003 | Deportes colectivos | educacion-fisica | S1 | — | — | — | — |
| KH-S1-EFI-GEN-004 | Salud corporal | educacion-fisica | S1 | — | — | — | — |
| KH-S1-EFI-GEN-005 | Convivencia deportiva | educacion-fisica | S1 | — | — | — | — |
| KH-S1-ENG-GEN-001 | Present simple | ingles | S1 | — | — | — | — |
| KH-S1-ENG-GEN-002 | Present continuous | ingles | S1 | — | — | — | — |
| KH-S1-ENG-GEN-003 | Personal information | ingles | S1 | — | — | — | — |
| KH-S1-ENG-GEN-004 | Daily routines | ingles | S1 | — | — | — | — |
| KH-S1-ENG-GEN-005 | Reading descriptions | ingles | S1 | — | — | — | — |
| KH-S1-ENG-GEN-006 | Writing paragraphs | ingles | S1 | — | — | — | — |
| KH-S1-EPT-GEN-001 | Identificación de necesidades | ept | S1 | — | — | — | — |
| KH-S1-EPT-GEN-002 | Ideas de solución | ept | S1 | — | — | — | — |
| KH-S1-EPT-GEN-003 | Trabajo colaborativo | ept | S1 | — | — | — | — |
| KH-S1-EPT-GEN-004 | Prototipo inicial | ept | S1 | — | — | — | — |
| KH-S1-EPT-GEN-005 | Presentación de proyectos | ept | S1 | — | — | — | — |
| KH-S1-EPT-GEN-006 | Evaluación de necesidades | ept | S1 | — | — | — | — |
| KH-S1-REL-GEN-001 | Identidad y espiritualidad | educacion-religiosa | S1 | — | — | — | — |
| KH-S1-REL-GEN-002 | Dignidad de la persona | educacion-religiosa | S1 | — | — | — | — |
| KH-S1-REL-GEN-003 | Diálogo respetuoso | educacion-religiosa | S1 | — | — | — | — |
| KH-S1-REL-GEN-004 | Acción solidaria | educacion-religiosa | S1 | — | — | — | — |
| KH-S2-AYC-GEN-001 | Lenguaje audiovisual | arte-cultura | S2 | — | — | — | — |
| KH-S2-AYC-GEN-002 | Patrimonio artístico | arte-cultura | S2 | — | — | — | — |
| KH-S2-AYC-GEN-003 | Creación musical | arte-cultura | S2 | — | — | — | — |
| KH-S2-AYC-GEN-004 | Representación teatral | arte-cultura | S2 | — | — | — | — |
| KH-S2-AYC-GEN-005 | Crítica artística | arte-cultura | S2 | — | — | — | — |
| KH-S2-CCS-ECO-001 | Mercados | ciencias-sociales | S2 | — | — | — | — |
| KH-S2-CCS-ECO-002 | Oferta y demanda introductoria | ciencias-sociales | S2 | — | — | — | — |
| KH-S2-CCS-ECO-003 | Decisiones económicas | ciencias-sociales | S2 | — | — | — | — |
| KH-S2-CCS-ECO-004 | Sistema financiero inicial | ciencias-sociales | S2 | — | — | — | — |
| KH-S2-CCS-GEO-001 | Climas | ciencias-sociales | S2 | — | — | — | — |
| KH-S2-CCS-GEO-002 | Población y migración | ciencias-sociales | S2 | — | — | — | — |
| KH-S2-CCS-GEO-003 | Gestión del territorio | ciencias-sociales | S2 | — | — | — | — |
| KH-S2-CCS-GEO-004 | Problemas ambientales | ciencias-sociales | S2 | — | — | — | — |
| KH-S2-CCS-HIS-001 | Sociedades medievales | ciencias-sociales | S2 | — | — | — | — |
| KH-S2-CCS-HIS-002 | Sociedades andinas | ciencias-sociales | S2 | — | — | — | — |
| KH-S2-CCS-HIS-003 | Expansiones e intercambios históricos | ciencias-sociales | S2 | — | — | — | — |
| KH-S2-CCS-HIS-004 | Interpretación de fuentes | ciencias-sociales | S2 | — | — | — | — |
| KH-S2-CSL-GEN-001 | Exposición académica | castellano-segunda-lengua | S2 | — | — | — | — |
| KH-S2-CSL-GEN-002 | Lectura inferencial | castellano-segunda-lengua | S2 | — | — | — | — |
| KH-S2-CSL-GEN-003 | Textos explicativos | castellano-segunda-lengua | S2 | — | — | — | — |
| KH-S2-CSL-GEN-004 | Discusión guiada | castellano-segunda-lengua | S2 | — | — | — | — |
| KH-S2-DPC-CIV-001 | Participación democrática | dpcc | S2 | — | — | — | — |
| KH-S2-DPC-CIV-002 | Derechos humanos | dpcc | S2 | — | — | — | — |
| KH-S2-DPC-CIV-003 | Diversidad cultural | dpcc | S2 | — | — | — | — |
| KH-S2-DPC-CIV-004 | Prevención de violencia | dpcc | S2 | — | — | — | — |
| KH-S2-DPC-IDE-001 | Autoestima y autonomía | dpcc | S2 | — | — | — | — |
| KH-S2-DPC-IDE-002 | Relaciones saludables | dpcc | S2 | — | — | — | — |
| KH-S2-DPC-IDE-003 | Manejo de conflictos | dpcc | S2 | — | — | — | — |
| KH-S2-DPC-IDE-004 | Identidad cultural | dpcc | S2 | — | — | — | — |
| KH-S2-EFI-GEN-001 | Resistencia y fuerza | educacion-fisica | S2 | — | — | — | — |
| KH-S2-EFI-GEN-002 | Estrategias deportivas | educacion-fisica | S2 | — | — | — | — |
| KH-S2-EFI-GEN-003 | Alimentación saludable | educacion-fisica | S2 | — | — | — | — |
| KH-S2-EFI-GEN-004 | Juego limpio | educacion-fisica | S2 | — | — | — | — |
| KH-S2-EFI-GEN-005 | Autocuidado | educacion-fisica | S2 | — | — | — | — |
| KH-S2-ENG-GEN-001 | Past simple | ingles | S2 | — | — | — | — |
| KH-S2-ENG-GEN-002 | Past continuous introduction | ingles | S2 | — | — | — | — |
| KH-S2-ENG-GEN-003 | Comparatives | ingles | S2 | — | — | — | — |
| KH-S2-ENG-GEN-004 | Narrative texts | ingles | S2 | — | — | — | — |
| KH-S2-ENG-GEN-005 | Giving opinions | ingles | S2 | — | — | — | — |
| KH-S2-ENG-GEN-006 | Writing stories | ingles | S2 | — | — | — | — |
| KH-S2-EPT-GEN-001 | Investigación de usuarios | ept | S2 | — | — | — | — |
| KH-S2-EPT-GEN-002 | Propuesta de valor | ept | S2 | — | — | — | — |
| KH-S2-EPT-GEN-003 | Diseño de prototipos | ept | S2 | — | — | — | — |
| KH-S2-EPT-GEN-004 | Costos iniciales | ept | S2 | — | — | — | — |
| KH-S2-EPT-GEN-005 | Evaluación de soluciones | ept | S2 | — | — | — | — |
| KH-S2-EPT-GEN-006 | Presentación de proyectos | ept | S2 | — | — | — | — |
| KH-S2-REL-GEN-001 | Conciencia ética | educacion-religiosa | S2 | — | — | — | — |
| KH-S2-REL-GEN-002 | Tradiciones religiosas | educacion-religiosa | S2 | — | — | — | — |
| KH-S2-REL-GEN-003 | Servicio y comunidad | educacion-religiosa | S2 | — | — | — | — |
| KH-S2-REL-GEN-004 | Diálogo intercultural | educacion-religiosa | S2 | — | — | — | — |
| KH-S3-AYC-GEN-001 | Historia del arte | arte-cultura | S3 | — | — | — | — |
| KH-S3-AYC-GEN-002 | Fotografía | arte-cultura | S3 | — | — | — | — |
| KH-S3-AYC-GEN-003 | Creación audiovisual | arte-cultura | S3 | — | — | — | — |
| KH-S3-AYC-GEN-004 | Crítica artística | arte-cultura | S3 | — | — | — | — |
| KH-S3-AYC-GEN-005 | Proyecto artístico | arte-cultura | S3 | — | — | — | — |
| KH-S3-CCS-ECO-001 | Sistema financiero | ciencias-sociales | S3 | — | — | — | — |
| KH-S3-CCS-ECO-002 | Inflación introductoria | ciencias-sociales | S3 | — | — | — | — |
| KH-S3-CCS-ECO-003 | Consumo y ahorro | ciencias-sociales | S3 | — | — | — | — |
| KH-S3-CCS-ECO-004 | Decisiones económicas | ciencias-sociales | S3 | — | — | — | — |
| KH-S3-CCS-GEO-001 | Dinámicas poblacionales | ciencias-sociales | S3 | — | — | — | — |
| KH-S3-CCS-GEO-002 | Problemas ambientales | ciencias-sociales | S3 | — | — | — | — |
| KH-S3-CCS-GEO-003 | Gestión de riesgos | ciencias-sociales | S3 | — | — | — | — |
| KH-S3-CCS-GEO-004 | Territorio y sociedad | ciencias-sociales | S3 | — | — | — | — |
| KH-S3-CCS-HIS-001 | Expansión europea | ciencias-sociales | S3 | — | — | — | — |
| KH-S3-CCS-HIS-002 | Conquista y colonización | ciencias-sociales | S3 | — | — | — | — |
| KH-S3-CCS-HIS-003 | Virreinato peruano | ciencias-sociales | S3 | — | — | — | — |
| KH-S3-CCS-HIS-004 | Cambios históricos | ciencias-sociales | S3 | — | — | — | — |
| KH-S3-CSL-GEN-001 | Textos argumentativos | castellano-segunda-lengua | S3 | — | — | — | — |
| KH-S3-CSL-GEN-002 | Debates guiados | castellano-segunda-lengua | S3 | — | — | — | — |
| KH-S3-CSL-GEN-003 | Escritura académica | castellano-segunda-lengua | S3 | — | — | — | — |
| KH-S3-CSL-GEN-004 | Lectura crítica | castellano-segunda-lengua | S3 | — | — | — | — |
| KH-S3-DPC-CIV-001 | Estado de derecho | dpcc | S3 | — | — | — | — |
| KH-S3-DPC-CIV-002 | Participación ciudadana | dpcc | S3 | — | — | — | — |
| KH-S3-DPC-CIV-003 | Convivencia democrática | dpcc | S3 | — | — | — | — |
| KH-S3-DPC-CIV-004 | Derechos fundamentales | dpcc | S3 | — | — | — | — |
| KH-S3-DPC-IDE-001 | Identidad y autonomía | dpcc | S3 | — | — | — | — |
| KH-S3-DPC-IDE-002 | Afectividad | dpcc | S3 | — | — | — | — |
| KH-S3-DPC-IDE-003 | Decisiones responsables | dpcc | S3 | — | — | — | — |
| KH-S3-DPC-IDE-004 | Proyecto personal | dpcc | S3 | — | — | — | — |
| KH-S3-EFI-GEN-001 | Entrenamiento físico | educacion-fisica | S3 | — | — | — | — |
| KH-S3-EFI-GEN-002 | Táctica deportiva | educacion-fisica | S3 | — | — | — | — |
| KH-S3-EFI-GEN-003 | Prevención de lesiones | educacion-fisica | S3 | — | — | — | — |
| KH-S3-EFI-GEN-004 | Actividad física y bienestar | educacion-fisica | S3 | — | — | — | — |
| KH-S3-EFI-GEN-005 | Trabajo en equipo | educacion-fisica | S3 | — | — | — | — |
| KH-S3-ENG-GEN-001 | Present perfect introduction | ingles | S3 | — | — | — | — |
| KH-S3-ENG-GEN-002 | Future forms | ingles | S3 | — | — | — | — |
| KH-S3-ENG-GEN-003 | Conditionals introduction | ingles | S3 | — | — | — | — |
| KH-S3-ENG-GEN-004 | Reading articles | ingles | S3 | — | — | — | — |
| KH-S3-ENG-GEN-005 | Opinion writing | ingles | S3 | — | — | — | — |
| KH-S3-ENG-GEN-006 | Oral presentations | ingles | S3 | — | — | — | — |
| KH-S3-EPT-GEN-001 | Modelo de negocio | ept | S3 | — | — | — | — |
| KH-S3-EPT-GEN-002 | Investigación de mercado | ept | S3 | — | — | — | — |
| KH-S3-EPT-GEN-003 | Presupuesto | ept | S3 | — | — | — | — |
| KH-S3-EPT-GEN-004 | Marketing básico | ept | S3 | — | — | — | — |
| KH-S3-EPT-GEN-005 | Validación de prototipos | ept | S3 | — | — | — | — |
| KH-S3-EPT-GEN-006 | Trabajo colaborativo | ept | S3 | — | — | — | — |
| KH-S3-REL-GEN-001 | Libertad y responsabilidad | educacion-religiosa | S3 | — | — | — | — |
| KH-S3-REL-GEN-002 | Ética social | educacion-religiosa | S3 | — | — | — | — |
| KH-S3-REL-GEN-003 | Diálogo entre creencias | educacion-religiosa | S3 | — | — | — | — |
| KH-S3-REL-GEN-004 | Servicio comunitario | educacion-religiosa | S3 | — | — | — | — |
| KH-S4-AYC-GEN-001 | Arte contemporáneo | arte-cultura | S4 | — | — | — | — |
| KH-S4-AYC-GEN-002 | Producción multimedia | arte-cultura | S4 | — | — | — | — |
| KH-S4-AYC-GEN-003 | Gestión de proyectos artísticos | arte-cultura | S4 | — | — | — | — |
| KH-S4-AYC-GEN-004 | Análisis cultural | arte-cultura | S4 | — | — | — | — |
| KH-S4-AYC-GEN-005 | Creación colectiva | arte-cultura | S4 | — | — | — | — |
| KH-S4-CCS-ECO-001 | Política económica introductoria | ciencias-sociales | S4 | — | — | — | — |
| KH-S4-CCS-ECO-002 | Tributación | ciencias-sociales | S4 | — | — | — | — |
| KH-S4-CCS-ECO-003 | Comercio internacional | ciencias-sociales | S4 | — | — | — | — |
| KH-S4-CCS-ECO-004 | Finanzas personales | ciencias-sociales | S4 | — | — | — | — |
| KH-S4-CCS-GEO-001 | Ordenamiento territorial | ciencias-sociales | S4 | — | — | — | — |
| KH-S4-CCS-GEO-002 | Conflictos socioambientales | ciencias-sociales | S4 | — | — | — | — |
| KH-S4-CCS-GEO-003 | Recursos estratégicos | ciencias-sociales | S4 | — | — | — | — |
| KH-S4-CCS-GEO-004 | Dinámica territorial | ciencias-sociales | S4 | — | — | — | — |
| KH-S4-CCS-HIS-001 | Independencia del Perú | ciencias-sociales | S4 | — | — | — | — |
| KH-S4-CCS-HIS-002 | Formación republicana | ciencias-sociales | S4 | — | — | — | — |
| KH-S4-CCS-HIS-003 | Transformaciones del siglo XIX | ciencias-sociales | S4 | — | — | — | — |
| KH-S4-CCS-HIS-004 | Conflictos y cambios | ciencias-sociales | S4 | — | — | — | — |
| KH-S4-CSL-GEN-001 | Lectura crítica | castellano-segunda-lengua | S4 | — | — | — | — |
| KH-S4-CSL-GEN-002 | Ensayos guiados | castellano-segunda-lengua | S4 | — | — | — | — |
| KH-S4-CSL-GEN-003 | Presentaciones formales | castellano-segunda-lengua | S4 | — | — | — | — |
| KH-S4-CSL-GEN-004 | Debates académicos | castellano-segunda-lengua | S4 | — | — | — | — |
| KH-S4-DPC-CIV-001 | Instituciones del Estado | dpcc | S4 | — | — | — | — |
| KH-S4-DPC-CIV-002 | Democracia y representación | dpcc | S4 | — | — | — | — |
| KH-S4-DPC-CIV-003 | Participación política responsable | dpcc | S4 | — | — | — | — |
| KH-S4-DPC-CIV-004 | Derechos y deberes | dpcc | S4 | — | — | — | — |
| KH-S4-DPC-IDE-001 | Proyecto de vida | dpcc | S4 | — | — | — | — |
| KH-S4-DPC-IDE-002 | Relaciones responsables | dpcc | S4 | — | — | — | — |
| KH-S4-DPC-IDE-003 | Ética personal | dpcc | S4 | — | — | — | — |
| KH-S4-DPC-IDE-004 | Toma de decisiones | dpcc | S4 | — | — | — | — |
| KH-S4-EFI-GEN-001 | Plan de entrenamiento | educacion-fisica | S4 | — | — | — | — |
| KH-S4-EFI-GEN-002 | Deportes especializados | educacion-fisica | S4 | — | — | — | — |
| KH-S4-EFI-GEN-003 | Nutrición y rendimiento | educacion-fisica | S4 | — | — | — | — |
| KH-S4-EFI-GEN-004 | Liderazgo deportivo | educacion-fisica | S4 | — | — | — | — |
| KH-S4-EFI-GEN-005 | Salud física | educacion-fisica | S4 | — | — | — | — |
| KH-S4-ENG-GEN-001 | Present perfect | ingles | S4 | — | — | — | — |
| KH-S4-ENG-GEN-002 | Passive voice introduction | ingles | S4 | — | — | — | — |
| KH-S4-ENG-GEN-003 | Reported speech introduction | ingles | S4 | — | — | — | — |
| KH-S4-ENG-GEN-004 | Argumentative reading | ingles | S4 | — | — | — | — |
| KH-S4-ENG-GEN-005 | Formal writing | ingles | S4 | — | — | — | — |
| KH-S4-ENG-GEN-006 | Debate | ingles | S4 | — | — | — | — |
| KH-S4-EPT-GEN-001 | Plan de negocios | ept | S4 | — | — | — | — |
| KH-S4-EPT-GEN-002 | Estrategia comercial | ept | S4 | — | — | — | — |
| KH-S4-EPT-GEN-003 | Costos y precios | ept | S4 | — | — | — | — |
| KH-S4-EPT-GEN-004 | Flujo de caja inicial | ept | S4 | — | — | — | — |
| KH-S4-EPT-GEN-005 | Gestión de equipos | ept | S4 | — | — | — | — |
| KH-S4-EPT-GEN-006 | Prototipado avanzado | ept | S4 | — | — | — | — |
| KH-S4-REL-GEN-001 | Dilemas éticos | educacion-religiosa | S4 | — | — | — | — |
| KH-S4-REL-GEN-002 | Responsabilidad social | educacion-religiosa | S4 | — | — | — | — |
| KH-S4-REL-GEN-003 | Compromiso con la comunidad | educacion-religiosa | S4 | — | — | — | — |
| KH-S4-REL-GEN-004 | Diálogo y tolerancia | educacion-religiosa | S4 | — | — | — | — |
| KH-S5-AYC-GEN-001 | Proyecto artístico final | arte-cultura | S5 | — | — | — | — |
| KH-S5-AYC-GEN-002 | Curaduría básica | arte-cultura | S5 | — | — | — | — |
| KH-S5-AYC-GEN-003 | Crítica cultural | arte-cultura | S5 | — | — | — | — |
| KH-S5-AYC-GEN-004 | Presentación de portafolio | arte-cultura | S5 | — | — | — | — |
| KH-S5-AYC-GEN-005 | Arte y sociedad | arte-cultura | S5 | — | — | — | — |
| KH-S5-CCS-ECO-001 | Economía peruana | ciencias-sociales | S5 | — | — | — | — |
| KH-S5-CCS-ECO-002 | Sistema financiero | ciencias-sociales | S5 | — | — | — | — |
| KH-S5-CCS-ECO-003 | Decisiones económicas informadas | ciencias-sociales | S5 | — | — | — | — |
| KH-S5-CCS-ECO-004 | Mercados internacionales | ciencias-sociales | S5 | — | — | — | — |
| KH-S5-CCS-GEO-001 | Geopolítica | ciencias-sociales | S5 | — | — | — | — |
| KH-S5-CCS-GEO-002 | Desarrollo sostenible | ciencias-sociales | S5 | — | — | — | — |
| KH-S5-CCS-GEO-003 | Dinámicas territoriales | ciencias-sociales | S5 | — | — | — | — |
| KH-S5-CCS-GEO-004 | Riesgos ambientales | ciencias-sociales | S5 | — | — | — | — |
| KH-S5-CCS-HIS-001 | Historia peruana contemporánea | ciencias-sociales | S5 | — | — | — | — |
| KH-S5-CCS-HIS-002 | Conflictos del siglo XX | ciencias-sociales | S5 | — | — | — | — |
| KH-S5-CCS-HIS-003 | Globalización y mundo actual | ciencias-sociales | S5 | — | — | — | — |
| KH-S5-CCS-HIS-004 | Historia reciente del Perú | ciencias-sociales | S5 | — | — | — | — |
| KH-S5-CSL-GEN-001 | Comunicación académica avanzada | castellano-segunda-lengua | S5 | — | — | — | — |
| KH-S5-CSL-GEN-002 | Análisis crítico | castellano-segunda-lengua | S5 | — | — | — | — |
| KH-S5-CSL-GEN-003 | Producción textual autónoma | castellano-segunda-lengua | S5 | — | — | — | — |
| KH-S5-CSL-GEN-004 | Discusión de ideas | castellano-segunda-lengua | S5 | — | — | — | — |
| KH-S5-DPC-CIV-001 | Ciudadanía activa | dpcc | S5 | — | — | — | — |
| KH-S5-DPC-CIV-002 | Derechos fundamentales | dpcc | S5 | — | — | — | — |
| KH-S5-DPC-CIV-003 | Participación democrática | dpcc | S5 | — | — | — | — |
| KH-S5-DPC-CIV-004 | Ética pública | dpcc | S5 | — | — | — | — |
| KH-S5-DPC-CIV-005 | Cultura de paz | dpcc | S5 | — | — | — | — |
| KH-S5-DPC-IDE-001 | Proyecto de vida | dpcc | S5 | — | — | — | — |
| KH-S5-DPC-IDE-002 | Autonomía y responsabilidad | dpcc | S5 | — | — | — | — |
| KH-S5-DPC-IDE-003 | Bienestar personal | dpcc | S5 | — | — | — | — |
| KH-S5-DPC-IDE-004 | Ética personal | dpcc | S5 | — | — | — | — |
| KH-S5-EFI-GEN-001 | Plan personal de actividad física | educacion-fisica | S5 | — | — | — | — |
| KH-S5-EFI-GEN-002 | Prevención de riesgos | educacion-fisica | S5 | — | — | — | — |
| KH-S5-EFI-GEN-003 | Liderazgo deportivo | educacion-fisica | S5 | — | — | — | — |
| KH-S5-EFI-GEN-004 | Vida activa | educacion-fisica | S5 | — | — | — | — |
| KH-S5-EFI-GEN-005 | Evaluación de capacidades físicas | educacion-fisica | S5 | — | — | — | — |
| KH-S5-ENG-GEN-001 | Advanced reading comprehension | ingles | S5 | — | — | — | — |
| KH-S5-ENG-GEN-002 | Complex conditionals | ingles | S5 | — | — | — | — |
| KH-S5-ENG-GEN-003 | Reported speech | ingles | S5 | — | — | — | — |
| KH-S5-ENG-GEN-004 | Academic presentations | ingles | S5 | — | — | — | — |
| KH-S5-ENG-GEN-005 | Argumentative essays | ingles | S5 | — | — | — | — |
| KH-S5-ENG-GEN-006 | Formal communication | ingles | S5 | — | — | — | — |
| KH-S5-EPT-GEN-001 | Emprendimiento integral | ept | S5 | — | — | — | — |
| KH-S5-EPT-GEN-002 | Viabilidad económica | ept | S5 | — | — | — | — |
| KH-S5-EPT-GEN-003 | Marketing digital | ept | S5 | — | — | — | — |
| KH-S5-EPT-GEN-004 | Presentación a inversionistas simulada | ept | S5 | — | — | — | — |
| KH-S5-EPT-GEN-005 | Evaluación del impacto social | ept | S5 | — | — | — | — |
| KH-S5-EPT-GEN-006 | Evaluación de proyectos | ept | S5 | — | — | — | — |
| KH-S5-REL-GEN-001 | Proyecto de vida y trascendencia | educacion-religiosa | S5 | — | — | — | — |
| KH-S5-REL-GEN-002 | Diálogo interreligioso | educacion-religiosa | S5 | — | — | — | — |
| KH-S5-REL-GEN-003 | Compromiso ético | educacion-religiosa | S5 | — | — | — | — |
| KH-S5-REL-GEN-004 | Servicio comunitario | educacion-religiosa | S5 | — | — | — | — |
