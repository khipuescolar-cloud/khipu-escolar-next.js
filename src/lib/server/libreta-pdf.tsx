import "server-only";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { APROBADO_VIGESIMAL, ETIQUETA_LITERAL, LITERALES, textoValor } from "@/lib/calificaciones";
import { formatoDia } from "@/lib/fechas";
import type { DatosLibreta } from "./libreta";

const estilos = StyleSheet.create({
  pagina: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#1b1f2a" },
  cabecera: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 2, borderBottomColor: "#1e2a78", paddingBottom: 8, marginBottom: 12 },
  logo: { width: 40, height: 40, marginRight: 8, objectFit: "contain" },
  colegio: { fontSize: 15, fontFamily: "Helvetica-Bold", color: "#1e2a78" },
  titulo: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  suave: { color: "#5b6170" },
  datos: { flexDirection: "row", flexWrap: "wrap", marginBottom: 10 },
  dato: { width: "50%", marginBottom: 3 },
  curso: { marginTop: 10, marginBottom: 3, fontSize: 11, fontFamily: "Helvetica-Bold", color: "#1e2a78" },
  fila: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e4e1da", paddingVertical: 3 },
  filaCab: { flexDirection: "row", backgroundColor: "#f3f0ea", paddingVertical: 3, fontFamily: "Helvetica-Bold" },
  colComp: { width: "42%", paddingRight: 6 },
  colNota: { width: "18%", paddingRight: 6 },
  colConc: { width: "40%" },
  seccion: { marginTop: 14, fontSize: 11, fontFamily: "Helvetica-Bold", color: "#1e2a78" },
  firma: { marginTop: 28, alignItems: "center" },
  linea: { width: 180, borderTopWidth: 0.7, borderTopColor: "#1b1f2a", marginBottom: 3 },
  pie: { position: "absolute", bottom: 20, left: 36, right: 36, fontSize: 8, color: "#5b6170", textAlign: "center" },
});

/** Libreta de un alumno en un periodo (specs/11-notas-y-libreta.md). */
export function LibretaPdf({ datos, logo }: { datos: DatosLibreta; logo?: { data: Buffer; format: "png" | "jpg" } | null }) {
  const a = datos.asistencia;
  return (
    <Document title={`Libreta ${datos.alumno.apellidos} ${datos.alumno.nombres} - ${datos.periodo.nombre}`} author={datos.colegio.nombre}>
      <Page size="A4" style={estilos.pagina}>
        <View style={estilos.cabecera}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- Image de react-pdf no admite alt */}
            {logo && <Image src={logo} style={estilos.logo} />}
            <View>
              <Text style={estilos.colegio}>{datos.colegio.nombre}</Text>
              {datos.colegio.ciudad && <Text style={estilos.suave}>{datos.colegio.ciudad}</Text>}
            </View>
          </View>
          <View>
            <Text style={estilos.titulo}>Libreta de notas</Text>
            <Text style={estilos.suave}>{datos.periodo.nombre} · {datos.periodo.anio}</Text>
          </View>
        </View>

        <View style={estilos.datos}>
          <Text style={estilos.dato}>Alumno(a): {datos.alumno.apellidos}, {datos.alumno.nombres}</Text>
          <Text style={estilos.dato}>Salón: {datos.alumno.salon}</Text>
          {datos.alumno.codigo && <Text style={estilos.dato}>Código: {datos.alumno.codigo}</Text>}
          {datos.alumno.tutor && <Text style={estilos.dato}>{datos.alumno.tutorTitulo}: {datos.alumno.tutor}</Text>}
        </View>

        {datos.cursos.map((curso) => (
          <View key={curso.nombre} wrap={false}>
            <Text style={estilos.curso}>{curso.nombre}</Text>
            <View style={estilos.filaCab}>
              <Text style={estilos.colComp}>Competencia</Text>
              <Text style={estilos.colNota}>Calificación</Text>
              <Text style={estilos.colConc}>Conclusión descriptiva</Text>
            </View>
            {curso.competencias.length === 0 && <Text style={estilos.suave}>Sin competencias registradas.</Text>}
            {curso.competencias.map((c) => (
              <View key={c.nombre} style={estilos.fila}>
                <Text style={estilos.colComp}>{c.nombre}</Text>
                <Text style={estilos.colNota}>{c.calificacion ? textoValor(c.calificacion) : "—"}</Text>
                <Text style={estilos.colConc}>{c.conclusion ?? ""}</Text>
              </View>
            ))}
          </View>
        ))}

        <Text style={estilos.seccion}>Asistencia del periodo</Text>
        <Text>
          Días registrados: {a.total} · Llegó: {a.llego} · Tarde: {a.tarde} · Falta: {a.falta}
          {a.problema > 0 ? ` · Con problema: ${a.problema}` : ""}
        </Text>

        <Text style={estilos.seccion}>Escala de calificación</Text>
        {datos.escala === "literal" ? (
          LITERALES.map((l) => <Text key={l}>{l}: {ETIQUETA_LITERAL[l]}</Text>)
        ) : (
          <Text>Escala vigesimal de 0 a 20. Aprobado desde {APROBADO_VIGESIMAL}.</Text>
        )}

        <View style={estilos.firma}>
          <View style={estilos.linea} />
          <Text>Dirección · {datos.colegio.nombre}</Text>
        </View>
        <Text style={estilos.pie} fixed>
          Emitida el {formatoDia(new Date(), { day: "numeric", month: "long", year: "numeric" })} · Documento generado con Khipu Escolar. Los datos del alumno son confidenciales.
        </Text>
      </Page>
    </Document>
  );
}
