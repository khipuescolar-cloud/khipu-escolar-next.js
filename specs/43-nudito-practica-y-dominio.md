# 43 — Nudito: práctica, evaluación y dominio por habilidad

> Estado: implementado (Dev B, todo puro) · Plan: Khipu Pro · Última actualización: 2026-11-04 (Claude Code, Dev B) · Responsable: Dev B

## Objetivo
Producir ejercicios **verificables** para los temas de Nudito (specs/41–42), corregirlos sin IA cuando son cerrados y decidir
el avance del alumno por tema con una política de dominio **configurable y auditable**, sin cambiar su grado oficial.

## Piezas (todo puro: sin Prisma, BD ni servidor)
| Archivo | Qué hace |
|---|---|
| `src/lib/nudito/azar.ts` | PRNG mulberry32 con semilla (`crearAzar`: `siguiente`, `entero`, `elegir`, `barajar`), `derivarSemilla`, `nuevaSemilla` (única con aleatoriedad real; la usa el servicio, nunca un generador). |
| `generadores/matematica/*.ts` | 7 generadores parametrizados (abajo). `comun.ts`: rango numérico por grado y dificultad, formato (coma decimal), opción múltiple con distractores, conversión a `EjercicioConSolucion`. |
| `generadores/registro.ts` | `generadores()`, `obtenerGenerador(id)`, `ejercicioPara(tema, dificultad, semilla, { usados? })`, `fuentesDisponibles()`, `VERSION_REGISTRO`. |
| `banco/items.ts` | Sobre JSON de ítems revisados (`esquemaItem`), `cargarItems` (valida todo contra el contrato al cargar), `armarItem`, `seleccionarItem`. |
| `banco/ciencia/{p1..p6,s1,s2}.json` + `index.ts` | Banco de Ciencia y Tecnología `cyt.banco`. |
| `lecturas/comunicacion/{lecturas-p1..s2,lengua,escritura}.json` + `index.ts` | Colecciones `com.lecturas` y `com.escritura` (comparten un solo conjunto de ítems; se seleccionan por `temaClave`). |
| `rubricas/escritura.ts` | Rúbrica formativa de escritura por grado: adecuación, coherencia, conectores, ortografía y puntuación; 4 niveles; tramos 1.°–3.°, 4.°–6.° y secundaria. Id `com.escritura.<p|s><grado>`. |
| `evaluadores/{opcion,numerico,fraccion,texto-corto,lectura,relacionar,vf,rubrica-simulada,comun,index}.ts` | `evaluadorDe(tipo)`, `evaluar(ej, envio)`, `evaluarRubricaSimulada`, `evaluadorAbierto()`. |
| `politica-dominio.ts` | `POLITICA_DOMINIO_POR_DEFECTO` (v1), `politicaEfectiva(cambios)`, `evaluarDominio`, `estadoInicial`, `pesoEvidencia`. |

## Generadores de Matemática (ids exactos, versión 1)
`generar(tema, dificultad, semilla)` es determinista. El rango numérico crece con el grado efectivo (primaria 1–6,
secundaria 7–11) y con la dificultad (`limiteNumerico`). Nunca hay división por cero, denominador 0 ni resultados negativos en
primaria. El **subtipo** se elige por fragmentos del tema (clave, nombre, subtema: «perímetro», «simplific», «descuento»…) y por
grado; además se prefieren los subtipos que pueden producir un tipo admitido por `tema.tipos`. El formato (numérico/fracción u
opción múltiple) se elige entre los que admite el tema.

| Id | Subtipos |
|---|---|
| `mat.operaciones` | suma, resta (sin negativos), multiplicación, división exacta y con residuo (pregunta cociente o residuo), operaciones combinadas con jerarquía y enteros (secundaria); problemas de enunciado desde dificultad 3 |
| `mat.fracciones` | equivalentes (?/n), comparar (solo opción múltiple), sumar/restar con igual y distinto denominador (simplificado desde dificultad 4), simplificar |
| `mat.proporcionalidad` | regla de tres directa, inversa (secundaria), razones (fracción simplificada) |
| `mat.porcentajes` | porcentaje de una cantidad, descuento/aumento, qué porcentaje es (secundaria); siempre resultados enteros |
| `mat.ecuaciones` | lineales de una incógnita con solución entera: x + b, ax, ax + b, ax + b = cx + d, a(x + b); negativos solo en secundaria; en 1.°–4.° de primaria la incógnita es «□» |
| `mat.geometria` | perímetro (cuadrado, rectángulo), área (rectángulo, triángulo, figura en L), círculo con π ≈ 3,14 (secundaria); siempre con unidades |
| `mat.patrones` | secuencias que suman o restan, × r, diferencias crecientes, término n-ésimo (secundaria) |

