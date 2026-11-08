import { redirect } from "next/navigation";

/** El horario se mudó a la Agenda (specs/34): los enlaces viejos a `/horario/…` siguen funcionando. */
export default async function HorarioMovido({ params, searchParams }: PageProps<"/colegio/[slug]/horario/[[...resto]]">) {
  const { resto } = await params;
  const sp = await searchParams;
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) for (const x of [v].flat()) if (typeof x === "string") query.append(k, x);
  const ruta = ["/agenda/horario", ...(resto ?? []).map(encodeURIComponent)].join("/");
  redirect(query.size ? `${ruta}?${query}` : ruta);
}
