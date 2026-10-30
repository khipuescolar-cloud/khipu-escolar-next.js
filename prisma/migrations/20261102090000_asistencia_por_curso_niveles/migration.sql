-- Asistencia por curso configurable por nivel (specs/04). Solo agrega una columna con valor por defecto: no toca datos.
-- Por defecto ningún nivel: la dirección la activa en Configuración.
ALTER TABLE "tenants" ADD COLUMN "asistencia_por_curso_niveles" "Nivel"[] DEFAULT ARRAY[]::"Nivel"[];
