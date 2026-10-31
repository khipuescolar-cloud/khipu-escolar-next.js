-- Comunicados por nivel y por grado (specs/09). Aditiva: los existentes quedan como «todo el colegio» o «salón».
ALTER TABLE "comunicados" ADD COLUMN "niveles" "Nivel"[] DEFAULT ARRAY[]::"Nivel"[];
ALTER TABLE "comunicados" ADD COLUMN "grado" INTEGER;
