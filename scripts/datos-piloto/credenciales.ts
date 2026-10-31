// Genera el archivo de credenciales de prueba (Markdown) a partir de la BD local con el seed de Nuevo Horizonte.
// Va FUERA del repositorio (no se versiona). Uso: pnpm db:credenciales  ·  o  tsx scripts/datos-piloto/credenciales.ts --salida <ruta.md> [--puerto 3000]
import "dotenv/config";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";

const arg = (nombre: string) => { const i = process.argv.indexOf(nombre); return i >= 0 ? process.argv[i + 1] : undefined; };

async function main() {
  const salida = arg("--salida");
  if (!salida) throw new Error("Falta --salida <ruta.md>.");
  const puerto = arg("--puerto") ?? "3000";
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  try {
    const t = await prisma.tenant.findUniqueOrThrow({ where: { slug: "nuevohorizonte" } });
    const miembros = await prisma.membership.findMany({
      where: { tenantId: t.id },
      include: {
        user: true,
        salonesTutor: { select: { nombre: true } },
        cursosDictados: { include: { salon: { select: { nombre: true } } }, orderBy: { nombre: "asc" } },
        hijos: { include: { consentimiento: true, alumno: { include: { salon: true } } } },
        alumnoVinculado: { include: { salon: true, licenciasNudito: { where: { estado: "activa" } } } },
      },
    });
    const orden = (a: { user: { apellidos: string; nombres: string } }, b: { user: { apellidos: string; nombres: string } }) =>
      `${a.user.apellidos} ${a.user.nombres}`.localeCompare(`${b.user.apellidos} ${b.user.nombres}`, "es");
    const nombre = (m: { user: { nombres: string; apellidos: string } }) => `${m.user.nombres} ${m.user.apellidos}`;
    const por = (rol: string) => miembros.filter((m) => m.rol === rol).sort(orden);
    const ordenSalon = (s: string) => (s.startsWith("Inicial") ? `0${s}` : s.includes("Sec.") ? `2${s}` : `1${s}`);

    const L: string[] = [];
    L.push("# Credenciales de prueba — Khipu Escolar (local)", "");
    L.push(`> Generado el ${new Date().toLocaleString("es-PE", { timeZone: "America/Lima" })} desde la BD local (\`pnpm db:credenciales\`). Datos 100 % ficticios. **No subir al repositorio.**`, "");
    L.push("## Cómo empezar", "");
    L.push("```bash", "pnpm db:start          # Supabase local (Postgres, Auth y Mailpit)", "pnpm db:reconstruir    # deja la BD solo con Nuevo Horizonte y regenera este archivo", "pnpm dev", "```", "");
    L.push(`- Colegio: **http://nuevohorizonte.lvh.me:${puerto}** (entra desde http://lvh.me:${puerto}/login con cualquier cuenta).`);
    L.push(`- Panel del equipo Khipu: **http://admin.lvh.me:${puerto}**`);
    L.push("- Correos que envía la app (avisos, bienvenidas): **Mailpit http://127.0.0.1:54324**");
    L.push("- Contraseña de **todas** las cuentas: **`demo123`**");
    L.push(`- Único colegio: **${t.nombre}** · plan **Khipu Pro** · escala literal (AD/A/B/C) · asistencia por curso en primaria y secundaria · cuenta propia de alumno desde 5.° de primaria.`, "");

    L.push("## Dirección, administrativos y portería", "", "| Correo | Nombre | Rol | Cargo |", "|---|---|---|---|");
    for (const m of [...por("direccion"), ...por("administrativo"), ...por("porteria")]) L.push(`| ${m.user.email} | ${nombre(m)} | ${m.rol} | ${m.cargo ?? ""} |`);
    L.push("", "## Super administrador (equipo Khipu)", "", "| Correo | Dónde |", "|---|---|");
    const admins = await prisma.adminPlataforma.findMany({ where: { activo: true }, include: { user: true } });
    for (const a of admins) L.push(`| ${a.user.email} | http://admin.lvh.me:${puerto} |`);

    L.push("", `## Profesores (${por("profesor").length})`, "", "| Correo | Nombre | Tutor(a) de | Cursos que dicta |", "|---|---|---|---|");
    for (const m of por("profesor")) {
      const cursos = new Map<string, string[]>();
      for (const c of m.cursosDictados) cursos.set(c.nombre, [...(cursos.get(c.nombre) ?? []), c.salon.nombre]);
      const texto = [...cursos].map(([c, s]) => `${c} (${s.sort((a, b) => ordenSalon(a).localeCompare(ordenSalon(b))).join(", ")})`).join("; ");
      L.push(`| ${m.user.email} | ${nombre(m)} | ${m.salonesTutor.map((s) => s.nombre).join(", ") || "—"} | ${texto} |`);
    }

    const apoderados = por("apoderado");
    const estado = (m: (typeof apoderados)[number]) => {
      const c = m.hijos[0]?.consentimiento;
      return !c ? "⚠ pendiente" : c.revocadoAt ? "retirado" : "vigente";
    };
    L.push("", `## Familias (${apoderados.length} apoderados)`, "");
    L.push("«Consentimiento ⚠ pendiente»: al entrar, la app le pide aceptar el uso de datos antes de seguir (y no recibe avisos). «retirado»: usa la app pero no recibe avisos.", "");
    L.push("| Correo | Nombre | Parentesco | Hijos (salón) | Consentimiento |", "|---|---|---|---|---|");
    const salonDeFamilia = (m: (typeof apoderados)[number]) => ordenSalon(m.hijos.map((h) => h.alumno.salon.nombre).sort()[0] ?? "");
    for (const m of [...apoderados].sort((a, b) => salonDeFamilia(a).localeCompare(salonDeFamilia(b)) || orden(a, b))) {
      const hijos = m.hijos.map((h) => `${h.alumno.nombres} ${h.alumno.apellidos} (${h.alumno.salon.nombre})`).join(", ");
      L.push(`| ${m.user.email} | ${nombre(m)} | ${m.hijos[0]?.parentesco ?? ""} | ${hijos} | ${estado(m)} |`);
    }

    const alumnos = por("alumno").filter((m) => m.alumnoVinculado).sort((a, b) => ordenSalon(a.alumnoVinculado!.salon.nombre).localeCompare(ordenSalon(b.alumnoVinculado!.salon.nombre)) || orden(a, b));
    L.push("", `## Alumnos con cuenta propia (${alumnos.length})`, "", "| Correo | Nombre | Salón | Nudito+ |", "|---|---|---|---|");
    for (const m of alumnos) L.push(`| ${m.user.email} | ${nombre(m)} | ${m.alumnoVinculado!.salon.nombre} | ${m.alumnoVinculado!.licenciasNudito.length ? "activo" : ""} |`);

    // Cuentas para las pruebas sugeridas.
    const email = (n: string) => miembros.find((m) => m.rol === "apoderado" && m.hijos.some((h) => `${h.alumno.nombres} ${h.alumno.apellidos}`.startsWith(n)))?.user.email ?? "?";
    const pendiente = apoderados.find((m) => estado(m) === "⚠ pendiente");
    const tutorSec = miembros.find((m) => m.salonesTutor.some((s) => s.nombre === "1.° A Sec."));
    const alumnoSec = alumnos.find((m) => m.alumnoVinculado!.salon.nombre === "1.° A Sec." && !m.user.email.startsWith("sofia"));
    L.push("", "## Pruebas sugeridas (de punta a punta)", "");
    const P = (titulo: string, pasos: string) => L.push(`- **${titulo}.** ${pasos}`);
    P("Tarea → familia", "`lucia.garcia@nuevohorizonte.demo` crea en Tareas una tarea de Matemática · 3.° B con «Avisar a las familias». Con `rosa.quispe@gmail.com` se ve en Tareas (agrupada por fecha) y llega el correo a Mailpit.");
    P("Pasar lista → aviso → justificar", "Lucía pasa la asistencia del día de 3.° B y marca «No llegó» a Mateo. En Mailpit llega «Mateo no llegó hoy» con el botón «Justificar falta»; se justifica sin sesión. Lucía la revisa en Justificaciones → Por revisar (acepta o rechaza con comentario) y Rosa ve el resultado.");
    P("Justificación desde la app", `\`${email("Valentina Ríos")}\` (papá de Valentina, 3.° B) ya tiene una justificación pendiente y una rechazada; entra a Justificaciones y justifica otra falta. Dirección ve el historial con filtros.`);
    P("Comunicado", "`direccion@nuevohorizonte.demo` publica en Comunicados uno para todo el colegio, un nivel (p. ej. «Primaria»), un grado («3.° grado de primaria»: 3.° A y 3.° B) o un salón, con un PDF. Lo ven solo las familias y alumnos de ese destino (Rosa ve los de primaria y de 3.° grado por Mateo, y los de secundaria por Sofía); portería no. El seed ya trae ejemplos por nivel y por grado (algunos publicados por secretaría).");
    P("Chat familia ↔ tutor", `Rosa escribe a Lucía desde Mensajes (o desde Asistencia → «Escribir a la tutora»); Lucía ve «1 sin leer» y responde. \`pedro.salas@nuevohorizonte.demo\` ya tiene mensajes sin leer de familias de 5.° A; Rosa tiene uno sin leer de \`${tutorSec?.user.email ?? "?"}\` (tutor de Sofía, 1.° A Sec.).`);
    P("Reunión con confirmación", "Lucía convoca en Reuniones a 3.° B; Rosa responde «Asistiré» con comentario; Lucía ve las confirmaciones, marca asistencia y publica el acta (hay una reunión pasada con acta y otras próximas sin respuesta de Rosa).");
    P("Portería", "`porteria@nuevohorizonte.demo` → Portería: busca por nombre o código (p. ej. «Quispe») y registra la llegada; o escanea un carnet impreso desde Gestión → Carnets con QR (PDF por salón). Hoy secundaria ya tiene llegadas por portería, salvo 5.° A Sec. («Sin registrar»).");
    P("«Ingresó pero faltó a clase»", "Lucía abre la lista de Matemática · 3.° B: muestra quién ingresó al colegio; marca «No llegó» a un alumno presente → la familia recibe el aviso de falta a la clase. Dirección lo ve en Reportes → Filtrar «Todos los salones» → «Asistencia por curso», columna «Ingresó pero faltó» (hay casos de las últimas 2 semanas; el historial por curso sigue el horario: solo los días en que el curso tiene clase y a la hora de inicio de su periodo).");
    P("Notas y libreta", "Lucía registra notas en Notas (3.° B, bimestre vigente); dirección publica la libreta del bimestre cerrado en Notas → Periodos; Rosa la descarga en PDF desde Libreta (elige el hijo).");
    P("Familia con dos hijos", "Rosa tiene a Mateo (3.° B, sin cuenta) y a Sofía (1.° A Sec., con cuenta `sofia.quispe@nuevohorizonte.demo`): asistencia, notas y tareas de cada uno.");
    P("Consentimiento pendiente", `\`${pendiente?.user.email ?? "?"}\` entra y la app le pide aceptar el uso de datos antes de mostrar nada.`);
    P("Nudito+ (alumno y familia)", "`lucas.huaman@nuevohorizonte.demo` (5.° A, licencia activa) conversa en Nudito+; su mamá `familia.huaman@familia.demo` ve el reporte en Nudito+. Rosa usa «modo hijo» con Mateo (licencia pagada) y puede reportar un Yape para Sofía. En el panel admin → Nudito+ hay un pago Yape pendiente de verificar (familia de Gael Chávez, " + `\`${email("Gael Chávez")}\`).`);
    P("Alumno con cuenta", `\`${alumnoSec?.user.email ?? "?"}\` (1.° A Sec.) ve su asistencia, notas, tareas y comunicados; no ve Mensajes ni Gestión.`);
    P("Tablero de dirección", "Dirección → Tablero: asistencia del mes, ausentismo crónico (umbral configurable), rendimiento por competencias y avance de registro de notas (algunos profesores van atrasados: Educación Física de primaria, Inglés de primaria y EPT).");
    P("Mesa de ayuda", "Dirección → Soporte Khipu tiene una conversación resuelta y una abierta; el super administrador responde desde http://admin.lvh.me:" + puerto + "/mesa-ayuda.");
    L.push("", "## Plan Khipu Base", "", "El único colegio es **Pro**. Para ver el candado «Plan Khipu Pro» de un colegio Base, crea uno desde el panel (admin → Colegios → Nuevo colegio, plan Khipu Base) o cambia temporalmente el plan de Nuevo Horizonte en su ficha del panel y vuelve a ponerlo en Pro. Los e2e crean y borran su propio colegio Base.", "");

    const ruta = path.resolve(salida);
    await writeFile(ruta, `${L.join("\n")}\n`);
    console.log(`Credenciales escritas en ${ruta}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
