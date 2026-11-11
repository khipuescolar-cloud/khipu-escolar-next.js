# 53 — Importación y fusión editorial del currículo

> Estado: en desarrollo · Plan: interno (catálogo global de Nudito Pro) · Última actualización: 2026-11-09 (Codex)

## Objetivo
Previsualizar cómo los 1145 candidatos editoriales del paquete KHIPU-CURRICULUM se integran con los temas actuales sin perder claves ni crear títulos amplios que el banco ya desarrolla. Ningún contenido se publica ni modifica automáticamente.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Equipo Khipu | Ejecutar el reporte local y revisar el mapeo versionado | Publicar sin revisión pedagógica y legal |
| Colegio, profesor, familia, alumno | Ninguna operación en esta fase | Importar o aprobar candidatos |

## Flujos
1. El operador ejecuta el script con --paquete y ruta local. El SHA-256 del JSON debe coincidir con el mapeo versionado.
2. Se validan código estable, grado, ciclo, área, disciplina, estado y procedencia.
3. Para Matemática, Comunicación y Ciencia y Tecnología, se consulta data/curriculum/mapeo-fusion.json: una decisión explícita por stable_code. Para las otras nueve áreas solo hay inventario.
4. Emparejado conserva una clave existente del mismo área y grado. Cubierto referencia dos o más claves existentes del mismo área y grado o de un grado vecino (±1), sin crear tema. Nuevo recibe clave derivada de stable_code. Conflicto registra la duda de equivalencia, alcance o grado para revisión humana.
5. El reporte lista todas las decisiones, conteos por área y grado, y ejemplos de cada tipo por área. La segunda corrida simulada incorpora solo las claves nuevas a una copia en memoria y verifica cero altas.

## Reglas de negocio
- El modo es siempre dry-run. El script no escribe temarios, fichas ni BD. Ningún candidato se publica.
- Los títulos son propuestas editoriales, no temas oficiales MINEDU. Permanecen en borrador con validación de grado y licencia pendientes.
- Un tema global puede servir a curso integrado o dividido; el mapeo de área y disciplina usa DISCIPLINAS y CURSOS_KHIPU. RMA se clasifica provisionalmente en aritmética para esta previsualización.
- No se infiere una equivalencia por similitud textual en tiempo de ejecución. El mapeo es el contrato determinista y revisable. Una decisión ausente, una clave incorrecta o un cambio del paquete bloquean la operación o se reportan como conflicto.
- Se conserva la clave actual en emparejados y se evita la alta de contenido ya cubierto. Las claves nuevas no se aplican hasta aprobación editorial.
- El paquete se lee desde ruta externa porque su metadato declara licencia pendiente de revisión. El repositorio solo guarda el mapeo de códigos y claves.

## Modelo de datos
Sin cambios en Prisma ni datos persistidos. Insumos: JSON editorial externo, 33 temarios del banco y mapeo JSON versionado. Cada decisión tiene tipo, claves y motivo; el mapeo fija el SHA-256 del catálogo fuente.

## Contratos de código puro
fusionar(candidatos, banco, mapeo) devuelve emparejados, cubiertos, nuevos, conflictos e inventario. validarCandidato(candidato) devuelve motivo de rechazo o null. simularSegundaCorrida demuestra idempotencia en memoria.

## Rutas y UI
Ninguna en esta fase. Reporte Markdown para revisión editorial.

## Errores y casos borde
Código repetido, grado/ciclo/estado inválidos y claves inexistentes o fuera de área/grado se registran como conflictos. Un mapeo incompleto o de otra versión del paquete aborta el script. Las dudas pedagógicas permanecen como conflicto con motivo explícito.

## Pruebas
Unitarias de validación, cobertura por grado vecino, claves inválidas, duplicados, inventario e idempotencia; lint, typecheck y suite general.

## Pendientes
Carlos revisa los conflictos y las altas propuestas antes de aplicar cambios. Deben verificarse licencias y correspondencia con desempeños por grado. La aprobación institucional del temario sigue la regla de aceptación de todos los profesores (specs/48); dirección observa el estado.
