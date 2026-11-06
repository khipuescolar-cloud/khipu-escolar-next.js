# Producto

<!-- impeccable:product-schema 1 -->

## Platform

web

## Usuarios

- **Docente:** registra asistencia, consulta su horario y atiende mensajes entre clases, con poco tiempo para encontrar la siguiente acción.
- **Dirección y secretaría:** siguen asistencia, avisos, gestión académica y operaciones del colegio; necesitan comparar estados y localizar excepciones.
- **Portería:** verifica ingresos en la puerta mediante el carnet QR; requiere controles claros y rápidos.
- **Familia:** consulta llegadas, tareas, notas y mensajes en el celular, a menudo de gama media y con atención interrumpida.
- **Alumno:** revisa su jornada y practica con Nudito cuando su colegio tiene acceso.
- **Equipo Khipu:** administra colegios y soporte desde un panel separado.

## Propósito

Khipu Escolar reúne la operación cotidiana del colegio y la comunicación con las familias: asistencia y aviso, mensajes, agenda, tareas, notas y libreta según el plan. El colegio contrata Khipu Base o Khipu Pro; docentes, personal y familias no pagan por cuenta (`docs/modelo-comercial.md`).

## Contexto de uso

La jornada tiene momentos distintos: pasar lista y atender incidencias durante clases, revisar reportes desde dirección, escanear carnets durante el ingreso, y consultar novedades en casa desde el teléfono. Las notificaciones críticas son responsabilidad del colegio. Nudito acompaña la práctica y nunca comunica malas noticias.

## Capacidades y restricciones

El producto es multitenant por subdominio. Las funciones visibles dependen del rol, del plan y de la configuración del colegio. Supabase gestiona autenticación; la lógica de negocio vive en el servidor. Los datos de alumnos son sensibles. La interfaz usa español del Perú y estados con ícono y palabra. No se deben inferir métricas ni presentar datos demo como resultados de clientes.

## Compromisos de marca

Conservar nombre, logotipo e isotipo Khipu, índigo, Sora para títulos, Inter para texto y Nunito solo para la voz de Nudito. La personalidad es confiable, cercana, clara y peruana. Rigen `docs/marca/MANUAL-DE-MARCA.md` y los SVG de `public/marca/`.

## Evidencia disponible

Specs funcionales en `specs/`, modelo comercial en `docs/modelo-comercial.md`, manual y tokens de marca en `docs/marca/`. El seed local contiene datos ficticios para probar flujos. No hay cifras de uso real ni testimonios aprobados en estas fuentes.

## Principios de producto

1. Mostrar primero la tarea o excepción que requiere atención.
2. Dejar visible el siguiente paso y el estado de cada operación.
3. Mantener consistencia entre roles sin ocultar sus necesidades distintas.
4. Proteger la confianza de familias y colegios al hablar de datos de alumnos.

## Accesibilidad e inclusión

Objetivo WCAG 2.2 AA: contraste legible, foco visible, estados que no dependan del color, zonas táctiles de 44 px y movimiento reducido. La experiencia móvil debe evitar desplazamiento horizontal de página.
