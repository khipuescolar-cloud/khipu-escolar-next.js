import { IndicadorAlmacenamiento } from "./IndicadorAlmacenamiento";

export function PanelBorradores({ usado, limite }: { usado: number; limite: number }) {
  return <div className="mb-5"><IndicadorAlmacenamiento usado={usado} limite={limite} titulo="Espacio de mis borradores" /></div>;
}
