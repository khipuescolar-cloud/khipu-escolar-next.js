"use client";

import { Pencil, UserPlus } from "lucide-react";
import { Campo } from "@/components/ui/Campo";
import { Selector } from "@/components/ui/Selector";
import { NOMBRE_TIPO_CONTACTO, TIPOS_ELEGIBLES } from "@/lib/comercial";
import { CasillaCampo } from "../_comun/CasillaCampo";
import { PanelFormulario } from "../_comun/PanelFormulario";
import { guardarResponsableAction } from "../_acciones";

export type DatosResponsable = {
  id: string;
  tipo: string;
  principal: boolean;
  nombres: string;
  apellidos: string;
  cargo: string | null;
  email: string;
  telefono: string | null;
  notas: string | null;
  tieneAcceso: boolean;
};

/** Agregar (sin `responsable`) o editar un responsable del colegio, en un Sheet. */
export function HojaResponsable({ tenantId, responsable }: { tenantId: string; responsable?: DatosResponsable }) {
  const edita = !!responsable;
  return (
    <PanelFormulario
      tipo="sheet"
      boton={edita ? <><Pencil strokeWidth={2} aria-hidden /> Editar</> : <><UserPlus strokeWidth={2} aria-hidden /> Agregar responsable</>}
      variante={edita ? "ghost" : "default"}
      tamano={edita ? "sm" : "default"}
      titulo={edita ? "Editar responsable" : "Agregar responsable"}
      descripcion={edita ? "Cambia sus datos de contacto. Su tipo principal se cambia con «Marcar como principal»." : "Contacto del colegio ante Khipu. Puedes darle acceso al sistema como dirección."}
      accion={guardarResponsableAction}
      guardar={edita ? "Guardar cambios" : "Agregar responsable"}
    >
      <input type="hidden" name="tenantId" value={tenantId} />
      {responsable && <input type="hidden" name="id" value={responsable.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Nombres" name="nombres" required autoComplete="off" defaultValue={responsable?.nombres} />
        <Campo etiqueta="Apellidos" name="apellidos" autoComplete="off" defaultValue={responsable?.apellidos} />
        <Campo etiqueta="Correo" name="email" type="email" required autoComplete="off" defaultValue={responsable?.email} readOnly={responsable?.tieneAcceso} ayuda={responsable?.tieneAcceso ? "Es su usuario para entrar: no se cambia aquí." : undefined} />
        <Campo etiqueta="Teléfono" name="telefono" type="tel" autoComplete="off" defaultValue={responsable?.telefono ?? ""} />
        <Campo etiqueta="Cargo" name="cargo" placeholder="Administradora" defaultValue={responsable?.cargo ?? ""} />
        {responsable?.principal ? (
          <input type="hidden" name="tipo" value="otro" />
        ) : (
          <Selector etiqueta="Tipo" name="tipo" defaultValue={responsable?.tipo ?? "administrativo"}>
            {TIPOS_ELEGIBLES.map((t) => (
              <option key={t} value={t}>{NOMBRE_TIPO_CONTACTO[t]}</option>
            ))}
          </Selector>
        )}
      </div>
      <Campo etiqueta="Notas (opcional)" name="notas" maxLength={300} defaultValue={responsable?.notas ?? ""} placeholder="P. ej. Atiende de lunes a viernes por la mañana" />
      {!edita && (
        <CasillaCampo
          nombre="darAcceso"
          etiqueta="Darle acceso al sistema como dirección"
          ayuda="Se crea su cuenta y le llega un correo de bienvenida. Su contraseña inicial es su número de documento."
          hijos={
            <div className="grid gap-4 rounded-lg border bg-muted/40 p-4 sm:grid-cols-2">
              <Selector etiqueta="Tipo de documento" name="tipoDocumento" defaultValue="dni">
                <option value="dni">DNI</option>
                <option value="ce">Carné de extranjería</option>
                <option value="pasaporte">Pasaporte</option>
              </Selector>
              <Campo etiqueta="Número de documento" name="numeroDocumento" inputMode="numeric" autoComplete="off" ayuda="No se envía por correo." />
              <Selector etiqueta="Género (opcional)" name="genero" defaultValue="">
                <option value="">Prefiere no indicarlo</option>
                <option value="femenino">Femenino</option>
                <option value="masculino">Masculino</option>
                <option value="no_especifica">No especifica</option>
              </Selector>
              <p className="self-end text-cuerpo-sm text-muted-foreground">Escribe también sus apellidos y su cargo.</p>
            </div>
          }
        />
      )}
    </PanelFormulario>
  );
}
