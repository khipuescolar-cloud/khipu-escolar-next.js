-- Periodos por nivel (specs/11): el colegio decide si cada nivel trabaja por bimestres, trimestres o semestres.
-- Los periodos que ya existían valen para todos los niveles, como hasta ahora.
ALTER TABLE "periodos" ADD COLUMN "niveles" "Nivel"[] NOT NULL DEFAULT ARRAY['inicial', 'primaria', 'secundaria', 'academia']::"Nivel"[];
