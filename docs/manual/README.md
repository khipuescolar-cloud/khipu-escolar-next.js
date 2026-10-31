# Manual de capacitación por rol — Khipu Escolar

Este manual explica, con pasos cortos, cómo usa Khipu Escolar cada persona del colegio. Está pensado para la capacitación
del primer colegio piloto (febrero de 2027) y para consultarlo después, en el día a día.

> Describe la aplicación tal como está hoy. Si una pantalla cambia, se actualiza este manual junto con la spec del módulo
> (`specs/`).

## Índice

| Archivo | Para quién |
|---|---|
| [direccion.md](direccion.md) | Dirección (director/a, subdirección, coordinación con rol de dirección) |
| [administrativo.md](administrativo.md) | Personal administrativo: secretaría, psicología, auxiliares, contabilidad |
| [profesor.md](profesor.md) | Profesores: tutores de salón y profesores de curso |
| [porteria.md](porteria.md) | Portería (personal de la entrada) |
| [familia.md](familia.md) | Familias (apoderados) |
| [alumno.md](alumno.md) | Alumnos con cuenta propia |
| [implementacion.md](implementacion.md) | Equipo Khipu: crear y dejar listo el colegio |

## Cómo usar este manual

1. Lee primero este archivo: el glosario y «Lo que todos deben saber».
2. Luego lee solo el archivo de tu rol. Cada uno tiene:
   - **Qué puedes hacer**: tu menú, tal como lo ves en la pantalla.
   - **Rutina diaria** y **tareas ocasionales**, paso a paso.
   - **Qué pasa después**: a quién le llega un aviso cuando haces algo.
   - **Problemas comunes** y su respuesta.
   - **Ya sé hacer esto**: una lista para marcar al terminar la capacitación.
3. Practica cada paso en el colegio demo (ver «Cuentas de práctica»). Nada de lo que hagas ahí afecta al colegio real.

Los nombres entre «comillas» son los textos exactos de botones, menús y mensajes.

## Lo que todos deben saber

### Entrar
- Cada colegio tiene su propia dirección web, por ejemplo `micolegio.khipuescolar.pe` (el equipo Khipu confirma la
  dirección definitiva antes del arranque).
- Se entra con **correo y contraseña**. Si olvidaste la contraseña: «Recuperar contraseña» en la pantalla de ingreso;
  te llega un enlace al correo.
- **Primera vez del personal** (dirección, profesores, administrativos, portería) y de los **alumnos**: llega un correo de
  bienvenida. Tu usuario es tu correo y tu contraseña inicial es tu **número de documento (DNI)**. Al entrar, Khipu te pide
  «Crea tu contraseña» (no puede contener tu documento).
- **Primera vez de las familias**: llega una invitación con el botón «Aceptar invitación». Ahí creas tu contraseña y
  luego aceptas la autorización de uso de datos («Acepto»).
- Después de 5 intentos fallidos con el mismo correo, hay que esperar 15 minutos o recuperar la contraseña.

### La pantalla
- **Barra lateral (menú)**: «Inicio» y luego cuatro grupos: «Día a día», «Comunicación», «Académico» y «Colegio».
  Cada persona solo ve lo que le toca según su rol.
- **Inicio**: saludo, el plan del colegio, la tarjeta «Hoy» (tus clases del día, si hay horario) y los mismos módulos del
  menú como tarjetas.
- **Menú de tu cuenta** (abajo en la barra lateral, con tu nombre): «Mi perfil», «Instalar app», «Tema» (claro, oscuro o
  como el dispositivo) y «Salir». Si tienes más de un rol en el colegio, ahí aparece «Entrar como» para cambiar.
- Un módulo con candado **«Plan Khipu Pro»** no está en el plan del colegio (solo pasa en colegios con Khipu Base).
- Los estados siempre llevan **ícono + palabra** (por ejemplo ✓ «Llegó», reloj «Tarde»), nunca solo un color.

### Avisos: correo y notificaciones del celular
- Khipu avisa **solo por correo y por notificación push** (en el celular o la computadora). **No usa WhatsApp ni SMS.**
- Ya no hay campanita de notificaciones dentro de Khipu: los avisos llegan al correo o como notificación del dispositivo.
- Para recibir notificaciones en un dispositivo hay que tocar «Activar notificaciones en este dispositivo»
  (familias: en «Asistencia», sección «Tus avisos»; personal: en «Mi perfil», sección «Tus avisos»).
