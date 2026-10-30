import Link from "next/link";
import { NuditoMascota } from "@/components/nudito/NuditoMascota";
import { buttonVariants } from "@/components/ui/button";
import type { MotivoSinAcceso } from "@/lib/server/nudito-plus/acceso";

/** Página amable cuando falta la licencia, el consentimiento o el hijo ya tiene cuenta propia (specs/29). */
export function SinAccesoNuditoPlus({ motivo, nombre, vista }: { motivo: MotivoSinAcceso; nombre: string; vista: "alumno" | "familia" }) {
  let titulo: string;
  let texto: string;
  if (vista === "alumno") {
    titulo = "Pide a tu familia que active Nudito+";
    texto =
      motivo === "consentimiento"
        ? "Falta que tu familia acepte el uso de Nudito+ desde su cuenta de Khipu. Cuando lo haga, aquí podrás practicar."
        : "Nudito+ es un tutor con IA que te ayuda a practicar paso a paso. Tu familia puede activarlo desde su cuenta de Khipu.";
  } else if (motivo === "cuenta_propia") {
    titulo = `${nombre} ya tiene su propia cuenta`;
    texto = `Para usar Nudito+, que ${nombre} entre con su cuenta de alumno.`;
  } else if (motivo === "consentimiento") {
    titulo = `Acepta el uso de Nudito+ para ${nombre}`;
    texto = "Antes de usarlo, necesitamos tu consentimiento para el uso de inteligencia artificial.";
  } else {
    titulo = `Activa Nudito+ para ${nombre}`;
    texto = "Nudito+ necesita una licencia vigente. Puedes activarla desde la sección Nudito+.";
  }
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
