# Temario propuesto — Ciencia y Tecnología 2.° de secundaria

**Estado:** propuesta para revisión docente. Son 147 temas distintos; todavía no tienen fichas.

## Criterio de desglose

Cada tema es un contenido concreto que Nudito puede enseñar por texto en una clase o práctica. Segundo de secundaria sigue los desempeños de 2.°: configuración electrónica y salto cuántico, tabla periódica y propiedades periódicas, reflexión, refracción y dispersión de las ondas, calor cuantificado (Q = m · c · ΔT), MRU (distancia, tiempo y velocidad), trabajo y energía con máquinas simples a nivel introductorio, fotosíntesis y respiración, comparación de estructuras de nutrición, reproducción y coordinación en seres unicelulares y pluricelulares (que coincide con las unidades del texto escolar de 2.°), selección natural y artificial, ciclos biogeoquímicos, cambio climático y energías limpias, e historia de la ciencia.

No se repiten con el mismo nombre temas de primaria ni de 1.°, 3.°, 4.° o 5.° de secundaria. El MRUV, las leyes de Newton, las palancas y poleas por separado, la glucólisis y el ciclo de Krebs, y la homeostasis hormonal detallada quedan para 4.° y 5.°. El orden sugerido (1–147) recorre el año en cuatro tramos y respeta los prerrequisitos.

## Fuentes

