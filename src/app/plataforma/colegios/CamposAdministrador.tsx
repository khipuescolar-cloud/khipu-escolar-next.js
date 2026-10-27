import { Campo } from "@/components/ui/Campo";
import { Selector } from "@/components/ui/Selector";

/** Datos de la persona administradora (rol dirección). Los nombres llevan prefijo `admin_`. */
export function CamposAdministrador() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Campo etiqueta="Correo" name="admin_email" type="email" required autoComplete="off" ayuda="Será su usuario para entrar." />
      <Campo etiqueta="Cargo" name="admin_cargo" required placeholder="Director general" />
      <Campo etiqueta="Nombres" name="admin_nombres" required autoComplete="off" />
      <Campo etiqueta="Apellidos" name="admin_apellidos" required autoComplete="off" />
      <Selector etiqueta="Tipo de documento" name="admin_tipoDocumento" defaultValue="dni">
        <option value="dni">DNI</option>
        <option value="ce">Carné de extranjería</option>
        <option value="pasaporte">Pasaporte</option>
      </Selector>
      <Campo
        etiqueta="Número de documento"
        name="admin_numeroDocumento"
        required
        inputMode="numeric"
        autoComplete="off"
        ayuda="Será su contraseña inicial. No se envía por correo."
      />
      <Campo etiqueta="Teléfono" name="admin_telefono" type="tel" autoComplete="off" />
      <Selector etiqueta="Género (opcional)" name="admin_genero" defaultValue="">
        <option value="">Prefiere no indicarlo</option>
        <option value="femenino">Femenino</option>
        <option value="masculino">Masculino</option>
        <option value="no_especifica">No especifica</option>
      </Selector>
    </div>
  );
}
