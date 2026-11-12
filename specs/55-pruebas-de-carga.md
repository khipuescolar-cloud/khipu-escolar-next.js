# 55 — Pruebas de carga con k6

> Estado: implementado (humo y carga escalonada; flujos autenticados por cookie) · Plan: interno (calidad) · Última actualización: 2026-11-11 (Claude)

## Objetivo
Medir cuántos usuarios simultáneos aguanta la app (100, 1 000 o más) y detectar páginas lentas antes de los pilotos. Herramienta: **k6** (Grafana, binario oficial, `~/.local/bin/k6`; v2.3.0 instalada y verificada por checksum).

## Reglas
- **Solo contra la máquina local por defecto** (`lvh.me`, `localhost`, `127.0.0.1`). Otro destino exige `ALLOW_REMOTE=1` y permiso previo de Carlos: no se hacen pruebas de carga contra la nube real (Supabase, Gmail, Cloudinary) sin autorización.
- Umbrales de aprobación: fallas HTTP < 1 %, p95 < 1 200 ms, checks > 99 % (`tests/carga/comun.js`).
- Los scripts no escriben datos: solo `GET`. Para páginas autenticadas se pasa una cookie de sesión copiada del navegador (`K6_COOKIE`), nunca contraseñas en el repo.

## Comandos
```bash
pnpm dev                     # o, mejor, pnpm build && pnpm start (más parecido a producción)
pnpm k6:humo                 # 1 usuario, 3 iteraciones: comprueba que las páginas responden
pnpm k6:100                  # sube hasta 100 usuarios virtuales (3 min en meseta)
pnpm k6:1000                 # sube hasta 1 000 (5 min en meseta)
k6 run -e USUARIOS=300 -e DURACION=5m -e K6_COOKIE='sb-…=…' tests/carga/escalonada.js
k6 run -e BASE_URL=http://nuevohorizonte.lvh.me:3000 tests/carga/humo.js
```

## Alcance y límites
- `tests/carga/humo.js`: `/` y `/login` (el login de colegio redirige a `lvh.me/login?colegio=…`; k6 sigue la redirección).
- `tests/carga/escalonada.js`: públicas y, con cookie, `/inicio` y `/nudito`.
- Probar 1 000 usuarios desde la misma laptop que corre la app **no es representativo** (compiten por CPU). Para cifras reales: app en modo producción (`build` + `start`) y k6 desde otra máquina o contra un entorno de pruebas aparte; k6 Cloud o varios generadores si se necesita más.
- Falta (pendientes): flujos de escritura (pasar lista, práctica de Nudito) con usuarios sembrados; medir la base de datos aparte (conexiones, consultas lentas).
