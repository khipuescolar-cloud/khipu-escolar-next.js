import { notFound, redirect } from "next/navigation";

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** «Modo hijo» antiguo (specs/29): ahora el hijo sin cuenta practica con el tutor Nudito en `/nudito?alumno=<id>` (specs/41). */
export default async function NuditoPlusModoHijoPage({ params }: PageProps<"/colegio/[slug]/nudito-plus/hijo/[alumnoId]">) {
  const { alumnoId } = await params;
  if (!RE_UUID.test(alumnoId)) notFound();
  redirect(`/nudito?alumno=${alumnoId}`);
}
