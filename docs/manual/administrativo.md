# Manual del personal administrativo (secretaría, psicología, auxiliares)

Para quien tiene el rol «Personal administrativo»: secretaría, psicología, auxiliares, contabilidad. Tu trabajo principal
en Khipu es mantener al día a los **alumnos y familias**, publicar comunicados y documentos, y consultar la asistencia.
Practica con `secretaria@nuevohorizonte.demo` o `psicologia@nuevohorizonte.demo` (contraseña `demo123`).

## Qué puedes hacer (tu menú)

| Grupo | Menú | Para qué |
|---|---|---|
| Día a día | **Reportes de asistencia** | Asistencia del colegio del día y por fechas, por salón, alumno y curso; Excel y PDF (solo lectura). |
| | **Avisos enviados** | Ver si los correos y notificaciones a las familias llegaron (solo lectura). |
| Comunicación | **Comunicados** | Publicar para todo el colegio o un salón. |
| | **Documentos** | Crear carpetas y subir documentos (lo que tu rol puede ver). |
| Académico | **Agenda** | Ver la agenda y crear eventos **de todo el colegio**. |
| Colegio | **Alumnos y familias** | Alta, datos, retiro, importación e invitaciones de alumnos y familias. |

**No tienes**: Mensajes (el chat es entre familia y profesor), Justificaciones, Notas, Libreta, profesores, salones,
carnets ni configuración. «Soporte Khipu» solo aparece si el equipo Khipu lo habilita para tu rol.

**Psicología**: tiene el mismo rol y el mismo menú. Puede usar «Reportes de asistencia» para detectar faltas seguidas o
tardanzas repetidas (filtra por salón o alumno y míralo como «Calendario»). Khipu no tiene fichas psicológicas ni acceso
a las notas o al chat.

## Primer ingreso
1. Abre el correo de bienvenida y toca «Ingresar a Khipu Escolar».
2. Usuario: tu correo. Contraseña inicial: tu número de documento. Luego «Crea tu contraseña».
3. «Mi perfil» → «Tus avisos»: activa correo y notificaciones.

## Rutina diaria

### Revisar la asistencia del día
1. **Reportes de asistencia**: arriba ves «Asistieron», «Faltaron», «Con aviso» y «Sin registro» del día, y la tabla por
   salón.
2. Para un alumno o un rango: «Filtrar reporte» → salón → alumno o «Todo el salón» → fechas → «Ver reporte».
3. Descarga con «Descargar Excel» o «Descargar PDF». Tú no corriges listas: si algo está mal, avisa a dirección.

### Atender a las familias que llegan a secretaría
- **«No me llegan los avisos»**: Alumnos y familias → «Familias» → busca a la familia. Mira su estado:
  - «Invitación pendiente»: aún no aceptó → menú de acciones de la familia → «Reenviar invitación».
  - «Consentimiento pendiente»: debe entrar a Khipu y tocar «Acepto».
  - «Consentimiento retirado»: retiró su autorización; puede volver a darla en «Mi perfil» → «Volver a autorizar».
  - Si todo está bien, revisa «Avisos enviados» filtrando por su correo («Correo contiene»): un estado de rebote o error
    indica que el correo está mal. Corrige el dato con dirección.
- **Cambio de teléfono o nombre**: «Editar datos» en la familia.

## Tareas ocasionales

### Agregar un alumno
1. Alumnos y familias → «Alumnos» → «Agregar alumno».
2. Nombres, apellidos, código (opcional) y salón → guardar.
3. Muchos alumnos a la vez: «Importar CSV» con las columnas `nombres, apellidos, codigo, salon` (y, si lo tienes,
   `documento` con el DNI del alumno). El salón debe existir con el mismo nombre (por ejemplo `3.° B`). Si una fila falla,
   **no se importa ninguna**: Khipu te dice qué línea corregir. Máximo 1 500 filas por archivo.

### Retirar o reactivar a un alumno
Fila del alumno → acciones → «Retirar del colegio» (deja de salir en las listas; conserva su historia) o «Reactivar».

### Invitar a una familia
1. Alumnos y familias → «Familias» → «Invitar apoderado».
2. Nombres, apellidos, «Correo personal», «Parentesco» (madre, padre, tutor legal…) y el alumno → «Enviar invitación».
3. La familia recibe un correo con «Aceptar invitación».
4. **Hermanos**: no invites dos veces. En la familia, «Vincular otro alumno» y elige al hermano.
5. «Quitar» en un hijo quita ese vínculo. «Desactivar cuenta» impide que la familia entre y reciba avisos (se puede
   «Reactivar cuenta»).

