import { createHash } from "node:crypto";
import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import {
  fusionar,
  simularSegundaCorrida,
  type Candidato,
  type FilaFusion,
  type TemaBanco,
} from "../../src/lib/curriculum/importacion/fusion";

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || !args.includes("--paquete")) {
    console.log(
      "Uso: pnpm exec tsx scripts/curriculum/reporte-fusion.ts --paquete /ruta/KHIPU-CURRICULUM [--dry-run]",
    );
    process.exit(args.includes("--help") ? 0 : 1);
  }
  if (
    args.some(
      (a) => a.startsWith("--") && !["--paquete", "--dry-run"].includes(a),
    )
  )
    throw new Error(
      "Solo se permite --dry-run; la aplicación requiere revisión humana.",
    );
  const paquete = args[args.indexOf("--paquete") + 1];
  if (!paquete || paquete.startsWith("--"))
    throw new Error("Falta la ruta del paquete.");
  const contenidoCatalogo = await readFile(
    resolve(paquete, "data/catalogo-inicial.json"),
  );
  const candidatos = JSON.parse(
    contenidoCatalogo.toString("utf8"),
  ) as Candidato[];
  const mapeoArchivo = JSON.parse(
    await readFile(resolve("data/curriculum/mapeo-fusion.json"), "utf8"),
  ) as {
    version: number;
    sha256Catalogo: string;
    decisiones: import("../../src/lib/curriculum/importacion/fusion").MapeoEditorial;
  };
  if (mapeoArchivo.version !== 1)
    throw new Error("Versión del mapeo no reconocida.");
  if (
    mapeoArchivo.sha256Catalogo !==
    createHash("sha256").update(contenidoCatalogo).digest("hex")
  )
    throw new Error(
      "El paquete no coincide con la versión revisada del mapeo.",
    );
  const codigosNudito = candidatos
    .filter((c) => ["MAT", "COM", "CYT"].includes(c.area_code))
    .map((c) => c.stable_code);
  if (
    codigosNudito.some((c) => !mapeoArchivo.decisiones[c]) ||
    Object.keys(mapeoArchivo.decisiones).length !== codigosNudito.length
  )
    throw new Error("El mapeo no cubre exactamente los candidatos Nudito.");
  const bancoRoot = resolve("src/lib/nudito/conocimiento/banco");
  const archivos: string[] = [];
  for (const area of await readdir(bancoRoot))
    for (const grado of await readdir(join(bancoRoot, area))) {
      const archivo = join(bancoRoot, area, grado, "temario-propuesto.json");
      try {
        await readFile(archivo);
        archivos.push(archivo);
      } catch {
        /* carpeta sin temario */
      }
    }
  const banco: TemaBanco[] = [];
  for (const archivo of archivos.sort()) {
    const temario = JSON.parse(await readFile(archivo, "utf8")) as {
      area: string;
      nivel: "primaria" | "secundaria";
      grado: number;
      competencias: {
        capacidades: {
          bloques: {
            temas: { clave: string; nombre: string; disciplina?: string }[];
          }[];
        }[];
      }[];
    };
    for (const comp of temario.competencias)
      for (const cap of comp.capacidades)
        for (const bloque of cap.bloques)
          for (const tema of bloque.temas)
            banco.push({
              ...tema,
              area: temario.area,
              nivel: temario.nivel,
              grado: temario.grado,
            });
  }
  const filas = fusionar(candidatos, banco, mapeoArchivo.decisiones);
  const segunda = simularSegundaCorrida(
    candidatos,
    banco,
    mapeoArchivo.decisiones,
  );
  const tipos = [
    "emparejado",
    "cubierto",
    "nuevo",
    "conflicto",
    "inventario",
  ] as const;
  const conteo = (lista: readonly FilaFusion[]) =>
    Object.fromEntries(
      tipos.map((t) => [t, lista.filter((f) => f.tipo === t).length]),
    );
  function tabla(
    lista: readonly FilaFusion[],
    campo: "area" | "grado",
  ): string {
    const grupos = [...new Set(lista.map((f) => f[campo]))].sort();
    return (
      "| " +
      (campo === "area" ? "Área" : "Grado") +
      " | Emparejados | Cubiertos | Nuevos | Conflictos | Inventario | Total |\n|---|---:|---:|---:|---:|---:|---:|\n" +
      grupos
        .map((g) => {
          const x = lista.filter((f) => f[campo] === g);
          const n = conteo(x);
          return (
            "| " +
            g +
            " | " +
            tipos.map((t) => n[t]).join(" | ") +
            " | " +
            x.length +
            " |"
          );
        })
        .join("\n")
    );
  }
  function detalle(tipo: FilaFusion["tipo"]): string {
    return filas
      .filter((f) => f.tipo === tipo)
      .map(
        (f) =>
          "| " +
          [
            f.codigo,
            f.titulo.replaceAll("|", "\\|"),
            f.area,
            f.grado,
            f.disciplina ?? "—",
            f.clave ?? f.claves?.join(", ") ?? "—",
            (f.motivo ?? "—").replaceAll("|", "\\|"),
          ].join(" | ") +
          " |",
      )
      .join("\n");
  }
  function ejemplos(area: string): string {
    const x = filas.filter((f) => f.area === area);
    const elegidos = (
      ["emparejado", "cubierto", "nuevo", "conflicto"] as const
    ).flatMap((tipo) => x.filter((f) => f.tipo === tipo).slice(0, 2));
    return elegidos
      .map(
        (f) =>
          "| " +
          [
            f.codigo,
            f.titulo,
            f.tipo,
            f.clave ?? f.claves?.join(", ") ?? "—",
            f.motivo ?? "—",
          ].join(" | ") +
          " |",
      )
      .join("\n");
  }
  const totales = conteo(filas),
    segundaCuenta = conteo(segunda);
  const reporte = [
    "# Reporte de fusión editorial (dry-run)",
    "",
    "Origen: paquete KHIPU-CURRICULUM v0.1. Decisiones editoriales versionadas en data/curriculum/mapeo-fusion.json. No se copian candidatos ni se modifica el banco.",
    "",
    "Criterio: se conserva la clave de un tema equivalente; un título amplio puede quedar cubierto por varios temas del mismo grado o un grado vecino. Las dudas de alcance o grado se señalan como conflicto. Las claves propuestas derivan del stable_code. Todos los candidatos siguen como borrador pendiente de validación pedagógica y legal.",
    "",
    "Banco leído: " +
      archivos.length +
      " temarios, " +
      banco.length +
      " entradas de tema. Candidatos: " +
      candidatos.length +
      ".",
    "",
    "## Totales",
    "",
    "| Emparejados | Cubiertos | Nuevos | Conflictos | Inventario |",
    "|---:|---:|---:|---:|---:|",
    "| " + tipos.map((t) => totales[t]).join(" | ") + " |",
    "",
    "Segunda corrida simulada después de incorporar únicamente las claves nuevas: " +
      segundaCuenta.nuevo +
      " altas.",
    "",
    "## Por área",
    "",
    tabla(filas, "area"),
    "",
    "## Por grado",
    "",
    tabla(filas, "grado"),
    "",
    "## Ejemplos por área",
    "",
    ...["matematica", "comunicacion", "ciencia-tecnologia"].map(
      (area) =>
        "### " +
        area +
        "\n\n| Código | Título | Decisión | Clave(s) | Motivo |\n|---|---|---|---|---|\n" +
        ejemplos(area) +
        "\n",
    ),
    "",
    ...tipos.map(
      (t) =>
        "## " +
        t[0].toUpperCase() +
        t.slice(1) +
        "\n\n| Código | Título | Área | Grado | Disciplina | Clave(s) | Motivo |\n|---|---|---|---|---|---|---|\n" +
        detalle(t) +
        "\n",
    ),
  ].join("\n");
  await mkdir(resolve("docs/curriculum"), { recursive: true });
  await writeFile(
    resolve("docs/curriculum/reporte-fusion.md"),
    reporte.trimEnd() + "\n",
  );
  console.log(
    JSON.stringify({
      archivos: archivos.length,
      banco: banco.length,
      candidatos: candidatos.length,
      totales,
      segundaCuenta,
    }),
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
