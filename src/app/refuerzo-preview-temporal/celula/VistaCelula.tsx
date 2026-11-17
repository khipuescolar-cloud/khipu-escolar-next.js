"use client";

import { useState } from "react";
import { Repaso } from "@/components/nudito/Repaso";
import type { ClaseGuiadaPublica } from "@/lib/nudito/conocimiento/clase-guiada";

export function VistaCelula({ tema, clase }: { tema: string; clase: ClaseGuiadaPublica }) {
  const [practica, setPractica] = useState(false);
  return <main className="mx-auto max-w-3xl px-4 py-8">
    <h1 className="font-titulo text-2xl font-semibold">Vista temporal · La célula</h1>
    <p className="mb-6 mt-2 text-cuerpo text-muted-foreground">Esta vista sirve para revisar el texto, las imágenes y la narración antes de aprobar la ficha. Las respuestas no se califican aquí.</p>
    {practica ? <p role="status" className="rounded-[var(--radio-md)] bg-superficie-2 p-4">La revisión llegó al final de la clase guiada.</p> : <Repaso
      tema={tema}
      idea=""
      ejemplo=""
      explicacion=""
      recursos={[]}
      ocupado={false}
      onOtraVez={() => {}}
      onPracticar={() => setPractica(true)}
      comprobacion={clase.comprobacion}
      claseGuiada={clase}
      onComprobar={async () => ({ correcto: true, mensaje: "En esta vista temporal comprobamos el recorrido, no calificamos la respuesta." })}
    />}
  </main>;
}
