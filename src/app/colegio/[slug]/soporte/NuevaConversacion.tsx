import { MessageSquarePlus } from "lucide-react";
import { DialogoAccion } from "@/components/academico/DialogoAccion";
import { Campo } from "@/components/ui/Campo";
import { Selector } from "@/components/ui/Selector";
import { Textarea } from "@/components/ui/textarea";
import { ACCEPT_CAPTURA, AVISO_DATOS_PERSONALES, CATEGORIAS_TICKET, MAX_ASUNTO, MAX_CUERPO_SOPORTE, NOMBRE_CATEGORIA, NOMBRE_PRIORIDAD, PRIORIDADES_TICKET } from "@/lib/soporte";
import { crearTicketAction } from "./actions";

/** «Nueva conversación» con el equipo Khipu (Dialog: asunto, categoría, prioridad, mensaje y captura opcional). */
export function NuevaConversacion() {
  return (
    <DialogoAccion
      disparador={<><MessageSquarePlus strokeWidth={2} aria-hidden /> Nueva conversación</>}
      titulo="Nueva conversación con Khipu"
      descripcion={AVISO_DATOS_PERSONALES}
      etiqueta="Enviar consulta"
      accion={crearTicketAction}
    >
      <div className="sm:col-span-2">
        <Campo etiqueta="Asunto" name="asunto" required minLength={3} maxLength={MAX_ASUNTO} placeholder="Ej.: No llegan los avisos de asistencia" />
      </div>
      <Selector etiqueta="Categoría" name="categoria" defaultValue="duda">
        {CATEGORIAS_TICKET.map((c) => (
          <option key={c} value={c}>{NOMBRE_CATEGORIA[c]}</option>
        ))}
      </Selector>
      <Selector etiqueta="Prioridad" name="prioridad" defaultValue="normal">
        {PRIORIDADES_TICKET.map((p) => (
          <option key={p} value={p}>{NOMBRE_PRIORIDAD[p]}</option>
        ))}
      </Selector>
      <label htmlFor="cuerpo-nuevo" className="flex flex-col gap-1.5 text-sm sm:col-span-2">
        <span className="font-medium text-foreground">Mensaje</span>
        <Textarea id="cuerpo-nuevo" name="cuerpo" required maxLength={MAX_CUERPO_SOPORTE} rows={5} placeholder="Cuéntanos qué pasó o qué necesitas." />
      </label>
      <label htmlFor="adjunto-nuevo" className="flex flex-col gap-1.5 text-sm sm:col-span-2">
        <span className="font-medium text-foreground">Captura (opcional)</span>
        <input id="adjunto-nuevo" type="file" name="adjunto" accept={ACCEPT_CAPTURA} className="max-w-full text-cuerpo-sm file:mr-2 file:rounded-md file:border file:bg-card file:px-2 file:py-1" />
        <span className="text-muted-foreground">PNG, JPG o PDF de hasta 5 MB.</span>
      </label>
    </DialogoAccion>
  );
}
