# Manual de implementación (equipo Khipu)

Para el equipo Khipu: cómo crear un colegio, cargar sus datos y dejarlo listo para el arranque. Pensado para el piloto
(≈1 000 alumnos, inicial a secundaria, arranque en febrero de 2027).

Practica en local con `admin@khipuescolar.demo` (panel `http://admin.lvh.me:3000`) y `direccion@nuevohorizonte.demo`
(contraseña `demo123`). Tras las prácticas, deja la BD local limpia con `pnpm db:reconstruir` (regenera
`StartUp/credenciales-pruebas.md`).

## Resumen del orden

1. Recolectar los datos del colegio (su Excel).
2. Crear el colegio en el panel (plan, estado, administrador principal, responsables, suscripción).
3. Configurar el colegio (como dirección).
4. Cargar profesores y personal.
5. Cargar grados, salones y cursos (carga masiva).
6. Importar alumnos.
7. Cargar a las familias (carga masiva).
8. Generar e imprimir carnets.
9. Horarios, periodos y CNEB (Pro).
10. Cuentas de alumno (después de que las familias autoricen).
11. Nudito+ (configuración y verificación de pagos).
12. Revisión final y marcha blanca.

## 1. Datos que pedir al colegio

| Dato | Para qué |
|---|---|
| Nombre, logo (PNG/JPG/WEBP ≤ 1 MB), eslogan, ciudad, dominio de correo del colegio (si tiene) | Crear el colegio. |
| Administrador principal: correo, nombres, apellidos, DNI, teléfono, cargo | Su cuenta de dirección. |
| Profesores y personal: nombres, apellidos, DNI, correo, teléfono, género, cargo | CSV de profesores y de personal. |
| Salones: nivel, grado, sección, tutor(a) (DNI o correo) | Plantilla «Salones y cursos» de la carga masiva. |
| Cursos de cada salón con su profesor(a) (DNI o correo) | Misma plantilla (un curso por fila, o un curso por columna). |
| Alumnos: nombres, apellidos, código, salón y, si lo tienen, DNI | CSV de alumnos. |
| Familias: código o DNI del alumno, DNI, nombres, apellidos, correo personal, celular (opcional) y parentesco del apoderado | Plantilla «Familias» de la carga masiva. |
| Hora de entrada (hora límite de tardanza), plazo para justificar del reglamento | Configuración. |
| Niveles con asistencia por curso | Configuración. |
| Grado de primaria desde el que los alumnos tienen cuenta propia | Configuración. |
| Periodos (bimestres/trimestres, fechas), escala (literal o vigesimal) | Notas. |
| Horas de clase por nivel y horario de cada salón | Horarios. |

Los nombres de salón deben ser idénticos en todos los archivos: el CSV de alumnos busca el salón por su nombre. Si la carga
masiva crea los salones, el nombre es el que muestra su vista previa («3 años A», «3.° B», «1.° A Sec.») o el de la columna
`nombre` si la llenas. Las plantillas se descargan en Gestión → «Carga masiva» (Excel con hoja de instrucciones, o CSV).

## 2. Crear el colegio (panel de la plataforma)

1. Panel → «Colegios» → **«Nuevo colegio»**.
2. Sección «1. Colegio»: insignia o escudo, nombre, eslogan, «Dirección (subdominio)» (Khipu la sugiere; 3 a 40 letras,
   números o guiones; no `www`, `app`, `api`, `admin`), ciudad, **plan «Khipu Pro»**, **estado «Piloto»**, dominios de
   correo (opcional) y escala de notas.
3. Sección «Administrador principal»: correo, nombres, apellidos, documento (será su contraseña inicial; no se envía por
   correo), teléfono, género y cargo.
4. «Crear colegio». Llega el correo de bienvenida con «Ingresar a Khipu Escolar».
5. En la ficha del colegio:
   - **Responsables**: «Agregar responsable» (por ejemplo, facturación). La casilla «Darle acceso al sistema como
     dirección» crea su cuenta de dirección.
   - **Suscripción**: registra el contrato (piloto: sin cobro) y, si corresponde, «Registrar pago».
   - **Módulos del colegio**: normalmente no se toca. «Agregar módulo» o «Quitar módulo» exige un motivo y queda auditado.
6. «Roles y permisos» y «Planes y módulos» son **globales**: un cambio ahí afecta a **todos** los colegios. Por ejemplo,
   «Soporte Khipu» para el personal administrativo viene desactivado.

**Sobre quién carga los datos:** el «modo soporte» del equipo Khipu es de **solo lectura**. La carga la hace una cuenta de
dirección: lo recomendado es que dirección o secretaría la haga en la capacitación, acompañadas por Khipu. Si el equipo
necesita cargar por su cuenta, se agrega como responsable con acceso de dirección y al terminar se quita marcando
«También desactivar su acceso al sistema».

## 3. Configurar el colegio (como dirección)

