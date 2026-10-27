-- DropForeignKey
ALTER TABLE "alumnos" DROP CONSTRAINT "alumnos_salon_id_fkey";

-- DropForeignKey
ALTER TABLE "asistencias" DROP CONSTRAINT "asistencias_registrado_por_fkey";

-- DropForeignKey
ALTER TABLE "eventos_agenda" DROP CONSTRAINT "eventos_agenda_creado_por_fkey";

-- DropForeignKey
ALTER TABLE "notas" DROP CONSTRAINT "notas_registrado_por_fkey";

-- DropForeignKey
ALTER TABLE "tareas" DROP CONSTRAINT "tareas_creado_por_fkey";

-- AddForeignKey
ALTER TABLE "alumnos" ADD CONSTRAINT "alumnos_salon_id_fkey" FOREIGN KEY ("salon_id") REFERENCES "salones"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "memberships"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas" ADD CONSTRAINT "notas_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "memberships"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "memberships"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_agenda" ADD CONSTRAINT "eventos_agenda_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "memberships"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
