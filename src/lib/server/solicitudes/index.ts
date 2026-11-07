import "server-only";
export type { EstadoSolicitud, EstadoDestinatario, VersionVista, DestinatarioVista, ResumenSolicitud, SolicitudVista, FilaCumplimiento } from "./tipos";
export { crearSolicitud, editarSolicitud, publicarSolicitud, cambiarEstadoSolicitud, cambiarPlazoSolicitud, agregarDestinatarios, retirarDestinatario } from "./gestion";
export { presentarVersion } from "./versiones";
export { comenzarRevision, observarVersion, aprobarVersion, reabrirRevision } from "./revision";
export { listarSolicitudes, detalleSolicitud } from "./vistas";
export { reporteCumplimiento, reporteCsv } from "./reportes";
export { resolverAccesoSolicitud } from "../archivos-acceso/solicitud";