**Configuración**:
- «Hora límite de tardanza» (desde esa hora, portería registra «Tarde»).
- «Plazo para justificar faltas (días hábiles)»: 1 a 30, por defecto 15.
- «Dominio de correo» y «Escala de calificación».
- «Cuenta propia del alumno» → «Desde qué grado de primaria» (por defecto 5.°).
- «Asistencia por curso»: marca los niveles y toca «Guardar asistencia por curso». Por defecto ninguno. Recomendación
  para el piloto: decidirlo con dirección según si los profesores pasarán lista en cada clase (más avisos a familias).
- «Logo del colegio».

## 4. Profesores y personal

1. Gestión → «Profesores» → «Importar desde un archivo CSV». Columnas obligatorias `nombres, apellidos, documento, correo`;
   opcionales `tipo_documento, telefono, genero, fecha_nacimiento, direccion, cargo`. Máximo 200 filas y 1 MB.
2. Gestión → «Personal» → igual, con la columna `rol` = `administrativo` o `porteria`.
3. Todo o nada: si una línea falla, no se importa ninguna y Khipu indica la línea.
4. Cada persona recibe su bienvenida (usuario = correo; contraseña inicial = documento).
5. Para una sola persona: «Agregar profesor» / «Agregar personal».
6. Si el DNI estaba mal: corrígelo en la ficha y usa «Restablecer contraseña al documento».

## 5. Grados, salones y cursos

Primero deben estar los profesores (paso 4): el tutor y el profesor de cada curso se buscan por su DNI o correo.
1. Gestión → «Carga masiva» → «Salones y cursos» (o «Cargar desde archivo» en «Grados y salones»). Descarga la
   «Plantilla Excel» o la «Plantilla CSV» (solo dirección).
2. Llena una fila por curso: `nivel, grado, seccion, nombre (opcional), anio (opcional), tutor, curso, profesor`. También
   se acepta una fila por salón con una columna por curso (celda = DNI o correo del profesor, o «x» si aún no tiene).
3. Sube el archivo y revisa la **vista previa**: salones y cursos nuevos, tutores y profesores asignados, errores por línea
   (esas filas no se cargan) y avisos (por ejemplo «No encontramos al profesor…»: el curso se crea sin profesor).
4. «Confirmar y cargar». Puedes corregir y volver a subir el archivo completo: no se duplica nada; se actualizan el tutor
   y el profesor de cada curso. Nunca se borran salones ni cursos.
5. Para un salón suelto: «Grados y salones» → «Crear salón» y «Nuevo curso».
6. Revisa que **cada salón tenga grado** (la carga masiva lo exige): lo necesitan los desempeños del CNEB y la regla de
   cuenta propia.

## 6. Alumnos

1. Gestión → «Alumnos» → «Importar CSV» con `nombres, apellidos, codigo, salon` y, opcional, `documento` (DNI del
   alumno). El código o el DNI es lo que usa la carga de familias para encontrar al alumno: llena al menos uno.
2. Máximo **1 500 filas** y 2 MB por archivo: un colegio de ~1 000 alumnos entra en un solo archivo.
3. Todo o nada, con errores por línea («No existe el salón «…»»: revisa el nombre exacto). El código y el DNI no se
   pueden repetir.

## 7. Familias

1. Gestión → «Carga masiva» → «Familias» (o «Cargar desde archivo» en «Familias»). Dirección y secretaría
   (administrativo) pueden hacerlo. Descarga la plantilla.
2. Una fila por apoderado y por hijo: `alumno_codigo` o `alumno_dni`, `apoderado_dni`, `tipo_documento` (opcional: dni,
   ce o pasaporte), `nombres`, `apellidos`, `correo`, `celular` (opcional) y `parentesco`. **Hermanos:** repite al
   apoderado (mismo correo y DNI) en una fila por hijo; se crea una sola cuenta. Hasta 3 000 filas y 3 MB por archivo.
3. En Excel, deja el DNI como Texto; si se pierden los ceros de la izquierda, Khipu los completa y te avisa.
4. Revisa la vista previa (familias nuevas, familias que ya tenían cuenta en Khipu, hermanos, vínculos nuevos y errores por
   línea, por ejemplo «No encontramos al alumno con código…») y «Confirmar y cargar».
5. Cada familia nueva recibe un correo de **bienvenida**: usuario = su correo, contraseña inicial = su documento (no va en
   el correo; al entrar se le pide cambiarla). Si ya tenía cuenta en Khipu, entra con su contraseña de siempre. Los
   correos salen por la cola de avisos, poco a poco (con SES a 14/s, ~1 300 bienvenidas tardan ~2 min; con el tope
   diario de Gmail no alcanzan: ver la revisión final).
6. Volver a subir el archivo corregido no duplica cuentas ni vínculos ni reenvía la bienvenida (solo actualiza el
   parentesco). Para una sola familia: «Invitar apoderado» y «Vincular otro alumno».
