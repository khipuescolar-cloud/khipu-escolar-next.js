import "server-only";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { tablaDeConsolidado, textoCeldaConsolidado, type Consolidado } from "@/lib/tablero-consolidado";
import { LADO_ISOTIPO_PDF, type ImagenPdf } from "./marca-pdf";

const estilos = StyleSheet.create({
  pagina: { padding: 28, paddingBottom: 60, fontSize: 8, fontFamily: "Helvetica", color: "#1b1f2a" },
  cabecera: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 2, borderBottomColor: "#1e2a78", paddingBottom: 8, marginBottom: 10 },
  logo: { width: 36, height: 36, marginRight: 8, objectFit: "contain" },
  colegio: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#1e2a78" },
  titulo: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  suave: { color: "#5b6170" },
  nota: { fontSize: 7, color: "#5b6170", marginBottom: 8 },
  seccion: { marginTop: 10, marginBottom: 3, fontSize: 10, fontFamily: "Helvetica-Bold", color: "#1e2a78" },
  filaGrupo: { flexDirection: "row", backgroundColor: "#1e2a78", color: "#ffffff", paddingVertical: 3, fontFamily: "Helvetica-Bold" },
  filaCab: { flexDirection: "row", backgroundColor: "#f3f0ea", paddingVertical: 3, fontFamily: "Helvetica-Bold" },
  fila: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e4e1da", paddingVertical: 2.5 },
  filaPie: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#1e2a78", paddingVertical: 3, fontFamily: "Helvetica-Bold" },
  leyenda: { flexDirection: "row", paddingVertical: 1.5 },
  pie: { position: "absolute", bottom: 18, left: 28, right: 28, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 0.5, borderTopColor: "#e4e1da", paddingTop: 6 },
  pieTexto: { flex: 1, fontSize: 7, color: "#5b6170", paddingRight: 12 },
  firmaMarca: { flexDirection: "row", alignItems: "center" },
  isotipo: { width: LADO_ISOTIPO_PDF, height: LADO_ISOTIPO_PDF, marginRight: 5 },
  firmaMarcaTexto: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#1e2a78" },
});

/** PDF del consolidado en A4 horizontal: columnas C1, C2… con la leyenda de competencias al final. */
export function ConsolidadoNotasPdf({ consolidado, logo, isotipo }: { consolidado: Consolidado; logo?: ImagenPdf | null; isotipo?: ImagenPdf | null }) {
  const t = tablaDeConsolidado(consolidado);
  const vigesimal = consolidado.escala === "vigesimal";
  const nComp = t.leyenda.length;
  const cabeceras = ["Alumno", ...t.leyenda.map((l) => l.codigo), ...(vigesimal ? ["Prom."] : []), "En riesgo"];
  const sumaAncho = 3 + (cabeceras.length - 1);
  const celda = (i: number) => ({ width: `${((i === 0 ? 3 : 1) / sumaAncho) * 100}%`, paddingRight: 3, textAlign: (i === 0 ? "left" : "center") as "left" | "center" });
  return (
    <Document title={t.titulo} author={consolidado.colegio}>
      <Page size="A4" orientation="landscape" style={estilos.pagina}>
        <View style={estilos.cabecera} fixed>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- Image de react-pdf no admite alt */}
            {logo && <Image src={logo} style={estilos.logo} />}
            <Text style={estilos.colegio}>{consolidado.colegio}</Text>
          </View>
          <View>
            <Text style={estilos.titulo}>{t.titulo}</Text>
            <Text style={estilos.suave}>{t.subtitulo}</Text>
          </View>
        </View>
        <Text style={estilos.nota}>{t.nota}</Text>
        {nComp === 0 ? (
          <Text>Este salón aún no tiene competencias registradas.</Text>
        ) : (
          <View>
            <View style={estilos.filaGrupo} wrap={false}>
              <Text style={celda(0)}> </Text>
              {t.grupos.map((g) => (
                <Text key={g.texto} style={{ width: `${(g.columnas / sumaAncho) * 100}%`, textAlign: "center" }}>{g.texto}</Text>
              ))}
              <Text style={{ width: `${((cabeceras.length - 1 - nComp) / sumaAncho) * 100}%` }}> </Text>
            </View>
            <View style={estilos.filaCab} wrap={false}>
              {cabeceras.map((c, i) => <Text key={c + i} style={celda(i)}>{c}</Text>)}
            </View>
            {t.filas.map((f, n) => (
              <View key={n} style={estilos.fila} wrap={false}>
                {f.map((c, i) => <Text key={i} style={celda(i)}>{textoCeldaConsolidado(c, i, "dato")}</Text>)}
              </View>
            ))}
            <View style={estilos.filaPie} wrap={false}>
              {t.pie.map((c, i) => <Text key={i} style={celda(i)}>{i === 0 ? String(c) : c === null ? "" : textoCeldaConsolidado(c, i, "pie")}</Text>)}
            </View>
            <Text style={estilos.seccion}>Competencias</Text>
            {t.leyenda.map((l) => (
              <View key={l.codigo} style={estilos.leyenda} wrap={false}>
                <Text style={{ width: 28, fontFamily: "Helvetica-Bold" }}>{l.codigo}</Text>
                <Text style={{ width: 130 }}>{l.curso}</Text>
                <Text style={{ flex: 1 }}>{l.competencia}</Text>
              </View>
            ))}
          </View>
        )}
        <View style={estilos.pie} fixed>
          <Text style={estilos.pieTexto}>Reporte generado por {consolidado.colegio}. Contiene datos de alumnos: manéjalo con reserva.</Text>
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