- [Programa curricular de Educación Secundaria, MINEDU](https://repositorio.minedu.gob.pe/handle/20.500.12799/4550), desempeños del grado de las tres competencias, tomados de la transcripción del repositorio (`src/lib/cneb/ciencia-tecnologia.json`); no se releyó el PDF.
- [Ciencia y Tecnología 2: fichas de autoaprendizaje a distancia, MINEDU](https://repositorio.minedu.gob.pe/handle/20.500.12799/8353), PDF leído: índice y fichas (rapidez en una rampa, acumulación de CO₂, fotosíntesis, ciclos biogeoquímicos, MRU; proyectos de biohuerto, jabón y bebida vegetal).
- [Arana Tuesta y Solís Trujillo (2023), «Promoción de competencias científicas en textos escolares de Ciencia y Tecnología del segundo grado de educación secundaria de Perú», Revista Educación 47(1)](https://www.scielo.sa.cr/pdf/edu/v47n1/2215-2644-edu-47-01-00170.pdf), artículo leído; de él se tomó solo la lista de las nueve unidades del texto escolar de 2.° (célula; nutrición; digestión y circulación; respiración y excreción; coordinación nerviosa y endocrina; reproducción y sexualidad; movimiento y fuerza; calor y temperatura; fenómenos naturales).

## C21 · Explica el mundo físico basándose en conocimientos sobre los seres vivos, materia y energía, biodiversidad, Tierra y universo (118 temas)

### Comprende y usa conocimientos sobre los seres vivos, materia y energía, biodiversidad, Tierra y universo

#### Electrones en el átomo (6)

- **Niveles, subniveles y orbitales** · `cyt.s2.niveles-subniveles-orbitales` · orden 1. Describe cómo se organizan los electrones en la nube electrónica. Desempeños: `CYT-C21-S2-01`. Prerrequisitos: ninguno.
- **Configuración electrónica por la regla de Moeller** · `cyt.s2.configuracion-electronica` · orden 2. Escribe la distribución de electrones de un elemento usando el diagrama de llenado. Desempeños: `CYT-C21-S2-01`. Prerrequisitos: `cyt.s2.niveles-subniveles-orbitales`.
- **Electrones de valencia y notación de Lewis del átomo** · `cyt.s2.electrones-de-valencia` · orden 3. Identifica los electrones del último nivel y los representa con puntos. Desempeños: `CYT-C21-S2-01`, `CYT-C21-S2-02`. Prerrequisitos: `cyt.s2.configuracion-electronica`.
- **Salto cuántico: absorción y emisión de energía** · `cyt.s2.salto-cuantico` · orden 4. Explica que un electrón cambia de nivel al absorber o emitir una cantidad definida de energía. Desempeños: `CYT-C21-S2-01`. Prerrequisitos: `cyt.s2.niveles-subniveles-orbitales`.
- **Espectros de emisión y ensayo a la llama** · `cyt.s2.espectros-y-ensayo-a-la-llama` · orden 5. Relaciona el color de la llama o de los fuegos artificiales con los saltos de electrones. Desempeños: `CYT-C21-S2-01`. Prerrequisitos: `cyt.s2.salto-cuantico`.
- **Energía de un fotón: E = h · f** · `cyt.s2.energia-de-un-foton` · orden 6. Calcula la energía emitida en un salto a partir de la frecuencia de la luz. Desempeños: `CYT-C21-S2-01`. Prerrequisitos: `cyt.s2.salto-cuantico`.

#### Tabla periódica (10)

- **Tabla periódica y propiedades de los elementos** · `cyt.s2.tabla-periodica` · orden 7. Explica que los elementos se ordenan por número atómico y que sus propiedades se repiten. Desempeños: `CYT-C21-S2-02`. Prerrequisitos: `cyt.s2.configuracion-electronica`.
- **Mendeléiev, Moseley y la historia de la tabla periódica** · `cyt.s2.historia-de-la-tabla-periodica` · orden 8. Explica cómo se pasó de ordenar por masa a ordenar por número atómico. Desempeños: `CYT-C21-S2-02`, `CYT-C21-S2-14`. Prerrequisitos: `cyt.s2.tabla-periodica`.
- **Grupos y periodos** · `cyt.s2.grupos-y-periodos` · orden 9. Ubica un elemento en la tabla a partir de su configuración electrónica. Desempeños: `CYT-C21-S2-02`. Prerrequisitos: `cyt.s2.tabla-periodica`, `cyt.s2.electrones-de-valencia`.
- **Familias: alcalinos, halógenos y gases nobles** · `cyt.s2.familias-de-elementos` · orden 10. Relaciona las propiedades de cada familia con sus electrones de valencia. Desempeños: `CYT-C21-S2-02`. Prerrequisitos: `cyt.s2.grupos-y-periodos`.
- **Metales, no metales y metaloides** · `cyt.s2.metales-no-metales-metaloides` · orden 11. Clasifica elementos por su ubicación y sus propiedades físicas. Desempeños: `CYT-C21-S2-02`. Prerrequisitos: `cyt.s2.grupos-y-periodos`.
- **Por qué los metales conducen: el mar de electrones** · `cyt.s2.mar-de-electrones` · orden 12. Explica la conductividad del cobre y el hierro por electrones de valencia libres. Desempeños: `CYT-C21-S2-02`. Prerrequisitos: `cyt.s2.metales-no-metales-metaloides`.
- **Radio atómico en grupos y periodos** · `cyt.s2.radio-atomico` · orden 13. Predice qué átomo es más grande según su posición en la tabla. Desempeños: `CYT-C21-S2-02`. Prerrequisitos: `cyt.s2.grupos-y-periodos`.
- **Energía de ionización** · `cyt.s2.energia-de-ionizacion` · orden 14. Explica por qué unos átomos pierden electrones con más facilidad que otros. Desempeños: `CYT-C21-S2-02`. Prerrequisitos: `cyt.s2.radio-atomico`.
- **Electronegatividad** · `cyt.s2.electronegatividad` · orden 15. Compara la tendencia de los átomos a atraer electrones según su posición. Desempeños: `CYT-C21-S2-02`. Prerrequisitos: `cyt.s2.energia-de-ionizacion`.
- **Elementos de la minería peruana: cobre, oro, plata y zinc** · `cyt.s2.elementos-de-la-mineria-peruana` · orden 16. Ubica en la tabla los metales que produce el Perú y relaciona sus usos con sus propiedades. Desempeños: `CYT-C21-S2-02`. Prerrequisitos: `cyt.s2.metales-no-metales-metaloides`.

#### Ondas: reflexión, refracción y dispersión (11)

- **Reflexión, refracción y dispersión de las ondas** · `cyt.s2.ondas-luz` · orden 38. Reconoce los tres comportamientos de las ondas al encontrar un obstáculo o cambiar de medio. Desempeños: `CYT-C21-S2-03`. Prerrequisitos: ninguno.
- **Ondas mecánicas y ondas electromagnéticas** · `cyt.s2.ondas-mecanicas-y-electromagneticas` · orden 39. Distingue ondas que necesitan un medio, como el sonido, de las que viajan en el vacío. Desempeños: `CYT-C21-S2-03`. Prerrequisitos: `cyt.s2.ondas-luz`.
- **Leyes de la reflexión de la luz** · `cyt.s2.leyes-de-la-reflexion` · orden 40. Aplica que el ángulo de incidencia es igual al de reflexión. Desempeños: `CYT-C21-S2-03`. Prerrequisitos: `cyt.s2.ondas-luz`.
- **Espejos planos, cóncavos y convexos** · `cyt.s2.espejos-planos-y-esfericos` · orden 41. Describe las imágenes que forma cada espejo y sus usos. Desempeños: `CYT-C21-S2-03`. Prerrequisitos: `cyt.s2.leyes-de-la-reflexion`.
- **Eco y sonar: reflexión del sonido** · `cyt.s2.eco-y-sonar` · orden 42. Calcula distancias con el tiempo de ida y vuelta del sonido. Desempeños: `CYT-C21-S2-03`. Prerrequisitos: `cyt.s2.ondas-mecanicas-y-electromagneticas`.
- **Refracción de la luz al cambiar de medio** · `cyt.s2.refraccion-de-la-luz` · orden 43. Explica por qué un lápiz parece quebrado en un vaso con agua. Desempeños: `CYT-C21-S2-03`. Prerrequisitos: `cyt.s2.leyes-de-la-reflexion`.
- **Índice de refracción** · `cyt.s2.indice-de-refraccion` · orden 44. Calcula el índice de refracción como cociente entre velocidades de la luz. Desempeños: `CYT-C21-S2-03`. Prerrequisitos: `cyt.s2.refraccion-de-la-luz`.
- **Lentes convergentes y divergentes** · `cyt.s2.lentes-convergentes-divergentes` · orden 45. Describe cómo las lentes desvían la luz y forman imágenes. Desempeños: `CYT-C21-S2-03`. Prerrequisitos: `cyt.s2.refraccion-de-la-luz`.
- **El ojo humano: miopía, hipermetropía y su corrección** · `cyt.s2.ojo-humano-y-defectos-visuales` · orden 46. Explica los defectos visuales y cómo los corrigen las lentes. Desempeños: `CYT-C21-S2-03`. Prerrequisitos: `cyt.s2.lentes-convergentes-divergentes`.
- **Dispersión de la luz blanca en un prisma** · `cyt.s2.dispersion-de-la-luz` · orden 47. Explica la formación del arcoíris por las distintas desviaciones de cada color. Desempeños: `CYT-C21-S2-03`. Prerrequisitos: `cyt.s2.indice-de-refraccion`.
- **Reflexión total interna y fibra óptica** · `cyt.s2.reflexion-total-y-fibra-optica` · orden 48. Explica cómo la luz viaja por la fibra óptica que lleva internet. Desempeños: `CYT-C21-S2-03`. Prerrequisitos: `cyt.s2.indice-de-refraccion`.

#### Calor y temperatura (7)

- **El calor y su transferencia** · `cyt.s2.calor-transferencia` · orden 49. Explica que el calor fluye del cuerpo de mayor temperatura al de menor temperatura. Desempeños: `CYT-C21-S2-04`. Prerrequisitos: ninguno.
- **Conversión entre Celsius, Kelvin y Fahrenheit** · `cyt.s2.conversion-de-escalas-termometricas` · orden 50. Convierte temperaturas entre las tres escalas. Desempeños: `CYT-C21-S2-04`. Prerrequisitos: `cyt.s2.calor-transferencia`.
- **Unidades de calor: caloría y joule** · `cyt.s2.caloria-y-joule` · orden 51. Expresa cantidades de calor y las convierte entre calorías y joules. Desempeños: `CYT-C21-S2-04`. Prerrequisitos: `cyt.s2.calor-transferencia`.
- **Calor específico de los materiales** · `cyt.s2.calor-especifico` · orden 52. Explica por qué el agua tarda más en calentarse que la arena. Desempeños: `CYT-C21-S2-04`. Prerrequisitos: `cyt.s2.caloria-y-joule`.
- **Cantidad de calor: Q = m · c · ΔT** · `cyt.s2.calculo-q-m-c-delta-t` · orden 53. Calcula el calor ganado o perdido por un cuerpo al cambiar su temperatura. Desempeños: `CYT-C21-S2-04`. Prerrequisitos: `cyt.s2.calor-especifico`.
- **Termómetro clínico y la fiebre** · `cyt.s2.termometro-clinico` · orden 54. Explica la dilatación del líquido del termómetro al recibir calor del cuerpo. Desempeños: `CYT-C21-S2-04`. Prerrequisitos: `cyt.s2.calor-transferencia`.
- **Pérdida de calor en viviendas altoandinas** · `cyt.s2.calor-en-la-vivienda-altoandina` · orden 55. Analiza cómo se pierde calor en una casa de la puna y cómo reducirlo. Desempeños: `CYT-C21-S2-04`. Prerrequisitos: `cyt.s2.calculo-q-m-c-delta-t`.

#### Movimiento rectilíneo (7)

- **Distancia, tiempo y velocidad** · `cyt.s2.velocidad-movimiento` · orden 56. Relaciona distancia recorrida, tiempo empleado y velocidad de un móvil. Desempeños: `CYT-C21-S2-05`. Prerrequisitos: ninguno.
- **Desplazamiento y velocidad como vectores** · `cyt.s2.desplazamiento-y-velocidad` · orden 57. Diferencia distancia de desplazamiento y rapidez de velocidad. Desempeños: `CYT-C21-S2-05`. Prerrequisitos: `cyt.s2.velocidad-movimiento`.
- **Conversión de km/h a m/s** · `cyt.s2.conversion-km-h-a-m-s` · orden 58. Convierte velocidades entre unidades para comparar móviles. Desempeños: `CYT-C21-S2-05`. Prerrequisitos: `cyt.s2.velocidad-movimiento`.
- **Movimiento rectilíneo uniforme (MRU)** · `cyt.s2.mru` · orden 59. Aplica d = v · t para hallar distancia, velocidad o tiempo. Desempeños: `CYT-C21-S2-05`. Prerrequisitos: `cyt.s2.desplazamiento-y-velocidad`.
- **Gráfica posición-tiempo del MRU** · `cyt.s2.grafica-posicion-tiempo-mru` · orden 60. Lee la velocidad como inclinación de la recta en una gráfica. Desempeños: `CYT-C21-S2-05`. Prerrequisitos: `cyt.s2.mru`.
- **Velocidad media en un viaje con tramos** · `cyt.s2.velocidad-media-de-un-viaje` · orden 61. Calcula la velocidad media de un recorrido con tramos distintos. Desempeños: `CYT-C21-S2-05`. Prerrequisitos: `cyt.s2.mru`.
- **Tiempo de encuentro y de alcance** · `cyt.s2.tiempo-de-encuentro-y-alcance` · orden 62. Resuelve problemas de dos móviles en MRU que se encuentran o se alcanzan. Desempeños: `CYT-C21-S2-05`. Prerrequisitos: `cyt.s2.mru`.

#### Trabajo y energía (6)

- **Trabajo: fuerza que desplaza un cuerpo** · `cyt.s2.trabajo-y-energia-introduccion` · orden 90. Calcula el trabajo como producto de la fuerza por la distancia recorrida. Desempeños: `CYT-C21-S2-06`. Prerrequisitos: `cyt.s2.mru`.
- **Energía cinética del movimiento** · `cyt.s2.energia-cinetica` · orden 91. Relaciona la energía de un cuerpo en movimiento con su masa y su velocidad. Desempeños: `CYT-C21-S2-06`. Prerrequisitos: `cyt.s2.trabajo-y-energia-introduccion`.
- **Energía potencial por la altura** · `cyt.s2.energia-potencial` · orden 92. Calcula la energía almacenada por un cuerpo elevado. Desempeños: `CYT-C21-S2-06`. Prerrequisitos: `cyt.s2.trabajo-y-energia-introduccion`.
- **Transformaciones de la energía mecánica** · `cyt.s2.transformaciones-de-energia` · orden 93. Explica cómo la energía potencial se convierte en cinética en un tobogán o una caída de agua. Desempeños: `CYT-C21-S2-06`. Prerrequisitos: `cyt.s2.energia-cinetica`, `cyt.s2.energia-potencial`.
- **Máquinas simples: palanca, polea y plano inclinado** · `cyt.s2.maquinas-simples-ahorro-de-fuerza` · orden 94. Explica cómo las máquinas simples cambian la fuerza necesaria para un trabajo. Desempeños: `CYT-C21-S2-06`. Prerrequisitos: `cyt.s2.trabajo-y-energia-introduccion`.
- **Máquinas compuestas: la bicicleta y la carretilla** · `cyt.s2.maquinas-compuestas` · orden 95. Identifica las máquinas simples que forman una máquina compuesta. Desempeños: `CYT-C21-S2-06`. Prerrequisitos: `cyt.s2.maquinas-simples-ahorro-de-fuerza`.

#### Fotosíntesis y respiración (8)

- **Fotosíntesis y respiración celular** · `cyt.s2.fotosintesis-respiracion` · orden 17. Explica que la fotosíntesis capta energía y la respiración la libera para la célula. Desempeños: `CYT-C21-S2-07`. Prerrequisitos: ninguno.
- **Cloroplasto y clorofila** · `cyt.s2.cloroplasto-y-pigmentos` · orden 18. Describe la estructura del cloroplasto y el papel de los pigmentos que captan luz. Desempeños: `CYT-C21-S2-07`. Prerrequisitos: `cyt.s2.fotosintesis-respiracion`.
- **Fase luminosa de la fotosíntesis** · `cyt.s2.fase-luminosa` · orden 19. Explica la captación de luz, la ruptura del agua y la liberación de oxígeno. Desempeños: `CYT-C21-S2-07`. Prerrequisitos: `cyt.s2.cloroplasto-y-pigmentos`.
- **Fase oscura: fijación del CO₂ y formación de glucosa** · `cyt.s2.fase-oscura` · orden 20. Explica cómo se fabrica glucosa con CO₂ y la energía de la fase luminosa. Desempeños: `CYT-C21-S2-07`. Prerrequisitos: `cyt.s2.fase-luminosa`.
- **Factores que afectan la fotosíntesis** · `cyt.s2.factores-de-la-fotosintesis` · orden 21. Relaciona luz, CO₂, agua y temperatura con la rapidez de la fotosíntesis. Desempeños: `CYT-C21-S2-07`. Prerrequisitos: `cyt.s2.fase-oscura`.
- **Respiración aerobia en la mitocondria** · `cyt.s2.mitocondria-y-respiracion-aerobia` · orden 22. Explica la obtención de energía a partir de glucosa y oxígeno. Desempeños: `CYT-C21-S2-07`. Prerrequisitos: `cyt.s2.fotosintesis-respiracion`.
- **Respiración sin oxígeno en microorganismos y músculos** · `cyt.s2.respiracion-anaerobia` · orden 23. Compara la obtención de energía con y sin oxígeno y sus productos. Desempeños: `CYT-C21-S2-07`. Prerrequisitos: `cyt.s2.mitocondria-y-respiracion-aerobia`.
- **Fotosíntesis y respiración: procesos complementarios** · `cyt.s2.fotosintesis-y-respiracion-comparadas` · orden 24. Compara reactivos, productos, organelos y energía de ambos procesos. Desempeños: `CYT-C21-S2-07`. Prerrequisitos: `cyt.s2.fase-oscura`, `cyt.s2.respiracion-anaerobia`.

#### Nutrición en los seres vivos (17)

- **Nutrición autótrofa y heterótrofa** · `cyt.s2.nutricion-autotrofa-heterotrofa` · orden 25. Clasifica organismos según fabriquen o tomen su alimento. Desempeños: `CYT-C21-S2-08`. Prerrequisitos: ninguno.
- **Nutrición en bacterias y protozoarios** · `cyt.s2.nutricion-en-unicelulares` · orden 26. Describe la absorción y la fagocitosis con vacuolas digestivas en seres unicelulares. Desempeños: `CYT-C21-S2-08`. Prerrequisitos: `cyt.s2.nutricion-autotrofa-heterotrofa`.
- **Nutrición de los hongos: descomponedores y parásitos** · `cyt.s2.nutricion-de-hongos` · orden 27. Explica la digestión externa y la absorción en los hongos. Desempeños: `CYT-C21-S2-08`. Prerrequisitos: `cyt.s2.nutricion-autotrofa-heterotrofa`.
- **Transporte en plantas: xilema y floema** · `cyt.s2.transporte-en-plantas` · orden 28. Explica cómo suben agua y sales y cómo se reparte la savia elaborada. Desempeños: `CYT-C21-S2-08`. Prerrequisitos: `cyt.s2.nutricion-autotrofa-heterotrofa`.
- **Digestión en invertebrados y vertebrados** · `cyt.s2.digestion-en-animales` · orden 29. Compara cavidades digestivas simples con tubos digestivos completos. Desempeños: `CYT-C21-S2-08`. Prerrequisitos: `cyt.s2.nutricion-en-unicelulares`.
- **Sistema digestivo humano: órganos y glándulas anexas** · `cyt.s2.sistema-digestivo-humano` · orden 30. Describe el recorrido del alimento y la función de hígado y páncreas. Desempeños: `CYT-C21-S2-08`. Prerrequisitos: `cyt.s2.digestion-en-animales`.
- **Absorción en el intestino delgado** · `cyt.s2.absorcion-intestinal` · orden 31. Explica cómo las vellosidades llevan los nutrientes a la sangre. Desempeños: `CYT-C21-S2-08`. Prerrequisitos: `cyt.s2.sistema-digestivo-humano`.
- **Circulación abierta y cerrada en los animales** · `cyt.s2.circulacion-en-animales` · orden 63. Compara sistemas circulatorios de insectos, peces y mamíferos. Desempeños: `CYT-C21-S2-08`. Prerrequisitos: `cyt.s2.digestion-en-animales`.
- **El corazón humano y el ciclo cardiaco** · `cyt.s2.corazon-humano` · orden 64. Describe cavidades, válvulas y latido del corazón. Desempeños: `CYT-C21-S2-08`. Prerrequisitos: `cyt.s2.circulacion-en-animales`.
- **Vasos sanguíneos y circulación mayor y menor** · `cyt.s2.circulacion-doble` · orden 65. Recorre el camino de la sangre por arterias, venas y capilares. Desempeños: `CYT-C21-S2-08`. Prerrequisitos: `cyt.s2.corazon-humano`.
- **Plasma, glóbulos y plaquetas: funciones de la sangre** · `cyt.s2.componentes-de-la-sangre` · orden 66. Relaciona plasma, glóbulos rojos, glóbulos blancos y plaquetas con su función. Desempeños: `CYT-C21-S2-08`. Prerrequisitos: `cyt.s2.circulacion-doble`.
- **Anemia por falta de hierro** · `cyt.s2.anemia-y-hierro` · orden 67. Explica la relación entre hemoglobina, hierro de la dieta y anemia, un problema de salud en el Perú. Desempeños: `CYT-C21-S2-08`, `CYT-C21-S2-15`. Prerrequisitos: `cyt.s2.componentes-de-la-sangre`.
- **Respiración cutánea, branquial, traqueal y pulmonar** · `cyt.s2.respiracion-en-animales` · orden 68. Compara estructuras respiratorias de distintos animales. Desempeños: `CYT-C21-S2-08`. Prerrequisitos: `cyt.s2.circulacion-en-animales`.
- **Sistema respiratorio humano e intercambio gaseoso** · `cyt.s2.sistema-respiratorio-humano` · orden 69. Describe vías respiratorias, pulmones y alvéolos. Desempeños: `CYT-C21-S2-08`. Prerrequisitos: `cyt.s2.respiracion-en-animales`.
- **Respiración en la altura y el soroche** · `cyt.s2.respiracion-en-la-altura` · orden 70. Explica la adaptación del cuerpo a la menor presión de oxígeno en los Andes. Desempeños: `CYT-C21-S2-08`. Prerrequisitos: `cyt.s2.sistema-respiratorio-humano`, `cyt.s2.componentes-de-la-sangre`.
- **Excreción en unicelulares, plantas y animales** · `cyt.s2.excrecion-en-seres-vivos` · orden 71. Compara vacuolas contráctiles, estomas y órganos excretores. Desempeños: `CYT-C21-S2-08`. Prerrequisitos: `cyt.s2.nutricion-en-unicelulares`.
- **Sistema excretor humano: riñones, piel y pulmones** · `cyt.s2.sistema-excretor-humano` · orden 72. Describe los órganos que eliminan desechos del cuerpo. Desempeños: `CYT-C21-S2-08`. Prerrequisitos: `cyt.s2.excrecion-en-seres-vivos`.

#### Reproducción (9)

- **Bipartición y gemación en seres unicelulares** · `cyt.s2.reproduccion-asexual-unicelulares` · orden 73. Explica cómo bacterias y levaduras se multiplican sin gametos. Desempeños: `CYT-C21-S2-09`. Prerrequisitos: ninguno.
- **Fragmentación, esporulación y reproducción vegetativa** · `cyt.s2.reproduccion-asexual-pluricelulares` · orden 74. Describe la reproducción asexual de estrellas de mar, helechos y papa. Desempeños: `CYT-C21-S2-09`. Prerrequisitos: `cyt.s2.reproduccion-asexual-unicelulares`.
- **Reproducción sexual: gametos y fecundación** · `cyt.s2.reproduccion-sexual-y-gametos` · orden 75. Explica la unión de gametos y la variabilidad que produce. Desempeños: `CYT-C21-S2-09`. Prerrequisitos: `cyt.s2.reproduccion-asexual-pluricelulares`.
- **Alternancia de generaciones en musgos y helechos** · `cyt.s2.alternancia-de-generaciones` · orden 76. Explica cómo se alternan una fase con esporas y otra con gametos. Desempeños: `CYT-C21-S2-09`. Prerrequisitos: `cyt.s2.reproduccion-sexual-y-gametos`.
- **Hermafroditismo y partenogénesis** · `cyt.s2.hermafroditismo-y-partenogenesis` · orden 77. Describe estrategias reproductivas de lombrices, caracoles y abejas. Desempeños: `CYT-C21-S2-09`. Prerrequisitos: `cyt.s2.reproduccion-sexual-y-gametos`.
- **Desarrollo embrionario: de cigoto a embrión** · `cyt.s2.desarrollo-embrionario` · orden 78. Describe segmentación, formación de capas embrionarias y anexos como la placenta. Desempeños: `CYT-C21-S2-09`. Prerrequisitos: `cyt.s2.reproduccion-sexual-y-gametos`.
- **Polinización y doble fecundación en plantas con flor** · `cyt.s2.reproduccion-de-plantas-con-flor` · orden 79. Explica cómo se forman la semilla y el fruto. Desempeños: `CYT-C21-S2-09`. Prerrequisitos: `cyt.s2.reproduccion-sexual-y-gametos`.
- **Sexualidad humana y responsabilidad** · `cyt.s2.aparato-reproductor-y-sexualidad` · orden 80. Relaciona los cambios de la adolescencia con decisiones informadas y respeto. Desempeños: `CYT-C21-S2-09`. Prerrequisitos: `cyt.s2.reproduccion-sexual-y-gametos`.
- **Infecciones de transmisión sexual y su prevención** · `cyt.s2.its-prevencion` · orden 81. Reconoce las ITS más comunes, sus formas de contagio y su prevención. Desempeños: `CYT-C21-S2-09`. Prerrequisitos: `cyt.s2.aparato-reproductor-y-sexualidad`.

#### Coordinación y relación (12)

- **Irritabilidad en unicelulares: taxias** · `cyt.s2.irritabilidad-unicelulares` · orden 96. Explica cómo un protozoario responde a la luz o a sustancias químicas. Desempeños: `CYT-C21-S2-10`. Prerrequisitos: ninguno.
- **Mecanismos de respuesta vegetal: tropismos y nastias** · `cyt.s2.tropismos-y-nastias` · orden 97. Explica cómo el crecimiento desigual o los cambios de presión de agua producen respuestas en las plantas. Desempeños: `CYT-C21-S2-10`. Prerrequisitos: `cyt.s2.irritabilidad-unicelulares`.
- **Fitohormonas: auxinas y maduración de frutos** · `cyt.s2.fitohormonas` · orden 98. Explica cómo las hormonas vegetales regulan el crecimiento y la maduración. Desempeños: `CYT-C21-S2-10`. Prerrequisitos: `cyt.s2.tropismos-y-nastias`.
- **Sistemas nerviosos de invertebrados y vertebrados** · `cyt.s2.sistema-nervioso-en-animales` · orden 99. Compara redes nerviosas, ganglios y sistema nervioso centralizado. Desempeños: `CYT-C21-S2-10`. Prerrequisitos: `cyt.s2.irritabilidad-unicelulares`.
- **La neurona y el impulso nervioso** · `cyt.s2.neurona-e-impulso-nervioso` · orden 100. Describe dendritas, axón y la transmisión del impulso. Desempeños: `CYT-C21-S2-10`. Prerrequisitos: `cyt.s2.sistema-nervioso-en-animales`.
- **Sinapsis y neurotransmisores** · `cyt.s2.sinapsis-y-neurotransmisores` · orden 101. Explica cómo se comunican las neuronas mediante sustancias químicas. Desempeños: `CYT-C21-S2-10`. Prerrequisitos: `cyt.s2.neurona-e-impulso-nervioso`.
- **Encéfalo y médula espinal** · `cyt.s2.encefalo-y-medula` · orden 102. Relaciona cerebro, cerebelo, tronco encefálico y médula con sus funciones. Desempeños: `CYT-C21-S2-10`. Prerrequisitos: `cyt.s2.neurona-e-impulso-nervioso`.
- **Sistema nervioso periférico y autónomo** · `cyt.s2.sistema-nervioso-periferico` · orden 103. Distingue nervios, respuestas voluntarias y respuestas automáticas. Desempeños: `CYT-C21-S2-10`. Prerrequisitos: `cyt.s2.encefalo-y-medula`.
- **El arco reflejo** · `cyt.s2.arco-reflejo` · orden 104. Describe el recorrido receptor-médula-efector en una respuesta rápida. Desempeños: `CYT-C21-S2-10`. Prerrequisitos: `cyt.s2.sistema-nervioso-periferico`.
- **Receptores sensoriales y órganos de los sentidos** · `cyt.s2.organos-de-los-sentidos` · orden 105. Relaciona cada sentido con el estímulo que capta. Desempeños: `CYT-C21-S2-10`. Prerrequisitos: `cyt.s2.neurona-e-impulso-nervioso`.
- **Coordinación hormonal en animales** · `cyt.s2.coordinacion-hormonal-en-animales` · orden 106. Compara la respuesta lenta y duradera de las hormonas con la nerviosa. Desempeños: `CYT-C21-S2-10`. Prerrequisitos: `cyt.s2.sistema-nervioso-en-animales`.
- **Alcohol, tabaco y drogas: efectos en el sistema nervioso** · `cyt.s2.drogas-y-sistema-nervioso` · orden 107. Explica cómo alteran la sinapsis y sus riesgos para la salud. Desempeños: `CYT-C21-S2-10`, `CYT-C21-S2-15`. Prerrequisitos: `cyt.s2.sinapsis-y-neurotransmisores`.

#### Selección natural y artificial (6)

- **Diferencias heredables entre individuos de una especie** · `cyt.s2.variacion-dentro-de-la-especie` · orden 108. Reconoce que los individuos de una especie difieren en rasgos heredables. Desempeños: `CYT-C21-S2-11`. Prerrequisitos: ninguno.
- **Cómo se forman nuevas especies a partir de un ancestro** · `cyt.s2.origen-de-nuevas-especies` · orden 109. Explica que el aislamiento y la selección natural separan poblaciones hasta formar especies. Desempeños: `CYT-C21-S2-11`. Prerrequisitos: `cyt.s2.variacion-dentro-de-la-especie`.
- **Los pinzones de Galápagos** · `cyt.s2.pinzones-de-galapagos` · orden 110. Analiza la diversidad de picos como ejemplo de selección natural. Desempeños: `CYT-C21-S2-11`. Prerrequisitos: `cyt.s2.origen-de-nuevas-especies`.
- **Domesticación de la alpaca, la llama y el cuy** · `cyt.s2.domesticacion-andina` · orden 111. Explica cómo la selección hecha por personas modificó animales andinos. Desempeños: `CYT-C21-S2-11`. Prerrequisitos: `cyt.s2.variacion-dentro-de-la-especie`.
- **Mejoramiento genético de cultivos por selección** · `cyt.s2.mejoramiento-de-cultivos` · orden 112. Describe cómo se obtienen variedades más resistentes o productivas. Desempeños: `CYT-C21-S2-11`. Prerrequisitos: `cyt.s2.domesticacion-andina`.
- **Selección natural y selección artificial comparadas** · `cyt.s2.natural-versus-artificial` · orden 113. Contrasta quién selecciona, con qué fin y en cuánto tiempo. Desempeños: `CYT-C21-S2-11`. Prerrequisitos: `cyt.s2.pinzones-de-galapagos`, `cyt.s2.mejoramiento-de-cultivos`.

#### Ciclos de la materia en la biósfera (7)

- **Ciclos biogeoquímicos** · `cyt.s2.ciclos-biogeoquimicos` · orden 123. Explica que la materia circula entre seres vivos, aire, agua y suelo. Desempeños: `CYT-C21-S2-12`. Prerrequisitos: ninguno.
- **Flujo de energía y reciclaje de materia en la biósfera** · `cyt.s2.flujo-de-energia-en-la-biosfera` · orden 124. Distingue la energía que fluye en un solo sentido de la materia que se recicla. Desempeños: `CYT-C21-S2-12`. Prerrequisitos: `cyt.s2.ciclos-biogeoquimicos`.
- **Ciclo hidrológico y los glaciares andinos** · `cyt.s2.ciclo-hidrologico-y-glaciares` · orden 125. Describe el ciclo del agua y el papel de los glaciares como reserva. Desempeños: `CYT-C21-S2-12`. Prerrequisitos: `cyt.s2.ciclos-biogeoquimicos`.
- **Ciclo del carbono** · `cyt.s2.ciclo-del-carbono` · orden 126. Relaciona fotosíntesis, respiración, combustión y océanos con el carbono. Desempeños: `CYT-C21-S2-12`. Prerrequisitos: `cyt.s2.ciclos-biogeoquimicos`.
- **Ciclo del nitrógeno** · `cyt.s2.ciclo-del-nitrogeno` · orden 127. Explica la fijación por bacterias, la nitrificación y la desnitrificación. Desempeños: `CYT-C21-S2-12`. Prerrequisitos: `cyt.s2.ciclos-biogeoquimicos`.
- **Ciclo del fósforo y el guano de las islas** · `cyt.s2.ciclo-del-fosforo-y-guano` · orden 128. Explica el fósforo en rocas, seres vivos y el guano como fertilizante. Desempeños: `CYT-C21-S2-12`. Prerrequisitos: `cyt.s2.ciclos-biogeoquimicos`.
- **Deforestación amazónica y ciclo del carbono** · `cyt.s2.deforestacion-y-carbono` · orden 129. Explica cómo la tala y quema de bosques aumentan el CO₂ atmosférico. Desempeños: `CYT-C21-S2-12`, `CYT-C21-S2-15`. Prerrequisitos: `cyt.s2.ciclo-del-carbono`.

#### Cambio climático y energías limpias (7)

- **Causas del cambio climático actual** · `cyt.s2.causas-del-cambio-climatico` · orden 130. Relaciona la quema de combustibles fósiles y la deforestación con el aumento de temperatura. Desempeños: `CYT-C21-S2-13`. Prerrequisitos: `cyt.s2.deforestacion-y-carbono`.
- **Fuentes de energía y emisiones de CO₂** · `cyt.s2.energias-renovables-y-no-renovables` · orden 131. Clasifica fuentes de energía y su impacto en las emisiones. Desempeños: `CYT-C21-S2-13`. Prerrequisitos: `cyt.s2.causas-del-cambio-climatico`.
- **Cómo funciona una central hidroeléctrica** · `cyt.s2.centrales-hidroelectricas` · orden 132. Describe la transformación de la energía del agua en electricidad. Desempeños: `CYT-C21-S2-13`. Prerrequisitos: `cyt.s2.energias-renovables-y-no-renovables`, `cyt.s2.transformaciones-de-energia`.
- **Paneles solares fotovoltaicos** · `cyt.s2.paneles-fotovoltaicos` · orden 133. Explica cómo un panel convierte la luz en electricidad y su uso en zonas rurales. Desempeños: `CYT-C21-S2-13`. Prerrequisitos: `cyt.s2.energias-renovables-y-no-renovables`.
- **Aerogeneradores** · `cyt.s2.aerogeneradores` · orden 134. Explica la generación eléctrica con el viento y los parques eólicos de la costa. Desempeños: `CYT-C21-S2-13`. Prerrequisitos: `cyt.s2.energias-renovables-y-no-renovables`.
- **Biomasa y biogás** · `cyt.s2.biomasa-y-biogas` · orden 135. Explica cómo los residuos orgánicos generan gas combustible. Desempeños: `CYT-C21-S2-13`. Prerrequisitos: `cyt.s2.energias-renovables-y-no-renovables`.
- **Consumo eléctrico de los artefactos y ahorro en casa** · `cyt.s2.ahorro-energetico-en-casa` · orden 136. Propone acciones y aparatos eficientes que reducen el consumo y las emisiones. Desempeños: `CYT-C21-S2-13`. Prerrequisitos: `cyt.s2.paneles-fotovoltaicos`.

### Evalúa las implicancias del saber y del quehacer científico y tecnológico

#### Ciencia, historia y sociedad (5)

- **Pasteur y el fin de la generación espontánea** · `cyt.s2.pasteur-generacion-espontanea` · orden 137. Analiza el experimento del matraz cuello de cisne y su impacto en la medicina. Desempeños: `CYT-C21-S2-14`. Prerrequisitos: ninguno.
- **Van Helmont, Priestley e Ingenhousz: descubriendo la fotosíntesis** · `cyt.s2.descubrimiento-de-la-fotosintesis` · orden 138. Reconstruye los experimentos que explicaron de dónde obtienen las plantas su materia. Desempeños: `CYT-C21-S2-14`. Prerrequisitos: `cyt.s2.fotosintesis-respiracion`.
- **La máquina de vapor y la Revolución Industrial** · `cyt.s2.maquina-de-vapor` · orden 139. Explica cómo una máquina térmica cambió el trabajo y la vida de las personas. Desempeños: `CYT-C21-S2-14`. Prerrequisitos: `cyt.s2.transformaciones-de-energia`.
- **Debate: represas hidroeléctricas en la Amazonía** · `cyt.s2.debate-hidroelectricas-amazonia` · orden 140. Fundamenta una postura sobre energía limpia frente a impactos en ríos y comunidades. Desempeños: `CYT-C21-S2-15`. Prerrequisitos: `cyt.s2.centrales-hidroelectricas`.
- **Desinfección solar del agua (SODIS): ciencia que resuelve problemas** · `cyt.s2.desinfeccion-solar-del-agua` · orden 141. Explica cómo la radiación solar elimina microbios y su uso en comunidades sin agua segura. Desempeños: `CYT-C21-S2-15`. Prerrequisitos: ninguno.

## C20 · Indaga mediante métodos científicos para construir sus conocimientos (18 temas)

### Problematiza situaciones

#### Pregunta e hipótesis (2)

- **Del problema a la pregunta de indagación** · `cyt.s2.del-problema-a-la-pregunta` · orden 32. Convierte una situación observada en una pregunta con variables definidas. Desempeños: `CYT-C20-S2-01`. Prerrequisitos: ninguno.
- **Identificación de variables intervinientes** · `cyt.s2.identificar-variables-intervinientes` · orden 33. Reconoce factores que podrían alterar el resultado además de la variable manipulada. Desempeños: `CYT-C20-S2-01`. Prerrequisitos: `cyt.s2.del-problema-a-la-pregunta`.

### Diseña estrategias para hacer indagación

#### Diseño de la indagación (3)

- **Diseño de un procedimiento con control de variables** · `cyt.s2.diseno-con-control-de-variables` · orden 34. Planifica cómo manipular, medir y mantener constantes las variables. Desempeños: `CYT-C20-S2-02`. Prerrequisitos: `cyt.s2.identificar-variables-intervinientes`.
- **Cronograma y medidas de seguridad de la indagación** · `cyt.s2.cronograma-y-seguridad` · orden 35. Prevé tiempos, riesgos y equipos de protección. Desempeños: `CYT-C20-S2-02`. Prerrequisitos: `cyt.s2.diseno-con-control-de-variables`.
- **Uso del termómetro y el cronómetro en experimentos** · `cyt.s2.termometro-y-cronometro` · orden 82. Mide temperatura y tiempo con precisión y registra la incertidumbre. Desempeños: `CYT-C20-S2-02`, `CYT-C20-S2-03`. Prerrequisitos: ninguno.

### Genera y registra datos e información

#### Generación y registro de datos (5)

- **Ajustes al procedimiento durante el experimento** · `cyt.s2.ajustes-al-procedimiento` · orden 83. Corrige pasos o mediciones cuando detecta fallas en el registro. Desempeños: `CYT-C20-S2-03`. Prerrequisitos: `cyt.s2.diseno-con-control-de-variables`.
- **Media aritmética de mediciones repetidas** · `cyt.s2.media-aritmetica-de-mediciones` · orden 84. Calcula el promedio de varias mediciones de la variable dependiente. Desempeños: `CYT-C20-S2-03`. Prerrequisitos: `cyt.s2.termometro-y-cronometro`.
- **Tablas de datos con variables y unidades** · `cyt.s2.tablas-con-unidades` · orden 85. Organiza datos con encabezados, unidades y repeticiones. Desempeños: `CYT-C20-S2-03`. Prerrequisitos: `cyt.s2.media-aritmetica-de-mediciones`.
- **Gráfica de líneas con dos variables** · `cyt.s2.grafica-de-lineas-dos-variables` · orden 86. Ubica la variable independiente en el eje x y la dependiente en el eje y. Desempeños: `CYT-C20-S2-03`. Prerrequisitos: `cyt.s2.tablas-con-unidades`.
- **Indagación: calentamiento del agua y de la arena** · `cyt.s2.indagacion-calor-especifico-agua-arena` · orden 87. Mide la temperatura de agua y arena expuestas al sol y compara sus calores específicos. Desempeños: `CYT-C20-S2-01`, `CYT-C20-S2-02`, `CYT-C20-S2-03`. Prerrequisitos: `cyt.s2.cronograma-y-seguridad`, `cyt.s2.grafica-de-lineas-dos-variables`.

### Analiza datos e información

#### Análisis de resultados (5)

- **Interpretación de tendencias en gráficas** · `cyt.s2.tendencias-en-graficas` · orden 114. Describe si la variable dependiente aumenta, disminuye o se mantiene. Desempeños: `CYT-C20-S2-04`. Prerrequisitos: `cyt.s2.grafica-de-lineas-dos-variables`.
- **Hipótesis aceptada o rechazada: qué significa** · `cyt.s2.hipotesis-aceptada-o-rechazada` · orden 115. Explica que refutar una hipótesis también es un resultado válido. Desempeños: `CYT-C20-S2-04`. Prerrequisitos: `cyt.s2.tendencias-en-graficas`.
- **Indagación: intensidad de luz y burbujas de oxígeno en Elodea** · `cyt.s2.indagacion-luz-y-fotosintesis` · orden 116. Cuenta burbujas a distintas distancias de la luz y analiza la relación. Desempeños: `CYT-C20-S2-01`, `CYT-C20-S2-02`, `CYT-C20-S2-03`, `CYT-C20-S2-04`. Prerrequisitos: `cyt.s2.ajustes-al-procedimiento`, `cyt.s2.fase-luminosa`.
- **Indagación: pendiente de la rampa y rapidez de un carrito** · `cyt.s2.indagacion-rapidez-en-rampa` · orden 117. Mide tiempos de recorrido y calcula rapideces para distintas alturas. Desempeños: `CYT-C20-S2-02`, `CYT-C20-S2-03`, `CYT-C20-S2-04`. Prerrequisitos: `cyt.s2.mru`, `cyt.s2.tendencias-en-graficas`.
- **Indagación: CO₂ acumulado y temperatura del aire** · `cyt.s2.indagacion-co2-y-temperatura` · orden 142. Compara la temperatura de frascos con aire y con más CO₂ expuestos al sol. Desempeños: `CYT-C20-S2-01`, `CYT-C20-S2-02`, `CYT-C20-S2-03`, `CYT-C20-S2-04`. Prerrequisitos: `cyt.s2.tendencias-en-graficas`, `cyt.s2.ciclo-del-carbono`.

### Evalúa y comunica el proceso y resultados de su indagación

#### Evaluación y comunicación (3)

- **Informe de laboratorio** · `cyt.s2.informe-de-laboratorio` · orden 143. Redacta título, objetivo, procedimiento, resultados, conclusiones y fuentes. Desempeños: `CYT-C20-S2-05`. Prerrequisitos: `cyt.s2.hipotesis-aceptada-o-rechazada`.
- **Revisión de mediciones, cálculos y ajustes** · `cyt.s2.calculos-y-ajustes-evaluados` · orden 144. Evalúa si sus cálculos y ajustes contribuyeron a demostrar la hipótesis. Desempeños: `CYT-C20-S2-05`. Prerrequisitos: `cyt.s2.informe-de-laboratorio`.
- **Presentación digital de resultados** · `cyt.s2.presentacion-digital-de-resultados` · orden 145. Comunica su indagación con diapositivas, video o publicación virtual. Desempeños: `CYT-C20-S2-05`. Prerrequisitos: `cyt.s2.informe-de-laboratorio`.

## C22 · Diseña y construye soluciones tecnológicas para resolver problemas de su entorno (11 temas)

### Determina una alternativa de solución tecnológica

#### Problema y alternativa de solución (2)

- **Beneficios directos e indirectos de una solución** · `cyt.s2.beneficios-directos-e-indirectos` · orden 36. Distingue a quién beneficia la solución de inmediato y a largo plazo. Desempeños: `CYT-C22-S2-01`. Prerrequisitos: ninguno.
- **Saberes locales como base de soluciones tecnológicas** · `cyt.s2.saberes-locales-y-ciencia` · orden 37. Fundamenta una solución con conocimientos científicos y prácticas de su comunidad. Desempeños: `CYT-C22-S2-01`. Prerrequisitos: `cyt.s2.beneficios-directos-e-indirectos`.

### Diseña la alternativa de solución tecnológica

#### Diseño de la solución (2)

- **Dibujo con vistas frontal, lateral y superior** · `cyt.s2.vistas-frontal-lateral-superior` · orden 88. Representa un prototipo en tres vistas con medidas. Desempeños: `CYT-C22-S2-02`. Prerrequisitos: `cyt.s2.saberes-locales-y-ciencia`.
- **Secuencia de pasos de construcción** · `cyt.s2.secuencia-de-construccion` · orden 89. Ordena las etapas de construcción con herramientas y materiales para cada una. Desempeños: `CYT-C22-S2-02`. Prerrequisitos: `cyt.s2.vistas-frontal-lateral-superior`.

### Implementa y valida la alternativa de solución tecnológica

#### Implementación y validación (5)

- **Proyecto: horno solar de caja** · `cyt.s2.proyecto-horno-solar` · orden 118. Construye un horno solar aplicando reflexión de la luz y transferencia de calor. Desempeños: `CYT-C22-S2-01`, `CYT-C22-S2-02`, `CYT-C22-S2-03`. Prerrequisitos: `cyt.s2.secuencia-de-construccion`, `cyt.s2.calor-especifico`.
- **Proyecto: periscopio con espejos planos** · `cyt.s2.proyecto-periscopio` · orden 119. Construye un periscopio aplicando las leyes de la reflexión. Desempeños: `CYT-C22-S2-02`, `CYT-C22-S2-03`. Prerrequisitos: `cyt.s2.secuencia-de-construccion`, `cyt.s2.leyes-de-la-reflexion`.
- **Proyecto: biohuerto de hortalizas en la escuela** · `cyt.s2.proyecto-biohuerto` · orden 120. Diseña camas de cultivo considerando luz, agua y nutrientes para la fotosíntesis. Desempeños: `CYT-C22-S2-01`, `CYT-C22-S2-02`, `CYT-C22-S2-03`. Prerrequisitos: `cyt.s2.secuencia-de-construccion`, `cyt.s2.factores-de-la-fotosintesis`.
- **Proyecto: bebida vegetal nutritiva de quinua o soya** · `cyt.s2.proyecto-bebida-vegetal` · orden 121. Elabora una bebida vegetal siguiendo un proceso higiénico y evalúa su aporte nutritivo. Desempeños: `CYT-C22-S2-01`, `CYT-C22-S2-02`, `CYT-C22-S2-03`. Prerrequisitos: `cyt.s2.secuencia-de-construccion`.
- **Corrección de errores durante la construcción** · `cyt.s2.correccion-de-errores` · orden 122. Detecta fallas de procedimiento o de materiales y aplica cambios. Desempeños: `CYT-C22-S2-03`. Prerrequisitos: `cyt.s2.proyecto-horno-solar`.

### Evalúa y comunica el funcionamiento y los impactos de su alternativa de solución tecnológica

#### Evaluación y comunicación (2)

- **Propuestas de mejora del prototipo** · `cyt.s2.propuestas-de-mejora` · orden 146. Propone mejoras a partir de las pruebas de funcionamiento. Desempeños: `CYT-C22-S2-04`. Prerrequisitos: `cyt.s2.correccion-de-errores`.
- **Ficha técnica de la solución tecnológica** · `cyt.s2.ficha-tecnica-de-la-solucion` · orden 147. Explica construcción, ajustes, fundamento científico e impacto ambiental. Desempeños: `CYT-C22-S2-04`. Prerrequisitos: `cyt.s2.propuestas-de-mejora`.

## Claves históricas conservadas

| Clave | Tema propuesto |
|---|---|
| `cyt.s2.tabla-periodica` | Tabla periódica y propiedades de los elementos |
| `cyt.s2.ondas-luz` | Reflexión, refracción y dispersión de las ondas |
| `cyt.s2.calor-transferencia` | El calor y su transferencia |
| `cyt.s2.velocidad-movimiento` | Distancia, tiempo y velocidad |
| `cyt.s2.fotosintesis-respiracion` | Fotosíntesis y respiración celular |
| `cyt.s2.ciclos-biogeoquimicos` | Ciclos biogeoquímicos |

## Cobertura de desempeños

Cada desempeño de segundo grado de secundaria tiene al menos un tema asignado. Los temas pueden cubrir más de un desempeño.

| Competencia | Desempeño | Temas que lo cubren |
|---|---|---|
| C21 | `CYT-C21-S2-01` | `cyt.s2.niveles-subniveles-orbitales`, `cyt.s2.configuracion-electronica`, `cyt.s2.electrones-de-valencia`, `cyt.s2.salto-cuantico`, `cyt.s2.espectros-y-ensayo-a-la-llama`, `cyt.s2.energia-de-un-foton` |
| C21 | `CYT-C21-S2-02` | `cyt.s2.electrones-de-valencia`, `cyt.s2.tabla-periodica`, `cyt.s2.historia-de-la-tabla-periodica`, `cyt.s2.grupos-y-periodos`, `cyt.s2.familias-de-elementos`, `cyt.s2.metales-no-metales-metaloides`, `cyt.s2.mar-de-electrones`, `cyt.s2.radio-atomico`, `cyt.s2.energia-de-ionizacion`, `cyt.s2.electronegatividad`, `cyt.s2.elementos-de-la-mineria-peruana` |
| C21 | `CYT-C21-S2-03` | `cyt.s2.ondas-luz`, `cyt.s2.ondas-mecanicas-y-electromagneticas`, `cyt.s2.leyes-de-la-reflexion`, `cyt.s2.espejos-planos-y-esfericos`, `cyt.s2.eco-y-sonar`, `cyt.s2.refraccion-de-la-luz`, `cyt.s2.indice-de-refraccion`, `cyt.s2.lentes-convergentes-divergentes`, `cyt.s2.ojo-humano-y-defectos-visuales`, `cyt.s2.dispersion-de-la-luz`, `cyt.s2.reflexion-total-y-fibra-optica` |
| C21 | `CYT-C21-S2-04` | `cyt.s2.calor-transferencia`, `cyt.s2.conversion-de-escalas-termometricas`, `cyt.s2.caloria-y-joule`, `cyt.s2.calor-especifico`, `cyt.s2.calculo-q-m-c-delta-t`, `cyt.s2.termometro-clinico`, `cyt.s2.calor-en-la-vivienda-altoandina` |
| C21 | `CYT-C21-S2-05` | `cyt.s2.velocidad-movimiento`, `cyt.s2.desplazamiento-y-velocidad`, `cyt.s2.conversion-km-h-a-m-s`, `cyt.s2.mru`, `cyt.s2.grafica-posicion-tiempo-mru`, `cyt.s2.velocidad-media-de-un-viaje`, `cyt.s2.tiempo-de-encuentro-y-alcance` |
| C21 | `CYT-C21-S2-06` | `cyt.s2.trabajo-y-energia-introduccion`, `cyt.s2.energia-cinetica`, `cyt.s2.energia-potencial`, `cyt.s2.transformaciones-de-energia`, `cyt.s2.maquinas-simples-ahorro-de-fuerza`, `cyt.s2.maquinas-compuestas` |
| C21 | `CYT-C21-S2-07` | `cyt.s2.fotosintesis-respiracion`, `cyt.s2.cloroplasto-y-pigmentos`, `cyt.s2.fase-luminosa`, `cyt.s2.fase-oscura`, `cyt.s2.factores-de-la-fotosintesis`, `cyt.s2.mitocondria-y-respiracion-aerobia`, `cyt.s2.respiracion-anaerobia`, `cyt.s2.fotosintesis-y-respiracion-comparadas` |
| C21 | `CYT-C21-S2-08` | `cyt.s2.nutricion-autotrofa-heterotrofa`, `cyt.s2.nutricion-en-unicelulares`, `cyt.s2.nutricion-de-hongos`, `cyt.s2.transporte-en-plantas`, `cyt.s2.digestion-en-animales`, `cyt.s2.sistema-digestivo-humano`, `cyt.s2.absorcion-intestinal`, `cyt.s2.circulacion-en-animales`, `cyt.s2.corazon-humano`, `cyt.s2.circulacion-doble`, `cyt.s2.componentes-de-la-sangre`, `cyt.s2.anemia-y-hierro`, `cyt.s2.respiracion-en-animales`, `cyt.s2.sistema-respiratorio-humano`, `cyt.s2.respiracion-en-la-altura`, `cyt.s2.excrecion-en-seres-vivos`, `cyt.s2.sistema-excretor-humano` |
| C21 | `CYT-C21-S2-09` | `cyt.s2.reproduccion-asexual-unicelulares`, `cyt.s2.reproduccion-asexual-pluricelulares`, `cyt.s2.reproduccion-sexual-y-gametos`, `cyt.s2.alternancia-de-generaciones`, `cyt.s2.hermafroditismo-y-partenogenesis`, `cyt.s2.desarrollo-embrionario`, `cyt.s2.reproduccion-de-plantas-con-flor`, `cyt.s2.aparato-reproductor-y-sexualidad`, `cyt.s2.its-prevencion` |
| C21 | `CYT-C21-S2-10` | `cyt.s2.irritabilidad-unicelulares`, `cyt.s2.tropismos-y-nastias`, `cyt.s2.fitohormonas`, `cyt.s2.sistema-nervioso-en-animales`, `cyt.s2.neurona-e-impulso-nervioso`, `cyt.s2.sinapsis-y-neurotransmisores`, `cyt.s2.encefalo-y-medula`, `cyt.s2.sistema-nervioso-periferico`, `cyt.s2.arco-reflejo`, `cyt.s2.organos-de-los-sentidos`, `cyt.s2.coordinacion-hormonal-en-animales`, `cyt.s2.drogas-y-sistema-nervioso` |
| C21 | `CYT-C21-S2-11` | `cyt.s2.variacion-dentro-de-la-especie`, `cyt.s2.origen-de-nuevas-especies`, `cyt.s2.pinzones-de-galapagos`, `cyt.s2.domesticacion-andina`, `cyt.s2.mejoramiento-de-cultivos`, `cyt.s2.natural-versus-artificial` |
| C21 | `CYT-C21-S2-12` | `cyt.s2.ciclos-biogeoquimicos`, `cyt.s2.flujo-de-energia-en-la-biosfera`, `cyt.s2.ciclo-hidrologico-y-glaciares`, `cyt.s2.ciclo-del-carbono`, `cyt.s2.ciclo-del-nitrogeno`, `cyt.s2.ciclo-del-fosforo-y-guano`, `cyt.s2.deforestacion-y-carbono` |
| C21 | `CYT-C21-S2-13` | `cyt.s2.causas-del-cambio-climatico`, `cyt.s2.energias-renovables-y-no-renovables`, `cyt.s2.centrales-hidroelectricas`, `cyt.s2.paneles-fotovoltaicos`, `cyt.s2.aerogeneradores`, `cyt.s2.biomasa-y-biogas`, `cyt.s2.ahorro-energetico-en-casa` |
| C21 | `CYT-C21-S2-14` | `cyt.s2.historia-de-la-tabla-periodica`, `cyt.s2.pasteur-generacion-espontanea`, `cyt.s2.descubrimiento-de-la-fotosintesis`, `cyt.s2.maquina-de-vapor` |
| C21 | `CYT-C21-S2-15` | `cyt.s2.anemia-y-hierro`, `cyt.s2.drogas-y-sistema-nervioso`, `cyt.s2.deforestacion-y-carbono`, `cyt.s2.debate-hidroelectricas-amazonia`, `cyt.s2.desinfeccion-solar-del-agua` |
| C20 | `CYT-C20-S2-01` | `cyt.s2.del-problema-a-la-pregunta`, `cyt.s2.identificar-variables-intervinientes`, `cyt.s2.indagacion-calor-especifico-agua-arena`, `cyt.s2.indagacion-luz-y-fotosintesis`, `cyt.s2.indagacion-co2-y-temperatura` |
| C20 | `CYT-C20-S2-02` | `cyt.s2.diseno-con-control-de-variables`, `cyt.s2.cronograma-y-seguridad`, `cyt.s2.termometro-y-cronometro`, `cyt.s2.indagacion-calor-especifico-agua-arena`, `cyt.s2.indagacion-luz-y-fotosintesis`, `cyt.s2.indagacion-rapidez-en-rampa`, `cyt.s2.indagacion-co2-y-temperatura` |
| C20 | `CYT-C20-S2-03` | `cyt.s2.termometro-y-cronometro`, `cyt.s2.ajustes-al-procedimiento`, `cyt.s2.media-aritmetica-de-mediciones`, `cyt.s2.tablas-con-unidades`, `cyt.s2.grafica-de-lineas-dos-variables`, `cyt.s2.indagacion-calor-especifico-agua-arena`, `cyt.s2.indagacion-luz-y-fotosintesis`, `cyt.s2.indagacion-rapidez-en-rampa`, `cyt.s2.indagacion-co2-y-temperatura` |
| C20 | `CYT-C20-S2-04` | `cyt.s2.tendencias-en-graficas`, `cyt.s2.hipotesis-aceptada-o-rechazada`, `cyt.s2.indagacion-luz-y-fotosintesis`, `cyt.s2.indagacion-rapidez-en-rampa`, `cyt.s2.indagacion-co2-y-temperatura` |
| C20 | `CYT-C20-S2-05` | `cyt.s2.informe-de-laboratorio`, `cyt.s2.calculos-y-ajustes-evaluados`, `cyt.s2.presentacion-digital-de-resultados` |
| C22 | `CYT-C22-S2-01` | `cyt.s2.beneficios-directos-e-indirectos`, `cyt.s2.saberes-locales-y-ciencia`, `cyt.s2.proyecto-horno-solar`, `cyt.s2.proyecto-biohuerto`, `cyt.s2.proyecto-bebida-vegetal` |
| C22 | `CYT-C22-S2-02` | `cyt.s2.vistas-frontal-lateral-superior`, `cyt.s2.secuencia-de-construccion`, `cyt.s2.proyecto-horno-solar`, `cyt.s2.proyecto-periscopio`, `cyt.s2.proyecto-biohuerto`, `cyt.s2.proyecto-bebida-vegetal` |
| C22 | `CYT-C22-S2-03` | `cyt.s2.proyecto-horno-solar`, `cyt.s2.proyecto-periscopio`, `cyt.s2.proyecto-biohuerto`, `cyt.s2.proyecto-bebida-vegetal`, `cyt.s2.correccion-de-errores` |
| C22 | `CYT-C22-S2-04` | `cyt.s2.propuestas-de-mejora`, `cyt.s2.ficha-tecnica-de-la-solucion` |

## Conteos

| Competencia | Temas |
|---|---:|
| C21 | 118 |
| C20 | 18 |
| C22 | 11 |
| **Total** | **147** |

### Temas por bloque

| Competencia | Bloque | Temas |
|---|---|---:|
| C21 | Electrones en el átomo | 6 |
| C21 | Tabla periódica | 10 |
| C21 | Ondas: reflexión, refracción y dispersión | 11 |
| C21 | Calor y temperatura | 7 |
| C21 | Movimiento rectilíneo | 7 |
| C21 | Trabajo y energía | 6 |
| C21 | Fotosíntesis y respiración | 8 |
| C21 | Nutrición en los seres vivos | 17 |
| C21 | Reproducción | 9 |
| C21 | Coordinación y relación | 12 |
| C21 | Selección natural y artificial | 6 |
| C21 | Ciclos de la materia en la biósfera | 7 |
| C21 | Cambio climático y energías limpias | 7 |
| C21 | Ciencia, historia y sociedad | 5 |
| C20 | Pregunta e hipótesis | 2 |
| C20 | Diseño de la indagación | 3 |
| C20 | Generación y registro de datos | 5 |
| C20 | Análisis de resultados | 5 |
| C20 | Evaluación y comunicación | 3 |
| C22 | Problema y alternativa de solución | 2 |
| C22 | Diseño de la solución | 2 |
| C22 | Implementación y validación | 5 |
| C22 | Evaluación y comunicación | 2 |
