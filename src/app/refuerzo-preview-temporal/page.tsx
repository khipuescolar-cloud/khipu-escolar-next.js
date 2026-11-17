"use client";

import { useState } from "react";
import { Repaso } from "@/components/nudito/Repaso";
import datos from "./datos.json";
import type { ClaseGuiadaPublica } from "@/lib/nudito/conocimiento/clase-guiada";

const CLAVE_INICIAL = "com.p1.datos-del-texto";
const CLAVES_REVISION = new Set([
  "com.p1.datos-del-texto",
  "com.p1.personajes",
  "cyt.p1.objetos-tecnologicos",
  "cyt.p1.el-suelo",
  "cyt.p1.seres-vivos-necesidades",
]);
const fichasRevision = datos.filter(ficha => CLAVES_REVISION.has(ficha.clave));
const INDICE_INICIAL = Math.max(0, fichasRevision.findIndex(ficha => ficha.clave === CLAVE_INICIAL));

export default function PreviewTemporal() {
  const [indice, setIndice] = useState(INDICE_INICIAL);
  const [practica, setPractica] = useState(false);
  const ficha = fichasRevision[indice];
  const clase = ficha.clase;
  const { respuesta, ...comprobacion } = clase.comprobacion;
  const publica = { ...clase, comprobacion } as unknown as ClaseGuiadaPublica;
  return <main className="mx-auto max-w-3xl px-4 py-8">
    <h1 className="mb-4 text-2xl font-semibold">Vista temporal de clase guiada</h1>
    <label htmlFor="tema-preview">Tema</label>
    <select id="tema-preview" className="mb-6 block w-full rounded border p-3" value={indice} onChange={e => { setIndice(Number(e.target.value)); setPractica(false); }}>
      {fichasRevision.map((d, i) => <option key={d.clave} value={i}>{d.clave}: {d.nombre}</option>)}
    </select>
    <p className="mb-4 text-sm text-muted-foreground">
      Este tema contiene {clase.recursos.length} {clase.recursos.length === 1 ? "imagen o diagrama" : "imágenes o diagramas"} distintos. La lección muestra uno por momento; usa <strong>Siguiente</strong> para recorrerlos.
    </p>
    {practica ? <p role="status">Práctica solicitada</p> : <Repaso key={ficha.clave} tema={ficha.nombre} idea="" ejemplo="" explicacion="" recursos={[]} ocupado={false} onOtraVez={() => {}} onPracticar={() => setPractica(true)} comprobacion={publica.comprobacion} claseGuiada={publica} onComprobar={async opcionId => ({ correcto: opcionId === respuesta, mensaje: opcionId === respuesta ? clase.comprobacion.mensajeCorrecto : clase.comprobacion.pista })} />}
  </main>;
}
