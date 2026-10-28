import type { Metadata } from "next";
import Link from "next/link";
import { Alerta } from "@/components/ui/Alerta";
import { MAX_SOLICITUDES_POR_HORA } from "@/lib/server/solicitudes";
import { correoContactoPublico } from "@/lib/server/landing";

// Privacidad del formulario «Solicita una demo» (specs/25). BORRADOR: lo debe revisar un abogado
// (pendiente legal de specs/15 y del documento 09 de marca).

export const metadata: Metadata = {
  title: { absolute: "Privacidad · Khipu Escolar" },
  description: "Qué datos guarda Khipu Escolar cuando un colegio solicita una demo y para qué los usa.",
  alternates: { canonical: "/privacidad" },
};

export default async function PrivacidadPage() {
  const contacto = await correoContactoPublico();
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-12 sm:px-6 sm:py-16">
      <div className="flex flex-col gap-3">
        <p className="text-sobretitulo text-pizarra uppercase">Privacidad</p>
        <h1 className="font-heading text-titulo-1 text-balance sm:text-[40px] sm:leading-[46px]">Cómo usamos los datos de la solicitud de demo</h1>
        <p className="text-cuerpo text-muted-foreground">Última actualización: 28 de octubre de 2026.</p>
      </div>

      <Alerta tipo="aviso">Borrador pendiente de revisión por un abogado. Puede cambiar antes del lanzamiento.</Alerta>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-titulo-2">Qué datos guardamos</h2>
        <p className="text-cuerpo">Cuando completa el formulario «Solicita una demo» guardamos lo que usted escribe:</p>
        <ul className="ml-5 flex list-disc flex-col gap-1.5 text-cuerpo">
          <li>Nombre, cargo, colegio y ciudad.</li>
          <li>Correo y teléfono de contacto.</li>
          <li>Número aproximado de alumnos, plan de interés y su mensaje.</li>
          <li>
            Un código cifrado de la conexión desde la que se envió (no la dirección IP en claro), solo para evitar envíos automáticos: aceptamos hasta {MAX_SOLICITUDES_POR_HORA} solicitudes por hora desde la misma
            conexión.
          </li>
        </ul>
        <p className="text-cuerpo">No pedimos datos de alumnos ni de familias en este formulario. Por favor, no los escriba en el mensaje.</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-titulo-2">Para qué los usamos</h2>
        <ul className="ml-5 flex list-disc flex-col gap-1.5 text-cuerpo">
          <li>Para responderle y coordinar la demo.</li>
          <li>Para preparar una propuesta según el tamaño de su colegio y el plan que le interesa.</li>
        </ul>
        <p className="text-cuerpo">No vendemos ni compartimos estos datos con terceros para publicidad. Solo los ve el equipo de Khipu Escolar.</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-titulo-2">Sus derechos</h2>
        <p className="text-cuerpo">
          Según la Ley 29733 de Protección de Datos Personales, puede pedirnos ver, corregir o borrar sus datos en cualquier momento
          {contacto ? (
            <>
              {" "}
              escribiendo a{" "}
              <a href={`mailto:${contacto}`} className="enlace">
                {contacto}
              </a>
            </>
          ) : null}
          .
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-titulo-2">Datos de los colegios que usan Khipu Escolar</h2>
        <p className="text-cuerpo">
          Los datos de alumnos, familias y personal de cada colegio se rigen por el contrato con el colegio y por el consentimiento que cada familia da dentro de la plataforma. Esta página trata solo del
          formulario de demo.
        </p>
      </section>

      <Link href="/" className="enlace w-fit text-cuerpo">
        ← Volver al inicio
      </Link>
    </article>
  );
}