Cada ejercicio trae distractores ligados a errores típicos (`suma_denominadores`, `confunde_area_y_perimetro`,
`olvida_llevar`, `no_cambia_signo_al_transponer`…; si faltan, se completan con `error_de_calculo`), 3 pistas progresivas (las
dos primeras no revelan el resultado) y una explicación paso a paso. Alias temporales: `mat.fracciones-equivalentes` y
`mat.ecuaciones-lineales` (fixtures del paso 0).

## Banco de Ciencia y lecturas de Comunicación
- Ítems escritos por personas (la IA no crea ítems), con `fuente` (referencia general CNEB / texto escolar MINEDU) y
  `revisadoPor: null` hasta la revisión docente. Ciencia: opción múltiple, VF con justificación, relacionar, interpretación de
  datos, causa-efecto e hipótesis; seguros para menores (sin fuego, químicos ni electricidad de red). Comunicación: lecturas
  originales (narrativas, informativas, instructivas, argumentativas) con preguntas literales, inferenciales y críticas;
  ortografía, puntuación, conectores y cohesión; consignas de escritura con la rúbrica formativa del grado.
- Claves de tema: SOLO las de `CLAVES_POR_FUENTE` (`src/lib/nudito/catalogo/claves.ts`, Dev A). La prueba cruzada exige ≥ 1 ítem
  de un tipo admitido por cada tema de `cyt.banco`, `com.lecturas` y `com.escritura`.
- Selección determinista (`seleccionarItem`): ítems de la clave (si no hay, del mismo nivel y grado: temas del colegio) →
  tipos que admite el tema → sin los ya usados en la sesión (`usados`: ids o `fuenteId`; agotados, se vuelven a permitir) → los
  de dificultad más cercana → uno según la semilla. El ejercicio lleva la dificultad **propia del ítem**.
- `fuenteId`: `generadorId@versión`, `cyt.banco:<id>`, `com.lecturas:<id>` o `com.escritura:<id>`.

## Evaluación
- Ítems cerrados por código (`evaluadoPor: "codigo"`), nunca solo «correcto/incorrecto»: qué estuvo bien, error detectado
  (`errorDetectado` = código del distractor o del evaluador) y la explicación.
- Numérico: coma o punto decimal, «−», unidades al final, «1 200», «1/4»; tolerancia; detecta signo y posición decimal.
- Fracción: equivalentes si `aceptarEquivalentes`; si `pideSimplificar` y no está simplificada → `parcial` (0,5,
  `no_simplifica`); equivalente pero se pedía otra forma → `parcial`; invertida, denominador 0, numerador/denominador errado.
- Texto corto flexible: sin mayúsculas, tildes, puntuación ni espacios extra; acepta respuestas que contienen todas las palabras
  de contenido de una aceptada («Fue con su abuela» ⊇ «abuela») y una letra de diferencia. Estricta: conserva tildes (si solo
  coincide sin tildes → `parcial`, `ortografia`).
- Lectura: puntaje parcial por pregunta (texto flexible en las abiertas); retro por tipo de pregunta.
- Relacionar y VF: parcial por par/afirmación; en VF se muestra la justificación de las falladas.
- Respuesta de otro tipo → `incorrecto` (`tipo_de_respuesta`), sin lanzar.
- **Escritura — rúbrica SIMULADA** (`evaluarRubricaSimulada`, también la usa `evaluar` para `escritura_rubrica`): heurística
  documentada (extensión vs. min/max, palabras de la consigna, oraciones/párrafos, conectores de una lista cerrada, mayúscula
  inicial y punto final). **Siempre** `incierto` con `evaluadoPor: "rubrica_simulada"`: orienta, no cuenta para el dominio.
  `evaluadorAbierto()`: si `ia.simulado` usa la simulada; si no, `ia.retroalimentarAbierta` validada con zod (un reintento);
  confianza < 0,6 o criterios incompletos → `incierto`; si no, `correcto` (≥ 0,75), `parcial` (≥ 0,25) o `incorrecto`.

