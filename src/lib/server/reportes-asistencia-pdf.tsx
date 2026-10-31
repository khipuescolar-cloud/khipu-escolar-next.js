import "server-only";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { tablaDeReporte, textoCelda, type SeccionReporte } from "@/lib/reportes-asistencia-tabla";
import { LADO_ISOTIPO_PDF, type ImagenPdf } from "./marca-pdf";
import type { ReporteAsistencia, ReporteCurso } from "./reportes-asistencia";

const estilos = StyleSheet.create({
  pagina: { padding: 28, paddingBottom: 60, fontSize: 8, fontFamily: "Helvetica", color: "#1b1f2a" },
  cabecera: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 2, borderBottomColor: "#1e2a78", paddingBottom: 8, marginBottom: 10 },
  logo: { width: 36, height: 36, marginRight: 8, objectFit: "contain" },
  colegio: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#1e2a78" },
  titulo: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  suave: { color: "#5b6170" },
  nota: { fontSize: 7, color: "#5b6170", marginBottom: 8 },
  seccion: { marginTop: 8, marginBottom: 3, fontSize: 10, fontFamily: "Helvetica-Bold", color: "#1e2a78" },
  fila: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e4e1da", paddingVertical: 2.5 },
  filaCab: { flexDirection: "row", backgroundColor: "#f3f0ea", paddingVertical: 3, fontFamily: "Helvetica-Bold" },
  filaTotal: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#1e2a78", paddingVertical: 3, fontFamily: "Helvetica-Bold" },
  pie: { position: "absolute", bottom: 18, left: 28, right: 28, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 0.5, borderTopColor: "#e4e1da", paddingTop: 6 },
  pieTexto: { flex: 1, fontSize: 7, color: "#5b6170", paddingRight: 12 },
  firmaMarca: { flexDirection: "row", alignItems: "center" },
  isotipo: { width: LADO_ISOTIPO_PDF, height: LADO_ISOTIPO_PDF, marginRight: 5 },
  firmaMarcaTexto: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#1e2a78" },
});

/** Ancho relativo: las dos o tres primeras columnas de texto son más anchas que las de conteo. */
function anchos(s: SeccionReporte): number[] {
  // Matriz de un curso: «Alumno» ancho y una columna angosta por clase.
  if (s.columnas[0] === "Alumno") return s.columnas.map((_, i) => (i === 0 ? 5 : 1));
  const textuales = s.columnas.findIndex((c) => c === "Días con registro" || c === "Clases");
  return s.columnas.map((_, i) => (textuales < 0 ? 1 : i < textuales ? (i === 0 ? 2.2 : 1.6) : 1));
}

function Tabla({ seccion }: { seccion: SeccionReporte }) {
  const w = anchos(seccion);
  const suma = w.reduce((a, b) => a + b, 0);
  const matriz = seccion.columnas[0] === "Alumno";
  // Los conteos (desde «Días con registro» o «Clases») van a la derecha; el texto, a la izquierda.
  const primeraCifra = seccion.columnas.findIndex((c) => c === "Días con registro" || c === "Clases");
  const alinear = (i: number) =>
    matriz ? (i === 0 ? "left" : "center") : primeraCifra >= 0 ? (i >= primeraCifra ? "right" : "left") : i >= w.length - 9 && seccion.columnas.length > 4 ? "right" : "left";
  const celda = (i: number) => ({ width: `${(w[i] / suma) * 100}%`, paddingRight: 3, textAlign: alinear(i) as "right" | "left" | "center" });
  return (
    <View>
      <Text style={estilos.seccion}>{seccion.titulo}</Text>
      <View style={estilos.filaCab} wrap={false}>
        {seccion.columnas.map((c, i) => <Text key={c} style={celda(i)}>{c}</Text>)}
      </View>
      {seccion.filas.map((f, n) => (
        <View key={n} style={estilos.fila} wrap={false}>
          {f.map((c, i) => <Text key={i} style={celda(i)}>{textoCelda(c, seccion.columnasPorcentaje.includes(i))}</Text>)}
        </View>
      ))}
      {seccion.total && (
        <View style={estilos.filaTotal} wrap={false}>
          {seccion.total.map((c, i) => <Text key={i} style={celda(i)}>{textoCelda(c, seccion.columnasPorcentaje.includes(i))}</Text>)}
        </View>
      )}
    </View>
  );
}

/** PDF del reporte de asistencia en A4 horizontal. Marca: índigo en encabezados y firma «Khipu Escolar» con isotipo en el pie. */
export function ReporteAsistenciaPdf({ reporte, logo, isotipo }: { reporte: ReporteAsistencia | ReporteCurso; logo?: ImagenPdf | null; isotipo?: ImagenPdf | null }) {
  const tabla = tablaDeReporte(reporte);
  return (
    <Document title={tabla.titulo} author={reporte.colegio}>
      <Page size="A4" orientation="landscape" style={estilos.pagina}>
        <View style={estilos.cabecera} fixed>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- Image de react-pdf no admite alt */}
            {logo && <Image src={logo} style={estilos.logo} />}
            <Text style={estilos.colegio}>{reporte.colegio}</Text>
          </View>
          <View>
            <Text style={estilos.titulo}>{tabla.titulo}</Text>
            <Text style={estilos.suave}>{tabla.subtitulo}</Text>
          </View>
        </View>
        <Text style={estilos.nota}>{tabla.nota}</Text>
        {tabla.secciones.map((s) => <Tabla key={s.titulo} seccion={s} />)}
        <View style={estilos.pie} fixed>
          <Text style={estilos.pieTexto}>Reporte generado por {reporte.colegio}. Contiene datos de alumnos: manéjalo con reserva.</Text>
          <View style={estilos.firmaMarca}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- Image de react-pdf no admite alt */}
            {isotipo && <Image src={isotipo} style={estilos.isotipo} />}
            <Text style={estilos.firmaMarcaTexto}>Khipu Escolar</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
