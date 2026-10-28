"use client";

import { Check } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ROLES = [
  {
    valor: "direccion",
    nombre: "Dirección",
    titulo: "Todo el colegio en una pantalla",
    puntos: [
      "Ve si los avisos de asistencia llegaron a cada familia y cuántos se abrieron.",
      "Administra profesores, personal, grados y salones, alumnos y familias, y carga listas por CSV.",
      "Imprime los carnets con QR por salón y publica comunicados para todo el colegio o un salón.",
      "Cierra las notas de cada curso, publica la libreta y exporta los datos del colegio cuando lo necesite.",
    ],
  },
  {
    valor: "profesores",
    nombre: "Profesores",
    titulo: "Menos tiempo avisando, más tiempo enseñando",
    puntos: [
      "Pasa lista en menos de un minuto, también desde el celular y sin conexión.",
      "Las familias reciben el aviso solas: ya no hay que escribir uno por uno.",
      "Conversa con las familias de sus salones sin dar su número de teléfono.",
      "Registra notas por competencias, publica tareas y revisa justificaciones en el mismo lugar.",
    ],
  },
  {
    valor: "familias",
    nombre: "Familias",
    titulo: "Sabes cómo está tu hijo, el mismo día",
    puntos: [
      "Recibes un aviso cuando tu hijo llega, llega tarde o no llega al colegio.",
      "Justificas una falta en un minuto, desde el correo o desde Khipu.",
      "Escribes a la tutora sin compartir tu teléfono, y ves notas, tareas y comunicados.",
      "Con Nudito preguntas qué tareas hay o qué fechas vienen, con los datos reales del colegio.",
    ],
  },
] as const;

/** «Para cada rol» (specs/25): pestañas Dirección · Profesores · Familias. */
export function PestanasRoles() {
  return (
    <Tabs defaultValue="direccion" className="gap-6">
      <TabsList className="h-auto! w-full max-w-md flex-wrap gap-1 p-1 sm:w-fit">
        {ROLES.map((r) => (
          <TabsTrigger key={r.valor} value={r.valor} className="min-h-10 flex-1 px-4 text-cuerpo-sm sm:flex-none">
            {r.nombre}
          </TabsTrigger>
        ))}
      </TabsList>
      {ROLES.map((r) => (
        <TabsContent key={r.valor} value={r.valor} className="rounded-lg border border-arena bg-superficie p-6 sm:p-8">
          <h3 className="font-heading text-titulo-2 text-balance">{r.titulo}</h3>
          <ul className="mt-5 grid gap-4 md:grid-cols-2">
            {r.puntos.map((p) => (
              <li key={p} className="flex items-start gap-3 text-cuerpo">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-turquesa/10 text-turquesa">
                  <Check className="size-4" strokeWidth={2} aria-hidden />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </TabsContent>
      ))}
    </Tabs>
  );
}