- Las notificaciones push y la instalación como app solo funcionan en la dirección segura (https) del colegio.

### Instalar Khipu como app
- Menú de tu cuenta → «Instalar app», o la tarjeta del inicio.
- En Android y computadora aparece el botón «Instalar app». En iPhone/iPad: botón Compartir → «Agregar a inicio».
- Cada colegio se instala desde su propia dirección.

### Sin conexión
- Si se va el internet mientras pasas lista o registras llegadas en portería, Khipu lo guarda en el dispositivo y lo envía
  solo cuando vuelve la señal («Sin conexión · 1 lista pendiente de enviar»). No cierres la página mientras tanto.

## Glosario

| Palabra | Qué significa en Khipu |
|---|---|
| **Salón** | Un grupo de alumnos: nivel + grado + sección, por ejemplo «3.° B» (primaria) o «1.° A Sec.». |
| **Nivel / grado / sección** | Inicial, primaria o secundaria (y academia, si hubiera) / 1.°, 2.°… / A, B… |
| **Tutor(a)** | Profesor(a) responsable de un salón: pasa la asistencia del día y revisa justificaciones. |
| **Curso** | Una materia dentro de un salón (Matemática · 3.° B), con su profesor. |
| **Asistencia al colegio** | Si el alumno entró al colegio hoy. La registra **portería** con el carnet QR; la lista del día del tutor es el respaldo. Es la que cuenta en los porcentajes. |
| **Asistencia por curso** | Si el alumno estuvo en una clase. Solo existe en los niveles que dirección activa en «Configuración». |
| **Ámbito** | De qué es una lista: «del día» (asistencia al colegio) o de un curso. |
| **Llegó / Tarde / No llegó / Aviso** | Los cuatro estados al pasar lista. «Aviso» es una situación que la familia debe conocer (lleva una nota). |
| **Hora límite de tardanza** | Desde esa hora, la llegada por portería cuenta como «Tarde». La fija dirección. |
| **Carnet QR** | Carnet impreso con un código que la portería escanea. Si se pierde, dirección lo regenera y el anterior deja de servir. |
| **Aviso** (correo/push) | Mensaje automático a la familia o al personal. Se pueden ver en «Avisos enviados» (dirección y administrativos). |
| **Justificación** | Explicación de una falta que envía la familia (motivo y, si quiere, una foto o PDF). |
| **Plazo para justificar** | Días hábiles desde la falta en que la familia puede justificar (15 por defecto). |
| **«Por revisar» / «Historial»** | Las dos pestañas de «Justificaciones»: las pendientes de decidir y todas las anteriores con filtros. |
| **Autorización / consentimiento** | Permiso de la familia para el uso de sus datos (Ley 29733). Sin él no recibe avisos. |
| **Comunicado** | Anuncio para todo el colegio o un salón, con aviso a las familias. Se puede editar o borrar durante 24 horas. |
| **Mensajes** | Chat entre familia y profesor sobre un alumno, sin compartir teléfonos ni correos. |
| **Periodo** | Bimestre, trimestre o semestre. Lo crea dirección. |
| **Competencia / capacidad / desempeño** | Estructura del Currículo Nacional (CNEB): cada competencia tiene capacidades y, por grado, desempeños esperados. |
| **Evaluación** | Una prueba o trabajo con nota, ligada a una competencia. |
| **Calificación del periodo** | La nota final por competencia que confirma el profesor, con conclusión descriptiva (obligatoria en B y C). |
| **Escala** | Literal (AD, A, B, C) o vigesimal (0 a 20). La fija el colegio. |
| **Cerrar notas del curso** | El profesor da por terminadas las notas de su curso en ese periodo. Solo dirección puede reabrir. |
| **Publicar libreta** | Dirección hace visible la libreta del periodo a las familias y les avisa. |
| **Archivar salón / retirar alumno / desactivar cuenta** | En Khipu nada se borra: se archiva, se retira o se desactiva, y se puede reactivar. |
| **Cuenta propia del alumno** | Cuenta para que el alumno entre con su correo. Solo desde el grado que fija el colegio (por defecto 5.° de primaria) y en secundaria. |
| **Soporte Khipu** | Chat del colegio con el equipo Khipu (mesa de ayuda). |
| **Modo soporte** | Cuando el equipo Khipu entra al colegio para ayudar: solo lectura, con motivo y hora de fin; dirección recibe un aviso. |
| **Khipu Base / Khipu Pro** | Planes. Base: asistencia, portería, justificaciones, avisos, mensajes, comunicados, gestión, reportes de asistencia y horario. Pro: todo lo anterior más notas, CNEB, libreta, tareas, agenda, documentos, reuniones y tablero. |
| **Nudito+** | Tutor con inteligencia artificial para el alumno. Licencia por alumno que paga la familia por Yape (solo colegios Pro). |
| **Modo hijo** | Nudito+ usado por un hijo que no tiene cuenta propia, desde la cuenta de su familia. |

