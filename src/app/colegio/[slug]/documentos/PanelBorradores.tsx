import { IndicadorAlmacenamiento } from "./IndicadorAlmacenamiento";

export function PanelBorradores({ usado }: { usado: number }) {
  return <div className="mb-5"><IndicadorAlmacenamiento usado={usado} limite={2 * 1024 ** 3} titulo="Espacio de mis borradores" /></div>;
}