### Cargar muchas familias a la vez
1. Alumnos y familias → «Familias» → «Cargar desde archivo» (o Gestión → «Carga masiva»).
2. Descarga la «Plantilla Excel» y llena una fila por apoderado y por hijo: código o DNI del alumno, DNI, nombres,
   apellidos, correo personal, celular (opcional) y parentesco. Hermanos: repite al apoderado en una fila por hijo.
3. Sube el archivo y revisa la vista previa: las filas con errores no se cargan (te dice la línea y el motivo).
4. «Confirmar y cargar». Cada familia nueva recibe su bienvenida: entra con su correo y su DNI como contraseña inicial.
5. Si corriges el archivo, vuelve a subirlo completo: no se duplica nada ni se reenvía la bienvenida.

### Crear la cuenta propia de un alumno
Solo desde el grado que fijó dirección (por defecto 5.° de primaria) y en secundaria.
1. Alumnos y familias → «Alumnos» → acciones del alumno → «Crear cuenta del alumno».
2. «Correo del alumno», «Tipo de documento» y «Número de documento» → crear.
3. El alumno recibe la bienvenida: usuario su correo, contraseña inicial su documento.
4. La columna «Cuenta del alumno» muestra «Sin cuenta», «Cuenta activa» o «Cuenta desactivada».

Si no te deja: algún apoderado vinculado debe haber dado su autorización, y el correo no puede ser de otra persona del
colegio (por ejemplo, el de su mamá).

### Comunicados
1. **Comunicados** → «Publicar un comunicado» → «Para quién» (todo el colegio o un salón), título, mensaje, adjuntos
   (hasta 5, de 10 MB).
2. Publica. Puedes editarlo o borrarlo durante 24 horas.

### Eventos de la agenda
**Agenda** → «Nuevo evento»: título, tipo (Evento, Reunión, Examen, Feriado, Actividad), fecha y hora opcional. Tus
eventos son siempre para todo el colegio. Puedes editar o borrar solo los que creaste.

### Documentos
1. **Documentos** → «Nueva carpeta» (si quieres, limita qué roles la ven).
2. «Subir un documento»: título, archivo (PDF, JPG, PNG, WEBP, DOCX o XLSX, hasta 10 MB), carpeta, salón opcional,
   «¿Quién lo ve?» y, si corresponde, «Avisar a las familias».

## Qué pasa después

| Lo que haces | Quién recibe aviso |
|---|---|
| «Enviar invitación» o «Reenviar invitación» | La familia: correo con «Aceptar invitación». |
| «Crear cuenta del alumno» | El alumno: correo de bienvenida. |
| Publicar un comunicado | Las familias del colegio o del salón (correo y/o push). |
| Subir un documento con «Avisar a las familias» | Las familias que pueden verlo. |
| Crear un evento de agenda | Nadie: aparece en la agenda de todos. |
| Agregar, importar o retirar alumnos | Nadie. |

## Problemas comunes

| Problema | Respuesta |
|---|---|
| El CSV dice «No existe el salón…». | El nombre del salón en el archivo debe ser igual al de Khipu. Pide a dirección la lista de salones. |
| La familia no encuentra la invitación. | Que revise spam. Si no está, «Reenviar invitación». Si ya creó su contraseña, que use «Recuperar contraseña». |
| La familia tiene hijos en dos salones. | Una sola invitación y luego «Vincular otro alumno». |
| No veo el buscador por documento. | Es solo de dirección. Busca por nombre, correo o alumno. |
| Quiero escribirle a una familia. | Secretaría no tiene chat. Usa un comunicado para el salón o pide al tutor que le escriba. |
| No puedo crear un evento para un salón. | El personal administrativo crea eventos de todo el colegio; los de salón los crea el profesor o dirección. |

## Ya sé hacer esto
- [ ] Entrar y activar mis avisos.
- [ ] Consultar y descargar un reporte de asistencia de un alumno.
- [ ] Agregar un alumno, importar un CSV y corregir un error de línea.
- [ ] Retirar y reactivar a un alumno.
- [ ] Invitar a una familia, vincular a un hermano y reenviar una invitación.
- [ ] Reconocer los estados «Invitación pendiente», «Consentimiento pendiente» y «Consentimiento retirado».
- [ ] Revisar en «Avisos enviados» si un correo rebotó.
- [ ] Crear la cuenta de un alumno.
- [ ] Publicar un comunicado y un evento de agenda.
- [ ] Subir un documento a una carpeta.