## Cuentas de práctica (colegio demo Nuevo Horizonte)

El colegio demo **I.E.P. Nuevo Horizonte** (Khipu Pro, ~170 alumnos de inicial a secundaria) tiene datos ficticios para
practicar. Todas las cuentas usan la contraseña **`demo123`**.

| Correo | Rol |
|---|---|
| direccion@nuevohorizonte.demo | Dirección (Carmen Torres) |
| secretaria@nuevohorizonte.demo | Administrativo (secretaría) |
| psicologia@nuevohorizonte.demo | Administrativo (psicóloga) |
| lucia.garcia@nuevohorizonte.demo | Profesora, tutora de 3.° B |
| pedro.salas@nuevohorizonte.demo | Profesor, tutor de 5.° A y profesor de Ciencia y Tecnología en 3.° B, 5.° B y 6.° A |
| porteria@nuevohorizonte.demo | Portería |
| rosa.quispe@gmail.com | Familia: mamá de Mateo (3.° B) y de Sofía (1.° A Sec.) |
| familia.huaman@familia.demo | Familia: mamá de Lucas (5.° A, con Nudito+) |
| lucas.huaman@nuevohorizonte.demo | Alumno de 5.° A con Nudito+ activo |
| sofia.quispe@nuevohorizonte.demo | Alumna de 1.° A Sec. |
| admin@khipuescolar.demo | Equipo Khipu (panel de la plataforma) |

- La lista completa (26 profesores, ~210 familias, ~90 alumnos con cuenta, familias con autorización pendiente, etc.)
  está en el archivo **`StartUp/credenciales-pruebas.md`** que genera el equipo Khipu. No se sube al repositorio.
- En la práctica local, los correos que envía Khipu se ven en **Mailpit** (`http://127.0.0.1:54324`): ahí se comprueba que
  la familia recibió el aviso.
- En la práctica local (`http://nuevohorizonte.lvh.me:3000`) no funcionan la cámara de portería, las notificaciones push ni
  «Instalar app», porque no es una dirección segura (https). Esas partes se practican en el entorno https.

## Plan de capacitación (2 a 3 semanas, 3 horas por día)

Regla de cada sesión: **30 min de demostración, 2 h de práctica con las cuentas demo, 30 min de dudas** y revisión del
checklist «Ya sé hacer esto» del rol. Grupos pequeños; cada profesor con su propio celular o computadora.

### Semana 1 — Arranque, datos del colegio y día a día (Khipu Base)

| Día | Quién asiste | Objetivo | Práctica (colegio demo) |
|---|---|---|---|
| 1 | Dirección, secretaría, psicología, equipo Khipu | Recorrido general: entrar, menú, perfil, instalar app, avisos. Qué hace cada rol. | Cada uno entra con su cuenta demo y con la de otro rol (dirección, profesora, familia) para ver las diferencias. Rosa activa avisos en «Asistencia» → «Tus avisos». |
| 2 | Dirección, secretaría | Gestión: profesores, personal, salones y cursos, alumnos, familias, carnets. Configuración. | Dirección registra un profesor de prueba, crea un salón con dos cursos, importa 3 alumnos por CSV, invita a un apoderado, genera carnets de ese salón. Secretaría vincula un hermano a una familia. |
| 3 | Dirección, secretaría, equipo Khipu | **Carga de los datos reales** del colegio desde su Excel (ver [implementacion.md](implementacion.md)). | Revisión de salones, tutores y cursos; primera importación de alumnos. |
| 4 | Todos los profesores (2 turnos si hace falta) | Pasar lista (del día y por curso), Mi horario, reportes, justificaciones. | Lucía pasa la lista del día de 3.° B con un «No llegó» y un «Tarde»; se ve el correo en Mailpit; Rosa justifica desde el enlace; Lucía la acepta en «Por revisar». Pedro pasa lista de Ciencia y Tecnología en 3.° B. |
| 4 | Portería (1 h aparte) y dirección | Portería con carnet QR, búsqueda manual, sin conexión. | Porteria@ busca «Quispe» y registra la llegada; repite y ve «Ya registrado». En el entorno https: escanear carnets impresos. |
| 5 | Profesores, dirección, administrativos | Comunicación: mensajes, comunicados, avisos enviados. | Rosa escribe a Lucía; Lucía responde. Pedro lee sus mensajes sin leer. Dirección publica un comunicado con un PDF; secretaría publica otro para un salón; dirección revisa «Avisos enviados». |

