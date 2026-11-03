-- NSP / «No entregó» (specs/37): una nota con marca puede no tener valor. Antes se exigía exactamente un valor
-- (literal o numérico); ahora: como máximo un valor, y sin valor solo si tiene marca. Reemplaza `notas_un_valor` y la
-- restricción provisional `notas_valor_o_marca` de la migración anterior.
ALTER TABLE public.notas DROP CONSTRAINT IF EXISTS notas_valor_o_marca;
ALTER TABLE public.notas DROP CONSTRAINT IF EXISTS notas_un_valor;
ALTER TABLE public.notas ADD CONSTRAINT notas_un_valor CHECK (
  NOT (valor_literal IS NOT NULL AND valor_numerico IS NOT NULL)
  AND (marca IS NOT NULL OR valor_literal IS NOT NULL OR valor_numerico IS NOT NULL)
);
