import "server-only";
import { LADO_ISOTIPO_PDF, type ImagenPdf } from "./marca-pdf";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

// Carnets con QR en PDF (specs/05-porteria-qr.md): CR80 (85,6 × 54 mm, un carnet por página) o A4 con 8 por hoja.

export type FormatoCarnets = "cr80" | "a4";

export type CarnetPdf = { alumnoId: string; nombres: string; apellidos: string; codigo: string | null; qr: string };

const MM = 72 / 25.4;
/** Tamaño CR80 en puntos. */
const ANCHO = 85.6 * MM;
const ALTO = 54 * MM;
const POR_HOJA = 8;

export function parseFormatoCarnets(valor: string | null | undefined): FormatoCarnets {
  return valor === "cr80" ? "cr80" : "a4";
}

/** Reparte los carnets en hojas de 8 (A4) o de 1 (CR80). */
export function paginar<T>(items: T[], porPagina: number): T[][] {
  const paginas: T[][] = [];
  for (let i = 0; i < items.length; i += porPagina) paginas.push(items.slice(i, i + porPagina));
  return paginas;
}

const estilos = StyleSheet.create({
  hoja: { padding: 0, backgroundColor: "#ffffff" },
  hojaA4: { paddingTop: 36, paddingLeft: 55, flexDirection: "row", flexWrap: "wrap", alignContent: "flex-start" },
  carnet: {
    width: ANCHO, height: ALTO, borderWidth: 1.2, borderColor: "#1e2a78", borderRadius: 6, padding: 8,
    flexDirection: "row", alignItems: "center", backgroundColor: "#ffffff",
  },
  celda: { width: ANCHO + 10, height: ALTO + 12 },
  qr: { width: 74, height: 74, marginRight: 8 },
  texto: { flex: 1 },
  colegioFila: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  logo: { width: 18, height: 18, marginRight: 4, objectFit: "contain" },
  colegio: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: "#1e2a78", textTransform: "uppercase", flex: 1 },
  nombres: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: "#1b1f2a" },
  apellidos: { fontSize: 9, color: "#1b1f2a" },
  salon: { fontSize: 7.5, color: "#5b6170", marginTop: 3 },
  firmaMarca: { position: "absolute", right: 6, bottom: 5, width: 80, flexDirection: "row", alignItems: "center", justifyContent: "flex-end" },
  isotipo: { width: LADO_ISOTIPO_PDF, height: LADO_ISOTIPO_PDF, marginRight: 3 },
  firmaMarcaTexto: { fontSize: 6, fontFamily: "Helvetica-Bold", color: "#1e2a78" },
});

type ImagenesCarnet = { logo?: ImagenPdf | null; isotipo?: ImagenPdf | null };

function Carnet({ c, colegio, salon, logo, isotipo }: { c: CarnetPdf; colegio: string; salon: string } & ImagenesCarnet) {
  return (
    <View style={estilos.carnet}>
      {/* eslint-disable-next-line jsx-a11y/alt-text -- Image de react-pdf no admite alt */}
      <Image src={c.qr} style={estilos.qr} />
      <View style={estilos.texto}>
        <View style={estilos.colegioFila}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- Image de react-pdf no admite alt */}
          {logo && <Image src={logo} style={estilos.logo} />}
          <Text style={estilos.colegio}>{colegio}</Text>
        </View>
        <Text style={estilos.nombres}>{c.nombres}</Text>
        <Text style={estilos.apellidos}>{c.apellidos}</Text>
        <Text style={estilos.salon}>{salon}{c.codigo ? ` · ${c.codigo}` : ""}</Text>
      </View>
      <View style={estilos.firmaMarca}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- Image de react-pdf no admite alt */}
        {isotipo && <Image src={isotipo} style={estilos.isotipo} />}
        <Text style={estilos.firmaMarcaTexto}>Khipu Escolar</Text>
      </View>
    </View>
  );
}

/** Marca: índigo en el borde y el nombre del colegio, tinta y pizarra en texto; firma «Khipu Escolar» con el isotipo oficial.
 *  Fuente: Helvetica del PDF (Sora/Inter no se incrustan todavía). */
export function CarnetsPdf({
  colegio, salon, carnets, formato, logo, isotipo,
}: { colegio: string; salon: string; carnets: CarnetPdf[]; formato: FormatoCarnets } & ImagenesCarnet) {
  const titulo = `Carnets ${salon} - ${colegio}`;
  if (formato === "cr80") {
    return (
      <Document title={titulo} author={colegio}>
        {carnets.map((c) => (
          <Page key={c.alumnoId} size={[ANCHO, ALTO]} style={estilos.hoja}>
            <Carnet c={c} colegio={colegio} salon={salon} logo={logo} isotipo={isotipo} />
          </Page>
        ))}
      </Document>
    );
  }
  return (
    <Document title={titulo} author={colegio}>
      {paginar(carnets, POR_HOJA).map((grupo, i) => (
        <Page key={i} size="A4" style={[estilos.hoja, estilos.hojaA4]}>
          {grupo.map((c) => (
            <View key={c.alumnoId} style={estilos.celda}>
              <Carnet c={c} colegio={colegio} salon={salon} logo={logo} isotipo={isotipo} />
            </View>
          ))}
        </Page>
      ))}
    </Document>
  );
}