### Semana 2 — Lo académico (Khipu Pro)

| Día | Quién asiste | Objetivo | Práctica |
|---|---|---|---|
| 6 | Dirección (y coordinación académica) | Periodos, grado de cada salón, importar CNEB, horarios. | Dirección revisa «Notas» → «Periodos», importa desde el CNEB en un curso de Matemática, arma un casillero en «Horarios» y prueba un cruce de profesor. |
| 7 | Profesores | Notas: evaluaciones, notas, observaciones, competencias y desempeños. | Lucía crea una evaluación con desempeños en Matemática 3.° B, pone notas y una observación; exporta e importa el CSV. |
| 8 | Profesores | Calificación del periodo, cerrar notas del curso, libreta. Tareas, agenda, documentos. | Lucía confirma calificaciones (con conclusión en B y C) y crea una tarea con «Avisar a las familias»; Rosa la ve en «Tareas». Pedro sube un documento a 5.° A. |
| 9 | Dirección, profesores tutores | Reuniones de padres; publicar libreta; tablero y consolidado; corregir asistencia. | Lucía convoca una reunión de 3.° B; Rosa responde «Asistiré»; dirección publica la libreta de un bimestre cerrado y la descarga como Rosa. Dirección revisa «Tablero» y corrige un día desde los reportes. |
| 10 | Todos los roles del colegio | **Simulacro de un día completo.** | Portería registra llegadas; tutores pasan la lista del día; profesores pasan listas de curso; una familia justifica; dirección revisa inicio, reportes y avisos. Se anotan dudas. |

### Semana 3 — Familias, alumnos y marcha blanca

| Día | Quién asiste | Objetivo | Práctica |
|---|---|---|---|
| 11 | Familias (en reunión de padres, 2 turnos de 1,5 h), con tutores de apoyo | Aceptar la invitación, crear contraseña, autorizar, instalar la app, activar avisos, ver asistencia, justificar, escribir a la tutora. | Las familias reales aceptan su invitación ese mismo día con ayuda del tutor. Guía: [familia.md](familia.md). |
| 12 | Alumnos con cuenta (5.° y 6.° de primaria y secundaria, por salón), con su tutor | Entrar, cambiar contraseña, ver asistencia, horario, tareas, notas; Nudito+ (si su familia lo activa). | Con la cuenta de Lucas: Nudito+ en «Nudito+». Guía: [alumno.md](alumno.md). |
| 13 | Dirección, secretaría, equipo Khipu | Revisión final: carnets entregados, familias con «Invitación pendiente» o «Consentimiento pendiente», cuentas de alumno, configuración (hora límite, asistencia por curso por nivel, grado mínimo). | Lista de pendientes por salón para los tutores. |
| 14 | Todos | **Marcha blanca**: primer día real, con el equipo Khipu presente. | Uso real. |
| 15 | Dirección, coordinación, delegados de profesores | Revisión: problemas del primer día, preguntas frecuentes, cómo pedir ayuda («Soporte Khipu»). Firma de los checklists. | — |

**Versión de 2 semanas:** juntar los días 1 y 2, los días 7 y 8, y los días 11 y 12; el día 13 pasa a ser la mañana del 14.

## Cómo pedir ayuda
- Dirección: menú «Soporte Khipu» → «Nueva conversación» (ver [direccion.md](direccion.md)).
- Profesores, administrativos y portería: a dirección o a quien el colegio designe.
- Familias y alumnos: al tutor por «Mensajes» (familias) o en el colegio.
