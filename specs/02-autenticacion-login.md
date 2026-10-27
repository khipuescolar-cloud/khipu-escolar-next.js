# 02 — Autenticación y login

> Estado: implementado · Plan: todos · Última actualización: 2026-10-26 (Claude Code)

## Objetivo
Entrar con correo y contraseña, y llegar al colegio correcto sin preguntar nada de más.

## Flujos
1. **Login** (`/login`, en el dominio raíz):
   - Mientras se escribe el correo, `detectarColegio` muestra «Entrarás a <colegio>» si el dominio está en `tenants.email_domains`. Para correos personales (Gmail, Hotmail…) muestra «Cuenta de familia» y no revela nada más.
   - `iniciarSesion` cuenta el intento, llama a `signInWithPassword` y resuelve el destino:
     - el colegio del dominio del correo, si el usuario es miembro;
     - si no, su único colegio;
     - si tiene varios → `/elegir-colegio`.
   - `/entrando?colegio=<slug>` muestra «Entrando a <colegio>» y la dirección, y salta a `https://<slug>.<dominio>/inicio`.
2. **Límite de intentos:** 5 fallos por correo o 20 por IP en 15 minutos → «Hubo demasiados intentos. Espera 15 minutos o recupera tu contraseña.» (tabla `login_intentos`). Además aplican los *rate limits* de Supabase Auth.
3. **Recuperar contraseña:** `/recuperar` → `resetPasswordForEmail` (la respuesta es siempre la misma) → el correo lleva a `/auth/callback?next=/restablecer` → `/restablecer` guarda la nueva contraseña (mínimo 8 caracteres).
4. **Salir:** `salirAction` en el encabezado del colegio.
5. **Cambiar de rol** (si tiene varios en el mismo colegio): cookie `khipu_rol`.

## Textos de error
- «El correo o la contraseña no coinciden.»
- «Tu cuenta no está vinculada a ningún colegio activo. Escribe a tu colegio.»

## Pruebas
- e2e: `tests/e2e/login-flow.test.ts` (dominio → subdominio, apoderada con 2 colegios, candados del Básico, contraseña incorrecta).

## Pendientes
- Invitaciones de apoderados y profesores (ver spec 10).
- En producción, configurar el SMTP de Supabase Auth con Amazon SES.
