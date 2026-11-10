# 53 — Importación y fusión editorial del currículo

> Estado: en desarrollo · Plan: interno (catálogo global de Nudito Pro) · Última actualización: 2026-11-09 (Codex)

## Objetivo
Previsualizar cómo los 1145 candidatos editoriales del paquete KHIPU-CURRICULUM se integran con los temas actuales sin perder sus claves. Ningún contenido se publica ni se modifica automáticamente.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Equipo Khipu | Ejecutar el reporte local y revisar emparejamientos | Publicar sin revisión pedagógica y legal |
| Colegio, profesor, familia, alumno | Ninguna operación en esta fase | Importar o aprobar candidatos |

## Flujos
1. El operador ejecuta el script con --paquete y una ruta local al paquete.
2. Se validan código estable, grado, ciclo, área, disciplina, estado y procedencia.
3. Solo Matemática, Comunicación y Ciencia y Tecnología se comparan con el banco Nudito actual.
4. Coincidencia única por título normalizado o similitud alta conserva la clave actual. Coincidencia dudosa o ambigua va a conflictos. Título distinto recibe clave propuesta derivada de stable_code.
5. Las otras nueve áreas quedan en inventario. Se genera docs/curriculum/reporte-fusion.md para Carlos.
6. La segunda corrida simulada incorpora las claves nuevas a una copia en memoria y verifica cero altas.

## Reglas de negocio
- El modo es siempre dry-run. El script no escribe temarios, fichas ni BD.
- Los 1145 títulos son propuestas editoriales, no temas oficiales MINEDU. Todos permanecen en borrador con validación de grado y licencia pendientes.
- Un tema global puede servir a curso integrado o dividido; el mapeo usa DISCIPLINAS y CURSOS_KHIPU. RMA se clasifica provisionalmente en aritmética para comparar.
- El informe muestra todas las filas y conteos por área, grado y tipo. Los conflictos requieren revisión humana.
- Las claves actuales se conservan. Las nuevas se derivan del stable_code y no se aplican hasta aprobación.
- El paquete se lee desde ruta externa porque su metadato declara licencia pendiente de revisión.

## Modelo de datos
Sin cambios en Prisma ni datos persistidos. Insumos: JSON editorial externo y 33 temarios del banco.

## Contratos de código puro
fusionar(candidatos, banco) devuelve emparejados, nuevos, conflictos e inventario. validarCandidato(candidato) devuelve el motivo de rechazo o null. simularSegundaCorrida demuestra idempotencia en memoria.

## Rutas y UI
Ninguna en esta fase. Reporte Markdown para revisión editorial.

## Errores y casos borde
Código repetido, grado/ciclo/estado inválidos y varias coincidencias exactas se registran como conflictos. Similitud entre 0,62 y el umbral de emparejamiento requiere revisión.

## Pruebas
Unitarias de validación, equivalencia, ambigüedad, inventario e idempotencia; lint, typecheck y suite general.

## Pendientes
Carlos revisa el informe antes de aplicar cambios. Deben verificarse licencias y correspondencia con desempeños por grado. La aprobación institucional del temario sigue la regla de aceptación de todos los profesores (specs/48); dirección observa el estado.
