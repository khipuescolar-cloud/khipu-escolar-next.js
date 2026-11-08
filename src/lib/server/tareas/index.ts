// Módulo de tareas estilo Classroom (specs/39). Punto de entrada único: `@/lib/server/tareas`.
export {
  activarCalificacion, alumnosParaDestinatarios, archivarTarea, actualizarTarea, cambiarCierreTarea, cambiarPlazo, crearTarea, cursosGemelos, cursosParaTareas,
  editarDestinatarios, eliminarTarea, publicarTarea, vistaPreviaDestinatarios,
} from "./gestion";
export { anularEntrega, calificarEntrega, devolverEntrega, guardarEntrega, marcarEntregaFisica, marcarNoEntregaron, marcarRevisada, revisarConNota, subirNotasDeSeccion } from "./entregas";
export {
  alumnosConTarea, comentariosGenerales, comentarTarea, detalleTareaFamilia, ocultarComentario, revisionDeTarea, tareasDeFamilia, tareasDelDocente,
  tareasVisiblesParaAgenda, type EntregaAgenda, type TareaDocente, type ItemTareaFamilia, type TareasDeHijo,
} from "./vistas";
export { limitesTarea, sincronizarAsignaciones } from "./comun";