7. Seguimiento en la misma lista: «Invitación pendiente» (aún no entra; «Reenviar invitación» vuelve a mandar la
   bienvenida), «Consentimiento pendiente», «Consentimiento aceptado» o «Consentimiento retirado». Busca y pagina de 20 en 20.

**Consentimientos:** la carga masiva **no** da el consentimiento por la familia. La familia acepta la autorización al entrar por primera vez («Acepto»). Sin ella no recibe avisos y
no se puede crear la cuenta propia de su hijo. Puede retirarla y volver a darla en «Mi perfil». El texto legal definitivo
está pendiente de revisión con un abogado.

## 8. Carnets

1. Gestión → «Carnets» → «Generar carnets» en cada salón.
2. «Descargar PDF» (A4, 8 por hoja, o tamaño tarjeta CR80) e imprimir. Entregar antes de la marcha blanca.
3. Probar en la portería real (https) con la cámara del equipo que se usará.

## 9. Horarios, periodos y CNEB (Khipu Pro)

- **Horarios**: por nivel, «Usar horas sugeridas» o «Horas del día»; luego casillero por casillero. «Copiar de otro salón»
  para salones del mismo grado. Revisa «Carga de profesores» (cruces).
- **Periodos**: Notas → «Periodos» → «Nuevo periodo» con fechas.
- **CNEB**: Notas → curso → «Capacidades y desempeños» → «Importar desde el CNEB». El catálogo incluido trae solo
  **Matemática y Comunicación** (primaria y secundaria); inicial y las demás áreas se cargan a mano. Los textos de los
  desempeños deben revisarse contra el texto oficial del MINEDU.

## 10. Cuentas de alumno

Cuando las familias ya autorizaron: Gestión → «Alumnos» → acciones → «Crear cuenta del alumno» (correo del alumno, tipo y
número de documento). Solo secundaria y primaria desde el grado mínimo configurado. Se hace uno por uno.

## 11. Nudito+ (licencias por alumno con Yape)

Solo para colegios **Khipu Pro**. El proveedor de IA **aún no está elegido**: hoy responde un proveedor de prueba. Avisa a
las familias del piloto (meta: 10 familias) que es una versión de prueba.

**Configuración** (panel → «Nudito+» → pestaña de configuración): «Precio y Yape» (precio mensual, «Número de Yape»,
«Titular»), topes («Mensajes por mes», «Tokens por mes», «Costo máximo por mes (USD)»), «Texto de autorización para la
familia» («Publicar texto»: obliga a las familias a aceptar de nuevo) y «Sitios permitidos».

**Verificar pagos** (cada día hábil):
1. Panel → «Nudito+» → «Pagos por verificar».
2. Compara en la app de Yape el número de operación, monto y fecha. «Monto distinto» indica que no coincide con precio ×
   meses.
3. «Verificar» → «Verificar y activar»: crea o extiende la licencia y avisa a la familia.
4. Si no coincide: «Rechazar» → motivo → «Rechazar pago». La familia ve el motivo.

**Licencias**: filtra por colegio, estado o «Vencen en 7 días»; «Extender» o «Cancelar licencia» con motivo. Para una
prueba o cortesía sin pago: «Crear licencia» → colegio → alumno → tipo «Prueba» o «Cortesía», fecha final y motivo.
Las familias reciben un recordatorio 3 días antes de vencer. Nadie del equipo ni del colegio ve las conversaciones.

## 12. Revisión final y arranque

- [ ] Todos los profesores y el personal entraron y cambiaron su contraseña (ficha: «Ya cambió su contraseña inicial.»).
- [ ] Cada salón tiene tutor, grado y cursos con profesor.
- [ ] Alumnos importados y carnets entregados.
- [ ] Familias cargadas (carga masiva sin filas pendientes de corregir); lista de «Invitación pendiente» y
      «Consentimiento pendiente» entregada a los tutores.
- [ ] Hora límite de tardanza, plazo, asistencia por curso y grado mínimo confirmados con dirección.
- [ ] Periodos creados, horario cargado, CNEB importado donde aplica.
- [ ] Equipo de portería probado con la cámara (https) y conexión de respaldo.
- [ ] Envío de correo de producción listo: con ~1 000 alumnos se envían más de 1 000 avisos de llegada por día; el tope de
      Gmail (~500 al día) no alcanza, se necesita Amazon SES fuera de sandbox (`docs/despliegue.md`).
- [ ] Dirección sabe abrir una conversación en «Soporte Khipu».

## Soporte después del arranque
- **Mesa de ayuda** (panel → «Mesa de ayuda»): responder, notas internas, asignar, cambiar estado.
- **Entrar como soporte** (ficha del colegio): motivo, duración (30, 60 o 120 min). Solo lectura; dirección recibe un aviso
  y no se ven mensajes, notas, libretas ni Soporte Khipu.
- **Exportar datos del colegio** desde la ficha (ZIP, se descarga durante 7 días).
- El panel no borra colegios (solo el script `pnpm khipu:borrar-colegio`).
