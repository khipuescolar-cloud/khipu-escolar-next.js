import Link from "next/link";
import { NuditoMascota } from "@/components/nudito/NuditoMascota";
import { buttonVariants } from "@/components/ui/button";
import type { MotivoSinAcceso } from "@/lib/server/nudito-plus/acceso";

/** Textos amables según el motivo (specs/44). Nudito nunca da malas noticias: siempre dice qué hacer. */
export function textoSinAcceso(motivo: MotivoSinAcceso, nombre: string, vista: "alumno" | "familia"): { titulo: string; texto: string } {
  if (motivo === "colegio") return { titulo: "Nudito aún no está disponible", texto: "Tu colegio todavía no activó Nudito. Cuando lo haga, aquí podrás practicar." };
  if (motivo === "grado") return { titulo: "Nudito aún no está disponible para este grado", texto: "Tu colegio eligió en qué grados y cursos se usa Nudito. Pronto podrás practicar aquí." };
  if (motivo === "modo_hijo") return { titulo: "El modo hijo no está disponible", texto: `Tu colegio no habilitó el modo hijo. ${nombre} puede usar Nudito con su propia cuenta de alumno.` };
  if (vista === "alumno") {
    return { titulo: "Pide a tu familia que autorice Nudito", texto: "Falta que tu familia acepte el uso de Nudito desde su cuenta de Khipu. Cuando lo haga, aquí podrás practicar." };
  }
  if (motivo === "cuenta_propia") return { titulo: `${nombre} ya tiene su propia cuenta`, texto: `Para usar Nudito, que ${nombre} entre con su cuenta de alumno.` };
  return { titulo: `Acepta el uso de Nudito para ${nombre}`, texto: "Antes de usarlo, necesitamos tu autorización para el uso de inteligencia artificial." };
}

/** Página amable cuando el colegio no activó Nudito, falta el consentimiento o el hijo ya tiene cuenta propia (specs/44). */
export function SinAccesoNuditoPlus({ motivo, nombre, vista }: { motivo: MotivoSinAcceso; nombre: string; vista: "alumno" | "familia" }) {
  const { titulo, texto } = textoSinAcceso(motivo, nombre, vista);
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-xl border bg-card px-6 py-10 text-center" data-testid="nudito-plus-sin-acceso">
      <NuditoMascota tamano={88} estado="reposo" />
      <h1 className="font-heading text-titulo-3">{titulo}</h1>
      <p className="font-nudito text-voz-nudito text-muted-foreground">{texto}</p>
      <Link href="/inicio" className={buttonVariants({ variant: "outline" })}>
        Volver al inicio
      </Link>
    </div>
  );
}
