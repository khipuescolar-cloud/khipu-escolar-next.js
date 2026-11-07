ALTER TABLE "tarea_cursos" ADD COLUMN "competencia_id" UUID;
ALTER TABLE "tarea_cursos" ADD CONSTRAINT "tarea_cursos_competencia_id_fkey" FOREIGN KEY ("competencia_id") REFERENCES "competencias"("id") ON DELETE SET NULL;