## Política de dominio (`POLITICA_DOMINIO_POR_DEFECTO`, «v1»)
Valores: ventana 8, minIntentos 6, minPuntajePonderado 0,8, pesoConPista 0,5, pesoParcial 0,5, maxPistasPromedio 1,
minSesionesDistintas 2, horasEntreSesiones 12, dificultadMinimaDominio 3, ejerciciosComprobacion 3,
minAciertosComprobacionSinPista 2, subir tras 3 aciertos seguidos, bajar tras 2 fallos seguidos, desbloqueo en dificultad 4 con
prerrequisitos dominados. El colegio la cambia en `nudito_config_colegio.politica_dominio` (`politicaEfectiva`: parcial validado,
error claro si es inválida o incoherente; sin `version` explícita queda «v1-colegio»).

`evaluarDominio(actual, evidencia, politica, contexto?)` (puro; cada cambio → evento con `motivo` legible):
1. `incierto` no cuenta (ni entra en la ventana).
2. Una sesión nueva suma a `sesionesDistintas` solo si pasaron ≥ `horasEntreSesiones` desde la última evidencia.
3. Peso: correcto sin pista 1; con 1–2 pistas `pesoConPista`; parcial `pesoParcial` (× pesoConPista con pistas); con la pista 3
   (respuesta revelada) 0 y no es acierto independiente; incorrecto 0.
4. Dificultad: `dificultad_sube` tras N aciertos seguidos en la dificultad actual (fuera de comprobación); `dificultad_baja` tras
   M incorrectos seguidos. Rango 1–5: el servicio la acota a `tema.dificultad`.
5. Estados: no_iniciado → en_progreso; → en_comprobacion con ≥ minIntentos evidencias de dificultad ≥ mínima en la ventana,
   puntaje ≥ umbral y pistas promedio ≤ máximo; en comprobación, la ronda (evidencias `comprobacion` seguidas al final) con
   ≥ minAciertos **sin pista** y ≥ minSesionesDistintas → dominado; demasiados fallos → en_progreso (o reforzar si el puntaje
   < 0,5); dominado → reforzar si hay fallos seguidos o el puntaje cae bajo umbral − 0,2; en_progreso en dificultad 1 con fallos
   seguidos → reforzar; reforzar → en_progreso con aciertos seguidos. **Nunca** hay dominio en una sola sesión ni sin comprobación.
6. `desbloqueo_tema`: solo al pasar a dominado en dificultad ≥ `desbloqueo.requiereDificultad` y con todos los prerrequisitos
   dominados. El tipo congelado `EvaluarDominio` no recibe prerrequisitos: `evaluarDominio` acepta el 4.º parámetro opcional
   `contexto: { prerrequisitos, dominados }` que arma el servicio (C) con `tema.prerrequisitos` y los temas dominados del
   alumno. Sin `contexto` no se emite `desbloqueo_tema`.

## Cobertura de contenido (a la fecha)
Ver la tabla del informe del Dev B y `tests/unit/nudito-catalogo-fuentes.test.ts` (cada tema del catálogo con fuente de ítems
tiene al menos uno). Matemática: todos los temas del catálogo (primaria 1.°–6.°, secundaria 1.°–2.°) generan ejercicios.

## Pruebas (tests/unit)
- `nudito-azar` · `nudito-generadores-matematica` (7 × 1.000 semillas × 5 dificultades × 11 grados: contrato, la solución verifica
  con el evaluador y recalculando el enunciado, distractores ≠ correcta y con código, sin negativos en primaria, pistas 1–2 no
  revelan, determinismo, tipos del tema, subtipo dirigido por el tema, dificultad monótona).
- `nudito-banco-ciencia`, `nudito-lecturas-comunicacion` (esquema, sin duplicados, respuestas que verifican, longitudes por grado,
  rúbricas, selector sin repetición). `nudito-catalogo-fuentes` (cruce con el catálogo de A).
- `nudito-evaluadores` (todos los tipos, equivalencias, parciales, texto flexible, rúbrica simulada → incierto, IA con confianza
  baja o salida inválida → incierto). `nudito-politica-dominio` (sin dominio en 1 sesión, horas entre sesiones, pistas restan,
  respuesta revelada, comprobación obligatoria, subir/bajar, reforzar, motivo, desbloqueo solo con prerrequisitos, política
  del colegio).

## Pendientes
- **Revisión pedagógica humana** de todo el banco de Ciencia, lecturas, ítems de lengua y consignas (`revisadoPor: null`).
- Subtemas de Matemática del catálogo sin subtipo propio (usan el más cercano): valor posicional, números decimales y operaciones
  con decimales, potencias y raíces, multiplicación de fracciones, fracción de una cantidad, suma de una progresión,
  inecuaciones.
- C: pasar `contexto` de prerrequisitos a `evaluarDominio`, acotar la dificultad a `tema.dificultad`, enviar `usados` a
  `ejercicioPara` y guardar eventos con su motivo.
