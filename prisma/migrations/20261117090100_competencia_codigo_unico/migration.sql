-- Una competencia oficial por curso y código; los valores NULL de personalizadas pueden repetirse.
CREATE UNIQUE INDEX "competencias_curso_id_codigo_oficial_key" ON "competencias"("curso_id", "codigo_oficial");
