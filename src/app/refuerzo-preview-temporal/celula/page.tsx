import { notFound } from "next/navigation";
import { clasePublica } from "@/lib/nudito/conocimiento/clase-guiada";
import { esquemaFicha } from "@/lib/nudito/conocimiento/esquema";
import fichasCrudas from "@/lib/nudito/conocimiento/banco/ciencia-tecnologia/primaria-5/fichas/la-celula.json";
import { VistaCelula } from "./VistaCelula";

export default function PreviewCelula() {
  const fichaCruda = fichasCrudas.find((entrada) => entrada.clave === "cyt.p5.la-celula");
  if (!fichaCruda) notFound();
  const ficha = esquemaFicha.parse(fichaCruda);
  if (!ficha.claseGuiada) notFound();
  return <VistaCelula tema={ficha.nombre} clase={clasePublica(ficha.claseGuiada)} />;
}
