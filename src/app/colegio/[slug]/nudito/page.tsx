import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { ChevronRight, Info } from "lucide-react";
import { ConversacionNudito } from "@/components/nudito/ConversacionNudito";
import { NuditoMascota } from "@/components/nudito/NuditoMascota";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { evaluarAccesoTutor, type MotivoSinAccesoTutor } from "@/lib/server/nudito/acceso-tutor";
import { iniciarSesion } from "@/lib/server/nudito/sesiones";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";

export const metadata: Metadata = { title: "Nudito" };

const AVISO_IA = "Soy Nudito, un asistente con IA. Te ayudo a practicar; no reemplazo a tu profesor. Puedo equivocarme.";

const SIN_ACCESO: Record<Exclude<MotivoSinAccesoTutor, "plan" | "rol" | "elegir_hijo">, { titulo: string; texto: string; enlace?: { href: string; texto: string } }> = {
  apagado: { titulo: "Nudito aún no está activo", texto: "Tu colegio todavía no activó Nudito. Cuando lo haga, podrás practicar aquí." },
  cuenta_propia: { titulo: "Tiene su propia cuenta", texto: "Tu hijo o hija ya tiene cuenta en Khipu: que entre con ella para practicar con Nudito." },
  modo_hijo: { titulo: "Nudito se usa con la cuenta del alumno", texto: "Tu colegio no habilitó el uso de Nudito desde la cuenta de la familia." },
  consentimiento: {
    titulo: "Falta la autorización de la familia",
    texto: "Para usar Nudito, tu mamá, papá o apoderado debe aceptar el uso de la inteligencia artificial en Khipu.",
    enlace: { href: "/nudito-plus", texto: "Ir a la autorización" },
  },
  grado: { titulo: "Nudito aún no está disponible para tu grado", texto: "Pronto podremos practicar juntos. Mientras tanto, repasa con tus cuadernos." },
};

/** Tutor Nudito (specs/41): alumno con su cuenta o apoderado en modo hijo (`/nudito?alumno=<id>`). */
export default async function NuditoPage({ params, searchParams }: PageProps<"/colegio/[slug]/nudito">) {
  const { slug } = await params;
  const { alumno } = await searchParams;
  const ctx = await requireTenantContext(slug, ["alumno", "apoderado"]);
  requireFeature(ctx, "nudito_plus");
  const r = await evaluarAccesoTutor(ctx, typeof alumno === "string" ? alumno : null);

  if (!r.ok) {
    if (r.motivo === "plan" || r.motivo === "rol") forbidden();
    if (r.motivo === "elegir_hijo") {
      return (
        <div className="flex w-full flex-col">
          <EncabezadoPagina titulo="Nudito" seccion="academico" descripcion="Elige con quién vas a practicar." />
          {r.hijos && r.hijos.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {r.hijos.map((h) => (
                <li key={h.id}>
                  <Link href={`/nudito?alumno=${h.id}`} className="flex min-h-14 items-center gap-3 rounded-[var(--radio-lg)] border border-borde-sutil bg-superficie p-3 font-semibold outline-none hover:bg-sec-suave focus-visible:ring-2 focus-visible:ring-ring">
                    <NuditoMascota tamano={32} variante="avatar" />
                    <span className="flex-1">{h.nombre}</span>
                    <ChevronRight className="size-5 text-muted-foreground" strokeWidth={2} aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No encontramos hijos vinculados a tu cuenta.</p>
          )}
        </div>
      );
    }
    const info = SIN_ACCESO[r.motivo];
    return (
      <div className="flex w-full flex-col">
        <EncabezadoPagina titulo="Nudito" seccion="academico" />
        <div className="flex flex-col items-center gap-3 rounded-[var(--radio-lg)] border border-borde-sutil bg-superficie p-6 text-center">
          <NuditoMascota tamano={80} estado="reposo" />
          <h2 className="font-titulo text-titulo-2">{info.titulo}</h2>
          <p className="max-w-prose text-muted-foreground">{info.texto}</p>
          {info.enlace && ctx.rol === "apoderado" && (
            <Link href={info.enlace.href} className="inline-flex min-h-11 items-center rounded-[var(--radio-md)] bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary/90">
              {info.enlace.texto}
            </Link>
          )}
        </div>
      </div>
    );
  }

  const inicial = await iniciarSesion(ctx, r.acceso, { alumnoId: r.acceso.alumno.id });
  return (
    <div className="flex flex-col">
      <EncabezadoPagina titulo="Nudito" seccion="academico" descripcion={r.acceso.modo === "hijo" ? `Practicando con ${r.alumno.primerNombre}.` : "Tu tutor para practicar a tu ritmo."} />
      <p className="mb-4 flex w-full items-start gap-2 rounded-[var(--radio-md)] bg-superficie-2 px-3 py-2 text-cuerpo-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden />
        {AVISO_IA}
      </p>
      <ConversacionNudito alumnoId={r.acceso.modo === "hijo" ? r.acceso.alumno.id : null} nivel={r.alumno.nivel} inicial={inicial} permitirFotos={r.config.permitirFotos} />
    </div>
  );
}
